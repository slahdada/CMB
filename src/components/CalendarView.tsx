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
  Phone
} from 'lucide-react';
import { Session, Patient, SessionStatus } from '../types';
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
  getMonthCalendarGrid 
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

  // Navigate dates
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

  // Filter sessions by insurance type
  const filterByInsurance = (sessionList: Session[]): Session[] => {
    if (filterInsurance === 'conventionne') return sessionList.filter((s) => s.isConventionne);
    if (filterInsurance === 'non_conventionne') return sessionList.filter((s) => !s.isConventionne);
    return sessionList;
  };

  // Status badge styling
  const renderStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'realisee':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Réalisée
          </span>
        );
      case 'annulee':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-2.5 h-2.5" />
            Annulée
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-2.5 h-2.5" />
            Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-2.5 h-2.5" />
            Planifiée
          </span>
        );
    }
  };

  // Orthophoniste badge styling (Maroua, Mariem, Stagiaire)
  const renderOrthoBadge = (orthoNom?: string) => {
    const name = orthoNom || 'Maroua';
    const lower = name.toLowerCase();
    let badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
    if (lower.includes('mariem')) {
      badgeClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
    } else if (lower.includes('stagiaire')) {
      badgeClass = 'bg-amber-100 text-amber-900 border-amber-200';
    }
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded font-bold border ${badgeClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
        <span>{name}</span>
      </span>
    );
  };

  // Quick stats for current week
  const weekSessions = sessions.filter((s) => {
    const sDate = parseDateISO(s.date);
    const start = currentMonday;
    const end = new Date(currentMonday);
    end.setDate(end.getDate() + 5); // Saturday
    return sDate >= start && sDate <= end;
  });

  const weekTotal = weekSessions.length;
  const weekConv = weekSessions.filter((s) => s.isConventionne).length;
  const weekNonConv = weekTotal - weekConv;

  // Slots dynamiques pour la semaine (standards 45 min + tout horaire spécifique de séance)
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

  // Slots dynamiques pour la journée (standards 45 min + créneaux spécifiques de ce jour)
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

  // Données et statistiques pour la vue mensuelle (Planning par mois)
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
  const monthDone = monthSessions.filter((s) => s.status === 'realisee').length;
  const monthTotalRecettes = monthSessions.filter((s) => s.status !== 'annulee').reduce((sum, s) => sum + s.tarif, 0);

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Navigation & Date Display */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/60">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Période précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-teal-700 hover:bg-white rounded-lg transition"
              >
                Aujourd'hui
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Période suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-teal-600 hidden sm:inline" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 capitalize">
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
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:border-teal-300 text-xs font-bold transition shadow-2xs active:scale-95 ml-1"
                title="Passer en vue planning par mois"
              >
                <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
                <span>Planning par mois</span>
              </button>
            )}
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            {/* Conventionné filter */}
            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setFilterInsurance('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterInsurance === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous ({viewMode === 'mois' ? monthTotal : weekTotal})
              </button>
              <button
                onClick={() => setFilterInsurance('conventionne')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  filterInsurance === 'conventionne'
                    ? 'bg-teal-600 text-white font-bold shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Conventionnés ({viewMode === 'mois' ? monthConv : weekConv})</span>
              </button>
              <button
                onClick={() => setFilterInsurance('non_conventionne')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  filterInsurance === 'non_conventionne'
                    ? 'bg-amber-600 text-white font-bold shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Privé ({viewMode === 'mois' ? monthTotal - monthConv : weekNonConv})</span>
              </button>
            </div>

            {/* View Mode Switcher avec bouton Planning par mois */}
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/60 text-xs font-semibold">
              <button
                onClick={() => setViewMode('semaine')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'semaine'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setViewMode('jour')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'jour'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setViewMode('mois')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'mois'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold ring-1 ring-teal-500/20'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Planning par mois"
              >
                <CalendarDays className={`w-3.5 h-3.5 ${viewMode === 'mois' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>Mois</span>
              </button>
              <button
                onClick={() => setViewMode('liste')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'liste'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Liste
              </button>
            </div>
          </div>
        </div>

        {/* 45 min notice & slot reminder */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>Séances calibrées : <strong>45 minutes fixes</strong> (ex: 08h30-09h15, 09h15-10h00, 10h00-10h45...)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-teal-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span> Conventionné CNAM
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Non-conventionné (Privé)
            </span>
          </div>
        </div>
      </div>

      {/* VIEW: SEMAINE (Week Grid) */}
      {viewMode === 'semaine' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header: Days of the week */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                <div className="p-3 text-center text-xs font-semibold text-slate-500 border-r border-slate-200 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Créneau (45 min)
                </div>
                {weekDays.map((day, idx) => {
                  const dayISO = formatDateISO(day);
                  const isToday = dayISO === '2026-09-29';
                  const isSelected = dayISO === selectedDateISO;
                  const daySessions = filterByInsurance(sessions.filter((s) => s.date === dayISO));

                  return (
                    <div
                      key={dayISO}
                      onClick={() => setSelectedDate(day)}
                      className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 cursor-pointer transition ${
                        isToday ? 'bg-teal-50/70' : isSelected ? 'bg-slate-100/70' : 'hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="text-[11px] font-medium uppercase text-slate-500">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span
                          className={`text-sm font-extrabold w-7 h-7 rounded-full flex items-center justify-center ${
                            isToday
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'text-slate-800'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                        {daySessions.length} séance{daySessions.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid: 45 min slots */}
              <div className="divide-y divide-slate-100">
                {activeWeekSlots.map((slot) => (
                  <div key={slot.start} className="grid grid-cols-7 min-h-[78px] group">
                    {/* Time Slot Column */}
                    <div className="p-2 border-r border-slate-200 bg-slate-50/40 flex flex-col justify-center items-center text-center">
                      <span className="text-xs font-bold text-slate-700">{slot.start}</span>
                      <span className="text-[10px] font-medium text-slate-400">→ {slot.end}</span>
                      <span className="text-[9px] uppercase tracking-wider text-teal-700 font-semibold bg-teal-50 px-1 rounded mt-0.5">
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
                          className="p-1.5 border-r border-slate-100 last:border-r-0 relative hover:bg-slate-50/80 transition flex flex-col gap-1 justify-start min-h-[78px]"
                        >
                          {slotSessions.length === 0 ? (
                            <button
                              onClick={() => onOpenSessionModal(undefined, dayISO, slot.start)}
                              className="w-full h-full min-h-[64px] rounded-xl border border-dashed border-transparent hover:border-teal-300 hover:bg-teal-50/40 text-transparent hover:text-teal-700 flex items-center justify-center gap-1 text-[11px] font-medium transition group-hover/slot:opacity-100 opacity-0 focus:opacity-100"
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
                                      ? 'bg-gradient-to-br from-teal-50/90 to-emerald-50/80 border-teal-200 text-teal-950'
                                      : 'bg-gradient-to-br from-amber-50/90 to-orange-50/80 border-amber-200 text-amber-950'
                                  }`}
                                >
                                  {/* Top header of card */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      onClick={() => onOpenPatientDetails(session.patientId)}
                                      className="font-bold truncate hover:underline cursor-pointer text-slate-900"
                                      title={session.patientNom}
                                    >
                                      {session.patientNom}
                                    </span>
                                    {renderStatusBadge(session.status)}
                                  </div>

                                  {/* Ortho badge & Insurance tag */}
                                  <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
                                    {renderOrthoBadge(session.orthophonisteNom)}
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-semibold ${
                                        session.isConventionne
                                          ? 'bg-teal-200/80 text-teal-900'
                                          : 'bg-amber-200/80 text-amber-900'
                                      }`}
                                    >
                                      {session.isConventionne ? 'CNAM' : 'Privé'}
                                    </span>
                                  </div>

                                  {session.motif && (
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                      {session.motif}
                                    </p>
                                  )}

                                  {/* Action bar on hover */}
                                  <div className="mt-1.5 pt-1 border-t border-black/5 flex items-center justify-between gap-1">
                                    <button
                                      onClick={() => onOpenSessionModal(session)}
                                      className="text-[10px] font-semibold text-slate-600 hover:text-teal-700 transition"
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
                                          className="p-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
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
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 capitalize">
                {formatFrenchDate(selectedDate)}
              </h2>
              <p className="text-xs text-slate-500">
                Créneaux de 45 minutes prévus pour cette journée
              </p>
            </div>
            <button
              onClick={() => onOpenSessionModal(undefined, selectedDateISO, '08:30')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700 transition shadow-2xs"
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
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'border-dashed border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Time Badge */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-24 sm:w-28 flex-shrink-0">
                      <div className="text-xs font-extrabold text-slate-800">
                        {slot.start} - {slot.end}
                      </div>
                      <div className="text-[10px] text-teal-700 font-semibold uppercase">
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
                                  ? 'bg-emerald-50/60 border-emerald-200'
                                  : 'bg-amber-50/60 border-amber-200'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => onOpenPatientDetails(session.patientId)}
                                    className="text-sm font-bold text-slate-900 hover:underline flex items-center gap-1"
                                  >
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{session.patientNom}</span>
                                  </button>
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
                                <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                                  <span>Motif : {session.motif || 'Séance de rééducation'}</span>
                                  <span>•</span>
                                  <span className="font-semibold">{session.tarif} DT</span>
                                  {session.notesSeance && (
                                    <>
                                      <span>•</span>
                                      <span className="italic text-slate-500">"{session.notesSeance}"</span>
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Appeler</span>
                                  </a>
                                )}

                                <button
                                  onClick={() => onOpenSessionModal(session)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white transition"
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
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
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
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-xs font-semibold text-slate-600 transition"
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

      {/* VIEW: MOIS (Planning Mensuel) */}
      {viewMode === 'mois' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-6 space-y-4">
          {/* Header & Stats du mois */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shadow-2xs">
                  <CalendarDays className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 capitalize flex items-center gap-2">
                    <span>Planning Mensuel • {selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      Vue Mois
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cabinet d'orthophonie Belgaied Maroua • Vue synthétique de l'activité rééducative
                  </p>
                </div>
              </div>
            </div>

            {/* Quick summary chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {monthTotal} séance{monthTotal > 1 ? 's' : ''} ce mois
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold border border-teal-200">
                {monthConv} CNAM
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200">
                {monthTotal - monthConv} Privé
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200">
                {monthDone} faite{monthDone > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onOpenSessionModal(undefined, selectedDateISO, '08:30')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-bold shadow-2xs active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Séance</span>
              </button>
            </div>
          </div>

          {/* Grille du calendrier mensuel */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* En-tête des jours de la semaine (Lundi -> Dimanche) */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d, i) => (
                  <div
                    key={d}
                    className={`py-1.5 rounded-xl ${
                      i >= 5 ? 'bg-slate-50 text-slate-400' : 'bg-slate-100/70 text-slate-700'
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

                  return (
                    <div
                      key={day.dateISO}
                      className={`min-h-[115px] sm:min-h-[135px] p-2 rounded-2xl border flex flex-col justify-between transition-all group ${
                        day.isCurrentMonth
                          ? isSelected
                            ? 'bg-teal-50/70 border-teal-500 shadow-xs ring-1 ring-teal-500'
                            : 'bg-white border-slate-200/90 hover:border-teal-300 hover:shadow-xs'
                          : 'bg-slate-50/60 border-slate-100 opacity-60'
                      }`}
                    >
                      {/* Haut de la case : Numéro du jour & Badges */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                              day.isToday
                                ? 'bg-teal-600 text-white shadow-2xs ring-2 ring-teal-200'
                                : day.isCurrentMonth
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {day.dayNumber}
                          </span>

                          <div className="flex items-center gap-1">
                            {daySessions.length > 0 && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {daySessions.length}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenSessionModal(undefined, day.dateISO, '08:30');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition"
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

                            return (
                              <button
                                key={s.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenSessionModal(s);
                                }}
                                className={`w-full text-left text-[10px] font-medium p-1 rounded-lg border flex items-center justify-between gap-1 transition truncate ${
                                  s.isConventionne
                                    ? 'bg-teal-50/80 border-teal-200/70 text-teal-950 hover:bg-teal-100'
                                    : 'bg-amber-50/80 border-amber-200/70 text-amber-950 hover:bg-amber-100'
                                }`}
                                title={`${s.startTime}-${s.endTime} : ${s.patientNom} (${s.orthophonisteNom || 'Maroua'})`}
                              >
                                <div className="flex items-center gap-1 min-w-0 truncate">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}></span>
                                  <span className="font-bold flex-shrink-0">{s.startTime}</span>
                                  <span className="truncate">{s.patientNom}</span>
                                </div>
                              </button>
                            );
                          })}

                          {daySessions.length > 3 && (
                            <button
                              onClick={() => {
                                updateSelectedDate(day.date);
                                setViewMode('jour');
                              }}
                              className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-teal-700 hover:underline pt-0.5"
                            >
                              +{daySessions.length - 3} autre{daySessions.length - 3 > 1 ? 's' : ''}...
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bas de case : bouton pour basculer sur la journée */}
                      <div className="pt-1 mt-1 border-t border-slate-100/80 flex items-center justify-between">
                        <button
                          onClick={() => {
                            updateSelectedDate(day.date);
                            setViewMode('jour');
                          }}
                          className="text-[10px] font-semibold text-slate-400 hover:text-teal-700 hover:underline transition"
                        >
                          Voir jour
                        </button>
                        {daySessions.some((s) => s.status === 'realisee') && (
                          <span title="Séance(s) réalisée(s)">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
      )}

      {/* VIEW: LISTE (Agenda View) */}
      {viewMode === 'liste' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">
              Toutes les séances enregistrées (45 min)
            </h2>
            <span className="text-xs text-slate-500">
              Total filtré : {filterByInsurance(sessions).length} séances
            </span>
          </div>

          <div className="divide-y divide-slate-100">
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
                <div key={session.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 rounded-xl px-2 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex flex-col items-center justify-center border border-teal-200/60 font-mono flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase">
                        {parseDateISO(session.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-black">
                        {parseDateISO(session.date).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenPatientDetails(session.patientId)}
                          className="font-bold text-slate-900 text-sm hover:underline"
                        >
                          {session.patientNom}
                        </button>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            session.isConventionne
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {session.isConventionne ? 'CNAM' : 'Privé'}
                        </span>
                        {renderStatusBadge(session.status)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold text-slate-700">
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
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-white text-slate-700 transition"
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
