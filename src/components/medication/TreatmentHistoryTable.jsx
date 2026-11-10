import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import styles from './TreatmentHistoryTable.module.css';

/**
 * Treatment Administration History Table
 * Tracks all historical flock & bird medication events and active food safety withdrawal holds
 */
export function TreatmentHistoryTable({ logs = [], onViewDetails }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState('All');
  const [selectedWithdrawalStatus, setSelectedWithdrawalStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();

  // Process logs with real-time withdrawal status
  const processedLogs = useMemo(() => {
    return logs.map((log) => {
      const isUnderHold =
        log.withdrawalPeriodDays > 0 &&
        log.withdrawalEndDate &&
        log.withdrawalEndDate >= todayStr;

      let daysRemaining = 0;
      if (isUnderHold) {
        const endDate = new Date(`${log.withdrawalEndDate}T23:59:59`);
        daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
      }

      return {
        ...log,
        isUnderHold,
        daysRemaining,
      };
    });
  }, [logs, todayStr, now]);

  // Filters
  const filteredLogs = useMemo(() => {
    return processedLogs.filter((log) => {
      if (selectedTargetType !== 'All' && log.targetType !== selectedTargetType) {
        return false;
      }

      if (selectedWithdrawalStatus === 'Active' && !log.isUnderHold) {
        return false;
      }

      if (selectedWithdrawalStatus === 'Cleared' && log.isUnderHold) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesLogId = (log.logId || '').toLowerCase().includes(q);
        const matchesMed = (log.medicationName || '').toLowerCase().includes(q);
        const matchesTarget = (log.targetDisplay || '').toLowerCase().includes(q);
        const matchesReason = (log.reason || '').toLowerCase().includes(q);
        const matchesBy = (log.administeredBy || '').toLowerCase().includes(q);
        return matchesLogId || matchesMed || matchesTarget || matchesReason || matchesBy;
      }

      return true;
    });
  }, [processedLogs, selectedTargetType, selectedWithdrawalStatus, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className={styles.tableCard}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search treatments by log ID, flock, medication, reason, or staff..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.filtersWrapper}>
          <div className={styles.filterGroup}>
            <Filter size={15} className={styles.filterIcon} />
            <select
              className={styles.filterSelect}
              value={selectedTargetType}
              onChange={(e) => {
                setSelectedTargetType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Targets</option>
              <option value="batch">Flock Batches</option>
              <option value="bird">Individual Birds</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={selectedWithdrawalStatus}
              onChange={(e) => {
                setSelectedWithdrawalStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Withdrawal States</option>
              <option value="Active">Active Withdrawal Only</option>
              <option value="Cleared">Cleared Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className={styles.tableResponsive}>
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Target Animal / Batch</th>
              <th>Medication Used</th>
              <th>Dosage Administered</th>
              <th>Route</th>
              <th>Treatment Date</th>
              <th>Administered By</th>
              <th>Withdrawal Hold Status</th>
              <th>Reason / Symptoms</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <AlertTriangle size={32} className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No treatment logs found</p>
                    <p className={styles.emptyText}>
                      Log a new medication administration to begin tracking flock treatments.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedList.map((log) => (
                <tr
                  key={log.id}
                  className={log.isUnderHold ? styles.holdRow : undefined}
                  onClick={() => onViewDetails && onViewDetails(log)}
                >
                  <td className={styles.logIdCell}>
                    <strong>{log.logId || `#${log.id}`}</strong>
                  </td>
                  <td>
                    <div className={styles.targetCellWrap}>
                      <span className={styles.targetTypeBadge}>
                        {log.targetType === 'batch' ? 'Batch' : 'Bird'}
                      </span>
                      <strong className={styles.targetName}>
                        {log.targetDisplay || (log.batchId ? `Batch #${log.batchId}` : `Bird #${log.birdId}`)}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <span className={styles.medNameText}>{log.medicationName}</span>
                  </td>
                  <td>
                    <span className={styles.dosageBadge}>
                      {log.dosageGiven || `${log.quantity} ${log.unit || ''}`}
                    </span>
                  </td>
                  <td className={styles.routeText}>{log.route || 'Oral'}</td>
                  <td className={styles.dateCell}>{formatDate(log.administeredDate || log.date)}</td>
                  <td className={styles.staffCell}>{log.administeredBy || 'Staff'}</td>
                  <td>
                    {log.isUnderHold ? (
                      <div className={styles.holdBadge} title="Do not harvest or sell meat/eggs!">
                        <ShieldAlert size={14} />
                        <span>
                          HOLD ({log.daysRemaining}d left · {formatDate(log.withdrawalEndDate)})
                        </span>
                      </div>
                    ) : log.withdrawalPeriodDays > 0 ? (
                      <div className={styles.clearedBadge}>
                        <CheckCircle2 size={14} />
                        <span>Cleared ({formatDate(log.withdrawalEndDate)})</span>
                      </div>
                    ) : (
                      <div className={styles.zeroBadge}>
                        <Clock size={13} />
                        <span>0 days (None)</span>
                      </div>
                    )}
                  </td>
                  <td className={styles.reasonCell} title={log.reason}>
                    {log.reason || 'Routine care'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {filteredLogs.length > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> of{' '}
            <strong>{filteredLogs.length}</strong> treatment records
          </div>
          <div className={styles.paginationButtons}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span className={styles.pageIndicator}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
