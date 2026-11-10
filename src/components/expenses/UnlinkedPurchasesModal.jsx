import { useState, useEffect } from 'react';
import {
  X,
  Link,
  CheckCircle,
} from 'lucide-react';
import { expenseService, formatNaira } from '../../services/expenseService.js';
import styles from './UnlinkedPurchasesModal.module.css';

export function UnlinkedPurchasesModal({
  isOpen,
  onClose,
  onLinkedSuccess,
}) {
  const [unlinked, setUnlinked] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [linkingId, setLinkingId] = useState(null);
  const [message, setMessage] = useState('');

  const loadUnlinked = async () => {
    setIsLoading(true);
    try {
      const data = await expenseService.getUnlinkedPurchases();
      setUnlinked(data);
    } catch (err) {
      console.error('Failed to load unlinked purchases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUnlinked();
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLink = async (purchase) => {
    setLinkingId(purchase.purchaseId);
    try {
      await expenseService.linkPurchaseAsExpense(purchase.purchaseType, purchase.purchaseId);
      setMessage(`Successfully linked ${purchase.purchaseId} as an operational expense without duplicating stock.`);
      await loadUnlinked();
      if (onLinkedSuccess) onLinkedSuccess();
    } catch (err) {
      setMessage(`Error: ${err.message || 'Failed to link purchase'}`);
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Unlinked Stock Purchases ({unlinked.length})
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.infoBanner}>
            <strong>Safe Purchase Integration:</strong> Purchases recorded in Feed, Medication, and Vaccination modules credit inventory.
            Linking them here records their financial cost in the expense ledger <em>without duplicating inventory stock movements</em>.
          </div>

          {message && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: message.startsWith('Error') ? '#fef2f2' : '#ecfdf5',
              color: message.startsWith('Error') ? '#991b1b' : '#064e3b',
              fontSize: '0.8125rem',
            }}>
              {message}
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Scanning Feeds, Medications, and Vaccines catalogs...
            </div>
          ) : unlinked.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle size={36} color="#40916c" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>All Stock Purchases are Linked!</p>
              <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                Every recorded Feed, Medication, and Vaccine purchase is already accounted for in the expense ledger.
              </p>
            </div>
          ) : (
            <table className={styles.purchaseTable}>
              <thead>
                <tr>
                  <th>Purchase ID</th>
                  <th>Module</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Cost (₦)</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {unlinked.map((p) => (
                  <tr key={p.purchaseId}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b4332' }}>
                      {p.purchaseId}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#e2e8f0',
                        color: '#334155',
                      }}>
                        {p.purchaseTypeLabel}
                      </span>
                    </td>
                    <td>{p.date}</td>
                    <td>{p.supplier}</td>
                    <td style={{ fontWeight: 700 }}>{formatNaira(p.amount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => handleLink(p)}
                        disabled={linkingId === p.purchaseId}
                      >
                        <Link size={13} />
                        {linkingId === p.purchaseId ? 'Linking...' : 'Link as Expense'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
