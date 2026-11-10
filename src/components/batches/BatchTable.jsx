import {
  Search,
  X,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Layers,
  Plus,
  Home,
} from 'lucide-react';
import { formatDate, formatNumber } from '../../utils/formatters.js';
import { BATCH_TYPES, BATCH_STATUSES, batchService } from '../../services/batchService.js';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import styles from './BatchTable.module.css';

/**
 * Batch Records Table with Search, Multi-Filter, Sorting and Pagination
 */
export function BatchTable({
  batches = [],
  total = 0,
  page = 1,
  pageSize = 10,
  totalPages = 1,
  search = '',
  typeFilter = 'all',
  statusFilter = 'all',
  penFilter = 'all',
  sortBy = 'id',
  sortOrder = 'desc',
  pens = [],
  onSearchChange,
  onTypeFilterChange,
  onStatusFilterChange,
  onPenFilterChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
  onViewBatch,
  onEditBatch,
  onArchiveBatch,
  onDeleteBatch,
  onRegisterNew,
}) {
  const hasActiveFilters =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    penFilter !== 'all';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success" dot size="sm">Active</Badge>;
      case 'Planned':
        return <Badge variant="warning" dot size="sm">Planned</Badge>;
      case 'Completed':
        return <Badge variant="primary" dot size="sm">Completed</Badge>;
      case 'Archived':
        return <Badge variant="neutral" size="sm">Archived</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  const handleHeaderSort = (field) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className={styles.container}>
      {/* Search and Filters Toolbar */}
      <div className={styles.filterBar}>
        <div className={styles.searchRow}>
          {/* Search Box */}
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by Batch ID, breed, name, or supplier..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className={styles.searchInput}
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => onSearchChange('')}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Register Shortcut */}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={onRegisterNew}
          >
            Create Batch
          </Button>
        </div>

        {/* Dropdown Filters */}
        <div className={styles.filtersRow}>
          <span className={styles.filterLabel}>Filters:</span>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Bird Type"
          >
            <option value="all">All Types</option>
            {BATCH_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Batch Status"
          >
            <option value="all">All Statuses</option>
            {BATCH_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Pen Filter */}
          <select
            value={penFilter}
            onChange={(e) => onPenFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Assigned Pen"
          >
            <option value="all">All Pens</option>
            {pens
              .filter((p, idx, arr) => arr.findIndex((x) => x.penId === p.penId) === idx)
              .map((p, idx) => (
                <option key={`filter-pen-${p.penId}-${p.id || idx}`} value={p.penId}>
                  {p.penId} - {p.name}
                </option>
              ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={onResetFilters}
              title="Reset all active filters"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Table */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('batchId')}
              >
                <div className={styles.thContent}>
                  <span>Batch ID</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('name')}
              >
                <div className={styles.thContent}>
                  <span>Flock & Breed</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('initialCount')}
              >
                <div className={styles.thContent}>
                  <span>Initial Count</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('currentCount')}
              >
                <div className={styles.thContent}>
                  <span>Current Live</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('arrivalDate')}
              >
                <div className={styles.thContent}>
                  <span>Arrival & Age</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th>Assigned Pen</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconBox}>
                      <Layers size={28} />
                    </div>
                    <h3 className={styles.emptyTitle}>
                      {hasActiveFilters
                        ? 'No batches match your filter criteria'
                        : 'No flock batches registered yet'}
                    </h3>
                    <p className={styles.emptySubtitle}>
                      {hasActiveFilters
                        ? 'Try clearing the search query or adjusting your type/status filters.'
                        : 'Create your first flock batch to track DOC arrivals, pen placements, and production cycles.'}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" size="sm" onClick={onResetFilters}>
                        Clear Filters
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="md"
                        icon={<Plus size={16} />}
                        onClick={onRegisterNew}
                      >
                        Create First Batch
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              batches.map((batch) => {
                const age = batchService.calculateFlockAge(batch.arrivalDate);
                const isArchived = batch.status === 'Archived';

                return (
                  <tr key={batch.id}>
                    <td>
                      <div className={styles.batchIdCell}>
                        <span className={styles.batchIdBadge}>
                          {batch.batchId || batch.batchCode || `BAT-${String(batch.id).padStart(4, '0')}`}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className={styles.batchPrimaryText}>{batch.name}</div>
                      <div className={styles.batchSubText}>
                        {batch.breed} · {batch.birdType}
                      </div>
                    </td>

                    <td>
                      <span className={styles.countInitial}>
                        {formatNumber(batch.initialCount)} birds
                      </span>
                    </td>

                    <td>
                      <span className={styles.countLiveTag}>
                        {formatNumber(batch.currentCount)}
                      </span>
                    </td>

                    <td>
                      <div>{formatDate(batch.arrivalDate)}</div>
                      <div className={styles.flockAge}>{age}</div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Home size={14} style={{ color: '#2D6A4F' }} />
                        <span style={{ fontWeight: 500 }}>{batch.penName}</span>
                      </div>
                    </td>

                    <td>{getStatusBadge(batch.status)}</td>

                    <td>
                      <div className={styles.actionButtonGroup} style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={styles.actionIconBtn}
                          onClick={() => onViewBatch(batch)}
                          title="View batch details & metrics"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionIconBtn}
                          onClick={() => onEditBatch(batch)}
                          title="Edit batch parameters"
                        >
                          <Edit3 size={15} />
                        </button>
                        {!isArchived && (
                          <button
                            type="button"
                            className={`${styles.actionIconBtn} ${styles.actionArchiveBtn}`}
                            onClick={() => onArchiveBatch(batch)}
                            title="Archive completed batch"
                          >
                            <Archive size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${styles.actionIconBtn} ${styles.actionDeleteBtn}`}
                          onClick={() => onDeleteBatch(batch)}
                          title="Delete batch"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {total > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.pageInfo}>
            Showing <span style={{ fontWeight: 600 }}>{startIndex}</span> to{' '}
            <span style={{ fontWeight: 600 }}>{endIndex}</span> of{' '}
            <span style={{ fontWeight: 600 }}>{total}</span> batch records
          </div>

          <div className={styles.pageControls}>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={styles.pageSizeSelect}
              title="Items per page"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: 13, padding: '0 8px', color: '#4b5563' }}>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
