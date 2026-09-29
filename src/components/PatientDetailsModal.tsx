import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  MessageSquare, 
  Phone, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Edit3, 
  FileText,
  Save,
  Check,
  Stethoscope,
  Sparkles
} from 'lucide-react';
import { Patient, Session } from '../types';
import { 
  cleanWhatsAppNumber, 
  formatFrenchDate, 
  parseDateISO, 
  createWhatsAppReminderLink 
} from '../utils/dateUtils';

interface PatientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  patients: Patient[];
  sessions: Session[];
  onOpenNewSessionForPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  onEditSession: (session: Session) => void;
  onSavePatient?: (patient: Patient) => void;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patients,
  sessions,
  onOpenNewSessionForPatient,
  onEditPatient,
  onEditSession,
  onSavePatient,
}) => {
  const patient = patients.find((p) => p.id === patientId);

  // Local state for Notes Médicales (multiline text) - all hooks called unconditionally at top
  const [notesMedicales, setNotesMedicales] = useState<string>(
    patient ? (patient.notesMedicales ?? patient.notes ?? '') : ''
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync state whenever the selected patient changes
  useEffect(() => {
    if (patient) {
      setNotesMedicales(patient.notesMedicales ?? patient.notes ?? '');
      setSaveSuccess(false);
    }
  }, [patient?.id, patient?.notesMedicales, patient?.notes]);

  // Early return after all hooks have run
  if (!isOpen || !patientId || !patient) return null;

  const patientSessions = sessions
    .filter((s) => s.patientId === patient.id)
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));

  const totalSessions = patientSessions.length;
  const realisees = patientSessions.filter((s) => s.status === 'realisee').length;
  const planifiees = patientSessions.filter((s) => s.status === 'planifiee').length;
  const annulees = patientSessions.filter((s) => s.status === 'annulee' || s.status === 'absent').length;

  const waNum = cleanWhatsAppNumber(patient.telephone);

  // Save clinical notes
  const handleSaveNotes = () => {
    if (!onSavePatient) return;
    setIsSaving(true);
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('fr-FR')} à ${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;

    const updatedPatient: Patient = {
      ...patient,
      notesMedicales: notesMedicales.trim(),
      notes: notesMedicales.trim(), // sync with general notes for consistency
      notesMedicalesDate: formattedDate,
    };

    onSavePatient(updatedPatient);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  };

  // Helper to insert quick template notes
  const insertTemplate = (prefix: string) => {
    const todayStr = new Date().toLocaleDateString('fr-FR');
    const snippet = `\n[${prefix} - ${todayStr}] : `;
    setNotesMedicales((prev) => (prev ? `${prev}${snippet}` : `${snippet.trimStart()}`));
  };

  const isDirty = notesMedicales !== (patient.notesMedicales ?? patient.notes ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-emerald-50/50">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base uppercase shadow-2xs ${
                patient.isConventionne
                  ? 'bg-teal-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {patient.nom.slice(0, 2)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  {patient.nom}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    patient.isConventionne
                      ? 'bg-teal-100 text-teal-800 border border-teal-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {patient.isConventionne ? 'Conventionné CNAM' : 'Privé'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient.age ? `${patient.age} ans` : ''} • Pathologie :{' '}
                <strong className="text-slate-700">{patient.pathologie}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Quick Contact & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Téléphone / Contact direct</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${patient.telephone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 active:scale-95 transition shadow-2xs text-xs"
                  title="Lancer l'appel téléphonique"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Appeler ({patient.telephone})</span>
                </a>

                <a
                  href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                    `Bonjour ${patient.nom}, Cabinet d'orthophonie Belgaied Maroua à votre disposition.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 active:scale-95 transition shadow-2xs text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp direct</span>
                </a>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Couverture & Référence</span>
              <div className="mt-1 text-slate-800 font-semibold">
                {patient.assuranceDetails}
                {patient.numeroAssurance && (
                  <span className="block text-[11px] font-mono text-slate-500 font-normal">
                    N° : {patient.numeroAssurance}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CHAMP NOTES MÉDICALES (Zone de texte multiligne pour observations cliniques et suivi long terme) */}
          <div className="bg-gradient-to-br from-teal-50/50 via-slate-50 to-white p-4 rounded-2xl border border-teal-200/80 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>Notes médicales</span>
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full">
                      Dossier clinique
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Observations cliniques, bilans intermédiaires & suivi à long terme
                  </p>
                </div>
              </div>

              {/* Last update timestamp */}
              {patient.notesMedicalesDate && (
                <span className="text-[10px] text-slate-400 self-start sm:self-center font-medium">
                  Mis à jour le {patient.notesMedicalesDate}
                </span>
              )}
            </div>

            {/* Quick Template insertion chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-600" /> Insérer :
              </span>
              <button
                type="button"
                onClick={() => insertTemplate("Bilan d'évolution")}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-700 text-slate-600 transition"
              >
                + Bilan d'évolution
              </button>
              <button
                type="button"
                onClick={() => insertTemplate("Objectif thérapeutique")}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-700 text-slate-600 transition"
              >
                + Objectif rééducation
              </button>
              <button
                type="button"
                onClick={() => insertTemplate("Consignes à domicile")}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:text-teal-700 text-slate-600 transition"
              >
                + Exercices domicile
              </button>
            </div>

            {/* Multiline Textarea */}
            <div className="relative">
              <textarea
                value={notesMedicales}
                onChange={(e) => setNotesMedicales(e.target.value)}
                rows={5}
                placeholder="Consigner les observations cliniques de l'orthophoniste, l'évolution du patient, les résultats aux tests et bilans (ex: ELO, BILO, Alouette), les adaptations scolaires et le protocole de suivi à long terme..."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white text-slate-800 placeholder:text-slate-400 transition resize-y font-sans leading-relaxed"
              />
            </div>

            {/* Save Action Row with feedback */}
            <div className="flex items-center justify-between pt-1">
              <div>
                {saveSuccess ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in duration-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Notes médicales enregistrées avec succès !</span>
                  </span>
                ) : isDirty ? (
                  <span className="text-[11px] text-amber-700 font-medium">
                    Modifications non enregistrées
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Notes à jour dans le dossier patient
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSaving || (!isDirty && !saveSuccess)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${
                  isDirty
                    ? 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95 shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer les notes</span>
              </button>
            </div>
          </div>

          {/* Statistics summary */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Séances</span>
              <p className="text-xl font-black text-slate-800 mt-0.5">{totalSessions}</p>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Réalisées</span>
              <p className="text-xl font-black text-emerald-900 mt-0.5">{realisees}</p>
            </div>
            <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-100">
              <span className="text-[10px] uppercase font-bold text-sky-700">Prévues</span>
              <p className="text-xl font-black text-sky-900 mt-0.5">{planifiees}</p>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
              <span className="text-[10px] uppercase font-bold text-rose-700">Annulées</span>
              <p className="text-xl font-black text-rose-900 mt-0.5">{annulees}</p>
            </div>
          </div>

          {/* Sessions List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>Historique des séances de 45 minutes</span>
              </h4>
              <button
                onClick={() => {
                  onClose();
                  onOpenNewSessionForPatient(patient);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nouvelle séance</span>
              </button>
            </div>

            {patientSessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50 rounded-xl">
                Aucune séance enregistrée pour le moment.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {patientSessions.map((session) => {
                  const sDate = parseDateISO(session.date);

                  return (
                    <div
                      key={session.id}
                      className="p-3 hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {formatFrenchDate(sDate, false)}
                          </span>
                          <span className="font-mono text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                            {session.startTime} - {session.endTime} (45 min)
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              session.status === 'realisee'
                                ? 'bg-emerald-100 text-emerald-800'
                                : session.status === 'annulee'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        {session.motif && (
                          <p className="text-slate-500 mt-0.5">{session.motif}</p>
                        )}
                        {session.notesSeance && (
                          <p className="text-slate-400 italic text-[11px] mt-0.5">
                            "{session.notesSeance}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{session.tarif} DT</span>
                        <button
                          onClick={() => {
                            onClose();
                            onEditSession(session);
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-[11px] font-semibold"
                        >
                          Éditer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            onClick={() => {
              onClose();
              onEditPatient(patient);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Modifier la fiche complète</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
