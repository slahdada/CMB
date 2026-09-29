import React from 'react';
import { Calendar, Users, BarChart3, Settings, Plus, Sparkles, WifiOff, Phone } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export type ActiveTab = 'planning' | 'patients' | 'dashboard' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewSession: () => void;
  onOpenNewPatient: () => void;
  onOpenPhoneModal: () => void;
  totalPatientsCount: number;
  totalSessionsThisWeek: number;
  conventionnesThisWeek: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewSession,
  onOpenNewPatient,
  onOpenPhoneModal,
  totalPatientsCount,
  totalSessionsThisWeek,
  conventionnesThisWeek,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner / Branding Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Cabinet identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-slate-800 p-0.5 shadow-md flex items-center justify-center text-white">
              {/* Stylized speech & hearing therapy icon */}
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h.01" />
                <path d="M12 10h.01" />
                <path d="M16 10h.01" />
              </svg>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-slate-900">
                ✓
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                  Cabinet d'orthophonie Belgaied Maroua
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Séances 45 min
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate flex items-center gap-2">
                <span>Gestion de planning & Suivi Conventionné CNAM</span>
                <span className="hidden lg:inline text-slate-300">•</span>
                <span className="hidden lg:inline font-medium text-emerald-600">
                  Semaine en cours : {totalSessionsThisWeek} séances ({conventionnesThisWeek} conv.)
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons & PWA */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-300 text-[11px] font-medium" title="Mode hors-ligne">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hors ligne</span>
              </div>
            )}

            <PWAInstallButton />

            {/* Bouton d'appel téléphonique direct */}
            <button
              onClick={onOpenPhoneModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 transition shadow-2xs group/phone"
              title="Passer un appel téléphonique (Cabinet ou Patient)"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600 transition-transform group-hover/phone:rotate-12" />
              <span className="hidden sm:inline">Appel tél.</span>
            </button>

            <button
              onClick={onOpenNewPatient}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>Nouveau patient</span>
            </button>

            <button
              onClick={onOpenNewSession}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white hover:bg-teal-700 active:scale-95 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Séance (45 min)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation row */}
        <nav className="mt-2.5 flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2">
          <button
            onClick={() => setActiveTab('planning')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'planning'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'planning' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span>Planning & Séances</span>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'patients'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'patients' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span>Patients</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'patients' ? 'bg-teal-200/80 text-teal-900' : 'bg-slate-200 text-slate-600'
            }`}>
              {totalPatientsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-teal-50 text-teal-800 border border-teal-200/80 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-teal-600' : 'text-slate-400'}`} />
            <span>Tableau de bord</span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Hebdo / Mensuel
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ml-auto ${
              activeTab === 'settings'
                ? 'bg-slate-100 text-slate-900 border border-slate-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
            title="Paramètres, Tarifs & Sauvegardes"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Paramètres</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
