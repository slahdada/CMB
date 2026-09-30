import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Session, Patient, CabinetSettings, PatientCreanceSummary, PaymentStatus } from '../types';
import { formatFrenchDate, parseDateISO, formatDateISO, getMondayOfWeek, getWeekDays } from './dateUtils';
import { isEffectuee, OrthoSummaryMetrics } from '../context/SessionsContext';

export interface ExportContext {
  activeTab: 'planning' | 'simultane' | 'patients' | 'dashboard' | 'creances' | 'settings';
  sessions: Session[];
  patients: Patient[];
  settings: CabinetSettings;
  currentDate?: string; // YYYY-MM-DD
}

export interface CustomTableExportOptions {
  title: string;
  subtitle?: string;
  metaInfo?: string;
  headers: string[];
  rows: (string | number)[][];
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  columnStyles?: Record<number, any>;
}

/**
 * Configure les en-têtes officiels du cabinet Belgaied Maroua
 */
export const addCabinetHeader = (
  doc: jsPDF,
  title: string,
  subtitle: string,
  metaInfo?: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Bandeau supérieur décoratif Teal
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Titre principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("Cabinet d'orthophonie Belgaied Maroua", 14, 18);

  // Spécialité et contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Rééducation du langage oral et écrit • Fluence • Voix • CNAM & Prise en charge conventionnée", 14, 24);

  // Ligne de séparation fine
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(14, 28, pageWidth - 14, 28);

  // Sous-titre du document
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(13, 148, 136); // Teal 600
  doc.text(title, 14, 36);

  // Détails de période / contexte
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(subtitle, 14, 42);

  if (metaInfo) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(metaInfo, pageWidth - 14, 42, { align: 'right' });
  }
};

export const addCabinetFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Cabinet d'orthophonie Belgaied Maroua - Document officiel généré automatiquement", 14, pageHeight - 7);
    doc.text(`Page ${i} sur ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
};

/**
 * Générateur de tableau générique et modulaire
 */
export const exportCustomTablePDF = (options: CustomTableExportOptions) => {
  const {
    title,
    subtitle = "Extrait de données du cabinet",
    metaInfo = `Généré le ${formatFrenchDate(new Date(), true)}`,
    headers,
    rows,
    filename = `Export_${Date.now()}.pdf`,
    orientation = 'landscape',
    columnStyles,
  } = options;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  addCabinetHeader(doc, title, subtitle, metaInfo);

  autoTable(doc, {
    startY: 48,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Teal 700
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    columnStyles: columnStyles || {},
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addCabinetFooter(doc);
  doc.save(filename);
};

/**
 * 1. Export Fiche Individuelle de Patient (Dossier Clinique & Historique des Séances)
 */
export const exportSinglePatientPDF = (
  patient: Patient,
  sessions: Session[],
  settings: CabinetSettings
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const patientSessions = sessions
    .filter((s) => s.patientId === patient.id || s.patientNom.trim().toLowerCase() === patient.nom.trim().toLowerCase())
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

  const totalSessions = patientSessions.length;
  const effectuees = patientSessions.filter((s) => isEffectuee(s.status)).length;
  const planifiees = patientSessions.filter((s) => s.status === 'planifiee').length;
  const annulees = patientSessions.filter((s) => s.status === 'annulee' || s.status === 'absent').length;
  const totalPrescrites = patient.nombreSeancesPrescrites || 30;
  const progressionPct = Math.round((effectuees / totalPrescrites) * 100);
  const totalHeures = (effectuees * 45) / 60;
  const totalHonoraires = patientSessions
    .filter((s) => isEffectuee(s.status))
    .reduce((sum, s) => sum + s.tarif, 0);

  const title = `Fiche Dossier Patient : ${patient.nom}`;
  const subtitle = `Prise en charge ${patient.isConventionne ? 'Conventionnée CNAM' : 'Privée'} • ${patient.pathologie || 'Orthophonie'}`;
  const meta = `Dossier N° ${patient.id} • Édité le ${formatFrenchDate(new Date(), true)}`;

  addCabinetHeader(doc, title, subtitle, meta);

  // Cadre d'informations administratives et médicales
  const infoStartY = 48;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, infoStartY, pageWidth - 28, 40, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, infoStartY, pageWidth - 28, 40, 2, 2, 'S');

  // Colonne Gauche : Identité
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("IDENTITÉ & CONTACT", 18, infoStartY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nom & Prénom :`, 18, infoStartY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(patient.nom, 46, infoStartY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Téléphone :`, 18, infoStartY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.telephone || 'Non renseigné', 46, infoStartY + 18);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date naissance :`, 18, infoStartY + 24);
  doc.setFont('helvetica', 'bold');
  const dateNaissStr = patient.dateNaissance ? `${formatFrenchDate(parseDateISO(patient.dateNaissance))} (${patient.age || '-'} ans)` : '-';
  doc.text(dateNaissStr, 46, infoStartY + 24);

  doc.setFont('helvetica', 'normal');
  doc.text(`Statut dossier :`, 18, infoStartY + 30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(patient.status === 'actif' ? 'Actif en rééducation' : patient.status === 'termine' ? 'Terminé' : 'En attente', 46, infoStartY + 30);

  // Colonne Droite : Prise en charge CNAM / Assurance & Pathologie
  const midX = 105;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("PRISE EN CHARGE & DIAGNOSTIC", midX, infoStartY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Régime :`, midX, infoStartY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(patient.isConventionne ? 13 : 71, patient.isConventionne ? 148 : 85, patient.isConventionne ? 136 : 105);
  doc.text(patient.isConventionne ? 'Conventionné CNAM' : 'Privé / Non conventionné', midX + 28, infoStartY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Détails / N° Adh :`, midX, infoStartY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${patient.assuranceDetails || 'CNAM'} ${patient.numeroAssurance ? `(N° ${patient.numeroAssurance})` : ''}`, midX + 28, infoStartY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Pathologie :`, midX, infoStartY + 24);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.pathologie || 'Bilan / Rééducation orthophonique', midX + 28, infoStartY + 24);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Observations :`, midX, infoStartY + 30);
  doc.text(patient.notes || 'Aucune observation particulière', midX + 28, infoStartY + 30, { maxWidth: pageWidth - midX - 32 });

  // 3 Cartes KPI de Progression du patient
  const kpiStartY = infoStartY + 44;
  const colW = (pageWidth - 28 - 6) / 3;

  const kpis = [
    { label: 'PROGRESSION SÉANCES', val: `${effectuees} / ${totalPrescrites}`, sub: `${progressionPct}% réalisé (${planifiees} prévues)` },
    { label: 'VOLUME DE SOINS', val: `${totalHeures.toFixed(1)} h`, sub: 'Durée 45 min par séance' },
    { label: 'HONORAIRES ENCAISSÉS', val: `${totalHonoraires} ${settings.devise}`, sub: `Tarif : ${patient.isConventionne ? settings.tarifConventionne : settings.tarifNonConventionne} ${settings.devise} / séance` },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (colW + 3);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, kpiStartY, colW, 19, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, kpiStartY, colW, 19, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3.5, kpiStartY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 3.5, kpiStartY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(13, 148, 136);
    doc.text(kpi.sub, x + 3.5, kpiStartY + 16);
  });

  // Tableau de l'historique complet des séances du patient
  const tableRows = patientSessions.map((s, idx) => {
    const isDone = isEffectuee(s.status);
    const ortho = s.orthophonisteNom || (s.position === 2 ? 'Mariem' : s.position === 3 ? 'Stagiaire' : 'Maroua');
    const statusTxt = isDone ? 'Effectuée' : s.status === 'annulee' ? 'Annulée' : 'Planifiée';

    return [
      (idx + 1).toString(),
      formatFrenchDate(parseDateISO(s.date)),
      `${s.startTime} - ${s.endTime}`,
      ortho,
      statusTxt,
      `${s.tarif} ${settings.devise}`,
      s.notesSeance || s.motif || 'Séance de rééducation'
    ];
  });

  autoTable(doc, {
    startY: kpiStartY + 24,
    head: [['#', 'Date', 'Horaire (45m)', 'Orthophoniste', 'Statut', 'Tarif', 'Objectif & Notes de séance']],
    body: tableRows.length > 0 ? tableRows : [['-', '-', '-', '-', '-', '-', 'Aucune séance enregistrée à ce jour']],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addCabinetFooter(doc);

  const cleanName = patient.nom.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Fiche_Patient_${cleanName}_${formatDateISO(new Date())}.pdf`);
};

/**
 * 2. Export Liste des Patients Filtrée
 */
export const exportPatientsFilteredPDF = (
  patients: Patient[],
  sessions: Session[],
  settings: CabinetSettings,
  filterType: 'all' | 'conventionne' | 'prive' = 'all',
  searchQuery: string = ''
) => {
  const filterLabel = filterType === 'conventionne' 
    ? 'Patients Conventionnés CNAM' 
    : filterType === 'prive' 
    ? 'Patients Privés (Non-conventionnés)' 
    : 'Registre Complet de Tous les Patients';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const totalPatients = patients.length;
  const conventionnes = patients.filter((p) => p.isConventionne).length;
  const prives = totalPatients - conventionnes;

  const title = filterLabel;
  const subtitle = `Total affiché : ${patients.length} dossier(s) • (${conventionnes} CNAM • ${prives} Privé)${searchQuery ? ` • Recherche : "${searchQuery}"` : ''}`;
  const meta = `Cabinet d'orthophonie Belgaied Maroua • Extrait du ${formatFrenchDate(new Date(), true)}`;

  addCabinetHeader(doc, title, subtitle, meta);

  const sortedPatients = [...patients].sort((a, b) => a.nom.localeCompare(b.nom));

  const rows = sortedPatients.map((p, idx) => {
    const patientSessions = sessions.filter((s) => s.patientId === p.id);
    const effectuees = patientSessions.filter((s) => isEffectuee(s.status)).length;
    const planifiees = patientSessions.filter((s) => s.status === 'planifiee').length;
    const totalPrescrites = p.nombreSeancesPrescrites || 30;
    const pct = Math.round((effectuees / totalPrescrites) * 100);

    return [
      (idx + 1).toString(),
      p.nom,
      p.dateNaissance ? `${formatFrenchDate(parseDateISO(p.dateNaissance))} (${p.age || '-'} ans)` : '-',
      p.telephone || '-',
      p.isConventionne ? 'CNAM' : 'Privé',
      p.numeroAssurance || p.assuranceDetails || '-',
      p.pathologie || 'Non précisé',
      `${effectuees}/${totalPrescrites} (${pct}%)`,
      p.notes || '-'
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Nom & Prénom', 'Date Naissance', 'Téléphone', 'Régime', 'Assurance / N° Adhérent', 'Diagnostic / Pathologie', 'Progression', 'Observations']],
    body: rows.length > 0 ? rows : [['-', 'Aucun patient correspondant au filtre', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 32 },
      6: { cellWidth: 45 },
      7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addCabinetFooter(doc);
  doc.save(`Patients_Filtre_${filterType}_${formatDateISO(new Date())}.pdf`);
};

/**
 * 3. Export Planning & Séances (Semaine, Journée ou Mois)
 */
export const exportPlanningPDF = (
  sessions: Session[],
  patients: Patient[],
  settings: CabinetSettings,
  targetDate: string = '2026-09-29',
  periodMode: 'jour' | 'semaine' | 'mois' | boolean = 'semaine'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const parsedDate = parseDateISO(targetDate);

  let filteredSessions: Session[] = [];
  let title = '';
  let subtitle = '';

  const mode = typeof periodMode === 'boolean' ? (periodMode ? 'jour' : 'semaine') : periodMode;

  if (mode === 'jour') {
    filteredSessions = sessions.filter((s) => s.date === targetDate);
    title = `Planning Quotidien des Séances (45 min)`;
    subtitle = `Journée du ${formatFrenchDate(parsedDate, true)}`;
  } else if (mode === 'mois') {
    const y = parsedDate.getFullYear();
    const m = parsedDate.getMonth();
    filteredSessions = sessions.filter((s) => {
      const d = parseDateISO(s.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    title = `Planning Mensuel des Séances (45 min)`;
    subtitle = `Mois de ${parsedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  } else {
    const monday = getMondayOfWeek(parsedDate);
    const weekDays = getWeekDays(monday);
    const weekDates = weekDays.map((d) => formatDateISO(d));
    filteredSessions = sessions.filter((s) => weekDates.includes(s.date));
    title = `Planning Hebdomadaire des Séances (45 min)`;
    subtitle = `Semaine du ${formatFrenchDate(monday)} au ${formatFrenchDate(weekDays[weekDays.length - 1])}`;
  }

  // Trier chronologiquement (Date puis heure puis position)
  filteredSessions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return (a.position || 1) - (b.position || 1);
  });

  const total = filteredSessions.length;
  const realisees = filteredSessions.filter((s) => isEffectuee(s.status)).length;
  const cnam = filteredSessions.filter((s) => s.isConventionne).length;
  const totalRecettes = filteredSessions.filter((s) => s.status !== 'annulee').reduce((sum, s) => sum + s.tarif, 0);

  const meta = `Généré le ${formatFrenchDate(new Date(), true)} • ${total} séances (${cnam} CNAM • ${total - cnam} Privé) • ${totalRecettes} ${settings.devise}`;

  addCabinetHeader(doc, title, subtitle, meta);

  const rows = filteredSessions.map((s, idx) => {
    const p = patients.find((pat) => pat.id === s.patientId);
    const ortho = s.orthophonisteNom || (s.position === 2 ? 'Mariem' : s.position === 3 ? 'Stagiaire' : 'Maroua');
    const isDone = isEffectuee(s.status);
    const statusLabel = isDone ? 'Effectuée' : s.status === 'planifiee' ? 'Planifiée' : 'Annulée';

    return [
      (idx + 1).toString(),
      formatFrenchDate(parseDateISO(s.date)),
      `${s.startTime} - ${s.endTime}`,
      s.patientNom,
      p?.telephone || '-',
      ortho,
      s.isConventionne ? 'CNAM' : 'Privé',
      `${s.tarif} ${settings.devise}`,
      statusLabel,
      s.notesSeance || s.motif || '-'
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Date', 'Horaire (45m)', 'Patient', 'Téléphone', 'Orthophoniste', 'Régime', 'Tarif', 'Statut', 'Observations']],
    body: rows.length > 0 ? rows : [['-', '-', '-', 'Aucune séance trouvée pour cette période', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [13, 148, 136], // Teal 600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 24, fontStyle: 'bold' },
      3: { cellWidth: 38, fontStyle: 'bold' },
      4: { cellWidth: 24 },
      5: { cellWidth: 26 },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 20, halign: 'center' },
      9: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addCabinetFooter(doc);

  const filename = mode === 'jour'
    ? `Planning_Jour_Cabinet_Belgaied_${targetDate}.pdf`
    : mode === 'mois'
    ? `Planning_Mois_Cabinet_Belgaied_${targetDate}.pdf`
    : `Planning_Hebdo_Cabinet_Belgaied_${targetDate}.pdf`;

  doc.save(filename);
};

/**
 * 4. Export Agenda Triple Simultané (3 Orthophonistes)
 */
export const exportTripleAgendaPDF = (
  sessions: Session[],
  patients: Patient[],
  settings: CabinetSettings,
  targetDate: string = '2026-09-29'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const parsedDate = parseDateISO(targetDate);

  const daySessions = sessions.filter((s) => s.date === targetDate && s.status !== 'annulee');
  const total = daySessions.length;
  const done = daySessions.filter((s) => isEffectuee(s.status)).length;

  const title = `Agenda Triple Simultané : 3 Orthophonistes`;
  const subtitle = `Grille des consultations du ${formatFrenchDate(parsedDate, true)} • Séances fixes de 45 minutes`;
  const meta = `${total} séances programmées (${done} effectuées) • Édité le ${formatFrenchDate(new Date(), true)}`;

  addCabinetHeader(doc, title, subtitle, meta);

  // Standard hours
  const STANDARD_HOURS = [
    { start: '08:30', end: '09:15' },
    { start: '09:15', end: '10:00' },
    { start: '10:00', end: '10:45' },
    { start: '10:45', end: '11:30' },
    { start: '11:30', end: '12:15' },
    { start: '14:00', end: '14:45' },
    { start: '14:45', end: '15:30' },
    { start: '15:30', end: '16:15' },
    { start: '16:15', end: '17:00' },
    { start: '17:00', end: '17:45' },
  ];

  const rows = STANDARD_HOURS.map((h) => {
    const slotSessions = daySessions.filter((s) => s.startTime === h.start);
    
    // Find session for Maroua (Pos 1), Mariem (Pos 2), Stagiaire (Pos 3)
    const s1 = slotSessions.find((s) => (s.orthophonisteNom || '').toLowerCase().includes('maroua') || s.position === 1);
    const s2 = slotSessions.find((s) => (s.orthophonisteNom || '').toLowerCase().includes('mariem') || s.position === 2);
    const s3 = slotSessions.find((s) => (s.orthophonisteNom || '').toLowerCase().includes('stagiaire') || s.position === 3);

    const formatSlot = (s?: Session) => {
      if (!s || !s.patientNom) return '-';
      const statusIcon = isEffectuee(s.status) ? '[✓ Effectuée]' : '[Planifiée]';
      const reg = s.isConventionne ? '(CNAM)' : '(Privé)';
      return `${s.patientNom} ${reg} ${statusIcon}`;
    };

    return [
      `${h.start} - ${h.end}`,
      formatSlot(s1),
      formatSlot(s2),
      formatSlot(s3)
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [['Créneau (45 min)', 'Position 1 : Maroua (Titulaire)', 'Position 2 : Mariem (Collaboratrice)', 'Position 3 : Stagiaire']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 80 },
      2: { cellWidth: 80 },
      3: { cellWidth: 80 },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addCabinetFooter(doc);
  doc.save(`Agenda_Triple_Simultane_${targetDate}.pdf`);
};

/**
 * 5. Export Bilan Période & Activité par Orthophoniste
 */
export const exportOrthoStatsPeriodPDF = (
  periodLabel: string,
  orthoStatsList: OrthoSummaryMetrics[],
  totalGlobal: number,
  totalDone: number,
  totalHours: number,
  totalRecette: number,
  settings: CabinetSettings
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const title = `Bilan d'Activité par Orthophoniste`;
  const subtitle = `${periodLabel} • Séances de 45 minutes fixes`;
  const meta = `${totalDone} / ${totalGlobal} séances réalisées • Édité le ${formatFrenchDate(new Date(), true)}`;

  addCabinetHeader(doc, title, subtitle, meta);

  // Cartes KPI
  const startY = 48;
  const colW = (pageWidth - 28 - 6) / 3;

  const kpis = [
    { label: 'SÉANCES EFFECTUÉES', val: `${totalDone} / ${totalGlobal}`, sub: `${totalGlobal > 0 ? Math.round((totalDone / totalGlobal) * 100) : 0}% de réalisation` },
    { label: 'HEURES DE SOINS', val: `${totalHours.toFixed(1)} h`, sub: 'Durée 45 min / séance' },
    { label: 'HONORAIRES DU CABINET', val: `${totalRecette} ${settings.devise}`, sub: 'Recettes estimées sur la période' },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (colW + 3);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, startY, colW, 20, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, startY, colW, 20, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 4, startY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 4, startY + 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(13, 148, 136);
    doc.text(kpi.sub, x + 4, startY + 17.5);
  });

  const tableRows = orthoStatsList.map((o) => {
    const pct = o.total > 0 ? Math.round((o.realisees / o.total) * 100) : 0;
    return [
      `${o.nom} (${o.role})`,
      o.realisees.toString(),
      o.total.toString(),
      `${pct} %`,
      `${o.heuresEffectuees.toFixed(1)} h`,
      `${o.conventionnes} CNAM / ${o.nonConventionnes} Privé`,
      `${o.recetteEstimee} ${settings.devise}`,
    ];
  });

  autoTable(doc, {
    startY: startY + 26,
    head: [['Orthophoniste', 'Séances faites', 'Total attribuées', 'Taux', 'Heures de rééducation', 'Prise en charge', 'Honoraires']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    margin: { left: 14, right: 14 },
  });

  addCabinetFooter(doc);
  doc.save(`Activite_Orthophonistes_${formatDateISO(new Date())}.pdf`);
};

/**
 * 6. Export Bilan & Statistiques Clés (Dashboard Global)
 */
export const exportDashboardPDF = (
  sessions: Session[],
  patients: Patient[],
  settings: CabinetSettings,
  currentDateStr: string = '2026-09-29'
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const totalSessions = sessions.length;
  const realisees = sessions.filter((s) => isEffectuee(s.status)).length;
  const conventionnees = sessions.filter((s) => s.isConventionne).length;
  const honorairesRealises = sessions
    .filter((s) => isEffectuee(s.status))
    .reduce((sum, s) => sum + s.tarif, 0);
  const honorairesGlobaux = sessions
    .filter((s) => s.status !== 'annulee')
    .reduce((sum, s) => sum + s.tarif, 0);

  const totalHeuresSoins = (realisees * 45) / 60;

  const title = "Bilan d'Activité Médicale & Statistiques";
  const subtitle = `Rapport global du Cabinet • Date de référence : ${formatFrenchDate(parseDateISO(currentDateStr), true)}`;
  const meta = `Édité le ${formatFrenchDate(new Date(), true)}`;

  addCabinetHeader(doc, title, subtitle, meta);

  const startY = 48;
  const colWidth = (pageWidth - 28 - 6) / 3;

  const kpis = [
    { label: 'Séances Réalisées', value: `${realisees} / ${totalSessions}`, sub: `${Math.round((realisees / (totalSessions || 1)) * 100)}% de réalisation` },
    { label: 'Heures de Soins', value: `${totalHeuresSoins.toFixed(1)} h`, sub: 'Base 45 min par séance' },
    { label: 'Honoraires Encaissés', value: `${honorairesRealises} ${settings.devise}`, sub: `Prévisionnel : ${honorairesGlobaux} ${settings.devise}` },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (colWidth + 3);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, startY, colWidth, 22, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, startY, colWidth, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label.toUpperCase(), x + 4, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 4, startY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(13, 148, 136);
    doc.text(kpi.sub, x + 4, startY + 19);
  });

  // Tableau 1 : Répartition d'activité par Orthophoniste
  const orthoList = ['Maroua', 'Mariem', 'Stagiaire'];
  const orthoRows = orthoList.map((name) => {
    const match = sessions.filter(
      (s) => (s.orthophonisteNom || (s.position === 2 ? 'Mariem' : s.position === 3 ? 'Stagiaire' : 'Maroua')).toLowerCase() === name.toLowerCase()
    );
    const nTotal = match.length;
    const nDone = match.filter((s) => isEffectuee(s.status)).length;
    const nCnam = match.filter((s) => s.isConventionne).length;
    const nHours = (nDone * 45) / 60;
    const nRecette = match.filter((s) => s.status !== 'annulee').reduce((sum, s) => sum + s.tarif, 0);

    return [
      name === 'Maroua' ? 'Maroua (Titulaire)' : name === 'Mariem' ? 'Mariem (Collaboratrice)' : 'Stagiaire',
      nDone.toString(),
      nTotal.toString(),
      `${nHours.toFixed(1)} h`,
      `${nCnam} CNAM / ${nTotal - nCnam} Privé`,
      `${nRecette} ${settings.devise}`,
    ];
  });

  autoTable(doc, {
    startY: startY + 28,
    head: [['Praticien', 'Séances faites', 'Total attribuées', 'Heures de rééducation', 'Répartition Prise en charge', 'Honoraires']],
    body: orthoRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    margin: { left: 14, right: 14 },
  });

  // Tableau 2 : Répartition des pathologies
  const pathologieMap: Record<string, number> = {};
  patients.forEach((p) => {
    const patho = (p.pathologie || 'Non spécifié').trim();
    pathologieMap[patho] = (pathologieMap[patho] || 0) + 1;
  });

  const pathoRows = Object.entries(pathologieMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count], idx) => [
      (idx + 1).toString(),
      name,
      count.toString(),
      `${Math.round((count / (patients.length || 1)) * 100)} %`,
    ]);

  const afterTable1Y = (doc as any).lastAutoTable?.finalY || 120;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Top Pathologies & Motifs de consultation rééducative", 14, afterTable1Y + 10);

  autoTable(doc, {
    startY: afterTable1Y + 14,
    head: [['#', 'Diagnostic / Pathologie', 'Nombre de patients suivis', 'Proportion']],
    body: pathoRows,
    theme: 'striped',
    headStyles: {
      fillColor: [71, 85, 105],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2,
    },
    margin: { left: 14, right: 14 },
  });

  addCabinetFooter(doc);
  doc.save(`Statistiques_Cabinet_Belgaied_${formatDateISO(new Date())}.pdf`);
};

/**
 * Export Rapport de Suivi des Créances & Règlements Patients
 */
export const exportCreancesReportPDF = (
  creances: PatientCreanceSummary[],
  totals: {
    totalDu: number;
    totalPaye: number;
    totalReste: number;
    tauxRecouvrement: number;
    totalSeancesRealisees: number;
  },
  settings: CabinetSettings,
  filtersDescription?: string
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const title = "Rapport de Suivi des Créances Patients & Honoraires";
  const subtitle = filtersDescription || "État récapitulatif des séances réalisées, montants payés et soldes à recouvrer";
  const metaInfo = `Généré le ${formatFrenchDate(new Date(), true)} • ${creances.length} dossier(s)`;

  addCabinetHeader(doc, title, subtitle, metaInfo);

  // Synthèse KPI en bandeau
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(14, 46, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 46, pageWidth - 28, 14, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  doc.setTextColor(15, 23, 42);
  doc.text(`Total Facturé : ${totals.totalDu} ${settings.devise}`, 20, 55);

  doc.setTextColor(5, 150, 105); // Emerald
  doc.text(`Total Encaissé : ${totals.totalPaye} ${settings.devise}`, 85, 55);

  doc.setTextColor(225, 29, 72); // Rose / Red
  doc.text(`Reste à Recouvrer : ${totals.totalReste} ${settings.devise}`, 155, 55);

  doc.setTextColor(13, 148, 136); // Teal
  doc.text(`Taux Recouvrement : ${totals.tauxRecouvrement} %`, 230, 55);

  // Tableau des créances
  const tableRows = creances.map((c, idx) => {
    const orthos = c.orthophonistesList.join(', ') || 'Maroua';
    const regime = c.isConventionne ? 'Conventionné CNAM' : 'Privé';
    const statut = c.statutCreance === 'paye' ? 'Soldé ✓' : c.statutCreance === 'partiel' ? 'Partiel' : 'En attente';

    return [
      (idx + 1).toString(),
      c.patientNom,
      c.telephone,
      regime,
      orthos,
      `${c.seancesRealisees} faite(s)`,
      `${c.montantTotalDu} ${settings.devise}`,
      `${c.montantPaye} ${settings.devise}`,
      `${c.resteARecouvrer} ${settings.devise}`,
      statut,
    ];
  });

  autoTable(doc, {
    startY: 64,
    head: [[
      '#',
      'Patient',
      'Téléphone',
      'Régime',
      'Orthophoniste(s)',
      'Séances Réalisées',
      'Montant Dû',
      'Montant Payé',
      'Reste à Recouvrer',
      'Statut',
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Teal 700
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 28 },
      4: { cellWidth: 34 },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 26, halign: 'right' },
      8: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addCabinetFooter(doc);
  doc.save(`Rapport_Creances_Belgaied_${formatDateISO(new Date())}.pdf`);
};

/**
 * Fonction universelle d'export selon le contexte actif
 */
export const triggerExportPDF = (ctx: ExportContext) => {
  const { activeTab, sessions, patients, settings, currentDate } = ctx;

  switch (activeTab) {
    case 'planning':
      exportPlanningPDF(sessions, patients, settings, currentDate || '2026-09-29', 'semaine');
      break;
    case 'simultane':
      exportTripleAgendaPDF(sessions, patients, settings, currentDate || '2026-09-29');
      break;
    case 'patients':
      exportPatientsFilteredPDF(patients, sessions, settings, 'all');
      break;
    case 'creances': {
      const creancesList: PatientCreanceSummary[] = patients.map((p) => {
        const pSessions = sessions.filter(
          (s) => s.patientId === p.id || s.patientNom.trim().toLowerCase() === p.nom.trim().toLowerCase()
        );
        const orthos = Array.from(new Set(pSessions.map((s) => s.orthophonisteNom || 'Maroua')));
        const realises = pSessions.filter((s) => isEffectuee(s.status)).length;
        const totalDu = pSessions
          .filter((s) => isEffectuee(s.status))
          .reduce((sum, s) => sum + s.tarif, 0);
        const montantPaye = pSessions
          .filter((s) => isEffectuee(s.status))
          .reduce((sum, s) => sum + (s.montantPaye ?? (s.isPaye ? s.tarif : 0)), 0);
        const reste = Math.max(0, totalDu - montantPaye);
        const statut: PaymentStatus = totalDu > 0 ? (reste === 0 ? 'paye' : montantPaye > 0 ? 'partiel' : 'en_attente') : 'paye';

        return {
          patientId: p.id,
          patientNom: p.nom,
          telephone: p.telephone,
          isConventionne: p.isConventionne,
          assuranceDetails: p.assuranceDetails,
          numeroAssurance: p.numeroAssurance,
          orthophonistesList: orthos.length > 0 ? orthos : ['Maroua'],
          totalSeances: pSessions.length,
          seancesRealisees: realises,
          seancesPlanifiees: pSessions.filter((s) => s.status === 'planifiee').length,
          seancesAnnulees: pSessions.filter((s) => s.status === 'annulee').length,
          montantTotalDu: totalDu,
          montantPaye,
          resteARecouvrer: reste,
          statutCreance: statut,
          sessionsList: pSessions,
        };
      });

      const totalDu = creancesList.reduce((acc, c) => acc + c.montantTotalDu, 0);
      const totalPaye = creancesList.reduce((acc, c) => acc + c.montantPaye, 0);
      const totalReste = creancesList.reduce((acc, c) => acc + c.resteARecouvrer, 0);
      const totalSeancesRealisees = creancesList.reduce((acc, c) => acc + c.seancesRealisees, 0);
      const tauxRecouvrement = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 100;

      exportCreancesReportPDF(
        creancesList,
        { totalDu, totalPaye, totalReste, totalSeancesRealisees, tauxRecouvrement },
        settings
      );
      break;
    }
    case 'dashboard':
    default:
      exportDashboardPDF(sessions, patients, settings, currentDate || '2026-09-29');
      break;
  }
};
