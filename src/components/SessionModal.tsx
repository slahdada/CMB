import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle,
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
  const [orthophonisteNom, setOrthophonisteNom] = useState<string>(
    sessionToEdit?.orthophonisteNom || 'Maroua'
  );

  // Synchroniser systématiquement les champs dès que sessionToEdit change ou lors de l'ouverture
  useEffect(() => {
    if (sessionToEdit) {
      setPatientId(sessionToEdit.patientId);
      setDate(sessionToEdit.date);
      setStartTime(sessionToEdit.startTime);
      setStatus(sessionToEdit.status);
      setIsConventionne(sessionToEdit.isConventionne);
      setMotif(sessionToEdit.motif || '');
      setNotesSeance(sessionToEdit.notesSeance || '');
      setTarif(sessionToEdit.tarif);
      setOrthophonisteNom(sessionToEdit.orthophonisteNom || 'Maroua');
    } else {
      setPatientId(defaultPatient?.id || (patients[0]?.id ?? ''));
      setDate(defaultDate || '2026-09-29');
      setStartTime(defaultTime || '08:30');
      setStatus('planifiee');
      const conv = defaultPatient ? defaultPatient.isConventionne : true;
      setIsConventionne(conv);
      setMotif('');
      setNotesSeance('');
      setTarif(conv ? settings.tarifConventionne : settings.tarifNonConventionne);
      setOrthophonisteNom('Maroua');
    }
  }, [sessionToEdit, defaultDate, defaultTime, defaultPatient, isOpen, patients, settings]);

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

  // Nom du patient actuellement ciblé
  const selectedPatientObj = patients.find((pat) => pat.id === patientId);
  const currentPatientName = selectedPatientObj ? selectedPatientObj.nom : (sessionToEdit?.patientNom || '');

  // 1. RÈGLE STRICTE : Bloquer le même patient le même jour deux fois ou avec deux orthophonistes en même temps
  const patientSameDayConflict = existingSessions.find((s) => {
    if (isEditing && s.id === sessionToEdit.id) return false;
    if (s.date !== date) return false;
    if (s.status === 'annulee') return false;
    const matchId = patientId && s.patientId === patientId;
    const matchNom = currentPatientName && s.patientNom.trim().toLowerCase() === currentPatientName.trim().toLowerCase();
    return matchId || matchNom;
  });

  const isSimultaneousConflict = patientSameDayConflict && (
    patientSameDayConflict.startTime === startTime ||
    isOverlapping(startTime, endTime, patientSameDayConflict.startTime, patientSameDayConflict.endTime)
  );

  // 2. Conflit orthophoniste : l'orthophoniste ne peut pas avoir deux séances au même moment
  const sameSlotSessions = existingSessions.filter((s) => {
    if (isEditing && s.id === sessionToEdit.id) return false;
    if (s.date !== date) return false;
    if (s.status === 'annulee') return false;
    return isOverlapping(startTime, endTime, s.startTime, s.endTime);
  });

  const sameOrthoConflict = sameSlotSessions.find(
    (s) => (s.orthophonisteNom || 'Maroua').trim().toLowerCase() === orthophonisteNom.trim().toLowerCase()
  );
  const maxSimultaneousReached = sameSlotSessions.length >= 3;

  const isBlocked = !!patientSameDayConflict || !!sameOrthoConflict || maxSimultaneousReached;
  const hasConflict = isBlocked;

  const conflictingSession = sameOrthoConflict || (maxSimultaneousReached ? sameSlotSessions[0] : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Blocage strict : aucun enregistrement en double n'est autorisé
    if (patientSameDayConflict) {
      alert(
        isSimultaneousConflict
          ? `Blocage : ${currentPatientName} a déjà une séance prévue à la même heure (${patientSameDayConflict.startTime}) avec ${patientSameDayConflict.orthophonisteNom || 'Maroua'}.\nIl est strictement interdit d'inscrire le même patient avec deux orthophonistes en même temps.`
          : `Blocage : ${currentPatientName} a déjà une séance prévue le ${date} de ${patientSameDayConflict.startTime} à ${patientSameDayConflict.endTime} avec ${patientSameDayConflict.orthophonisteNom || 'Maroua'}.\nUn patient ne peut pas avoir deux séances le même jour.`
      );
      return;
    }

    if (sameOrthoConflict) {
      alert(`L'orthophoniste ${orthophonisteNom} est déjà occupé(e) sur ce créneau.`);
      return;
    }

    if (maxSimultaneousReached) {
      alert(`Le créneau ${startTime} comporte déjà 3 séances simultanées.`);
      return;
    }

    const p = patients.find((pat) => pat.id === patientId);
    const resolvedNom = p ? p.nom : (sessionToEdit?.patientNom || 'Patient');
    const resolvedPatientId = p ? p.id : (sessionToEdit?.patientId || patientId);
    const resolvedOrtho = orthophonisteNom.trim() || 'Maroua';
    const pos: 1 | 2 | 3 = resolvedOrtho.toLowerCase().includes('mariem')
      ? 2
      : resolvedOrtho.toLowerCase().includes('stagiaire')
      ? 3
      : 1;

    const newSession: Session = {
      id: sessionToEdit?.id || `ses-${Date.now()}`,
      patientId: resolvedPatientId,
      patientNom: resolvedNom,
      date,
      startTime,
      endTime: add45Minutes(startTime),
      durationMinutes: 45, // Toujours 45 min
      isConventionne,
      status,
      tarif: Number(tarif),
      motif: motif.trim() || undefined,
      notesSeance: notesSeance.trim() || undefined,
      orthophonisteNom: resolvedOrtho,
      position: pos,
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

        {/* Conflict Warning & Strict Blockers */}
        {patientSameDayConflict && (
          <div className="mx-4 sm:mx-5 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-950 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-black text-rose-900 block text-sm">
                {isSimultaneousConflict
                  ? "Enregistrement bloqué : Conflit d'horaire avec deux orthophonistes !"
                  : "Enregistrement bloqué : Patient déjà programmé ce jour-là !"}
              </strong>
              <p className="mt-1 text-rose-900 leading-relaxed font-medium">
                Le patient <strong>{currentPatientName || patientSameDayConflict.patientNom}</strong> a déjà une séance enregistrée le <strong>{date}</strong> de <strong>{patientSameDayConflict.startTime} à {patientSameDayConflict.endTime}</strong> avec <strong>{patientSameDayConflict.orthophonisteNom || 'Maroua'}</strong>.
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200">
                <span>⛔ Règle du cabinet : Un même patient ne peut pas avoir deux séances le même jour, ni deux orthophonistes en même temps.</span>
              </div>
            </div>
          </div>
        )}

        {!patientSameDayConflict && sameOrthoConflict && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">L'orthophoniste {orthophonisteNom} est déjà occupé(e) !</strong>
              <p className="mt-0.5 text-amber-800">
                Une séance avec <strong>{sameOrthoConflict.patientNom}</strong> est déjà enregistrée de {sameOrthoConflict.startTime} à {sameOrthoConflict.endTime}.
              </p>
            </div>
          </div>
        )}

        {!patientSameDayConflict && !sameOrthoConflict && maxSimultaneousReached && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Capacité maximale atteinte (3 séances simultanées)</strong>
              <p className="mt-0.5 text-amber-800">
                Le créneau de {startTime} à {endTime} a déjà 3 séances pour les 3 orthophonistes.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Orthophoniste Attribué (Maroua, Mariem, Stagiaire) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Orthophoniste attribué(e) *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Maroua', label: 'Maroua (Titulaire)', activeBg: 'bg-teal-600 text-white' },
                { name: 'Mariem', label: 'Mariem (Collab.)', activeBg: 'bg-indigo-600 text-white' },
                { name: 'Stagiaire', label: 'Stagiaire', activeBg: 'bg-amber-600 text-white' },
              ].map((ortho) => (
                <button
                  type="button"
                  key={ortho.name}
                  onClick={() => setOrthophonisteNom(ortho.name)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center ${
                    orthophonisteNom === ortho.name
                      ? `${ortho.activeBg} border-transparent shadow-xs`
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {ortho.label}
                </button>
              ))}
            </div>
            <div className="pt-0.5">
              <input
                type="text"
                value={orthophonisteNom}
                onChange={(e) => setOrthophonisteNom(e.target.value)}
                placeholder="Ou saisir un autre nom (remplaçant, externe)..."
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>
          </div>

          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Patient concerné *
            </label>
            <select
              value={patientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              required
              className={`w-full px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 font-semibold transition ${
                patientSameDayConflict
                  ? 'border-rose-500 bg-rose-50/40 text-rose-950 focus:ring-rose-500'
                  : 'border-slate-200 text-slate-800 focus:ring-teal-500'
              }`}
            >
              {sessionToEdit && !patients.some((p) => p.id === sessionToEdit.patientId) && (
                <option value={sessionToEdit.patientId}>
                  {sessionToEdit.patientNom} (Patient d'origine)
                </option>
              )}
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} {p.isConventionne ? '(Conventionné CNAM)' : '(Privé)'} - {p.pathologie}
                </option>
              ))}
            </select>
            {patientSameDayConflict && (
              <div className="mt-1.5 flex items-center gap-1.5 text-rose-600 font-bold text-xs animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                <span>Enregistrement bloqué : Patient déjà programmé ce jour-là !</span>
                <span className="text-[11px] font-medium text-rose-700 hidden sm:inline">
                  ({patientSameDayConflict.startTime} avec {patientSameDayConflict.orthophonisteNom || 'Maroua'})
                </span>
              </div>
            )}
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
                disabled={isBlocked}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  isBlocked
                    ? 'bg-rose-100 text-rose-600 border border-rose-300 cursor-not-allowed opacity-90'
                    : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
                }`}
              >
                {isBlocked ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <Check className="w-4 h-4" />}
                <span>
                  {patientSameDayConflict
                    ? (isSimultaneousConflict ? 'Bloqué : Même patient au même temps' : 'Bloqué : Déjà programmé ce jour')
                    : sameOrthoConflict
                    ? 'Créneau orthophoniste occupé'
                    : maxSimultaneousReached
                    ? '3 créneaux déjà occupés'
                    : isEditing
                    ? 'Enregistrer modifications'
                    : 'Confirmer la séance'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
