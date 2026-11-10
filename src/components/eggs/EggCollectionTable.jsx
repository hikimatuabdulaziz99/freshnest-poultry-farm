import { useState } from 'react';
import {
  Search,
  Download,
  Eye,
  Sliders,
  Trash2,
  Egg,
  Edit3,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './EggCollectionTable.module.css';

/**
 * Egg Collection Table with Batch & Date filtering, CSV Export,
 * and direct Grading & Inspection Actions
 */
export function EggCollectionTable({
  logs = [],
  batches = [],
  onViewDetails,
  onEditLog,
  onGradeLog,
  onDeleteLog,
  onExportCSV,
  onAddLog,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter logs locally for instant reactivity
  const filteredLogs = logs.filter((l) => {
    if (selectedBatch && String(l.batchId) !== String(selectedBatch) && l.batchCode !== selectedBatch) {
      return false;
    }
    if (startDate && l.collectionDate < startDate) {
      return false;
    }
    if (endDate && l.collectionDate > endDate) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchId = l.logId && l.logId.toLowerCase().includes(q);
      const matchBatch = l.batchCode && l.batchCode.toLowerCase().includes(q);
      const matchRec = l.recordedBy && l.recordedBy.toLowerCase().includes(q);
      const matchNotes = l.notes && l.notes.toLowerCase().includes(q);
      if (!matchId && !matchBatch && !matchRec && !matchNotes) return false;
    }
    return true;
  });

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeaderBar}>
        <div className={styles.searchFilterGroup}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by Log ID, batch, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className={styles.selectInput}
          >
            <option value="">All Cohort Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchCode || b.name} ({b.birdType})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.dateInput}
            title="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.dateInput}
            title="End Date"
          />
        </div>

        <div className={styles.actionButtonGroup}>
          <button
            type="button"
            onClick={onExportCSV}
            className={styles.btnSecondary}
            title="Export CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className={styles.responsiveTableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Collection Date</th>
              <th>Batch / Flock</th>
              <th>Sessions (M/A/E)</th>
              <th>Total Eggs</th>
              <th>Good Eggs</th>
              <th>Defects (C/D/Dam)</th>
              <th>Laying % (HDP)</th>
              <th>Grading Status</th>
              <th>Recorded By</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const total = log.totalCollected ?? log.totalEggs ?? 0;
                const crates = Math.floor(total / 30);
                const loose = total % 30;
                const hdp = log.layingRate ?? 0;

                let hdpClass = styles.hdpHigh;
                if (hdp < 65) hdpClass = styles.hdpLow;
                else if (hdp < 80) hdpClass = styles.hdpMed;

                return (
                  <tr key={log.id || log.logId}>
                    <td>
                      <span className={styles.logIdTag}>{log.logId}</span>
                    </td>
                    <td>{log.collectionDate}</td>
                    <td>
                      <div className={styles.batchBadge}>
                        <span className={styles.batchCode}>{log.batchCode}</span>
                        <span className={styles.batchSub}>{log.breed} · {log.penName}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.sessionPills}>
                        <span className={styles.sessionPill} title="Morning">M: {log.morningCollection || 0}</span>
                        <span className={styles.sessionPill} title="Afternoon">A: {log.afternoonCollection || 0}</span>
                        <span className={styles.sessionPill} title="Evening">E: {log.eveningCollection || 0}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.totalEggCount}>{formatNumber(total)}</span>
                      <span className={styles.crateSub}>
                        {crates} crates{loose > 0 ? `, ${loose} loose` : ''}
                      </span>
                    </td>
                    <td>
                      <span className={styles.goodBadge}>{formatNumber(log.goodEggs || 0)}</span>
                    </td>
                    <td>
                      <div className={styles.defectsGroup}>
                        <span className={`${styles.defectTag} ${styles.tagCracked}`} title="Cracked">
                          {log.crackedEggs || 0}c
                        </span>
                        <span className={`${styles.defectTag} ${styles.tagDirty}`} title="Dirty">
                          {log.dirtyEggs || 0}d
                        </span>
                        <span className={`${styles.defectTag} ${styles.tagDamaged}`} title="Damaged">
                          {log.damagedEggs || 0}x
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.hdpBadge} ${hdpClass}`}>
                        {hdp}%
                      </span>
                    </td>
                    <td>
                      {log.graded ? (
                        <span className={styles.gradedBadge}>
                          Graded (A:{log.gradeA || 0}, B:{log.gradeB || 0})
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.ungradedBtn}
                          onClick={() => onGradeLog && onGradeLog(log)}
                        >
                          Grade Now
                        </button>
                      )}
                    </td>
                    <td>{log.recordedBy || 'Staff'}</td>
                    <td>
                      <div className={styles.actionButtons} style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          title="View Details"
                          onClick={() => onViewDetails && onViewDetails(log)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          title="Edit Collection"
                          onClick={() => onEditLog && onEditLog(log)}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          title="Grade Eggs"
                          onClick={() => onGradeLog && onGradeLog(log)}
                        >
                          <Sliders size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          title="Delete Collection"
                          onClick={() => onDeleteLog && onDeleteLog(log)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11}>
                  <div className={styles.emptyState}>
                    <Egg size={40} className={styles.emptyIcon} />
                    <h4 className={styles.emptyTitle}>No Egg Collection Logs Found</h4>
                    <p className={styles.emptySubtext}>
                      {logs.length === 0
                        ? 'No egg collection logs have been recorded yet. Click "Log Daily Collection" to enter morning, afternoon, and evening collection counts.'
                        : 'No collection records match your current search and filter criteria.'}
                    </p>
                    {logs.length === 0 && onAddLog && (
                      <button
                        type="button"
                        onClick={onAddLog}
                        className={styles.btnSecondary}
                        style={{ backgroundColor: 'var(--color-primary, #1b4332)', color: '#ffffff', margin: '0 auto' }}
                      >
                        Log First Daily Collection
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
