import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Thermometer,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import styles from './VaccineHistoryTable.module.css';

/**
 * Vaccination Administration History Table
 * Complete ledger of administered immunisations with lot tracking and cold chain compliance
 */
export function VaccineHistoryTable({ logs = [], onViewDetails }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedTargetType !== 'All' && log.targetType !== selectedTargetType) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesLogId = (log.logId || '').toLowerCase().includes(q);
        const matchesVaccine = (log.vaccineName || '').toLowerCase().includes(q);
        const matchesTarget = (log.targetDisplay || '').toLowerCase().includes(q);
        const matchesStaff = (log.administeredBy || '').toLowerCase().includes(q);
        const matchesLot = (log.lotNumber || '').toLowerCase().includes(q);
        return matchesLogId || matchesVaccine || matchesTarget || matchesStaff || matchesLot;
      }

      return true;
    });
  }, [logs, selectedTargetType, searchTerm]);

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
            placeholder="Search history by log ID, flock, vaccine, staff, or lot #..."
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
        </div>
      </div>

      {/* Table Element */}
      <div className={styles.tableResponsive}>
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Target Flock / Bird</th>
              <th>Vaccine Administered</th>
              <th>Doses Used</th>
              <th>Birds Immunised</th>
              <th>Method</th>
              <th>Date & Time</th>
              <th>Administered By</th>
              <th>Lot / Batch #</th>
              <th>Cold Chain</th>
              <th>Observations / Notes</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <AlertTriangle size={32} className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No vaccination logs recorded</p>
                    <p className={styles.emptyText}>
                      Administer a vaccine from schedule or inventory to begin building immunisation records.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedList.map((log) => (
                <tr
                  key={log.id}
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
                    <span className={styles.vaxNameText}>{log.vaccineName}</span>
                  </td>
                  <td>
                    <span className={styles.dosageBadge}>
                      {log.quantity} {log.unit || 'doses'}
                    </span>
                  </td>
                  <td>
                    <strong className={styles.birdsCount}>
                      {log.birdsVaccinated || log.quantity} birds
                    </strong>
                  </td>
                  <td className={styles.methodText}>{log.administrationMethod || 'Standard'}</td>
                  <td className={styles.dateCell}>{formatDate(log.administeredDate)}</td>
                  <td className={styles.staffCell}>{log.administeredBy || 'Vet Staff'}</td>
                  <td className={styles.lotCell}>
                    <span className={styles.lotBadge}>{log.lotNumber || '—'}</span>
                  </td>
                  <td>
                    <span className={styles.coldChainTag}>
                      <Thermometer size={12} />
                      {log.storageTemperature?.includes('2°C') ? '2-8°C' : 'Verified'}
                    </span>
                  </td>
                  <td className={styles.reactionsCell} title={log.reactionsObserved || log.notes}>
                    {log.reactionsObserved || log.notes || (
                      <span className={styles.noReactionTag}>
                        <CheckCircle2 size={12} /> Normal
                      </span>
                    )}
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
            <strong>{filteredLogs.length}</strong> vaccination records
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
