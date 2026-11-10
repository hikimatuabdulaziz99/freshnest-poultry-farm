import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { formatNaira } from '../../services/salesService.js';
import styles from './SalesStatCards.module.css';

export function SalesStatCards({ stats }) {
  const totalRevenue = stats?.totalRevenueReceived || 0;
  const totalSales = stats?.totalSalesValue || 0;
  const outstanding = stats?.totalOutstanding || 0;
  const count = stats?.transactionCount || 0;
  const todayRevenue = stats?.todayRevenueReceived || 0;
  const monthSales = stats?.thisMonthSales || 0;

  return (
    <div className={styles.statsGrid}>
      {/* 1. Cash Revenue Received */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Revenue Received</span>
          <h3 className={styles.statValue}>{formatNaira(totalRevenue)}</h3>
          <span className={styles.statSubtext}>
            Today: {formatNaira(todayRevenue)} actual cash
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconGreen}`}>
          <TrendingUp size={24} />
        </div>
      </div>

      {/* 2. Total Invoiced Sales */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Total Sales Value</span>
          <h3 className={styles.statValue}>{formatNaira(totalSales)}</h3>
          <span className={styles.statSubtext}>
            This Month: {formatNaira(monthSales)}
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconFresh}`}>
          <Receipt size={24} />
        </div>
      </div>

      {/* 3. Outstanding Receivables */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Outstanding Balance</span>
          <h3 className={styles.statValue} style={{ color: outstanding > 0 ? '#b45309' : '#1a202c' }}>
            {formatNaira(outstanding)}
          </h3>
          <span className={styles.statSubtext}>
            {outstanding > 0 ? 'Pending customer credit' : 'All accounts settled'}
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconAmber}`}>
          <AlertCircle size={24} />
        </div>
      </div>

      {/* 4. Total Transactions */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Completed Sales</span>
          <h3 className={styles.statValue}>{count.toLocaleString()}</h3>
          <span className={styles.statSubtext}>
            Active invoiced orders
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconBlue}`}>
          <CreditCard size={24} />
        </div>
      </div>
    </div>
  );
}
