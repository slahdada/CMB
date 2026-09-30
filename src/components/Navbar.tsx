import React from 'react';
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  Plus, 
  Sparkles, 
  WifiOff, 
  Layers, 
  FileText, 
  FileUp,
  Sun,
  Moon,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { CabinetLogo } from './CabinetLogo';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeMode } from '../hooks/useThemeAndFullscreen';

export type ActiveTab = 'planning' | 'simultane' | 'patients' | 'dashboard' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewSession: () => void;
  onOpenNewPatient: () => void;
  onOpenPhoneModal?: () => void;
  onExportPDF: () => void;
  onOpenImportModal: () => void;
  totalPatientsCount: number;
  totalSessionsThisWeek: number;
  conventionnesThisWeek: number;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewSession,
  onOpenNewPatient,
  onExportPDF,
  onOpenImportModal,
  totalPatientsCount,
  totalSessionsThisWeek,
  conventionnesThisWeek,
  theme = 'light',
  onToggleTheme,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      {/* Top Banner / Branding Row */}
      <div className="max-w-[1780px] 2xl:max-w-[1920px] w-full mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Cabinet identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <CabinetLogo size="md" />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  Cabinet d'orthophonie Belgaied Maroua
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  Séances 45 min
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-2">
                <span>Gestion de planning & Suivi Conventionné CNAM</span>
                <span className="hidden lg:inline text-slate-300 dark:text-slate-700">•</span>
                <span className="hidden lg:inline font-medium text-emerald-600 dark:text-emerald-400">
                  Semaine en cours : {totalSessionsThisWeek} séances ({conventionnesThisWeek} conv.)
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons, Theme, Fullscreen & PWA */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {!isOnline && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-medium" title="Mode hors-ligne">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hors ligne</span>
              </div>
            )}

            {/* 1. Bouton Bascule Thème Clair / Sombre */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition shadow-2xs group/theme"
                title={theme === 'dark' ? 'Basculer en Mode Clair (Light)' : 'Basculer en Mode Sombre (Dark)'}
                aria-label="Changer de thème"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover/theme:rotate-90 duration-300" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600 transition-transform group-hover/theme:-rotate-12 duration-300" />
                )}
              </button>
            )}

            {/* 2. Bouton Bascule Plein Écran */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className={`p-1.5 sm:p-2 rounded-xl border transition active:scale-95 shadow-2xs group/fs ${
                  isFullscreen
                    ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={isFullscreen ? 'Quitter le Plein Écran' : 'Activer le Plein Écran (Fullscreen)'}
                aria-label="Plein écran"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-teal-600 dark:text-teal-400 transition-transform group-hover/fs:scale-110" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform group-hover/fs:scale-110" />
                )}
              </button>
            )}

            <PWAInstallButton />

            {/* Bouton Export PDF contextuel */}
            <button
              onClick={onExportPDF}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/50 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 active:scale-95 transition shadow-2xs group/pdf"
              title={
                activeTab === 'patients'
                  ? 'Exporter le registre complet des patients en PDF'
                  : activeTab === 'dashboard'
                  ? 'Exporter le bilan statistique du cabinet en PDF'
                  : activeTab === 'simultane'
                  ? "Exporter le planning de l'agenda en PDF"
                  : 'Exporter le planning des séances en PDF'
              }
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 transition-transform group-hover/pdf:scale-110" />
              <span className="hidden sm:inline">Exporter PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Bouton Importation de données contextuel */}
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 active:scale-95 transition shadow-2xs group/import"
              title="Importer des données (JSON ou CSV)"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 transition-transform group-hover/import:scale-110" />
              <span className="hidden sm:inline">Importer</span>
              <span className="sm:hidden">Import</span>
            </button>

            <button
              onClick={onOpenNewPatient}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Nouveau patient</span>
            </button>

            <button
              onClick={onOpenNewSession}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 dark:bg-teal-500 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white dark:text-slate-950 hover:bg-teal-700 dark:hover:bg-teal-400 active:scale-95 transition shadow-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Séance (45 min)</span>
              <span className="sm:hidden">+ Séance</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation row with responsive wrapping and compact layout */}
        <nav className="mt-2.5 flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800 pt-2">
          <button
            onClick={() => setActiveTab('planning')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'planning'
                ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'planning' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Planning & Séances</span>
          </button>

          <button
            onClick={() => setActiveTab('simultane')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'simultane'
                ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'simultane' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Agenda Triple</span>
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-full">
              Autosave
            </span>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'patients'
                ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users className={`w-4 h-4 ${activeTab === 'patients' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Patients</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'patients' 
                ? 'bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-100' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              {totalPatientsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span>Tableau de bord</span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Hebdo / Mois
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ml-auto whitespace-nowrap flex-shrink-0 ${
              activeTab === 'settings'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
            title="Paramètres, Tarifs & Sauvegardes"
          >
            <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="hidden sm:inline">Paramètres</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
