import { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  getLocalDateString,
  PAYMENT_METHODS,
  toKobo,
  fromKobo,
  formatNaira,
} from '../../services/expenseService.js';
import styles from './ExpensePaymentModal.module.css';

export function ExpensePaymentModal({
  isOpen,
  onClose,
  onSavePayment,
  expense,
}) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Administrator');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setPaymentAmount(String(expense.outstandingBalance || ''));
      setPaymentMethod(expense.paymentMethod || 'Cash');
      setPaymentDate(getLocalDateString());
      setNotes('');
      setRecordedBy('Administrator');
      setError('');
    }
  }, [expense, isOpen]);

  if (!isOpen || !expense) return null;

  const outstandingNum = Number(expense.outstandingBalance) || 0;
  const proposedNum = Number(paymentAmount) || 0;
  const remainingAfterPayment = Math.max(0, fromKobo(toKobo(outstandingNum) - toKobo(proposedNum)));

  const handlePayFull = () => {
    setPaymentAmount(String(outstandingNum));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (toKobo(amt) > toKobo(outstandingNum)) {
      setError(
        `Payment amount (${formatNaira(amt)}) exceeds outstanding balance (${formatNaira(outstandingNum)}). Overpayment prevented.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSavePayment({
        expenseId: expense.expenseId,
        amount: amt,
        paymentMethod,
        paymentDate,
        notes: notes.trim(),
        recordedBy: recordedBy.trim() || 'Administrator',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <CreditCard size={20} />
            Record Payment for {expense.expenseId}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {error && (
            <div className={styles.errorAlert}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Current Ledger Summary */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Category:</span>
              <span className={styles.summaryValue}>{expense.category}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Supplier / Payee:</span>
              <span className={styles.summaryValue}>{expense.supplier || expense.paidTo}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Total Expense Amount:</span>
              <span className={styles.summaryValue}>{formatNaira(expense.amount)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Total Settled (Paid):</span>
              <span className={styles.summaryValue} style={{ color: '#2e7d32' }}>
                {formatNaira(expense.amountPaid)}
              </span>
            </div>
            <div className={styles.summaryRow} style={{ borderTop: '1px dashed #d8f3dc', paddingTop: '0.5rem' }}>
              <span className={styles.summaryLabel} style={{ fontWeight: 600 }}>Outstanding Balance:</span>
              <span className={styles.outstandingValue}>{formatNaira(outstandingNum)}</span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Payment Amount (₦) *</label>
            <div className={styles.inputGroup}>
              <input
                type="number"
                min="0.01"
                step="any"
                max={outstandingNum}
                className={styles.input}
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
              <button type="button" className={styles.quickPayBtn} onClick={handlePayFull}>
                Pay Full Balance
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Remaining balance after payment: <strong>{formatNaira(remainingAfterPayment)}</strong>
            </span>
          </div>

          {/* Payment Method & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Payment Method</label>
              <select
                className={styles.select}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Payment Date</label>
              <input
                type="date"
                className={styles.input}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Recorded By */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Recorded By</label>
            <input
              type="text"
              className={styles.input}
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Notes (Optional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Bank transfer ref / Cheque number..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              <CheckCircle size={16} />
              {isSubmitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
