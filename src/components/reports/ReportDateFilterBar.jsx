import { useState } from 'react';
import {
  Calendar,
  Download,
  Printer,
  RefreshCw,
  Filter,
  Check,
} from 'lucide-react';
import { DATE_PRESETS } from '../../services/reportsService.js';
import styles from './ReportDateFilterBar.module.css';

export function ReportDateFilterBar({
  selectedPreset,
  onSelectPreset,
  startDate,
  endDate,
  onCustomDateChange,
  onExportCSV,
  onPrint,
  onRefresh,
  isExporting = false,
  isLoading = false,
}) {
  const [showCustomInputs, setShowCustomInputs] = useState(selectedPreset === DATE_PRESETS.CUSTOM);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const presets = [
    { id: DATE_PRESETS.TODAY, label: 'Today' },
    { id: DATE_PRESETS.THIS_WEEK, label: 'This Week' },
    { id: DATE_PRESETS.THIS_MONTH, label: 'This Month' },
    { id: DATE_PRESETS.LAST_MONTH, label: 'Last Month' },
    { id: DATE_PRESETS.THIS_YEAR, label: 'This Year' },
    { id: DATE_PRESETS.CUSTOM, label: 'Custom Range' },
  ];

  const handlePresetClick = (presetId) => {
    if (presetId === DATE_PRESETS.CUSTOM) {
      setShowCustomInputs(true);
      onSelectPreset(DATE_PRESETS.CUSTOM);
    } else {
      setShowCustomInputs(false);
      onSelectPreset(presetId);
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (localStart && localEnd) {
      onCustomDateChange(localStart, localEnd);
    }
  };

  return (
    <div className={styles.filterBarContainer}>
      <div className={styles.topRow}>
        {/* Preset Buttons */}
        <div className={styles.presetGroup}>
          <span className={styles.filterLabel}>
            <Filter size={14} className={styles.filterIcon} />
            Period:
          </span>
          <div className={styles.presetButtons}>
            {presets.map((p) => {
              const isActive = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.presetBtn} ${isActive ? styles.presetBtnActive : ''}`}
                  onClick={() => handlePresetClick(p.id)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons: Export, Print, Refresh */}
        <div className={styles.actionGroup}>
          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh Report Data"
          >
            <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={onPrint}
            title="Print or Save PDF"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnPrimary}
            onClick={onExportCSV}
            disabled={isExporting}
            title="Export Report Data as CSV"
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Row */}
      {showCustomInputs && (
        <form onSubmit={handleApplyCustom} className={styles.customDateForm}>
          <div className={styles.customInputsRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="custom-start-date" className={styles.dateLabel}>From Date</label>
              <input
                id="custom-start-date"
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                className={styles.dateInput}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="custom-end-date" className={styles.dateLabel}>To Date</label>
              <input
                id="custom-end-date"
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                className={styles.dateInput}
                required
              />
            </div>

            <button type="submit" className={styles.applyBtn}>
              <Check size={14} />
              <span>Apply Range</span>
            </button>
          </div>
        </form>
      )}

      {/* Date Span Indicator */}
      <div className={styles.dateSpanBanner}>
        <Calendar size={13} className={styles.calendarIcon} />
        <span>
          Showing records from <strong>{startDate}</strong> to <strong>{endDate}</strong> (inclusive)
        </span>
      </div>
    </div>
  );
}
