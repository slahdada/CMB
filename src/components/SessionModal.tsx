import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Trash2, 
  Check, 
  FileText 
} from 'lucide-react';
import { Session, Patient, SessionStatus, CabinetSettings } from '../types';
import { 
  STANDARD_45_SLOTS, 
  add45Minutes, 
  isOverlapping, 
  formatDateISO 
} from '../utils/dateUtils';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: (session: Session) => void;
  onDeleteSession?: (sessionId: string) => void;
  sessionToEdit?: Session;
  defaultDate?: string;
  defaultTime?: string;
  defaultPatient?: Patient;
  patients: Patient[];
  existingSessions: Session[];
  settings: CabinetSettings;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  onSaveSession,
  onDeleteSession,
  sessionToEdit,
  defaultDate,
  defaultTime,
  defaultPatient,
  patients,
  existingSessions,
  settings,
}) => {
  const isEditing = !!sessionToEdit;

  // Form states - all hooks called unconditionally at the top
  const [patientId, setPatientId] = useState<string>(
    sessionToEdit?.patientId || defaultPatient?.id || (patients[0]?.id ?? '')
  );
  const [date, setDate] = useState<string>(
    sessionToEdit?.date || defaultDate || '2026-09-29'
  );
  const [startTime, setStartTime] = useState<string>(
    sessionToEdit?.startTime || defaultTime || '08:30'
  );
  const [status, setStatus] = useState<SessionStatus>(
    sessionToEdit?.status || 'planifiee'
  );
  const [isConventionne, setIsConventionne] = useState<boolean>(
    sessionToEdit ? sessionToEdit.isConventionne : (defaultPatient?.isConventionne ?? true)
  );
  const [motif, setMotif] = useState<string>(
    sessionToEdit?.motif || ''
  );
  const [notesSeance, setNotesSeance] = useState<string>(
    sessionToEdit?.notesSeance || ''
  );
  const [tarif, setTarif] = useState<number>(
    sessionToEdit?.tarif ?? (isConventionne ? settings.tarifConventionne : settings.tarifNonConventionne)
  );

  // Early return after all hooks have been declared
  if (!isOpen) return null;

  // Automatically update conventionné & tarif when patient selection changes
  const handlePatientChange = (selectedId: string) => {
    setPatientId(selectedId);
    const p = patients.find((pat) => pat.id === selectedId);
    if (p) {
      setIsConventionne(p.isConventionne);
      setTarif(p.isConventionne ? settings.tarifConventionne : settings.tarifNonConventionne);
      if (!motif && p.pathologie) {
        setMotif(`Séance rééducation - ${p.pathologie}`);
      }
    }
  };

  // Fixed 45-min end time
  const endTime = add45Minutes(startTime);

  // Check for conflicts
  const hasConflict = existingSessions.some((s) => {
    if (isEditing && s.id === sessionToEdit.id) return false;
    if (s.date !== date) return false;
    if (s.status === 'annulee') return false;
    return isOverlapping(startTime, endTime, s.startTime, s.endTime);
  });

  const conflictingSession = hasConflict
    ? existingSessions.find(
        (s) =>
          (!isEditing || s.id !== sessionToEdit.id) &&
          s.date === date &&
          s.status !== 'annulee' &&
          isOverlapping(startTime, endTime, s.startTime, s.endTime)
      )
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return;

    const newSession: Session = {
      id: sessionToEdit?.id || `ses-${Date.now()}`,
      patientId: p.id,
      patientNom: p.nom,
      date,
      startTime,
      endTime,
      durationMinutes: 45, // Toujours 45 min
      isConventionne,
      status,
      tarif: Number(tarif),
      motif: motif.trim() || undefined,
      notesSeance: notesSeance.trim() || undefined,
    };

    onSaveSession(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Modifier la séance de 45 min' : 'Programmer une séance (45 min)'}
              </h3>
              <p className="text-xs text-slate-500">
                Cabinet d'orthophonie Belgaied Maroua
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Warning */}
        {hasConflict && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Attention, chevauchement d'horaire !</strong>
              <p className="mt-0.5 text-amber-800">
                Une autre séance avec <strong>{conflictingSession?.patientNom}</strong> est déjà enregistrée de {conflictingSession?.startTime} à {conflictingSession?.endTime}.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient concerné *
            </label>
            <select
              value={patientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.isConventionne ? '(Conventionné CNAM)' : '(Privé)'} - {p.pathologie}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Quick 45-min slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date de la séance *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Heure de début *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Duration badge notification */}
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-between text-xs text-teal-900">
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              Durée fixe : <strong>45 minutes</strong>
            </span>
            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200">
              {startTime} → {endTime}
            </span>
          </div>

          {/* Quick Slot Buttons */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Créneaux types de 45 minutes :
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {STANDARD_45_SLOTS.map((slot) => (
                <button
                  type="button"
                  key={slot.start}
                  onClick={() => setStartTime(slot.start)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-lg border text-center transition ${
                    startTime === slot.start
                      ? 'bg-teal-600 text-white font-bold border-teal-600 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {slot.start}
                </button>
              ))}
            </div>
          </div>

          {/* Insurance Status & Tarif */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Régime de prise en charge
              </label>
              <div className="flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsConventionne(true);
                    setTarif(settings.tarifConventionne);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    isConventionne
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Conventionné</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConventionne(false);
                    setTarif(settings.tarifNonConventionne);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                    !isConventionne
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Privé</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tarif de la séance ({settings.devise})
              </label>
              <input
                type="number"
                value={tarif}
                onChange={(e) => setTarif(Number(e.target.value))}
                min="0"
                step="1"
                required
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Statut de la séance
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 'planifiee', label: 'Planifiée', color: 'bg-sky-50 text-sky-800 border-sky-300' },
                { val: 'realisee', label: 'Réalisée', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
                { val: 'annulee', label: 'Annulée', color: 'bg-rose-50 text-rose-800 border-rose-300' },
                { val: 'absent', label: 'Absent', color: 'bg-amber-50 text-amber-800 border-amber-300' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.val}
                  onClick={() => setStatus(item.val as SessionStatus)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition ${
                    status === item.val
                      ? `${item.color} ring-2 ring-teal-500 shadow-2xs`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Motif & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Motif / Intitulé (optionnel)
            </label>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex: Rééducation fluence, Bilan phonologique..."
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes cliniques / observations de la séance
            </label>
            <textarea
              value={notesSeance}
              onChange={(e) => setNotesSeance(e.target.value)}
              rows={2}
              placeholder="Ex: Bonne concentration, exercices sur les fricatives réussis, travail à poursuivre à domicile..."
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isEditing && onDeleteSession ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Voulez-vous supprimer cette séance ?')) {
                    onDeleteSession(sessionToEdit.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 active:scale-95 transition shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Enregistrer modifications' : 'Confirmer la séance'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
