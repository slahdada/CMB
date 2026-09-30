import React, { useState } from 'react';
import { 
  Search, 
  UserPlus, 
  MessageSquare, 
  Phone, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar, 
  Edit3, 
  Trash2, 
  Eye, 
  Sparkles, 
  Filter, 
  ArrowUpDown,
  FileText,
  Download
} from 'lucide-react';
import { Patient, Session } from '../types';
import { cleanWhatsAppNumber } from '../utils/dateUtils';
import { useSessions } from '../context/SessionsContext';
import { usePDFExporter } from '../hooks/usePDFExporter';

interface PatientsTableProps {
  patients: Patient[];
  sessions: Session[];
  onOpenNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  onOpenNewSessionForPatient: (patient: Patient) => void;
  onOpenPatientDetails: (patientId: string) => void;
}

export const PatientsTable: React.FC<PatientsTableProps> = ({
  patients,
  sessions,
  onOpenNewPatient,
  onEditPatient,
  onDeletePatient,
  onOpenNewSessionForPatient,
  onOpenPatientDetails,
}) => {
  const { settings } = useSessions();
  const { exportPatient, exportPatientsList } = usePDFExporter();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'conventionne' | 'non_conventionne'>('all');
  const [sortBy, setSortBy] = useState<'nom' | 'sessions' | 'recent'>('nom');
  const [sortAsc, setSortAsc] = useState(true);

  // Compute session counts per patient
  const patientStats = React.useMemo(() => {
    const stats: Record<string, { total: number; realisees: number; planifiees: number }> = {};
    sessions.forEach((s) => {
      if (!stats[s.patientId]) {
        stats[s.patientId] = { total: 0, realisees: 0, planifiees: 0 };
      }
      stats[s.patientId].total += 1;
      if (s.status === 'realisee') stats[s.patientId].realisees += 1;
      if (s.status === 'planifiee') stats[s.patientId].planifiees += 1;
    });
    return stats;
  }, [sessions]);

  // Overall counters
  const totalCount = patients.length;
  const convCount = patients.filter((p) => p.isConventionne).length;
  const nonConvCount = totalCount - convCount;
  const convPercentage = totalCount > 0 ? Math.round((convCount / totalCount) * 100) : 0;

  // Filter & Search
  const filteredPatients = patients
    .filter((patient) => {
      if (filterType === 'conventionne' && !patient.isConventionne) return false;
      if (filterType === 'non_conventionne' && patient.isConventionne) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        patient.nom.toLowerCase().includes(q) ||
        patient.telephone.toLowerCase().includes(q) ||
        patient.pathologie.toLowerCase().includes(q) ||
        patient.assuranceDetails.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'nom') {
        const cmp = a.nom.localeCompare(b.nom);
        return sortAsc ? cmp : -cmp;
      }
      if (sortBy === 'sessions') {
        const countA = patientStats[a.id]?.total || 0;
        const countB = patientStats[b.id]?.total || 0;
        return sortAsc ? countA - countB : countB - countA;
      }
      if (sortBy === 'recent') {
        return sortAsc
          ? a.dateCreation.localeCompare(b.dateCreation)
          : b.dateCreation.localeCompare(a.dateCreation);
      }
      return 0;
    });

  const handleExportFilteredPDF = () => {
    const fType = filterType === 'conventionne' ? 'conventionne' : filterType === 'non_conventionne' ? 'prive' : 'all';
    exportPatientsList(filteredPatients, sessions, settings, fType, searchQuery);
  };

  return (
    <div className="space-y-4">
      {/* Top Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Patients</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{totalCount}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Dossiers actifs au cabinet</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
            👥
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-950/40 dark:to-emerald-950/20 p-4 rounded-2xl border border-teal-200/90 dark:border-teal-800/80 shadow-2xs flex items-center justify-between transition-colors">
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <p className="text-xs font-bold text-teal-900 dark:text-teal-200">Patients Conventionnés</p>
            </div>
            <h3 className="text-2xl font-black text-teal-950 dark:text-teal-100 mt-0.5">
              {convCount} <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">({convPercentage}%)</span>
            </h3>
            <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">Prise en charge CNAM</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            CNAM
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/40 dark:to-orange-950/20 p-4 rounded-2xl border border-amber-200/90 dark:border-amber-800/80 shadow-2xs flex items-center justify-between transition-colors">
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Non-Conventionnés (Privé)</p>
            </div>
            <h3 className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-0.5">
              {nonConvCount} <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">({100 - convPercentage}%)</span>
            </h3>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Honoraires libres / Assurances privées</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
            Privé
          </div>
        </div>
      </div>

      {/* Control bar: Search, Filters, Add Button & PDF Action */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, téléphone, pathologie..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleExportFilteredPDF}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 transition shadow-2xs group/pdf"
              title="Exporter la liste filtrée actuelle au format PDF"
            >
              <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover/pdf:scale-110 transition-transform" />
              <span>Exporter PDF ({filteredPatients.length})</span>
            </button>

            <button
              onClick={onOpenNewPatient}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs sm:text-sm font-semibold hover:bg-teal-700 active:scale-95 transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouveau Patient</span>
            </button>
          </div>
        </div>

        {/* Filter Chips & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filtre :
            </span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                filterType === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tous ({patients.length})
            </button>
            <button
              onClick={() => setFilterType('conventionne')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition ${
                filterType === 'conventionne'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conventionnés CNAM ({convCount})</span>
            </button>
            <button
              onClick={() => setFilterType('non_conventionne')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition ${
                filterType === 'non_conventionne'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Non-conventionnés ({nonConvCount})</span>
            </button>

            {/* Quick PDF button right next to filters */}
            <button
              onClick={handleExportFilteredPDF}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/70 transition shadow-2xs ml-1"
              title="Télécharger cette sélection en PDF"
            >
              <Download className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="nom">Nom de A à Z</option>
              <option value="sessions">Nombre de séances</option>
              <option value="recent">Plus récent</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              title="Inverser le tri"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Patients Desktop Table */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Téléphone WhatsApp</th>
              <th className="py-3 px-4">Régime d'Assurance</th>
              <th className="py-3 px-4">Pathologie / Prise en charge</th>
              <th className="py-3 px-4 text-center">Séances (45 min)</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Aucun patient ne correspond à votre recherche.
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const stats = patientStats[patient.id] || { total: 0, realisees: 0, planifiees: 0 };

                return (
                  <tr key={patient.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group">
                    {/* Patient Name & Age */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                            patient.isConventionne
                              ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {patient.nom.slice(0, 2)}
                        </div>
                        <div>
                          <button
                            onClick={() => onOpenPatientDetails(patient.id)}
                            className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-teal-700 dark:hover:text-teal-400 transition hover:underline text-left block"
                          >
                            {patient.nom}
                          </button>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {patient.age ? `${patient.age} ans` : 'Âge non renseigné'}
                            {patient.dateNaissance && ` (${patient.dateNaissance})`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* WhatsApp & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/${cleanWhatsAppNumber(patient.telephone)}?text=${encodeURIComponent(
                            `Bonjour ${patient.nom}, Cabinet d'orthophonie Belgaied Maroua à votre disposition.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold hover:bg-emerald-600 hover:text-white transition shadow-2xs group/wa"
                          title="Envoyer message WhatsApp direct"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover/wa:text-white" />
                          <span className="font-mono text-xs">{patient.telephone}</span>
                        </a>

                        <a
                          href={`tel:${patient.telephone}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-semibold hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition shadow-2xs text-xs"
                          title={`Appeler ${patient.nom} (${patient.telephone})`}
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Appeler</span>
                        </a>
                      </div>
                    </td>

                    {/* Assurance Type */}
                    <td className="py-3.5 px-4">
                      <div>
                        {patient.isConventionne ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              Conventionné CNAM
                            </span>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {patient.assuranceDetails}
                            </div>
                            {patient.numeroAssurance && (
                              <div className="text-[9px] font-mono text-slate-400">
                                Réf : {patient.numeroAssurance}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              Non-conventionné
                            </span>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {patient.assuranceDetails}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Pathologie */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{patient.pathologie}</p>
                      {(patient.notesMedicales || patient.notes) && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 italic mt-0.5">
                          {patient.notesMedicales || patient.notes}
                        </p>
                      )}
                    </td>

                    {/* Sessions count with prescribed target */}
                    <td className="py-3.5 px-4 text-center">
                      {(() => {
                        const prescribed = patient.nombreSeancesPrescrites || 30;
                        const pct = Math.min(100, Math.round((stats.realisees / prescribed) * 100));
                        return (
                          <div className="inline-flex flex-col items-center min-w-[120px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                                {stats.realisees}
                              </span>
                              <span className="text-xs text-slate-400 font-bold">/ {prescribed}</span>
                              <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                                {pct}%
                              </span>
                            </div>
                            
                            {/* Mini progress bar */}
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-200/60 dark:border-slate-700">
                              <div
                                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>

                            <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium mt-0.5">
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{stats.realisees} faites</span>
                              <span>•</span>
                              <span className="text-sky-700 dark:text-sky-400 font-semibold">{stats.planifiees} prév.</span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Actions: + Séance, Fiche PDF, Voir, Modifier, Supprimer */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => exportPatient(patient, sessions, settings)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-700 text-xs font-bold transition border border-rose-200/80 dark:border-rose-900 group/pdf"
                          title={`Exporter la fiche dossier PDF de ${patient.nom}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover/pdf:text-white transition-colors" />
                          <span>Fiche PDF</span>
                        </button>

                        <button
                          onClick={() => onOpenNewSessionForPatient(patient)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 hover:bg-teal-600 hover:text-white text-xs font-semibold transition border border-teal-200/60 dark:border-teal-800"
                          title="Planifier nouvelle séance de 45 min"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>+ Séance</span>
                        </button>

                        <button
                          onClick={() => onOpenPatientDetails(patient.id)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Voir dossier complet"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEditPatient(patient)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Modifier les coordonnées"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeletePatient(patient.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          title="Supprimer ce patient"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Patients Mobile & Tablet Cards View */}
      <div className="lg:hidden space-y-3">
        {filteredPatients.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
            Aucun patient trouvé.
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const stats = patientStats[patient.id] || { total: 0, realisees: 0, planifiees: 0 };

            return (
              <div
                key={patient.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase ${
                        patient.isConventionne
                          ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {patient.nom.slice(0, 2)}
                    </div>
                    <div>
                      <button
                        onClick={() => onOpenPatientDetails(patient.id)}
                        className="font-bold text-slate-900 dark:text-slate-100 text-base text-left hover:underline"
                      >
                        {patient.nom}
                      </button>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {patient.age ? `${patient.age} ans` : ''} {patient.dateNaissance ? `(${patient.dateNaissance})` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        patient.isConventionne
                          ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {patient.isConventionne ? 'Conventionné CNAM' : 'Privé'}
                    </span>

                    <button
                      onClick={() => exportPatient(patient, sessions, settings)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                      title="Exporter fiche patient en PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Assurance :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{patient.assuranceDetails}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Pathologie :</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{patient.pathologie}</span>
                  </div>
                  <div className="pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Protocole de séances :</span>
                      <span className="font-extrabold text-teal-800 dark:text-teal-300">
                        {stats.realisees} / {patient.nombreSeancesPrescrites || 30} réalisées ({Math.min(100, Math.round((stats.realisees / (patient.nombreSeancesPrescrites || 30)) * 100))}%)
                      </span>
                    </div>
                    {/* Mini progress bar on mobile */}
                    <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(4, Math.round((stats.realisees / (patient.nombreSeancesPrescrites || 30)) * 100)))}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>Reste : {Math.max(0, (patient.nombreSeancesPrescrites || 30) - stats.realisees)} séances</span>
                      <span>{stats.planifiees} planifiée(s)</span>
                    </div>
                  </div>
                </div>

                {/* Actions & Contact buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${patient.telephone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800 active:scale-95 transition shadow-2xs"
                      title={`Appeler ${patient.nom}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Appeler</span>
                    </a>

                    <a
                      href={`https://wa.me/${cleanWhatsAppNumber(patient.telephone)}?text=${encodeURIComponent(
                        `Bonjour ${patient.nom}, Cabinet d'orthophonie Belgaied Maroua à votre disposition.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => exportPatient(patient, sessions, settings)}
                      className="px-2 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold hover:bg-rose-100 transition"
                      title="Fiche PDF"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => onOpenNewSessionForPatient(patient)}
                      className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold hover:bg-teal-100 transition"
                    >
                      + 45 min
                    </button>
                    <button
                      onClick={() => onOpenPatientDetails(patient.id)}
                      className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Dossier"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditPatient(patient)}
                      className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePatient(patient.id)}
                      className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
