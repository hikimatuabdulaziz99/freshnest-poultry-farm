import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Syringe,
  Edit2,
  XCircle,
  AlertOctagon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import styles from './VaccineScheduleTable.module.css';

/**
 * Vaccination Schedule Table
 * Lists planned and upcoming cohort vaccination events with dynamic Due/Overdue calculations
 */
export function VaccineScheduleTable({
  schedules = [],
  batches = [],
  onAdministerSchedule,
  onEditSchedule,
  onCancelSchedule,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtered list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedBatchId !== 'All' && String(s.batchId) !== String(selectedBatchId)) {
        return false;
      }

      if (selectedStatus !== 'All' && s.status !== selectedStatus) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesId = (s.scheduleId || '').toLowerCase().includes(q);
        const matchesBatch = (s.batchName || '').toLowerCase().includes(q);
        const matchesVaccine = (s.vaccineName || '').toLowerCase().includes(q);
        const matchesStaff = (s.assignedStaff || '').toLowerCase().includes(q);
        return matchesId || matchesBatch || matchesVaccine || matchesStaff;
      }

      return true;
    });
  }, [schedules, selectedBatchId, selectedStatus, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchedules.slice(start, start + itemsPerPage);
  }, [filteredSchedules, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Overdue':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeOverdue}`}>
            <AlertOctagon size={13} />
            OVERDUE
          </span>
        );
      case 'Due':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeDue}`}>
            <Clock size={13} />
            DUE TODAY
          </span>
        );
      case 'Scheduled':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeScheduled}`}>
            <Calendar size={13} />
            Scheduled
          </span>
        );
      case 'Completed':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeCompleted}`}>
            <CheckCircle2 size={13} />
            Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeCancelled}`}>
            <XCircle size={13} />
            Cancelled
          </span>
        );
      default:
        return <span className={styles.statusBadge}>{status}</span>;
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
            placeholder="Search schedule by batch, vaccine, or assigned staff..."
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
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Flock Batches</option>
              {batches.map((b) => (
                <option key={b.batchId || b.id} value={b.batchId || b.id}>
                  {b.batchCode || b.name || `Batch #${b.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Schedule Statuses</option>
              <option value="Due">Due Today</option>
              <option value="Overdue">Overdue</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className={styles.tableResponsive}>
        <table className={styles.scheduleTable}>
          <thead>
            <tr>
              <th>Schedule ID</th>
              <th>Flock Batch</th>
              <th>Vaccine Product</th>
              <th>Target Age</th>
              <th>Scheduled Date</th>
              <th>Method</th>
              <th>Assigned Staff</th>
              <th>Status</th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <AlertTriangle size={32} className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No scheduled vaccination events found</p>
                    <p className={styles.emptyText}>
                      Schedule immunisation sessions for your flock cohorts or create a schedule from template.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedList.map((sched) => {
                const canAdminister =
                  sched.status === 'Due' ||
                  sched.status === 'Overdue' ||
                  sched.status === 'Scheduled';

                return (
                  <tr
                    key={sched.id}
                    className={
                      sched.status === 'Overdue'
                        ? styles.overdueRow
                        : sched.status === 'Due'
                        ? styles.dueRow
                        : undefined
                    }
                  >
                    <td className={styles.schedIdCell}>
                      <strong>{sched.scheduleId}</strong>
                    </td>
                    <td>
                      <strong className={styles.batchNameText}>{sched.batchName}</strong>
                    </td>
                    <td>
                      <span className={styles.vaxNameText}>{sched.vaccineName}</span>
                    </td>
                    <td className={styles.ageCell}>
                      {sched.targetAgeDays > 0 ? `Day ${sched.targetAgeDays}` : 'Day 1'}
                    </td>
                    <td className={styles.dateCell}>
                      <span
                        className={
                          sched.status === 'Overdue'
                            ? styles.overdueText
                            : sched.status === 'Due'
                            ? styles.dueText
                            : undefined
                        }
                      >
                        {formatDate(sched.scheduledDate)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.methodBadge}>{sched.recommendedMethod}</span>
                    </td>
                    <td className={styles.staffCell}>{sched.assignedStaff || 'Vet Staff'}</td>
                    <td>{getStatusBadge(sched.status)}</td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionButtons}>
                        {canAdminister && (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.administerBtn}`}
                            onClick={() => onAdministerSchedule(sched)}
                            title="Administer Vaccination Now"
                            aria-label={`Administer ${sched.vaccineName} for ${sched.batchName}`}
                          >
                            <Syringe size={15} />
                            <span>Administer</span>
                          </button>
                        )}
                        {sched.status !== 'Completed' && sched.status !== 'Cancelled' && (
                          <>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => onEditSchedule(sched)}
                              title="Reschedule / Edit"
                              aria-label={`Edit schedule for ${sched.vaccineName}`}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.cancelBtn}`}
                              onClick={() => onCancelSchedule(sched)}
                              title="Cancel Schedule"
                              aria-label={`Cancel schedule for ${sched.vaccineName}`}
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {filteredSchedules.length > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredSchedules.length)}</strong> of{' '}
            <strong>{filteredSchedules.length}</strong> scheduled events
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
