import React, { useState, useEffect } from 'react';
import { 
  X, 
  Coins, 
  CheckCircle2, 
  CreditCard, 
  Calendar, 
  FileText, 
  User, 
  ShieldCheck, 
  ArrowRight,
  WalletCards
} from 'lucide-react';
import { Patient, PatientCreanceSummary, CabinetSettings } from '../types';
import { formatDateISO } from '../utils/dateUtils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creance: PatientCreanceSummary | null;
  settings: CabinetSettings;
  onRecordPayment: (
    patientId: string, 
    amount: number, 
    modePaiement: 'especes' | 'cheque' | 'virement' | 'cnam' | 'autre', 
    datePaiement: string, 
    notePaiement: string
  ) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  creance,
  settings,
  onRecordPayment,
}) => {
  if (!isOpen || !creance) return null;

  const todayStr = formatDateISO(new Date());
  const [montant, setMontant] = useState<number>(creance.resteARecouvrer > 0 ? creance.resteARecouvrer : 0);
  const [modePaiement, setModePaiement] = useState<'especes' | 'cheque' | 'virement' | 'cnam' | 'autre'>('especes');
  const [datePaiement, setDatePaiement] = useState<string>(todayStr);
  const [notePaiement, setNotePaiement] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (creance) {
      setMontant(creance.resteARecouvrer > 0 ? creance.resteARecouvrer : 0);
      setModePaiement(creance.isConventionne ? 'especes' : 'especes');
      setDatePaiement(todayStr);
      setNotePaiement('');
      setIsSuccess(false);
    }
  }, [creance?.patientId, creance?.resteARecouvrer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (montant <= 0) return;

    onRecordPayment(
      creance.patientId,
      montant,
      modePaiement,
      datePaiement,
      notePaiement.trim()
    );

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 600);
  };

  const remainingAfterPayment = Math.max(0, creance.resteARecouvrer - (montant || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50 to-emerald-50/60 dark:from-teal-950/40 dark:to-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <WalletCards className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Encaisser un règlement</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100/80 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                  {settings.devise}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient : <strong className="text-slate-700 dark:text-slate-200">{creance.patientNom}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Situation financière actuelle du patient */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Séances effectuées :</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{creance.seancesRealisees} séance(s)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Montant total dû :</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{creance.montantTotalDu} {settings.devise}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Déjà réglé :</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{creance.montantPaye} {settings.devise}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Solde restant dû (Créance) :</span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400">{creance.resteARecouvrer} {settings.devise}</span>
            </div>
          </div>

          {/* Montant à encaisser */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Montant versé aujourd'hui ({settings.devise}) :
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={montant}
                onChange={(e) => setMontant(Number(e.target.value))}
                className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400">
                {settings.devise}
              </span>
            </div>

            {/* Raccourcis de montants rapides */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setMontant(creance.resteARecouvrer)}
                style={{ touchAction: 'manipulation' }}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold active:bg-teal-100 transition shadow-2xs select-none"
              >
                Tout solder ({creance.resteARecouvrer} {settings.devise})
              </button>
              {creance.resteARecouvrer > 35 && (
                <button
                  type="button"
                  onClick={() => setMontant(35)}
                  style={{ touchAction: 'manipulation' }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold active:bg-slate-200 transition select-none"
                >
                  1 séance (35 {settings.devise})
                </button>
              )}
              {creance.resteARecouvrer > 70 && (
                <button
                  type="button"
                  onClick={() => setMontant(70)}
                  style={{ touchAction: 'manipulation' }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold active:bg-slate-200 transition select-none"
                >
                  2 séances (70 {settings.devise})
                </button>
              )}
            </div>
          </div>

          {/* Mode de règlement */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mode de règlement :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'especes', label: 'Espèces', icon: '💵' },
                { id: 'cheque', label: 'Chèque', icon: '📝' },
                { id: 'virement', label: 'Virement', icon: '🏦' },
                { id: 'cnam', label: 'Tiers CNAM', icon: '🛡️' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModePaiement(m.id as any)}
                  style={{ touchAction: 'manipulation' }}
                  className={`min-h-[50px] p-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 active:scale-95 select-none ${
                    modePaiement === m.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 active:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date de règlement & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date de règlement :
              </label>
              <input
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Référence / Note de reçu (optionnel) :
              </label>
              <input
                type="text"
                value={notePaiement}
                onChange={(e) => setNotePaiement(e.target.value)}
                placeholder="Ex: N° chèque, Reçu n°45..."
                className="w-full min-h-[44px] px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Nouveau solde prévisionnel */}
          <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/60 flex items-center justify-between text-xs">
            <span className="text-teal-900 dark:text-teal-200 font-semibold">Solde après cet encaissement :</span>
            <span className="font-extrabold text-teal-950 dark:text-teal-100">
              {remainingAfterPayment === 0 ? 'Solde entièrement réglé ✓' : `${remainingAfterPayment} ${settings.devise} restant`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              style={{ touchAction: 'manipulation' }}
              className="min-h-[44px] px-5 py-2.5 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={montant <= 0 || isSuccess}
              style={{ touchAction: 'manipulation' }}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 active:bg-teal-700 text-white text-xs sm:text-sm font-extrabold shadow-md active:scale-95 transition disabled:opacity-50 select-none cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSuccess ? 'Enregistré !' : `Valider encaissement (${montant} ${settings.devise})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
