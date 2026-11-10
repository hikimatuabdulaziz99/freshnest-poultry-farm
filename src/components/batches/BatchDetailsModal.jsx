import {
  X,
  Layers,
  Edit3,
  Trash2,
  Archive,
  Calendar,
  Home,
  Tag,
} from 'lucide-react';
import { formatDate, formatCurrency, formatNumber } from '../../utils/formatters.js';
import { batchService } from '../../services/batchService.js';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import styles from './BatchDetailsModal.module.css';

/**
 * Detailed Batch Profile Modal
 * Shows metrics, pen details, financial intake, mortality rate, and assigned individual birds.
 */
export function BatchDetailsModal({
  batch,
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onDelete,
}) {
  if (!isOpen || !batch) return null;

  const age = batchService.calculateFlockAge(batch.arrivalDate);
  const isArchived = batch.status === 'Archived';

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Planned':
        return 'warning';
      case 'Completed':
        return 'primary';
      case 'Archived':
        return 'neutral';
      default:
        return 'secondary';
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.headerIcon}>
              <Layers size={24} />
            </div>
            <div>
              <h3 className={styles.batchId}>
                {batch.batchId || batch.batchCode || `BAT-${String(batch.id).padStart(4, '0')}`}
                <Badge variant={getStatusVariant(batch.status)} dot>
                  {batch.status}
                </Badge>
              </h3>
              <div className={styles.batchName}>
                {batch.name} · {batch.breed} ({batch.birdType})
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
          {/* Key Metrics Grid */}
          <div className={styles.statsRow}>
            <div className={styles.statTile}>
              <span className={styles.statTileLabel}>Current Live Count</span>
              <span className={styles.statTileValue} style={{ color: '#1B4332' }}>
                {formatNumber(batch.currentCount)}
              </span>
              <span className={styles.statTileSub}>Occupying Pen</span>
            </div>

            <div className={styles.statTile}>
              <span className={styles.statTileLabel}>Initial Intake</span>
              <span className={styles.statTileValue}>
                {formatNumber(batch.initialCount)}
              </span>
              <span className={styles.statTileSub}>Baseline Placement</span>
            </div>

            <div className={styles.statTile}>
              <span className={styles.statTileLabel}>Flock Age</span>
              <span className={styles.statTileValue} style={{ fontSize: 16 }}>
                {age}
              </span>
              <span className={styles.statTileSub}>Since {formatDate(batch.arrivalDate)}</span>
            </div>

            <div className={styles.statTile}>
              <span className={styles.statTileLabel}>Mortality Recorded</span>
              <span className={styles.statTileValue} style={{ color: batch.totalMortality > 0 ? '#B91C1C' : '#374151' }}>
                {formatNumber(batch.totalMortality || 0)}
              </span>
              <span className={styles.statTileSub}>
                {batch.mortalityRatePct ? `${batch.mortalityRatePct}% rate` : '0.00% rate'}
              </span>
            </div>
          </div>

          {/* Section 1: Housing & Pen Details */}
          <div className={styles.sectionTitle}>Housing Placement & Pen Capacity</div>
          <div className={styles.grid2}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Assigned Poultry House / Pen</span>
              <span className={styles.infoValue}>
                <Home size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -2, color: '#2D6A4F' }} />
                {batch.penDetails ? `${batch.penDetails.penId} - ${batch.penDetails.name}` : (batch.houseId || batch.penId || 'Unassigned')}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Pen Housing Specifications</span>
              <span className={styles.infoValue}>
                {batch.penDetails
                  ? `${batch.penDetails.type} Pen · Capacity: ${batch.penDetails.capacity.toLocaleString()} birds`
                  : 'Custom Pen'}
              </span>
            </div>
          </div>

          {/* Section 2: Financials & Investment */}
          <div className={styles.sectionTitle}>Financial Investment (Nigerian Naira)</div>
          <div className={styles.grid3}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Cost per Bird</span>
              <span className={`${styles.infoValue} ${styles.currencyValue}`}>
                {formatCurrency(batch.costPerBird || 0)}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Total Batch Purchase Cost</span>
              <span className={`${styles.infoValue} ${styles.currencyValue}`}>
                {formatCurrency(batch.totalCost || 0)}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Hatchery / Supplier</span>
              <span className={styles.infoValue}>{batch.supplier || 'Farm Hatched'}</span>
            </div>
          </div>

          {/* Section 3: Production Purpose & Schedule */}
          <div className={styles.sectionTitle}>Production Purpose & Timeline</div>
          <div className={styles.grid3}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Production Purpose</span>
              <span className={styles.infoValue}>{batch.purpose || 'Table Egg Production'}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Placement Date</span>
              <span className={styles.infoValue}>
                <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                {formatDate(batch.arrivalDate)}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Expected Market / Lay Date</span>
              <span className={styles.infoValue}>
                {batch.expectedMarketDate ? formatDate(batch.expectedMarketDate) : 'Not Specified'}
              </span>
            </div>
          </div>

          {/* Section 4: Individual Birds Associated With This Batch */}
          <div className={styles.sectionTitle}>
            Assigned Individual Bird Records ({batch.assignedBirdsCount || 0})
          </div>
          {batch.assignedBirds && batch.assignedBirds.length > 0 ? (
            <div className={styles.assignedBirdsBox}>
              <div className={styles.assignedBirdsHeader}>
                <span>Individually tagged breeders / monitored stock in this cohort</span>
                <span>{batch.assignedBirds.length} birds</span>
              </div>
              <table className={styles.birdsMiniTable}>
                <thead>
                  <tr>
                    <th>Bird ID</th>
                    <th>Tag Number</th>
                    <th>Name / Reference</th>
                    <th>Gender</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.assignedBirds.map((bird) => (
                    <tr key={bird.id}>
                      <td className={styles.monoValue} style={{ fontWeight: 600 }}>{bird.birdId}</td>
                      <td>
                        {bird.tagNumber ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Tag size={12} style={{ color: '#40916C' }} />
                            <span className={styles.monoValue}>{bird.tagNumber}</span>
                          </span>
                        ) : (
                          'Untagged'
                        )}
                      </td>
                      <td>{bird.name || '—'}</td>
                      <td>{bird.gender}</td>
                      <td>
                        <Badge variant={bird.status === 'Active' ? 'success' : 'secondary'} size="sm">
                          {bird.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              No individually tagged bird records assigned to this batch. Cohort is managed in bulk flock.
            </p>
          )}

          {/* Section 5: Clinical Notes */}
          <div className={styles.sectionTitle}>Clinical & Management Notes</div>
          <div className={styles.notesCard}>
            {batch.notes && batch.notes.trim() ? batch.notes : 'No additional management notes recorded.'}
          </div>

          {/* Timestamps */}
          <div className={styles.metaRow}>
            <span>Created on: {formatDate(batch.createdAt)}</span>
            <span>Last updated: {formatDate(batch.updatedAt || batch.createdAt)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={15} />}
              onClick={() => onDelete(batch)}
            >
              Delete Batch
            </Button>
            {!isArchived && (
              <Button
                variant="outline"
                size="sm"
                icon={<Archive size={15} />}
                onClick={() => onArchive(batch)}
              >
                Archive Batch
              </Button>
            )}
          </div>

          <div className={styles.footerActions}>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 size={15} />}
              onClick={() => onEdit(batch)}
            >
              Edit Batch
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
