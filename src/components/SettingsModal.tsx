import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  Smartphone, 
  Coins, 
  Building2 
} from 'lucide-react';
import { CabinetSettings } from '../types';
import { exportAllData, importAllData, resetToDemoData } from '../utils/storage';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CabinetLogo } from './CabinetLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CabinetSettings;
  onSaveSettings: (settings: CabinetSettings) => void;
  onReloadAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onReloadAllData,
}) => {
  const [form, setForm] = useState<CabinetSettings>({ ...settings });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { isInstalled, isInstallable, install } = usePWAInstall();

  // Early return after hooks
  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSuccessMsg('Paramètres enregistrés avec succès !');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleExport = () => {
    const jsonStr = exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cabinet_belgaied_maroua_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importAllData(content)) {
        onReloadAllData();
        setSuccessMsg('Données importées avec succès !');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert("Erreur lors de l'importation du fichier JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Voulez-vous réinitialiser toutes les données avec le jeu de démonstration du Cabinet Belgaied Maroua ?')) {
      resetToDemoData();
      onReloadAllData();
      setSuccessMsg('Données de démo restaurées !');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <CabinetLogo size="sm" showBadge={false} />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Paramètres & Tarifs du Cabinet
              </h3>
              <p className="text-xs text-slate-500">
                Cabinet d'orthophonie Maroua Belgaied
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="mx-4 sm:mx-5 mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Cabinet & Praticien */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Identité du Cabinet
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom du cabinet
              </label>
              <input
                type="text"
                value={form.nomCabinet}
                onChange={(e) => setForm({ ...form, nomCabinet: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Orthophoniste responsable
              </label>
              <input
                type="text"
                value={form.praticien}
                onChange={(e) => setForm({ ...form, praticien: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Numéro de téléphone du cabinet (Appel direct)
              </label>
              <input
                type="tel"
                value={form.telephoneCabinet || ''}
                onChange={(e) => setForm({ ...form, telephoneCabinet: e.target.value })}
                placeholder="+216 71 890 123"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          {/* Tarification */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              Tarifs par Séance (45 min)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarif Conventionné CNAM ({form.devise})
                </label>
                <input
                  type="number"
                  value={form.tarifConventionne}
                  onChange={(e) => setForm({ ...form, tarifConventionne: Number(e.target.value) })}
                  min="0"
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-teal-200 bg-teal-50/40 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-teal-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tarif Non-conventionné ({form.devise})
                </label>
                <input
                  type="number"
                  value={form.tarifNonConventionne}
                  onChange={(e) => setForm({ ...form, tarifNonConventionne: Number(e.target.value) })}
                  min="0"
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-amber-900"
                />
              </div>
            </div>
          </div>

          {/* Sauvegarde & Données */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sauvegarde locale & Démo
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Download className="w-3.5 h-3.5 text-teal-600" />
                <span>Exporter JSON</span>
              </button>

              <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>Importer JSON</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Restaurer les données démo du cabinet</span>
            </button>
          </div>

          {/* Footer Save */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Fermer
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer paramètres</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
