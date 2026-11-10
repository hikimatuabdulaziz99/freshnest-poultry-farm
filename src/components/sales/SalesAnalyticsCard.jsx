import {
  PieChart,
  CreditCard,
  BarChart3,
  Bird,
  Egg,
  Package,
} from 'lucide-react';
import { formatNaira } from '../../services/salesService.js';
import styles from './SalesAnalyticsCard.module.css';

export function SalesAnalyticsCard({ stats }) {
  const productBreakdown = stats?.productBreakdown || [];
  const paymentBreakdown = stats?.paymentMethodsBreakdown || [];
  const trendDays = stats?.trendDays || [];

  const maxDailySales = Math.max(...trendDays.map((d) => d.salesAmount || 0), 1);

  const getProductIcon = (type) => {
    switch (type) {
      case 'LIVE_BIRDS':
        return <Bird size={14} color="#0369a1" />;
      case 'EGGS':
        return <Egg size={14} color="#92400e" />;
      default:
        return <Package size={14} color="#475569" />;
    }
  };

  const getProductFill = (type) => {
    switch (type) {
      case 'LIVE_BIRDS':
        return styles.fillBlue;
      case 'EGGS':
        return styles.fillAmber;
      default:
        return styles.fillGreen;
    }
  };

  const getProductLabel = (type) => {
    switch (type) {
      case 'LIVE_BIRDS':
        return 'Live Birds';
      case 'EGGS':
        return 'Table Eggs';
      default:
        return 'Other Products';
    }
  };

  return (
    <div className={styles.analyticsContainer}>
      {/* 1. Revenue by Product Category */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <PieChart size={18} color="#1b4332" />
              Revenue by Product Category
            </h4>
            <p className={styles.cardSubtitle}>Total invoiced sales volume and value</p>
          </div>
        </div>

        <div className={styles.breakdownList}>
          {productBreakdown.map((item) => (
            <div key={item.productType} className={styles.breakdownItem}>
              <div className={styles.itemLabelRow}>
                <span className={styles.itemName}>
                  {getProductIcon(item.productType)}
                  {getProductLabel(item.productType)} ({item.count} sales)
                </span>
                <span className={styles.itemValues}>
                  {formatNaira(item.revenue)} ({item.percentage}%)
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={`${styles.progressBarFill} ${getProductFill(item.productType)}`}
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Revenue by Payment Method */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <CreditCard size={18} color="#1b4332" />
              Settlement by Payment Method
            </h4>
            <p className={styles.cardSubtitle}>Actual cash and transfer receipts collected</p>
          </div>
        </div>

        <div className={styles.breakdownList}>
          {paymentBreakdown.map((item) => (
            <div key={item.method} className={styles.breakdownItem}>
              <div className={styles.itemLabelRow}>
                <span className={styles.itemName}>
                  {item.method} ({item.count} receipts)
                </span>
                <span className={styles.itemValues}>
                  {formatNaira(item.amount)} ({item.percentage}%)
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={`${styles.progressBarFill} ${styles.fillFresh}`}
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Daily 7-Day Sales Trend Bar Chart */}
      <div className={styles.trendCard}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <BarChart3 size={18} color="#1b4332" />
              7-Day Sales Activity & Invoiced Revenue Trend
            </h4>
            <p className={styles.cardSubtitle}>Daily transactions and invoiced volume</p>
          </div>
        </div>

        <div className={styles.trendGrid}>
          {trendDays.map((d) => {
            const heightPct = Math.round(((d.salesAmount || 0) / maxDailySales) * 100);
            return (
              <div key={d.date} className={styles.trendCol}>
                <span className={styles.trendAmountLabel}>
                  {d.salesAmount > 0 ? formatNaira(d.salesAmount) : '—'}
                </span>
                <div className={styles.trendBarTrack}>
                  <div
                    className={styles.trendBarFill}
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                    title={`${d.label}: ${formatNaira(d.salesAmount)} (${d.transactions} sales)`}
                  />
                </div>
                <span className={styles.trendDayLabel}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
