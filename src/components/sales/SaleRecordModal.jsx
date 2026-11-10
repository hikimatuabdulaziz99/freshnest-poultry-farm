import { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Bird,
  Egg,
  Package,
  AlertTriangle,
} from 'lucide-react';
import {
  getLocalDateString,
  PAYMENT_METHODS,
  toKobo,
  fromKobo,
  formatNaira,
} from '../../services/salesService.js';
import {
  EGG_GRADES,
  EGGS_PER_CRATE,
  eggProductionService,
} from '../../services/eggProductionService.js';
import styles from './SaleRecordModal.module.css';

export function SaleRecordModal({
  isOpen,
  onClose,
  onSave,
  batches = [],
  birds = [],
}) {
  const [productType, setProductType] = useState('LIVE_BIRDS'); // 'LIVE_BIRDS' | 'EGGS' | 'OTHER'
  const [birdSourceType, setBirdSourceType] = useState('BATCH'); // 'BATCH' | 'INDIVIDUAL'
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedBirdId, setSelectedBirdId] = useState('');

  // Egg fields
  const [eggGrade, setEggGrade] = useState('Grade A');
  const [eggUnit, setEggUnit] = useState('Crates'); // 'Crates' | 'Loose'
  const [eggStock, setEggStock] = useState({});

  // Other product field
  const [otherDescription, setOtherDescription] = useState('');

  // Customer & Date
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleDate, setSaleDate] = useState(getLocalDateString());

  // Financial inputs
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('4500');
  const [discount, setDiscount] = useState('0');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Farm Staff');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load egg inventory balances
  useEffect(() => {
    if (isOpen) {
      eggProductionService.getInventoryStock().then((stock) => {
        setEggStock(stock.byGrade || {});
      }).catch(console.error);
    }
  }, [isOpen]);

  // Filter active batches
  const activeBatches = useMemo(() => {
    return batches.filter((b) => b.status === 'Active' || b.status === 'Planned');
  }, [batches]);

  // Filter living birds (Active, Sick, Quarantined)
  const livingBirds = useMemo(() => {
    return birds.filter((b) => b.status !== 'Dead' && b.status !== 'Sold');
  }, [birds]);

  const currentBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return batches.find((b) => String(b.id) === String(selectedBatchId));
  }, [batches, selectedBatchId]);

  const currentBird = useMemo(() => {
    if (!selectedBirdId) return null;
    return birds.find((b) => String(b.id) === String(selectedBirdId));
  }, [birds, selectedBirdId]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setProductType('LIVE_BIRDS');
      setBirdSourceType('BATCH');
      setSelectedBatchId(activeBatches.length > 0 ? String(activeBatches[0].id) : '');
      setSelectedBirdId(livingBirds.length > 0 ? String(livingBirds[0].id) : '');
      setEggGrade('Grade A');
      setEggUnit('Crates');
      setOtherDescription('');
      setCustomerName('');
      setCustomerPhone('');
      setSaleDate(getLocalDateString());
      setQuantity('1');
      setUnitPrice('4500');
      setDiscount('0');
      setAmountPaid('');
      setPaymentMethod('Cash');
      setNotes('');
      setRecordedBy('Farm Staff');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, activeBatches, livingBirds]);

  // Update default unit price when product type changes
  const handleProductTypeChange = (type) => {
    setProductType(type);
    setError('');
    if (type === 'LIVE_BIRDS') {
      setUnitPrice('4500');
      setQuantity('1');
    } else if (type === 'EGGS') {
      setUnitPrice(eggUnit === 'Crates' ? '3500' : '120');
      setQuantity('1');
    } else {
      setUnitPrice('2000');
      setQuantity('1');
    }
  };

  const handleEggUnitChange = (unit) => {
    setEggUnit(unit);
    if (unit === 'Crates') {
      setUnitPrice('3500');
    } else {
      setUnitPrice('120');
    }
  };

  // Live calculations
  const parsedQty = parseInt(quantity, 10) || 0;
  const parsedUnitPrice = parseFloat(unitPrice) || 0;
  const parsedDiscount = parseFloat(discount) || 0;

  const subtotalKobo = parsedQty * toKobo(parsedUnitPrice);
  const discountKobo = toKobo(parsedDiscount);
  const totalAmountKobo = Math.max(0, subtotalKobo - discountKobo);

  const subtotal = fromKobo(subtotalKobo);
  const totalAmount = fromKobo(totalAmountKobo);

  // Effective amount paid
  const effectivePaidKobo = amountPaid === '' ? totalAmountKobo : toKobo(parseFloat(amountPaid) || 0);
  const effectivePaid = fromKobo(effectivePaidKobo);
  const outstandingKobo = Math.max(0, totalAmountKobo - effectivePaidKobo);
  const outstandingBalance = fromKobo(outstandingKobo);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (parsedQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (parsedUnitPrice < 0) {
      setError('Unit price cannot be negative.');
      return;
    }

    if (discountKobo > subtotalKobo) {
      setError('Discount cannot exceed the sale subtotal.');
      return;
    }

    if (effectivePaidKobo > totalAmountKobo) {
      setError('Amount paid cannot exceed the total sale amount.');
      return;
    }

    if (productType === 'LIVE_BIRDS') {
      if (birdSourceType === 'BATCH') {
        if (!selectedBatchId) {
          setError('Please select an active batch.');
          return;
        }
        if (currentBatch) {
          const living = Number(currentBatch.currentCount !== undefined ? currentBatch.currentCount : currentBatch.initialCount);
          if (parsedQty > living) {
            setError(`Sale quantity (${parsedQty}) exceeds available living birds in batch (${living} available).`);
            return;
          }
        }
      } else {
        if (!selectedBirdId) {
          setError('Please select an individual bird.');
          return;
        }
      }
    } else if (productType === 'EGGS') {
      const totalEggsNeeded = eggUnit === 'Crates' ? parsedQty * EGGS_PER_CRATE : parsedQty;
      const available = eggStock[eggGrade] || 0;
      if (totalEggsNeeded > available) {
        setError(
          `Insufficient egg inventory for ${eggGrade}. Requested: ${totalEggsNeeded} eggs. Available: ${available} eggs.`
        );
        return;
      }
    } else {
      if (!otherDescription.trim()) {
        setError('Please enter a description for the farm product.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        saleDate,
        date: saleDate,
        productType,
        birdSourceType: productType === 'LIVE_BIRDS' ? birdSourceType : null,
        batchId: productType === 'LIVE_BIRDS' && birdSourceType === 'BATCH' ? selectedBatchId : null,
        birdId: productType === 'LIVE_BIRDS' && birdSourceType === 'INDIVIDUAL' ? selectedBirdId : null,
        eggGrade: productType === 'EGGS' ? eggGrade : null,
        eggUnit: productType === 'EGGS' ? eggUnit : null,
        productDescription: productType === 'OTHER' ? otherDescription.trim() : null,
        quantity: parsedQty,
        unitPrice: parsedUnitPrice,
        discount: parsedDiscount,
        amountPaid: effectivePaid,
        paymentMethod,
        notes,
        recordedBy,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record sale.');
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
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Record New Farm Sale</h3>
              <p className={styles.modalSubtitle}>
                Sell live birds, table eggs, or farm products with real-time stock sync
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

            {/* Product Type Selector */}
            <div className={styles.typeSelectorRow}>
              <button
                type="button"
                className={`${styles.typeBtn} ${productType === 'LIVE_BIRDS' ? styles.typeBtnActive : ''}`}
                onClick={() => handleProductTypeChange('LIVE_BIRDS')}
              >
                <Bird size={15} />
                Live Birds
              </button>
              <button
                type="button"
                className={`${styles.typeBtn} ${productType === 'EGGS' ? styles.typeBtnActive : ''}`}
                onClick={() => handleProductTypeChange('EGGS')}
              >
                <Egg size={15} />
                Table Eggs
              </button>
              <button
                type="button"
                className={`${styles.typeBtn} ${productType === 'OTHER' ? styles.typeBtnActive : ''}`}
                onClick={() => handleProductTypeChange('OTHER')}
              >
                <Package size={15} />
                Other Products
              </button>
            </div>

            {/* 1. LIVE BIRDS CONFIGURATION */}
            {productType === 'LIVE_BIRDS' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Bird Source Category</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
                      <input
                        type="radio"
                        name="birdSource"
                        value="BATCH"
                        checked={birdSourceType === 'BATCH'}
                        onChange={() => setBirdSourceType('BATCH')}
                      />
                      Flock / Cohort Batch
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
                      <input
                        type="radio"
                        name="birdSource"
                        value="INDIVIDUAL"
                        checked={birdSourceType === 'INDIVIDUAL'}
                        onChange={() => {
                          setBirdSourceType('INDIVIDUAL');
                          setQuantity('1');
                        }}
                      />
                      Individual Tagged Bird
                    </label>
                  </div>
                </div>

                {birdSourceType === 'BATCH' ? (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Select Active Batch <span className={styles.required}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Batch --</option>
                      {activeBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchCode || b.name} ({b.birdType} - {b.breed}) · {b.currentCount ?? b.initialCount} live birds
                        </option>
                      ))}
                    </select>

                    {currentBatch && (
                      <div className={styles.infoBanner}>
                        <span>Living Flock Population:</span>
                        <strong className={styles.infoHighlight}>
                          {currentBatch.currentCount ?? currentBatch.initialCount} birds available
                        </strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Select Living Individual Bird <span className={styles.required}>*</span>
                    </label>
                    <select
                      className={styles.formSelect}
                      value={selectedBirdId}
                      onChange={(e) => setSelectedBirdId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Bird --</option>
                      {livingBirds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.tagNumber || b.birdId || `Bird #${b.id}`} ({b.type} - {b.breed}) · Status: {b.status}
                        </option>
                      ))}
                    </select>

                    {currentBird && (
                      <div className={styles.infoBanner}>
                        <span>Selected Bird Tag: <strong>{currentBird.tagNumber || 'Untagged'}</strong></span>
                        <span>Pen: <strong>{currentBird.houseNumber || 'General'}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* 2. TABLE EGGS CONFIGURATION */}
            {productType === 'EGGS' && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Egg Grade <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    value={eggGrade}
                    onChange={(e) => setEggGrade(e.target.value)}
                  >
                    {EGG_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g} ({eggStock[g] || 0} eggs available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Packaging Unit <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    value={eggUnit}
                    onChange={(e) => handleEggUnitChange(e.target.value)}
                  >
                    <option value="Crates">Crates (30 eggs/crate)</option>
                    <option value="Loose">Loose Eggs</option>
                  </select>
                </div>
              </div>
            )}

            {/* 3. OTHER PRODUCTS CONFIGURATION */}
            {productType === 'OTHER' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Product Description <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. Poultry Manure / Litter (50kg Bags), Spent Hens..."
                  value={otherDescription}
                  onChange={(e) => setOtherDescription(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Quantity and Pricing */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Quantity {productType === 'EGGS' ? `(${eggUnit})` : (productType === 'LIVE_BIRDS' ? '(Birds)' : '(Units)')}{' '}
                  <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={styles.formInput}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={productType === 'LIVE_BIRDS' && birdSourceType === 'INDIVIDUAL'}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Unit Price (₦) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.formInput}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Discount and Payment Method */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Discount (₦)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.formInput}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Method</label>
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

            {/* Amount Paid Now */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Amount Paid Now (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  step="0.01"
                  className={styles.formInput}
                  placeholder={`Leave empty for full payment (${formatNaira(totalAmount)})`}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Default is full payment ({formatNaira(totalAmount)}). Set to 0 for credit sale.
                </span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Sale Date</label>
                <input
                  type="date"
                  className={styles.formInput}
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className={styles.financialSummaryCard}>
              <div className={styles.summaryRow}>
                <span>Subtotal:</span>
                <strong>{formatNaira(subtotal)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Discount:</span>
                <span style={{ color: '#b91c1c' }}>- {formatNaira(fromKobo(discountKobo))}</span>
              </div>
              <div className={styles.summaryTotalRow}>
                <span>Total Amount Due:</span>
                <span>{formatNaira(totalAmount)}</span>
              </div>
              <div className={styles.summaryRow} style={{ marginTop: '0.25rem' }}>
                <span>Paid Now:</span>
                <span style={{ color: '#166534', fontWeight: 700 }}>
                  {formatNaira(effectivePaid)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span>Remaining Balance:</span>
                <span style={{ color: outstandingBalance > 0 ? '#b91c1c' : '#166534', fontWeight: 700 }}>
                  {formatNaira(outstandingBalance)}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Customer Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. Chief Adeleke, Mama Kemi"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Customer Phone</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  placeholder="e.g. 08031234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Notes & Recorded By */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes / Delivery Terms</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Optional delivery or buyer notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Recorded By</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
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
              {isSubmitting ? 'Recording Sale...' : 'Confirm & Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
