import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import {
  getLocalDateString,
  PAYMENT_METHODS,
  toKobo,
  fromKobo,
  formatNaira,
} from '../../services/expenseService.js';
import styles from './ExpenseRecordModal.module.css';

export function ExpenseRecordModal({
  isOpen,
  onClose,
  onSave,
  expenseToEdit = null,
  categories = [],
  onAddCustomCategory,
  batches = [],
  pens = [],
}) {
  const isEditing = Boolean(expenseToEdit);

  const [category, setCategory] = useState('Feed purchases');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());
  const [receiptNumber, setReceiptNumber] = useState('');
  const [batchId, setBatchId] = useState('');
  const [penId, setPenId] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Administrator');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expenseToEdit) {
      setCategory(expenseToEdit.category || 'Feed purchases');
      setDescription(expenseToEdit.description || expenseToEdit.itemDescription || '');
      setSupplier(expenseToEdit.supplier || expenseToEdit.paidTo || '');
      setAmount(String(expenseToEdit.amount || ''));
      setQuantity(expenseToEdit.quantity ? String(expenseToEdit.quantity) : '');
      setUnitCost(expenseToEdit.unitCost ? String(expenseToEdit.unitCost) : '');
      setAmountPaid(String(expenseToEdit.amountPaid || '0'));
      setPaymentMethod(expenseToEdit.paymentMethod || 'Cash');
      setExpenseDate(expenseToEdit.expenseDate || expenseToEdit.date || getLocalDateString());
      setReceiptNumber(expenseToEdit.receiptNumber || expenseToEdit.referenceNumber || '');
      setBatchId(expenseToEdit.batchId || '');
      setPenId(expenseToEdit.penId || '');
      setNotes(expenseToEdit.notes || '');
      setRecordedBy(expenseToEdit.recordedBy || 'Administrator');
    } else {
      setCategory(categories[0] || 'Feed purchases');
      setDescription('');
      setSupplier('');
      setAmount('');
      setQuantity('');
      setUnitCost('');
      setAmountPaid('');
      setPaymentMethod('Cash');
      setExpenseDate(getLocalDateString());
      setReceiptNumber('');
      setBatchId('');
      setPenId('');
      setNotes('');
      setRecordedBy('Administrator');
    }
    setError('');
    setShowAddCategory(false);
  }, [expenseToEdit, isOpen, categories]);

  // If quantity and unit cost are provided, auto-compute total amount
  const handleQtyCostChange = (newQty, newCost) => {
    const q = Number(newQty);
    const c = Number(newCost);
    if (!isNaN(q) && q > 0 && !isNaN(c) && c > 0) {
      const total = fromKobo(toKobo(q * c));
      setAmount(String(total));
    }
  };

  const calculatedBalances = useMemo(() => {
    const totalK = toKobo(amount || 0);
    const paidK = toKobo(amountPaid || 0);
    const outK = Math.max(0, totalK - paidK);
    return {
      total: fromKobo(totalK),
      paid: fromKobo(paidK),
      outstanding: fromKobo(outK),
      status: paidK >= totalK && totalK > 0 ? 'Paid' : paidK > 0 ? 'Partial' : 'Unpaid',
    };
  }, [amount, amountPaid]);

  if (!isOpen) return null;

  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const added = await onAddCustomCategory(newCategoryName.trim());
      setCategory(added);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (err) {
      setError(err.message || 'Failed to add custom category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!category.trim()) {
      setError('Please select or specify an expense category.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide an expense description.');
      return;
    }
    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Expense amount must be greater than zero.');
      return;
    }

    const paidNum = amountPaid === '' ? 0 : Number(amountPaid);
    if (isNaN(paidNum) || paidNum < 0) {
      setError('Amount paid cannot be negative.');
      return;
    }

    if (!isEditing && paidNum > amtNum) {
      setError(`Initial payment cannot exceed total expense amount (${formatNaira(amtNum)}).`);
      return;
    }

    if (isEditing) {
      const alreadyPaid = Number(expenseToEdit.amountPaid || 0);
      if (amtNum < alreadyPaid) {
        setError(`Updated amount cannot be less than already paid amount (${formatNaira(alreadyPaid)}).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category,
        description: description.trim(),
        amount: amtNum,
        quantity: quantity ? Number(quantity) : null,
        unitCost: unitCost ? Number(unitCost) : null,
        amountPaid: isEditing ? undefined : paidNum, // don't overwrite amountPaid directly during edit
        supplier: supplier.trim() || 'General Payee',
        paymentMethod,
        expenseDate,
        receiptNumber: receiptNumber.trim(),
        batchId: batchId || null,
        penId: penId || null,
        notes: notes.trim(),
        recordedBy: recordedBy.trim() || 'Administrator',
      };

      await onSave(payload, expenseToEdit?.expenseId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save expense record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Receipt size={20} />
            {isEditing ? `Edit Expense: ${expenseToEdit.expenseId}` : 'Record New Expense'}
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

          <div className={styles.formGrid}>
            {/* Category */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabel}>Expense Category *</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#40916c', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => setShowAddCategory(!showAddCategory)}
                >
                  {showAddCategory ? 'Cancel Custom Category' : '+ Add Custom Category'}
                </button>
              </div>

              {!showAddCategory ? (
                <select
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={styles.addCategoryRow}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Enter custom category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button type="button" className={styles.addCatBtn} onClick={handleAddCategorySubmit}>
                    Add Category
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Description *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. 50 bags Broiler Finisher from Animal Care"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Supplier / Payee */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Supplier / Payee</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Crown Feeds Ltd / Staff Member"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {/* Expense Date */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expense Date *</label>
              <input
                type="date"
                className={styles.input}
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>

            {/* Quantity (Optional) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Quantity (Optional)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  handleQtyCostChange(e.target.value, unitCost);
                }}
              />
            </div>

            {/* Unit Cost (Optional) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Unit Cost (₦ Optional)</label>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                placeholder="e.g. 7500"
                value={unitCost}
                onChange={(e) => {
                  setUnitCost(e.target.value);
                  handleQtyCostChange(quantity, e.target.value);
                }}
              />
            </div>

            {/* Total Amount */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Total Amount (₦) *</label>
              <input
                type="number"
                min="0"
                step="any"
                className={styles.input}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Amount Paid (Creation mode only) */}
            {!isEditing ? (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount Paid (₦ Initial Payment)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={styles.input}
                  placeholder="0.00 (leave 0 if unpaid)"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount Paid (₦ Already Settled)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formatNaira(expenseToEdit.amountPaid || 0)}
                  disabled
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>
            )}

            {/* Payment Method */}
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

            {/* Receipt / Invoice Number */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Receipt / Ref #</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. INV-9812 / REC-441"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </div>

            {/* Related Batch (Optional) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Related Batch (Optional)</label>
              <select
                className={styles.select}
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                <option value="">None / General Farm</option>
                {batches.map((b) => (
                  <option key={b.id || b.batchId} value={b.batchId || b.id}>
                    {b.batchCode || `Batch #${b.id}`} ({b.birdType})
                  </option>
                ))}
              </select>
            </div>

            {/* Related Pen (Optional) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Related Pen (Optional)</label>
              <select
                className={styles.select}
                value={penId}
                onChange={(e) => setPenId(e.target.value)}
              >
                <option value="">None / General Farm</option>
                {pens.map((p) => (
                  <option key={p.id || p.penId} value={p.penId || p.id}>
                    {p.name || p.penId}
                  </option>
                ))}
              </select>
            </div>

            {/* Recorded By */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Recorded By</label>
              <input
                type="text"
                className={styles.input}
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Notes (Optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Additional details regarding this operational expense..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Financial Summary Card */}
            <div className={`${styles.calcCard} ${styles.fullWidth}`}>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>Total Expense:</span>
                <span className={styles.calcValue}>{formatNaira(calculatedBalances.total)}</span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>Amount Paid:</span>
                <span className={styles.calcValue} style={{ color: '#2e7d32' }}>
                  {formatNaira(calculatedBalances.paid)}
                </span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>Outstanding Balance:</span>
                <span
                  className={styles.calcValue}
                  style={{ color: calculatedBalances.outstanding > 0 ? '#b45309' : '#1b4332' }}
                >
                  {formatNaira(calculatedBalances.outstanding)}
                </span>
              </div>
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>Payment Status:</span>
                <span className={styles.calcValue}>{calculatedBalances.status}</span>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
