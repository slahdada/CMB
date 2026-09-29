import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'agenda_simultane.json');

// Assurer le parsing JSON pour les requêtes d'autosave
app.use(express.json());

// Définition des types pour l'agenda simultané
export interface AppointmentPosition {
  position: 1 | 2 | 3;
  orthophonisteNom: string;
  patientNom: string;
  notes?: string;
  telephone?: string;
  savedAt?: string;
}

export interface SimultaneousSlot {
  id: string; // Ex: '2026-09-29_14:00'
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  positions: [AppointmentPosition, AppointmentPosition, AppointmentPosition];
  updatedAt: string;
}

// Intervenants par défaut selon la spécification
export const DEFAULT_ORTHOPHONISTES: [string, string, string] = [
  'Maroua',
  'Mariem',
  'Stagiaire'
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

// Assurer l'existence du dossier de données
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Lecture des données stockées
function readData(): Record<string, SimultaneousSlot> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Erreur lecture agenda_simultane.json:', err);
  }
  return {};
}

// Écriture atomique des données stockées
function writeData(data: Record<string, SimultaneousSlot>): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erreur écriture agenda_simultane.json:', err);
  }
}

// Générer un créneau par défaut avec les 3 praticiens
function createDefaultSlot(date: string, heureDebut: string, heureFin: string): SimultaneousSlot {
  return {
    id: `${date}_${heureDebut}`,
    date,
    heureDebut,
    heureFin,
    updatedAt: new Date().toISOString(),
    positions: [
      {
        position: 1,
        orthophonisteNom: DEFAULT_ORTHOPHONISTES[0],
        patientNom: '',
        notes: '',
        telephone: '',
        savedAt: new Date().toISOString(),
      },
      {
        position: 2,
        orthophonisteNom: DEFAULT_ORTHOPHONISTES[1],
        patientNom: '',
        notes: '',
        telephone: '',
        savedAt: new Date().toISOString(),
      },
      {
        position: 3,
        orthophonisteNom: DEFAULT_ORTHOPHONISTES[2],
        patientNom: '',
        notes: '',
        telephone: '',
        savedAt: new Date().toISOString(),
      },
    ],
  };
}

// ============================================================================
// API ROUTES
// ============================================================================

// 1. GET /api/agenda/slots?date=YYYY-MM-DD
app.get('/api/agenda/slots', (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const allData = readData();

  // Filtrer les créneaux existants pour la date demandée
  const dateSlots: SimultaneousSlot[] = [];

  // Garantir la présence des créneaux standards par défaut
  STANDARD_HOURS.forEach(({ start, end }) => {
    const slotId = `${date}_${start}`;
    if (allData[slotId]) {
      dateSlots.push(allData[slotId]);
    } else {
      // Propose par défaut les 3 positions (Maroua, Mariem, Stagiaire)
      const defaultSlot = createDefaultSlot(date, start, end);
      dateSlots.push(defaultSlot);
    }
  });

  // Ajouter d'éventuels créneaux personnalisés créés pour cette date
  Object.values(allData).forEach((slot) => {
    if (slot.date === date && !dateSlots.some((s) => s.id === slot.id)) {
      dateSlots.push(slot);
    }
  });

  // Trier par heure de début
  dateSlots.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));

  res.json({
    success: true,
    date,
    slots: dateSlots,
    defaultOrthophonistes: DEFAULT_ORTHOPHONISTES,
  });
});

// 2. POST /api/agenda/autosave (Sauvegarde automatique en tâche de fond)
app.post('/api/agenda/autosave', (req: Request, res: Response) => {
  const {
    date,
    heureDebut,
    heureFin,
    position,
    orthophonisteNom,
    patientNom,
    notes,
    telephone,
  } = req.body;

  if (!date || !heureDebut || !position) {
    return res.status(400).json({
      success: false,
      error: 'date, heureDebut et position (1, 2 ou 3) sont requis pour la sauvegarde automatique.',
    });
  }

  const posNum = parseInt(position, 10) as 1 | 2 | 3;
  if (![1, 2, 3].includes(posNum)) {
    return res.status(400).json({
      success: false,
      error: 'La position doit être comprise entre 1 et 3.',
    });
  }

  const allData = readData();
  const slotId = `${date}_${heureDebut}`;
  const nowIso = new Date().toISOString();

  // Récupérer le créneau existant ou l'initialiser
  let slot = allData[slotId];
  if (!slot) {
    const end = heureFin || (() => {
      const [h, m] = heureDebut.split(':').map(Number);
      const total = h * 60 + m + 45;
      const endH = String(Math.floor(total / 60) % 24).padStart(2, '0');
      const endM = String(total % 60).padStart(2, '0');
      return `${endH}:${endM}`;
    })();
    slot = createDefaultSlot(date, heureDebut, end);
  }

  // Mettre à jour la position ciblée (1, 2 ou 3)
  const posIndex = posNum - 1;
  const currentPos = slot.positions[posIndex];

  slot.positions[posIndex] = {
    position: posNum,
    orthophonisteNom: (orthophonisteNom !== undefined && orthophonisteNom !== null)
      ? String(orthophonisteNom).trim() || DEFAULT_ORTHOPHONISTES[posIndex]
      : (currentPos?.orthophonisteNom || DEFAULT_ORTHOPHONISTES[posIndex]),
    patientNom: (patientNom !== undefined && patientNom !== null)
      ? String(patientNom).trim()
      : (currentPos?.patientNom || ''),
    notes: notes !== undefined ? String(notes).trim() : (currentPos?.notes || ''),
    telephone: telephone !== undefined ? String(telephone).trim() : (currentPos?.telephone || ''),
    savedAt: nowIso,
  };

  slot.updatedAt = nowIso;
  allData[slotId] = slot;
  writeData(allData);

  return res.json({
    success: true,
    message: 'Créneau enregistré automatiquement avec succès.',
    savedAt: nowIso,
    slot,
    updatedPosition: slot.positions[posIndex],
  });
});

// 3. POST /api/agenda/add-slot (Ajouter un horaire personnalisé)
app.post('/api/agenda/add-slot', (req: Request, res: Response) => {
  const { date, heureDebut, heureFin } = req.body;
  if (!date || !heureDebut) {
    return res.status(400).json({ success: false, error: 'Date et heure de début requis' });
  }

  const end = heureFin || (() => {
    const [h, m] = heureDebut.split(':').map(Number);
    const total = h * 60 + m + 45;
    const endH = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const endM = String(total % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  })();

  const allData = readData();
  const slotId = `${date}_${heureDebut}`;

  if (!allData[slotId]) {
    allData[slotId] = createDefaultSlot(date, heureDebut, end);
    writeData(allData);
  }

  res.json({ success: true, slot: allData[slotId] });
});

// 4. GET /api/agenda/orthophonistes
app.get('/api/agenda/orthophonistes', (_req: Request, res: Response) => {
  res.json({
    success: true,
    orthophonistes: DEFAULT_ORTHOPHONISTES,
  });
});

// ============================================================================
// SERVIR LE FRONTEND (Vite en dev, static en prod)
// ============================================================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Serveur d'agenda médical actif sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Échec du démarrage du serveur:', err);
  process.exit(1);
});
