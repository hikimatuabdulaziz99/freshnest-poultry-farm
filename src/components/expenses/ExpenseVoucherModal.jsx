import { useState, useEffect } from 'react';
import {
  X,
  Printer,
} from 'lucide-react';
import { expenseService, formatNaira } from '../../services/expenseService.js';
import styles from './ExpenseVoucherModal.module.css';

export function ExpenseVoucherModal({
  isOpen,
  onClose,
  expense,
}) {
  const [voucherData, setVoucherData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadVoucher() {
      if (!expense) return;
      setIsLoading(true);
      try {
        const data = await expenseService.generateVoucherData(expense.expenseId || expense.id);
        if (isMounted) {
          setVoucherData(data);
        }
      } catch (err) {
        console.error('Failed to load voucher data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (isOpen && expense) {
      loadVoucher();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, expense]);

  if (!isOpen || !expense) return null;

  const handlePrint = () => {
    window.print();
  };

  const farm = voucherData?.farm || {
    name: 'FreshNest Poultry Farm',
    tagline: 'Smart Management for Healthy Poultry Farming',
    address: 'KM 14, Iwo-Ibadan Expressway, Osun State, Nigeria',
    phone: '+234 803 123 4567',
  };

  const exp = voucherData?.expense || expense;
  const payments = voucherData?.payments || [];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Expense Payment Voucher: {exp.expenseId}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Generating official payment voucher...
            </div>
          ) : (
            <div className={styles.voucherPaper}>
              {/* Header */}
              <div className={styles.voucherHeader}>
                <h1 className={styles.farmTitle}>{farm.name}</h1>
                <p className={styles.farmSubtitle}>{farm.tagline}</p>
                <p className={styles.farmSubtitle}>{farm.address} · Tel: {farm.phone}</p>
                <span className={styles.voucherBadge}>DISBURSEMENT / EXPENSE VOUCHER</span>
              </div>

              {/* Metadata */}
              <div className={styles.voucherMetaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Voucher #</span>
                  <span className={styles.metaValue}>{exp.expenseId}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Date Incurred</span>
                  <span className={styles.metaValue}>{exp.expenseDate || exp.date || '—'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Paid / Issued To</span>
                  <span className={styles.metaValue}>{exp.supplier || exp.paidTo || '—'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Category</span>
                  <span className={styles.metaValue}>{exp.category}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Payment Status</span>
                  <span className={styles.metaValue} style={{ color: exp.paymentStatus === 'Paid' ? '#1b4332' : '#b45309' }}>
                    {exp.paymentStatus}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Ref / Receipt #</span>
                  <span className={styles.metaValue}>{exp.receiptNumber || exp.referenceNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Item Details */}
              <table className={styles.expenseDetailsTable}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th style={{ textAlign: 'right' }}>Total (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>{exp.description || exp.itemDescription}</strong>
                      {exp.linkedPurchaseId && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Linked to Stock Purchase: {exp.linkedPurchaseId}
                        </div>
                      )}
                      {exp.notes && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.2rem' }}>
                          Note: {exp.notes}
                        </div>
                      )}
                    </td>
                    <td>{exp.quantity || '—'}</td>
                    <td>{exp.unitCost ? formatNaira(exp.unitCost) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNaira(exp.amount)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className={styles.totalsBox}>
                <div className={styles.totalRow}>
                  <span>Total Amount Incurred:</span>
                  <strong>{formatNaira(exp.amount)}</strong>
                </div>
                <div className={styles.totalRow}>
                  <span>Amount Settled (Paid):</span>
                  <strong style={{ color: '#2e7d32' }}>{formatNaira(exp.amountPaid || 0)}</strong>
                </div>
                <div className={`${styles.totalRow} ${styles.totalGrand}`}>
                  <span>Outstanding Balance:</span>
                  <span style={{ color: Number(exp.outstandingBalance) > 0 ? '#b45309' : '#1b4332' }}>
                    {formatNaira(exp.outstandingBalance || 0)}
                  </span>
                </div>
              </div>

              {/* Payment History Ledger */}
              {payments.length > 0 && (
                <div className={styles.paymentsHistory}>
                  <h4 className={styles.paymentsTitle}>Payment Ledger ({payments.length})</h4>
                  <div className={styles.paymentsList}>
                    {payments.map((p) => (
                      <div key={p.id || p.paymentId} className={styles.paymentRow}>
                        <span>
                          <strong>{p.paymentId}</strong> · {p.paymentDate || p.date} ({p.paymentMethod})
                        </span>
                        <strong style={{ color: '#2e7d32' }}>{formatNaira(p.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className={styles.signatures}>
                <div className={styles.signatureLine}>
                  Recorded By ({exp.recordedBy || 'Administrator'})
                </div>
                <div className={styles.signatureLine}>
                  Authorized Farm Manager / Bursar
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Close
          </button>
          <button type="button" className={styles.btnPrint} onClick={handlePrint}>
            <Printer size={16} />
            Print Voucher
          </button>
        </div>
      </div>
    </div>
  );
}
