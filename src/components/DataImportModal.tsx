import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Download, 
  Database, 
  Users, 
  Calendar, 
  Sparkles,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { Patient, Session, CabinetSettings } from '../types';
import { add45Minutes, formatDateISO } from '../utils/dateUtils';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'planning' | 'simultane' | 'patients' | 'dashboard' | 'settings';
  patients: Patient[];
  sessions: Session[];
  settings: CabinetSettings;
  onImportPatients: (patients: Patient[], mode: 'merge' | 'replace') => void;
  onImportSessions: (sessions: Session[], mode: 'merge' | 'replace') => void;
  onImportAll?: (data: { patients: Patient[]; sessions: Session[]; settings?: CabinetSettings }) => void;
}

type ImportType = 'patients' | 'sessions' | 'auto';

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  patients,
  sessions,
  settings,
  onImportPatients,
  onImportSessions,
  onImportAll,
}) => {
  // Déterminer le type d'import cible selon l'onglet actif
  const defaultType: ImportType = activeTab === 'patients' ? 'patients' : 'sessions';
  const [importType, setImportType] = useState<ImportType>(defaultType);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');

  // Données analysées prêtes à importer
  const [parsedPatients, setParsedPatients] = useState<Patient[]>([]);
  const [parsedSessions, setParsedSessions] = useState<Session[]>([]);
  const [detectedType, setDetectedType] = useState<'patients' | 'sessions' | 'full' | null>(null);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Réinitialiser l'état
  const handleReset = () => {
    setFileName('');
    setFileContent('');
    setParsedPatients([]);
    setParsedSessions([]);
    setDetectedType(null);
    setValidationErrors([]);
    setWarnings([]);
    setIsSuccess(false);
  };

  // Parser CSV
  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error("Le fichier CSV est vide ou ne comporte pas d'en-tête.");
    }

    // Détecter le séparateur (, ou ;)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
    const headers = firstLine.split(separator).map((h) => h.trim().toLowerCase().replace(/["']/g, ''));

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(separator).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  // Traiter le fichier importé
  const processFile = (file: File) => {
    handleReset();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setFileContent(content);

      try {
        const isJson = file.name.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[');

        if (isJson) {
          const parsed = JSON.parse(content);

          // Cas 1 : Sauvegarde globale complète { patients: [], sessions: [] }
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.patients || parsed.sessions)) {
            const pts: Patient[] = Array.isArray(parsed.patients) ? parsed.patients : [];
            const ses: Session[] = Array.isArray(parsed.sessions) ? parsed.sessions : [];
            setParsedPatients(pts);
            setParsedSessions(ses);
            setDetectedType('full');
            return;
          }

          // Cas 2 : Tableau d'objets JSON
          if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
              setValidationErrors(["Le fichier JSON contient une liste vide."]);
              return;
            }

            const first = parsed[0];
            // Détection si c'est une liste de patients ou de séances
            if (first.startTime !== undefined || first.date !== undefined || first.orthophonisteNom !== undefined) {
              // Séances
              const validSessions: Session[] = parsed.map((s, idx) => ({
                id: s.id || `ses-imp-${Date.now()}-${idx}`,
                patientId: s.patientId || `pat-temp-${idx}`,
                patientNom: s.patientNom || s.nom || 'Patient',
                date: s.date || formatDateISO(new Date()),
                startTime: s.startTime || '09:00',
                endTime: s.endTime || add45Minutes(s.startTime || '09:00'),
                durationMinutes: 45,
                isConventionne: s.isConventionne !== undefined ? !!s.isConventionne : true,
                status: s.status || 'planifiee',
                tarif: Number(s.tarif) || (s.isConventionne ? 35 : 50),
                motif: s.motif || undefined,
                notesSeance: s.notesSeance || undefined,
                orthophonisteNom: s.orthophonisteNom || 'Maroua',
                position: s.position || 1,
              }));

              setParsedSessions(validSessions);
              setDetectedType('sessions');
            } else {
              // Patients
              const validPatients: Patient[] = parsed.map((p, idx) => {
                const isConv = p.isConventionne !== undefined ? !!p.isConventionne : true;
                return {
                  id: p.id || `pat-imp-${Date.now()}-${idx}`,
                  nom: p.nom || p.patientNom || `Patient ${idx + 1}`,
                  telephone: p.telephone || p.tel || '',
                  dateNaissance: p.dateNaissance || '',
                  isConventionne: isConv,
                  assuranceDetails: p.assuranceDetails || (isConv ? 'CNAM - Filière conventionnée' : 'Privé'),
                  numeroAssurance: p.numeroAssurance || p.numAffiliationCNAM || undefined,
                  pathologie: p.pathologie || 'Non précisé',
                  nombreSeancesPrescrites: Number(p.nombreSeancesPrescrites) || Number(p.seancesPrescrites) || Number(p.seances) || 30,
                  notes: p.notes || p.notesMedicales || p.medecinPrescripteur || undefined,
                  notesMedicales: p.notesMedicales || undefined,
                  status: (p.status === 'en_attente' || p.status === 'termine' ? p.status : 'actif') as any,
                  dateCreation: p.dateCreation || new Date().toISOString(),
                };
              });

              setParsedPatients(validPatients);
              setDetectedType('patients');
            }
            return;
          }
        }

        // Cas CSV
        const { headers, rows } = parseCSV(content);

        // Détection de structure CSV
        const isSessionCSV = headers.some((h) => h.includes('heure') || h.includes('horaire') || h.includes('seance') || h.includes('start') || h.includes('ortho'));

        if (isSessionCSV || importType === 'sessions') {
          const list: Session[] = [];
          const warnList: string[] = [];

          rows.forEach((r, idx) => {
            const nom = r['patient'] || r['patientnom'] || r['nom'] || r['nom & prénom'] || '';
            if (!nom) return;

            const dateStr = r['date'] || formatDateISO(new Date());
            const start = r['heure'] || r['horaire'] || r['starttime'] || r['heure début'] || '09:00';
            const ortho = r['ortho'] || r['orthophoniste'] || r['praticien'] || 'Maroua';
            const regime = (r['regime'] || r['cnam'] || r['prise en charge'] || '').toLowerCase();
            const isConv = regime.includes('cnam') || regime.includes('conv') || regime === 'true' || regime === '1';

            list.push({
              id: `ses-csv-${Date.now()}-${idx}`,
              patientId: `pat-csv-${idx}`,
              patientNom: nom,
              date: dateStr,
              startTime: start,
              endTime: add45Minutes(start),
              durationMinutes: 45,
              isConventionne: isConv,
              status: (r['statut']?.toLowerCase().includes('realis') ? 'realisee' : 'planifiee') as any,
              tarif: Number(r['tarif']) || (isConv ? 35 : 50),
              motif: r['motif'] || r['diagnostic'] || undefined,
              notesSeance: r['notes'] || r['observations'] || undefined,
              orthophonisteNom: ortho,
              position: ortho.toLowerCase().includes('mariem') ? 2 : ortho.toLowerCase().includes('stagiaire') ? 3 : 1,
            });
          });

          setParsedSessions(list);
          setDetectedType('sessions');
          if (warnList.length > 0) setWarnings(warnList);
        } else {
          // Patients CSV
          const list: Patient[] = [];

          rows.forEach((r, idx) => {
            const nom = r['nom'] || r['nom & prénom'] || r['patient'] || r['nom complet'] || '';
            if (!nom) return;

            const regime = (r['regime'] || r['cnam'] || r['prise en charge'] || r['type'] || '').toLowerCase();
            const isConv = regime.includes('cnam') || regime.includes('conv') || regime === 'true' || regime === '1' || regime === '';

            list.push({
              id: `pat-csv-${Date.now()}-${idx}`,
              nom,
              telephone: r['telephone'] || r['tel'] || r['gsm'] || '',
              dateNaissance: r['datenaissance'] || r['date naiss.'] || r['naissance'] || '',
              isConventionne: isConv,
              assuranceDetails: isConv ? 'CNAM - Filière conventionnée' : 'Privé',
              numeroAssurance: r['numaffiliationcnam'] || r['n° cnam'] || r['cnam'] || undefined,
              pathologie: r['pathologie'] || r['diagnostic'] || r['motif'] || 'Non précisé',
              nombreSeancesPrescrites: Number(r['nombreseancesprescrites'] || r['seances'] || r['seancesprescrites'] || r['total seances'] || 30),
              notes: r['notes'] || r['medecinprescripteur'] || r['medecin'] || undefined,
              status: 'actif',
              dateCreation: new Date().toISOString(),
            });
          });

          setParsedPatients(list);
          setDetectedType('patients');
        }
      } catch (err: any) {
        setValidationErrors([`Erreur d'analyse du fichier : ${err.message || 'Format invalide'}`]);
      }
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Exécution de l'import
  const handleConfirmImport = () => {
    if (detectedType === 'full' && onImportAll) {
      onImportAll({ patients: parsedPatients, sessions: parsedSessions, settings });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        handleReset();
      }, 1200);
      return;
    }

    if (parsedPatients.length > 0 && (detectedType === 'patients' || importType === 'patients')) {
      onImportPatients(parsedPatients, mode);
    }

    if (parsedSessions.length > 0 && (detectedType === 'sessions' || importType === 'sessions')) {
      onImportSessions(parsedSessions, mode);
    }

    setIsSuccess(true);
    setTimeout(() => {
      onClose();
      handleReset();
    }, 1200);
  };

  // Télécharger un modèle d'exemple CSV
  const downloadSampleCSV = (type: 'patients' | 'sessions') => {
    let csv = '';
    let fName = '';

    if (type === 'patients') {
      csv = "Nom & Prénom;Téléphone;Date Naissance;Prise en charge;N° CNAM;Diagnostic / Pathologie;Médecin\n" +
            "Karim Trabelsi;98123456;2017-05-12;Conventionné CNAM;CNAM-78901;Retard de parole et langage;Dr. Ben Amor\n" +
            "Sarra Mansouri;22456789;2015-11-23;Privé;;Dysphasie de développement;Dr. Khemir\n" +
            "Youssef Jaziri;55987654;2019-02-14;Conventionné CNAM;CNAM-45612;Bégaiement développemental;Dr. Gharbi";
      fName = "Modele_Import_Patients_Cabinet_Belgaied.csv";
    } else {
      csv = "Date;Heure;Patient;Orthophoniste;Prise en charge;Tarif;Statut;Observations\n" +
            "2026-09-29;09:15;Nour Bouazizi;Maroua;CNAM;35;realisee;Séance rééducation fluence réussie\n" +
            "2026-09-29;10:00;Mohamed Aziz Khemir;Mariem;Privé;50;planifiee;Travail articulatoire sur fricatives\n" +
            "2026-09-29;10:45;Lina Ben Salem;Stagiaire;CNAM;35;planifiee;Bilan phonologique de suivi";
      fName = "Modele_Import_Seances_Cabinet_Belgaied.csv";
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSessionMode = importType === 'sessions' || detectedType === 'sessions';
  const totalParsedCount = detectedType === 'full' 
    ? parsedPatients.length + parsedSessions.length 
    : (detectedType === 'patients' ? parsedPatients.length : parsedSessions.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Importer des données</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  JSON / CSV
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Cabinet d'orthophonie Belgaied Maroua • Chargement en masse sécurisé
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Sélecteur de type d'import */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Type de données à importer :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setImportType('patients'); handleReset(); }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  importType === 'patients'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Dossiers Patients (en masse)</span>
              </button>

              <button
                type="button"
                onClick={() => { setImportType('sessions'); handleReset(); }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  importType === 'sessions'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Séances & Planning (45 min)</span>
              </button>
            </div>
          </div>

          {/* Zone de glisser-déposer / sélection de fichier */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
                : fileName
                ? 'border-teal-400 bg-slate-50'
                : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,text/csv,application/json,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-2xs">
                {fileName ? <FileSpreadsheet className="w-6 h-6 text-teal-600" /> : <Upload className="w-6 h-6 text-teal-600" />}
              </div>

              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  {fileName ? fileName : "Cliquez ou déposez votre fichier ici"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Formats supportés : <strong>.JSON</strong> ou <strong>.CSV</strong> (séparateurs virgule ou point-virgule)
                </p>
              </div>
            </div>
          </div>

          {/* Modèle de fichier à télécharger */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">Besoin d'un exemple de fichier ?</span>
            <button
              type="button"
              onClick={() => downloadSampleCSV(importType === 'patients' ? 'patients' : 'sessions')}
              className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger le modèle CSV ({importType === 'patients' ? 'Patients' : 'Séances'})</span>
            </button>
          </div>

          {/* Erreurs de validation */}
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {validationErrors.map((err, i) => (
                  <p key={i} className="font-semibold">{err}</p>
                ))}
              </div>
            </div>
          )}

          {/* Aperçu des données détectées */}
          {totalParsedCount > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Données prêtes à être intégrées :
                </span>
                <span className="px-2 py-0.5 rounded-full font-black bg-emerald-200 text-emerald-900 text-[11px]">
                  {totalParsedCount} élément{totalParsedCount > 1 ? 's' : ''} détecté{totalParsedCount > 1 ? 's' : ''}
                </span>
              </div>

              {detectedType === 'full' ? (
                <p className="text-[11px] text-emerald-800">
                  Sauvegarde globale détectée : <strong>{parsedPatients.length}</strong> patients et <strong>{parsedSessions.length}</strong> séances.
                </p>
              ) : detectedType === 'patients' ? (
                <p className="text-[11px] text-emerald-800">
                  <strong>{parsedPatients.length}</strong> fiches patients valides trouvées. Exemples : {parsedPatients.slice(0, 3).map(p => p.nom).join(', ')}{parsedPatients.length > 3 ? '...' : ''}.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-800">
                  <strong>{parsedSessions.length}</strong> séances valides trouvées. Exemples : {parsedSessions.slice(0, 3).map(s => `${s.patientNom} (${s.date} ${s.startTime})`).join(', ')}{parsedSessions.length > 3 ? '...' : ''}.
                </p>
              )}

              {/* Mode de fusion / remplacement */}
              <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between gap-3 text-slate-800">
                <span className="text-[11px] font-bold">Méthode d'importation :</span>
                <div className="inline-flex rounded-lg bg-emerald-100/70 p-0.5 border border-emerald-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setMode('merge')}
                    className={`px-2 py-1 rounded-md transition ${mode === 'merge' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-emerald-700'}`}
                  >
                    Fusionner (Ajout)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('replace')}
                    className={`px-2 py-1 rounded-md transition ${mode === 'replace' ? 'bg-white text-rose-800 shadow-2xs' : 'text-emerald-700'}`}
                  >
                    Remplacer tout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Succès message */}
          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4" />
              <span>Importation effectuée avec succès ! Synchronisation en cours...</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={totalParsedCount === 0 || isSuccess}
            onClick={handleConfirmImport}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              totalParsedCount > 0 && !isSuccess
                ? 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Valider l'importation ({totalParsedCount})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
