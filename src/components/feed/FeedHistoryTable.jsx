import { useState, useMemo } from 'react';
import {
  ShoppingBag,
  TrendingDown,
  Calendar,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Layers,
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '../../utils/formatters.js';
import styles from './FeedHistoryTable.module.css';

/**
 * Feed Transaction Audit Ledger
 * Combines Purchases (Stock In) and Feeding Disbursements (Stock Out)
 */
export function FeedHistoryTable({
  transactions = [],
  isLoading = false,
  onRecordPurchase,
  onRecordFeeding,
}) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'STOCK_IN' | 'STOCK_OUT'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (filterType !== 'ALL' && t.transactionType !== filterType) {
        return false;
      }

      // Date filter
      if (dateFilter && t.date !== dateFilter) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeMatch = t.code && t.code.toLowerCase().includes(q);
        const nameMatch = t.feedName && t.feedName.toLowerCase().includes(q);
        const partyMatch = t.party && t.party.toLowerCase().includes(q);
        const refMatch = t.reference && t.reference.toLowerCase().includes(q);
        return codeMatch || nameMatch || partyMatch || refMatch;
      }

      return true;
    });
  }, [transactions, filterType, searchQuery, dateFilter]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <span>Loading transaction audit history...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Filters Bar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.typeFilterGroup}>
            <button
              type="button"
              className={`${styles.filterChip} ${filterType === 'ALL' ? styles.filterChipActive : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              All Movements ({transactions.length})
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filterType === 'STOCK_IN' ? styles.filterChipActive : ''}`}
              onClick={() => setFilterType('STOCK_IN')}
            >
              <ArrowDownLeft size={14} className={styles.inIcon} />
              Stock In (Purchases)
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filterType === 'STOCK_OUT' ? styles.filterChipActive : ''}`}
              onClick={() => setFilterType('STOCK_OUT')}
            >
              <ArrowUpRight size={14} className={styles.outIcon} />
              Stock Out (Feeding)
            </button>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          {/* Search */}
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search code, feed, supplier, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Date Picker */}
          <div className={styles.dateFilterBox}>
            <Calendar size={15} className={styles.calendarIcon} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={styles.dateInput}
            />
            {dateFilter && (
              <button
                type="button"
                className={styles.clearDateBtn}
                onClick={() => setDateFilter('')}
                title="Clear date"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredTransactions.length === 0 ? (
        <div className={styles.emptyContainer}>
          <Clock size={40} className={styles.emptyIcon} />
          <h3>No Feed Transactions Found</h3>
          <p>No inventory movements match the selected filters or date range.</p>
          <div className={styles.emptyActions}>
            <button type="button" className={styles.emptyStockInBtn} onClick={onRecordPurchase}>
              <ShoppingBag size={15} />
              Record Purchase (Stock In)
            </button>
            <button type="button" className={styles.emptyDispenseBtn} onClick={onRecordFeeding}>
              <TrendingDown size={15} />
              Record Feeding (Stock Out)
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type & Code</th>
                <th>Feed Product</th>
                <th>Quantity</th>
                <th>Transaction Details</th>
                <th>Financials / Batch</th>
                <th>Date</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isStockIn = tx.transactionType === 'STOCK_IN';
                return (
                  <tr key={tx.id} className={styles.tableRow}>
                    {/* Type & Code */}
                    <td>
                      <div className={styles.codeCell}>
                        <span
                          className={`${styles.typeBadge} ${
                            isStockIn ? styles.badgeIn : styles.badgeOut
                          }`}
                        >
                          {isStockIn ? (
                            <>
                              <ArrowDownLeft size={12} /> Stock In
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={12} /> Stock Out
                            </>
                          )}
                        </span>
                        <span className={styles.codeText}>{tx.code}</span>
                      </div>
                    </td>

                    {/* Feed Product */}
                    <td>
                      <div className={styles.feedCell}>
                        <span className={styles.feedName}>{tx.feedName}</span>
                        <span className={styles.feedCodeSub}>{tx.feedId}</span>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td>
                      <span
                        className={`${styles.quantityValue} ${
                          isStockIn ? styles.qtyPositive : styles.qtyNegative
                        }`}
                      >
                        {isStockIn ? '+' : '-'}
                        {formatNumber(tx.quantity)} {tx.unit}
                      </span>
                    </td>

                    {/* Transaction Details */}
                    <td>
                      <div className={styles.partyCell}>
                        <span className={styles.partyText}>{tx.party || '—'}</span>
                        <span className={styles.referenceText}>{tx.reference || '—'}</span>
                      </div>
                    </td>

                    {/* Financials / Batch */}
                    <td>
                      {isStockIn ? (
                        <div className={styles.costCell}>
                          <span className={styles.totalCostText}>{formatCurrency(tx.totalCost)}</span>
                          <span className={styles.unitCostSub}>
                            {formatCurrency(tx.unitCost)} / {tx.unit}
                          </span>
                        </div>
                      ) : (
                        <div className={styles.batchCell}>
                          <span className={styles.batchTag}>
                            <Layers size={11} />
                            {tx.party || 'Flock'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td>
                      <span className={styles.dateText}>{formatDate(tx.date)}</span>
                    </td>

                    {/* Recorded By */}
                    <td>
                      <span className={styles.operatorText}>{tx.operator || 'Farm Administrator'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
