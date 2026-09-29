import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'agenda_simultane.json');

export const DEFAULT_ORTHOPHONISTES: [string, string, string] = [
  'Maroua',
  'Mariem',
  'Stagiaire',
];

export const STANDARD_HOURS = [
  { start: '08:30', end: '09:15' },
  { start: '09:15', end: '10:00' },
  { start: '10:00', end: '10:45' },
  { start: '10:45', end: '11:30' },
  { start: '11:30', end: '12:15' },
  { start: '14:00', end: '14:45' },
  { start: '14:45', end: '15:30' },
  { start: '15:30', end: '16:15' },
  { start: '16:15', end: '17:00' },
  { start: '17:00', end: '17:45' },
];

function readData(): Record<string, any> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading agenda data:', e);
  }
  return {};
}

function writeData(data: Record<string, any>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing agenda data:', e);
  }
}

export function handleAgendaApi(req: IncomingMessage, res: ServerResponse): boolean {
  const url = req.url || '';
  if (!url.startsWith('/api/agenda')) return false;

  const [pathname, search] = url.split('?');
  const params = new URLSearchParams(search || '');

  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && pathname === '/api/agenda/slots') {
    const date = params.get('date') || '2026-09-29';
    const allData = readData();
    const dateSlots: any[] = [];

    STANDARD_HOURS.forEach(({ start, end }) => {
      const slotId = `${date}_${start}`;
      if (allData[slotId]) {
        dateSlots.push(allData[slotId]);
      } else {
        dateSlots.push({
          id: slotId,
          date,
          heureDebut: start,
          heureFin: end,
          updatedAt: new Date().toISOString(),
          positions: [
            { position: 1, orthophonisteNom: 'Maroua', patientNom: '', savedAt: new Date().toISOString() },
            { position: 2, orthophonisteNom: 'Mariem', patientNom: '', savedAt: new Date().toISOString() },
            { position: 3, orthophonisteNom: 'Stagiaire', patientNom: '', savedAt: new Date().toISOString() },
          ],
        });
      }
    });

    Object.values(allData).forEach((s: any) => {
      if (s.date === date && !dateSlots.some((slot) => slot.id === s.id)) {
        dateSlots.push(s);
      }
    });

    dateSlots.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, date, slots: dateSlots, defaultOrthophonistes: DEFAULT_ORTHOPHONISTES }));
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/agenda/autosave') {
    let bodyStr = '';
    req.on('data', (chunk) => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const { date, heureDebut, heureFin, position, orthophonisteNom, patientNom, notes, telephone } = body;
        const posNum = parseInt(position, 10);
        const slotId = `${date}_${heureDebut}`;
        const allData = readData();

        let slot = allData[slotId];
        if (!slot) {
          slot = {
            id: slotId,
            date,
            heureDebut,
            heureFin: heureFin || '14:45',
            updatedAt: new Date().toISOString(),
            positions: [
              { position: 1, orthophonisteNom: 'Maroua', patientNom: '', savedAt: new Date().toISOString() },
              { position: 2, orthophonisteNom: 'Mariem', patientNom: '', savedAt: new Date().toISOString() },
              { position: 3, orthophonisteNom: 'Stagiaire', patientNom: '', savedAt: new Date().toISOString() },
            ],
          };
        }

        const idx = posNum - 1;
        const cleanPat = String(patientNom || '').trim().toLowerCase();

        // Contrôle serveur : vérifier si le patient a déjà une séance le même jour
        if (cleanPat) {
          let conflictFound = false;
          let conflictDetail = '';
          Object.values(allData).forEach((s: any) => {
            if (s.date === date) {
              s.positions?.forEach((p: any) => {
                const isSameSlotAndPos = s.id === slotId && p.position === posNum;
                if (!isSameSlotAndPos && p.patientNom && p.patientNom.trim().toLowerCase() === cleanPat) {
                  conflictFound = true;
                  conflictDetail = `Séance déjà prévue à ${s.heureDebut} avec ${p.orthophonisteNom}`;
                }
              });
            }
          });

          if (conflictFound) {
            res.statusCode = 409;
            res.end(JSON.stringify({ 
              success: false, 
              blocked: true, 
              statusCode: 409,
              error: `Enregistrement bloqué : Patient déjà programmé ce jour-là ! (${conflictDetail})`,
              conflictDetail,
            }));
            return;
          }
        }

        if (slot.positions[idx]) {
          slot.positions[idx] = {
            position: posNum,
            orthophonisteNom: orthophonisteNom?.trim() || DEFAULT_ORTHOPHONISTES[idx],
            patientNom: patientNom !== undefined ? String(patientNom).trim() : '',
            notes: notes !== undefined ? String(notes).trim() : '',
            telephone: telephone !== undefined ? String(telephone).trim() : '',
            savedAt: new Date().toISOString(),
          };
        }

        slot.updatedAt = new Date().toISOString();
        allData[slotId] = slot;
        writeData(allData);

        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, savedAt: slot.updatedAt, slot }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
      }
    });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/agenda/orthophonistes') {
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, orthophonistes: DEFAULT_ORTHOPHONISTES }));
    return true;
  }

  // Endpoint de secours pour l'export des données de l'agenda
  if (req.method === 'GET' && pathname === '/api/export/data') {
    const allData = readData();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      cabinet: "Cabinet d'orthophonie Belgaied Maroua",
      exportedAt: new Date().toISOString(),
      slots: allData,
      totalSlots: Object.keys(allData).length,
    }));
    return true;
  }

  // Endpoint d'importation en masse
  if (req.method === 'POST' && pathname === '/api/import/bulk') {
    let bodyStr = '';
    req.on('data', (chunk) => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const { slots } = body;
        if (slots && typeof slots === 'object') {
          const current = readData();
          const merged = { ...current, ...slots };
          writeData(merged);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, count: Object.keys(slots).length }));
          return;
        }
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Structure de données invalide' }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Payload invalide' }));
      }
    });
    return true;
  }

  return false;
}
