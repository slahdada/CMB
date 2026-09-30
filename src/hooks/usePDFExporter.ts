import { useCallback } from 'react';
import { Session, Patient, CabinetSettings } from '../types';
import { 
  exportSinglePatientPDF, 
  exportPatientsFilteredPDF, 
  exportPlanningPDF, 
  exportTripleAgendaPDF, 
  exportOrthoStatsPeriodPDF, 
  exportDashboardPDF,
  exportCustomTablePDF,
  CustomTableExportOptions,
  triggerExportPDF,
  ExportContext
} from '../utils/pdfExport';
import { OrthoSummaryMetrics } from '../context/SessionsContext';

export function usePDFExporter() {
  const exportPatient = useCallback((patient: Patient, sessions: Session[], settings: CabinetSettings) => {
    exportSinglePatientPDF(patient, sessions, settings);
  }, []);

  const exportPatientsList = useCallback((
    patients: Patient[],
    sessions: Session[],
    settings: CabinetSettings,
    filterType: 'all' | 'conventionne' | 'prive' = 'all',
    searchQuery: string = ''
  ) => {
    exportPatientsFilteredPDF(patients, sessions, settings, filterType, searchQuery);
  }, []);

  const exportPlanning = useCallback((
    sessions: Session[],
    patients: Patient[],
    settings: CabinetSettings,
    date: string = '2026-09-29',
    mode: 'jour' | 'semaine' | 'mois' = 'semaine'
  ) => {
    exportPlanningPDF(sessions, patients, settings, date, mode);
  }, []);

  const exportTripleAgenda = useCallback((
    sessions: Session[],
    patients: Patient[],
    settings: CabinetSettings,
    date: string = '2026-09-29'
  ) => {
    exportTripleAgendaPDF(sessions, patients, settings, date);
  }, []);

  const exportOrthoStats = useCallback((
    periodLabel: string,
    orthoStatsList: OrthoSummaryMetrics[],
    totalGlobal: number,
    totalDone: number,
    totalHours: number,
    totalRecette: number,
    settings: CabinetSettings
  ) => {
    exportOrthoStatsPeriodPDF(periodLabel, orthoStatsList, totalGlobal, totalDone, totalHours, totalRecette, settings);
  }, []);

  const exportDashboard = useCallback((
    sessions: Session[],
    patients: Patient[],
    settings: CabinetSettings,
    currentDateStr: string = '2026-09-29'
  ) => {
    exportDashboardPDF(sessions, patients, settings, currentDateStr);
  }, []);

  const exportCustomTable = useCallback((options: CustomTableExportOptions) => {
    exportCustomTablePDF(options);
  }, []);

  const triggerContextExport = useCallback((ctx: ExportContext) => {
    triggerExportPDF(ctx);
  }, []);

  return {
    exportPatient,
    exportPatientsList,
    exportPlanning,
    exportTripleAgenda,
    exportOrthoStats,
    exportDashboard,
    exportCustomTable,
    triggerContextExport,
  };
}
