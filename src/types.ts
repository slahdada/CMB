/**
 * Types pour l'application Cabinet d'orthophonie Belgaied Maroua
 */

export type InsuranceType = 'conventionne' | 'non_conventionne';

export type SessionStatus = 'planifiee' | 'realisee' | 'annulee' | 'absent';

export interface Patient {
  id: string;
  nom: string;
  telephone: string; // Numéro WhatsApp
  isConventionne: boolean;
  assuranceDetails: string; // Ex: "CNAM - Filière Publique", "CNAM - Médecin de famille", "Assurance Privée", "Aucune"
  numeroAssurance?: string; // Matricule CNAM ou N° adhérent
  dateNaissance?: string; // YYYY-MM-DD
  age?: number;
  pathologie: string; // Ex: "Retard de langage", "Bégaiement", "Dyslexie", "Trouble articulatoire"
  notes?: string;
  notesMedicales?: string; // Observations cliniques ou remarques de suivi à long terme
  notesMedicalesDate?: string; // Date de dernière mise à jour des notes médicales
  status: 'actif' | 'en_attente' | 'termine';
  dateCreation: string;
}

export interface Session {
  id: string;
  patientId: string;
  patientNom: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (ex: "09:15")
  endTime: string; // HH:MM (ex: "10:00" = startTime + 45 min)
  durationMinutes: number; // Toujours 45 min
  isConventionne: boolean;
  status: SessionStatus;
  tarif: number; // Montant en DT / TND
  motif?: string; // Ex: "Bilan orthophonique", "Séance de rééducation n°8"
  notesSeance?: string;
  orthophonisteNom?: string; // "Maroua" | "Mariem" | "Stagiaire" | nom libre
  position?: 1 | 2 | 3;
}

export interface CabinetSettings {
  nomCabinet: string;
  praticien: string;
  specialite: string;
  tarifConventionne: number; // Tarif standard conventionné (ex: 35 ou 40 DT)
  tarifNonConventionne: number; // Tarif standard privé (ex: 50 DT)
  heureDebutJournee: string; // "08:30"
  heureFinJournee: string; // "18:00"
  pauseMidiDebut: string; // "12:15"
  pauseMidiFin: string; // "14:00"
  devise: string; // "DT" ou "TND"
  telephoneCabinet?: string; // Téléphone du cabinet
}

export interface DayStats {
  date: string;
  total: number;
  conventionnes: number;
  nonConventionnes: number;
  realisees: number;
  annulees: number;
}

export interface WeekStats {
  startOfWeek: string;
  endOfWeek: string;
  total: number;
  conventionnes: number;
  nonConventionnes: number;
  realisees: number;
  annulees: number;
  recetteEstimee: number;
  recetteConventionnee: number;
  recetteNonConventionnee: number;
}

export interface MonthStats {
  monthKey: string; // YYYY-MM
  monthName: string;
  total: number;
  conventionnes: number;
  nonConventionnes: number;
  realisees: number;
  annulees: number;
  recetteEstimee: number;
  recetteConventionnee: number;
  recetteNonConventionnee: number;
}
