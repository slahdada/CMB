import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Check, 
  HeartHandshake,
  MessageSquare
} from 'lucide-react';
import { Patient } from '../types';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (patient: Patient) => void;
  patientToEdit?: Patient;
}

const COMMON_PATHOLOGIES = [
  'Retard de langage oral & parole',
  'Dyslexie - Dysorthographie',
  'Bégaiement développemental',
  'Trouble articulatoire (zézaiement, chlintement)',
  'Dysphasie développementale',
  'Déglutition atypique & ventilation buccale',
  'Dysphonie dysfonctionnelle (trouble vocal)',
  'Dyscalculie & troubles logico-mathématiques',
  'Dyspraxie verbale',
  'Surdité & réhabilitation auditive',
  'Aphasie acquise (adulte)',
];

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSavePatient,
  patientToEdit,
}) => {
  const isEditing = !!patientToEdit;

  // Form states - all hooks called unconditionally at the top
  const [nom, setNom] = useState(patientToEdit?.nom || '');
  const [telephone, setTelephone] = useState(patientToEdit?.telephone || '+216 ');
  const [isConventionne, setIsConventionne] = useState(patientToEdit ? patientToEdit.isConventionne : true);
  const [assuranceDetails, setAssuranceDetails] = useState(
    patientToEdit?.assuranceDetails || (isConventionne ? 'CNAM - Filière Privée' : 'Régime privé sans convention')
  );
  const [numeroAssurance, setNumeroAssurance] = useState(patientToEdit?.numeroAssurance || '');
  const [dateNaissance, setDateNaissance] = useState(patientToEdit?.dateNaissance || '');
  const [age, setAge] = useState<number | undefined>(patientToEdit?.age);
  const [pathologie, setPathologie] = useState(patientToEdit?.pathologie || '');
  const [notes, setNotes] = useState(patientToEdit?.notes || '');
  const [status, setStatus] = useState<'actif' | 'en_attente' | 'termine'>(patientToEdit?.status || 'actif');

  // Auto-calculate age when date of birth changes
  useEffect(() => {
    if (dateNaissance) {
      const birth = new Date(dateNaissance);
      const now = new Date(2026, 8, 29); // 2026 reference
      let diff = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        diff--;
      }
      if (diff >= 0 && diff < 120) {
        setAge(diff);
      }
    }
  }, [dateNaissance]);

  // Early return after all hooks have been declared
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim()) return;

    const patient: Patient = {
      id: patientToEdit?.id || `pat-${Date.now()}`,
      nom: nom.trim(),
      telephone: telephone.trim(),
      isConventionne,
      assuranceDetails: assuranceDetails.trim() || (isConventionne ? 'CNAM' : 'Privé'),
      numeroAssurance: numeroAssurance.trim() || undefined,
      dateNaissance: dateNaissance || undefined,
      age: age || undefined,
      pathologie: pathologie.trim() || 'Prise en charge orthophonique',
      notes: notes.trim() || undefined,
      notesMedicales: patientToEdit?.notesMedicales || (notes.trim() ? notes.trim() : undefined),
      notesMedicalesDate: patientToEdit?.notesMedicalesDate,
      status,
      dateCreation: patientToEdit?.dateCreation || new Date().toISOString().split('T')[0],
    };

    onSavePatient(patient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Modifier la fiche patient' : 'Nouveau Dossier Patient'}
              </h3>
              <p className="text-xs text-slate-500">
                Cabinet d'orthophonie Belgaied Maroua
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nom */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nom et Prénom du patient *
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              placeholder="Ex: Rayan Chahed, Yasmine Trabelsi..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900"
            />
          </div>

          {/* Téléphone WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Numéro Téléphone WhatsApp *
              </span>
              <span className="text-[10px] text-slate-400">Pour rappels de séances</span>
            </label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              required
              placeholder="+216 98 123 456"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>

          {/* Type d'assurance (Conventionné vs Non-conventionné) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Type de couverture & assurance *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConventionne(true);
                    setAssuranceDetails('CNAM - Filière Privée');
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    isConventionne
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Conventionné CNAM</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsConventionne(false);
                    setAssuranceDetails('Régime privé sans convention');
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                    !isConventionne
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Non-conventionné (Privé)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Précision de l'assurance
                </label>
                <input
                  type="text"
                  value={assuranceDetails}
                  onChange={(e) => setAssuranceDetails(e.target.value)}
                  placeholder={isConventionne ? 'Ex: CNAM Filière Publique / Privée' : 'Ex: Assurance Star, Sans convention'}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Matricule CNAM / N° Affiliation
                </label>
                <input
                  type="text"
                  value={numeroAssurance}
                  onChange={(e) => setNumeroAssurance(e.target.value)}
                  placeholder="Ex: CNAM-0829103"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Date de naissance & Âge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Âge calculé
              </label>
              <input
                type="number"
                value={age ?? ''}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 7"
                min="0"
                max="120"
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Pathologie / Motif */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pathologie / Motif de prise en charge *
            </label>
            <input
              type="text"
              value={pathologie}
              onChange={(e) => setPathologie(e.target.value)}
              required
              placeholder="Ex: Dyslexie-Dysorthographie, Retard de langage..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {/* Quick pathology suggestions */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {COMMON_PATHOLOGIES.slice(0, 4).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPathologie(p)}
                  className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 px-2 py-0.5 rounded-md transition"
                >
                  + {p.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes cliniques */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observations cliniques / Notes du praticien
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Antécédents ORL, scolarité, bilan initial, objectifs de rééducation..."
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Statut dossier */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Statut du dossier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'actif', label: 'Suivi Actif' },
                { val: 'en_attente', label: 'Liste d’attente' },
                { val: 'termine', label: 'Suivi Terminé' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.val}
                  onClick={() => setStatus(item.val as any)}
                  className={`py-1.5 text-xs font-semibold rounded-xl border transition ${
                    status === item.val
                      ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 active:scale-95 transition shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Enregistrer modifications' : 'Créer le dossier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
