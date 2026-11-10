import { db } from '../database/db.js';

/**
 * Module 11: Expenses Management Service
 * Pure offline-first architecture using Dexie.js and IndexedDB.
 * Features:
 * - Monotonic sequential IDs (EXP-0001, EPAY-0001)
 * - Integer kobo precision arithmetic
 * - Purchase integration (Feeds, Medications, Vaccines) without duplicate stock movements
 * - Debt/payable tracking (Paid, Partial, Unpaid)
 * - Safe editing, payments, cancellation without audit trail destruction
 * - Rapid duplicate submission prevention
 */

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Feed purchases',
  'Medication purchases',
  'Vaccination and veterinary services',
  'Labour and salaries',
  'Electricity',
  'Water supply',
  'Transportation',
  'Equipment and repairs',
  'Housing and maintenance',
  'Cleaning and disinfectants',
  'Packaging materials',
  'Fuel',
  'Miscellaneous',
  'Other',
];

export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'POS / Card',
  'Cheque',
  'Mobile Money',
  'Credit / Payable',
];

export const PAYMENT_STATUSES = ['Paid', 'Partial', 'Unpaid', 'Cancelled'];

/**
 * Helper: Convert Nigerian Naira to integer kobo
 * ₦1,500.50 -> 150050 kobo
 */
export function toKobo(naira) {
  const num = Number(naira);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Helper: Convert integer kobo to Nigerian Naira decimal
 * 150050 kobo -> 1500.50
 */
export function fromKobo(kobo) {
  const num = Number(kobo);
  if (isNaN(num)) return 0;
  return Number((num / 100).toFixed(2));
}

/**
 * Helper: Format amount in Nigerian Naira with 2 decimal places and currency symbol
 * e.g. 1500 -> "₦1,500.00"
 */
export function formatNaira(amount) {
  const safe = fromKobo(toKobo(amount));
  return '₦' + safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Helper: Get current local calendar date YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Rapid submission cache: stores hash -> timestamp
const submissionCache = new Map();

function checkDuplicateSubmission(key, windowMs = 3000) {
  const now = Date.now();
  const lastTime = submissionCache.get(key);
  if (lastTime && now - lastTime < windowMs) {
    throw new Error('Rapid duplicate submission detected. Please wait 3 seconds before resubmitting.');
  }
  submissionCache.set(key, now);
  // Clean up cache periodically
  if (submissionCache.size > 200) {
    submissionCache.clear();
  }
}

export const expenseService = {
  /**
   * Automatically generate the next sequential Expense ID (e.g. EXP-0001)
   * High-water mark sequence stored in farmSettings to guarantee monotonicity.
   */
  async generateNextExpenseId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_expense_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const expenses = await db.expenses.toArray();
      let maxNumber = settingSeq;

      expenses.forEach((exp) => {
        const code = exp.expenseId;
        if (code) {
          const match = code.match(/EXP-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (exp.id && typeof exp.id === 'number' && exp.id > maxNumber) {
          maxNumber = exp.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `EXP-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating expense ID:', err);
      return 'EXP-0001';
    }
  },

  /**
   * Automatically generate the next sequential Expense Payment ID (e.g. EPAY-0001)
   */
  async generateNextPaymentId() {
    try {
      let settingSeq = 0;
      try {
        const setting = await db.farmSettings.get('last_expense_payment_seq');
        if (setting && typeof setting.value === 'number') {
          settingSeq = setting.value;
        }
      } catch {
        // Fallback
      }

      const payments = await db.expensePayments.toArray();
      let maxNumber = settingSeq;

      payments.forEach((pay) => {
        const code = pay.paymentId;
        if (code) {
          const match = code.match(/EPAY-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        } else if (pay.id && typeof pay.id === 'number' && pay.id > maxNumber) {
          maxNumber = pay.id;
        }
      });

      const nextNum = maxNumber + 1;
      return `EPAY-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating expense payment ID:', err);
      return 'EPAY-0001';
    }
  },

  /**
   * Retrieve all categories (default + custom stored in expenseCategories)
   */
  async getCategories() {
    try {
      const customRecords = await db.expenseCategories.toArray();
      const customNames = customRecords.map((c) => c.name);
      const categorySet = new Set([...DEFAULT_EXPENSE_CATEGORIES, ...customNames]);
      return Array.from(categorySet);
    } catch {
      return [...DEFAULT_EXPENSE_CATEGORIES];
    }
  },

  /**
   * Add a custom expense category with validation against duplicates
   */
  async addCustomCategory(categoryName) {
    if (!categoryName || typeof categoryName !== 'string' || !categoryName.trim()) {
      throw new Error('Category name cannot be empty.');
    }
    const cleanName = categoryName.trim();
    const existing = await this.getCategories();
    const isDuplicate = existing.some((c) => c.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Expense category "${cleanName}" already exists.`);
    }

    await db.expenseCategories.add({
      name: cleanName,
      isDefault: false,
      createdAt: new Date().toISOString(),
    });

    return cleanName;
  },

  /**
   * Record a new expense with atomic payment ledger entry and purchase integration validation
   */
  async recordExpense(data) {
    // 1. Duplicate submission check
    const subHash = `EXP_SUB_${data.expenseId || ''}_${data.category || ''}_${data.amount || ''}_${data.supplier || ''}_${data.receiptNumber || ''}`;
    checkDuplicateSubmission(subHash, 3000);

    // 2. Validate Category
    if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
      throw new Error('Expense category is required.');
    }
    const category = data.category.trim();

    // 3. Validate Description
    if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
      throw new Error('Expense description is required.');
    }
    const description = data.description.trim();

    // 4. Validate Amount
    const amountNum = Number(data.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }
    const totalKobo = toKobo(amountNum);
    const totalAmount = fromKobo(totalKobo);

    // 5. Optional Quantity & Unit Cost
    let quantity = null;
    if (data.quantity !== undefined && data.quantity !== null && data.quantity !== '') {
      const q = Number(data.quantity);
      if (isNaN(q) || q < 0) {
        throw new Error('Quantity cannot be negative.');
      }
      quantity = q;
    }

    let unitCost = null;
    if (data.unitCost !== undefined && data.unitCost !== null && data.unitCost !== '') {
      const u = Number(data.unitCost);
      if (isNaN(u) || u < 0) {
        throw new Error('Unit cost cannot be negative.');
      }
      unitCost = fromKobo(toKobo(u));
    }

    // 6. Validate Payment Amount
    let paidKobo = 0;
    if (data.amountPaid !== undefined && data.amountPaid !== null && data.amountPaid !== '') {
      const p = Number(data.amountPaid);
      if (isNaN(p) || p < 0) {
        throw new Error('Amount paid cannot be negative.');
      }
      paidKobo = toKobo(p);
    }

    if (paidKobo > totalKobo) {
      throw new Error(
        `Initial payment amount (${formatNaira(fromKobo(paidKobo))}) cannot exceed total expense amount (${formatNaira(totalAmount)}).`
      );
    }

    const amountPaid = fromKobo(paidKobo);
    const outstandingKobo = totalKobo - paidKobo;
    const outstandingBalance = fromKobo(outstandingKobo);

    let paymentStatus = 'Unpaid';
    if (paidKobo >= totalKobo) {
      paymentStatus = 'Paid';
    } else if (paidKobo > 0) {
      paymentStatus = 'Partial';
    }

    // 7. Validate Date
    const expenseDate = data.expenseDate && /^\d{4}-\d{2}-\d{2}$/.test(data.expenseDate.trim())
      ? data.expenseDate.trim()
      : getLocalDateString();

    const paymentMethod = data.paymentMethod && data.paymentMethod.trim()
      ? data.paymentMethod.trim()
      : 'Cash';

    const supplier = data.supplier && data.supplier.trim()
      ? data.supplier.trim()
      : (data.paidTo && data.paidTo.trim() ? data.paidTo.trim() : 'General Supplier');

    const receiptNumber = data.receiptNumber && data.receiptNumber.trim()
      ? data.receiptNumber.trim()
      : (data.referenceNumber && data.referenceNumber.trim() ? data.referenceNumber.trim() : '');

    const batchId = data.batchId ? String(data.batchId).trim() : null;
    const penId = data.penId ? String(data.penId).trim() : null;
    const notes = data.notes && data.notes.trim() ? data.notes.trim() : '';
    const recordedBy = data.recordedBy && data.recordedBy.trim() ? data.recordedBy.trim() : 'Administrator';

    // 8. Purchase Integration Validation (Feeds, Medications, Vaccines)
    let linkedPurchaseType = null;
    let linkedPurchaseId = null;

    if (data.linkedPurchaseId && String(data.linkedPurchaseId).trim()) {
      linkedPurchaseId = String(data.linkedPurchaseId).trim();
      linkedPurchaseType = data.linkedPurchaseType ? String(data.linkedPurchaseType).trim().toUpperCase() : 'PURCHASE';

      // Check if an active expense is already linked to this purchase
      const existingLinked = await db.expenses
        .filter((e) => e.linkedPurchaseId === linkedPurchaseId && e.status !== 'Cancelled')
        .first();

      if (existingLinked) {
        throw new Error(
          `An expense record (${existingLinked.expenseId}) is already linked to purchase ${linkedPurchaseId}. Duplicate purchase expense prevented.`
        );
      }

      // Verify the original purchase exists in its respective ledger
      if (linkedPurchaseType === 'FEED') {
        const feedPur = await db.feedPurchases.where('purchaseId').equals(linkedPurchaseId).first();
        if (!feedPur) {
          throw new Error(`Feed purchase record with ID "${linkedPurchaseId}" was not found.`);
        }
      } else if (linkedPurchaseType === 'MEDICATION') {
        const medPur = await db.medicationPurchases.where('purchaseId').equals(linkedPurchaseId).first();
        if (!medPur) {
          throw new Error(`Medication purchase record with ID "${linkedPurchaseId}" was not found.`);
        }
      } else if (linkedPurchaseType === 'VACCINE') {
        const vaxPur = await db.vaccinePurchases.where('purchaseId').equals(linkedPurchaseId).first();
        if (!vaxPur) {
          throw new Error(`Vaccine purchase record with ID "${linkedPurchaseId}" was not found.`);
        }
      }
    }

    // 9. Generate Sequential IDs
    const expenseId = data.expenseId || (await this.generateNextExpenseId());
    const paymentId = paidKobo > 0 ? await this.generateNextPaymentId() : null;

    // 10. Atomic Dexie Transaction
    return await db.transaction('rw', [db.expenses, db.expensePayments, db.farmSettings], async () => {
      const expenseRecord = {
        expenseId,
        category,
        description,
        itemDescription: description,
        amount: totalAmount,
        totalAmount,
        quantity,
        unitCost,
        supplier,
        paidTo: supplier,
        paymentMethod,
        paymentStatus,
        receiptNumber,
        referenceNumber: receiptNumber,
        batchId,
        penId,
        linkedPurchaseType,
        linkedPurchaseId,
        amountPaid,
        outstandingBalance,
        status: 'Active',
        notes,
        recordedBy,
        expenseDate,
        date: expenseDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newExpenseKey = await db.expenses.add(expenseRecord);

      // If initial payment was made, record in dedicated expensePayments ledger
      let paymentRecord = null;
      if (paidKobo > 0 && paymentId) {
        paymentRecord = {
          paymentId,
          expenseId,
          amount: amountPaid,
          paymentMethod,
          paymentDate: expenseDate,
          date: expenseDate,
          status: 'Completed',
          notes: 'Initial expense payment upon recording',
          recordedBy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.expensePayments.add(paymentRecord);

        // Update payment sequence counter
        const matchP = paymentId.match(/EPAY-(\d+)/i);
        if (matchP && matchP[1]) {
          await db.farmSettings.put({
            key: 'last_expense_payment_seq',
            value: parseInt(matchP[1], 10),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Update expense sequence counter
      const matchE = expenseId.match(/EXP-(\d+)/i);
      if (matchE && matchE[1]) {
        await db.farmSettings.put({
          key: 'last_expense_seq',
          value: parseInt(matchE[1], 10),
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        ...expenseRecord,
        id: newExpenseKey,
        initialPayment: paymentRecord,
      };
    });
  },

  /**
   * Record an additional payment against an outstanding expense balance
   */
  async recordExpensePayment(data) {
    if (!data.expenseId) {
      throw new Error('Expense ID is required to record a payment.');
    }

    const payHash = `PAY_EXP_${data.expenseId}_${data.amount || ''}_${data.paymentMethod || ''}`;
    checkDuplicateSubmission(payHash, 3000);

    const expense = await db.expenses
      .filter((e) => e.expenseId === data.expenseId || Number(e.id) === Number(data.expenseId))
      .first();

    if (!expense) {
      throw new Error(`Expense with ID '${data.expenseId}' was not found.`);
    }

    if (expense.status === 'Cancelled') {
      throw new Error('Cannot record payment for a cancelled expense.');
    }

    const paymentAmountNum = Number(data.amount);
    if (isNaN(paymentAmountNum) || paymentAmountNum <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const paymentKobo = toKobo(paymentAmountNum);
    const currentOutstandingKobo = toKobo(expense.outstandingBalance);

    if (currentOutstandingKobo <= 0) {
      throw new Error('This expense is already fully paid. Outstanding balance is ₦0.00.');
    }

    if (paymentKobo > currentOutstandingKobo) {
      throw new Error(
        `Payment amount (${formatNaira(fromKobo(paymentKobo))}) exceeds outstanding balance (${formatNaira(expense.outstandingBalance)}). Overpayment prevented.`
      );
    }

    const paymentMethod = data.paymentMethod && data.paymentMethod.trim()
      ? data.paymentMethod.trim()
      : expense.paymentMethod || 'Cash';

    const paymentDate = data.paymentDate && /^\d{4}-\d{2}-\d{2}$/.test(data.paymentDate.trim())
      ? data.paymentDate.trim()
      : getLocalDateString();

    const recordedBy = data.recordedBy && data.recordedBy.trim() ? data.recordedBy.trim() : 'Administrator';
    const notes = data.notes && data.notes.trim() ? data.notes.trim() : '';

    const paymentId = await this.generateNextPaymentId();

    return await db.transaction('rw', [db.expenses, db.expensePayments, db.farmSettings], async () => {
      // 1. Insert payment ledger entry
      const paymentRecord = {
        paymentId,
        expenseId: expense.expenseId,
        amount: fromKobo(paymentKobo),
        paymentMethod,
        paymentDate,
        date: paymentDate,
        status: 'Completed',
        notes: notes || 'Additional payment recorded',
        recordedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newPayKey = await db.expensePayments.add(paymentRecord);

      // 2. Update parent expense balances
      const currentPaidKobo = toKobo(expense.amountPaid);
      const newPaidKobo = currentPaidKobo + paymentKobo;
      const newOutstandingKobo = currentOutstandingKobo - paymentKobo;
      const newPaymentStatus = newOutstandingKobo === 0 ? 'Paid' : 'Partial';

      const updatedExpenseFields = {
        amountPaid: fromKobo(newPaidKobo),
        outstandingBalance: fromKobo(newOutstandingKobo),
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString(),
      };

      await db.expenses.update(expense.id, updatedExpenseFields);

      // 3. Update payment sequence counter
      const matchP = paymentId.match(/EPAY-(\d+)/i);
      if (matchP && matchP[1]) {
        await db.farmSettings.put({
          key: 'last_expense_payment_seq',
          value: parseInt(matchP[1], 10),
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        payment: { id: newPayKey, ...paymentRecord },
        updatedExpense: { ...expense, ...updatedExpenseFields },
      };
    });
  },

  /**
   * Safely edit an expense without breaking payment history
   */
  async editExpense(expenseId, updates) {
    const expense = await db.expenses
      .filter((e) => e.expenseId === expenseId || Number(e.id) === Number(expenseId))
      .first();

    if (!expense) {
      throw new Error(`Expense with ID '${expenseId}' was not found.`);
    }

    if (expense.status === 'Cancelled') {
      throw new Error('Cannot edit a cancelled expense.');
    }

    const currentPaidKobo = toKobo(expense.amountPaid);
    let newTotalKobo = toKobo(expense.amount);

    if (updates.amount !== undefined && updates.amount !== null) {
      const num = Number(updates.amount);
      if (isNaN(num) || num <= 0) {
        throw new Error('Expense amount must be greater than zero.');
      }
      newTotalKobo = toKobo(num);

      if (newTotalKobo < currentPaidKobo) {
        throw new Error(
          `Updated total amount (${formatNaira(fromKobo(newTotalKobo))}) cannot be less than the amount already paid (${formatNaira(fromKobo(currentPaidKobo))}).`
        );
      }
    }

    const newOutstandingKobo = newTotalKobo - currentPaidKobo;
    let newPaymentStatus = 'Unpaid';
    if (newOutstandingKobo === 0 && newTotalKobo > 0) {
      newPaymentStatus = 'Paid';
    } else if (currentPaidKobo > 0) {
      newPaymentStatus = 'Partial';
    }

    const safeUpdates = {
      ...updates,
      amount: fromKobo(newTotalKobo),
      totalAmount: fromKobo(newTotalKobo),
      amountPaid: fromKobo(currentPaidKobo),
      outstandingBalance: fromKobo(newOutstandingKobo),
      paymentStatus: newPaymentStatus,
      updatedAt: new Date().toISOString(),
    };

    // Remove immutable fields
    delete safeUpdates.id;
    delete safeUpdates.expenseId;
    delete safeUpdates.createdAt;
    delete safeUpdates.linkedPurchaseId;
    delete safeUpdates.linkedPurchaseType;

    await db.expenses.update(expense.id, safeUpdates);
    return { ...expense, ...safeUpdates };
  },

  /**
   * Safely cancel/reverse an expense
   * Preserves all records for audit trails and flags linked payments as Cancelled.
   */
  async cancelExpense(expenseId, reason = 'Administrative cancellation') {
    const expense = await db.expenses
      .filter((e) => e.expenseId === expenseId || Number(e.id) === Number(expenseId))
      .first();

    if (!expense) {
      throw new Error(`Expense with ID '${expenseId}' was not found.`);
    }

    if (expense.status === 'Cancelled') {
      throw new Error('This expense is already cancelled.');
    }

    return await db.transaction('rw', [db.expenses, db.expensePayments], async () => {
      // 1. Mark expense cancelled
      const cancelUpdates = {
        status: 'Cancelled',
        paymentStatus: 'Cancelled',
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.expenses.update(expense.id, cancelUpdates);

      // 2. Mark linked payments as cancelled
      const payments = await db.expensePayments.where('expenseId').equals(expense.expenseId).toArray();
      for (const p of payments) {
        await db.expensePayments.update(p.id, {
          status: 'Cancelled',
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        ...expense,
        ...cancelUpdates,
        paymentsCancelled: payments.length,
      };
    });
  },

  /**
   * Retrieve unlinked farm purchases from Feeds, Medications, and Vaccines
   * Allows 1-click expense creation without double-counting stock movements.
   */
  async getUnlinkedPurchases() {
    try {
      const [feedPurchases, medPurchases, vaxPurchases, allExpenses] = await Promise.all([
        db.feedPurchases.toArray(),
        db.medicationPurchases.toArray(),
        db.vaccinePurchases.toArray(),
        db.expenses.toArray(),
      ]);

      const activeLinkedIds = new Set(
        allExpenses
          .filter((e) => e.status !== 'Cancelled' && e.linkedPurchaseId)
          .map((e) => e.linkedPurchaseId)
      );

      const unlinked = [];

      // Feeds
      feedPurchases.forEach((p) => {
        if (!activeLinkedIds.has(p.purchaseId)) {
          unlinked.push({
            purchaseType: 'FEED',
            purchaseTypeLabel: 'Feed Purchase',
            purchaseId: p.purchaseId,
            date: p.purchaseDate || p.createdAt ? (p.purchaseDate || p.createdAt).slice(0, 10) : getLocalDateString(),
            supplier: p.supplier || 'Feed Mill Supplier',
            description: `Stock-in feed (${p.feedName || 'Feed'} - ${p.quantity || 0} kg)`,
            amount: Number(p.totalCost) || 0,
            invoiceNumber: p.invoiceNumber || '',
            category: 'Feed purchases',
          });
        }
      });

      // Medications
      medPurchases.forEach((p) => {
        if (!activeLinkedIds.has(p.purchaseId)) {
          unlinked.push({
            purchaseType: 'MEDICATION',
            purchaseTypeLabel: 'Medication Purchase',
            purchaseId: p.purchaseId,
            date: p.purchaseDate || p.createdAt ? (p.purchaseDate || p.createdAt).slice(0, 10) : getLocalDateString(),
            supplier: p.supplier || 'Veterinary Pharmacy',
            description: `Stock-in medication (${p.medicationName || 'Medication'} - ${p.quantity || 0} units)`,
            amount: Number(p.totalCost) || 0,
            invoiceNumber: p.invoiceNumber || '',
            category: 'Medication purchases',
          });
        }
      });

      // Vaccines
      vaxPurchases.forEach((p) => {
        if (!activeLinkedIds.has(p.purchaseId)) {
          unlinked.push({
            purchaseType: 'VACCINE',
            purchaseTypeLabel: 'Vaccine Purchase',
            purchaseId: p.purchaseId,
            date: p.purchaseDate || p.createdAt ? (p.purchaseDate || p.createdAt).slice(0, 10) : getLocalDateString(),
            supplier: p.supplier || 'Biologics Distributor',
            description: `Stock-in vaccine (${p.vaccineName || 'Vaccine'} - ${p.dosesPurchased || p.quantity || 0} doses)`,
            amount: Number(p.totalCost) || 0,
            invoiceNumber: p.invoiceNumber || '',
            category: 'Vaccination and veterinary services',
          });
        }
      });

      // Sort newest first
      return unlinked.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    } catch (err) {
      console.error('Error fetching unlinked purchases:', err);
      return [];
    }
  },

  /**
   * Helper: Link an existing purchase as an expense record without altering inventory
   */
  async linkPurchaseAsExpense(purchaseType, purchaseId, overrides = {}) {
    const pType = String(purchaseType).toUpperCase();
    let purchase = null;
    let category = 'Other';

    if (pType === 'FEED') {
      purchase = await db.feedPurchases.where('purchaseId').equals(purchaseId).first();
      category = 'Feed purchases';
    } else if (pType === 'MEDICATION') {
      purchase = await db.medicationPurchases.where('purchaseId').equals(purchaseId).first();
      category = 'Medication purchases';
    } else if (pType === 'VACCINE') {
      purchase = await db.vaccinePurchases.where('purchaseId').equals(purchaseId).first();
      category = 'Vaccination and veterinary services';
    }

    if (!purchase) {
      throw new Error(`Purchase record ${purchaseId} (${pType}) was not found.`);
    }

    const totalCost = Number(purchase.totalCost) || 0;
    const expenseData = {
      category: overrides.category || category,
      description: overrides.description || `Stock-in purchase for ${purchase.feedName || purchase.medicationName || purchase.vaccineName || purchaseId}`,
      amount: totalCost,
      amountPaid: overrides.amountPaid !== undefined ? overrides.amountPaid : totalCost,
      supplier: purchase.supplier || 'Farm Supplier',
      receiptNumber: purchase.invoiceNumber || '',
      paymentMethod: overrides.paymentMethod || 'Bank Transfer',
      expenseDate: purchase.purchaseDate || getLocalDateString(),
      linkedPurchaseType: pType,
      linkedPurchaseId: purchaseId,
      notes: overrides.notes || `Linked directly from ${pType} purchase record ${purchaseId}`,
      recordedBy: overrides.recordedBy || 'Administrator',
    };

    return await this.recordExpense(expenseData);
  },

  /**
   * Fetch all expenses with multi-criteria filtering
   */
  async getExpenses(filters = {}) {
    try {
      let expenses = await db.expenses.toArray();

      // Search term
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.trim().toLowerCase();
        expenses = expenses.filter((e) => {
          const expId = (e.expenseId || '').toLowerCase();
          const desc = (e.description || e.itemDescription || '').toLowerCase();
          const supp = (e.supplier || e.paidTo || '').toLowerCase();
          const cat = (e.category || '').toLowerCase();
          const rec = (e.receiptNumber || '').toLowerCase();
          return (
            expId.includes(term) ||
            desc.includes(term) ||
            supp.includes(term) ||
            cat.includes(term) ||
            rec.includes(term)
          );
        });
      }

      // Category filter
      if (filters.category && filters.category !== 'All') {
        expenses = expenses.filter((e) => e.category === filters.category);
      }

      // Payment Status filter
      if (filters.paymentStatus && filters.paymentStatus !== 'All') {
        expenses = expenses.filter((e) => e.paymentStatus === filters.paymentStatus);
      }

      // Payment Method filter
      if (filters.paymentMethod && filters.paymentMethod !== 'All') {
        expenses = expenses.filter((e) => e.paymentMethod === filters.paymentMethod);
      }

      // Supplier / Payee filter
      if (filters.supplier && filters.supplier.trim()) {
        const suppTerm = filters.supplier.trim().toLowerCase();
        expenses = expenses.filter((e) => (e.supplier || e.paidTo || '').toLowerCase().includes(suppTerm));
      }

      // Status filter (Active vs Cancelled)
      if (filters.status && filters.status !== 'All') {
        expenses = expenses.filter((e) => e.status === filters.status);
      }

      // Batch filter
      if (filters.batchId && filters.batchId !== 'All') {
        expenses = expenses.filter((e) => String(e.batchId) === String(filters.batchId));
      }

      // Pen filter
      if (filters.penId && filters.penId !== 'All') {
        expenses = expenses.filter((e) => String(e.penId) === String(filters.penId));
      }

      // Date range filter
      if (filters.startDate) {
        expenses = expenses.filter((e) => {
          const d = e.expenseDate || e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '');
          return d >= filters.startDate;
        });
      }
      if (filters.endDate) {
        expenses = expenses.filter((e) => {
          const d = e.expenseDate || e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '');
          return d <= filters.endDate;
        });
      }

      // Default: sort descending by date and ID
      return expenses.sort((a, b) => {
        const dateA = a.expenseDate || a.date || a.createdAt || '';
        const dateB = b.expenseDate || b.date || b.createdAt || '';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return (b.id || 0) - (a.id || 0);
      });
    } catch (err) {
      console.error('Error fetching expenses:', err);
      return [];
    }
  },

  /**
   * Fetch payment history for a specific expense
   */
  async getExpensePayments(expenseId) {
    try {
      const payments = await db.expensePayments.where('expenseId').equals(expenseId).toArray();
      return payments.sort((a, b) => {
        const dateA = a.paymentDate || a.date || a.createdAt || '';
        const dateB = b.paymentDate || b.date || b.createdAt || '';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return (b.id || 0) - (a.id || 0);
      });
    } catch (err) {
      console.error('Error fetching expense payments:', err);
      return [];
    }
  },

  /**
   * Generate complete structured data for a printable Expense Voucher
   */
  async generateVoucherData(expenseId) {
    const expense = await db.expenses
      .filter((e) => e.expenseId === expenseId || Number(e.id) === Number(expenseId))
      .first();

    if (!expense) return null;

    const payments = await this.getExpensePayments(expense.expenseId);

    return {
      farm: {
        name: 'FreshNest Poultry Farm',
        tagline: 'Smart Management for Healthy Poultry Farming',
        address: 'KM 14, Iwo-Ibadan Expressway, Osun State, Nigeria',
        phone: '+234 803 123 4567 / +234 812 987 6543',
        email: 'accounts@freshnestfarms.ng',
      },
      expense: {
        ...expense,
        formattedAmount: formatNaira(expense.amount),
        formattedAmountPaid: formatNaira(expense.amountPaid),
        formattedOutstandingBalance: formatNaira(expense.outstandingBalance),
      },
      payments: payments.map((p) => ({
        ...p,
        formattedAmount: formatNaira(p.amount),
      })),
      printedAt: new Date().toISOString(),
    };
  },

  /**
   * Comprehensive expense analytics and aggregations
   */
  async getExpenseStats(options = {}) {
    try {
      const todayStr = getLocalDateString();
      const currentMonthStr = todayStr.slice(0, 7);
      const currentYearStr = todayStr.slice(0, 4);

      const [allExpenses, allPayments] = await Promise.all([
        db.expenses.toArray(),
        db.expensePayments.toArray(),
      ]);

      const activeExpenses = allExpenses.filter((e) => e.status !== 'Cancelled');
      const cancelledCount = allExpenses.filter((e) => e.status === 'Cancelled').length;

      let todayExpensesKobo = 0;
      let monthExpensesKobo = 0;
      let yearExpensesKobo = 0;
      let totalExpensesKobo = 0;
      let totalPaidKobo = 0;
      let totalOutstandingKobo = 0;

      const categoryMap = {};

      activeExpenses.forEach((e) => {
        const amtKobo = toKobo(e.amount);
        const paidK = toKobo(e.amountPaid);
        const outK = toKobo(e.outstandingBalance);
        const dStr = e.expenseDate || e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '');

        totalExpensesKobo += amtKobo;
        totalPaidKobo += paidK;
        totalOutstandingKobo += outK;

        if (dStr === todayStr) {
          todayExpensesKobo += amtKobo;
        }
        if (dStr.startsWith(currentMonthStr)) {
          monthExpensesKobo += amtKobo;
        }
        if (dStr.startsWith(currentYearStr)) {
          yearExpensesKobo += amtKobo;
        }

        // Category breakdown
        const cat = e.category || 'Other';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { amountKobo: 0, count: 0 };
        }
        categoryMap[cat].amountKobo += amtKobo;
        categoryMap[cat].count += 1;
      });

      // Format category breakdown
      const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => {
        const amount = fromKobo(data.amountKobo);
        const total = fromKobo(totalExpensesKobo);
        const percentage = total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0;
        return {
          category,
          amount,
          count: data.count,
          percentage,
        };
      }).sort((a, b) => b.amount - a.amount);

      const highestCategory = categoryBreakdown.length > 0
        ? categoryBreakdown[0]
        : { category: 'None', amount: 0, count: 0, percentage: 0 };

      // Daily trend for the last N days (defaults to 7)
      const numTrendDays = Math.max(1, Math.min(30, options.periodDays || 7));
      const trendDays = [];
      const cancelledExpenseIds = new Set(
        allExpenses.filter((e) => e.status === 'Cancelled').map((e) => e.expenseId)
      );

      for (let i = numTrendDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

        const expensesCount = activeExpenses.filter((e) => (e.expenseDate === dateStr || e.date === dateStr)).length;
        const expKobo = activeExpenses
          .filter((e) => (e.expenseDate === dateStr || e.date === dateStr))
          .reduce((sum, e) => sum + toKobo(e.amount), 0);

        const cashKobo = allPayments
          .filter((p) => !cancelledExpenseIds.has(p.expenseId) && (p.paymentDate === dateStr || p.date === dateStr))
          .reduce((sum, p) => sum + toKobo(p.amount), 0);

        trendDays.push({
          date: dateStr,
          label: dayLabel,
          transactions: expensesCount,
          expenseAmount: fromKobo(expKobo),
          cashPaid: fromKobo(cashKobo),
        });
      }

      return {
        todayExpenses: fromKobo(todayExpensesKobo),
        monthExpenses: fromKobo(monthExpensesKobo),
        yearExpenses: fromKobo(yearExpensesKobo),
        totalExpenses: fromKobo(totalExpensesKobo),
        totalExpensesIncurred: fromKobo(totalExpensesKobo),
        totalPaid: fromKobo(totalPaidKobo),
        totalCashPaid: fromKobo(totalPaidKobo),
        totalOutstanding: fromKobo(totalOutstandingKobo),
        outstandingPayables: fromKobo(totalOutstandingKobo),
        activeTransactionsCount: activeExpenses.length,
        cancelledCount,
        categoryBreakdown,
        highestCategory,
        trendDays,
      };
    } catch (err) {
      console.error('Error calculating expense stats:', err);
      return {
        todayExpenses: 0,
        monthExpenses: 0,
        yearExpenses: 0,
        totalExpenses: 0,
        totalExpensesIncurred: 0,
        totalPaid: 0,
        totalCashPaid: 0,
        totalOutstanding: 0,
        outstandingPayables: 0,
        activeTransactionsCount: 0,
        cancelledCount: 0,
        categoryBreakdown: [],
        highestCategory: { category: 'None', amount: 0, percentage: 0 },
        trendDays: [],
      };
    }
  },

  /**
   * Export expenses as formatted CSV string
   */
  async exportExpensesCSV(filters = {}) {
    const expenses = await this.getExpenses(filters);

    const headers = [
      'Expense ID',
      'Date',
      'Category',
      'Description',
      'Supplier / Payee',
      'Total Amount (NGN)',
      'Amount Paid (NGN)',
      'Outstanding Balance (NGN)',
      'Payment Status',
      'Payment Method',
      'Receipt / Ref Number',
      'Linked Purchase ID',
      'Batch ID',
      'Pen ID',
      'Status',
      'Recorded By',
      'Created At',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = expenses.map((e) => [
      escapeCsv(e.expenseId),
      escapeCsv(e.expenseDate || e.date),
      escapeCsv(e.category),
      escapeCsv(e.description || e.itemDescription),
      escapeCsv(e.supplier || e.paidTo),
      Number(e.amount || 0).toFixed(2),
      Number(e.amountPaid || 0).toFixed(2),
      Number(e.outstandingBalance || 0).toFixed(2),
      escapeCsv(e.paymentStatus),
      escapeCsv(e.paymentMethod),
      escapeCsv(e.receiptNumber || e.referenceNumber),
      escapeCsv(e.linkedPurchaseId || ''),
      escapeCsv(e.batchId || ''),
      escapeCsv(e.penId || ''),
      escapeCsv(e.status),
      escapeCsv(e.recordedBy),
      escapeCsv(e.createdAt),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Demo seeding for initial operational expenses if empty
   */
  async seedDemoExpenses() {
    try {
      const count = await db.expenses.count();
      if (count > 0) return false;

      const demo = [
        {
          category: 'Labour and salaries',
          description: 'Monthly farm attendant salaries (October 2026)',
          amount: 150000,
          amountPaid: 150000,
          supplier: 'Farm Staff Payroll',
          paymentMethod: 'Bank Transfer',
          expenseDate: getLocalDateString(),
          recordedBy: 'Administrator',
        },
        {
          category: 'Electricity',
          description: 'IBEDC Pre-paid commercial token recharge',
          amount: 25000,
          amountPaid: 25000,
          supplier: 'Ibadan Electricity Distribution Co',
          paymentMethod: 'Bank Transfer',
          receiptNumber: 'ELEC-2026-991',
          expenseDate: getLocalDateString(),
          recordedBy: 'Administrator',
        },
        {
          category: 'Packaging materials',
          description: '100 paper egg crates and protective cartons',
          amount: 18000,
          amountPaid: 10000,
          supplier: 'Crown Packaging Ltd',
          paymentMethod: 'Cash',
          receiptNumber: 'PKG-4412',
          expenseDate: getLocalDateString(),
          recordedBy: 'Administrator',
        },
      ];

      for (const d of demo) {
        await this.recordExpense(d);
      }
      return true;
    } catch (err) {
      console.error('Error seeding demo expenses:', err);
      return false;
    }
  },
};
