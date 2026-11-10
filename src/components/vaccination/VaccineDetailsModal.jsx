import { useState, useEffect } from 'react';
import {
  X,
  Syringe,
  Thermometer,
  Calendar,
  History,
  ShoppingCart,
  Edit2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { db } from '../../database/db.js';
import styles from './VaccineDetailsModal.module.css';

/**
 * Vaccine Details Modal
 * Comprehensive view of biologics specifications, cold chain compliance,
 * purchase history, scheduled flock events, and administration logs.
 */
export function VaccineDetailsModal({
  isOpen,
  onClose,
  vaccine,
  onRestock,
  onSchedule,
  onAdminister,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'purchases', 'schedules', 'history'
  const [purchases, setPurchases] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [_isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && vaccine) {
      loadDetailsData();
    }
  }, [isOpen, vaccine]);

  const loadDetailsData = async () => {
    if (!vaccine) return;
    setIsLoading(true);
    try {
      const [allPurchases, allSchedules, allLogs] = await Promise.all([
        db.vaccinePurchases
          .where('vaccineId')
          .equals(vaccine.vaccineId)
          .toArray(),
        db.vaccinationSchedules
          .where('vaccineId')
          .equals(vaccine.vaccineId)
          .toArray(),
        db.vaccinationLogs
          .where('vaccineId')
          .equals(vaccine.vaccineId)
          .toArray(),
      ]);

      setPurchases(
        allPurchases.sort((a, b) => new Date(b.purchaseDate || b.createdAt) - new Date(a.purchaseDate || a.createdAt))
      );
      setSchedules(
        allSchedules.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
      );
      setHistoryLogs(
        allLogs.sort((a, b) => new Date(b.administeredDate || b.createdAt) - new Date(a.administeredDate || a.createdAt))
      );
    } catch (err) {
      console.error('Error loading vaccine details history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !vaccine) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isExpired = vaccine.expiryDate && vaccine.expiryDate < todayStr;
  const isExpiringSoon =
    !isExpired &&
    vaccine.expiryDate &&
    vaccine.expiryDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const isLowStock = Number(vaccine.currentStock) <= Number(vaccine.reorderLevel);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerIcon}>
              <Syringe size={22} />
            </div>
            <div>
              <div className={styles.idBadgeRow}>
                <span className={styles.vaccineId}>{vaccine.vaccineId}</span>
                <span className={styles.diseasePill}>{vaccine.targetDisease}</span>
                <span
                  className={`${styles.statusBadge} ${
                    isExpired
                      ? styles.statusExpired
                      : vaccine.status === 'Archived'
                      ? styles.statusArchived
                      : isLowStock
                      ? styles.statusLow
                      : styles.statusActive
                  }`}
                >
                  {isExpired ? 'Expired' : isLowStock ? 'Low Stock' : vaccine.status || 'Active'}
                </span>
              </div>
              <h2 className={styles.modalTitle}>{vaccine.name}</h2>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cold chain status banner */}
        <div className={styles.coldChainBanner}>
          <div className={styles.coldChainIconWrap}>
            <Thermometer size={18} />
          </div>
          <div className={styles.coldChainText}>
            <strong>Cold Chain Biosecurity:</strong> Required Storage Temperature:{' '}
            <span className={styles.coldChainHighlight}>
              {vaccine.storageTemperature || '2°C – 8°C (Refrigerated)'}
            </span>
          </div>
          <div className={styles.coldChainVerified}>
            <ShieldCheck size={14} />
            <span>Standard Maintained</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabsNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Specifications & Details
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'schedules' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('schedules')}
          >
            Scheduled Events ({schedules.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'purchases' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            Stock-In Receipts ({purchases.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Administration Logs ({historyLogs.length})
          </button>
        </div>

        {/* Body Content */}
        <div className={styles.modalBody}>
          {activeTab === 'overview' && (
            <div className={styles.overviewSection}>
              {/* Alert notifications */}
              {isExpired && (
                <div className={styles.alertExpired}>
                  <AlertOctagon size={18} />
                  <div>
                    <strong>Vaccine Expired on {formatDate(vaccine.expiryDate)}</strong>
                    <p>Administration is strictly blocked by farm biosecurity protocols.</p>
                  </div>
                </div>
              )}

              {isExpiringSoon && (
                <div className={styles.alertWarning}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Expiring Soon</strong>
                    <p>This vaccine expires in less than 30 days ({formatDate(vaccine.expiryDate)}).</p>
                  </div>
                </div>
              )}

              {/* Grid 1: Essential Clinical Info */}
              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Vaccine Type</span>
                  <span className={styles.infoValue}>{vaccine.vaccineType || 'Live Attenuated'}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Manufacturer</span>
                  <span className={styles.infoValue}>{vaccine.manufacturer || 'Unspecified'}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Administration Method</span>
                  <span className={styles.infoValue}>{vaccine.administrationMethod || 'Drinking Water'}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Recommended Age</span>
                  <span className={styles.infoValue}>
                    {vaccine.recommendedAgeDays != null ? `Day ${vaccine.recommendedAgeDays}` : 'Flexible'}
                  </span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Dosage Instructions</span>
                  <span className={styles.infoValue}>{vaccine.dosageInstructions || 'As prescribed by veterinarian'}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Pack / Vial Size</span>
                  <span className={styles.infoValue}>{vaccine.packSize || '1000 doses / vial'}</span>
                </div>
              </div>

              {/* Grid 2: Inventory & Financial */}
              <h4 className={styles.sectionHeading}>Inventory & Valuation</h4>
              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Current Stock Balance</span>
                  <span className={`${styles.infoValueLarge} ${isLowStock ? styles.textRed : ''}`}>
                    {vaccine.currentStock} {vaccine.unit}
                  </span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Reorder Level</span>
                  <span className={styles.infoValue}>{vaccine.reorderLevel} {vaccine.unit}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Unit Cost</span>
                  <span className={styles.infoValue}>{formatCurrency(vaccine.costPerUnit || 0)}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Total Valuation</span>
                  <span className={styles.infoValueHighlight}>
                    {formatCurrency((Number(vaccine.currentStock) || 0) * (Number(vaccine.costPerUnit) || 0))}
                  </span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Batch / Lot Number</span>
                  <span className={styles.infoValue}>{vaccine.lotNumber || 'N/A'}</span>
                </div>
                <div className={styles.infoCard}>
                  <span className={styles.infoLabel}>Expiry Date</span>
                  <span className={`${styles.infoValue} ${isExpired ? styles.textRed : ''}`}>
                    {formatDate(vaccine.expiryDate)}
                  </span>
                </div>
              </div>

              {vaccine.notes && (
                <div className={styles.notesBox}>
                  <span className={styles.notesLabel}>Clinical & Biosecurity Notes:</span>
                  <p className={styles.notesText}>{vaccine.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedules' && (
            <div className={styles.tableWrap}>
              {schedules.length === 0 ? (
                <div className={styles.emptyState}>
                  <Calendar size={36} className={styles.emptyIcon} />
                  <p>No vaccination events scheduled for this vaccine yet.</p>
                </div>
              ) : (
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Schedule ID</th>
                      <th>Batch</th>
                      <th>Scheduled Date</th>
                      <th>Target Age</th>
                      <th>Status</th>
                      <th>Assigned Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.scheduleId}>
                        <td className={styles.idCell}>{s.scheduleId}</td>
                        <td>{s.batchName || s.batchId}</td>
                        <td>{formatDate(s.scheduledDate)}</td>
                        <td>Day {s.targetAgeDays || '—'}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              s.status === 'Completed'
                                ? styles.statusActive
                                : s.status === 'Cancelled'
                                ? styles.statusArchived
                                : styles.statusLow
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td>{s.assignedStaff || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className={styles.tableWrap}>
              {purchases.length === 0 ? (
                <div className={styles.emptyState}>
                  <ShoppingCart size={36} className={styles.emptyIcon} />
                  <p>No purchase records found for this vaccine product.</p>
                </div>
              ) : (
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Purchase ID</th>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Invoice #</th>
                      <th>Lot #</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.purchaseId}>
                        <td className={styles.idCell}>{p.purchaseId}</td>
                        <td>{formatDate(p.purchaseDate)}</td>
                        <td>{p.supplier}</td>
                        <td>{p.invoiceNumber || '—'}</td>
                        <td>{p.lotNumber || '—'}</td>
                        <td className={styles.boldCell}>+{p.quantity} {vaccine.unit}</td>
                        <td>{formatCurrency(p.unitCost || 0)}</td>
                        <td className={styles.totalCell}>{formatCurrency(p.totalCost || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className={styles.tableWrap}>
              {historyLogs.length === 0 ? (
                <div className={styles.emptyState}>
                  <History size={36} className={styles.emptyIcon} />
                  <p>No administration records found for this vaccine product.</p>
                </div>
              ) : (
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Date</th>
                      <th>Target</th>
                      <th>Doses</th>
                      <th>Immunised</th>
                      <th>Method</th>
                      <th>Administered By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLogs.map((h) => (
                      <tr key={h.logId}>
                        <td className={styles.idCell}>{h.logId}</td>
                        <td>{formatDate(h.administeredDate)}</td>
                        <td>{h.batchName || h.birdTag || h.batchId || h.birdId}</td>
                        <td className={styles.boldCell}>{h.quantity} {h.unit}</td>
                        <td>{h.birdsVaccinated ? `${h.birdsVaccinated} birds` : '—'}</td>
                        <td>{h.administrationMethod}</td>
                        <td>{h.administeredBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.modalFooter}>
          <div className={styles.leftActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                onClose();
                onEdit(vaccine);
              }}
            >
              <Edit2 size={15} />
              <span>Edit Product</span>
            </button>
          </div>

          <div className={styles.rightActions}>
            <button
              type="button"
              className={styles.restockBtn}
              onClick={() => {
                onClose();
                onRestock(vaccine);
              }}
            >
              <ShoppingCart size={15} />
              <span>Stock In (Purchase)</span>
            </button>
            <button
              type="button"
              className={styles.scheduleBtn}
              onClick={() => {
                onClose();
                onSchedule(vaccine);
              }}
            >
              <Calendar size={15} />
              <span>Schedule Event</span>
            </button>
            <button
              type="button"
              className={styles.administerBtn}
              onClick={() => {
                onClose();
                onAdminister(vaccine);
              }}
              disabled={isExpired || Number(vaccine.currentStock) <= 0}
              title={isExpired ? 'Cannot administer expired vaccine' : undefined}
            >
              <Syringe size={15} />
              <span>Administer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
