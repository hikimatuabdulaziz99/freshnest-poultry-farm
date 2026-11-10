import { useState, useMemo } from 'react';
import {
  Search,
  FilterX,
  Printer,
  CreditCard,
  Ban,
  Receipt,
  Edit2,
} from 'lucide-react';
import { formatNaira, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../services/expenseService.js';
import styles from './ExpenseTable.module.css';

export function ExpenseTable({
  expenses = [],
  categories = [],
  onViewVoucher,
  onRecordPayment,
  onEditExpense,
  onCancelExpense,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory && e.category !== selectedCategory) return false;
      if (selectedPaymentStatus && e.paymentStatus !== selectedPaymentStatus) return false;
      if (selectedPaymentMethod && e.paymentMethod !== selectedPaymentMethod) return false;
      if (startDate && (e.expenseDate || e.date) < startDate) return false;
      if (endDate && (e.expenseDate || e.date) > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = e.expenseId?.toLowerCase().includes(q);
        const suppMatch = (e.supplier || e.paidTo)?.toLowerCase().includes(q);
        const descMatch = (e.description || e.itemDescription)?.toLowerCase().includes(q);
        const catMatch = e.category?.toLowerCase().includes(q);
        const recMatch = (e.receiptNumber || e.referenceNumber)?.toLowerCase().includes(q);
        const staffMatch = e.recordedBy?.toLowerCase().includes(q);
        if (!idMatch && !suppMatch && !descMatch && !catMatch && !recMatch && !staffMatch) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, selectedCategory, selectedPaymentStatus, selectedPaymentMethod, startDate, endDate, searchQuery]);

  const hasActiveFilters = searchQuery || selectedCategory || selectedPaymentStatus || selectedPaymentMethod || startDate || endDate;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPaymentStatus('');
    setSelectedPaymentMethod('');
    setStartDate('');
    setEndDate('');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Paid':
        return styles.statusPaid;
      case 'Partial':
        return styles.statusPartial;
      case 'Unpaid':
        return styles.statusUnpaid;
      case 'Cancelled':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  return (
    <div className={styles.tableContainer}>
      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by ID, supplier, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          {/* Category Filter */}
          <select
            className={styles.filterSelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            className={styles.filterSelect}
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            className={styles.filterSelect}
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          >
            <option value="">All Payment Methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Filter by start date"
          />
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="Filter by end date"
          />

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              <FilterX size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Expense ID</th>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Payee / Supplier</th>
              <th>Total Amount</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Method</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="11">
                  <div className={styles.emptyState}>
                    <Receipt size={40} className={styles.emptyIcon} />
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                      No expense records found
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                      {hasActiveFilters
                        ? 'Try clearing active filters to view all recorded expenses.'
                        : 'Record a new operational expense to track farm expenditures.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => {
                const isCancelled = expense.status === 'Cancelled';
                const hasBalance = Number(expense.outstandingBalance) > 0;

                return (
                  <tr key={expense.id || expense.expenseId}>
                    <td className={styles.idCell}>
                      {expense.expenseId || `EXP-${String(expense.id).padStart(4, '0')}`}
                    </td>
                    <td>{expense.expenseDate || expense.date || '—'}</td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {expense.category || 'General'}
                      </span>
                    </td>
                    <td className={styles.descCell} title={expense.description || expense.itemDescription}>
                      {expense.description || expense.itemDescription || '—'}
                    </td>
                    <td>{expense.supplier || expense.paidTo || '—'}</td>
                    <td className={styles.amountCell}>
                      {formatNaira(expense.amount)}
                    </td>
                    <td style={{ color: '#2e7d32', fontWeight: 600 }}>
                      {formatNaira(expense.amountPaid || 0)}
                    </td>
                    <td style={{ color: hasBalance ? '#b45309' : '#718096', fontWeight: 600 }}>
                      {formatNaira(expense.outstandingBalance || 0)}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(expense.paymentStatus)}`}>
                        {expense.paymentStatus}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#4a5568' }}>
                      {expense.paymentMethod || 'Cash'}
                    </td>
                    <td>
                      <div className={styles.actionsCell} style={{ justifyContent: 'center' }}>
                        {/* 1. View / Print Voucher */}
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onViewVoucher(expense)}
                          title="View / Print Expense Voucher"
                        >
                          <Printer size={15} />
                        </button>

                        {/* 2. Record Additional Payment */}
                        {!isCancelled && hasBalance && (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnPay}`}
                            onClick={() => onRecordPayment(expense)}
                            title="Record additional payment"
                          >
                            <CreditCard size={15} />
                          </button>
                        )}

                        {/* 3. Edit Expense */}
                        {!isCancelled && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => onEditExpense(expense)}
                            title="Edit Expense Details"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {/* 4. Cancel Expense */}
                        {!isCancelled && (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnCancel}`}
                            onClick={() => onCancelExpense(expense)}
                            title="Cancel / Reverse Expense"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
