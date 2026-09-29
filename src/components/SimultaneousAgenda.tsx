import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X,
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Phone, 
  MessageSquare, 
  RefreshCw,
  Edit2
} from 'lucide-react';
import { Patient, Session } from '../types';
import { formatDateISO, parseDateISO, formatFrenchDate, cleanWhatsAppNumber, add45Minutes } from '../utils/dateUtils';

interface SimultaneousAgendaProps {
  patients: Patient[];
  sessions: Session[];
  onSaveSession: (session: Session) => void;
  onDeleteSession?: (sessionId: string) => void;
  onOpenPhoneModal?: () => void;
  onSelectPatientDetails?: (patientId: string) => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

export const DEFAULT_ORTHOPHONISTES: [string, string, string] = [
  'Maroua',
  'Mariem',
  'Stagiaire',
];

const STANDARD_HOURS = [
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

const ORTHO_COLORS = {
  1: {
    badge: 'bg-teal-50 text-teal-800 border-teal-200',
    ring: 'focus:ring-teal-500',
    border: 'border-teal-200/80',
    avatar: 'bg-teal-600 text-white',
    dot: 'bg-teal-500',
  },
  2: {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    ring: 'focus:ring-indigo-500',
    border: 'border-indigo-200/80',
    avatar: 'bg-indigo-600 text-white',
    dot: 'bg-indigo-500',
  },
  3: {
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    ring: 'focus:ring-amber-500',
    border: 'border-amber-200/80',
    avatar: 'bg-amber-600 text-white',
    dot: 'bg-amber-500',
  },
};

interface SlotPositionState {
  position: 1 | 2 | 3;
  orthophonisteNom: string;
  patientNom: string;
  notes: string;
  telephone: string;
  sessionId?: string;
  savedAt?: string;
}

interface TripleSlotItem {
  id: string; // Ex: '2026-09-29_10:00'
  date: string;
  heureDebut: string;
  heureFin: string;
  positions: [SlotPositionState, SlotPositionState, SlotPositionState];
}

export const SimultaneousAgenda: React.FC<SimultaneousAgendaProps> = ({
  patients,
  sessions,
  onSaveSession,
  onDeleteSession,
  onOpenPhoneModal,
  onSelectPatientDetails,
  selectedDate: externalDate,
  onDateChange,
}) => {
  const [internalDate, setInternalDate] = useState<string>(externalDate || '2026-09-29');
  const selectedDate = externalDate || internalDate;

  const updateDate = (newDate: string) => {
    setInternalDate(newDate);
    if (onDateChange) onDateChange(newDate);
  };

  // Autosave status states
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [activeEditingKey, setActiveEditingKey] = useState<string | null>(null);

  // New custom slot modal
  const [customTime, setCustomTime] = useState<string>('18:00');
  const [showAddSlot, setShowAddSlot] = useState<boolean>(false);

  // Custom added time slots for the day (if not in standard list)
  const [extraSlots, setExtraSlots] = useState<string[]>([]);

  // Local draft overrides while typing (keyed by `slotId_pos`)
  const [draftOverrides, setDraftOverrides] = useState<Record<string, Partial<SlotPositionState>>>({});

  // Alerte visuelle de blocage de doublon
  const [duplicateAlert, setDuplicateAlert] = useState<{
    patient: string;
    date: string;
    time: string;
    ortho: string;
    isSameTime: boolean;
    message: string;
  } | null>(null);

  // Debounce timers reference
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // 1. Liste unifiée des créneaux horaires pour le jour sélectionné
  const slotStartTimes = useMemo(() => {
    const times = new Set<string>();
    STANDARD_HOURS.forEach((h) => times.add(h.start));
    extraSlots.forEach((t) => times.add(t));
    sessions
      .filter((s) => s.date === selectedDate)
      .forEach((s) => times.add(s.startTime));
    return Array.from(times).sort();
  }, [sessions, selectedDate, extraSlots]);

  // 2. Construction dynamique des créneaux triples fusionnés avec l'état global `sessions`
  const tripleSlots: TripleSlotItem[] = useMemo(() => {
    return slotStartTimes.map((start) => {
      const standardMatch = STANDARD_HOURS.find((h) => h.start === start);
      const end = standardMatch ? standardMatch.end : add45Minutes(start);
      const slotId = `${selectedDate}_${start}`;

      // Séances du créneau pour la date active
      const slotSessions = sessions.filter(
        (s) => s.date === selectedDate && s.startTime === start && s.status !== 'annulee'
      );

      // Attribution intelligente aux 3 positions (Maroua, Mariem, Stagiaire)
      const posMap: (Session | undefined)[] = [undefined, undefined, undefined];
      const unassignedSessions: Session[] = [];

      slotSessions.forEach((session) => {
        const ortho = (session.orthophonisteNom || '').trim().toLowerCase();
        if (session.position === 1 || ortho.includes('maroua')) {
          if (!posMap[0]) posMap[0] = session;
          else unassignedSessions.push(session);
        } else if (session.position === 2 || ortho.includes('mariem')) {
          if (!posMap[1]) posMap[1] = session;
          else unassignedSessions.push(session);
        } else if (session.position === 3 || ortho.includes('stagiaire')) {
          if (!posMap[2]) posMap[2] = session;
          else unassignedSessions.push(session);
        } else {
          unassignedSessions.push(session);
        }
      });

      // Distribuer les séances restantes sur les positions libres
      unassignedSessions.forEach((session) => {
        const freeIndex = posMap.findIndex((s) => s === undefined);
        if (freeIndex !== -1) {
          posMap[freeIndex] = session;
        }
      });

      // Construire l'état pour les 3 positions
      const positions = ([1, 2, 3] as const).map((posNum, idx) => {
        const key = `${slotId}_pos_${posNum}`;
        const draft = draftOverrides[key];
        const session = posMap[idx];
        const defaultOrtho = DEFAULT_ORTHOPHONISTES[idx];

        // Résolution du téléphone
        let phone = session?.patientId
          ? patients.find((p) => p.id === session.patientId)?.telephone || ''
          : '';

        const posState: SlotPositionState = {
          position: posNum,
          orthophonisteNom: draft?.orthophonisteNom ?? (session?.orthophonisteNom || defaultOrtho),
          patientNom: draft?.patientNom ?? (session?.patientNom || ''),
          notes: draft?.notes ?? (session?.notesSeance || session?.motif || ''),
          telephone: draft?.telephone ?? phone,
          sessionId: session?.id,
          savedAt: session ? new Date().toISOString() : undefined,
        };

        return posState;
      }) as [SlotPositionState, SlotPositionState, SlotPositionState];

      return {
        id: slotId,
        date: selectedDate,
        heureDebut: start,
        heureFin: end,
        positions,
      };
    });
  }, [slotStartTimes, selectedDate, sessions, patients, draftOverrides]);

  // Helper : Détection en temps réel de doublon pour un patient sur la même journée
  const checkDuplicatePatient = useCallback((
    patientName: string,
    currentSessionId?: string,
    currentSlotId?: string,
    currentPos?: number
  ) => {
    const trimmed = (patientName || '').trim();
    if (!trimmed || trimmed.length < 2) return null;

    const lower = trimmed.toLowerCase();
    const matchedPat = patients.find((p) => p.nom.trim().toLowerCase() === lower);

    // 1. Chercher dans les sessions enregistrées de l'état global pour la date courante
    const existing = sessions.find((s) => {
      if (currentSessionId && s.id === currentSessionId) return false;
      if (s.date !== selectedDate) return false;
      if (s.status === 'annulee') return false;
      const matchId = matchedPat && s.patientId === matchedPat.id;
      const matchNom = s.patientNom.trim().toLowerCase() === lower;
      return matchId || matchNom;
    });

    if (existing) {
      return {
        patient: existing.patientNom,
        time: existing.startTime,
        endTime: existing.endTime,
        ortho: existing.orthophonisteNom || 'Maroua',
        isSameSlot: currentSlotId ? currentSlotId.endsWith(`_${existing.startTime}`) : false,
      };
    }

    // 2. Chercher dans les autres créneaux de tripleSlots / draftOverrides de la journée
    for (const slot of tripleSlots) {
      for (const pos of slot.positions) {
        if (currentSlotId === slot.id && currentPos === pos.position) continue;
        const otherKey = `${slot.id}_pos_${pos.position}`;
        const otherName = (draftOverrides[otherKey]?.patientNom ?? pos.patientNom ?? '').trim();
        if (otherName && otherName.toLowerCase() === lower) {
          const ortho = draftOverrides[otherKey]?.orthophonisteNom ?? pos.orthophonisteNom ?? DEFAULT_ORTHOPHONISTES[pos.position - 1];
          return {
            patient: otherName,
            time: slot.heureDebut,
            endTime: slot.heureFin,
            ortho,
            isSameSlot: currentSlotId === slot.id,
          };
        }
      }
    }

    return null;
  }, [patients, sessions, selectedDate, tripleSlots, draftOverrides]);

  // 3. Exécution de l'enregistrement automatique (Autosave) synchronisé avec `sessions` et l'API Backend
  const executeAutosave = useCallback(async (
    slotId: string,
    position: 1 | 2 | 3,
    start: string,
    orthoNom: string,
    patNom: string,
    notesText: string
  ) => {
    const key = `${slotId}_pos_${position}`;
    setSaveStatus('saving');
    setActiveEditingKey(key);

    const trimmedPatient = patNom.trim();
    const resolvedOrtho = orthoNom.trim() || DEFAULT_ORTHOPHONISTES[position - 1];

    // Trouver si une séance existe déjà pour ce créneau et cette position
    const existingSlot = tripleSlots.find((s) => s.id === slotId);
    const existingPos = existingSlot?.positions[position - 1];
    const existingSessionId = existingPos?.sessionId;

    if (!trimmedPatient) {
      // Si le nom du patient est vidé, supprimer la séance correspondante
      if (existingSessionId && onDeleteSession) {
        onDeleteSession(existingSessionId);
      }
    } else {
      // CONTRÔLE DE SÉCURITÉ STRICT :
      // Bloquer l'enregistrement du même patient le même jour deux fois ou avec deux orthophonistes au même temps
      const duplicate = checkDuplicatePatient(trimmedPatient, existingSessionId, slotId, position);

      if (duplicate) {
        const isSameTime = duplicate.isSameSlot || duplicate.time === start;
        const alertMsg = isSameTime
          ? `Enregistrement bloqué : Le patient "${duplicate.patient}" est déjà programmé sur ce créneau (${duplicate.time}) avec ${duplicate.ortho}.\nIl est strictement interdit d'assigner un même patient à deux orthophonistes en même temps.`
          : `Enregistrement bloqué : Le patient "${duplicate.patient}" a déjà une séance prévue aujourd'hui (${selectedDate}) de ${duplicate.time} à ${duplicate.endTime} avec ${duplicate.ortho}.\nDoublon interdit.`;

        // Afficher l'alerte explicite
        setDuplicateAlert({
          patient: duplicate.patient,
          date: selectedDate,
          time: duplicate.time,
          ortho: duplicate.ortho,
          isSameTime,
          message: alertMsg,
        });

        // Annuler immédiatement le brouillon pour effacer le doublon non autorisé
        setDraftOverrides((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });

        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('saved');
          setActiveEditingKey(null);
        }, 1500);
        return;
      }

      // Si le contrôle passe, effacer toute alerte précédente pour ce patient
      setDuplicateAlert((prev) => {
        if (prev && prev.patient.toLowerCase() === trimmedPatient.toLowerCase()) {
          return null;
        }
        return prev;
      });

      const matchedPatient = patients.find(
        (p) => p.nom.trim().toLowerCase() === trimmedPatient.toLowerCase()
      );

      const targetSessionId = existingSessionId || `ses-${selectedDate}-${start.replace(':', '')}-pos${position}-${Date.now()}`;
      const end = add45Minutes(start);

      const updatedSession: Session = {
        id: targetSessionId,
        patientId: matchedPatient ? matchedPatient.id : `pat-temp-${Date.now()}`,
        patientNom: trimmedPatient,
        date: selectedDate,
        startTime: start,
        endTime: end,
        durationMinutes: 45,
        isConventionne: matchedPatient ? matchedPatient.isConventionne : true,
        status: 'planifiee',
        tarif: matchedPatient?.isConventionne ? 35 : 50,
        motif: notesText.trim() || `Séance d'orthophonie 45 min`,
        notesSeance: notesText.trim() || undefined,
        orthophonisteNom: resolvedOrtho,
        position,
      };

      // 1. Mettre à jour immédiatement l'état global React de l'application
      onSaveSession(updatedSession);

      // 2. Persistance asynchrone côté serveur
      try {
        await fetch('/api/agenda/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            heureDebut: start,
            heureFin: end,
            position,
            orthophonisteNom: resolvedOrtho,
            patientNom: trimmedPatient,
            notes: notesText,
            telephone: matchedPatient?.telephone || '',
          }),
        });
      } catch (err) {
        console.warn('[Autosave] Sauvegarde backend différée, synchronisation locale active:', err);
      }
    }

    // Nettoyer les brouillons temporaires
    setDraftOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLastSavedTime(timeStr);
    setSaveStatus('saved');

    setTimeout(() => {
      setActiveEditingKey(null);
    }, 800);
  }, [selectedDate, tripleSlots, patients, onSaveSession, onDeleteSession]);

  // 4. Gestionnaire de modification de champ avec debounce (500ms) et immédiat sur onBlur
  const handleFieldChange = (
    slotId: string,
    position: 1 | 2 | 3,
    start: string,
    field: 'patientNom' | 'orthophonisteNom' | 'notes',
    value: string,
    isImmediateBlur: boolean = false
  ) => {
    const key = `${slotId}_pos_${position}`;

    // Mettre à jour le brouillon local pour une fluidité absolue à la frappe
    setDraftOverrides((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));

    // Calculer les valeurs actuelles pour cette position
    const currentSlot = tripleSlots.find((s) => s.id === slotId);
    const curPos = currentSlot?.positions[position - 1];
    const ortho = field === 'orthophonisteNom' ? value : (draftOverrides[key]?.orthophonisteNom ?? curPos?.orthophonisteNom ?? DEFAULT_ORTHOPHONISTES[position - 1]);
    const pat = field === 'patientNom' ? value : (draftOverrides[key]?.patientNom ?? curPos?.patientNom ?? '');
    const notes = field === 'notes' ? value : (draftOverrides[key]?.notes ?? curPos?.notes ?? '');

    // DÉTECTION EN TEMPS RÉEL DE DOUBLON (Désactive l'auto-enregistrement automatique et affiche l'alerte)
    if (field === 'patientNom') {
      const duplicate = checkDuplicatePatient(value, curPos?.sessionId, slotId, position);
      if (duplicate) {
        if (debounceTimers.current[key]) {
          clearTimeout(debounceTimers.current[key]);
        }
        setSaveStatus('error');
        setDuplicateAlert({
          patient: duplicate.patient,
          date: selectedDate,
          time: duplicate.time,
          ortho: duplicate.ortho,
          isSameTime: duplicate.isSameSlot,
          message: duplicate.isSameSlot
            ? `Enregistrement bloqué : Le patient "${duplicate.patient}" est déjà programmé sur ce créneau (${duplicate.time}) avec ${duplicate.ortho}. Deux orthophonistes en même temps sont interdits.`
            : `Enregistrement bloqué : Le patient "${duplicate.patient}" a déjà une séance prévue aujourd'hui (${selectedDate}) à ${duplicate.time} avec ${duplicate.ortho}. Doublon interdit.`,
        });
        return;
      } else {
        // Effacer l'alerte si le nom saisi ne pose aucun conflit
        setDuplicateAlert((prev) => {
          if (prev && prev.patient.toLowerCase() === value.trim().toLowerCase()) {
            return null;
          }
          return prev;
        });
      }
    }

    if (isImmediateBlur) {
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      executeAutosave(slotId, position, start, ortho, pat, notes);
    } else {
      setSaveStatus('saving');
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(() => {
        executeAutosave(slotId, position, start, ortho, pat, notes);
      }, 500);
    }
  };

  // Navigation dans les jours
  const handlePrevDay = () => {
    const cur = parseDateISO(selectedDate);
    cur.setDate(cur.getDate() - 1);
    updateDate(formatDateISO(cur));
  };

  const handleNextDay = () => {
    const cur = parseDateISO(selectedDate);
    cur.setDate(cur.getDate() + 1);
    updateDate(formatDateISO(cur));
  };

  const handleToday = () => {
    updateDate('2026-09-29');
  };

  // Ajout de créneau personnalisé
  const handleAddCustomSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTime && !slotStartTimes.includes(customTime)) {
      setExtraSlots((prev) => [...prev, customTime].sort());
    }
    setShowAddSlot(false);
  };

  // Calcul du nombre de patients planifiés pour ce jour
  const totalRdvJour = useMemo(() => {
    return tripleSlots.reduce((acc, slot) => {
      const filled = slot.positions.filter((p) => p.patientNom && p.patientNom.trim() !== '').length;
      return acc + filled;
    }, 0);
  }, [tripleSlots]);

  const formattedDayTitle = formatFrenchDate(parseDateISO(selectedDate), true);

  return (
    <div className="space-y-4">
      {/* Patient Autocomplete Datalist */}
      <datalist id="patients-autocomplete-triple-list">
        {patients.map((p) => (
          <option key={p.id} value={p.nom}>
            {p.pathologie ? `${p.pathologie} • ` : ''}{p.telephone}
          </option>
        ))}
      </datalist>

      {/* Bannière d'alerte de blocage en cas de tentative de doublon */}
      {duplicateAlert && (
        <div className="bg-rose-50 border-2 border-rose-300 p-3.5 sm:p-4 rounded-2xl shadow-sm text-rose-950 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white mt-0.5 shadow-2xs flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 flex items-center gap-1.5 flex-wrap">
                <span>
                  {duplicateAlert.isSameTime
                    ? "Enregistrement bloqué : Conflit d'horaire avec deux orthophonistes !"
                    : "Enregistrement bloqué : Patient déjà programmé ce jour-là !"}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                  Doublon interdit
                </span>
              </h4>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed font-medium">
                Le patient <strong>{duplicateAlert.patient}</strong> a déjà une séance enregistrée le <strong>{duplicateAlert.date}</strong> à <strong>{duplicateAlert.time}</strong> avec <strong>{duplicateAlert.ortho}</strong>.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-800 bg-rose-100/90 px-2.5 py-1 rounded-lg border border-rose-200">
                <span>⛔ Règle stricte du cabinet : Un même patient ne peut pas avoir deux séances le même jour, ni deux orthophonistes en même temps.</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDuplicateAlert(null)}
            className="p-1.5 rounded-xl text-rose-400 hover:text-rose-800 hover:bg-rose-100 transition flex-shrink-0"
            title="Fermer l'avertissement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Bar: Navigation, Autosave Status & Day summary */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Day Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/60 shadow-2xs">
              <button
                onClick={handlePrevDay}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Jour précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-teal-700 hover:bg-white rounded-lg transition"
              >
                Aujourd'hui
              </button>
              <button
                onClick={handleNextDay}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Jour suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Date Selector input */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => updateDate(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
            </div>

            <div className="hidden lg:block text-xs font-semibold text-slate-600 capitalize">
              {formattedDayTitle}
            </div>
          </div>

          {/* Autosave Indicator & Actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            {/* Visual Autosave Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium bg-slate-50 border-slate-200">
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span className="text-amber-700 font-semibold">Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-700 font-medium">
                    Synchronisé {lastSavedTime ? `à ${lastSavedTime}` : 'en temps réel'}
                  </span>
                </>
              )}
            </div>

            {/* Quick stats pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-bold">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>{totalRdvJour} patient{totalRdvJour > 1 ? 's' : ''} planifié{totalRdvJour > 1 ? 's' : ''}</span>
            </div>

            {/* Add custom slot button */}
            <button
              onClick={() => setShowAddSlot(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold active:scale-95 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Créneau</span>
            </button>
          </div>
        </div>

        {/* Triple Position Legend & Guide */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">3 Orthophonistes simultanés :</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                Position 1 : Maroua (Titulaire)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Position 2 : Mariem (Collab.)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Position 3 : Stagiaire
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Synchronisation bidirectionnelle instantanée avec Planning & Séances</span>
          </div>
        </div>
      </div>

      {/* Modal d'ajout de créneau spécial */}
      {showAddSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Ajouter un horaire pour le {selectedDate}</span>
            </h3>
            <form onSubmit={handleAddCustomSlot} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Heure de début (45 min)
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlot(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
                >
                  Ajouter le créneau triple
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN AGENDA LIST: Grille des créneaux horaires avec triple position */}
      <div className="space-y-3">
        {tripleSlots.map((slot) => {
          const isAnyFilled = slot.positions.some((p) => p.patientNom && p.patientNom.trim() !== '');

          return (
            <div
              key={slot.id}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                isAnyFilled
                  ? 'border-slate-300/80 bg-white ring-1 ring-slate-100'
                  : 'border-slate-200/70 hover:border-slate-300'
              }`}
            >
              {/* Header du créneau horaire */}
              <div className="bg-gradient-to-r from-slate-50 via-slate-50/50 to-white px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
                    {slot.heureDebut.replace(':', 'h')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-900 font-mono tracking-tight">
                        {slot.heureDebut} → {slot.heureFin}
                      </span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                        Séance 45 min
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Jusqu'à 3 patients en simultané
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg">
                    {slot.positions.filter((p) => p.patientNom.trim()).length} / 3 attribué(s)
                  </span>
                </div>
              </div>

              {/* Les 3 lignes simultanées : [Heure] -> [Patient] -> [Orthophoniste] */}
              <div className="divide-y divide-slate-100 p-2 sm:p-3 space-y-2 sm:space-y-0 sm:divide-y">
                {slot.positions.map((pos) => {
                  const colors = ORTHO_COLORS[pos.position];
                  const hasPatient = pos.patientNom.trim().length > 0;
                  const isSavingThis = activeEditingKey === `${slot.id}_pos_${pos.position}`;
                  const waNum = pos.telephone ? cleanWhatsAppNumber(pos.telephone) : '';

                  // Détection de doublon en temps réel pour cette position
                  const draftKey = `${slot.id}_pos_${pos.position}`;
                  const currentPatVal = draftOverrides[draftKey]?.patientNom ?? pos.patientNom;
                  const positionConflict = checkDuplicatePatient(currentPatVal, pos.sessionId, slot.id, pos.position);

                  return (
                    <div
                      key={`${slot.id}_pos_${pos.position}`}
                      className={`pt-2 sm:py-2.5 first:pt-0 sm:first:pt-2.5 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 rounded-xl px-2 transition-colors ${
                        positionConflict 
                          ? 'bg-rose-50/40 border border-rose-200' 
                          : hasPatient 
                          ? 'bg-slate-50/50' 
                          : 'hover:bg-slate-50/20'
                      }`}
                    >
                      {/* Association : Position & Orthophoniste modifiable */}
                      <div className="flex items-center gap-2 flex-shrink-0 min-w-[210px]">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 ${colors.avatar}`}
                          title={`Position ${pos.position}`}
                        >
                          P{pos.position}
                        </span>

                        {/* Champ Orthophoniste (Modifiable en direct) */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={pos.orthophonisteNom}
                            onChange={(e) =>
                              handleFieldChange(
                                slot.id,
                                pos.position,
                                slot.heureDebut,
                                'orthophonisteNom',
                                e.target.value,
                                false
                              )
                            }
                            onBlur={(e) =>
                              handleFieldChange(
                                slot.id,
                                pos.position,
                                slot.heureDebut,
                                'orthophonisteNom',
                                e.target.value,
                                true
                              )
                            }
                            placeholder={`Ortho ${pos.position} (ex: ${DEFAULT_ORTHOPHONISTES[pos.position - 1]})`}
                            className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-xl border bg-white ${colors.border} ${colors.ring} focus:outline-none transition text-slate-800`}
                            title="Nom de l'orthophoniste pour ce rendez-vous (modifiable en direct)"
                          />
                        </div>
                      </div>

                      {/* Champ Saisie Patient (avec autocomplétion intelligente et saisie libre) */}
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${positionConflict ? 'text-rose-500' : 'text-slate-400'}`} />
                          <input
                            type="text"
                            list="patients-autocomplete-triple-list"
                            value={pos.patientNom}
                            onChange={(e) =>
                              handleFieldChange(
                                slot.id,
                                pos.position,
                                slot.heureDebut,
                                'patientNom',
                                e.target.value,
                                false
                              )
                            }
                            onBlur={(e) =>
                              handleFieldChange(
                                slot.id,
                                pos.position,
                                slot.heureDebut,
                                'patientNom',
                                e.target.value,
                                true
                              )
                            }
                            placeholder={`Saisir patient ${pos.position} (ex: Nour Bouazizi, Mohamed Aziz Khemir)...`}
                            className={`w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border transition ${
                              positionConflict
                                ? 'border-rose-500 bg-rose-50/60 text-rose-950 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none'
                                : hasPatient
                                ? 'border-slate-300 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500'
                                : 'border-slate-200/90 bg-white/80 placeholder:text-slate-400 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500'
                            }`}
                          />
                        </div>

                        {/* Affichage du message d'erreur sous le champ du nom en rouge et en petits caractères */}
                        {positionConflict && (
                          <div className="mt-1 flex items-center gap-1.5 text-rose-600 font-bold text-xs animate-in fade-in duration-150">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                            <span>Enregistrement bloqué : Patient déjà programmé ce jour-là !</span>
                            <span className="text-[11px] font-medium text-rose-700 hidden sm:inline">
                              ({positionConflict.time} avec {positionConflict.ortho})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Note ou observations (multitâche) */}
                      <div className="w-full lg:w-56 flex-shrink-0">
                        <input
                          type="text"
                          value={pos.notes || ''}
                          onChange={(e) =>
                            handleFieldChange(
                              slot.id,
                              pos.position,
                              slot.heureDebut,
                              'notes',
                              e.target.value,
                              false
                            )
                          }
                          onBlur={(e) =>
                            handleFieldChange(
                              slot.id,
                              pos.position,
                              slot.heureDebut,
                              'notes',
                              e.target.value,
                              true
                            )
                          }
                          placeholder="Observations / motif..."
                          className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-700 placeholder:text-slate-400 transition"
                        />
                      </div>

                      {/* Contact rapide (WhatsApp / Appel) & Statut autosave individuel */}
                      <div className="flex items-center justify-between lg:justify-end gap-1.5 flex-shrink-0">
                        {hasPatient && pos.telephone && (
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${pos.telephone}`}
                              className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                              title={`Appeler ${pos.patientNom} (${pos.telephone})`}
                            >
                              <Phone className="w-3 h-3 text-emerald-400" />
                            </a>
                            {waNum && (
                              <a
                                href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                                  `Bonjour ${pos.patientNom}, rappel de votre séance d'orthophonie à ${slot.heureDebut} avec ${pos.orthophonisteNom}.`
                                  )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Voyant d'enregistrement automatique par ligne */}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isSavingThis
                              ? 'bg-amber-100 text-amber-800'
                              : hasPatient
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'text-slate-400'
                          }`}
                        >
                          {isSavingThis ? (
                            <>
                              <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
                              <span className="hidden sm:inline">Sauvegarde...</span>
                            </>
                          ) : hasPatient ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span className="hidden sm:inline">Enregistré</span>
                            </>
                          ) : (
                            <span>Libre</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
