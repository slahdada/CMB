import { CabinetSettings, Patient, Session } from '../types';
import { INITIAL_PATIENTS, INITIAL_SESSIONS, INITIAL_SETTINGS } from './seedData';

const STORAGE_KEYS = {
  PATIENTS: 'cabinet_ortho_belgaied_patients_v1',
  SESSIONS: 'cabinet_ortho_belgaied_sessions_v1',
  SETTINGS: 'cabinet_ortho_belgaied_settings_v1',
};

export function loadPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    if (!raw) {
      savePatients(INITIAL_PATIENTS);
      return INITIAL_PATIENTS;
    }
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.length > 0 ? data : INITIAL_PATIENTS;
  } catch (err) {
    console.error('Error loading patients:', err);
    return INITIAL_PATIENTS;
  }
}

export function savePatients(patients: Patient[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  } catch (err) {
    console.error('Error saving patients:', err);
  }
}

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) {
      saveSessions(INITIAL_SESSIONS);
      return INITIAL_SESSIONS;
    }
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.length > 0 ? data : INITIAL_SESSIONS;
  } catch (err) {
    console.error('Error loading sessions:', err);
    return INITIAL_SESSIONS;
  }
}

export function saveSessions(sessions: Session[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

export function loadSettings(): CabinetSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettings(INITIAL_SETTINGS);
      return INITIAL_SETTINGS;
    }
    return { ...INITIAL_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading settings:', err);
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: CabinetSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

export function resetToDemoData(): { patients: Patient[]; sessions: Session[]; settings: CabinetSettings } {
  savePatients(INITIAL_PATIENTS);
  saveSessions(INITIAL_SESSIONS);
  saveSettings(INITIAL_SETTINGS);
  return {
    patients: INITIAL_PATIENTS,
    sessions: INITIAL_SESSIONS,
    settings: INITIAL_SETTINGS,
  };
}

export function exportAllData(): string {
  const data = {
    patients: loadPatients(),
    sessions: loadSessions(),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
    cabinet: "Cabinet d'orthophonie Belgaied Maroua",
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.patients && Array.isArray(parsed.patients)) {
      savePatients(parsed.patients);
    }
    if (parsed.sessions && Array.isArray(parsed.sessions)) {
      saveSessions(parsed.sessions);
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      saveSettings(parsed.settings);
    }
    return true;
  } catch (err) {
    console.error('Failed to import data:', err);
    return false;
  }
}
