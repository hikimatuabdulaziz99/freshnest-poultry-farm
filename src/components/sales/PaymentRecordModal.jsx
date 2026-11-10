import { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import {
  getLocalDateString,
  PAYMENT_METHODS,
  toKobo,
  fromKobo,
  formatNaira,
} from '../../services/salesService.js';
import styles from './PaymentRecordModal.module.css';

export function PaymentRecordModal({
  isOpen,
  onClose,
  sale,
  onSavePayment,
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Farm Staff');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const outstanding = Number(sale?.outstandingBalance) || 0;

  useEffect(() => {
    if (isOpen && sale) {
      setAmount(String(sale.outstandingBalance || ''));
      setPaymentMethod('Cash');
      setPaymentDate(getLocalDateString());
      setNotes(`Payment against sale ${sale.saleId || sale.invoiceNumber}`);
      setRecordedBy('Farm Staff');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const parsedAmountKobo = toKobo(parseFloat(amount) || 0);
  const outstandingKobo = toKobo(outstanding);
  const remainingKobo = Math.max(0, outstandingKobo - parsedAmountKobo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (parsedAmountKobo > outstandingKobo) {
      setError(`Payment cannot exceed the outstanding balance of ${formatNaira(outstanding)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSavePayment({
        saleId: sale.saleId,
        amount: parsedAmt,
        paymentMethod,
        paymentDate,
        date: paymentDate,
        notes: notes.trim(),
        recordedBy: recordedBy.trim(),
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
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Record Customer Payment</h3>
              <p className={styles.modalSubtitle}>
                Add settlement payment against Sale {sale.saleId || sale.invoiceNumber}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Sale Summary Banner */}
            <div className={styles.saleSummaryCard}>
              <div className={styles.summaryRow}>
                <span>Customer:</span>
                <strong>{sale.customerName}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Item:</span>
                <span>{sale.productDescription || sale.productType}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Invoiced:</span>
                <span>{formatNaira(sale.totalAmount)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Amount Already Paid:</span>
                <span style={{ color: '#166534', fontWeight: 600 }}>{formatNaira(sale.amountPaid)}</span>
              </div>
              <div className={styles.balanceRow}>
                <span>Current Outstanding:</span>
                <span>{formatNaira(outstanding)}</span>
              </div>
            </div>

            {/* Payment Amount & Method */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Payment Amount (₦) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={outstanding}
                  step="0.01"
                  className={styles.formInput}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Payment Method <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.formSelect}
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
            </div>

            {/* Date & Remaining Balance Indicator */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Date</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Balance After Payment</label>
                <div
                  className={styles.formInput}
                  style={{
                    backgroundColor: '#f8fafc',
                    color: remainingKobo > 0 ? '#b91c1c' : '#166534',
                    fontWeight: 700,
                  }}
                >
                  {formatNaira(fromKobo(remainingKobo))}
                </div>
              </div>
            </div>

            {/* Recorded By & Notes */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Recorded By</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Notes</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording Payment...' : 'Record Payment Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
