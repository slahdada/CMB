/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { PatientsTable } from './components/PatientsTable';
import { DashboardView } from './components/DashboardView';
import { SimultaneousAgenda } from './components/SimultaneousAgenda';
import { SessionModal } from './components/SessionModal';
import { PatientModal } from './components/PatientModal';
import { PatientDetailsModal } from './components/PatientDetailsModal';
import { SettingsModal } from './components/SettingsModal';
import { PhoneCallModal } from './components/PhoneCallModal';
import { FloatingCallButton } from './components/FloatingCallButton';
import { DataImportModal } from './components/DataImportModal';
import { triggerExportPDF } from './utils/pdfExport';
import { Patient, Session, SessionStatus, CabinetSettings } from './types';
import { 
  loadPatients, 
  savePatients, 
  loadSessions, 
  saveSessions, 
  loadSettings, 
  saveSettings 
} from './utils/storage';
import { formatDateISO, getMondayOfWeek, getWeekDays, parseDateISO } from './utils/dateUtils';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, Heart, Sparkles, Phone, MessageSquare, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(() => loadPatients());
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [settings, setSettings] = useState<CabinetSettings>(() => loadSettings());
  const [activeTab, setActiveTab] = useState<ActiveTab>('planning');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 8, 29));
  const isOnline = useOnlineStatus();

  // Modals state
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | undefined>(undefined);
  const [defaultDateForSession, setDefaultDateForSession] = useState<string | undefined>(undefined);
  const [defaultTimeForSession, setDefaultTimeForSession] = useState<string | undefined>(undefined);
  const [defaultPatientForSession, setDefaultPatientForSession] = useState<Patient | undefined>(undefined);

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | undefined>(undefined);

  const [detailsPatientId, setDetailsPatientId] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [phoneCallModalOpen, setPhoneCallModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [globalConflictAlert, setGlobalConflictAlert] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Sync to ensure latest data on mount
  useEffect(() => {
    const loadedP = loadPatients();
    const loadedS = loadSessions();
    const loadedSet = loadSettings();
    if (loadedP.length > 0) setPatients(loadedP);
    if (loadedS.length > 0) setSessions(loadedS);
    setSettings(loadedSet);
  }, []);

  const reloadAllData = () => {
    setPatients(loadPatients());
    setSessions(loadSessions());
    setSettings(loadSettings());
  };

  // Patients handlers
  const handleSavePatient = (savedPatient: Patient) => {
    setPatients((prev) => {
      const exists = prev.some((p) => p.id === savedPatient.id);
      const next = exists
        ? prev.map((p) => (p.id === savedPatient.id ? savedPatient : p))
        : [savedPatient, ...prev];
      savePatients(next);
      return next;
    });

    // Also update patient name on existing sessions if name changed
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
  };

  const handleDeletePatient = (patientId: string) => {
    const patientToDelete = patients.find((p) => p.id === patientId);
    if (!patientToDelete) return;

    if (
      confirm(
        `Confirmez-vous la suppression du patient ${patientToDelete.nom} et de toutes ses séances ?`
      )
    ) {
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
    }
  };

  // Sessions handlers
  const handleSaveSession = (savedSession: Session) => {
    // CONTRÔLE DE SÉCURITÉ MAJEUR : Bloquer l'enregistrement du même patient le même jour deux fois ou avec deux orthophonistes au même moment
    const duplicate = sessions.find((s) => {
      if (s.id === savedSession.id) return false;
      if (s.date !== savedSession.date) return false;
      if (s.status === 'annulee') return false;
      const matchId = savedSession.patientId && s.patientId === savedSession.patientId;
      const matchNom = s.patientNom.trim().toLowerCase() === savedSession.patientNom.trim().toLowerCase();
      return matchId || matchNom;
    });

    if (duplicate) {
      const isSimultaneous = duplicate.startTime === savedSession.startTime;
      setGlobalConflictAlert({
        title: isSimultaneous
          ? "Enregistrement bloqué : Conflit d'horaire avec deux orthophonistes !"
          : "Enregistrement bloqué : Patient déjà programmé ce jour-là !",
        message: `Le patient "${savedSession.patientNom}" a déjà une séance enregistrée le ${savedSession.date} de ${duplicate.startTime} à ${duplicate.endTime} avec ${duplicate.orthophonisteNom || 'Maroua'}. Un même patient ne peut pas avoir deux séances le même jour ni deux orthophonistes en même temps.`,
      });
      return;
    }

    setSessions((prev) => {
      const exists = prev.some((s) => s.id === savedSession.id);
      const next = exists
        ? prev.map((s) => (s.id === savedSession.id ? savedSession : s))
        : [savedSession, ...prev];
      saveSessions(next);
      return next;
    });

    // Synchroniser automatiquement la date active du calendrier sur la séance enregistrée
    if (savedSession.date) {
      setCalendarDate(parseDateISO(savedSession.date));
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      saveSessions(next);
      return next;
    });
  };

  const handleUpdateSessionStatus = (sessionId: string, newStatus: SessionStatus) => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s));
      saveSessions(next);
      return next;
    });
  };

  const handleSaveSettings = (newSettings: CabinetSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Export PDF contextuel
  const handleExportPDF = () => {
    triggerExportPDF({
      activeTab,
      sessions,
      patients,
      settings,
      currentDate: formatDateISO(calendarDate),
    });
  };

  // Importation de données
  const handleImportPatients = (importedPatients: Patient[], mode: 'merge' | 'replace') => {
    setPatients((prev) => {
      let next: Patient[];
      if (mode === 'replace') {
        next = importedPatients;
      } else {
        const existingNames = new Set(prev.map((p) => p.nom.trim().toLowerCase()));
        const newUnique = importedPatients.filter((p) => !existingNames.has(p.nom.trim().toLowerCase()));
        next = [...prev, ...newUnique];
      }
      savePatients(next);
      return next;
    });
    setImportNotification(`Succès : ${importedPatients.length} dossier(s) patient(s) importé(s).`);
    setTimeout(() => setImportNotification(null), 4500);
  };

  const handleImportSessions = (importedSessions: Session[], mode: 'merge' | 'replace') => {
    setSessions((prev) => {
      let next: Session[];
      if (mode === 'replace') {
        next = importedSessions;
      } else {
        const safeToAdd = importedSessions.filter((newS) => {
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
    setImportNotification(`Succès : ${importedSessions.length} séance(s) importée(s) dans le planning.`);
    setTimeout(() => setImportNotification(null), 4500);
  };

  const handleImportAll = (data: { patients: Patient[]; sessions: Session[]; settings?: CabinetSettings }) => {
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
    setImportNotification(`Sauvegarde intégrale restaurée (${data.patients?.length || 0} patients, ${data.sessions?.length || 0} séances).`);
    setTimeout(() => setImportNotification(null), 4500);
  };

  // Open modal helpers
  const handleOpenNewSession = (sessionToEditParam?: Session, defaultDateParam?: string, defaultTimeParam?: string) => {
    setSessionToEdit(sessionToEditParam);
    setDefaultDateForSession(defaultDateParam || '2026-09-29');
    setDefaultTimeForSession(defaultTimeParam || '08:30');
    setDefaultPatientForSession(undefined);
    setSessionModalOpen(true);
  };

  const handleOpenNewSessionForPatient = (patient: Patient) => {
    setSessionToEdit(undefined);
    setDefaultDateForSession('2026-09-29');
    setDefaultTimeForSession('08:30');
    setDefaultPatientForSession(patient);
    setSessionModalOpen(true);
  };

  const handleOpenNewPatient = () => {
    setPatientToEdit(undefined);
    setPatientModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setPatientToEdit(patient);
    setPatientModalOpen(true);
  };

  // Current week calculations for navbar badge
  const { totalSessionsThisWeek, conventionnesThisWeek } = useMemo(() => {
    const today = new Date(2026, 8, 29);
    const monday = getMondayOfWeek(today);
    const weekDays = getWeekDays(monday);
    const startISO = formatDateISO(monday);
    const endISO = formatDateISO(weekDays[5]);

    const weekList = sessions.filter((s) => s.date >= startISO && s.date <= endISO);
    const convCount = weekList.filter((s) => s.isConventionne).length;

    return {
      totalSessionsThisWeek: weekList.length,
      conventionnesThisWeek: convCount,
    };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-teal-500 selection:text-white">
      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mode hors-ligne actif. Vos données restent accessibles et sauvegardées en local.</span>
        </div>
      )}

      {/* Main Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'settings') {
            setSettingsModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenNewSession={() => handleOpenNewSession()}
        onOpenNewPatient={handleOpenNewPatient}
        onOpenPhoneModal={() => setPhoneCallModalOpen(true)}
        onExportPDF={handleExportPDF}
        onOpenImportModal={() => setImportModalOpen(true)}
        totalPatientsCount={patients.length}
        totalSessionsThisWeek={totalSessionsThisWeek}
        conventionnesThisWeek={conventionnesThisWeek}
      />

      {/* App Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Notification de succès d'importation */}
        {importNotification && (
          <div className="bg-emerald-600 text-white p-3 sm:p-4 rounded-2xl shadow-md text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-200 flex-shrink-0" />
              <span>{importNotification}</span>
            </div>
            <button
              onClick={() => setImportNotification(null)}
              className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Conflict Alert Banner */}
        {globalConflictAlert && (
          <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl shadow-md text-rose-950 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-600 text-white shadow-2xs flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 flex items-center gap-2">
                  <span>{globalConflictAlert.title}</span>
                  <span className="text-[10px] font-extrabold uppercase bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                    Doublon interdit
                  </span>
                </h4>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed font-medium">
                  {globalConflictAlert.message}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-800 bg-rose-100/90 px-2.5 py-1 rounded-lg border border-rose-200">
                  <span>⛔ Règle du cabinet : Un même patient ne peut pas avoir deux séances le même jour, ni deux orthophonistes en même temps.</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setGlobalConflictAlert(null)}
              className="p-1.5 rounded-xl text-rose-400 hover:text-rose-800 hover:bg-rose-100 transition flex-shrink-0"
              title="Fermer l'alerte"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {activeTab === 'planning' && (
          <CalendarView
            sessions={sessions}
            patients={patients}
            onOpenSessionModal={handleOpenNewSession}
            onUpdateSessionStatus={handleUpdateSessionStatus}
            onOpenPatientDetails={(id) => setDetailsPatientId(id)}
            externalSelectedDate={calendarDate}
            onDateChange={setCalendarDate}
          />
        )}

        {activeTab === 'simultane' && (
          <SimultaneousAgenda
            patients={patients}
            sessions={sessions}
            onSaveSession={handleSaveSession}
            onDeleteSession={handleDeleteSession}
            onOpenPhoneModal={() => setPhoneCallModalOpen(true)}
            onSelectPatientDetails={(id) => setDetailsPatientId(id)}
            selectedDate={formatDateISO(calendarDate)}
            onDateChange={(d) => setCalendarDate(parseDateISO(d))}
          />
        )}

        {activeTab === 'patients' && (
          <PatientsTable
            patients={patients}
            sessions={sessions}
            onOpenNewPatient={handleOpenNewPatient}
            onEditPatient={handleEditPatient}
            onDeletePatient={handleDeletePatient}
            onOpenNewSessionForPatient={handleOpenNewSessionForPatient}
            onOpenPatientDetails={(id) => setDetailsPatientId(id)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            sessions={sessions}
            patients={patients}
            settings={settings}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/70 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">{settings.nomCabinet}</span>
            <span>•</span>
            <span>{settings.praticien}</span>
            <span className="hidden md:inline">• Séances 45 min fixes</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Progressive Web App (PWA) installable</span>
            <span>•</span>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="text-teal-700 hover:underline font-semibold"
            >
              Tarifs & Sauvegarde
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {sessionModalOpen && (
        <SessionModal
          key={sessionToEdit ? `edit-${sessionToEdit.id}-${sessionToEdit.date}-${sessionToEdit.startTime}` : `new-${defaultDateForSession}-${defaultTimeForSession}`}
          isOpen={sessionModalOpen}
          onClose={() => {
            setSessionModalOpen(false);
            setSessionToEdit(undefined);
          }}
          onSaveSession={handleSaveSession}
          onDeleteSession={handleDeleteSession}
          sessionToEdit={sessionToEdit}
          defaultDate={defaultDateForSession}
          defaultTime={defaultTimeForSession}
          defaultPatient={defaultPatientForSession}
          patients={patients}
          existingSessions={sessions}
          settings={settings}
        />
      )}

      {patientModalOpen && (
        <PatientModal
          isOpen={patientModalOpen}
          onClose={() => setPatientModalOpen(false)}
          onSavePatient={handleSavePatient}
          patientToEdit={patientToEdit}
        />
      )}

      {detailsPatientId && (
        <PatientDetailsModal
          isOpen={!!detailsPatientId}
          onClose={() => setDetailsPatientId(null)}
          patientId={detailsPatientId}
          patients={patients}
          sessions={sessions}
          onOpenNewSessionForPatient={handleOpenNewSessionForPatient}
          onEditPatient={handleEditPatient}
          onSavePatient={handleSavePatient}
          onEditSession={(s) => {
            setDetailsPatientId(null);
            handleOpenNewSession(s);
          }}
        />
      )}

      {settingsModalOpen && (
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onReloadAllData={reloadAllData}
        />
      )}

      {/* Modal d'appel téléphonique direct & répertoire */}
      {phoneCallModalOpen && (
        <PhoneCallModal
          isOpen={phoneCallModalOpen}
          onClose={() => setPhoneCallModalOpen(false)}
          patients={patients}
          settings={settings}
        />
      )}

      {/* Modal d'importation de données (JSON / CSV) */}
      <DataImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        activeTab={activeTab}
        patients={patients}
        sessions={sessions}
        settings={settings}
        onImportPatients={handleImportPatients}
        onImportSessions={handleImportSessions}
        onImportAll={handleImportAll}
      />

      {/* Bouton d'appel flottant toujours accessible */}
      <FloatingCallButton
        onOpenCallModal={() => setPhoneCallModalOpen(true)}
        cabinetPhone={settings.telephoneCabinet}
      />
    </div>
  );
}
