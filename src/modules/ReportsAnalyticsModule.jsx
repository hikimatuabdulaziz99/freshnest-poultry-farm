import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Bird,
  Layers,
  Wheat,
  Pill,
  Syringe,
  Egg,
  Activity,
  ShoppingBag,
  Receipt,
  Boxes,
  FileBarChart,
} from 'lucide-react';
import {
  reportsService,
  DATE_PRESETS,
  REPORT_TYPES,
  getDateRangeBounds,
} from '../services/reportsService.js';
import { PrintHeader } from '../components/reports/PrintHeader.jsx';
import { ReportDateFilterBar } from '../components/reports/ReportDateFilterBar.jsx';
import { ReportSummaryCards } from '../components/reports/ReportSummaryCards.jsx';
import { ReportCharts } from '../components/reports/ReportCharts.jsx';
import { ReportTableView } from '../components/reports/ReportTableView.jsx';
import styles from './ReportsAnalyticsModule.module.css';

const ICON_COMPONENTS = {
  LayoutDashboard,
  Bird,
  Layers,
  Wheat,
  Pill,
  Syringe,
  Egg,
  Activity,
  ShoppingBag,
  Receipt,
  Boxes,
  FileBarChart,
};

export function ReportsAnalyticsModule() {
  const [activeReportType, setActiveReportType] = useState('overview');
  const [datePreset, setDatePreset] = useState(DATE_PRESETS.THIS_MONTH);
  const [dateBounds, setDateBounds] = useState(() => getDateRangeBounds(DATE_PRESETS.THIS_MONTH));

  const [summaryData, setSummaryData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [chartsData, setChartsData] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Load report data
  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, report, charts] = await Promise.all([
        reportsService.getFarmPerformanceSummary(dateBounds),
        reportsService.getReportData(activeReportType, dateBounds),
        reportsService.getAnalyticsChartsData(dateBounds),
      ]);

      setSummaryData(summary);
      setReportData(report);
      setChartsData(charts);
    } catch (err) {
      console.error('Error loading report analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeReportType, dateBounds]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handle Preset selection
  const handleSelectPreset = (preset) => {
    setDatePreset(preset);
    if (preset !== DATE_PRESETS.CUSTOM) {
      const newBounds = getDateRangeBounds(preset);
      setDateBounds(newBounds);
    }
  };

  // Handle Custom date range change
  const handleCustomDateChange = (startDate, endDate) => {
    setDateBounds({
      startDate,
      endDate,
      preset: DATE_PRESETS.CUSTOM,
    });
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { filename, csvContent } = await reportsService.exportReportCSV(activeReportType, dateBounds);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.moduleRoot}>
      {/* 1. Printable Document Header (shown in print media and screen) */}
      <PrintHeader
        title={reportData?.title || 'Farm Performance & Analytics Report'}
        startDate={dateBounds.startDate}
        endDate={dateBounds.endDate}
      />

      {/* 2. Screen-only Header */}
      <div className={styles.screenHeader}>
        <div>
          <h2 className={styles.moduleTitle}>Reports & Analytics</h2>
          <p className={styles.moduleSubtitle}>
            Consolidated operational records, flock performance audits, and financial summaries
          </p>
        </div>
      </div>

      {/* 3. Report Category Navigation Tabs */}
      <div className={styles.reportCategoryBar}>
        {REPORT_TYPES.map((rep) => {
          const Icon = ICON_COMPONENTS[rep.icon] || FileBarChart;
          const isActive = activeReportType === rep.id;
          return (
            <button
              key={rep.id}
              type="button"
              className={`${styles.categoryTab} ${isActive ? styles.categoryTabActive : ''}`}
              onClick={() => setActiveReportType(rep.id)}
            >
              <Icon size={14} className={styles.tabIcon} />
              <span>{rep.label.replace(' Report', '')}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Date Range Filter Bar & Actions */}
      <ReportDateFilterBar
        selectedPreset={datePreset}
        onSelectPreset={handleSelectPreset}
        startDate={dateBounds.startDate}
        endDate={dateBounds.endDate}
        onCustomDateChange={handleCustomDateChange}
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
        onRefresh={loadReports}
        isExporting={isExporting}
        isLoading={isLoading}
      />

      {/* 5. Farm Performance Summary Cards */}
      <ReportSummaryCards summary={summaryData} isLoading={isLoading} />

      {/* 6. Interactive Production & Financial Charts */}
      {(activeReportType === 'overview' || activeReportType === 'financial') && (
        <ReportCharts chartsData={chartsData} isLoading={isLoading} />
      )}

      {/* 7. Detailed Report Table */}
      <ReportTableView
        reportType={activeReportType}
        reportData={reportData}
        isLoading={isLoading}
      />
    </div>
  );
}
