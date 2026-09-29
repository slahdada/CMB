import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Coins, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  PieChart as PieChartIcon
} from 'lucide-react';
import { Session, Patient, CabinetSettings } from '../types';
import { 
  parseDateISO, 
  formatDateISO, 
  getMondayOfWeek, 
  getWeekDays, 
  formatFrenchDate 
} from '../utils/dateUtils';
import { DailyOrthoStats } from './DailyOrthoStats';

interface DashboardViewProps {
  sessions: Session[];
  patients: Patient[];
  settings: CabinetSettings;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sessions,
  patients,
  settings,
}) => {
  // Reference date: default 2026-09-29
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 29));
  
  // Navigation for week
  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  // Navigation for month
  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  // Week calculation
  const monday = getMondayOfWeek(currentDate);
  const weekDays = getWeekDays(monday);
  const weekStartISO = formatDateISO(monday);
  const weekEndISO = formatDateISO(weekDays[5]); // Samedi

  const weekSessions = useMemo(() => {
    return sessions.filter((s) => s.date >= weekStartISO && s.date <= weekEndISO);
  }, [sessions, weekStartISO, weekEndISO]);

  const weekStats = useMemo(() => {
    const total = weekSessions.length;
    const conventionnes = weekSessions.filter((s) => s.isConventionne).length;
    const nonConventionnes = total - conventionnes;
    const realisees = weekSessions.filter((s) => s.status === 'realisee').length;
    const planifiees = weekSessions.filter((s) => s.status === 'planifiee').length;
    const annulees = weekSessions.filter((s) => s.status === 'annulee' || s.status === 'absent').length;

    // Recettes
    const recetteConventionnee = weekSessions
      .filter((s) => s.isConventionne && s.status !== 'annulee')
      .reduce((sum, s) => sum + s.tarif, 0);

    const recetteNonConventionnee = weekSessions
      .filter((s) => !s.isConventionne && s.status !== 'annulee')
      .reduce((sum, s) => sum + s.tarif, 0);

    const recetteTotale = recetteConventionnee + recetteNonConventionnee;
    const totalHeures = (total * 45) / 60;

    return {
      total,
      conventionnes,
      nonConventionnes,
      convPercent: total > 0 ? Math.round((conventionnes / total) * 100) : 0,
      nonConvPercent: total > 0 ? Math.round((nonConventionnes / total) * 100) : 0,
      realisees,
      planifiees,
      annulees,
      tauxAssiduite: (realisees + planifiees) > 0 ? Math.round((realisees / (realisees + annulees || 1)) * 100) : 100,
      recetteTotale,
      recetteConventionnee,
      recetteNonConventionnee,
      totalHeures,
    };
  }, [weekSessions]);

  // Month calculation
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();
  const monthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const monthSessions = useMemo(() => {
    return sessions.filter((s) => s.date.startsWith(monthKey));
  }, [sessions, monthKey]);

  const monthStats = useMemo(() => {
    const total = monthSessions.length;
    const conventionnes = monthSessions.filter((s) => s.isConventionne).length;
    const nonConventionnes = total - conventionnes;
    const realisees = monthSessions.filter((s) => s.status === 'realisee').length;
    const planifiees = monthSessions.filter((s) => s.status === 'planifiee').length;
    const annulees = monthSessions.filter((s) => s.status === 'annulee' || s.status === 'absent').length;

    const recetteConventionnee = monthSessions
      .filter((s) => s.isConventionne && s.status !== 'annulee')
      .reduce((sum, s) => sum + s.tarif, 0);

    const recetteNonConventionnee = monthSessions
      .filter((s) => !s.isConventionne && s.status !== 'annulee')
      .reduce((sum, s) => sum + s.tarif, 0);

    const recetteTotale = recetteConventionnee + recetteNonConventionnee;
    const totalHeures = (total * 45) / 60;

    return {
      total,
      conventionnes,
      nonConventionnes,
      convPercent: total > 0 ? Math.round((conventionnes / total) * 100) : 0,
      nonConvPercent: total > 0 ? Math.round((nonConventionnes / total) * 100) : 0,
      realisees,
      planifiees,
      annulees,
      tauxRealisation: total > 0 ? Math.round((realisees / total) * 100) : 0,
      recetteTotale,
      recetteConventionnee,
      recetteNonConventionnee,
      totalHeures,
    };
  }, [monthSessions]);

  // Breakdown per day for week chart
  const weekDaysData = useMemo(() => {
    return weekDays.map((day) => {
      const dayISO = formatDateISO(day);
      const daySessions = sessions.filter((s) => s.date === dayISO);
      const conv = daySessions.filter((s) => s.isConventionne).length;
      const nonConv = daySessions.length - conv;
      return {
        dayName: day.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayDate: day.getDate(),
        dayISO,
        total: daySessions.length,
        conv,
        nonConv,
      };
    });
  }, [weekDays, sessions]);

  // Breakdown per week for month chart
  const monthWeeksData = useMemo(() => {
    const weeks: { label: string; conv: number; nonConv: number; total: number }[] = [
      { label: 'Semaine 1 (1-7)', conv: 0, nonConv: 0, total: 0 },
      { label: 'Semaine 2 (8-14)', conv: 0, nonConv: 0, total: 0 },
      { label: 'Semaine 3 (15-21)', conv: 0, nonConv: 0, total: 0 },
      { label: 'Semaine 4 (22-28)', conv: 0, nonConv: 0, total: 0 },
      { label: 'Semaine 5 (29-31)', conv: 0, nonConv: 0, total: 0 },
    ];

    monthSessions.forEach((s) => {
      const dayNum = parseInt(s.date.split('-')[2], 10);
      let idx = 0;
      if (dayNum <= 7) idx = 0;
      else if (dayNum <= 14) idx = 1;
      else if (dayNum <= 21) idx = 2;
      else if (dayNum <= 28) idx = 3;
      else idx = 4;

      weeks[idx].total += 1;
      if (s.isConventionne) weeks[idx].conv += 1;
      else weeks[idx].nonConv += 1;
    });

    return weeks;
  }, [monthSessions]);

  // Max value for scaling week chart
  const maxDayTotal = Math.max(...weekDaysData.map((d) => d.total), 6);
  const maxWeekTotal = Math.max(...monthWeeksData.map((w) => w.total), 8);

  return (
    <div className="space-y-6">
      {/* Header of Dashboard */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-teal-500/10 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Calcul automatique & Répartition CNAM</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Tableau de Bord des Séances d'Orthophonie
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 mt-1 max-w-2xl">
              Analyse automatisée en temps réel du volume de séances (durée fixe 45 min) par semaine et par mois, avec dissociation stricte des patients conventionnés vs privés.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(2026, 8, 29))}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur transition"
            >
              Semaine & Mois Actuel
            </button>
          </div>
        </div>
      </div>

      {/* SECTION : ACTIVITÉ DU JOUR PAR ORTHOPHONISTE */}
      <DailyOrthoStats 
        sessions={sessions} 
        settings={settings} 
        initialDate={formatDateISO(currentDate)} 
      />

      {/* SECTION 1: STATS PAR SEMAINE (AUTOMATIQUE) */}
      <div className="space-y-4">
        {/* Section title & Week Navigator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Statistiques de la Semaine
              </h3>
              <p className="text-xs text-slate-500">
                Du {formatFrenchDate(monday, false)} au {formatFrenchDate(weekDays[5])}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 font-mono px-2">
              Semaine du {monday.getDate()} {monday.toLocaleDateString('fr-FR', { month: 'short' })}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Weekly KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Séances Semaine */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Séances Semaine
              </span>
              <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                45m
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{weekStats.total}</span>
              <span className="text-xs font-semibold text-slate-500">séances</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>{weekStats.totalHeures.toFixed(1)} heures de soins</span>
            </div>
          </div>

          {/* Conventionnés CNAM Semaine */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50/70 p-4 rounded-2xl border border-teal-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Conventionnés CNAM
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-600 text-white">
                {weekStats.convPercent}%
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-teal-950">{weekStats.conventionnes}</span>
              <span className="text-xs font-semibold text-teal-700">séances</span>
            </div>
            <div className="mt-2 text-[11px] text-teal-800 font-medium flex items-center justify-between">
              <span>Recette estimée :</span>
              <span className="font-bold">{weekStats.recetteConventionnee} {settings.devise}</span>
            </div>
          </div>

          {/* Non-conventionnés (Privé) Semaine */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Non-Conventionnés
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-600 text-white">
                {weekStats.nonConvPercent}%
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-950">{weekStats.nonConventionnes}</span>
              <span className="text-xs font-semibold text-amber-700">séances</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-800 font-medium flex items-center justify-between">
              <span>Recette estimée :</span>
              <span className="font-bold">{weekStats.recetteNonConventionnee} {settings.devise}</span>
            </div>
          </div>

          {/* Statut & Recette Totale */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recette Hebdomadaire
              </span>
              <Coins className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-emerald-800">{weekStats.recetteTotale}</span>
              <span className="text-xs font-bold text-emerald-600">{settings.devise}</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Réalisées : <strong className="text-emerald-700">{weekStats.realisees}</strong></span>
              <span>Prévues : <strong className="text-sky-700">{weekStats.planifiees}</strong></span>
              {weekStats.annulees > 0 && <span>Annulées : <strong className="text-rose-600">{weekStats.annulees}</strong></span>}
            </div>
          </div>
        </div>

        {/* Weekly Day-by-Day Graph (Conventionnés vs Non-Conventionnés) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Répartition Quotidienne des Séances (Lundi au Samedi)
              </h4>
              <p className="text-xs text-slate-500">
                Comparatif visuel jour par jour : Conventionnés CNAM vs Non-conventionnés (45 min)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-teal-800">
                <span className="w-3 h-3 rounded bg-teal-600 inline-block"></span>
                Conventionné CNAM
              </span>
              <span className="flex items-center gap-1.5 text-amber-800">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
                Non-conventionné
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="mt-6 grid grid-cols-6 gap-2 sm:gap-4 items-end h-52 pt-6">
            {weekDaysData.map((d) => {
              const convHeight = maxDayTotal > 0 ? (d.conv / maxDayTotal) * 100 : 0;
              const nonConvHeight = maxDayTotal > 0 ? (d.nonConv / maxDayTotal) * 100 : 0;

              return (
                <div key={d.dayISO} className="flex flex-col items-center h-full justify-end group">
                  {/* Total counter tooltip / bubble */}
                  <span className="text-[11px] font-black text-slate-700 mb-1">
                    {d.total}
                  </span>

                  {/* Stacked bar */}
                  <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl overflow-hidden flex flex-col-reverse justify-start transition-all group-hover:opacity-90 shadow-2xs h-40">
                    {/* Conventionné bar (teal) */}
                    <div
                      style={{ height: `${convHeight}%` }}
                      className="w-full bg-teal-600 transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                      title={`${d.conv} séances conventionnées`}
                    >
                      {d.conv > 0 && d.conv}
                    </div>

                    {/* Non-conventionné bar (amber) */}
                    <div
                      style={{ height: `${nonConvHeight}%` }}
                      className="w-full bg-amber-500 transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                      title={`${d.nonConv} séances non-conventionnées`}
                    >
                      {d.nonConv > 0 && d.nonConv}
                    </div>
                  </div>

                  {/* Day label */}
                  <div className="mt-2 text-center">
                    <div className="text-xs font-bold text-slate-800 capitalize">{d.dayName}</div>
                    <div className="text-[10px] text-slate-400">{d.dayDate}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: STATS PAR MOIS (AUTOMATIQUE) */}
      <div className="space-y-4 pt-2">
        {/* Section title & Month Navigator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 capitalize">
                Statistiques du Mois : {monthName}
              </h3>
              <p className="text-xs text-slate-500">
                Cumul mensuel complet avec ventilation Conventionné CNAM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 capitalize px-2">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Monthly KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Séances Mois */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Séances du Mois
              </span>
              <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                Mois
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{monthStats.total}</span>
              <span className="text-xs font-semibold text-slate-500">séances</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>{monthStats.totalHeures.toFixed(1)} heures dispensées</span>
            </div>
          </div>

          {/* Conventionnés CNAM Mois */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50/70 p-4 rounded-2xl border border-teal-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Conventionnés CNAM
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-600 text-white">
                {monthStats.convPercent}%
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-teal-950">{monthStats.conventionnes}</span>
              <span className="text-xs font-semibold text-teal-700">séances</span>
            </div>
            <div className="mt-2 text-[11px] text-teal-800 font-medium flex items-center justify-between">
              <span>Recette conventionnée :</span>
              <span className="font-bold">{monthStats.recetteConventionnee} {settings.devise}</span>
            </div>
          </div>

          {/* Non-conventionnés Mois */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Non-Conventionnés
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-600 text-white">
                {monthStats.nonConvPercent}%
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-950">{monthStats.nonConventionnes}</span>
              <span className="text-xs font-semibold text-amber-700">séances</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-800 font-medium flex items-center justify-between">
              <span>Recette privé :</span>
              <span className="font-bold">{monthStats.recetteNonConventionnee} {settings.devise}</span>
            </div>
          </div>

          {/* Recette Totale Mensuelle */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recette Mensuelle
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-emerald-800">{monthStats.recetteTotale}</span>
              <span className="text-xs font-bold text-emerald-600">{settings.devise}</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Séances effectuées : <strong className="text-emerald-700">{monthStats.realisees}</strong></span>
              <span>Taux : <strong className="text-teal-700">{monthStats.tauxRealisation}%</strong></span>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown Weeks Chart + Donut Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Weeks Evolution (2 cols) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Progression Hebdomadaire du Mois ({monthName})
                </h4>
                <p className="text-xs text-slate-500">
                  Évolution des volumes de séances par tranche de 7 jours
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {monthWeeksData.map((w, idx) => {
                const totalPct = monthStats.total > 0 ? (w.total / monthStats.total) * 100 : 0;
                const convWidth = w.total > 0 ? (w.conv / w.total) * 100 : 0;

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{w.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-teal-700 font-semibold">{w.conv} conv.</span>
                        <span className="text-amber-700 font-semibold">{w.nonConv} privé</span>
                        <span className="font-extrabold text-slate-900">{w.total} séances</span>
                      </div>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${convWidth}%` }}
                        className="h-full bg-teal-600 transition-all duration-500"
                        title={`${w.conv} conventionnés`}
                      ></div>
                      <div
                        style={{ width: `${100 - convWidth}%` }}
                        className="h-full bg-amber-500 transition-all duration-500"
                        title={`${w.nonConv} non-conventionnés`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Donut / Proportion Card (1 col) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900">
                  Part Conventionnée Mensuelle
                </h4>
                <PieChartIcon className="w-4 h-4 text-teal-600" />
              </div>

              {/* Visual SVG Donut */}
              <div className="mt-4 flex flex-col items-center justify-center">
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background Circle */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke="#fef3c7"
                      strokeWidth="3.5"
                    />
                    {/* Conventionné stroke */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.91549430918954"
                      fill="transparent"
                      stroke="#0d9488"
                      strokeWidth="3.5"
                      strokeDasharray={`${monthStats.convPercent} ${100 - monthStats.convPercent}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900">
                      {monthStats.convPercent}%
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 uppercase">
                      CNAM
                    </span>
                  </div>
                </div>

                <div className="mt-5 w-full space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-teal-50 border border-teal-100">
                    <span className="flex items-center gap-1.5 font-semibold text-teal-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                      Conventionnés CNAM
                    </span>
                    <span className="font-extrabold text-teal-950">
                      {monthStats.conventionnes} ({monthStats.convPercent}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Non-conventionnés
                    </span>
                    <span className="font-extrabold text-amber-950">
                      {monthStats.nonConventionnes} ({monthStats.nonConvPercent}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-slate-400 text-center italic">
              Données mises à jour automatiquement à chaque séance planifiée ou réalisée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
