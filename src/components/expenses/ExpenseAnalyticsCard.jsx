import {
  PieChart,
  BarChart3,
  Wallet,
} from 'lucide-react';
import { formatNaira } from '../../services/expenseService.js';
import styles from './ExpenseAnalyticsCard.module.css';

export function ExpenseAnalyticsCard({ stats }) {
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const trendDays = stats?.trendDays || [];
  const highestCategory = stats?.highestCategory || { category: 'None', amount: 0, percentage: 0 };

  const maxDailyExpense = Math.max(...trendDays.map((d) => d.expenseAmount || 0), 1);

  return (
    <div className={styles.analyticsContainer}>
      {/* 1. Category Breakdown */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <PieChart size={18} color="#1b4332" />
              Operational Cost Allocation
            </h4>
            <span className={styles.cardSubtitle}>
              Expenditure distribution across farm categories
            </span>
          </div>
        </div>

        {/* Highest Expense Category Highlight */}
        {highestCategory.amount > 0 && (
          <div className={styles.highlightBanner}>
            <div>
              <span className={styles.highlightLabel}>Highest Spending Category</span>
              <h5 className={styles.highlightName}>{highestCategory.category}</h5>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                {highestCategory.percentage}% of all incurred farm costs
              </span>
            </div>
            <div>
              <div className={styles.highlightAmount}>
                {formatNaira(highestCategory.amount)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, textAlign: 'right' }}>
                {highestCategory.count} vouchers
              </div>
            </div>
          </div>
        )}

        <div className={styles.breakdownList}>
          {categoryBreakdown.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#718096', margin: '2rem 0' }}>
              No active operational expense data available
            </p>
          ) : (
            categoryBreakdown.map((item) => (
              <div key={item.category} className={styles.breakdownItem}>
                <div className={styles.breakdownHeader}>
                  <span className={styles.breakdownLabel}>
                    {item.category}
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                      ({item.count} {item.count === 1 ? 'record' : 'records'})
                    </span>
                  </span>
                  <span className={styles.breakdownValue}>
                    {formatNaira(item.amount)} ({item.percentage}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Expense Incurred vs Cash Outflow Trend */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <BarChart3 size={18} color="#1b4332" />
              Daily Expenditure & Cash Outflow
            </h4>
            <span className={styles.cardSubtitle}>
              7-Day comparison of expenses incurred vs actual cash disbursed
            </span>
          </div>
        </div>

        <div className={styles.trendGrid}>
          {trendDays.map((d) => {
            const expPct = Math.round(((d.expenseAmount || 0) / maxDailyExpense) * 100);
            return (
              <div key={d.date} className={styles.trendCol}>
                <span className={styles.trendAmount}>
                  {d.expenseAmount > 0 ? `₦${Math.round(d.expenseAmount / 1000)}k` : '—'}
                </span>
                <div className={styles.trendBarTrack} title={`Date: ${d.date}\nIncurred: ${formatNaira(d.expenseAmount)}\nCash Paid: ${formatNaira(d.cashPaid)}`}>
                  <div
                    className={styles.trendBarFill}
                    style={{ height: `${Math.max(4, expPct)}%` }}
                  />
                </div>
                <span className={styles.trendLabel}>{d.label}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.25rem', fontSize: '0.75rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#1b4332' }} />
            <span>Daily Incurred Expense</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wallet size={12} color="#40916c" />
            <span>Total Cash Settled: <strong>{formatNaira(stats?.totalCashPaid || stats?.totalPaid || 0)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
