import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CalendarDays,
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Filter,
  User,
  ExternalLink,
  Phone,
  FileText,
  Sparkles,
  Coins,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { Session, Patient, SessionStatus } from '../types';
import { useSessions, isEffectuee } from '../context/SessionsContext';
import { usePDFExporter } from '../hooks/usePDFExporter';
import { 
  STANDARD_45_SLOTS, 
  add45Minutes,
  formatDateISO, 
  getMondayOfWeek, 
  getWeekDays, 
  formatFrenchDate, 
  formatShortFrenchDate, 
  createWhatsAppReminderLink, 
  parseDateISO, 
  isOverlapping,
  getMonthCalendarGrid,
  isSessionOverdue7Days,
  getDaysOverdue
} from '../utils/dateUtils';

interface CalendarViewProps {
  sessions: Session[];
  patients: Patient[];
  onOpenSessionModal: (sessionToEdit?: Session, defaultDate?: string, defaultTime?: string) => void;
  onUpdateSessionStatus: (sessionId: string, newStatus: SessionStatus) => void;
  onOpenPatientDetails: (patientId: string) => void;
  externalSelectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  sessions,
  patients,
  onOpenSessionModal,
  onUpdateSessionStatus,
  onOpenPatientDetails,
  externalSelectedDate,
  onDateChange,
}) => {
  // Current reference date (default: today 2026-09-29)
  const [selectedDate, setSelectedDate] = useState<Date>(externalSelectedDate || new Date(2026, 8, 29));
  const [viewMode, setViewMode] = useState<'semaine' | 'jour' | 'mois' | 'liste'>('semaine');
  const [filterInsurance, setFilterInsurance] = useState<'all' | 'conventionne' | 'non_conventionne'>('all');
  const [filterOrtho, setFilterOrtho] = useState<'all' | 'maroua' | 'mariem' | 'stagiaire'>('all');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false);

  const { settings } = useSessions();
  const { exportPlanning } = usePDFExporter();

  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  const updateSelectedDate = (newDate: Date) => {
    setSelectedDate(newDate);
    if (onDateChange) onDateChange(newDate);
  };

  const selectedDateISO = formatDateISO(selectedDate);
  const currentMonday = getMondayOfWeek(selectedDate);
  const weekDays = getWeekDays(currentMonday);

  // Month-specific navigation handlers
  const handlePrevMonth = () => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() - 1);
    updateSelectedDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + 1);
    updateSelectedDate(next);
  };

  const handleMonthInput = (monthStr: string) => {
    if (!monthStr) return;
    const [y, m] = monthStr.split('-').map(Number);
    if (y && m) {
      const next = new Date(selectedDate);
      next.setFullYear(y);
      next.setMonth(m - 1);
      next.setDate(Math.min(next.getDate(), 28));
      updateSelectedDate(next);
    }
  };

  // General date navigation
  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'mois') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'semaine') {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === 'jour') {
      next.setDate(next.getDate() - 1);
    } else {
      next.setDate(next.getDate() - 14);
    }
    updateSelectedDate(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'mois') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'semaine') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'jour') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setDate(next.getDate() + 14);
    }
    updateSelectedDate(next);
  };

  const handleToday = () => {
    updateSelectedDate(new Date(2026, 8, 29)); // Default to project active date
  };

  // Find patient phone for WhatsApp
  const getPatientPhone = (patientId: string): string => {
    const p = patients.find((pat) => pat.id === patientId);
    return p ? p.telephone : '';
  };

  // Filter sessions by insurance type, orthophoniste and overdue status
  const filterByInsurance = (sessionList: Session[]): Session[] => {
    return sessionList.filter((s) => {
      if (filterInsurance === 'conventionne' && !s.isConventionne) return false;
      if (filterInsurance === 'non_conventionne' && s.isConventionne) return false;
      if (filterOrtho !== 'all') {
        const ortho = (s.orthophonisteNom || '').toLowerCase();
        if (!ortho.includes(filterOrtho)) return false;
      }
      if (filterOverdueOnly && !isSessionOverdue7Days(s, selectedDate)) return false;
      return true;
    });
  };

  // Pastille rouge / Alerte visuelle pour impayés > 7 jours
  const renderOverdueBadge = (session: Session) => {
    if (!isSessionOverdue7Days(session, selectedDate)) return null;
    const days = getDaysOverdue(session.date, selectedDate);
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white shadow-xs animate-pulse flex-shrink-0 border border-rose-700 select-none"
        title={`⚠️ Alerte Impayé : Séance non soldée depuis ${days} jours (> 7 jours)`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
        <span>Impayé ({days}j)</span>
      </span>
    );
  };

  // Status badge styling
  const renderStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'realisee':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
            Réalisée
          </span>
        );
      case 'annulee':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
            Annulée
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
            Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Clock className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
            Planifiée
          </span>
        );
    }
  };

  // Orthophoniste badge styling (Maroua, Mariem, Stagiaire)
  const renderOrthoBadge = (orthoNom?: string) => {
    const ortho = (orthoNom || '').toLowerCase();
    if (ortho.includes('mariem')) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Mariem
        </span>
      );
    }
    if (ortho.includes('stagiaire')) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Stagiaire
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
        Maroua (Titulaire)
      </span>
    );
  };

  // Sessions of the active week
  const weekSessions = useMemo(() => {
    const mondayISO = formatDateISO(currentMonday);
    const saturday = new Date(currentMonday);
    saturday.setDate(saturday.getDate() + 5);
    const saturdayISO = formatDateISO(saturday);

    return sessions.filter((s) => s.date >= mondayISO && s.date <= saturdayISO);
  }, [sessions, currentMonday]);

  // Overall counts for week
  const weekTotal = weekSessions.length;
  const weekConv = weekSessions.filter((s) => s.isConventionne).length;
  const weekNonConv = weekTotal - weekConv;

  // Slots dynamiques pour la semaine
  const activeWeekSlots = useMemo(() => {
    const slotMap = new Map<string, { start: string; end: string; label: string; period: 'matin' | 'aprem' }>();
    STANDARD_45_SLOTS.forEach((s) => slotMap.set(s.start, s));

    weekSessions.forEach((session) => {
      if (!slotMap.has(session.startTime)) {
        slotMap.set(session.startTime, {
          start: session.startTime,
          end: session.endTime || add45Minutes(session.startTime),
          label: `${session.startTime} - ${session.endTime || add45Minutes(session.startTime)}`,
          period: session.startTime < '13:00' ? 'matin' : 'aprem',
        });
      }
    });

    return Array.from(slotMap.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [weekSessions]);

  // Slots dynamiques pour la journée
  const activeDaySlots = useMemo(() => {
    const slotMap = new Map<string, { start: string; end: string; label: string; period: 'matin' | 'aprem' }>();
    STANDARD_45_SLOTS.forEach((s) => slotMap.set(s.start, s));

    sessions
      .filter((s) => s.date === selectedDateISO)
      .forEach((session) => {
        if (!slotMap.has(session.startTime)) {
          slotMap.set(session.startTime, {
            start: session.startTime,
            end: session.endTime || add45Minutes(session.startTime),
            label: `${session.startTime} - ${session.endTime || add45Minutes(session.startTime)}`,
            period: session.startTime < '13:00' ? 'matin' : 'aprem',
          });
        }
      });

    return Array.from(slotMap.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [sessions, selectedDateISO]);

  // Données et statistiques complètes pour la vue mensuelle (Planning par mois)
  const monthDays = useMemo(() => {
    return getMonthCalendarGrid(selectedDate);
  }, [selectedDate]);

  const monthSessions = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    return sessions.filter((s) => {
      const d = parseDateISO(s.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [sessions, selectedDate]);

  const monthTotal = monthSessions.length;
  const monthConv = monthSessions.filter((s) => s.isConventionne).length;
  const monthNonConv = monthTotal - monthConv;
  const monthDone = monthSessions.filter((s) => isEffectuee(s.status)).length;
  const monthDonePct = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
  const monthTotalHeures = (monthDone * 45) / 60;
  const monthTotalRecettesRealisees = monthSessions
    .filter((s) => isEffectuee(s.status))
    .reduce((sum, s) => sum + s.tarif, 0);
  const monthTotalRecettesEstimees = monthSessions
    .filter((s) => s.status !== 'annulee')
    .reduce((sum, s) => sum + s.tarif, 0);

  const monthInputValue = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Navigation & Date Display */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/60 dark:border-slate-700">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                title={viewMode === 'mois' ? 'Mois précédent' : 'Période précédente'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
              >
                {viewMode === 'mois' ? 'Ce Mois' : "Aujourd'hui"}
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                title={viewMode === 'mois' ? 'Mois suivant' : 'Période suivante'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-teal-600 dark:text-teal-400 hidden sm:inline" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                {viewMode === 'semaine' && (
                  <>
                    Semaine du {formatFrenchDate(currentMonday, false)} au{' '}
                    {formatFrenchDate(new Date(new Date(currentMonday).setDate(currentMonday.getDate() + 5)))}
                  </>
                )}
                {viewMode === 'jour' && formatFrenchDate(selectedDate)}
                {viewMode === 'mois' && (
                  <>
                    Planning du mois de {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </>
                )}
                {viewMode === 'liste' && `Agenda du cabinet • ${formatFrenchDate(selectedDate)}`}
              </span>
            </div>

            {/* Bouton direct Planning par mois si pas déjà en vue mois */}
            {viewMode !== 'mois' && (
              <button
                onClick={() => setViewMode('mois')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 hover:border-teal-300 text-xs font-bold transition shadow-2xs active:scale-95 ml-1"
                title="Passer en vue planning par mois"
              >
                <CalendarDays className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Planning par mois</span>
              </button>
            )}
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            {/* Conventionné filter & Overdue filter */}
            <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium border border-slate-200/60 dark:border-slate-700 flex-wrap">
              <button
                onClick={() => {
                  setFilterInsurance('all');
                  setFilterOverdueOnly(false);
                }}
                className={`px-2.5 py-1 rounded-lg transition font-bold ${
                  filterInsurance === 'all' && !filterOverdueOnly
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Tous ({viewMode === 'mois' ? monthTotal : weekTotal})
              </button>
              <button
                onClick={() => {
                  setFilterInsurance('conventionne');
                  setFilterOverdueOnly(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-bold ${
                  filterInsurance === 'conventionne' && !filterOverdueOnly
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>CNAM ({viewMode === 'mois' ? monthConv : weekConv})</span>
              </button>
              <button
                onClick={() => {
                  setFilterInsurance('non_conventionne');
                  setFilterOverdueOnly(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-bold ${
                  filterInsurance === 'non_conventionne' && !filterOverdueOnly
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Privé ({viewMode === 'mois' ? monthTotal - monthConv : weekNonConv})</span>
              </button>

              {/* Bouton Filtre Pastille Rouge : Impayés > 7 jours */}
              {sessions.some((s) => isSessionOverdue7Days(s, selectedDate)) && (
                <button
                  onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}
                  style={{ touchAction: 'manipulation' }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-bold select-none ${
                    filterOverdueOnly
                      ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-400'
                      : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/80 hover:bg-rose-100'
                  }`}
                  title="Alerte : Afficher uniquement les séances non payées depuis plus de 7 jours"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>
                    Impayés &gt; 7j ({sessions.filter((s) => isSessionOverdue7Days(s, selectedDate)).length})
                  </span>
                </button>
              )}
            </div>

            {/* View Mode Switcher avec bouton Planning par mois */}
            <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setViewMode('semaine')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'semaine'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setViewMode('jour')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'jour'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setViewMode('mois')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'mois'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-2xs font-bold ring-1 ring-teal-500/20'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Planning par mois"
              >
                <CalendarDays className={`w-3.5 h-3.5 ${viewMode === 'mois' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <span>Mois</span>
              </button>
              <button
                onClick={() => setViewMode('liste')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'liste'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Liste
              </button>
            </div>

            {/* Direct PDF Export Button for current view */}
            <button
              onClick={() => {
                const targetDateStr = formatDateISO(selectedDate);
                const modeParam = viewMode === 'jour' ? 'jour' : viewMode === 'mois' ? 'mois' : 'semaine';
                exportPlanning(sessions, patients, settings, targetDateStr, modeParam);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-xs font-bold transition shadow-2xs group/pdf"
              title={`Exporter le planning actuel (${viewMode}) en PDF`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover/pdf:scale-110 transition-transform" />
              <span>PDF {viewMode === 'jour' ? 'Jour' : viewMode === 'mois' ? 'Mois' : 'Semaine'}</span>
            </button>
          </div>
        </div>

        {/* 45 min notice & slot reminder */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Séances calibrées : <strong>45 minutes fixes</strong> (ex: 08h30-09h15, 09h15-10h00, 10h00-10h45...)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-teal-700 dark:text-teal-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span> Conventionné CNAM
            </span>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Non-conventionné (Privé)
            </span>
          </div>
        </div>
      </div>

      {/* VIEW: SEMAINE (Week Grid) */}
      {viewMode === 'semaine' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header: Days of the week */}
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
                <div className="p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Créneau (45 min)
                </div>
                {weekDays.map((day) => {
                  const dayISO = formatDateISO(day);
                  const isToday = dayISO === '2026-09-29';
                  const isSelected = dayISO === selectedDateISO;
                  const daySessions = filterByInsurance(sessions.filter((s) => s.date === dayISO));
                  const hasOverdueInDay = daySessions.some((s) => isSessionOverdue7Days(s, selectedDate));

                  return (
                    <div
                      key={dayISO}
                      onClick={() => setSelectedDate(day)}
                      className={`p-2.5 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 cursor-pointer transition ${
                        isToday 
                          ? 'bg-teal-50/70 dark:bg-teal-950/50' 
                          : isSelected 
                          ? 'bg-slate-100/70 dark:bg-slate-800/70' 
                          : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="text-[11px] font-medium uppercase text-slate-500 dark:text-slate-400">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span
                          className={`text-sm font-extrabold w-7 h-7 rounded-full flex items-center justify-center ${
                            isToday
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {hasOverdueInDay && (
                          <span
                            className="w-2 h-2 rounded-full bg-rose-600 animate-ping"
                            title="Alerte : séance(s) impayée(s) depuis plus de 7 jours"
                          />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                        {daySessions.length} séance{daySessions.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid: 45 min slots */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeWeekSlots.map((slot) => (
                  <div key={slot.start} className="grid grid-cols-7 min-h-[78px] group">
                    {/* Time Slot Column */}
                    <div className="p-2 border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col justify-center items-center text-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{slot.start}</span>
                      <span className="text-[10px] font-medium text-slate-400">→ {slot.end}</span>
                      <span className="text-[9px] uppercase tracking-wider text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/80 px-1 rounded mt-0.5 border border-teal-200/50 dark:border-teal-800/60">
                        45 min
                      </span>
                    </div>

                    {/* 6 Day Columns */}
                    {weekDays.map((day) => {
                      const dayISO = formatDateISO(day);
                      // Match sessions scheduled in this slot
                      const slotSessions = filterByInsurance(
                        sessions.filter(
                          (s) => s.date === dayISO && s.startTime === slot.start
                        )
                      );

                      return (
                        <div
                          key={`${dayISO}-${slot.start}`}
                          className="p-1.5 border-r border-slate-100 dark:border-slate-800 last:border-r-0 relative hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition flex flex-col gap-1 justify-start min-h-[78px]"
                        >
                          {slotSessions.length === 0 ? (
                            <button
                              onClick={() => onOpenSessionModal(undefined, dayISO, slot.start)}
                              className="w-full h-full min-h-[64px] rounded-xl border border-dashed border-transparent hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 text-transparent hover:text-teal-700 dark:hover:text-teal-300 flex items-center justify-center gap-1 text-[11px] font-medium transition group-hover/slot:opacity-100 opacity-0 focus:opacity-100"
                              title={`Planifier séance le ${formatShortFrenchDate(day)} à ${slot.start}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ 45 min</span>
                            </button>
                          ) : (
                            slotSessions.map((session) => {
                              const phone = getPatientPhone(session.patientId);
                              const waLink = phone
                                ? createWhatsAppReminderLink(
                                    session.patientNom,
                                    phone,
                                    session.date,
                                    session.startTime,
                                    session.endTime
                                  )
                                : null;

                              return (
                                <div
                                  key={session.id}
                                  className={`rounded-xl p-2 text-xs border transition-all shadow-2xs relative group/card ${
                                    session.isConventionne
                                      ? 'bg-gradient-to-br from-teal-50/90 to-emerald-50/80 dark:from-teal-950/50 dark:to-emerald-950/40 border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-100'
                                      : 'bg-gradient-to-br from-amber-50/90 to-orange-50/80 dark:from-amber-950/50 dark:to-orange-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                                  }`}
                                >
                                  {/* Top header of card */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      onClick={() => onOpenPatientDetails(session.patientId)}
                                      className="font-bold truncate hover:underline cursor-pointer text-slate-900 dark:text-slate-100 text-xs"
                                      title={session.patientNom}
                                    >
                                      {session.patientNom}
                                    </span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {renderOverdueBadge(session)}
                                      {renderStatusBadge(session.status)}
                                    </div>
                                  </div>

                                  {/* Ortho badge & Insurance tag */}
                                  <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
                                    {renderOrthoBadge(session.orthophonisteNom)}
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-semibold ${
                                        session.isConventionne
                                          ? 'bg-teal-200/80 dark:bg-teal-900/80 text-teal-900 dark:text-teal-200'
                                          : 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
                                      }`}
                                    >
                                      {session.isConventionne ? 'CNAM' : 'Privé'}
                                    </span>
                                  </div>

                                  {session.motif && (
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                      {session.motif}
                                    </p>
                                  )}

                                  {/* Action bar on hover */}
                                  <div className="mt-1.5 pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1">
                                    <button
                                      onClick={() => onOpenSessionModal(session)}
                                      className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition"
                                    >
                                      Modifier
                                    </button>

                                    <div className="flex items-center gap-1">
                                      {waLink && (
                                        <a
                                          href={waLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Envoyer rappel WhatsApp"
                                          className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition"
                                        >
                                          <MessageSquare className="w-2.5 h-2.5" />
                                        </a>
                                      )}

                                      {phone && (
                                        <a
                                          href={`tel:${phone}`}
                                          title={`Appeler ${session.patientNom} (${phone})`}
                                          className="p-1 rounded-md bg-slate-800 text-white hover:bg-slate-900 transition"
                                        >
                                          <Phone className="w-2.5 h-2.5 text-emerald-400" />
                                        </a>
                                      )}

                                      {session.status !== 'realisee' ? (
                                        <button
                                          onClick={() => onUpdateSessionStatus(session.id, 'realisee')}
                                          title="Marquer comme réalisée"
                                          className="p-1 rounded-md bg-teal-600 text-white hover:bg-teal-700 transition"
                                        >
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => onUpdateSessionStatus(session.id, 'planifiee')}
                                          title="Remettre en planifiée"
                                          className="p-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition"
                                        >
                                          <Clock className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: JOUR (Day View) */}
      {viewMode === 'jour' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 sm:p-6 space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 capitalize">
                {formatFrenchDate(selectedDate)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Créneaux de 45 minutes prévus pour cette journée
              </p>
            </div>
            <button
              onClick={() => onOpenSessionModal(undefined, selectedDateISO, '08:30')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700 transition shadow-2xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter séance</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {activeDaySlots.map((slot) => {
              const daySessions = filterByInsurance(
                sessions.filter(
                  (s) => s.date === selectedDateISO && s.startTime === slot.start
                )
              );

              return (
                <div
                  key={slot.start}
                  className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    daySessions.length > 0
                      ? 'bg-slate-50/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                      : 'border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Time Badge */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-24 sm:w-28 flex-shrink-0">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {slot.start} - {slot.end}
                      </div>
                      <div className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold uppercase">
                        45 min • {slot.period === 'matin' ? 'Matin' : 'Après-midi'}
                      </div>
                    </div>

                    {/* Session details if occupied */}
                    {daySessions.length > 0 ? (
                      <div className="flex-1 space-y-2">
                        {daySessions.map((session) => {
                          const phone = getPatientPhone(session.patientId);
                          const waLink = phone
                            ? createWhatsAppReminderLink(
                                session.patientNom,
                                phone,
                                session.date,
                                session.startTime,
                                session.endTime
                              )
                            : null;

                          return (
                            <div
                              key={session.id}
                              className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                session.isConventionne
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => onOpenPatientDetails(session.patientId)}
                                    className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:underline flex items-center gap-1"
                                  >
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{session.patientNom}</span>
                                  </button>
                                  {renderOverdueBadge(session)}
                                  {renderOrthoBadge(session.orthophonisteNom)}
                                  {renderStatusBadge(session.status)}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      session.isConventionne
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-amber-600 text-white'
                                    }`}
                                  >
                                    {session.isConventionne ? 'Conventionné CNAM' : 'Privé'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                                  <span>Motif : {session.motif || 'Séance de rééducation'}</span>
                                  <span>•</span>
                                  <span className="font-semibold">{session.tarif} DT</span>
                                  {session.notesSeance && (
                                    <>
                                      <span>•</span>
                                      <span className="italic text-slate-500 dark:text-slate-400">"{session.notesSeance}"</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {waLink && (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Rappel WhatsApp</span>
                                  </a>
                                )}

                                {phone && (
                                  <a
                                    href={`tel:${phone}`}
                                    title={`Appeler ${session.patientNom} (${phone})`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 transition"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Appeler</span>
                                  </a>
                                )}

                                <button
                                  onClick={() => onOpenSessionModal(session)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition"
                                >
                                  Modifier
                                </button>

                                {session.status !== 'realisee' ? (
                                  <button
                                    onClick={() => onUpdateSessionStatus(session.id, 'realisee')}
                                    className="px-2.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition"
                                  >
                                    Valider séance
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onUpdateSessionStatus(session.id, 'annulee')}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold hover:bg-rose-100 transition"
                                  >
                                    Annuler
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs text-slate-400 italic">Créneau libre de 45 min</span>
                        <button
                          onClick={() => onOpenSessionModal(undefined, selectedDateISO, slot.start)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-800 dark:hover:text-teal-300 text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Réserver</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: MOIS (Planning Mensuel Complet et Interactif) */}
      {viewMode === 'mois' && (
        <div className="space-y-4">
          {/* 1. Barre de navigation & sélecteur de mois dédié */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 sm:p-5 space-y-4 transition-colors duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Titre et mois actif */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 capitalize">
                      {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      Planning Mensuel
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cabinet d'orthophonie Belgaied Maroua • Vue calendrier complète sur 4 ou 5 semaines
                  </p>
                </div>
              </div>

              {/* Commandes de navigation mois par mois */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                {/* Boutons Précédent / Actuel / Suivant */}
                <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                    title="Mois précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    Mois Actuel
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                    title="Mois suivant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Sélecteur natif de mois / année (HTML5 month input) */}
                <div className="relative">
                  <input
                    type="month"
                    value={monthInputValue}
                    onChange={(e) => handleMonthInput(e.target.value)}
                    className="px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition shadow-2xs"
                    title="Choisir un mois spécifique"
                  />
                </div>

                {/* Bouton Export PDF Planning Mois */}
                <button
                  onClick={() => {
                    exportPlanning(sessions, patients, settings, selectedDateISO, 'mois');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-xs font-bold transition shadow-2xs group/pdf"
                  title="Exporter ce planning mensuel en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover/pdf:scale-110 transition-transform" />
                  <span>PDF Mois</span>
                </button>

                {/* Bouton rapide d'ajout de séance */}
                <button
                  onClick={() => onOpenSessionModal(undefined, selectedDateISO, '08:30')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Séance</span>
                </button>
              </div>
            </div>

            {/* 2. Cartes d'indicateurs synthétiques du mois (KPIs) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Total Séances */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Séances</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">{monthTotal}</span>
                  <span className="text-[10px] text-slate-400 font-medium">créneaux</span>
                </div>
              </div>

              {/* Conventionnés CNAM */}
              <div className="bg-gradient-to-br from-teal-50/80 to-emerald-50/40 dark:from-teal-950/40 dark:to-emerald-950/20 p-3 rounded-xl border border-teal-200/80 dark:border-teal-800/80">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider">CNAM</p>
                  <span className="text-[10px] font-black text-teal-700 dark:text-teal-300">
                    {monthTotal > 0 ? Math.round((monthConv / monthTotal) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-teal-950 dark:text-teal-100">{monthConv}</span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">séances</span>
                </div>
              </div>

              {/* Non-Conventionnés (Privé) */}
              <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/40 dark:to-orange-950/20 p-3 rounded-xl border border-amber-200/80 dark:border-amber-800/80">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Privé</p>
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">
                    {monthTotal > 0 ? Math.round((monthNonConv / monthTotal) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-amber-950 dark:text-amber-100">{monthNonConv}</span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">séances</span>
                </div>
              </div>

              {/* Séances Réalisées */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">Effectuées</p>
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">{monthDonePct}%</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-950 dark:text-emerald-100">{monthDone}</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">validées</span>
                </div>
              </div>

              {/* Heures & Honoraires */}
              <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume & Recettes</p>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {monthTotalHeures.toFixed(1)} h
                  </span>
                  <span className="text-xs font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                    {monthTotalRecettesRealisees} {settings.devise}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Filtre par Orthophoniste et Légende Visuelle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  Praticien :
                </span>
                <button
                  onClick={() => setFilterOrtho('all')}
                  className={`px-2.5 py-1 rounded-xl font-bold text-xs transition ${
                    filterOrtho === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Tous les praticiens
                </button>
                <button
                  onClick={() => setFilterOrtho('maroua')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs transition ${
                    filterOrtho === 'maroua'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span>Maroua (Titulaire)</span>
                </button>
                <button
                  onClick={() => setFilterOrtho('mariem')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs transition ${
                    filterOrtho === 'mariem'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>Mariem (Collaboratrice)</span>
                </button>
                <button
                  onClick={() => setFilterOrtho('stagiaire')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs transition ${
                    filterOrtho === 'stagiaire'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Stagiaire</span>
                </button>
              </div>

              {/* Pastilles de statut de séances */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Séance validée</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Planifiée</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4. Grille du Calendrier Mensuel (7 colonnes : Lundi à Dimanche) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-3 sm:p-5 overflow-hidden transition-colors duration-200">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                {/* En-tête des jours de la semaine */}
                <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black uppercase tracking-wider">
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d, i) => (
                    <div
                      key={d}
                      className={`py-2 rounded-xl border ${
                        i >= 5 
                          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 text-slate-400 dark:text-slate-500' 
                          : 'bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Cases des jours */}
                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day) => {
                    const daySessions = filterByInsurance(
                      sessions.filter((s) => s.date === day.dateISO)
                    );
                    const isSelected = day.dateISO === selectedDateISO;
                    const hasOverdueInDay = daySessions.some((s) => isSessionOverdue7Days(s, selectedDate));

                    return (
                      <div
                        key={day.dateISO}
                        onClick={() => setSelectedDate(day.date)}
                        className={`min-h-[120px] sm:min-h-[145px] p-2 rounded-2xl border flex flex-col justify-between transition-all duration-150 group cursor-pointer ${
                          day.isCurrentMonth
                            ? isSelected
                              ? 'bg-teal-50/80 dark:bg-teal-950/60 border-teal-500 dark:border-teal-500 shadow-sm ring-2 ring-teal-500/40'
                              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/60 opacity-50'
                        }`}
                      >
                        {/* Haut de la case : Numéro du jour & Badges */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center transition ${
                                  day.isToday
                                    ? 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-300 dark:ring-teal-700'
                                    : day.isCurrentMonth
                                    ? 'text-slate-800 dark:text-slate-100'
                                    : 'text-slate-400 dark:text-slate-600'
                                }`}
                              >
                                {day.dayNumber}
                              </span>
                              {hasOverdueInDay && (
                                <span
                                  className="w-2 h-2 rounded-full bg-rose-600 animate-ping"
                                  title="Alerte : séance(s) impayée(s) depuis plus de 7 jours sur cette date"
                                />
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {daySessions.length > 0 && (
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {daySessions.length}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenSessionModal(undefined, day.dateISO, '08:30');
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition"
                                title={`Ajouter une séance le ${day.dateISO}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Liste compacte des séances */}
                          <div className="space-y-1 overflow-hidden">
                            {daySessions.slice(0, 3).map((s) => {
                              const isOrthoMariem = (s.orthophonisteNom || '').toLowerCase().includes('mariem');
                              const isOrthoStagiaire = (s.orthophonisteNom || '').toLowerCase().includes('stagiaire');
                              const dotColor = isOrthoMariem ? 'bg-indigo-500' : isOrthoStagiaire ? 'bg-amber-500' : 'bg-teal-500';
                              const isDone = isEffectuee(s.status);
                              const isOverdue = isSessionOverdue7Days(s, selectedDate);

                              return (
                                <button
                                  key={s.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenSessionModal(s);
                                  }}
                                  className={`w-full text-left text-[10px] font-medium p-1 rounded-lg border flex items-center justify-between gap-1 transition truncate ${
                                    isOverdue
                                      ? 'bg-rose-50/90 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400/40'
                                      : s.isConventionne
                                      ? 'bg-teal-50/90 dark:bg-teal-950/60 border-teal-200/80 dark:border-teal-800/80 text-teal-950 dark:text-teal-100 hover:bg-teal-100 dark:hover:bg-teal-900/60'
                                      : 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/80 text-amber-950 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                                  }`}
                                  title={`${s.startTime}-${s.endTime} : ${s.patientNom} (${s.orthophonisteNom || 'Maroua'}) - ${isOverdue ? '⚠️ Impayé > 7 jours' : isDone ? 'Effectuée' : 'Planifiée'}`}
                                >
                                  <div className="flex items-center gap-1 min-w-0 truncate">
                                    {isOverdue ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse flex-shrink-0"></span>
                                    ) : (
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}></span>
                                    )}
                                    <span className="font-bold flex-shrink-0">{s.startTime}</span>
                                    <span className="truncate">{s.patientNom}</span>
                                  </div>
                                  {isOverdue ? (
                                    <span className="text-[8px] font-black bg-rose-600 text-white px-1 rounded-full flex-shrink-0">!</span>
                                  ) : isDone ? (
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0"></span>
                                  )}
                                </button>
                              );
                            })}

                            {daySessions.length > 3 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSelectedDate(day.date);
                                  setViewMode('jour');
                                }}
                                className="w-full text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline pt-0.5"
                              >
                                +{daySessions.length - 3} autre{daySessions.length - 3 > 1 ? 's' : ''}...
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Bas de case : bouton pour basculer sur la journée */}
                        <div className="pt-1 mt-1 border-t border-slate-100/80 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSelectedDate(day.date);
                              setViewMode('jour');
                            }}
                            className="font-semibold text-slate-400 dark:text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 hover:underline transition"
                          >
                            Voir jour →
                          </button>
                          {daySessions.some((s) => isEffectuee(s.status)) && (
                            <span title="Séance(s) réalisée(s)">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LISTE (Agenda View) */}
      {viewMode === 'liste' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 space-y-3 transition-colors duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Toutes les séances enregistrées (45 min)
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total filtré : {filterByInsurance(sessions).length} séances
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filterByInsurance(
              [...sessions].sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
            ).map((session) => {
              const phone = getPatientPhone(session.patientId);
              const waLink = phone
                ? createWhatsAppReminderLink(
                    session.patientNom,
                    phone,
                    session.date,
                    session.startTime,
                    session.endTime
                  )
                : null;

              return (
                <div key={session.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex flex-col items-center justify-center border border-teal-200/60 dark:border-teal-800 font-mono flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase">
                        {parseDateISO(session.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-black">
                        {parseDateISO(session.date).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => onOpenPatientDetails(session.patientId)}
                          className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:underline"
                        >
                          {session.patientNom}
                        </button>
                        {renderOverdueBadge(session)}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            session.isConventionne
                              ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {session.isConventionne ? 'CNAM' : 'Privé'}
                        </span>
                        {renderStatusBadge(session.status)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatFrenchDate(parseDateISO(session.date), false)} • {session.startTime} - {session.endTime} (45 min)
                        </span>
                        <span>•</span>
                        <span>{session.tarif} DT</span>
                        {session.motif && <span>• {session.motif}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition"
                        title="Envoyer rappel WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition"
                        title={`Appeler ${session.patientNom} (${phone})`}
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      </a>
                    )}
                    <button
                      onClick={() => onOpenSessionModal(session)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
                    >
                      Modifier
                    </button>
                    {session.status !== 'realisee' && (
                      <button
                        onClick={() => onUpdateSessionStatus(session.id, 'realisee')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
                      >
                        Valider
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
