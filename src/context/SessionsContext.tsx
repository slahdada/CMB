import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Patient, Session, SessionStatus, CabinetSettings } from '../types';
import { 
  loadPatients, 
  savePatients, 
  loadSessions, 
  saveSessions, 
  loadSettings, 
  saveSettings 
} from '../utils/storage';
import { 
  formatDateISO, 
  parseDateISO, 
  getMondayOfWeek, 
  getWeekDays, 
  add45Minutes 
} from '../utils/dateUtils';

export interface OrthoSummaryMetrics {
  nom: string;
  role: string;
  avatarColor: string;
  badgeColor: string;
  borderColor: string;
  progressColor: string;
  total: number;
  realisees: number;
  planifiees: number;
  annulees: number;
  conventionnes: number;
  nonConventionnes: number;
  heuresEffectuees: number;
  recetteRealisee: number;
  recetteEstimee: number;
  sessionsList: Session[];
}

export interface DayGlobalMetrics {
  date: string;
  total: number;
  realisees: number;
  planifiees: number;
  annulees: number;
  conventionnes: number;
  nonConventionnes: number;
  heuresRealisees: number;
  tauxRealisation: number;
  recetteRealisee: number;
  recetteTotaleEstimee: number;
  orthoStats: OrthoSummaryMetrics[];
}

interface SessionsContextType {
  // Source Unique de Vérité
  sessions: Session[];
  patients: Patient[];
  settings: CabinetSettings;
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;

  // Actions CRUD réactives & synchronisées (Optimistic Updates + LocalStorage)
  saveSession: (session: Session) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionStatus: (sessionId: string, newStatus: SessionStatus) => void;
  savePatient: (patient: Patient) => void;
  deletePatient: (patientId: string) => void;
  saveCabinetSettings: (newSettings: CabinetSettings) => void;
  reloadAllData: () => void;

  // Importations en bloc
  importPatients: (imported: Patient[], mode: 'merge' | 'replace') => void;
  importSessions: (imported: Session[], mode: 'merge' | 'replace') => void;
  importAll: (data: { patients: Patient[]; sessions: Session[]; settings?: CabinetSettings }) => void;

  // Sélecteurs dérivés réactifs en temps réel (useMemo)
  todayMetrics: DayGlobalMetrics;
  getDayMetrics: (dateISO: string) => DayGlobalMetrics;
  weekMetrics: {
    totalSessionsThisWeek: number;
    conventionnesThisWeek: number;
    realiseesThisWeek: number;
    recetteThisWeek: number;
  };
}

const DEFAULT_ORTHOS_META = [
  {
    nom: 'Maroua',
    role: 'Orthophoniste Titulaire',
    avatarColor: 'bg-teal-600 text-white',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    borderColor: 'border-teal-200/90',
    progressColor: 'bg-teal-500',
  },
  {
    nom: 'Mariem',
    role: 'Collaboratrice',
    avatarColor: 'bg-indigo-600 text-white',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    borderColor: 'border-indigo-200/90',
    progressColor: 'bg-indigo-500',
  },
  {
    nom: 'Stagiaire',
    role: 'Stagiaire en cabinet',
    avatarColor: 'bg-amber-600 text-white',
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
    borderColor: 'border-amber-200/90',
    progressColor: 'bg-amber-500',
  },
];

export const isEffectuee = (status: string | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'realisee' || s === 'effectuee' || s === 'completed' || s === 'fait' || s === 'faite';
};

const resolveOrtho = (session: Session): string => {
  const explicit = (session.orthophonisteNom || '').trim();
  if (explicit) {
    const lower = explicit.toLowerCase();
    if (lower.includes('maroua')) return 'Maroua';
    if (lower.includes('mariem')) return 'Mariem';
    if (lower.includes('stagiaire')) return 'Stagiaire';
    return explicit;
  }
  if (session.position === 2) return 'Mariem';
  if (session.position === 3) return 'Stagiaire';
  return 'Maroua';
};

const SessionsContext = createContext<SessionsContextType | undefined>(undefined);

export const SessionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(() => loadPatients());
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [settings, setSettings] = useState<CabinetSettings>(() => loadSettings());
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-29');

  // Synchronisation initiale
  useEffect(() => {
    const p = loadPatients();
    const s = loadSessions();
    const set = loadSettings();
    if (p.length > 0) setPatients(p);
    if (s.length > 0) setSessions(s);
    setSettings(set);
  }, []);

  const reloadAllData = useCallback(() => {
    setPatients(loadPatients());
    setSessions(loadSessions());
    setSettings(loadSettings());
  }, []);

  // 1. Sauvegarde d'une séance (Optimiste + Synchro immédiate)
  const saveSession = useCallback((savedSession: Session) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === savedSession.id);
      const next = exists
        ? prev.map((s) => (s.id === savedSession.id ? savedSession : s))
        : [savedSession, ...prev];
      
      // Persistance synchrone locale
      saveSessions(next);
      return next;
    });

    if (savedSession.date) {
      setSelectedDate(savedSession.date);
    }
  }, []);

  // 2. Suppression d'une séance
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      saveSessions(next);
      return next;
    });
  }, []);

  // 3. Mise à jour de statut (Planifiée <-> Réalisée / Annulée)
  const updateSessionStatus = useCallback((sessionId: string, newStatus: SessionStatus) => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s));
      saveSessions(next);
      return next;
    });
  }, []);

  // 4. Sauvegarde d'un patient
  const savePatient = useCallback((savedPatient: Patient) => {
    setPatients((prev) => {
      const exists = prev.some((p) => p.id === savedPatient.id);
      const next = exists
        ? prev.map((p) => (p.id === savedPatient.id ? savedPatient : p))
        : [savedPatient, ...prev];
      savePatients(next);
      return next;
    });

    // Synchroniser le nom et le statut conventionné dans les séances existantes
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.patientId === savedPatient.id) {
          return {
            ...s,
            patientNom: savedPatient.nom,
            isConventionne: savedPatient.isConventionne,
          };
        }
        return s;
      });
      saveSessions(next);
      return next;
    });
  }, []);

  // 5. Suppression d'un patient et de ses séances
  const deletePatient = useCallback((patientId: string) => {
    setPatients((prev) => {
      const next = prev.filter((p) => p.id !== patientId);
      savePatients(next);
      return next;
    });
    setSessions((prev) => {
      const next = prev.filter((s) => s.patientId !== patientId);
      saveSessions(next);
      return next;
    });
  }, []);

  // 6. Paramètres du cabinet
  const saveCabinetSettings = useCallback((newSettings: CabinetSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // 7. Importations
  const importPatients = useCallback((imported: Patient[], mode: 'merge' | 'replace') => {
    setPatients((prev) => {
      let next: Patient[];
      if (mode === 'replace') {
        next = imported;
      } else {
        const existingNames = new Set(prev.map((p) => p.nom.trim().toLowerCase()));
        const newUnique = imported.filter((p) => !existingNames.has(p.nom.trim().toLowerCase()));
        next = [...prev, ...newUnique];
      }
      savePatients(next);
      return next;
    });
  }, []);

  const importSessions = useCallback((imported: Session[], mode: 'merge' | 'replace') => {
    setSessions((prev) => {
      let next: Session[];
      if (mode === 'replace') {
        next = imported;
      } else {
        const safeToAdd = imported.filter((newS) => {
          return !prev.some(
            (s) =>
              s.date === newS.date &&
              s.status !== 'annulee' &&
              s.patientNom.trim().toLowerCase() === newS.patientNom.trim().toLowerCase()
          );
        });
        next = [...safeToAdd, ...prev];
      }
      saveSessions(next);
      return next;
    });
  }, []);

  const importAll = useCallback((data: { patients: Patient[]; sessions: Session[]; settings?: CabinetSettings }) => {
    if (data.patients && data.patients.length > 0) {
      setPatients(data.patients);
      savePatients(data.patients);
    }
    if (data.sessions && data.sessions.length > 0) {
      setSessions(data.sessions);
      saveSessions(data.sessions);
    }
    if (data.settings) {
      setSettings(data.settings);
      saveSettings(data.settings);
    }
  }, []);

  // 8. Calculateur dynamique réactif (Derived State) par date ISO
  const getDayMetrics = useCallback((dateISO: string): DayGlobalMetrics => {
    const daySessions = sessions.filter((s) => s.date === dateISO);
    
    // Identifier tous les praticiens actifs (au minimum les 3 par défaut)
    const orthoNames = new Set<string>(['Maroua', 'Mariem', 'Stagiaire']);
    daySessions.forEach((s) => {
      orthoNames.add(resolveOrtho(s));
    });

    const orthoStats: OrthoSummaryMetrics[] = Array.from(orthoNames).map((name) => {
      const matching = daySessions
        .filter((s) => resolveOrtho(s).toLowerCase() === name.toLowerCase())
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const total = matching.length;
      const realisees = matching.filter((s) => isEffectuee(s.status)).length;
      const planifiees = matching.filter((s) => s.status === 'planifiee').length;
      const annulees = matching.filter((s) => s.status === 'annulee' || s.status === 'absent').length;
      const conventionnes = matching.filter((s) => s.isConventionne).length;
      const nonConventionnes = total - conventionnes;
      const heuresEffectuees = (realisees * 45) / 60;

      // Honoraires réels validés (séances effectuées)
      const recetteRealisee = matching
        .filter((s) => isEffectuee(s.status))
        .reduce((sum, s) => sum + s.tarif, 0);

      // Honoraires estimés globaux (effectuées + planifiées)
      const recetteEstimee = matching
        .filter((s) => s.status !== 'annulee')
        .reduce((sum, s) => sum + s.tarif, 0);

      const meta = DEFAULT_ORTHOS_META.find((o) => o.nom.toLowerCase() === name.toLowerCase());

      return {
        nom: name,
        role: meta?.role || 'Orthophoniste',
        avatarColor: meta?.avatarColor || 'bg-slate-700 text-white',
        badgeColor: meta?.badgeColor || 'bg-slate-50 text-slate-800 border-slate-200',
        borderColor: meta?.borderColor || 'border-slate-200',
        progressColor: meta?.progressColor || 'bg-slate-600',
        total,
        realisees,
        planifiees,
        annulees,
        conventionnes,
        nonConventionnes,
        heuresEffectuees,
        recetteRealisee,
        recetteEstimee,
        sessionsList: matching,
      };
    });

    const total = daySessions.length;
    const realisees = daySessions.filter((s) => isEffectuee(s.status)).length;
    const planifiees = daySessions.filter((s) => s.status === 'planifiee').length;
    const annulees = daySessions.filter((s) => s.status === 'annulee' || s.status === 'absent').length;
    const conventionnes = daySessions.filter((s) => s.isConventionne).length;
    const nonConventionnes = total - conventionnes;
    const heuresRealisees = (realisees * 45) / 60;
    const tauxRealisation = total > 0 ? Math.round((realisees / total) * 100) : 0;

    const recetteRealisee = daySessions
      .filter((s) => isEffectuee(s.status))
      .reduce((sum, s) => sum + s.tarif, 0);

    const recetteTotaleEstimee = daySessions
      .filter((s) => s.status !== 'annulee')
      .reduce((sum, s) => sum + s.tarif, 0);

    return {
      date: dateISO,
      total,
      realisees,
      planifiees,
      annulees,
      conventionnes,
      nonConventionnes,
      heuresRealisees,
      tauxRealisation,
      recetteRealisee,
      recetteTotaleEstimee,
      orthoStats,
    };
  }, [sessions]);

  // Métriques de la date sélectionnée (Auto-recalculées à chaque changement)
  const todayMetrics = useMemo(() => {
    return getDayMetrics(selectedDate);
  }, [getDayMetrics, selectedDate]);

  // Métriques de la semaine courante
  const weekMetrics = useMemo(() => {
    const baseDate = parseDateISO(selectedDate);
    const monday = getMondayOfWeek(baseDate);
    const weekDays = getWeekDays(monday);
    const startISO = formatDateISO(monday);
    const endISO = formatDateISO(weekDays[5]);

    const weekList = sessions.filter((s) => s.date >= startISO && s.date <= endISO);
    const convCount = weekList.filter((s) => s.isConventionne).length;
    const realCount = weekList.filter((s) => isEffectuee(s.status)).length;
    const recSum = weekList
      .filter((s) => isEffectuee(s.status))
      .reduce((sum, s) => sum + s.tarif, 0);

    return {
      totalSessionsThisWeek: weekList.length,
      conventionnesThisWeek: convCount,
      realiseesThisWeek: realCount,
      recetteThisWeek: recSum,
    };
  }, [sessions, selectedDate]);

  const value = useMemo(
    () => ({
      sessions,
      patients,
      settings,
      selectedDate,
      setSelectedDate,
      saveSession,
      deleteSession,
      updateSessionStatus,
      savePatient,
      deletePatient,
      saveCabinetSettings,
      reloadAllData,
      importPatients,
      importSessions,
      importAll,
      todayMetrics,
      getDayMetrics,
      weekMetrics,
    }),
    [
      sessions,
      patients,
      settings,
      selectedDate,
      saveSession,
      deleteSession,
      updateSessionStatus,
      savePatient,
      deletePatient,
      saveCabinetSettings,
      reloadAllData,
      importPatients,
      importSessions,
      importAll,
      todayMetrics,
      getDayMetrics,
      weekMetrics,
    ]
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
};

export const useSessions = (): SessionsContextType => {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error('useSessions must be used within a SessionsProvider');
  }
  return context;
};
