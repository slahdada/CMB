import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Coins, 
  UserCheck, 
  Sparkles, 
  AlertCircle,
  TrendingUp,
  FileCheck,
  CalendarDays,
  CalendarRange,
  ArrowRight,
  FileText
} from 'lucide-react';
import { Session, CabinetSettings } from '../types';
import { 
  formatDateISO, 
  parseDateISO, 
  formatFrenchDate, 
  getMondayOfWeek, 
  getWeekDays 
} from '../utils/dateUtils';
import { isEffectuee, OrthoSummaryMetrics } from '../context/SessionsContext';
import { usePDFExporter } from '../hooks/usePDFExporter';

export type FilterPeriodMode = 'jour' | 'semaine' | 'mois' | 'du_au';

interface DailyOrthoStatsProps {
  sessions: Session[];
  settings: CabinetSettings;
  initialDate?: string;
  onDateChange?: (date: string) => void;
}

const DEFAULT_ORTHOS = [
  {
    nom: 'Maroua',
    role: 'Orthophoniste Titulaire',
    avatarColor: 'bg-teal-600 text-white',
    badgeColor: 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    borderColor: 'border-teal-200/90 dark:border-teal-900/60',
    progressColor: 'bg-teal-500',
  },
  {
    nom: 'Mariem',
    role: 'Collaboratrice',
    avatarColor: 'bg-indigo-600 text-white',
    badgeColor: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    borderColor: 'border-indigo-200/90 dark:border-indigo-900/60',
    progressColor: 'bg-indigo-500',
  },
  {
    nom: 'Stagiaire',
    role: 'Stagiaire en cabinet',
    avatarColor: 'bg-amber-600 text-white',
    badgeColor: 'bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    borderColor: 'border-amber-200/90 dark:border-amber-900/60',
    progressColor: 'bg-amber-500',
  },
];

export const DailyOrthoStats: React.FC<DailyOrthoStatsProps> = ({
  sessions,
  settings,
  initialDate = '2026-09-29',
  onDateChange,
}) => {
  // Mode de filtrage : Journée, Semaine, Mois, ou Période Personnalisée "Du ... Au ..."
  const [periodMode, setPeriodMode] = useState<FilterPeriodMode>('jour');

  // Dates de référence
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [customStartDate, setCustomStartDate] = useState<string>('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-09-30');
  const [selectedOrthoDetail, setSelectedOrthoDetail] = useState<string | null>(null);

  const { exportOrthoStats } = usePDFExporter();

  // Synchronisation avec initialDate si modifié depuis l'extérieur
  useEffect(() => {
    if (initialDate && initialDate !== selectedDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const changeSingleDate = (newDate: string) => {
    setSelectedDate(newDate);
    if (onDateChange) onDateChange(newDate);
  };

  // --- NAVIGATION PAR JOUR ---
  const handlePrevDay = () => {
    const d = parseDateISO(selectedDate);
    d.setDate(d.getDate() - 1);
    changeSingleDate(formatDateISO(d));
  };
  const handleNextDay = () => {
    const d = parseDateISO(selectedDate);
    d.setDate(d.getDate() + 1);
    changeSingleDate(formatDateISO(d));
  };

  // --- NAVIGATION PAR SEMAINE ---
  const handlePrevWeek = () => {
    const d = parseDateISO(selectedDate);
    d.setDate(d.getDate() - 7);
    changeSingleDate(formatDateISO(d));
  };
  const handleNextWeek = () => {
    const d = parseDateISO(selectedDate);
    d.setDate(d.getDate() + 7);
    changeSingleDate(formatDateISO(d));
  };

  // --- NAVIGATION PAR MOIS ---
  const handlePrevMonth = () => {
    const d = parseDateISO(selectedDate);
    d.setMonth(d.getMonth() - 1);
    changeSingleDate(formatDateISO(d));
  };
  const handleNextMonth = () => {
    const d = parseDateISO(selectedDate);
    d.setMonth(d.getMonth() + 1);
    changeSingleDate(formatDateISO(d));
  };

  // Réinitialiser sur aujourd'hui (2026-09-29)
  const handleResetToday = () => {
    changeSingleDate('2026-09-29');
    setCustomStartDate('2026-09-01');
    setCustomEndDate('2026-09-30');
  };

  // 1. Calcul de la plage de dates effective [startDateISO, endDateISO] selon periodMode
  const { startDateISO, endDateISO, periodLabel, periodSubLabel } = useMemo(() => {
    const baseDate = parseDateISO(selectedDate);

    if (periodMode === 'jour') {
      return {
        startDateISO: selectedDate,
        endDateISO: selectedDate,
        periodLabel: formatFrenchDate(baseDate, true),
        periodSubLabel: `Activité du ${selectedDate}`,
      };
    }

    if (periodMode === 'semaine') {
      const monday = getMondayOfWeek(baseDate);
      const weekDays = getWeekDays(monday);
      const start = formatDateISO(monday);
      const end = formatDateISO(weekDays[5]); // Samedi
      return {
        startDateISO: start,
        endDateISO: end,
        periodLabel: `Semaine du ${monday.getDate()} ${monday.toLocaleDateString('fr-FR', { month: 'short' })} au ${weekDays[5].getDate()} ${weekDays[5].toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`,
        periodSubLabel: `Du lundi au samedi (6 jours ouvrés)`,
      };
    }

    if (periodMode === 'mois') {
      const year = baseDate.getFullYear();
      const monthIdx = baseDate.getMonth();
      const start = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const end = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const monthName = baseDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return {
        startDateISO: start,
        endDateISO: end,
        periodLabel: `Mois de ${monthName}`,
        periodSubLabel: `Du 1er au ${lastDay} ${monthName}`,
      };
    }

    // Mode "du_au" (Période personnalisée)
    const validStart = customStartDate || '2026-09-01';
    const validEnd = customEndDate || '2026-09-30';
    const sDate = parseDateISO(validStart);
    const eDate = parseDateISO(validEnd);

    return {
      startDateISO: validStart <= validEnd ? validStart : validEnd,
      endDateISO: validStart <= validEnd ? validEnd : validStart,
      periodLabel: `Période du ${sDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${eDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      periodSubLabel: `Plage personnalisée sélectionnée`,
    };
  }, [periodMode, selectedDate, customStartDate, customEndDate]);

  // 2. Filtrer les séances de la période en temps réel
  const periodSessions = useMemo(() => {
    return sessions.filter((s) => s.date >= startDateISO && s.date <= endDateISO);
  }, [sessions, startDateISO, endDateISO]);

  // 3. Résolution de l'orthophoniste
  const resolveOrthoName = (session: Session): string => {
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

  // 4. Statistiques dynamiques par orthophoniste pour la période sélectionnée
  const orthoStatsList: OrthoSummaryMetrics[] = useMemo(() => {
    const orthoNamesSet = new Set<string>(['Maroua', 'Mariem', 'Stagiaire']);
    periodSessions.forEach((s) => {
      orthoNamesSet.add(resolveOrthoName(s));
    });

    const list: OrthoSummaryMetrics[] = [];

    Array.from(orthoNamesSet).forEach((name) => {
      const matchingSessions = periodSessions
        .filter((s) => resolveOrthoName(s).toLowerCase() === name.toLowerCase())
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        });

      const total = matchingSessions.length;
      const realisees = matchingSessions.filter((s) => isEffectuee(s.status)).length;
      const planifiees = matchingSessions.filter((s) => s.status === 'planifiee').length;
      const annulees = matchingSessions.filter((s) => s.status === 'annulee' || s.status === 'absent').length;
      const conventionnes = matchingSessions.filter((s) => s.isConventionne).length;
      const nonConventionnes = total - conventionnes;
      const heuresEffectuees = (realisees * 45) / 60;

      // Honoraires réels validés (séances faites)
      const recetteRealisee = matchingSessions
        .filter((s) => isEffectuee(s.status))
        .reduce((sum, s) => sum + s.tarif, 0);

      // Honoraires prévus / globaux
      const recetteEstimee = matchingSessions
        .filter((s) => s.status !== 'annulee')
        .reduce((sum, s) => sum + s.tarif, 0);

      const defaultMeta = DEFAULT_ORTHOS.find(
        (o) => o.nom.toLowerCase() === name.toLowerCase()
      );

      list.push({
        nom: name,
        role: defaultMeta?.role || 'Orthophoniste / Collaborateur',
        avatarColor: defaultMeta?.avatarColor || 'bg-slate-700 text-white',
        badgeColor: defaultMeta?.badgeColor || 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        borderColor: defaultMeta?.borderColor || 'border-slate-200 dark:border-slate-700',
        progressColor: defaultMeta?.progressColor || 'bg-slate-600',
        total,
        realisees,
        planifiees,
        annulees,
        conventionnes,
        nonConventionnes,
        heuresEffectuees,
        recetteRealisee,
        recetteEstimee,
        sessionsList: matchingSessions,
      });
    });

    return list;
  }, [periodSessions]);

  // Totaux globaux de la période calculés dynamiquement
  const totalPeriodEffectuees = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.realisees, 0);
  }, [orthoStatsList]);

  const totalPeriodPlanifiees = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.planifiees, 0);
  }, [orthoStatsList]);

  const totalPeriodAnnulees = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.annulees, 0);
  }, [orthoStatsList]);

  const totalPeriodGlobal = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.total, 0);
  }, [orthoStatsList]);

  const totalRecetteRealisee = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.recetteRealisee, 0);
  }, [orthoStatsList]);

  const totalRecetteEstimee = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.recetteEstimee, 0);
  }, [orthoStatsList]);

  const totalHeuresPeriod = (totalPeriodEffectuees * 45) / 60;
  const pctRealisation = totalPeriodGlobal > 0 ? Math.round((totalPeriodEffectuees / totalPeriodGlobal) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* En-tête principal & Sélecteur de Période (Jour, Semaine, Mois, Du/Au) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Titre & Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Séances Effectuées par Orthophoniste
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-800 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  {periodMode === 'jour' && 'Journée'}
                  {periodMode === 'semaine' && 'Semaine'}
                  {periodMode === 'mois' && 'Mois'}
                  {periodMode === 'du_au' && 'Période Du/Au'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">
                {periodLabel} <span className="text-slate-400 dark:text-slate-500 font-normal">({periodSubLabel})</span>
              </p>
            </div>
          </div>

          {/* Onglets de sélection du mode de période (Jour | Semaine | Mois | Du/Au) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 self-start lg:self-center gap-1">
            <button
              onClick={() => setPeriodMode('jour')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                periodMode === 'jour'
                  ? 'bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 shadow-2xs border border-slate-200/70 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Jour</span>
            </button>

            <button
              onClick={() => setPeriodMode('semaine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                periodMode === 'semaine'
                  ? 'bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 shadow-2xs border border-slate-200/70 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Semaine</span>
            </button>

            <button
              onClick={() => setPeriodMode('mois')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                periodMode === 'mois'
                  ? 'bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 shadow-2xs border border-slate-200/70 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Mois</span>
            </button>

            <button
              onClick={() => setPeriodMode('du_au')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                periodMode === 'du_au'
                  ? 'bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-200 shadow-2xs border border-slate-200/70 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Du / Au</span>
            </button>

            {/* Export PDF direct pour le récapitulatif de la période */}
            <button
              onClick={() => {
                exportOrthoStats(
                  periodLabel,
                  orthoStatsList,
                  totalPeriodGlobal,
                  totalPeriodEffectuees,
                  totalHeuresPeriod,
                  totalRecetteRealisee,
                  settings
                );
              }}
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-xs font-bold transition shadow-2xs group/pdf"
              title="Exporter le récapitulatif des orthophonistes en PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover/pdf:scale-110 transition-transform" />
              <span>PDF Bilan</span>
            </button>
          </div>
        </div>

        {/* Barre de navigation temporelle contextuelle selon le mode choisi */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          {/* MODE 1 : JOUR */}
          {periodMode === 'jour' && (
            <div className="flex items-center gap-2 flex-wrap w-full justify-between">
              <div className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-0.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Jour précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToday}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Jour suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Choisir la date :</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => changeSingleDate(e.target.value)}
                  className="px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* MODE 2 : SEMAINE */}
          {periodMode === 'semaine' && (
            <div className="flex items-center gap-2 flex-wrap w-full justify-between">
              <div className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-0.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <button
                  onClick={handlePrevWeek}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Semaine précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToday}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Semaine Actuelle
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Semaine suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Semaine du :</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => changeSingleDate(e.target.value)}
                  className="px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* MODE 3 : MOIS */}
          {periodMode === 'mois' && (
            <div className="flex items-center gap-2 flex-wrap w-full justify-between">
              <div className="inline-flex items-center rounded-xl bg-white dark:bg-slate-900 p-0.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetToday}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Mois Actuel
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Mois sélectionné :</span>
                <input
                  type="month"
                  value={selectedDate.substring(0, 7)}
                  onChange={(e) => {
                    if (e.target.value) {
                      changeSingleDate(`${e.target.value}-01`);
                    }
                  }}
                  className="px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* MODE 4 : DU ... AU ... (PÉRIODE PERSONNALISÉE) */}
          {periodMode === 'du_au' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Du :</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:inline" />

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Au :</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Raccourcis rapides de dates */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => {
                    const today = new Date(2026, 8, 29);
                    const monday = getMondayOfWeek(today);
                    const weekDays = getWeekDays(monday);
                    setCustomStartDate(formatDateISO(monday));
                    setCustomEndDate(formatDateISO(weekDays[5]));
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-teal-800 dark:hover:text-teal-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/60 transition"
                >
                  Cette semaine
                </button>
                <button
                  onClick={() => {
                    setCustomStartDate('2026-09-01');
                    setCustomEndDate('2026-09-30');
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-teal-800 dark:hover:text-teal-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/60 transition"
                >
                  Septembre 2026
                </button>
                <button
                  onClick={() => {
                    setCustomStartDate('2026-07-01');
                    setCustomEndDate('2026-09-30');
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-teal-800 dark:hover:text-teal-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/60 transition"
                >
                  Ce trimestre
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4 Indicateurs Clés Réactifs de la Période */}
        <div className="pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* 1. Total Période */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total {periodMode === 'jour' ? 'Journée' : periodMode === 'semaine' ? 'Semaine' : periodMode === 'mois' ? 'Mois' : 'Période'}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">{totalPeriodGlobal}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">séances</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 truncate">
              {startDateISO === endDateISO ? startDateISO : `${startDateISO} → ${endDateISO}`}
            </span>
          </div>

          {/* 2. Effectuées (Réalisées) */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Effectuées (Réalisées)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-950 dark:text-emerald-100">{totalPeriodEffectuees}</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                / {totalPeriodGlobal} ({pctRealisation}%)
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block mt-0.5">
              {totalRecetteRealisee} {settings.devise} d'honoraires encaissés
            </span>
          </div>

          {/* 3. Heures Soins Réalisées */}
          <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80">
            <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Heures Soins Réalisées
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-teal-950 dark:text-teal-100">{totalHeuresPeriod.toFixed(1)} h</span>
              <span className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold">(45 min / séance)</span>
            </div>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium block mt-0.5">
              Temps clinique effectif
            </span>
          </div>

          {/* 4. En attente / Planifiées */}
          <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80">
            <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              En attente / Planifiées
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-black text-indigo-950 dark:text-indigo-100">{totalPeriodPlanifiees}</span>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">à réaliser</span>
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
              Total estimé : {totalRecetteEstimee} {settings.devise}
            </span>
          </div>
        </div>
      </div>

      {/* Cartes par orthophoniste pour la période sélectionnée (Maroua, Mariem, Stagiaire) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {orthoStatsList.map((ortho) => {
          const tauxRealisation = ortho.total > 0 ? Math.round((ortho.realisees / ortho.total) * 100) : 0;
          const isSelected = selectedOrthoDetail === ortho.nom;

          return (
            <div
              key={ortho.nom}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden flex flex-col justify-between ${
                ortho.borderColor
              } hover:shadow-xs`}
            >
              {/* Carte Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/60 dark:to-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs ${ortho.avatarColor}`}
                    >
                      {ortho.nom.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{ortho.nom}</span>
                        {ortho.nom === 'Maroua' && (
                          <span className="text-[10px] font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-1.5 py-0.2 rounded-full border border-teal-200 dark:border-teal-800">
                            Titulaire
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{ortho.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedOrthoDetail(isSelected ? null : ortho.nom)}
                    className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 hover:underline px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    {isSelected ? 'Fermer' : `Détail (${ortho.total})`}
                  </button>
                </div>
              </div>

              {/* Chiffre Clé : Séances Effectuées */}
              <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Séances Effectuées
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                        {ortho.realisees}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        / {ortho.total} ({tauxRealisation}%)
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                      Honoraires estimés
                    </span>
                    <span className="text-base font-black text-emerald-950 dark:text-emerald-100">
                      {ortho.recetteEstimee} {settings.devise}
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                      ({ortho.recetteRealisee} {settings.devise} encaissés)
                    </span>
                  </div>
                </div>

                {/* Jauge de progression de la période */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                    <span>Progression sur la période</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{tauxRealisation}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ortho.progressColor}`}
                      style={{ width: `${Math.min(100, Math.max(ortho.realisees > 0 ? 5 : 0, tauxRealisation))}%` }}
                    />
                  </div>
                </div>

                {/* Détails complémentaires en mini badges */}
                <div className="grid grid-cols-3 gap-1.5 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">Heures</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {ortho.heuresEffectuees.toFixed(1)} h
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-teal-50/80 dark:bg-teal-950/60">
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold block">Prévues</span>
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                      {ortho.planifiees}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/60">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">CNAM</span>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      {ortho.conventionnes}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tiroir déroulant avec la liste des séances du praticien sur la période */}
              {isSelected && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Planning sur la période ({ortho.sessionsList.length} séance{ortho.sessionsList.length > 1 ? 's' : ''})</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">45 min / séance</span>
                  </div>

                  {ortho.sessionsList.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-2">
                      Aucune séance enregistrée sur cette période.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {ortho.sessionsList.map((s) => {
                        const isDone = isEffectuee(s.status);
                        return (
                          <div
                            key={s.id}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2 text-xs hover:border-slate-300 dark:hover:border-slate-600 transition"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {s.date.substring(5)}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded">
                                  {s.startTime}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {s.patientNom}
                                </span>
                              </div>
                              {s.motif && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {s.motif}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  isDone
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : s.status === 'annulee'
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                    : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                                }`}
                              >
                                {isDone ? 'Effectuée' : s.status}
                              </span>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {s.tarif} DT
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
