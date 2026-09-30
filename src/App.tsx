/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { DataImportModal } from './components/DataImportModal';
import { triggerExportPDF } from './utils/pdfExport';
import { Patient, Session, SessionStatus, CabinetSettings } from './types';
import { SessionsProvider, useSessions } from './context/SessionsContext';
import { formatDateISO, parseDateISO } from './utils/dateUtils';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTheme, useFullscreen } from './hooks/useThemeAndFullscreen';
import { WifiOff, Sparkles, AlertCircle, X } from 'lucide-react';

function MainAppContent() {
  const {
    sessions,
    patients,
    settings,
    selectedDate,
    setSelectedDate,
    saveSession: saveSessionContext,
    deleteSession: deleteSessionContext,
    updateSessionStatus: updateSessionStatusContext,
    savePatient: savePatientContext,
    deletePatient: deletePatientContext,
    saveCabinetSettings,
    reloadAllData,
    importPatients,
    importSessions,
    importAll,
    weekMetrics,
  } = useSessions();

  const [activeTab, setActiveTab] = useState<ActiveTab>('planning');
  const isOnline = useOnlineStatus();
  const { theme, toggleTheme } = useTheme();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Convert string selectedDate to Date object for CalendarView
  const calendarDate = useMemo(() => parseDateISO(selectedDate), [selectedDate]);
  const setCalendarDate = useCallback((d: Date) => {
    setSelectedDate(formatDateISO(d));
  }, [setSelectedDate]);

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

  // Synchronisation sécurisée et contrôle anti-doublon
  const handleSaveSession = useCallback((savedSession: Session) => {
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

    setGlobalConflictAlert(null);
    saveSessionContext(savedSession);
  }, [sessions, saveSessionContext]);

  // Export PDF contextuel
  const handleExportPDF = useCallback(() => {
    triggerExportPDF({
      activeTab,
      sessions,
      patients,
      settings,
      currentDate: selectedDate,
    });
  }, [activeTab, sessions, patients, settings, selectedDate]);

  // Open modal helpers
  const handleOpenNewSession = useCallback((sessionToEditParam?: Session, defaultDateParam?: string, defaultTimeParam?: string) => {
    setSessionToEdit(sessionToEditParam);
    setDefaultDateForSession(defaultDateParam || selectedDate);
    setDefaultTimeForSession(defaultTimeParam || '08:30');
    setDefaultPatientForSession(undefined);
    setSessionModalOpen(true);
  }, [selectedDate]);

  const handleOpenNewSessionForPatient = useCallback((patient: Patient) => {
    setSessionToEdit(undefined);
    setDefaultDateForSession(selectedDate);
    setDefaultTimeForSession('08:30');
    setDefaultPatientForSession(patient);
    setSessionModalOpen(true);
  }, [selectedDate]);

  const handleOpenNewPatient = useCallback(() => {
    setPatientToEdit(undefined);
    setPatientModalOpen(true);
  }, []);

  const handleEditPatient = useCallback((patient: Patient) => {
    setPatientToEdit(patient);
    setPatientModalOpen(true);
  }, []);

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white transition-colors duration-200 ${isFullscreen ? 'h-screen w-screen overflow-x-hidden' : ''}`}>
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
        onExportPDF={handleExportPDF}
        onOpenImportModal={() => setImportModalOpen(true)}
        totalPatientsCount={patients.length}
        totalSessionsThisWeek={weekMetrics.totalSessionsThisWeek}
        conventionnesThisWeek={weekMetrics.conventionnesThisWeek}
        theme={theme}
        onToggleTheme={toggleTheme}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* App Body Content */}
      <main className="flex-1 max-w-[1780px] 2xl:max-w-[1920px] w-full mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4">
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
          <div className="bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 p-4 rounded-2xl shadow-md text-rose-950 dark:text-rose-100 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-600 text-white shadow-2xs flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <span>{globalConflictAlert.title}</span>
                  <span className="text-[10px] font-extrabold uppercase bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-full">
                    Doublon interdit
                  </span>
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed font-medium">
                  {globalConflictAlert.message}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                  <span>⛔ Règle du cabinet : Un même patient ne peut pas avoir deux séances le même jour, ni deux orthophonistes en même temps.</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setGlobalConflictAlert(null)}
              className="p-1.5 rounded-xl text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900 transition flex-shrink-0"
              title="Fermer l'alerte"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Planning & Séances */}
        {activeTab === 'planning' && (
          <CalendarView
            sessions={sessions}
            patients={patients}
            onOpenSessionModal={handleOpenNewSession}
            onUpdateSessionStatus={updateSessionStatusContext}
            onOpenPatientDetails={(id) => setDetailsPatientId(id)}
            externalSelectedDate={calendarDate}
            onDateChange={setCalendarDate}
          />
        )}

        {/* Tab 2: Agenda Triple (3 Ortho) */}
        {activeTab === 'simultane' && (
          <SimultaneousAgenda
            patients={patients}
            sessions={sessions}
            onSaveSession={handleSaveSession}
            onDeleteSession={deleteSessionContext}
            onOpenPhoneModal={() => setPhoneCallModalOpen(true)}
            onSelectPatientDetails={(id) => setDetailsPatientId(id)}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}

        {/* Tab 3: Dossiers Patients */}
        {activeTab === 'patients' && (
          <PatientsTable
            patients={patients}
            sessions={sessions}
            onOpenNewPatient={handleOpenNewPatient}
            onEditPatient={handleEditPatient}
            onDeletePatient={deletePatientContext}
            onOpenNewSessionForPatient={handleOpenNewSessionForPatient}
            onOpenPatientDetails={(id) => setDetailsPatientId(id)}
          />
        )}

        {/* Tab 4: Tableau de Bord (Synchronisé à 100% en temps réel) */}
        {activeTab === 'dashboard' && (
          <DashboardView
            sessions={sessions}
            patients={patients}
            settings={settings}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 py-3 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
        <div className="max-w-[1780px] 2xl:max-w-[1920px] w-full mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-200">{settings.nomCabinet}</span>
            <span>•</span>
            <span>{settings.praticien}</span>
            <span className="hidden md:inline">• Séances 45 min fixes</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Progressive Web App (PWA) installable</span>
            <span>•</span>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
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
          onDeleteSession={deleteSessionContext}
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
          onSavePatient={savePatientContext}
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
          onSavePatient={savePatientContext}
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
          onSaveSettings={saveCabinetSettings}
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
        onImportPatients={(pts, mode) => {
          importPatients(pts, mode);
          setImportNotification(`Succès : ${pts.length} dossier(s) patient(s) importé(s).`);
          setTimeout(() => setImportNotification(null), 4500);
        }}
        onImportSessions={(ses, mode) => {
          importSessions(ses, mode);
          setImportNotification(`Succès : ${ses.length} séance(s) importée(s) dans le planning.`);
          setTimeout(() => setImportNotification(null), 4500);
        }}
        onImportAll={(data) => {
          importAll(data);
          setImportNotification(`Sauvegarde intégrale restaurée (${data.patients?.length || 0} patients, ${data.sessions?.length || 0} séances).`);
          setTimeout(() => setImportNotification(null), 4500);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <SessionsProvider>
      <MainAppContent />
    </SessionsProvider>
  );
}
