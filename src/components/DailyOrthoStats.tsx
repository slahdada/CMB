import React, { useState, useMemo } from 'react';
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
  FileCheck
} from 'lucide-react';
import { Session, CabinetSettings } from '../types';
import { formatDateISO, parseDateISO, formatFrenchDate } from '../utils/dateUtils';

interface DailyOrthoStatsProps {
  sessions: Session[];
  settings: CabinetSettings;
  initialDate?: string;
}

interface OrthoDaySummary {
  nom: string;
  role: string;
  avatarColor: string;
  badgeColor: string;
  borderColor: string;
  progressColor: string;
  total: number;
  realisees: number; // Séances effectuées
  planifiees: number;
  annulees: number;
  conventionnes: number;
  nonConventionnes: number;
  heuresEffectuees: number;
  recetteTotale: number;
  sessionsList: Session[];
}

const DEFAULT_ORTHOS = [
  {
    nom: 'Maroua',
    role: 'Orthophoniste Titulaire',
    avatarColor: 'bg-teal-600 text-white',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    borderColor: 'border-teal-200/90',
    progressColor: 'bg-teal-500',
  },
  {
    nom: 'Mariem',
    role: 'Collaboratrice',
    avatarColor: 'bg-indigo-600 text-white',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    borderColor: 'border-indigo-200/90',
    progressColor: 'bg-indigo-500',
  },
  {
    nom: 'Stagiaire',
    role: 'Stagiaire en cabinet',
    avatarColor: 'bg-amber-600 text-white',
    badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
    borderColor: 'border-amber-200/90',
    progressColor: 'bg-amber-500',
  },
];

export const DailyOrthoStats: React.FC<DailyOrthoStatsProps> = ({
  sessions,
  settings,
  initialDate = '2026-09-29',
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedOrthoDetail, setSelectedOrthoDetail] = useState<string | null>(null);

  // Navigation par jour
  const handlePrevDay = () => {
    const d = parseDateISO(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateISO(d));
  };

  const handleNextDay = () => {
    const d = parseDateISO(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateISO(d));
  };

  const handleToday = () => {
    setSelectedDate('2026-09-29');
  };

  // 1. Filtrer les séances de la journée sélectionnée
  const daySessions = useMemo(() => {
    return sessions.filter((s) => s.date === selectedDate);
  }, [sessions, selectedDate]);

  // 2. Normalisation du praticien pour chaque séance
  const resolveOrthoName = (session: Session): string => {
    const explicit = (session.orthophonisteNom || '').trim();
    if (explicit) {
      const lower = explicit.toLowerCase();
      if (lower.includes('maroua')) return 'Maroua';
      if (lower.includes('mariem')) return 'Mariem';
      if (lower.includes('stagiaire')) return 'Stagiaire';
      return explicit;
    }
    // Fallback selon position
    if (session.position === 2) return 'Mariem';
    if (session.position === 3) return 'Stagiaire';
    return 'Maroua';
  };

  // 3. Calculer les statistiques par orthophoniste pour la journée
  const orthoStatsList: OrthoDaySummary[] = useMemo(() => {
    // Identifier tous les praticiens présents (au moins les 3 par défaut + tout intervenant personnalisé)
    const orthoNamesSet = new Set<string>(['Maroua', 'Mariem', 'Stagiaire']);
    daySessions.forEach((s) => {
      orthoNamesSet.add(resolveOrthoName(s));
    });

    const list: OrthoDaySummary[] = [];

    Array.from(orthoNamesSet).forEach((name) => {
      const matchingSessions = daySessions
        .filter((s) => resolveOrthoName(s).toLowerCase() === name.toLowerCase())
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const total = matchingSessions.length;
      // Séances effectuées = statut "realisee"
      const realisees = matchingSessions.filter((s) => s.status === 'realisee').length;
      const planifiees = matchingSessions.filter((s) => s.status === 'planifiee').length;
      const annulees = matchingSessions.filter((s) => s.status === 'annulee' || s.status === 'absent').length;
      const conventionnes = matchingSessions.filter((s) => s.isConventionne).length;
      const nonConventionnes = total - conventionnes;
      const heuresEffectuees = (realisees * 45) / 60;
      const recetteTotale = matchingSessions
        .filter((s) => s.status !== 'annulee')
        .reduce((sum, s) => sum + s.tarif, 0);

      const defaultMeta = DEFAULT_ORTHOS.find(
        (o) => o.nom.toLowerCase() === name.toLowerCase()
      );

      list.push({
        nom: name,
        role: defaultMeta?.role || 'Orthophoniste / Intervenant',
        avatarColor: defaultMeta?.avatarColor || 'bg-slate-700 text-white',
        badgeColor: defaultMeta?.badgeColor || 'bg-slate-50 text-slate-800 border-slate-200',
        borderColor: defaultMeta?.borderColor || 'border-slate-200',
        progressColor: defaultMeta?.progressColor || 'bg-slate-600',
        total,
        realisees,
        planifiees,
        annulees,
        conventionnes,
        nonConventionnes,
        heuresEffectuees,
        recetteTotale,
        sessionsList: matchingSessions,
      });
    });

    return list;
  }, [daySessions]);

  // Totaux globaux de la journée
  const totalDayEffectuees = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.realisees, 0);
  }, [orthoStatsList]);

  const totalDayPlanifiees = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.planifiees, 0);
  }, [orthoStatsList]);

  const totalDayGlobal = useMemo(() => {
    return orthoStatsList.reduce((acc, o) => acc + o.total, 0);
  }, [orthoStatsList]);

  const totalHeuresDay = (totalDayEffectuees * 45) / 60;

  const formattedDayTitle = formatFrenchDate(parseDateISO(selectedDate), true);

  return (
    <div className="space-y-4">
      {/* En-tête de section & Sélecteur de jour */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Séances Effectuées par Orthophoniste (Journée)
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Temps réel
                </span>
              </div>
              <p className="text-xs text-slate-500 capitalize">
                {formattedDayTitle}
              </p>
            </div>
          </div>

          {/* Sélecteur de date & Navigation quotidienne */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/70 shadow-2xs">
              <button
                onClick={handlePrevDay}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Jour précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-teal-700 hover:bg-white rounded-lg transition"
              >
                Aujourd'hui
              </button>
              <button
                onClick={handleNextDay}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                title="Jour suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
          </div>
        </div>

        {/* Mini résumé KPI de la journée */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Journée
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">{totalDayGlobal}</span>
              <span className="text-[11px] text-slate-500">séances</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/70">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Effectuées (Réalisées)
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-950">{totalDayEffectuees}</span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                / {totalDayGlobal} ({totalDayGlobal > 0 ? Math.round((totalDayEffectuees / totalDayGlobal) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200/70">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block flex items-center gap-1">
              <Clock className="w-3 h-3 text-teal-600" />
              Heures Soins Réalisées
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-teal-950">{totalHeuresDay.toFixed(1)}h</span>
              <span className="text-[11px] text-teal-700 font-semibold">(séances de 45 min)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200/70">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-600" />
              En attente / Planifiées
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-indigo-950">{totalDayPlanifiees}</span>
              <span className="text-[11px] text-indigo-700 font-semibold">à réaliser</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cartes par orthophoniste pour la journée */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {orthoStatsList.map((ortho) => {
          const tauxRealisation = ortho.total > 0 ? Math.round((ortho.realisees / ortho.total) * 100) : 0;
          const isSelected = selectedOrthoDetail === ortho.nom;

          return (
            <div
              key={ortho.nom}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden flex flex-col justify-between ${
                ortho.borderColor
              } hover:shadow-xs`}
            >
              {/* Carte Header */}
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs ${ortho.avatarColor}`}
                    >
                      {ortho.nom.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <span>{ortho.nom}</span>
                        {ortho.nom === 'Maroua' && (
                          <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded-full border border-teal-200">
                            Titulaire
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500">{ortho.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedOrthoDetail(isSelected ? null : ortho.nom)}
                    className="text-[11px] font-bold text-slate-600 hover:text-teal-700 hover:underline px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    {isSelected ? 'Fermer' : 'Détail'}
                  </button>
                </div>
              </div>

              {/* Chiffre Clé : Séances Effectuées */}
              <div className="p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Séances Effectuées
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black text-slate-900">
                        {ortho.realisees}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        / {ortho.total} totale{ortho.total > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black border ${ortho.badgeColor}`}
                  >
                    {tauxRealisation}%
                  </span>
                </div>

                {/* Barre de progression des séances réalisées */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${ortho.progressColor}`}
                    style={{ width: `${tauxRealisation}%` }}
                  ></div>
                </div>

                {/* Détails complémentaires */}
                <div className="pt-2 grid grid-cols-2 gap-2 text-xs border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="truncate">
                      <strong>{ortho.heuresEffectuees.toFixed(1)}h</strong> effectuées
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">
                      <strong>{ortho.conventionnes}</strong> CNAM • {ortho.nonConventionnes} Privé
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                    <Coins className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>
                      Honoraires estimés : <strong>{ortho.recetteTotale} {settings.devise}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Liste dépliable des séances du jour pour cet orthophoniste */}
              {isSelected && (
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                  <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Séances du {selectedDate} :</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {ortho.sessionsList.length} patient{ortho.sessionsList.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {ortho.sessionsList.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      Aucune séance attribuée pour ce jour.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {ortho.sessionsList.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-1.5 p-2 rounded-lg bg-white border border-slate-200/70 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-slate-700 text-[11px] bg-slate-100 px-1 rounded">
                              {s.startTime}
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {s.patientNom}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span
                              className={`text-[9px] px-1 rounded font-bold ${
                                s.isConventionne
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.isConventionne ? 'CNAM' : 'Privé'}
                            </span>

                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                s.status === 'realisee'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'planifiee'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {s.status === 'realisee'
                                ? 'Effectuée'
                                : s.status === 'planifiee'
                                ? 'Planifiée'
                                : 'Annulée'}
                            </span>
                          </div>
                        </div>
                      ))}
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
