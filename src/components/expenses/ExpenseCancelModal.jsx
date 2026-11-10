import { useState } from 'react';
import {
  X,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { formatNaira } from '../../services/expenseService.js';
import styles from './ExpenseCancelModal.module.css';

export function ExpenseCancelModal({
  isOpen,
  onClose,
  onConfirmCancel,
  expense,
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for cancelling this expense.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmCancel(expense.expenseId || expense.id, reason.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to cancel expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Cancel Expense: {expense.expenseId}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.warningBox}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Audit-Safe Cancellation:</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                This expense and its linked payment records will be marked as Cancelled.
                The audit trail and payment history will be preserved and will no longer count towards farm expense totals.
              </p>
            </div>
          </div>

          <div className={styles.expenseSummary}>
            <div><strong>Category:</strong> {expense.category}</div>
            <div><strong>Description:</strong> {expense.description || expense.itemDescription}</div>
            <div><strong>Supplier / Payee:</strong> {expense.supplier || expense.paidTo}</div>
            <div><strong>Total Amount:</strong> {formatNaira(expense.amount)}</div>
            <div><strong>Amount Paid:</strong> {formatNaira(expense.amountPaid || 0)}</div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Reason for Cancellation *</label>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Duplicate entry, invoiced purchase cancelled by supplier..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.8125rem', margin: 0 }}>
              {error}
            </p>
          )}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
              Keep Active
            </button>
            <button type="submit" className={styles.btnDanger} disabled={isSubmitting}>
              <Ban size={16} />
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
