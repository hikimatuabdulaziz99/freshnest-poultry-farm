import { X, Bird, Edit3, Trash2, Tag, Calendar, MapPin, Layers } from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import { birdService, BIRD_STATUSES } from '../../services/birdService.js';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import styles from './BirdDetailsModal.module.css';

/**
 * Detailed Bird Profile Modal
 * Shows comprehensive metadata, age calculation, financial intake, batch linkage, and notes.
 */
export function BirdDetailsModal({
  bird,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
}) {
  if (!isOpen || !bird) return null;

  const age = birdService.calculateAge(bird.hatchDate);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Sick':
        return 'warning';
      case 'Quarantined':
        return 'secondary';
      case 'Sold':
        return 'neutral';
      case 'Dead':
        return 'danger';
      default:
        return 'primary';
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.headerIcon}>
              <Bird size={24} />
            </div>
            <div>
              <h3 className={styles.birdId}>
                {bird.birdId || `BRD-${String(bird.id).padStart(4, '0')}`}
                <Badge variant={getStatusVariant(bird.status)} dot>
                  {bird.status}
                </Badge>
              </h3>
              <div className={styles.birdName}>
                {bird.name ? `"${bird.name}" · ` : ''}
                {bird.breed} ({bird.type})
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
          {/* Quick Status Bar */}
          <div className={styles.statusBanner}>
            <span className={styles.statusLabel}>Quick Status Transition:</span>
            <div className={styles.statusButtons}>
              {BIRD_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`${styles.statusBtn} ${bird.status === st ? styles.statusBtnActive : ''}`}
                  onClick={() => onUpdateStatus && onUpdateStatus(bird.id, st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Identification */}
          <div className={styles.sectionTitle}>Identification & Biological Data</div>
          <div className={styles.grid3}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>System Bird ID</span>
              <span className={`${styles.infoValue} ${styles.monoValue}`}>
                {bird.birdId || `BRD-${String(bird.id).padStart(4, '0')}`}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tag Number</span>
              <span className={styles.infoValue}>
                {bird.tagNumber ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={13} style={{ color: '#40916C' }} />
                    <span className={styles.monoValue}>{bird.tagNumber}</span>
                  </span>
                ) : (
                  'None (Untagged)'
                )}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Reference / Name</span>
              <span className={styles.infoValue}>{bird.name || '—'}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Bird Type</span>
              <span className={styles.infoValue}>{bird.type}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Breed</span>
              <span className={styles.infoValue}>{bird.breed}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Gender</span>
              <span className={styles.infoValue}>{bird.gender}</span>
            </div>
          </div>

          {/* Section 2: Chronology & Age */}
          <div className={styles.sectionTitle}>Chronology & Age Tracking</div>
          <div className={styles.grid3}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Calculated Age</span>
              <span className={styles.infoValue} style={{ color: '#2D6A4F' }}>
                {age}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Hatch Date</span>
              <span className={styles.infoValue}>
                <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                {formatDate(bird.hatchDate)}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Acquisition Date</span>
              <span className={styles.infoValue}>{formatDate(bird.acquisitionDate)}</span>
            </div>
          </div>

          {/* Section 3: Housing & Flock Assignment */}
          <div className={styles.sectionTitle}>Housing & Flock Assignment</div>
          <div className={styles.grid2}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Poultry House / Pen</span>
              <span className={styles.infoValue}>
                <MapPin size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2, color: '#1B4332' }} />
                {bird.houseNumber || 'Pen 1'}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Batch Assignment</span>
              <span className={styles.infoValue}>
                <Layers size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2, color: '#40916C' }} />
                {bird.batchCode || (bird.batchId ? `Batch #${bird.batchId}` : 'Standalone Individual (No Cohort)')}
              </span>
            </div>
          </div>

          {/* Section 4: Origin & Financial Value */}
          <div className={styles.sectionTitle}>Origin & Valuation</div>
          <div className={styles.grid2}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Source or Supplier</span>
              <span className={styles.infoValue}>{bird.source || 'Farm Hatched'}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Purchase Price</span>
              <span className={`${styles.infoValue} ${styles.currencyValue}`}>
                {formatCurrency(bird.purchasePrice)}
              </span>
            </div>
          </div>

          {/* Section 5: Notes */}
          <div className={styles.sectionTitle}>Clinical & Pedigree Notes</div>
          <div className={styles.notesCard}>
            {bird.notes && bird.notes.trim() ? bird.notes : 'No additional observation notes recorded for this bird.'}
          </div>

          {/* Timestamps */}
          <div className={styles.metaRow}>
            <span>Registered on: {formatDate(bird.createdAt)}</span>
            <span>Last record update: {formatDate(bird.updatedAt || bird.createdAt)}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={15} />}
            onClick={() => onDelete(bird)}
          >
            Delete Bird
          </Button>
          <div className={styles.footerActions}>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 size={15} />}
              onClick={() => onEdit(bird)}
            >
              Edit Details
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
