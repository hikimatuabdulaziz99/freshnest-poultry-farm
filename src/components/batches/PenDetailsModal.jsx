import {
  X,
  Home,
  Edit3,
  Trash2,
  MapPin,
} from 'lucide-react';
import { formatDate, formatNumber } from '../../utils/formatters.js';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import styles from './PenDetailsModal.module.css';

/**
 * Detailed Pen Profile Modal
 * Shows maximum capacity, live occupancy, utilization progress bar, and assigned cohorts.
 */
export function PenDetailsModal({
  pen,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) {
  if (!isOpen || !pen) return null;

  const pct = pen.occupancyPercentage || 0;

  const getProgressFillClass = (percentage) => {
    if (percentage >= 100) return styles.progressFillFull;
    if (percentage >= 90) return styles.progressFillHigh;
    if (percentage >= 75) return styles.progressFillMedium;
    return styles.progressFillLow;
  };

  const getStatusVariant = (penObj) => {
    if (penObj.status === 'Maintenance') return 'warning';
    if (penObj.status === 'Closed') return 'danger';
    if (penObj.occupiedCount >= penObj.capacity) return 'danger';
    if (penObj.occupiedCount > 0) return 'secondary';
    return 'success';
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.headerIcon}>
              <Home size={24} />
            </div>
            <div>
              <h3 className={styles.penId}>
                {pen.penId}
                <Badge variant={getStatusVariant(pen)} dot>
                  {pen.displayStatus || pen.status}
                </Badge>
              </h3>
              <div className={styles.penName}>
                {pen.name} · {pen.type} Housing
              </div>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Key Metrics */}
          <div className={styles.statsRow}>
            <div className={styles.statTile}>
              <span className={styles.statTileLabel}>Maximum Bird Capacity</span>
              <span className={styles.statTileValue}>
                {formatNumber(pen.capacity)}
              </span>
              <span className={styles.statTileSub}>Total Allowed Placements</span>
            </div>

            <div className={styles.statTile}>
              <span className={styles.statTileLabel}>Current Occupancy</span>
              <span className={styles.statTileValue} style={{ color: '#1B4332' }}>
                {formatNumber(pen.occupiedCount)}
              </span>
              <span className={styles.statTileSub}>
                Across {pen.assignedBatches?.length || pen.batchCount || 0} active cohort(s)
              </span>
            </div>

            <div className={styles.statTile}>
              <span className={styles.statTileLabel}>Available Housing Space</span>
              <span
                className={styles.statTileValue}
                style={{ color: pen.availableCapacity === 0 ? '#DC2626' : '#2D6A4F' }}
              >
                {formatNumber(pen.availableCapacity)}
              </span>
              <span className={styles.statTileSub}>
                {pen.availableCapacity === 0 ? 'Fully Booked' : 'Ready for Placement'}
              </span>
            </div>
          </div>

          {/* Utilization Progress Card */}
          <div className={styles.utilizationCard}>
            <div className={styles.utilizationHeader}>
              <span>Housing Space Utilization: {pct}%</span>
              <span>
                {formatNumber(pen.occupiedCount)} / {formatNumber(pen.capacity)} birds
              </span>
            </div>
            <div className={styles.progressBarTrack}>
              <div
                className={`${styles.progressBarFill} ${getProgressFillClass(pct)}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>

          {/* Specifications */}
          <div className={styles.sectionTitle}>Physical Specifications & Location</div>
          <div className={styles.grid2}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Location / Sector</span>
              <span className={styles.infoValue}>
                <MapPin size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -2, color: '#2D6A4F' }} />
                {pen.location || 'Main Farm Compound'}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Pen Housing Type</span>
              <span className={styles.infoValue}>{pen.type} Facility</span>
            </div>
          </div>

          {/* Assigned Batches List */}
          <div className={styles.sectionTitle}>
            Current Flock Batches in this Pen ({pen.assignedBatches?.length || 0})
          </div>
          {pen.assignedBatches && pen.assignedBatches.length > 0 ? (
            <div className={styles.batchesBox}>
              <table className={styles.batchesTable}>
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Flock Name</th>
                    <th>Breed</th>
                    <th>Birds Housed</th>
                    <th>Placement Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pen.assignedBatches.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {b.batchId || b.batchCode || `#${b.id}`}
                      </td>
                      <td>{b.name}</td>
                      <td>{b.breed} ({b.birdType})</td>
                      <td style={{ fontWeight: 700, color: '#1B4332' }}>
                        {formatNumber(b.currentCount !== undefined && b.currentCount !== null ? b.currentCount : b.initialCount)} birds
                      </td>
                      <td>{formatDate(b.arrivalDate)}</td>
                      <td>
                        <Badge variant={b.status === 'Active' ? 'success' : 'warning'} size="sm">
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              This pen currently has no active or planned batches assigned. Full capacity of {formatNumber(pen.capacity)} birds is available.
            </p>
          )}

          {/* Notes */}
          <div className={styles.sectionTitle}>Facility & Bio-security Notes</div>
          <div className={styles.notesCard}>
            {pen.notes && pen.notes.trim() ? pen.notes : 'No specific bio-security or equipment notes recorded.'}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={15} />}
            onClick={() => onDelete(pen)}
          >
            Delete Pen
          </Button>

          <div className={styles.footerActions}>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 size={15} />}
              onClick={() => onEdit(pen)}
            >
              Edit Pen
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
