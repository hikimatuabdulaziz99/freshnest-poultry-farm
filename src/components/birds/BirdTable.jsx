import {
  Search,
  X,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Tag,
  Bird,
  Plus,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import { BIRD_TYPES, BIRD_GENDERS, BIRD_STATUSES } from '../../services/birdService.js';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import styles from './BirdTable.module.css';

/**
 * Bird Records Table with Search, Multi-Filter, Sorting and Pagination
 */
export function BirdTable({
  birds = [],
  total = 0,
  page = 1,
  pageSize = 10,
  totalPages = 1,
  search = '',
  typeFilter = 'all',
  genderFilter = 'all',
  statusFilter = 'all',
  batchFilter = 'all',
  houseFilter = 'all',
  sortBy = 'id',
  sortOrder = 'desc',
  batches = [],
  houses = [],
  onSearchChange,
  onTypeFilterChange,
  onGenderFilterChange,
  onStatusFilterChange,
  onBatchFilterChange,
  onHouseFilterChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
  onViewBird,
  onEditBird,
  onDeleteBird,
  onRegisterNew,
}) {
  const hasActiveFilters =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    genderFilter !== 'all' ||
    statusFilter !== 'all' ||
    batchFilter !== 'all' ||
    houseFilter !== 'all';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success" dot size="sm">Active</Badge>;
      case 'Sick':
        return <Badge variant="warning" dot size="sm">Sick</Badge>;
      case 'Quarantined':
        return <Badge variant="secondary" dot size="sm">Quarantined</Badge>;
      case 'Sold':
        return <Badge variant="neutral" size="sm">Sold</Badge>;
      case 'Dead':
        return <Badge variant="danger" dot size="sm">Dead</Badge>;
      default:
        return <Badge variant="primary" size="sm">{status}</Badge>;
    }
  };

  const getGenderBadge = (gender) => {
    let genderClass = styles.genderUnknown;
    if (gender === 'Female') genderClass = styles.genderFemale;
    else if (gender === 'Male') genderClass = styles.genderMale;

    return (
      <span className={`${styles.genderBadge} ${genderClass}`}>
        {gender}
      </span>
    );
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
              placeholder="Search by Bird ID, tag, breed, or name..."
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

          {/* Register Action Shortcut */}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            onClick={onRegisterNew}
          >
            Register Bird
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
            {BIRD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => onGenderFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Gender"
          >
            <option value="all">All Genders</option>
            {BIRD_GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Status"
          >
            <option value="all">All Statuses</option>
            {BIRD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => onBatchFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Cohort Batch"
          >
            <option value="all">All Batches</option>
            <option value="standalone">Standalone Only</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchCode || `Batch #${b.id}`}
              </option>
            ))}
          </select>

          {/* House Filter */}
          <select
            value={houseFilter}
            onChange={(e) => onHouseFilterChange(e.target.value)}
            className={styles.filterSelect}
            title="Filter by Poultry House"
          >
            <option value="all">All Houses / Pens</option>
            {houses.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={onResetFilters}
              title="Reset all search filters"
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleHeaderSort('birdId')}
                title="Sort by Bird ID"
              >
                Bird ID
                <span className={styles.sortIconWrapper}>
                  <ArrowUpDown size={12} />
                </span>
              </th>
              <th className={styles.th}>Tag Number</th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleHeaderSort('breed')}
                title="Sort by Breed"
              >
                Name & Breed
                <span className={styles.sortIconWrapper}>
                  <ArrowUpDown size={12} />
                </span>
              </th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Gender</th>
              <th className={styles.th}>Cohort Batch</th>
              <th className={styles.th}>House / Pen</th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleHeaderSort('status')}
                title="Sort by Status"
              >
                Status
                <span className={styles.sortIconWrapper}>
                  <ArrowUpDown size={12} />
                </span>
              </th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleHeaderSort('createdAt')}
                title="Sort by Registration Date"
              >
                Registered
                <span className={styles.sortIconWrapper}>
                  <ArrowUpDown size={12} />
                </span>
              </th>
              <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {birds.length > 0 ? (
              birds.map((bird) => (
                <tr key={bird.id}>
                  {/* Bird ID */}
                  <td className={styles.td}>
                    <span
                      className={styles.birdIdCell}
                      onClick={() => onViewBird(bird)}
                      title="Click to view complete details"
                    >
                      {bird.birdId || `BRD-${String(bird.id).padStart(4, '0')}`}
                    </span>
                  </td>

                  {/* Tag Number */}
                  <td className={styles.td}>
                    {bird.tagNumber ? (
                      <span className={styles.tagCell}>
                        <Tag size={11} />
                        {bird.tagNumber}
                      </span>
                    ) : (
                      <span className={styles.tagEmpty}>—</span>
                    )}
                  </td>

                  {/* Name & Breed */}
                  <td className={styles.td}>
                    <div className={styles.breedCell}>
                      {bird.name ? <span className={styles.birdName}>{bird.name}</span> : null}
                      <span className={styles.breedSub}>{bird.breed}</span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className={styles.td}>
                    <Badge variant="neutral" size="sm">
                      {bird.type}
                    </Badge>
                  </td>

                  {/* Gender */}
                  <td className={styles.td}>
                    {getGenderBadge(bird.gender)}
                  </td>

                  {/* Batch */}
                  <td className={styles.td}>
                    {bird.batchCode ? (
                      <span className={styles.batchBadge}>{bird.batchCode}</span>
                    ) : (
                      <span className={styles.standaloneBadge}>Standalone</span>
                    )}
                  </td>

                  {/* House / Pen */}
                  <td className={styles.td}>
                    {bird.houseNumber || 'Pen 1'}
                  </td>

                  {/* Status */}
                  <td className={styles.td}>
                    {getStatusBadge(bird.status)}
                  </td>

                  {/* Registered Date */}
                  <td className={styles.td} style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {formatDate(bird.createdAt || bird.acquisitionDate)}
                  </td>

                  {/* Actions */}
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div className={styles.actionGroup} style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => onViewBird(bird)}
                        title="View Bird Profile"
                        aria-label={`View ${bird.birdId}`}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => onEditBird(bird)}
                        title="Edit Bird"
                        aria-label={`Edit ${bird.birdId}`}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => onDeleteBird(bird)}
                        title="Delete Record"
                        aria-label={`Delete ${bird.birdId}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                      <Bird size={28} />
                    </div>
                    {hasActiveFilters ? (
                      <>
                        <h4 className={styles.emptyTitle}>No matching birds found</h4>
                        <p className={styles.emptyText}>
                          We couldn't find any individual bird records matching your search or filter
                          criteria. Try clearing filters or searching for a different tag or breed.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<RotateCcw size={14} />}
                          onClick={onResetFilters}
                        >
                          Clear All Filters
                        </Button>
                      </>
                    ) : (
                      <>
                        <h4 className={styles.emptyTitle}>No bird records yet</h4>
                        <p className={styles.emptyText}>
                          Register individual breeders, show birds, or valuable stock with unique tags
                          and detailed pedigrees.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus size={15} />}
                          onClick={onRegisterNew}
                        >
                          Register First Bird
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {total > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.pageInfo}>
            <span>
              Showing {startIndex} to {endIndex} of {total} birds
            </span>
            <span>·</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className={styles.pageSizeSelect}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, current, and neighbours
                return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
              })
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {showEllipsis && <span style={{ padding: '0 4px', color: '#A0AEC0' }}>…</span>}
                    <button
                      type="button"
                      className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                      onClick={() => onPageChange(p)}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}

            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
