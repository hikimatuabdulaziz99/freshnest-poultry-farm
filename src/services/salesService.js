import { db } from '../database/db.js';
import { eggProductionService, EGGS_PER_CRATE } from './eggProductionService.js';

/**
 * Module 10: Sales & Revenue Management Service
 * Pure offline-first business logic for:
 * 1. Live Bird Sales (Flock cohorts & individually tagged birds)
 * 2. Table Egg Sales (Crates of 30 & loose eggs with inventory synchronization)
 * 3. Other Farm Products (Poultry manure, spent hens, feed bags, etc.)
 * 4. Payment Management (Full, partial, unpaid, additional payment receipts)
 * 5. Invoicing & Printable Receipts (₦ Currency, integer kobo arithmetic)
 */

export const PRODUCT_TYPES = ['LIVE_BIRDS', 'EGGS', 'OTHER'];

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Other'];

export const PAYMENT_STATUSES = ['Paid', 'Partial', 'Unpaid', 'Cancelled'];

export const CURRENCY_SYMBOL = '₦';

/**
 * Helper: Convert Naira amount to integer kobo (prevents floating-point precision errors)
 * e.g. 1500.50 -> 150050
 */
export function toKobo(amount) {
  const val = Number(amount);
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Helper: Convert integer kobo back to Naira float
 * e.g. 150050 -> 1500.50
 */
export function fromKobo(kobo) {
  const val = Number(kobo);
  if (isNaN(val) || !isFinite(val)) return 0.0;
  return Number((val / 100).toFixed(2));
}

/**
 * Helper: Format displayed value in Nigerian Naira with two decimal places
 * e.g. 1500.5 -> "₦1,500.50"
 */
export function formatNaira(amount) {
  const val = Number(amount) || 0;
  return `${CURRENCY_SYMBOL}${val.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Helper: Format local calendar date YYYY-MM-DD
 */
export function getLocalDateString(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const salesService = {
  /**
   * Generate next sequential Sale ID (e.g. SALE-0001)
   * High-water mark stored in farmSettings to guarantee monotonicity even after deletions
   */
  async generateNextSaleId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_sale_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const sales = await db.sales.toArray();
      let maxNumber = settingSeq;

      sales.forEach((s) => {
        const code = s.saleId || s.invoiceNumber;
        if (code) {
          const match = code.match(/SALE-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (s.id && typeof s.id === 'number' && s.id > maxNumber) {
          maxNumber = s.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `SALE-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating sale ID:', err);
      return 'SALE-0001';
    }
  },

  /**
   * Generate next sequential Payment ID (e.g. PAY-0001)
   */
  async generateNextPaymentId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_payment_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const payments = await db.payments.toArray();
      let maxNumber = settingSeq;

      payments.forEach((p) => {
        const code = p.paymentId;
        if (code) {
          const match = code.match(/PAY-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (p.id && typeof p.id === 'number' && p.id > maxNumber) {
          maxNumber = p.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `PAY-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating payment ID:', err);
      return 'PAY-0001';
    }
  },

  /**
   * Record a new sale transaction with atomic inventory/flock synchronization
   */
  async recordSale(data) {
    const customerName = (data.customerName || '').trim();
    if (!customerName) {
      throw new Error('Customer name is required.');
    }

    const customerPhone = (data.customerPhone || '').trim();
    const productType = (data.productType || 'OTHER').toUpperCase();
    if (!PRODUCT_TYPES.includes(productType)) {
      throw new Error(`Invalid product type (${PRODUCT_TYPES.join(', ')}).`);
    }

    const saleDate = (data.saleDate || data.date || getLocalDateString()).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
      throw new Error('Invalid sale date format. Expected YYYY-MM-DD.');
    }

    const quantity = parseInt(data.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error('Quantity must be an integer greater than zero.');
    }

    const unitPrice = parseFloat(data.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('Unit price must be a non-negative number.');
    }

    const discount = data.discount !== undefined && data.discount !== '' ? parseFloat(data.discount) : 0.0;
    if (isNaN(discount) || discount < 0) {
      throw new Error('Discount cannot be negative.');
    }

    // Integer Kobo calculations to avoid floating point inaccuracies
    const priceKobo = toKobo(unitPrice);
    const subtotalKobo = quantity * priceKobo;
    const discountKobo = toKobo(discount);

    if (discountKobo > subtotalKobo) {
      throw new Error('Discount cannot exceed the sale subtotal.');
    }

    const totalAmountKobo = subtotalKobo - discountKobo;
    const initialPaidInput = data.amountPaid !== undefined && data.amountPaid !== '' ? parseFloat(data.amountPaid) : 0.0;
    if (isNaN(initialPaidInput) || initialPaidInput < 0) {
      throw new Error('Amount paid must be non-negative.');
    }

    const initialPaidKobo = toKobo(initialPaidInput);
    if (initialPaidKobo > totalAmountKobo) {
      throw new Error(`Payment amount (₦${fromKobo(initialPaidKobo)}) cannot exceed total sale amount (₦${fromKobo(totalAmountKobo)}).`);
    }

    const outstandingBalanceKobo = totalAmountKobo - initialPaidKobo;

    const paymentMethod = data.paymentMethod || 'Cash';
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error(`Invalid payment method. Allowed: ${PAYMENT_METHODS.join(', ')}.`);
    }

    const paymentStatus = initialPaidKobo >= totalAmountKobo
      ? 'Paid'
      : (initialPaidKobo > 0 ? 'Partial' : 'Unpaid');

    const recordedBy = (data.recordedBy || 'Farm Staff').trim();
    const notes = (data.notes || '').trim();
    const nowIso = new Date().toISOString();

    // Rapid duplicate submission prevention (3-second window)
    const recentSales = await db.sales
      .filter((s) => {
        const sameCustomer = s.customerName?.toLowerCase() === customerName.toLowerCase();
        const sameType = s.productType === productType;
        const sameQty = Number(s.quantity) === quantity;
        const sameDate = (s.saleDate === saleDate || s.date === saleDate);
        return sameCustomer && sameType && sameQty && sameDate;
      })
      .toArray();

    const isDuplicate = recentSales.some((s) => {
      if (!s.createdAt) return false;
      const diff = Math.abs(new Date(nowIso).getTime() - new Date(s.createdAt).getTime());
      return diff < 3000;
    });

    if (isDuplicate) {
      throw new Error('A duplicate sale record for this customer was just submitted. Rapid duplicate submission prevented.');
    }

    const saleId = data.saleId && data.saleId.trim()
      ? data.saleId.trim().toUpperCase()
      : await this.generateNextSaleId();

    let targetBatch = null;
    let targetBird = null;
    let eggMovement = null;
    let productDescription = (data.productDescription || data.description || '').trim();

    // -----------------------------------------------------------------
    // 1. LIVE BIRDS SALES VALIDATION & STATE PREPARATION
    // -----------------------------------------------------------------
    if (productType === 'LIVE_BIRDS') {
      const birdSourceType = data.birdSourceType || (data.birdId ? 'INDIVIDUAL' : 'BATCH');

      if (birdSourceType === 'BATCH') {
        if (!data.batchId) {
          throw new Error('Batch selection is required for flock bird sale.');
        }

        targetBatch = await db.batches
          .filter((b) => Number(b.id) === Number(data.batchId) || b.batchId === data.batchId || b.batchCode === data.batchId)
          .first();

        if (!targetBatch) {
          throw new Error(`Batch with identifier '${data.batchId}' was not found.`);
        }

        if (targetBatch.status === 'Archived' || targetBatch.status === 'Sold' || targetBatch.status === 'Closed') {
          throw new Error(`Cannot sell birds from batch ${targetBatch.batchCode || targetBatch.name} because it is ${targetBatch.status}. Only active batches allow sales.`);
        }

        const livingCount = Number(targetBatch.currentCount !== undefined ? targetBatch.currentCount : targetBatch.initialCount);
        if (quantity > livingCount) {
          throw new Error(
            `Sale quantity (${quantity} birds) exceeds available living batch population (${livingCount} birds available in ${targetBatch.batchCode || targetBatch.name}).`
          );
        }

        if (!productDescription) {
          productDescription = `${targetBatch.batchCode || targetBatch.name} (${targetBatch.birdType} - ${targetBatch.breed})`;
        }
      } else {
        // INDIVIDUAL BIRD SALE
        if (!data.birdId) {
          throw new Error('Individual bird selection is required.');
        }

        targetBird = await db.birds
          .filter((b) => Number(b.id) === Number(data.birdId) || b.birdId === data.birdId || b.tagNumber === data.birdId)
          .first();

        if (!targetBird) {
          throw new Error(`Bird with identifier '${data.birdId}' was not found.`);
        }

        if (targetBird.status === 'Dead') {
          throw new Error(`Bird ${targetBird.tagNumber || targetBird.birdId} is marked as Dead. Cannot sell a deceased bird.`);
        }

        if (targetBird.status === 'Sold') {
          throw new Error(`Bird ${targetBird.tagNumber || targetBird.birdId} has already been sold.`);
        }

        if (quantity !== 1) {
          throw new Error('Quantity for an individual bird sale must be strictly 1.');
        }

        if (!productDescription) {
          productDescription = `Individual Bird ${targetBird.tagNumber || targetBird.birdId} (${targetBird.type} - ${targetBird.breed})`;
        }
      }
    }

    // -----------------------------------------------------------------
    // 2. EGG SALES VALIDATION & INVENTORY DEDUCTION PREPARATION
    // -----------------------------------------------------------------
    let totalEggsDeducted = 0;
    if (productType === 'EGGS') {
      const eggGrade = data.eggGrade || 'Grade A';
      const eggUnit = data.eggUnit || 'Crates'; // 'Crates' | 'Loose'

      if (eggUnit === 'Crates') {
        totalEggsDeducted = quantity * EGGS_PER_CRATE;
      } else {
        totalEggsDeducted = quantity;
      }

      if (totalEggsDeducted <= 0) {
        throw new Error('Egg quantity must be greater than zero.');
      }

      // Check current inventory stock from eggProductionService
      const inventory = await eggProductionService.getInventoryStock();
      const available = inventory.byGrade[eggGrade] || 0;

      if (totalEggsDeducted > available) {
        const availCrates = Math.floor(available / EGGS_PER_CRATE);
        const availLoose = available % EGGS_PER_CRATE;
        throw new Error(
          `Insufficient egg inventory for ${eggGrade}. Requested: ${totalEggsDeducted} eggs (${Math.floor(totalEggsDeducted / EGGS_PER_CRATE)} crates, ${totalEggsDeducted % EGGS_PER_CRATE} loose). Available: ${available} eggs (${availCrates} crates, ${availLoose} loose). Negative egg stock prevented.`
        );
      }

      const nextMovSeq = await eggProductionService.generateNextMovementId();
      eggMovement = {
        movementId: nextMovSeq,
        movementType: 'SALE',
        grade: eggGrade,
        quantity: totalEggsDeducted,
        crates: Math.floor(totalEggsDeducted / EGGS_PER_CRATE),
        loose: totalEggsDeducted % EGGS_PER_CRATE,
        referenceId: saleId,
        movementDate: saleDate,
        notes: `Egg sale to ${customerName} (${saleId})`,
        recordedBy,
        createdAt: nowIso,
      };

      if (!productDescription) {
        productDescription = `${eggGrade} (${eggUnit === 'Crates' ? `${quantity} crates (${totalEggsDeducted} eggs)` : `${quantity} loose eggs`})`;
      }
    }

    if (productType === 'OTHER' && !productDescription) {
      productDescription = data.itemDescription || 'Farm Product';
    }

    // Construct Sale Record
    const saleRecord = {
      saleId,
      invoiceNumber: saleId,
      saleDate,
      date: saleDate,
      customerName,
      customerPhone: customerPhone || null,
      productType,
      itemType: productType,
      productDescription,
      productCategory: productType,
      quantity,
      unitPrice: fromKobo(priceKobo),
      subtotal: fromKobo(subtotalKobo),
      discount: fromKobo(discountKobo),
      totalAmount: fromKobo(totalAmountKobo),
      amountPaid: fromKobo(initialPaidKobo),
      outstandingBalance: fromKobo(outstandingBalanceKobo),
      paymentMethod,
      paymentStatus,
      status: 'Active',
      // Associations
      batchId: targetBatch ? targetBatch.id : null,
      batchCode: targetBatch ? (targetBatch.batchCode || targetBatch.name) : null,
      birdId: targetBird ? targetBird.id : null,
      birdTag: targetBird ? (targetBird.tagNumber || targetBird.birdId) : null,
      previousBirdStatus: targetBird ? (targetBird.status || 'Active') : null,
      birdSourceType: targetBatch ? 'BATCH' : (targetBird ? 'INDIVIDUAL' : null),
      eggGrade: productType === 'EGGS' ? (data.eggGrade || 'Grade A') : null,
      eggUnit: productType === 'EGGS' ? (data.eggUnit || 'Crates') : null,
      totalEggsSold: productType === 'EGGS' ? totalEggsDeducted : null,
      notes,
      recordedBy,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    let paymentRecord = null;
    if (initialPaidKobo > 0) {
      const paymentId = await this.generateNextPaymentId();
      paymentRecord = {
        paymentId,
        saleId,
        amount: fromKobo(initialPaidKobo),
        paymentMethod,
        paymentDate: saleDate,
        date: saleDate,
        recordedBy,
        notes: 'Initial payment upon sale confirmation',
        createdAt: nowIso,
      };
    }

    // -----------------------------------------------------------------
    // ATOMIC TRANSACTION: Write sale, payments, flock updates, and egg inventory
    // -----------------------------------------------------------------
    await db.transaction('rw', [db.sales, db.payments, db.batches, db.birds, db.eggInventory, db.farmSettings], async () => {
      // 1. Batch Live Birds population decrement
      if (targetBatch) {
        const newCurrentCount = targetBatch.currentCount - quantity;
        await db.batches.update(targetBatch.id, {
          currentCount: newCurrentCount,
          initialCount: targetBatch.initialCount, // Strictly preserved
          updatedAt: nowIso,
        });
      }

      // 2. Individual Bird status update to 'Sold'
      if (targetBird) {
        await db.birds.update(targetBird.id, {
          status: 'Sold',
          soldDate: saleDate,
          updatedAt: nowIso,
        });
      }

      // 3. Egg Inventory decrement
      if (eggMovement) {
        await db.eggInventory.add(eggMovement);
        const movMatch = eggMovement.movementId.match(/EMOV-(\d+)/i);
        if (movMatch && movMatch[1]) {
          await db.farmSettings.put({
            key: 'last_egg_mov_seq',
            value: parseInt(movMatch[1], 10),
            updatedAt: nowIso,
          });
        }
      }

      // 4. Initial Payment record
      if (paymentRecord) {
        await db.payments.add(paymentRecord);
        const paySeqMatch = paymentRecord.paymentId.match(/PAY-(\d+)/i);
        if (paySeqMatch && paySeqMatch[1]) {
          await db.farmSettings.put({
            key: 'last_payment_seq',
            value: parseInt(paySeqMatch[1], 10),
            updatedAt: nowIso,
          });
        }
      }

      // 5. Add Sale record
      const id = await db.sales.add(saleRecord);
      saleRecord.id = id;

      // Update monotonic sequence in farmSettings
      const saleSeqMatch = saleId.match(/SALE-(\d+)/i);
      if (saleSeqMatch && saleSeqMatch[1]) {
        await db.farmSettings.put({
          key: 'last_sale_seq',
          value: parseInt(saleSeqMatch[1], 10),
          updatedAt: nowIso,
        });
      }
    });

    return saleRecord;
  },

  /**
   * Record an additional payment against an existing outstanding balance
   */
  async recordPayment(data) {
    if (!data.saleId) {
      throw new Error('Sale identifier is required.');
    }

    const sale = await db.sales
      .filter((s) => s.saleId === data.saleId || Number(s.id) === Number(data.saleId))
      .first();

    if (!sale) {
      throw new Error(`Sale record '${data.saleId}' was not found.`);
    }

    if (sale.status === 'Cancelled') {
      throw new Error(`Cannot record payment for a Cancelled sale (${sale.saleId}).`);
    }

    const paymentAmountInput = parseFloat(data.amount);
    if (isNaN(paymentAmountInput) || paymentAmountInput <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const paymentDate = (data.paymentDate || data.date || getLocalDateString()).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      throw new Error('Invalid payment date format. Expected YYYY-MM-DD.');
    }

    const paymentMethod = data.paymentMethod || 'Cash';
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error(`Invalid payment method (${PAYMENT_METHODS.join(', ')}).`);
    }

    const recordedBy = (data.recordedBy || 'Farm Staff').trim();
    const notes = (data.notes || 'Additional payment received').trim();
    const nowIso = new Date().toISOString();

    // Query existing payments for this sale to compute exact balance in kobo
    const existingPayments = await db.payments
      .filter((p) => p.saleId === sale.saleId || p.saleId === String(sale.id))
      .toArray();

    const totalPaidKobo = existingPayments.reduce((acc, p) => acc + toKobo(p.amount), 0);
    const totalAmountKobo = toKobo(sale.totalAmount);
    const outstandingKobo = Math.max(0, totalAmountKobo - totalPaidKobo);

    if (outstandingKobo <= 0) {
      throw new Error(`Sale ${sale.saleId} is already fully paid. Outstanding balance is ₦0.00.`);
    }

    const newPaymentKobo = toKobo(paymentAmountInput);
    if (newPaymentKobo > outstandingKobo) {
      throw new Error(
        `Payment amount (${formatNaira(fromKobo(newPaymentKobo))}) exceeds current outstanding balance of ${formatNaira(fromKobo(outstandingKobo))}.`
      );
    }

    // Duplicate payment prevention (3-second window)
    const isDuplicate = existingPayments.some((p) => {
      if (!p.createdAt) return false;
      const sameAmount = toKobo(p.amount) === newPaymentKobo;
      const diff = Math.abs(new Date(nowIso).getTime() - new Date(p.createdAt).getTime());
      return sameAmount && diff < 3000;
    });

    if (isDuplicate) {
      throw new Error('A duplicate payment with this exact amount was just submitted. Rapid duplicate payment prevented.');
    }

    const paymentId = await this.generateNextPaymentId();
    const newTotalPaidKobo = totalPaidKobo + newPaymentKobo;
    const newOutstandingKobo = totalAmountKobo - newTotalPaidKobo;
    const newPaymentStatus = newOutstandingKobo === 0 ? 'Paid' : 'Partial';

    const paymentRecord = {
      paymentId,
      saleId: sale.saleId,
      amount: fromKobo(newPaymentKobo),
      paymentMethod,
      paymentDate,
      date: paymentDate,
      recordedBy,
      notes,
      createdAt: nowIso,
    };

    await db.transaction('rw', [db.sales, db.payments, db.farmSettings], async () => {
      await db.payments.add(paymentRecord);

      await db.sales.update(sale.id, {
        amountPaid: fromKobo(newTotalPaidKobo),
        outstandingBalance: fromKobo(newOutstandingKobo),
        paymentStatus: newPaymentStatus,
        updatedAt: nowIso,
      });

      const paySeqMatch = paymentId.match(/PAY-(\d+)/i);
      if (paySeqMatch && paySeqMatch[1]) {
        await db.farmSettings.put({
          key: 'last_payment_seq',
          value: parseInt(paySeqMatch[1], 10),
          updatedAt: nowIso,
        });
      }
    });

    return {
      payment: paymentRecord,
      updatedSale: {
        ...sale,
        amountPaid: fromKobo(newTotalPaidKobo),
        outstandingBalance: fromKobo(newOutstandingKobo),
        paymentStatus: newPaymentStatus,
      },
    };
  },

  /**
   * Cancel an active sale safely with exact stock restoration and payment status preservation
   */
  async cancelSale(idOrCode, reason = 'Customer request / cancellation') {
    const sale = await db.sales
      .filter((s) => s.saleId === idOrCode || Number(s.id) === Number(idOrCode) || s.invoiceNumber === idOrCode)
      .first();

    if (!sale) {
      throw new Error(`Sale record '${idOrCode}' was not found.`);
    }

    if (sale.status === 'Cancelled') {
      throw new Error(`Sale ${sale.saleId} has already been cancelled.`);
    }

    const nowIso = new Date().toISOString();

    await db.transaction('rw', [db.sales, db.batches, db.birds, db.eggInventory, db.farmSettings], async () => {
      // 1. Rollback live birds if from batch
      if (sale.productType === 'LIVE_BIRDS' && sale.birdSourceType === 'BATCH' && sale.batchId) {
        const batch = await db.batches.get(Number(sale.batchId));
        if (batch) {
          const restored = Math.min(Number(batch.initialCount), Number(batch.currentCount) + Number(sale.quantity));
          await db.batches.update(batch.id, {
            currentCount: restored,
            updatedAt: nowIso,
          });
        }
      }

      // 2. Rollback individual bird status from 'Sold' back to prior status
      if (sale.productType === 'LIVE_BIRDS' && sale.birdId) {
        const bird = await db.birds.get(Number(sale.birdId));
        if (bird) {
          await db.birds.update(bird.id, {
            status: sale.previousBirdStatus || 'Active',
            soldDate: null,
            updatedAt: nowIso,
          });
        }
      }

      // 3. Rollback egg inventory
      if (sale.productType === 'EGGS') {
        const nextMovId = await eggProductionService.generateNextMovementId();
        const totalEggs = Number(sale.totalEggsSold || (sale.quantity * EGGS_PER_CRATE));

        await db.eggInventory.add({
          movementId: nextMovId,
          movementType: 'SALE_RETURN',
          grade: sale.eggGrade || 'Grade A',
          quantity: totalEggs,
          crates: Math.floor(totalEggs / EGGS_PER_CRATE),
          loose: totalEggs % EGGS_PER_CRATE,
          referenceId: sale.saleId,
          movementDate: getLocalDateString(),
          notes: `Restored eggs from cancelled sale ${sale.saleId}: ${reason}`,
          recordedBy: 'System / Audit Rollback',
          createdAt: nowIso,
        });

        const movMatch = nextMovId.match(/EMOV-(\d+)/i);
        if (movMatch && movMatch[1]) {
          await db.farmSettings.put({
            key: 'last_egg_mov_seq',
            value: parseInt(movMatch[1], 10),
            updatedAt: nowIso,
          });
        }
      }

      // 4. Mark sale as Cancelled without silently destroying payment history
      await db.sales.update(sale.id, {
        status: 'Cancelled',
        paymentStatus: 'Cancelled',
        cancellationReason: reason,
        cancelledAt: nowIso,
        updatedAt: nowIso,
      });
    });

    return await db.sales.get(sale.id);
  },

  /**
   * Retrieve all sales enriched with payments list and targets
   */
  async getSales(filters = {}) {
    try {
      const [allSales, allPayments] = await Promise.all([
        db.sales.toArray(),
        db.payments.toArray(),
      ]);

      const paymentsBySale = {};
      allPayments.forEach((p) => {
        if (!paymentsBySale[p.saleId]) paymentsBySale[p.saleId] = [];
        paymentsBySale[p.saleId].push(p);
      });

      let enriched = allSales.map((s) => {
        const linkedPayments = paymentsBySale[s.saleId] || [];
        const actualPaidKobo = linkedPayments.reduce((acc, p) => acc + toKobo(p.amount), 0);
        const actualPaid = fromKobo(actualPaidKobo);
        const totalAmount = Number(s.totalAmount) || 0;
        const outstanding = s.status === 'Cancelled' ? 0.0 : Math.max(0, fromKobo(toKobo(totalAmount) - actualPaidKobo));

        return {
          ...s,
          saleDate: s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : ''),
          payments: linkedPayments,
          actualPaid,
          outstandingBalance: outstanding,
        };
      });

      // Filter: Product Type
      if (filters.productType) {
        enriched = enriched.filter((s) => s.productType === filters.productType);
      }

      // Filter: Payment Status
      if (filters.paymentStatus) {
        enriched = enriched.filter((s) => s.paymentStatus === filters.paymentStatus);
      }

      // Filter: Payment Method
      if (filters.paymentMethod) {
        enriched = enriched.filter((s) => s.paymentMethod === filters.paymentMethod);
      }

      // Filter: Date Range
      if (filters.startDate) {
        enriched = enriched.filter((s) => s.saleDate >= filters.startDate);
      }
      if (filters.endDate) {
        enriched = enriched.filter((s) => s.saleDate <= filters.endDate);
      }

      // Filter: Customer Name
      if (filters.customer) {
        const c = filters.customer.toLowerCase().trim();
        enriched = enriched.filter((s) => s.customerName?.toLowerCase().includes(c));
      }

      // Filter: Search Query
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        enriched = enriched.filter((s) =>
          (s.saleId && s.saleId.toLowerCase().includes(q)) ||
          (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q)) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
          (s.productDescription && s.productDescription.toLowerCase().includes(q)) ||
          (s.recordedBy && s.recordedBy.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q))
        );
      }

      // Sort by saleDate DESC, id DESC
      enriched.sort((a, b) => {
        const dateDiff = (b.saleDate || '').localeCompare(a.saleDate || '');
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0);
      });

      return enriched;
    } catch (err) {
      console.error('Error fetching sales list:', err);
      return [];
    }
  },

  /**
   * Retrieve single sale by ID with full payment history and printable data
   */
  async getSaleById(id) {
    const sale = await db.sales.get(Number(id));
    if (!sale) return null;

    const payments = await db.payments
      .filter((p) => p.saleId === sale.saleId || p.saleId === String(sale.id))
      .toArray();

    payments.sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || '') || (b.id - a.id));

    return {
      ...sale,
      payments,
    };
  },

  /**
   * Calculate Sales & Revenue Analytics
   * Distinguishes Total Invoiced Value vs Actual Cash Collected
   */
  async getSalesStats(periodInput = 30) {
    try {
      const todayStr = getLocalDateString();
      const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
      const currentYearStr = todayStr.slice(0, 4);  // YYYY

      let options = {};
      if (typeof periodInput === 'number') {
        options = { periodDays: periodInput };
      } else if (periodInput && typeof periodInput === 'object') {
        options = periodInput;
      }

      const [allSales, allPayments] = await Promise.all([
        db.sales.toArray(),
        db.payments.toArray(),
      ]);

      const activeSales = allSales.filter((s) => s.status !== 'Cancelled');

      let todaySalesValueKobo = 0;
      let monthSalesValueKobo = 0;
      let yearSalesValueKobo = 0;
      let totalSalesValueKobo = 0;
      let totalOutstandingKobo = 0;

      const productRevenueMap = {
        LIVE_BIRDS: { revenueKobo: 0, count: 0, itemsCount: 0 },
        EGGS: { revenueKobo: 0, count: 0, itemsCount: 0 },
        OTHER: { revenueKobo: 0, count: 0, itemsCount: 0 },
      };

      activeSales.forEach((s) => {
        const totalKobo = toKobo(s.totalAmount);
        const outKobo = toKobo(s.outstandingBalance);
        const d = s.saleDate || s.date || (s.createdAt ? s.createdAt.slice(0, 10) : '');

        totalSalesValueKobo += totalKobo;
        totalOutstandingKobo += outKobo;

        if (d === todayStr) {
          todaySalesValueKobo += totalKobo;
        }
        if (d.startsWith(currentMonthStr)) {
          monthSalesValueKobo += totalKobo;
        }
        if (d.startsWith(currentYearStr)) {
          yearSalesValueKobo += totalKobo;
        }

        const pType = s.productType || 'OTHER';
        if (!productRevenueMap[pType]) {
          productRevenueMap[pType] = { revenueKobo: 0, count: 0, itemsCount: 0 };
        }
        productRevenueMap[pType].revenueKobo += totalKobo;
        productRevenueMap[pType].count += 1;
        productRevenueMap[pType].itemsCount += Number(s.quantity) || 0;
      });

      // Total Cash Revenue Received from payments ledger (only for active, non-cancelled sales)
      const cancelledSaleIds = new Set(allSales.filter((s) => s.status === 'Cancelled').map((s) => s.saleId));
      let totalRevenueReceivedKobo = 0;
      let todayRevenueReceivedKobo = 0;
      let monthRevenueReceivedKobo = 0;

      const paymentMethodCounts = {
        Cash: { amountKobo: 0, count: 0 },
        'Bank Transfer': { amountKobo: 0, count: 0 },
        POS: { amountKobo: 0, count: 0 },
        Other: { amountKobo: 0, count: 0 },
      };

      allPayments.forEach((p) => {
        if (cancelledSaleIds.has(p.saleId)) return;

        const amtKobo = toKobo(p.amount);
        totalRevenueReceivedKobo += amtKobo;

        const d = p.paymentDate || p.date || (p.createdAt ? p.createdAt.slice(0, 10) : '');
        if (d === todayStr) {
          todayRevenueReceivedKobo += amtKobo;
        }
        if (d.startsWith(currentMonthStr)) {
          monthRevenueReceivedKobo += amtKobo;
        }

        const method = p.paymentMethod || 'Cash';
        if (!paymentMethodCounts[method]) {
          paymentMethodCounts[method] = { amountKobo: 0, count: 0 };
        }
        paymentMethodCounts[method].amountKobo += amtKobo;
        paymentMethodCounts[method].count += 1;
      });

      // Daily trend for the last N days (defaults to 7)
      const numTrendDays = Math.max(1, Math.min(30, options.periodDays || 7));
      const trendDays = [];
      for (let i = numTrendDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

        const salesCount = activeSales.filter((s) => (s.saleDate === dateStr || s.date === dateStr)).length;
        const salesKobo = activeSales
          .filter((s) => (s.saleDate === dateStr || s.date === dateStr))
          .reduce((sum, s) => sum + toKobo(s.totalAmount), 0);

        const cashKobo = allPayments
          .filter((p) => !cancelledSaleIds.has(p.saleId) && (p.paymentDate === dateStr || p.date === dateStr))
          .reduce((sum, p) => sum + toKobo(p.amount), 0);

        trendDays.push({
          date: dateStr,
          label: dayLabel,
          transactions: salesCount,
          salesAmount: fromKobo(salesKobo),
          cashCollected: fromKobo(cashKobo),
        });
      }

      // Format product breakdown
      const productBreakdown = Object.entries(productRevenueMap).map(([type, data]) => {
        const rev = fromKobo(data.revenueKobo);
        const totalRev = fromKobo(totalSalesValueKobo);
        const pct = totalRev > 0 ? Number(((rev / totalRev) * 100).toFixed(1)) : 0;
        return {
          productType: type,
          revenue: rev,
          count: data.count,
          itemsCount: data.itemsCount,
          percentage: pct,
        };
      });

      // Format payment methods breakdown
      const paymentMethodsBreakdown = Object.entries(paymentMethodCounts).map(([method, data]) => {
        const amt = fromKobo(data.amountKobo);
        const totalCash = fromKobo(totalRevenueReceivedKobo);
        const pct = totalCash > 0 ? Number(((amt / totalCash) * 100).toFixed(1)) : 0;
        return {
          method,
          amount: amt,
          count: data.count,
          percentage: pct,
        };
      });

      return {
        todaySales: fromKobo(todaySalesValueKobo),
        thisMonthSales: fromKobo(monthSalesValueKobo),
        thisYearSales: fromKobo(yearSalesValueKobo),
        totalSalesValue: fromKobo(totalSalesValueKobo),
        totalRevenueReceived: fromKobo(totalRevenueReceivedKobo),
        todayRevenueReceived: fromKobo(todayRevenueReceivedKobo),
        thisMonthRevenueReceived: fromKobo(monthRevenueReceivedKobo),
        totalOutstanding: fromKobo(totalOutstandingKobo),
        transactionCount: activeSales.length,
        cancelledCount: allSales.length - activeSales.length,
        productBreakdown,
        paymentMethodsBreakdown,
        trendDays,
      };
    } catch (err) {
      console.error('Error fetching sales statistics:', err);
      return {
        todaySales: 0,
        thisMonthSales: 0,
        thisYearSales: 0,
        totalSalesValue: 0,
        totalRevenueReceived: 0,
        todayRevenueReceived: 0,
        thisMonthRevenueReceived: 0,
        totalOutstanding: 0,
        transactionCount: 0,
        cancelledCount: 0,
        productBreakdown: [],
        paymentMethodsBreakdown: [],
        trendDays: [],
      };
    }
  },

  /**
   * Generate clean printable receipt data
   */
  async generateReceiptData(saleIdOrCode) {
    const sale = await db.sales
      .filter((s) => s.saleId === saleIdOrCode || s.invoiceNumber === saleIdOrCode || Number(s.id) === Number(saleIdOrCode))
      .first();

    if (!sale) return null;

    const payments = await db.payments
      .filter((p) => p.saleId === sale.saleId || p.saleId === String(sale.id))
      .toArray();

    payments.sort((a, b) => (a.paymentDate || '').localeCompare(b.paymentDate || '') || (a.id - b.id));

    // Farm settings / metadata
    let farmName = 'FreshNest Poultry Farm';
    let farmAddress = 'KM 14, Old Abeokuta Expressway, Farm Settlement, Ogun State, Nigeria';
    let farmPhone = '+234 803 123 4567';
    let farmEmail = 'sales@freshnestpoultry.ng';

    try {
      const nameSetting = await db.farmSettings.get('farm_name');
      if (nameSetting?.value) farmName = nameSetting.value;

      const addressSetting = await db.farmSettings.get('farm_address');
      if (addressSetting?.value) farmAddress = addressSetting.value;

      const phoneSetting = await db.farmSettings.get('farm_phone');
      if (phoneSetting?.value) farmPhone = phoneSetting.value;

      const emailSetting = await db.farmSettings.get('farm_email');
      if (emailSetting?.value) farmEmail = emailSetting.value;
    } catch {
      // Fallback defaults
    }

    return {
      farm: {
        name: farmName,
        tagline: 'Smart Management for Healthy Poultry Farming',
        address: farmAddress,
        phone: farmPhone,
        email: farmEmail,
      },
      sale: {
        ...sale,
        formattedSubtotal: formatNaira(sale.subtotal),
        formattedDiscount: formatNaira(sale.discount),
        formattedTotalAmount: formatNaira(sale.totalAmount),
        formattedAmountPaid: formatNaira(sale.amountPaid),
        formattedOutstandingBalance: formatNaira(sale.outstandingBalance),
      },
      payments: payments.map((p) => ({
        ...p,
        formattedAmount: formatNaira(p.amount),
      })),
      printedAt: new Date().toISOString(),
    };
  },

  /**
   * Export sales history to standard CSV
   */
  async exportSalesCSV(filters = {}) {
    const sales = await this.getSales(filters);
    const headers = [
      'Sale ID',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Product Type',
      'Product Description',
      'Quantity',
      'Unit Price (NGN)',
      'Subtotal (NGN)',
      'Discount (NGN)',
      'Total Amount (NGN)',
      'Amount Paid (NGN)',
      'Outstanding Balance (NGN)',
      'Payment Status',
      'Payment Method',
      'Sale Status',
      'Recorded By',
      'Notes',
    ];

    const rows = sales.map((s) => [
      s.saleId || s.invoiceNumber || `SALE-${s.id}`,
      s.saleDate || s.date || '',
      `"${(s.customerName || '').replace(/"/g, '""')}"`,
      `"${(s.customerPhone || '').replace(/"/g, '""')}"`,
      s.productType || 'OTHER',
      `"${(s.productDescription || '').replace(/"/g, '""')}"`,
      s.quantity,
      (Number(s.unitPrice) || 0).toFixed(2),
      (Number(s.subtotal) || 0).toFixed(2),
      (Number(s.discount) || 0).toFixed(2),
      (Number(s.totalAmount) || 0).toFixed(2),
      (Number(s.amountPaid) || 0).toFixed(2),
      (Number(s.outstandingBalance) || 0).toFixed(2),
      s.paymentStatus || 'Paid',
      s.paymentMethod || 'Cash',
      s.status || 'Active',
      `"${(s.recordedBy || '').replace(/"/g, '""')}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Seed baseline initial sales if sales table is completely empty
   */
  async seedInitialSalesData() {
    try {
      const count = await db.sales.count();
      if (count > 0) return;

      const batches = await db.batches.toArray();
      const today = new Date();

      if (batches.length > 0) {
        const activeBatch = batches.find((b) => b.status === 'Active' && (b.currentCount || b.initialCount) > 10) || batches[0];
        if (activeBatch && (activeBatch.currentCount || activeBatch.initialCount) >= 5) {
          const pastDate = getLocalDateString(new Date(today.getTime() - 5 * 86400000));
          try {
            await this.recordSale({
              saleDate: pastDate,
              customerName: 'Alhaji Musa Poultry Mart',
              customerPhone: '08023456789',
              productType: 'LIVE_BIRDS',
              birdSourceType: 'BATCH',
              batchId: activeBatch.id,
              quantity: 5,
              unitPrice: 4500,
              discount: 500,
              amountPaid: 22000,
              paymentMethod: 'Bank Transfer',
              recordedBy: 'Farm Manager',
              notes: 'Bulk sale of live broiler birds for restaurant supplies',
            });
          } catch {
            // Ignore if population check limits
          }
        }
      }
    } catch (err) {
      console.warn('Could not seed initial sales data:', err);
    }
  },
};
