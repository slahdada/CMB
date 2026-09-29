/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { PatientsTable } from './components/PatientsTable';
import { DashboardView } from './components/DashboardView';
import { SessionModal } from './components/SessionModal';
import { PatientModal } from './components/PatientModal';
import { PatientDetailsModal } from './components/PatientDetailsModal';
import { SettingsModal } from './components/SettingsModal';
import { PhoneCallModal } from './components/PhoneCallModal';
import { FloatingCallButton } from './components/FloatingCallButton';
import { Patient, Session, SessionStatus, CabinetSettings } from './types';
import { 
  loadPatients, 
  savePatients, 
  loadSessions, 
  saveSessions, 
  loadSettings, 
  saveSettings 
} from './utils/storage';
import { formatDateISO, getMondayOfWeek, getWeekDays } from './utils/dateUtils';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, Heart, Sparkles, Phone, MessageSquare } from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<CabinetSettings>(loadSettings());
  const [activeTab, setActiveTab] = useState<ActiveTab>('planning');
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

  // Initialize data from local storage
  useEffect(() => {
    setPatients(loadPatients());
    setSessions(loadSessions());
    setSettings(loadSettings());
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
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === savedSession.id);
      const next = exists
        ? prev.map((s) => (s.id === savedSession.id ? savedSession : s))
        : [...prev, savedSession];
      saveSessions(next);
      return next;
    });
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
        totalPatientsCount={patients.length}
        totalSessionsThisWeek={totalSessionsThisWeek}
        conventionnesThisWeek={conventionnesThisWeek}
      />

      {/* App Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeTab === 'planning' && (
          <CalendarView
            sessions={sessions}
            patients={patients}
            onOpenSessionModal={handleOpenNewSession}
            onUpdateSessionStatus={handleUpdateSessionStatus}
            onOpenPatientDetails={(id) => setDetailsPatientId(id)}
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
          isOpen={sessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
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

      {/* Bouton d'appel flottant toujours accessible */}
      <FloatingCallButton
        onOpenCallModal={() => setPhoneCallModalOpen(true)}
        cabinetPhone={settings.telephoneCabinet}
      />
    </div>
  );
}
