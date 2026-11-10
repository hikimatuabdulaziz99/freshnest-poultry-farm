import {
  Search,
  X,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  Home,
  Plus,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import { PEN_TYPES, PEN_STATUSES } from '../../services/penService.js';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import styles from './PenTable.module.css';

/**
 * Pen Management Table with Visual Progress Indicators for Housing Capacity
 */
export function PenTable({
  pens = [],
  search = '',
  typeFilter = 'all',
  statusFilter = 'all',
  sortBy = 'penId',
  sortOrder = 'asc',
  onSearchChange,
  onTypeFilterChange,
  onStatusFilterChange,
  onSortChange,
  onResetFilters,
  onViewPen,
  onEditPen,
  onDeletePen,
  onCreateNew,
}) {
  const hasActiveFilters =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all';

  const getStatusBadge = (pen) => {
    switch (pen.status) {
      case 'Maintenance':
        return <Badge variant="warning" dot size="sm">Maintenance</Badge>;
      case 'Closed':
        return <Badge variant="danger" dot size="sm">Closed</Badge>;
      default:
        if (pen.occupiedCount >= pen.capacity) {
          return <Badge variant="danger" size="sm">Full (100%)</Badge>;
        } else if (pen.occupiedCount > 0) {
          return <Badge variant="secondary" dot size="sm">Occupied</Badge>;
        }
        return <Badge variant="success" dot size="sm">Available</Badge>;
    }
  };

  const getProgressFillClass = (percentage) => {
    if (percentage >= 100) return styles.progressFillFull;
    if (percentage >= 90) return styles.progressFillHigh;
    if (percentage >= 75) return styles.progressFillMedium;
    return styles.progressFillLow;
  };

  const handleHeaderSort = (field) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  return (
    <div className={styles.container}>
      {/* Search and Filters Toolbar */}
      <div className={styles.filterBar}>
        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by Pen ID, name, location, or type..."
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

          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={onCreateNew}
          >
            Add New Pen
          </Button>
        </div>

        {/* Filters */}
        <div className={styles.filtersRow}>
          <span className={styles.filterLabel}>Filters:</span>

          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Pen Type"
          >
            <option value="all">All Types</option>
            {PEN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Status"
          >
            <option value="all">All Statuses</option>
            {PEN_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={onResetFilters}
              title="Reset filters"
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('penId')}
              >
                <div className={styles.thContent}>
                  <span>Pen ID</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('name')}
              >
                <div className={styles.thContent}>
                  <span>Pen Name & Location</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th>Pen Type</th>
              <th
                className={styles.sortableTh}
                onClick={() => handleHeaderSort('capacity')}
              >
                <div className={styles.thContent}>
                  <span>Max Capacity</span>
                  <ArrowUpDown size={13} />
                </div>
              </th>
              <th>Current Occupancy</th>
              <th>Available Space</th>
              <th style={{ minWidth: 150 }}>Occupancy Utilization</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pens.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIconBox}>
                      <Home size={28} />
                    </div>
                    <h3 className={styles.emptyTitle}>
                      {hasActiveFilters
                        ? 'No pens match your filter criteria'
                        : 'No pens or poultry houses registered yet'}
                    </h3>
                    <p className={styles.emptySubtitle}>
                      {hasActiveFilters
                        ? 'Try clearing the search query or adjusting your type filters.'
                        : 'Register your first poultry house or brooding bay to manage flock capacities.'}
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
                        onClick={onCreateNew}
                      >
                        Create First Pen
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pens.map((pen) => {
                const pct = pen.occupancyPercentage || 0;
                const fillClass = getProgressFillClass(pct);

                return (
                  <tr key={pen.id}>
                    <td>
                      <span className={styles.penIdBadge}>{pen.penId}</span>
                    </td>

                    <td>
                      <div className={styles.penPrimaryText}>{pen.name}</div>
                      <div className={styles.penSubText}>
                        {pen.location || 'Standard Compound'}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 500 }}>{pen.type}</span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {formatNumber(pen.capacity)} birds
                      </span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, color: '#1B4332' }}>
                        {formatNumber(pen.occupiedCount)}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
                        ({pen.batchCount || 0} batch{pen.batchCount !== 1 ? 'es' : ''})
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: pen.availableCapacity === 0 ? '#DC2626' : '#2D6A4F',
                        }}
                      >
                        {formatNumber(pen.availableCapacity)} birds
                      </span>
                    </td>

                    <td>
                      <div className={styles.progressWrapper}>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={`${styles.progressBarFill} ${fillClass}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className={styles.progressLabelRow}>
                          <span>{pct}% used</span>
                          <span>{formatNumber(pen.availableCapacity)} left</span>
                        </div>
                      </div>
                    </td>

                    <td>{getStatusBadge(pen)}</td>

                    <td>
                      <div className={styles.actionButtonGroup} style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={styles.actionIconBtn}
                          onClick={() => onViewPen(pen)}
                          title="View pen occupancy and batches"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionIconBtn}
                          onClick={() => onEditPen(pen)}
                          title="Edit pen parameters"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionIconBtn} ${styles.actionDeleteBtn}`}
                          onClick={() => onDeletePen(pen)}
                          title="Delete pen"
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
    </div>
  );
}
