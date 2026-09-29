import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Session, Patient, CabinetSettings } from '../types';
import { formatFrenchDate, parseDateISO, formatDateISO, getMondayOfWeek, getWeekDays } from './dateUtils';

interface ExportContext {
  activeTab: 'planning' | 'simultane' | 'patients' | 'dashboard' | 'settings';
  sessions: Session[];
  patients: Patient[];
  settings: CabinetSettings;
  currentDate?: string; // YYYY-MM-DD
}

/**
 * Configure les en-têtes et le pied de page institutionnel du cabinet Belgaied Maroua
 */
const addCabinetHeader = (
  doc: jsPDF,
  title: string,
  subtitle: string,
  metaInfo?: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Bandeau supérieur décoratif
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

const addCabinetFooter = (doc: jsPDF) => {
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
 * 1. Export Planning & Séances (Semaine, Journée ou Mois)
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
  const realisees = filteredSessions.filter((s) => s.status === 'realisee').length;
  const cnam = filteredSessions.filter((s) => s.isConventionne).length;
  const totalRecettes = filteredSessions.filter((s) => s.status !== 'annulee').reduce((sum, s) => sum + s.tarif, 0);

  const meta = `Généré le ${formatFrenchDate(new Date(), true)} • ${total} séances (${cnam} CNAM • ${total - cnam} Privé) • ${totalRecettes} ${settings.devise}`;

  addCabinetHeader(doc, title, subtitle, meta);

  // Construire les lignes du tableau
  const rows = filteredSessions.map((s, idx) => {
    const p = patients.find((pat) => pat.id === s.patientId);
    const phone = p?.telephone || s.patientNom;
    const ortho = s.orthophonisteNom || (s.position === 2 ? 'Mariem' : s.position === 3 ? 'Stagiaire' : 'Maroua');
    const statusLabel = s.status === 'realisee' ? 'Effectuée' : s.status === 'planifiee' ? 'Planifiée' : 'Annulée';

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
      fillColor: [248, 250, 252], // Slate 50
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
 * 2. Export Registre des Patients
 */
export const exportPatientsPDF = (
  patients: Patient[],
  sessions: Session[],
  settings: CabinetSettings
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const totalPatients = patients.length;
  const conventionnes = patients.filter((p) => p.isConventionne).length;
  const prives = totalPatients - conventionnes;

  const title = "Registre Général des Dossiers Patients";
  const subtitle = `Total : ${totalPatients} patients enregistrés (${conventionnes} Conventionnés CNAM • ${prives} Privés)`;
  const meta = `Cabinet d'orthophonie Belgaied Maroua • Extrait du ${formatFrenchDate(new Date(), true)}`;

  addCabinetHeader(doc, title, subtitle, meta);

  // Trier les patients par nom
  const sortedPatients = [...patients].sort((a, b) => a.nom.localeCompare(b.nom));

  const rows = sortedPatients.map((p, idx) => {
    const patientSessions = sessions.filter((s) => s.patientId === p.id);
    const effectuees = patientSessions.filter((s) => s.status === 'realisee').length;
    const planifiees = patientSessions.filter((s) => s.status === 'planifiee').length;

    return [
      (idx + 1).toString(),
      p.nom,
      p.dateNaissance ? formatFrenchDate(parseDateISO(p.dateNaissance)) : '-',
      p.telephone || '-',
      p.isConventionne ? 'Conventionné CNAM' : 'Privé',
      p.numeroAssurance || p.assuranceDetails || '-',
      p.pathologie || 'Non précisé',
      p.notes || '-',
      `${effectuees} faites / ${planifiees} planif.`
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Nom & Prénom', 'Date Naiss.', 'Téléphone', 'Prise en charge', 'Assurance / N°', 'Diagnostic / Pathologie', 'Observations', 'Séances']],
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
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 26 },
      4: { cellWidth: 32 },
      5: { cellWidth: 28 },
      6: { cellWidth: 45 },
      7: { cellWidth: 35 },
      8: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  addCabinetFooter(doc);

  doc.save(`Patients_Cabinet_Belgaied_${formatDateISO(new Date())}.pdf`);
};

/**
 * 3. Export Bilan & Statistiques Clés (Dashboard)
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
  const realisees = sessions.filter((s) => s.status === 'realisee').length;
  const conventionnees = sessions.filter((s) => s.isConventionne).length;
  const privees = totalSessions - conventionnees;
  const honorairesRealises = sessions
    .filter((s) => s.status === 'realisee')
    .reduce((sum, s) => sum + s.tarif, 0);
  const honorairesGlobaux = sessions
    .filter((s) => s.status !== 'annulee')
    .reduce((sum, s) => sum + s.tarif, 0);

  const totalHeuresSoins = (realisees * 45) / 60;

  const title = "Bilan d'Activité Médicale & Statistiques";
  const subtitle = `Rapport global du Cabinet • Date de référence : ${formatFrenchDate(parseDateISO(currentDateStr), true)}`;
  const meta = `Édité le ${formatFrenchDate(new Date(), true)}`;

  addCabinetHeader(doc, title, subtitle, meta);

  // Bloc résumé indicateurs clés (Rectangles KPI)
  const startY = 48;
  const colWidth = (pageWidth - 28 - 6) / 3;

  const kpis = [
    { label: 'Séances Réalisées', value: `${realisees} / ${totalSessions}`, sub: `${Math.round((realisees / (totalSessions || 1)) * 100)}% de réalisation` },
    { label: 'Heures de Soins', value: `${totalHeuresSoins.toFixed(1)} h`, sub: 'Base 45 min par séance' },
    { label: 'Honoraires Encaissés', value: `${honorairesRealises} ${settings.devise}`, sub: `Prévisionnel : ${honorairesGlobaux} ${settings.devise}` },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (colWidth + 3);
    doc.setFillColor(241, 245, 249); // Slate 100
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
    const nDone = match.filter((s) => s.status === 'realisee').length;
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

  // Tableau 2 : Répartition des pathologies prises en charge
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
 * Fonction universelle d'export selon le contexte actif
 */
export const triggerExportPDF = (ctx: ExportContext) => {
  const { activeTab, sessions, patients, settings, currentDate } = ctx;

  switch (activeTab) {
    case 'planning':
    case 'simultane':
      exportPlanningPDF(sessions, patients, settings, currentDate || '2026-09-29', activeTab === 'simultane');
      break;
    case 'patients':
      exportPatientsPDF(patients, sessions, settings);
      break;
    case 'dashboard':
    default:
      exportDashboardPDF(sessions, patients, settings, currentDate || '2026-09-29');
      break;
  }
};
