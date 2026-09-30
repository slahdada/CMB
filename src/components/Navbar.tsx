import React, { useState } from 'react';
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
  Sun, 
  Moon, 
  Maximize2, 
  Minimize2, 
  Coins, 
  X,
  Clock,
  UserPlus
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { CabinetLogo } from './CabinetLogo';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeMode } from '../hooks/useThemeAndFullscreen';

export type ActiveTab = 'planning' | 'simultane' | 'patients' | 'dashboard' | 'creances' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewSession: () => void;
  onOpenNewPatient: () => void;
  onOpenPhoneModal?: () => void;
  onExportPDF: () => void;
  onOpenSettings?: () => void;
  totalPatientsCount: number;
  totalSessionsThisWeek: number;
  conventionnesThisWeek: number;
  overdueSessionsCount?: number;
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
  onOpenSettings,
  totalPatientsCount,
  totalSessionsThisWeek,
  conventionnesThisWeek,
  overdueSessionsCount = 0,
  theme = 'light',
  onToggleTheme,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const isOnline = useOnlineStatus();
  const [showMobileFabMenu, setShowMobileFabMenu] = useState(false);

  return (
    <>
      {/* TOP HEADER: Clean, compact on Mobile, rich on Desktop */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
        <div className="max-w-[1780px] 2xl:max-w-[1920px] w-full mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-2.5">
          
          {/* ROW 1: Logo & Actions */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full">
            
            {/* Left: Logo & Cabinet Identity */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <CabinetLogo size="md" className="flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                    <span className="sm:hidden">Cabinet Belgaied</span>
                    <span className="hidden sm:inline">Cabinet d'orthophonie Belgaied Maroua</span>
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    45 min
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 sm:gap-2">
                  <span className="truncate">Orthophonie • CNAM</span>
                  <span className="hidden lg:inline text-slate-300 dark:text-slate-700">•</span>
                  <span className="hidden lg:inline font-medium text-emerald-600 dark:text-emerald-400">
                    Semaine : {totalSessionsThisWeek} séances ({conventionnesThisWeek} conv.)
                  </span>
                </p>
              </div>
            </div>

            {/* Right: Action Buttons Group */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              
              {/* Indicateur Hors-ligne */}
              {!isOnline && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-medium" title="Mode hors-ligne">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hors ligne</span>
                </div>
              )}

              {/* 1. Bouton Bascule Thème Clair / Sombre */}
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  style={{ touchAction: 'manipulation' }}
                  className="min-h-[42px] min-w-[42px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-100 active:scale-95 transition shadow-2xs select-none cursor-pointer group/theme"
                  title={theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
                  aria-label="Changer de thème"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform group-hover/theme:rotate-90 duration-300" />
                  ) : (
                    <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 transition-transform group-hover/theme:-rotate-12 duration-300" />
                  )}
                </button>
              )}

              {/* 2. Bouton Plein Écran */}
              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  style={{ touchAction: 'manipulation' }}
                  className={`min-h-[42px] min-w-[42px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-xl border transition active:scale-95 shadow-2xs select-none cursor-pointer group/fs ${
                    isFullscreen
                      ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 active:bg-slate-200'
                  }`}
                  title={isFullscreen ? 'Quitter Plein Écran' : 'Plein Écran'}
                  aria-label="Plein écran"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-teal-600 dark:text-teal-400 transition-transform group-hover/fs:scale-110" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform group-hover/fs:scale-110" />
                  )}
                </button>
              )}

              {/* 3. Bouton Installation PWA (Desktop/Mobile) */}
              <PWAInstallButton className="hidden sm:inline-flex" />

              {/* 4. Bouton Export PDF (Desktop/Tablette) */}
              <button
                onClick={onExportPDF}
                style={{ touchAction: 'manipulation' }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/50 px-2.5 sm:px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 active:bg-rose-100 dark:active:bg-rose-900/60 active:scale-95 transition shadow-2xs group/pdf select-none"
                title="Exporter au format PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 transition-transform group-hover/pdf:scale-110" />
                <span>PDF</span>
              </button>

              {/* 5. Bouton Nouveau Patient (Desktop) */}
              <button
                onClick={onOpenNewPatient}
                style={{ touchAction: 'manipulation' }}
                className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 active:bg-slate-50 active:scale-95 transition shadow-2xs select-none"
              >
                <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Nouveau patient</span>
              </button>

              {/* 6. Bouton Paramètres (Mobile header shortcut) */}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  style={{ touchAction: 'manipulation' }}
                  className="md:hidden min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95 transition shadow-2xs select-none cursor-pointer"
                  title="Paramètres"
                  aria-label="Paramètres"
                >
                  <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              )}

              {/* 7. Bouton Principal : + Séance (Visible sur Desktop / Tablette) */}
              <button
                onClick={onOpenNewSession}
                style={{ touchAction: 'manipulation' }}
                className="hidden md:inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-teal-600 active:bg-teal-700 dark:bg-teal-500 dark:active:bg-teal-600 px-3 sm:px-4 py-2 text-xs font-bold text-white dark:text-slate-950 shadow-sm active:scale-95 transition select-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Séance (45 min)</span>
              </button>
            </div>
          </div>

          {/* DESKTOP TAB NAVIGATION ROW (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center justify-between sm:justify-start gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800 pt-2 mt-2.5">
            <button
              onClick={() => setActiveTab('planning')}
              style={{ touchAction: 'manipulation' }}
              className={`min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 select-none cursor-pointer ${
                activeTab === 'planning'
                  ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:bg-slate-200/80'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Calendar className={`w-4 h-4 ${activeTab === 'planning' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {overdueSessionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </div>
              <span>Planning & Séances</span>
              {overdueSessionsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse flex-shrink-0" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('simultane')}
              style={{ touchAction: 'manipulation' }}
              className={`min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 select-none cursor-pointer ${
                activeTab === 'simultane'
                  ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:bg-slate-200/80'
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
              style={{ touchAction: 'manipulation' }}
              className={`min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 select-none cursor-pointer ${
                activeTab === 'patients'
                  ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:bg-slate-200/80'
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
              style={{ touchAction: 'manipulation' }}
              className={`min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 select-none cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:bg-slate-200/80'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {overdueSessionsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </div>
              <span>Tableau de bord</span>
              {overdueSessionsCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  <span>{overdueSessionsCount}</span>
                </span>
              ) : (
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  Hebdo / Mois
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('creances')}
              style={{ touchAction: 'manipulation' }}
              className={`min-h-[44px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 select-none cursor-pointer ${
                activeTab === 'creances'
                  ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:bg-slate-200/80'
              }`}
            >
              <Coins className={`w-4 h-4 ${activeTab === 'creances' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>Suivi des Créances</span>
              {overdueSessionsCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs animate-pulse">
                  <span>{overdueSessionsCount} retard</span>
                </span>
              ) : (
                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold text-teal-700 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-950/80 px-1.5 py-0.5 rounded-full">
                  Recouvrement
                </span>
              )}
            </button>

            <button
              onClick={() => {
                if (onOpenSettings) onOpenSettings();
                else setActiveTab('settings');
              }}
              style={{ touchAction: 'manipulation' }}
              className={`min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ml-auto whitespace-nowrap flex-shrink-0 select-none cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:bg-slate-200/80'
              }`}
              title="Paramètres, Tarifs & Sauvegardes"
            >
              <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="hidden sm:inline">Paramètres</span>
            </button>
          </nav>
        </div>
      </header>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) & POP-UP ACTION MENU */}
      <div className="md:hidden">
        {/* Backdrop for FAB menu */}
        {showMobileFabMenu && (
          <div 
            onClick={() => setShowMobileFabMenu(false)}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          />
        )}

        {/* Mobile Quick Actions Popup / Sheet */}
        {showMobileFabMenu && (
          <div className="fixed bottom-20 right-4 z-50 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-700 p-3 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 px-2">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Actions Rapides
              </span>
              <button
                onClick={() => setShowMobileFabMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action 1: Nouvelle Séance 45 min */}
            <button
              onClick={() => {
                setShowMobileFabMenu(false);
                onOpenNewSession();
              }}
              style={{ touchAction: 'manipulation' }}
              className="w-full min-h-[48px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-teal-600 active:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-xs">Nouvelle Séance</span>
                <span className="block text-[10px] text-teal-100 font-medium">Durée 45 min • RDV patient</span>
              </div>
            </button>

            {/* Action 2: Nouveau Patient */}
            <button
              onClick={() => {
                setShowMobileFabMenu(false);
                onOpenNewPatient();
              }}
              style={{ touchAction: 'manipulation' }}
              className="w-full min-h-[48px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs border border-slate-200/80 dark:border-slate-700 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/80 flex items-center justify-center text-teal-700 dark:text-teal-300 flex-shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block font-bold text-xs">Nouveau Patient</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Fiche, CNAM & WhatsApp</span>
              </div>
            </button>

            {/* Action 3: Exporter PDF */}
            <button
              onClick={() => {
                setShowMobileFabMenu(false);
                onExportPDF();
              }}
              style={{ touchAction: 'manipulation' }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/50 active:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-900/60 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs">Exporter Bilan PDF</span>
            </button>
          </div>
        )}

        {/* Circular Round Floating Action Button (FAB) */}
        <button
          onClick={() => setShowMobileFabMenu(!showMobileFabMenu)}
          style={{ touchAction: 'manipulation' }}
          className={`fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 cursor-pointer ${
            showMobileFabMenu
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rotate-45'
              : 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 ring-4 ring-teal-600/20'
          }`}
          aria-label="Actions rapides"
          title="Actions rapides (+ Séance, + Patient, Export PDF)"
        >
          <Plus className="w-7 h-7 transition-transform duration-200" />
        </button>
      </div>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
      {/* 5 Equal Columns, Zero Horizontal Scroll, High Z-Index, Opaque Background */}
      <nav 
        aria-label="Navigation principale mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-1 py-1 safe-area-pb"
      >
        <div className="grid grid-cols-5 gap-0.5 items-center w-full max-w-lg mx-auto">
          
          {/* TAB 1: Planning */}
          <button
            onClick={() => setActiveTab('planning')}
            style={{ touchAction: 'manipulation' }}
            className={`min-h-[50px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-center select-none cursor-pointer transition ${
              activeTab === 'planning'
                ? 'text-teal-600 dark:text-teal-400 font-black'
                : 'text-slate-500 dark:text-slate-400 active:bg-slate-100/70 dark:active:bg-slate-800/60 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Calendar className={`w-5 h-5 ${activeTab === 'planning' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
              {overdueSessionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              )}
            </div>
            <span className="text-[10px] leading-tight truncate">Planning</span>
          </button>

          {/* TAB 2: Agenda Triple */}
          <button
            onClick={() => setActiveTab('simultane')}
            style={{ touchAction: 'manipulation' }}
            className={`min-h-[50px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-center select-none cursor-pointer transition ${
              activeTab === 'simultane'
                ? 'text-teal-600 dark:text-teal-400 font-black'
                : 'text-slate-500 dark:text-slate-400 active:bg-slate-100/70 dark:active:bg-slate-800/60 font-medium'
            }`}
          >
            <Layers className={`w-5 h-5 ${activeTab === 'simultane' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span className="text-[10px] leading-tight truncate">Triple</span>
          </button>

          {/* TAB 3: Patients */}
          <button
            onClick={() => setActiveTab('patients')}
            style={{ touchAction: 'manipulation' }}
            className={`min-h-[50px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-center select-none cursor-pointer transition ${
              activeTab === 'patients'
                ? 'text-teal-600 dark:text-teal-400 font-black'
                : 'text-slate-500 dark:text-slate-400 active:bg-slate-100/70 dark:active:bg-slate-800/60 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Users className={`w-5 h-5 ${activeTab === 'patients' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="absolute -top-1 -right-2 text-[8px] font-black px-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                {totalPatientsCount}
              </span>
            </div>
            <span className="text-[10px] leading-tight truncate">Patients</span>
          </button>

          {/* TAB 4: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{ touchAction: 'manipulation' }}
            className={`min-h-[50px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-center select-none cursor-pointer transition ${
              activeTab === 'dashboard'
                ? 'text-teal-600 dark:text-teal-400 font-black'
                : 'text-slate-500 dark:text-slate-400 active:bg-slate-100/70 dark:active:bg-slate-800/60 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <BarChart3 className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
              {overdueSessionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              )}
            </div>
            <span className="text-[10px] leading-tight truncate">Stats</span>
          </button>

          {/* TAB 5: Créances */}
          <button
            onClick={() => setActiveTab('creances')}
            style={{ touchAction: 'manipulation' }}
            className={`min-h-[50px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-center select-none cursor-pointer transition ${
              activeTab === 'creances'
                ? 'text-teal-600 dark:text-teal-400 font-black'
                : 'text-slate-500 dark:text-slate-400 active:bg-slate-100/70 dark:active:bg-slate-800/60 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Coins className={`w-5 h-5 ${activeTab === 'creances' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
              {overdueSessionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] leading-tight truncate">Créances</span>
          </button>
        </div>
      </nav>
    </>
  );
};
