import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Coins, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  UserCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  MessageSquare, 
  FileText, 
  ArrowUpDown, 
  RotateCcw, 
  WalletCards, 
  User, 
  TrendingUp, 
  Download,
  ChevronDown,
  X,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { Session, Patient, CabinetSettings, PatientCreanceSummary, PaymentStatus } from '../types';
import { isEffectuee } from '../context/SessionsContext';
import { usePDFExporter } from '../hooks/usePDFExporter';
import { cleanWhatsAppNumber, formatDateISO, formatFrenchDate, parseDateISO } from '../utils/dateUtils';
import { PaymentModal } from './PaymentModal';

interface PatientCreancesViewProps {
  sessions: Session[];
  patients: Patient[];
  settings: CabinetSettings;
  onOpenPatientDetails: (patientId: string) => void;
  onRecordPayment: (
    patientId: string, 
    amount: number, 
    modePaiement: 'especes' | 'cheque' | 'virement' | 'cnam' | 'autre', 
    datePaiement: string, 
    notePaiement: string
  ) => void;
}

export const PatientCreancesView: React.FC<PatientCreancesViewProps> = ({
  sessions,
  patients,
  settings,
  onOpenPatientDetails,
  onRecordPayment,
}) => {
  const { exportCreancesReport, exportPatient } = usePDFExporter();

  // 1. ÉTATS DE FILTRAGE
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrtho, setSelectedOrtho] = useState<string>('all');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<'all' | 'en_attente' | 'partiel' | 'paye' | 'impaye'>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<'all' | 'conventionne' | 'non_conventionne'>('all');
  const [sortBy, setSortBy] = useState<'reste' | 'nom' | 'seances' | 'total'>('reste');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // Par défaut les plus grosses créances en premier

  // État du tiroir mobile (Bottom Sheet)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);

  // État du modal d'encaissement
  const [paymentModalCreance, setPaymentModalCreance] = useState<PatientCreanceSummary | null>(null);

  // Liste des orthophonistes présents dans les séances
  const orthophonistesList = useMemo(() => {
    const set = new Set<string>(['Maroua', 'Mariem', 'Stagiaire']);
    sessions.forEach((s) => {
      if (s.orthophonisteNom && s.orthophonisteNom.trim()) {
        set.add(s.orthophonisteNom.trim());
      }
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Raccourcis de dates avec taille tactile
  const handleSetPeriod = (type: 'this_month' | 'last_month' | 'this_week' | 'all') => {
    const today = new Date();
    if (type === 'all') {
      setDateDebut('');
      setDateFin('');
      return;
    }
    if (type === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDateDebut(formatDateISO(start));
      setDateFin(formatDateISO(end));
      return;
    }
    if (type === 'last_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setDateDebut(formatDateISO(start));
      setDateFin(formatDateISO(end));
      return;
    }
    if (type === 'this_week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(today.setDate(diff));
      const end = new Date(start);
      end.setDate(end.getDate() + 5);
      setDateDebut(formatDateISO(start));
      setDateFin(formatDateISO(end));
      return;
    }
  };

  const handleResetFilters = () => {
    setSelectedPatientId('all');
    setSearchQuery('');
    setSelectedOrtho('all');
    setDateDebut('');
    setDateFin('');
    setStatutFilter('all');
    setInsuranceFilter('all');
    setSortBy('reste');
    setSortAsc(false);
  };

  // Compteur des filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedPatientId !== 'all') count++;
    if (selectedOrtho !== 'all') count++;
    if (statutFilter !== 'all') count++;
    if (insuranceFilter !== 'all') count++;
    if (dateDebut || dateFin) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedPatientId, selectedOrtho, statutFilter, insuranceFilter, dateDebut, dateFin, searchQuery]);

  // 2. CALCUL EN TEMPS RÉEL DES CRÉANCES PAR PATIENT
  const allPatientCreances: PatientCreanceSummary[] = useMemo(() => {
    return patients.map((patient) => {
      // Filtrer les séances de ce patient selon la période sélectionnée (si définie)
      const patientSessions = sessions.filter((s) => {
        const matchPatient = s.patientId === patient.id || s.patientNom.trim().toLowerCase() === patient.nom.trim().toLowerCase();
        if (!matchPatient) return false;
        if (dateDebut && s.date < dateDebut) return false;
        if (dateFin && s.date > dateFin) return false;
        return true;
      });

      // Orthophonistes ayant suivi ce patient
      const orthosSet = new Set<string>();
      patientSessions.forEach((s) => {
        const name = (s.orthophonisteNom || 'Maroua').trim();
        orthosSet.add(name);
      });
      const orthosList = Array.from(orthosSet);

      const totalSeances = patientSessions.length;
      const seancesRealisees = patientSessions.filter((s) => isEffectuee(s.status)).length;
      const seancesPlanifiees = patientSessions.filter((s) => s.status === 'planifiee').length;
      const seancesAnnulees = patientSessions.filter((s) => s.status === 'annulee').length;

      // Montant dû pour les séances réalisées (ou non annulées)
      const montantTotalDu = patientSessions
        .filter((s) => isEffectuee(s.status))
        .reduce((sum, s) => sum + (s.tarif || (patient.isConventionne ? settings.tarifConventionne : settings.tarifNonConventionne)), 0);

      // Montant payé
      const montantPaye = patientSessions
        .filter((s) => isEffectuee(s.status))
        .reduce((sum, s) => {
          if (s.montantPaye !== undefined) return sum + s.montantPaye;
          if (s.isPaye) return sum + s.tarif;
          return sum;
        }, 0);

      const resteARecouvrer = Math.max(0, montantTotalDu - montantPaye);

      let statutCreance: PaymentStatus = 'en_attente';
      if (montantTotalDu > 0) {
        if (resteARecouvrer === 0) {
          statutCreance = 'paye';
        } else if (montantPaye > 0) {
          statutCreance = 'partiel';
        } else {
          statutCreance = 'en_attente';
        }
      } else {
        statutCreance = 'paye';
      }

      // Dernière date de règlement trouvée
      const datesPaiements = patientSessions
        .filter((s) => s.datePaiement)
        .map((s) => s.datePaiement!)
        .sort();
      const dernierReglementDate = datesPaiements.length > 0 ? datesPaiements[datesPaiements.length - 1] : undefined;

      return {
        patientId: patient.id,
        patientNom: patient.nom,
        telephone: patient.telephone,
        isConventionne: patient.isConventionne,
        assuranceDetails: patient.assuranceDetails,
        numeroAssurance: patient.numeroAssurance,
        orthophonistesList: orthosList.length > 0 ? orthosList : ['Maroua'],
        totalSeances,
        seancesRealisees,
        seancesPlanifiees,
        seancesAnnulees,
        montantTotalDu,
        montantPaye,
        resteARecouvrer,
        statutCreance,
        dernierReglementDate,
        sessionsList: patientSessions,
      };
    });
  }, [patients, sessions, dateDebut, dateFin, settings]);

  // 3. APPLICATION DES FILTRES UTILISATEUR & RECHERCHE
  const filteredCreances = useMemo(() => {
    return allPatientCreances
      .filter((c) => {
        // Filtre patient spécifique
        if (selectedPatientId !== 'all' && c.patientId !== selectedPatientId) {
          return false;
        }

        // Filtre recherche textuelle
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match = 
            c.patientNom.toLowerCase().includes(q) ||
            c.telephone.toLowerCase().includes(q) ||
            c.assuranceDetails.toLowerCase().includes(q);
          if (!match) return false;
        }

        // Filtre orthophoniste
        if (selectedOrtho !== 'all') {
          const matchOrtho = c.orthophonistesList.some((o) => o.toLowerCase().includes(selectedOrtho.toLowerCase()));
          if (!matchOrtho) return false;
        }

        // Filtre assurance (CNAM / Privé)
        if (insuranceFilter === 'conventionne' && !c.isConventionne) return false;
        if (insuranceFilter === 'non_conventionne' && c.isConventionne) return false;

        // Filtre statut de créance
        if (statutFilter === 'paye' && c.statutCreance !== 'paye') return false;
        if (statutFilter === 'partiel' && c.statutCreance !== 'partiel') return false;
        if (statutFilter === 'en_attente' && c.statutCreance !== 'en_attente') return false;
        if (statutFilter === 'impaye' && c.resteARecouvrer === 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'reste') {
          return sortAsc ? a.resteARecouvrer - b.resteARecouvrer : b.resteARecouvrer - a.resteARecouvrer;
        }
        if (sortBy === 'nom') {
          const cmp = a.patientNom.localeCompare(b.patientNom);
          return sortAsc ? cmp : -cmp;
        }
        if (sortBy === 'seances') {
          return sortAsc ? a.seancesRealisees - b.seancesRealisees : b.seancesRealisees - a.seancesRealisees;
        }
        if (sortBy === 'total') {
          return sortAsc ? a.montantTotalDu - b.montantTotalDu : b.montantTotalDu - a.montantTotalDu;
        }
        return 0;
      });
  }, [allPatientCreances, selectedPatientId, searchQuery, selectedOrtho, insuranceFilter, statutFilter, sortBy, sortAsc]);

  // 4. TOTAUX GLOBAUX DU RAPPORT FILTRÉ
  const totals = useMemo(() => {
    const totalDu = filteredCreances.reduce((acc, c) => acc + c.montantTotalDu, 0);
    const totalPaye = filteredCreances.reduce((acc, c) => acc + c.montantPaye, 0);
    const totalReste = filteredCreances.reduce((acc, c) => acc + c.resteARecouvrer, 0);
    const totalSeancesRealisees = filteredCreances.reduce((acc, c) => acc + c.seancesRealisees, 0);
    const tauxRecouvrement = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 100;
    const patientsAvecDette = filteredCreances.filter((c) => c.resteARecouvrer > 0).length;

    return {
      totalDu,
      totalPaye,
      totalReste,
      totalSeancesRealisees,
      tauxRecouvrement,
      patientsAvecDette,
    };
  }, [filteredCreances]);

  // Handler Export PDF
  const handleExportPDF = () => {
    let desc = "Rapport de suivi des créances et séances d'orthophonie";
    if (dateDebut || dateFin) {
      desc += ` • Période : ${dateDebut ? `du ${dateDebut}` : ''} ${dateFin ? `au ${dateFin}` : ''}`;
    }
    if (selectedOrtho !== 'all') {
      desc += ` • Praticien : ${selectedOrtho}`;
    }
    exportCreancesReport(filteredCreances, totals, settings, desc);
  };

  // Helper pour message de relance WhatsApp personnalisé
  const createRelanceWhatsAppLink = (creance: PatientCreanceSummary) => {
    const wa = cleanWhatsAppNumber(creance.telephone);
    if (!wa) return null;

    const message = `Bonjour ${creance.patientNom},\n\n` +
      `Cabinet d'orthophonie Belgaied Maroua vous informe que pour vos ${creance.seancesRealisees} séance(s) de rééducation réalisées, ` +
      `le solde restant à régler s'élève à ${creance.resteARecouvrer} ${settings.devise}.\n\n` +
      `Merci de bien vouloir régulariser ce montant lors de votre prochain passage au cabinet.\n\n` +
      `Restant à votre entière disposition,\n` +
      `Cabinet Belgaied Maroua - Orthophonie`;

    return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-16 lg:pb-0">
      {/* HEADER BANNER : Titre & Exportation avec Touch Target >= 44px */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-teal-500/10 blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-semibold">
              <Coins className="w-3.5 h-3.5 text-teal-300" />
              <span>Gestion financière & Recouvrement des honoraires</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Rapport de Suivi des Créances Patients
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl">
              Analyse en temps réel des séances réalisées, des montants encaissés et des soldes restants dus par patient et par praticien.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportPDF}
              style={{ touchAction: 'manipulation' }}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 active:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-[0.98] group/pdf cursor-pointer select-none"
              title="Télécharger le rapport complet au format PDF"
            >
              <FileText className="w-4 h-4 transition-transform" />
              <span>Exporter Rapport PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. BARRE D'ACCÈS RAPIDE TACTILE SUR MOBILE (< lg) */}
      <div className="block lg:hidden bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Champ de recherche avec bouton X tactile (min 44x44px) */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher patient, tél, CNAM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ touchAction: 'manipulation' }}
            className="w-full min-h-[44px] pl-10 pr-12 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none transition shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ touchAction: 'manipulation' }}
              className="absolute right-1 w-11 h-11 flex items-center justify-center text-slate-400 active:text-slate-700 dark:active:text-slate-200 active:bg-slate-200/60 dark:active:bg-slate-700 rounded-lg transition"
              title="Effacer la recherche d'un tap"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Boutons d'action rapides sur Mobile : Ouvrir Filtres & Trier */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Bouton Ouvrir Tiroir de Filtres (Bottom Sheet) */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            style={{ touchAction: 'manipulation' }}
            className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs border transition active:scale-[0.98] select-none ${
              activeFiltersCount > 0
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 active:bg-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-teal-800 text-[11px] font-black flex items-center justify-center ml-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sélecteur de Tri Tactile */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ touchAction: 'manipulation' }}
              className="w-full min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none appearance-none"
            >
              <option value="reste">Tri : Créance (Solde)</option>
              <option value="total">Tri : Montant total</option>
              <option value="seances">Tri : Séances faites</option>
              <option value="nom">Tri : Nom patient</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Badges de filtres actifs et raccourci d'effacement */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-teal-700 dark:text-teal-400 font-bold text-[11px]">
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </span>
            <button
              onClick={handleResetFilters}
              style={{ touchAction: 'manipulation' }}
              className="min-h-[36px] px-2.5 text-[11px] font-extrabold text-rose-600 active:text-rose-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tout effacer</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. ZONE DE FILTRES DESKTOP (LARGE SCREEN >= lg) */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Filtres de recherche & Période</span>
          </h3>

          <button
            onClick={handleResetFilters}
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réinitialiser</span>
          </button>
        </div>

        {/* Grille des 4 filtres principaux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* A. Filtre Patient */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Patient :
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none transition shadow-2xs"
            >
              <option value="all">Tous les patients ({patients.length})</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.isConventionne ? 'CNAM' : 'Privé'})
                </option>
              ))}
            </select>
          </div>

          {/* B. Filtre Orthophoniste */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Orthophoniste :
            </label>
            <select
              value={selectedOrtho}
              onChange={(e) => setSelectedOrtho(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none transition shadow-2xs"
            >
              <option value="all">Tous les praticiens</option>
              {orthophonistesList.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* C. Filtre Statut de créance */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Statut du règlement :
            </label>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value as any)}
              className="w-full min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none transition shadow-2xs"
            >
              <option value="all">Tous les statuts</option>
              <option value="impaye">⚠️ Avec solde restant dû (Créance &gt; 0)</option>
              <option value="en_attente">⏳ En attente (0 DT réglé)</option>
              <option value="partiel">🟡 Partiellement payé</option>
              <option value="paye">✅ Entièrement soldé (Payé)</option>
            </select>
          </div>

          {/* D. Recherche avec bouton d'effacement X */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Recherche rapide :
            </label>
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Nom, téléphone, CNAM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-10 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ touchAction: 'manipulation' }}
                  className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ligne 2 : Filtre de Période (Date début / fin) et raccourcis larges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Période :
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]">
                <span className="text-[11px] text-slate-400 font-bold">Du :</span>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]">
                <span className="text-[11px] text-slate-400 font-bold">Au :</span>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Raccourcis de période larges et faciles à viser au pouce */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleSetPeriod('this_month')}
                style={{ touchAction: 'manipulation' }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 text-slate-700 dark:text-slate-300 transition"
              >
                Ce mois
              </button>
              <button
                type="button"
                onClick={() => handleSetPeriod('this_week')}
                style={{ touchAction: 'manipulation' }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cette semaine
              </button>
              <button
                type="button"
                onClick={() => handleSetPeriod('last_month')}
                style={{ touchAction: 'manipulation' }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 text-slate-700 dark:text-slate-300 transition"
              >
                Mois dernier
              </button>
              {(dateDebut || dateFin) && (
                <button
                  type="button"
                  onClick={() => handleSetPeriod('all')}
                  style={{ touchAction: 'manipulation' }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                >
                  Effacer dates
                </button>
              )}
            </div>
          </div>

          {/* Tri */}
          <div className="flex items-center gap-2 text-xs self-end lg:self-center">
            <span className="text-slate-400 font-semibold">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="min-h-[44px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
            >
              <option value="reste">Créance restante (Solde dû)</option>
              <option value="total">Montant total facturé</option>
              <option value="seances">Séances réalisées</option>
              <option value="nom">Nom du patient</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              style={{ touchAction: 'manipulation' }}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
              title="Inverser le sens du tri"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. BANDEAU DES 5 INDICATEURS FINANCIERS CLÉS (KPIS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total Reste à Recouvrer */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50/60 dark:from-rose-950/40 dark:to-red-950/20 p-3.5 sm:p-4 rounded-2xl border border-rose-200/90 dark:border-rose-900/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
              Reste à Recouvrer
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">{totals.totalReste}</span>
            <span className="text-xs font-bold text-rose-800/80 dark:text-rose-400">{settings.devise}</span>
          </div>
          <p className="text-[10px] text-rose-700/80 dark:text-rose-400 font-semibold mt-0.5">
            {totals.patientsAvecDette} patient(s) débiteur(s)
          </p>
        </div>

        {/* Total Encaissé / Payé */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/20 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/90 dark:border-emerald-900/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
              Total Encaissé
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">{totals.totalPaye}</span>
            <span className="text-xs font-bold text-emerald-800/80 dark:text-emerald-400">{settings.devise}</span>
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-semibold mt-0.5">
            Règlements reçus validés
          </p>
        </div>

        {/* Montant Total Dû (Facturé) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Facturé Dû
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totals.totalDu}</span>
            <span className="text-xs font-bold text-slate-500">{settings.devise}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {totals.totalSeancesRealisees} séances faites
          </p>
        </div>

        {/* Taux de Recouvrement */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Taux Recouvrement
            </span>
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-300">{totals.tauxRecouvrement}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(2, totals.tauxRecouvrement))}%` }}
            />
          </div>
        </div>

        {/* Dossiers Analysés */}
        <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Patients Filtrés
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{filteredCreances.length}</span>
            <span className="text-xs font-bold text-slate-400">/ {patients.length}</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            Dossiers correspondants
          </p>
        </div>
      </div>

      {/* 5. VUE DES CRÉANCES : ZERO HORIZONTAL SCROLLING */}
      {/* A. VUE DESKTOP (TABLEAU STANDARD SUR GRAND ÉCRAN >= lg) */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors duration-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
            <tr>
              <th className="py-3.5 px-3.5">Patient</th>
              <th className="py-3.5 px-3">Régime Assurance</th>
              <th className="py-3.5 px-3">Orthophoniste(s)</th>
              <th className="py-3.5 px-3 text-center">Séances Faites</th>
              <th className="py-3.5 px-3 text-right">Montant Dû</th>
              <th className="py-3.5 px-3 text-right">Montant Payé</th>
              <th className="py-3.5 px-3.5 text-right font-black text-rose-700 dark:text-rose-400">Reste à Recouvrer</th>
              <th className="py-3.5 px-3 text-center">Statut</th>
              <th className="py-3.5 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCreances.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Aucun dossier ne correspond à vos critères de filtrage.
                </td>
              </tr>
            ) : (
              filteredCreances.map((creance) => {
                const waLink = createRelanceWhatsAppLink(creance);
                const hasDette = creance.resteARecouvrer > 0;
                const pctPaye = creance.montantTotalDu > 0 ? Math.round((creance.montantPaye / creance.montantTotalDu) * 100) : 100;

                return (
                  <tr
                    key={creance.patientId}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition duration-150 ${
                      hasDette ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-950/20'
                    }`}
                  >
                    {/* Patient & Contact */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs uppercase flex-shrink-0 ${
                            creance.isConventionne
                              ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {creance.patientNom.slice(0, 2)}
                        </div>
                        <div>
                          <button
                            onClick={() => onOpenPatientDetails(creance.patientId)}
                            style={{ touchAction: 'manipulation' }}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:underline text-left block text-xs"
                          >
                            {creance.patientNom}
                          </button>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {creance.telephone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Assurance Details */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          creance.isConventionne
                            ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {creance.isConventionne ? <ShieldCheck className="w-3 h-3 text-teal-600" /> : <ShieldAlert className="w-3 h-3 text-amber-600" />}
                        <span>{creance.isConventionne ? 'CNAM' : 'Privé'}</span>
                      </span>
                      {creance.numeroAssurance && (
                        <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                          {creance.numeroAssurance}
                        </span>
                      )}
                    </td>

                    {/* Orthophonistes */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {creance.orthophonistesList.map((o) => {
                          const isMariem = o.toLowerCase().includes('mariem');
                          const isStagiaire = o.toLowerCase().includes('stagiaire');
                          return (
                            <span
                              key={o}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                isMariem
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                  : isStagiaire
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isMariem ? 'bg-indigo-500' : isStagiaire ? 'bg-amber-500' : 'bg-teal-500'}`}></span>
                              <span>{o}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Séances faites */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        {creance.seancesRealisees}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {((creance.seancesRealisees * 45) / 60).toFixed(1)} h soins
                      </span>
                    </td>

                    {/* Montant Dû */}
                    <td className="py-3.5 px-3 text-right">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {creance.montantTotalDu} {settings.devise}
                      </span>
                    </td>

                    {/* Montant Payé */}
                    <td className="py-3.5 px-3 text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {creance.montantPaye} {settings.devise}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-semibold">
                        ({pctPaye}%)
                      </span>
                    </td>

                    {/* Reste à Recouvrer */}
                    <td className="py-3.5 px-3.5 text-right">
                      <span
                        className={`font-black text-sm ${
                          hasDette ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {creance.resteARecouvrer} {settings.devise}
                      </span>
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 px-3 text-center">
                      {creance.statutCreance === 'paye' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Soldé</span>
                        </span>
                      ) : creance.statutCreance === 'partiel' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <span>Partiel</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <span>En attente</span>
                        </span>
                      )}
                    </td>

                    {/* Actions Desktop avec Touch Target >= 44px */}
                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Bouton Encaisser */}
                        <button
                          onClick={() => setPaymentModalCreance(creance)}
                          style={{ touchAction: 'manipulation' }}
                          className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 active:bg-teal-700 text-white text-xs font-bold shadow-2xs active:scale-[0.97] transition select-none cursor-pointer"
                          title="Encaisser un versement"
                        >
                          <Coins className="w-4 h-4" />
                          <span>Encaisser</span>
                        </button>

                        {/* Relance WhatsApp */}
                        {hasDette && waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ touchAction: 'manipulation' }}
                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-600 active:bg-emerald-700 text-white transition shadow-2xs select-none"
                            title="Envoyer rappel de créance WhatsApp au patient"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}

                        {/* Appel */}
                        {creance.telephone && (
                          <a
                            href={`tel:${creance.telephone}`}
                            style={{ touchAction: 'manipulation' }}
                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 active:bg-slate-800 text-white transition select-none"
                            title={`Appeler ${creance.patientNom}`}
                          >
                            <Phone className="w-4 h-4 text-emerald-400" />
                          </a>
                        )}

                        {/* Fiche Patient PDF */}
                        <button
                          onClick={() => {
                            const p = patients.find((pat) => pat.id === creance.patientId);
                            if (p) exportPatient(p, sessions, settings);
                          }}
                          style={{ touchAction: 'manipulation' }}
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 active:bg-rose-100 transition select-none"
                          title="Exporter dossier patient en PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* B. VUE MOBILE ET TABLETTE (< lg) : CARTES INDIVIDUELLES TACTILES & ACTIONS VERTICALES >= 44px */}
      <div className="block lg:hidden space-y-3.5 w-full">
        {filteredCreances.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            Aucun dossier ne correspond à vos critères de filtrage.
          </div>
        ) : (
          filteredCreances.map((creance) => {
            const waLink = createRelanceWhatsAppLink(creance);
            const hasDette = creance.resteARecouvrer > 0;
            const pctPaye = creance.montantTotalDu > 0 ? Math.round((creance.montantPaye / creance.montantTotalDu) * 100) : 100;

            return (
              <div
                key={creance.patientId}
                className="w-full bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors duration-200"
              >
                {/* 1. En-tête de carte : Patient, Régime, Badge Statut */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm uppercase flex-shrink-0 ${
                        creance.isConventionne
                          ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {creance.patientNom.slice(0, 2)}
                    </div>
                    <div>
                      <button
                        onClick={() => onOpenPatientDetails(creance.patientId)}
                        style={{ touchAction: 'manipulation' }}
                        className="font-extrabold text-slate-900 dark:text-slate-100 text-base active:text-teal-700 text-left block"
                      >
                        {creance.patientNom}
                      </button>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {creance.telephone}
                      </p>
                    </div>
                  </div>

                  {/* Badge Statut */}
                  <div>
                    {creance.statutCreance === 'paye' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Soldé</span>
                      </span>
                    ) : creance.statutCreance === 'partiel' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <span>Partiel</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <span>En attente</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Détails financiers dans un bloc tactile structuré */}
                <div className="bg-slate-50/90 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Praticien(s) :</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {creance.orthophonistesList.join(', ')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Séances effectuées :</span>
                    <span className="font-extrabold text-teal-800 dark:text-teal-300 text-sm">
                      {creance.seancesRealisees} séance(s) ({((creance.seancesRealisees * 45) / 60).toFixed(1)} h)
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Total facturé :</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{creance.montantTotalDu} {settings.devise}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Montant payé :</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{creance.montantPaye} {settings.devise} ({pctPaye}%)</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/90 dark:border-slate-700">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Reste à recouvrer :</span>
                    <span className={`text-base font-black ${hasDette ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {creance.resteARecouvrer} {settings.devise}
                    </span>
                  </div>
                </div>

                {/* 3. ACTIONS VERTICALES AVEC CIBLES TACTILES >= 44px ET ESPACEMENTS >= 8px */}
                <div className="space-y-2.5 pt-1 w-full">
                  {/* Action 1 : Encaisser un règlement (min-h-[48px]) */}
                  <button
                    onClick={() => setPaymentModalCreance(creance)}
                    style={{ touchAction: 'manipulation' }}
                    className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 active:bg-teal-700 text-white text-xs sm:text-sm font-extrabold shadow-sm active:scale-[0.98] transition cursor-pointer select-none"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Encaisser un versement ({hasDette ? `${creance.resteARecouvrer} ${settings.devise}` : 'Ajouter'})</span>
                  </button>

                  {/* Action 2 : Relance WhatsApp (min-h-[44px]) */}
                  {hasDette && waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ touchAction: 'manipulation' }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition select-none"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Envoyer relance WhatsApp ({creance.resteARecouvrer} {settings.devise})</span>
                    </a>
                  )}

                  {/* Actions secondaires en 2 gros boutons tactiles (min-h-[44px]) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {creance.telephone && (
                      <a
                        href={`tel:${creance.telephone}`}
                        style={{ touchAction: 'manipulation' }}
                        className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold active:bg-slate-800 transition shadow-2xs select-none"
                      >
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span>Appeler</span>
                      </a>
                    )}

                    <button
                      onClick={() => {
                        const p = patients.find((pat) => pat.id === creance.patientId);
                        if (p) exportPatient(p, sessions, settings);
                      }}
                      style={{ touchAction: 'manipulation' }}
                      className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold active:bg-rose-100 transition select-none"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Fiche PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. TIROIR COULISSANT DEPUIS LE BAS (BOTTOM SHEET) SUR MOBILE */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop dismiss touch */}
          <div className="flex-1" onClick={() => setIsMobileFiltersOpen(false)} />

          {/* Bottom Sheet Modal Container */}
          <div className="w-full max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom duration-250">
            {/* Poignée tactile (Drag handle) */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />

            {/* En-tête Bottom Sheet */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Filtrer les créances
                </h3>
              </div>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                style={{ touchAction: 'manipulation' }}
                className="w-11 h-11 flex items-center justify-center text-slate-400 active:text-slate-700 dark:active:text-slate-200 rounded-xl"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu des filtres dans le tiroir */}
            <div className="space-y-4">
              {/* Filtre Patient */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Patient :
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Tous les patients ({patients.length})</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} ({p.isConventionne ? 'CNAM' : 'Privé'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre Orthophoniste */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Orthophoniste :
                </label>
                <select
                  value={selectedOrtho}
                  onChange={(e) => setSelectedOrtho(e.target.value)}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Tous les praticiens</option>
                  {orthophonistesList.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtre Statut */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Statut de créance :
                </label>
                <select
                  value={statutFilter}
                  onChange={(e) => setStatutFilter(e.target.value as any)}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="impaye">⚠️ Avec solde restant dû (Créance &gt; 0)</option>
                  <option value="en_attente">⏳ En attente (0 DT réglé)</option>
                  <option value="partiel">🟡 Partiellement payé</option>
                  <option value="paye">✅ Entièrement soldé (Payé)</option>
                </select>
              </div>

              {/* Filtre Assurance */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Régime Assurance :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInsuranceFilter('all')}
                    style={{ touchAction: 'manipulation' }}
                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      insuranceFilter === 'all'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsuranceFilter('conventionne')}
                    style={{ touchAction: 'manipulation' }}
                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      insuranceFilter === 'conventionne'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    CNAM
                  </button>
                  <button
                    type="button"
                    onClick={() => setInsuranceFilter('non_conventionne')}
                    style={{ touchAction: 'manipulation' }}
                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      insuranceFilter === 'non_conventionne'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Privé
                  </button>
                </div>
              </div>

              {/* Période Du / Au avec raccourcis larges */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Période des séances :
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px] flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-bold">Du :</span>
                    <input
                      type="date"
                      value={dateDebut}
                      onChange={(e) => setDateDebut(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px] flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-bold">Au :</span>
                    <input
                      type="date"
                      value={dateFin}
                      onChange={(e) => setDateFin(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Raccourcis larges faciles à viser */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetPeriod('this_month')}
                    style={{ touchAction: 'manipulation' }}
                    className="min-h-[44px] rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 active:bg-teal-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    Ce mois
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPeriod('this_week')}
                    style={{ touchAction: 'manipulation' }}
                    className="min-h-[44px] rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 active:bg-teal-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    Cette semaine
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPeriod('last_month')}
                    style={{ touchAction: 'manipulation' }}
                    className="min-h-[44px] rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 active:bg-teal-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    Mois dernier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPeriod('all')}
                    style={{ touchAction: 'manipulation' }}
                    className="min-h-[44px] rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900"
                  >
                    Effacer dates
                  </button>
                </div>
              </div>
            </div>

            {/* Pied de page Bottom Sheet avec boutons tactiles larges */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetFilters}
                style={{ touchAction: 'manipulation' }}
                className="w-1/3 min-h-[48px] py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs active:bg-slate-100 dark:active:bg-slate-800 transition"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 min-h-[48px] py-3 rounded-xl bg-teal-600 active:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition"
              >
                Appliquer ({filteredCreances.length} dossiers)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. BOUTON FLOTTANT D'ACTION (FAB) SUR MOBILE */}
      <button
        onClick={() => setIsMobileFiltersOpen(true)}
        style={{ touchAction: 'manipulation' }}
        className="fixed bottom-5 right-4 lg:hidden z-30 min-h-[52px] min-w-[52px] rounded-2xl bg-teal-600 active:bg-teal-700 text-white shadow-xl flex items-center justify-center gap-2 px-4 font-extrabold text-xs shadow-teal-900/30 active:scale-95 transition cursor-pointer select-none"
        title="Ouvrir les filtres"
        aria-label="Ouvrir les filtres"
      >
        <SlidersHorizontal className="w-5 h-5" />
        <span>Filtres</span>
        {activeFiltersCount > 0 && (
          <span className="w-5 h-5 rounded-full bg-white text-teal-800 text-[11px] font-black flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* MODAL D'ENCAISSEMENT */}
      <PaymentModal
        isOpen={!!paymentModalCreance}
        onClose={() => setPaymentModalCreance(null)}
        creance={paymentModalCreance}
        settings={settings}
        onRecordPayment={(pId, amt, mode, date, note) => {
          onRecordPayment(pId, amt, mode, date, note);
        }}
      />
    </div>
  );
};
