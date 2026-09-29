import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  PhoneCall, 
  Search, 
  Building2, 
  User, 
  MessageSquare, 
  ShieldCheck, 
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { Patient, CabinetSettings } from '../types';
import { cleanWhatsAppNumber } from '../utils/dateUtils';

interface PhoneCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  settings: CabinetSettings;
}

export const PhoneCallModal: React.FC<PhoneCallModalProps> = ({
  isOpen,
  onClose,
  patients,
  settings,
}) => {
  const [search, setSearch] = useState('');
  const [manualNumber, setManualNumber] = useState('');

  if (!isOpen) return null;

  const cabinetPhone = settings.telephoneCabinet || '+216 71 890 123';

  const filteredPatients = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.nom.toLowerCase().includes(q) ||
      p.telephone.toLowerCase().includes(q) ||
      p.pathologie.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Appel Téléphonique Direct</h3>
              <p className="text-xs text-emerald-100">
                {settings.nomCabinet}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Card 1: Appeler le cabinet */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                  Ligne du Cabinet
                </span>
                <p className="text-sm font-black text-slate-900 font-mono">
                  {cabinetPhone}
                </p>
                <p className="text-[10px] text-emerald-700">
                  Secrétariat & Accueil du cabinet
                </p>
              </div>
            </div>

            <a
              href={`tel:${cabinetPhone}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition shadow-sm flex-shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Appeler</span>
            </a>
          </div>

          {/* Quick Manual Dial */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Composer un numéro direct
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  placeholder="Ex: +216 98 123 456"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <a
                href={manualNumber ? `tel:${manualNumber}` : '#'}
                onClick={(e) => {
                  if (!manualNumber.trim()) {
                    e.preventDefault();
                  }
                }}
                className={`inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  manualNumber.trim()
                    ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Composer</span>
              </a>
            </div>
          </div>

          {/* Patient Quick Directory for Calls */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                <span>Répertoire des Patients ({patients.length})</span>
              </span>
              <span className="text-[10px] text-slate-400">
                1 clic pour appeler
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un patient à appeler..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* List of patients with quick call button */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Aucun patient trouvé.
                </div>
              ) : (
                filteredPatients.map((patient) => {
                  const waNum = cleanWhatsAppNumber(patient.telephone);

                  return (
                    <div
                      key={patient.id}
                      className="p-2.5 hover:bg-slate-50 transition flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">
                            {patient.nom}
                          </span>
                          {patient.isConventionne ? (
                            <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1 rounded border border-teal-200/60">
                              CNAM
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200/60">
                              Privé
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {patient.telephone}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a
                          href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                            `Bonjour ${patient.nom}, Cabinet d'orthophonie Belgaied Maroua à votre disposition.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
                          title="Message WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        <a
                          href={`tel:${patient.telephone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-emerald-600 transition shadow-2xs text-[11px]"
                          title={`Appeler ${patient.nom}`}
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>Appeler</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <span>Compatible smartphones & softphones</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-white font-semibold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
