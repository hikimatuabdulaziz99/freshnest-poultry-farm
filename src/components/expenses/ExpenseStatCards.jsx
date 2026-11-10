import {
  TrendingDown,
  CreditCard,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { formatNaira } from '../../services/expenseService.js';
import styles from './ExpenseStatCards.module.css';

export function ExpenseStatCards({ stats }) {
  const totalIncurred = stats?.totalExpensesIncurred || stats?.totalExpenses || 0;
  const totalPaid = stats?.totalCashPaid || stats?.totalPaid || 0;
  const outstanding = stats?.outstandingPayables || stats?.totalOutstanding || 0;
  const count = stats?.activeTransactionsCount || 0;
  const todayExpenses = stats?.todayExpenses || 0;
  const monthExpenses = stats?.monthExpenses || 0;

  return (
    <div className={styles.statsGrid}>
      {/* 1. Cash Outflow Paid */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Cash Outflow Paid</span>
          <h3 className={styles.statValue}>{formatNaira(totalPaid)}</h3>
          <span className={styles.statSubtext}>
            Today: {formatNaira(todayExpenses)} paid out
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconForest}`}>
          <TrendingDown size={24} />
        </div>
      </div>

      {/* 2. Total Expenses Incurred */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Expenses Incurred</span>
          <h3 className={styles.statValue}>{formatNaira(totalIncurred)}</h3>
          <span className={styles.statSubtext}>
            This Month: {formatNaira(monthExpenses)}
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconFresh}`}>
          <FileText size={24} />
        </div>
      </div>

      {/* 3. Outstanding Payables */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Outstanding Payables</span>
          <h3 className={styles.statValue} style={{ color: outstanding > 0 ? '#b45309' : '#1a202c' }}>
            {formatNaira(outstanding)}
          </h3>
          <span className={styles.statSubtext}>
            {outstanding > 0 ? 'Pending supplier payables' : 'All expense accounts settled'}
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconAmber}`}>
          <AlertCircle size={24} />
        </div>
      </div>

      {/* 4. Active Transactions */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Active Vouchers</span>
          <h3 className={styles.statValue}>{count.toLocaleString()}</h3>
          <span className={styles.statSubtext}>
            Recorded farm expenditures
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconPurple}`}>
          <CreditCard size={24} />
        </div>
      </div>
    </div>
  );
}
