import { useState, useEffect } from 'react';
import {
  X,
  Pill,
  ShieldAlert,
  Clock,
  History,
  ShoppingCart,
  Syringe,
  PlusCircle,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { db } from '../../database/db.js';
import styles from './MedicationDetailsModal.module.css';

/**
 * Medication Details Modal
 * Comprehensive view of pharmacy specifications, purchase receipts, treatment logs, and active withdrawal holds
 */
export function MedicationDetailsModal({
  isOpen,
  onClose,
  medication,
  onRestock,
  onAdminister,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'purchases', 'treatments', 'withdrawals'
  const [purchases, setPurchases] = useState([]);
  const [treatmentLogs, setTreatmentLogs] = useState([]);
  const [activeWithdrawals, setActiveWithdrawals] = useState([]);
  const [_isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && medication) {
      loadHistory();
    }
  }, [isOpen, medication]);

  const loadHistory = async () => {
    if (!medication) return;
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const now = new Date();

      const [allPurchases, allLogs] = await Promise.all([
        db.medicationPurchases
          .where('medicationId')
          .equals(medication.medicationId)
          .toArray(),
        db.medicationLogs
          .where('medicationId')
          .equals(medication.medicationId)
          .toArray(),
      ]);

      setPurchases(
        allPurchases.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''))
      );

      setTreatmentLogs(
        allLogs.sort((a, b) => (b.administeredDate || '').localeCompare(a.administeredDate || ''))
      );

      // Filter active withdrawals for this drug
      const holds = allLogs
        .filter((l) => l.withdrawalPeriodDays > 0 && l.withdrawalEndDate && l.withdrawalEndDate >= todayStr)
        .map((l) => {
          const endDate = new Date(`${l.withdrawalEndDate}T23:59:59`);
          const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
          return {
            ...l,
            daysRemaining,
          };
        });

      setActiveWithdrawals(holds);
    } catch (err) {
      console.error('Error loading medication history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !medication) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose} aria-hidden="true" />
      <div className={styles.modalContainer} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerIcon}>
              <Pill size={22} />
            </div>
            <div>
              <div className={styles.titleCodeRow}>
                <h2 className={styles.modalTitle}>{medication.name}</h2>
                <span className={styles.medCode}>{medication.medicationId}</span>
              </div>
              <p className={styles.modalSubtitle}>
                {medication.type} · {medication.activeIngredient || 'No active ingredient specified'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview & Dosage
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'withdrawals' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('withdrawals')}
          >
            <span>Food Safety Holds</span>
            {activeWithdrawals.length > 0 && (
              <span className={styles.tabBadgeRed}>{activeWithdrawals.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'treatments' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('treatments')}
          >
            <span>Treatments</span>
            <span className={styles.tabBadge}>{treatmentLogs.length}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'purchases' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            <span>Stock-In History</span>
            <span className={styles.tabBadge}>{purchases.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.modalBody}>
          {activeTab === 'overview' && (
            <div className={styles.overviewGrid}>
              {/* Highlight summary row */}
              <div className={styles.summaryBar}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Current Stock</span>
                  <strong className={styles.stockHighlight}>
                    {medication.currentStock} {medication.unit}
                  </strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Reorder Alert</span>
                  <strong>{medication.reorderLevel} {medication.unit}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Unit Price</span>
                  <strong className={styles.priceHighlight}>
                    {formatCurrency(medication.unitPrice)}
                  </strong>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Inventory Value</span>
                  <strong>
                    {formatCurrency((Number(medication.currentStock) || 0) * (Number(medication.unitPrice) || 0))}
                  </strong>
                </div>
              </div>

              {/* Details table grid */}
              <div className={styles.detailsSection}>
                <h4 className={styles.sectionTitle}>Veterinary & Administration Specifications</h4>
                <div className={styles.specGrid}>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Category / Type</span>
                    <span className={styles.specVal}>{medication.type}</span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Administration Route</span>
                    <span className={styles.specVal}>{medication.route || 'Oral'}</span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Active Ingredient</span>
                    <span className={styles.specVal}>{medication.activeIngredient || '—'}</span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Target Disease / Condition</span>
                    <span className={styles.specVal}>{medication.targetDisease || '—'}</span>
                  </div>
                  <div className={styles.specItemFull}>
                    <span className={styles.specLabel}>Dosage Instructions</span>
                    <span className={styles.specValBold}>{medication.dosage || 'Follow veterinary prescription.'}</span>
                  </div>
                </div>
              </div>

              {/* Biosecurity & Safety Section */}
              <div className={styles.detailsSection}>
                <h4 className={styles.sectionTitle}>Lot Tracking & Food Safety Withdrawal</h4>
                <div className={styles.specGrid}>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Lot / Batch Number</span>
                    <span className={styles.specVal}>{medication.lotNumber || '—'}</span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Expiration Date</span>
                    <span className={medication.status === 'Expired' ? styles.textRedBold : styles.specVal}>
                      {formatDate(medication.expiryDate)}
                    </span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Withdrawal Period</span>
                    <span className={styles.withdrawalHoldTag}>
                      {medication.withdrawalPeriodDays > 0
                        ? `${medication.withdrawalPeriodDays} Days Meat & Egg Hold`
                        : '0 Days (No Hold)'}
                    </span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Supplier</span>
                    <span className={styles.specVal}>{medication.supplier || '—'}</span>
                  </div>
                  <div className={styles.specItemFull}>
                    <span className={styles.specLabel}>Storage Instructions</span>
                    <span className={styles.specVal}>{medication.storageInstructions || 'Cool, dry place.'}</span>
                  </div>
                  {medication.notes && (
                    <div className={styles.specItemFull}>
                      <span className={styles.specLabel}>Notes & Contraindications</span>
                      <span className={styles.specVal}>{medication.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className={styles.tabListWrapper}>
              {activeWithdrawals.length === 0 ? (
                <div className={styles.emptyTabState}>
                  <CheckCircle2 size={36} className={styles.successIcon} />
                  <h4>No Active Withdrawal Restrictions</h4>
                  <p>
                    No poultry batches or individual birds are currently restricted by this medication.
                  </p>
                </div>
              ) : (
                <div className={styles.withdrawalHoldList}>
                  <div className={styles.withdrawalNoticeBanner}>
                    <ShieldAlert size={20} />
                    <span>
                      {activeWithdrawals.length} active restriction(s) in place. Do NOT harvest or sell eggs/meat until clearance!
                    </span>
                  </div>
                  {activeWithdrawals.map((hold) => (
                    <div key={hold.id} className={styles.holdCard}>
                      <div className={styles.holdCardTop}>
                        <strong>{hold.targetDisplay}</strong>
                        <span className={styles.holdDaysBadge}>
                          <Clock size={13} />
                          {hold.daysRemaining} days left
                        </span>
                      </div>
                      <div className={styles.holdCardDetails}>
                        <span>Administered: {formatDate(hold.administeredDate)}</span>
                        <span>Clearance Date: <strong>{formatDate(hold.withdrawalEndDate)}</strong></span>
                        <span>Dosage: {hold.dosageGiven}</span>
                        <span>Staff: {hold.administeredBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'treatments' && (
            <div className={styles.tabListWrapper}>
              {treatmentLogs.length === 0 ? (
                <div className={styles.emptyTabState}>
                  <History size={36} className={styles.neutralIcon} />
                  <h4>No Treatment Records Logged</h4>
                  <p>No birds or batches have been treated with this medicine yet.</p>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.subTable}>
                    <thead>
                      <tr>
                        <th>Log ID</th>
                        <th>Target</th>
                        <th>Dosage</th>
                        <th>Route</th>
                        <th>Date</th>
                        <th>Staff</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatmentLogs.map((log) => (
                        <tr key={log.id}>
                          <td><strong>{log.logId}</strong></td>
                          <td>{log.targetDisplay}</td>
                          <td>{log.dosageGiven}</td>
                          <td>{log.route}</td>
                          <td>{formatDate(log.administeredDate)}</td>
                          <td>{log.administeredBy}</td>
                          <td>{log.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className={styles.tabListWrapper}>
              {purchases.length === 0 ? (
                <div className={styles.emptyTabState}>
                  <ShoppingCart size={36} className={styles.neutralIcon} />
                  <h4>No Stock-In Purchases Recorded</h4>
                  <p>Stock additions will be logged in this ledger.</p>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.subTable}>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Total Cost</th>
                        <th>Supplier</th>
                        <th>Invoice #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((pur) => (
                        <tr key={pur.id}>
                          <td><strong>{pur.purchaseId}</strong></td>
                          <td>{formatDate(pur.purchaseDate)}</td>
                          <td>{pur.quantity} {pur.unit}</td>
                          <td>{formatCurrency(pur.unitCost)}</td>
                          <td><strong>{formatCurrency(pur.totalCost)}</strong></td>
                          <td>{pur.supplier}</td>
                          <td>{pur.invoiceNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.modalFooter}>
          <div className={styles.leftActions}>
            <button
              type="button"
              className={styles.actionBtnOutline}
              onClick={() => {
                onClose();
                onEdit(medication);
              }}
            >
              <Edit2 size={15} />
              <span>Edit Details</span>
            </button>
          </div>
          <div className={styles.rightActions}>
            <button
              type="button"
              className={styles.restockActionBtn}
              onClick={() => {
                onClose();
                onRestock(medication);
              }}
            >
              <PlusCircle size={15} />
              <span>Stock-In</span>
            </button>
            <button
              type="button"
              className={styles.administerActionBtn}
              onClick={() => {
                onClose();
                onAdminister(medication);
              }}
              disabled={Number(medication.currentStock) <= 0}
            >
              <Syringe size={15} />
              <span>Administer Treatment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
