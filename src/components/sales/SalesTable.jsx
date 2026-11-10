import { useState, useMemo } from 'react';
import {
  Search,
  FilterX,
  Printer,
  CreditCard,
  Ban,
  ShoppingBag,
  Bird,
  Egg,
  Package,
} from 'lucide-react';
import { formatNaira, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../services/salesService.js';
import styles from './SalesTable.module.css';

export function SalesTable({
  sales = [],
  onViewReceipt,
  onRecordPayment,
  onCancelSale,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (selectedProductType && s.productType !== selectedProductType) return false;
      if (selectedPaymentStatus && s.paymentStatus !== selectedPaymentStatus) return false;
      if (selectedPaymentMethod && s.paymentMethod !== selectedPaymentMethod) return false;
      if (startDate && s.saleDate < startDate) return false;
      if (endDate && s.saleDate > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = s.saleId?.toLowerCase().includes(q) || s.invoiceNumber?.toLowerCase().includes(q);
        const custMatch = s.customerName?.toLowerCase().includes(q);
        const phoneMatch = s.customerPhone?.toLowerCase().includes(q);
        const descMatch = s.productDescription?.toLowerCase().includes(q);
        const staffMatch = s.recordedBy?.toLowerCase().includes(q);
        const notesMatch = s.notes?.toLowerCase().includes(q);
        if (!idMatch && !custMatch && !phoneMatch && !descMatch && !staffMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [sales, selectedProductType, selectedPaymentStatus, selectedPaymentMethod, startDate, endDate, searchQuery]);

  const hasActiveFilters = searchQuery || selectedProductType || selectedPaymentStatus || selectedPaymentMethod || startDate || endDate;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedProductType('');
    setSelectedPaymentStatus('');
    setSelectedPaymentMethod('');
    setStartDate('');
    setEndDate('');
  };

  const getProductIcon = (type) => {
    switch (type) {
      case 'LIVE_BIRDS':
        return <Bird size={12} />;
      case 'EGGS':
        return <Egg size={12} />;
      default:
        return <Package size={12} />;
    }
  };

  const getProductBadgeClass = (type) => {
    switch (type) {
      case 'LIVE_BIRDS':
        return styles.badgeLiveBirds;
      case 'EGGS':
        return styles.badgeEggs;
      default:
        return styles.badgeOther;
    }
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
      {/* 1. Header Filter Bar */}
      <div className={styles.tableHeaderBar}>
        <div className={styles.searchFilterGroup}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search sale ID, customer, phone..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Product Type Filter */}
          <select
            className={styles.selectInput}
            value={selectedProductType}
            onChange={(e) => setSelectedProductType(e.target.value)}
          >
            <option value="">All Products</option>
            <option value="LIVE_BIRDS">Live Birds</option>
            <option value="EGGS">Table Eggs</option>
            <option value="OTHER">Other Farm Products</option>
          </select>

          {/* Payment Status Filter */}
          <select
            className={styles.selectInput}
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            {PAYMENT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            className={styles.selectInput}
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          >
            <option value="">All Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
          />
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
          />

          {hasActiveFilters && (
            <button type="button" className={styles.clearFilterBtn} onClick={handleClearFilters}>
              <FilterX size={14} />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 2. Responsive Data Table */}
      <div className={styles.responsiveTableWrapper}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Product & Quantity</th>
              <th>Total Amount</th>
              <th>Amount Paid</th>
              <th>Outstanding</th>
              <th>Payment Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className={styles.emptyState}>
                    <ShoppingBag size={40} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>No sales records found</div>
                    <p className={styles.emptySubtext}>
                      {hasActiveFilters
                        ? 'Try clearing or modifying your filter criteria.'
                        : 'Record customer bird, egg, or product purchases to start tracking revenue.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const isCancelled = sale.status === 'Cancelled';
                const hasBalance = Number(sale.outstandingBalance) > 0 && !isCancelled;

                return (
                  <tr key={sale.id || sale.saleId}>
                    <td>
                      <span className={styles.saleCode}>{sale.saleId || sale.invoiceNumber}</span>
                    </td>
                    <td>{sale.saleDate || sale.date}</td>
                    <td>
                      <div className={styles.customerBlock}>
                        <span className={styles.customerName}>{sale.customerName}</span>
                        {sale.customerPhone && (
                          <span className={styles.customerPhone}>{sale.customerPhone}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={`${styles.productBadge} ${getProductBadgeClass(sale.productType)}`}>
                          {getProductIcon(sale.productType)}
                          {sale.productType === 'LIVE_BIRDS' ? 'Live Birds' : (sale.productType === 'EGGS' ? 'Eggs' : 'Other')}
                        </span>
                        <div className={styles.productDescText}>
                          {sale.productDescription || `${sale.quantity} items`}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.amountCell}>{formatNaira(sale.totalAmount)}</span>
                    </td>
                    <td>
                      <span className={styles.paidCell}>{formatNaira(sale.amountPaid)}</span>
                    </td>
                    <td>
                      <span className={`${styles.balanceCell} ${hasBalance ? styles.balanceDue : styles.balanceZero}`}>
                        {formatNaira(sale.outstandingBalance)}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(sale.paymentStatus)}`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsGroup} style={{ justifyContent: 'flex-end' }}>
                        {/* 1. View / Print Receipt */}
                        <button
                          type="button"
                          className={styles.actionBtn}
                          title="View / Print Receipt"
                          onClick={() => onViewReceipt(sale)}
                        >
                          <Printer size={15} />
                        </button>

                        {/* 2. Record Additional Payment */}
                        {hasBalance && (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnPay}`}
                            title="Record Additional Payment"
                            onClick={() => onRecordPayment(sale)}
                          >
                            <CreditCard size={15} />
                          </button>
                        )}

                        {/* 3. Cancel Sale */}
                        {!isCancelled && (
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.actionBtnCancel}`}
                            title="Cancel Sale & Restore Stock"
                            onClick={() => onCancelSale(sale)}
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
