/**
 * Utilitaires pour les dates, créneaux de 45 minutes et WhatsApp
 */

// Format YYYY-MM-DD
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse YYYY-MM-DD
export function parseDateISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Ajoute 45 minutes exactement à une heure "HH:MM"
export function add45Minutes(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + 45;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Convertit "HH:MM" en minutes depuis minuit
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Créneaux types de 45 minutes pour une journée de cabinet
export const STANDARD_45_SLOTS: { start: string; end: string; label: string; period: 'matin' | 'aprem' }[] = [
  { start: '08:30', end: '09:15', label: '08h30 - 09h15', period: 'matin' },
  { start: '09:15', end: '10:00', label: '09h15 - 10h00', period: 'matin' },
  { start: '10:00', end: '10:45', label: '10h00 - 10h45', period: 'matin' },
  { start: '10:45', end: '11:30', label: '10h45 - 11h30', period: 'matin' },
  { start: '11:30', end: '12:15', label: '11h30 - 12h15', period: 'matin' },
  { start: '14:00', end: '14:45', label: '14h00 - 14h45', period: 'aprem' },
  { start: '14:45', end: '15:30', label: '14h45 - 15h30', period: 'aprem' },
  { start: '15:30', end: '16:15', label: '15h30 - 16h15', period: 'aprem' },
  { start: '16:15', end: '17:00', label: '16h15 - 17h00', period: 'aprem' },
  { start: '17:00', end: '17:45', label: '17h00 - 17h45', period: 'aprem' },
];

// Vérifie si deux plages horaires se chevauchent
export function isOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  const minStartA = timeToMinutes(startA);
  const minEndA = timeToMinutes(endA);
  const minStartB = timeToMinutes(startB);
  const minEndB = timeToMinutes(endB);
  return Math.max(minStartA, minStartB) < Math.min(minEndA, minEndB);
}

// Obtenir le lundi de la semaine contenant la date
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Dimanche = 0 -> diff = -6, sinon diff = 1 - day
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Obtenir les 6 jours de travail de la semaine (Lundi au Samedi)
export function getWeekDays(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

// Formatage en français
export function formatFrenchDate(date: Date, withYear = true): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  };
  return date.toLocaleDateString('fr-FR', options);
}

export function formatShortFrenchDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getMonthName(monthIndex: number, year: number): string {
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// Formatage propre du numéro pour WhatsApp (support indicatif Tunisie +216 ou international)
export function cleanWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('00216')) {
    cleaned = cleaned.replace(/^00216/, '216');
  } else if (!cleaned.startsWith('216') && cleaned.length === 8) {
    // Numéro tunisien standard à 8 chiffres (ex: 98123456 -> 21698123456)
    cleaned = `216${cleaned}`;
  }
  return cleaned;
}

// Créer le lien WhatsApp de rappel de séance
export function createWhatsAppReminderLink(
  patientNom: string,
  telephone: string,
  dateISO: string,
  heureDebut: string,
  heureFin: string
): string {
  const num = cleanWhatsAppNumber(telephone);
  const d = parseDateISO(dateISO);
  const dateStr = formatFrenchDate(d, false);
  const message = `Bonjour ${patientNom}, nous vous rappelons votre séance d'orthophonie au Cabinet Belgaied Maroua prévue le ${dateStr} de ${heureDebut} à ${heureFin}. Merci de nous informer au moins 24h à l'avance en cas d'empêchement. À bientôt !`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
