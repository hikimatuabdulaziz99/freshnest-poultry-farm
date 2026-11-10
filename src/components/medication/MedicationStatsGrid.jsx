import {
  Pill,
  Package,
  Activity,
  AlertOctagon,
  AlertTriangle,
  Clock,
  Coins,
} from 'lucide-react';
import { formatNumber, formatCurrency } from '../../utils/formatters.js';
import styles from './MedicationStatsGrid.module.css';

/**
 * Medication Statistics Grid
 * 7 Key Pharmacy and Veterinary Metrics including Active Withdrawal Warnings
 */
export function MedicationStatsGrid({ stats, activeFilter, onSelectFilter }) {
  const cards = [
    {
      id: 'products',
      label: 'Medications',
      value: stats?.totalProducts ?? 0,
      footnote: 'Catalogued pharmaceutical items',
      icon: <Pill size={20} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'stock',
      label: 'Total Stock',
      value: `${formatNumber(stats?.totalStock ?? 0)}`,
      footnote: 'Available units across inventory',
      icon: <Package size={20} />,
      theme: styles.successTheme,
    },
    {
      id: 'treatments',
      label: 'Treatments Logged',
      value: formatNumber(stats?.totalTreatments ?? 0),
      footnote: 'Flock & bird administrations',
      icon: <Activity size={20} />,
      theme: styles.infoTheme,
    },
    {
      id: 'withdrawals',
      label: 'Withdrawal Holds',
      value: stats?.activeWithdrawals ?? 0,
      footnote: (stats?.activeWithdrawals ?? 0) > 0 ? 'Food safety harvest restrictions' : 'No active flock restrictions',
      icon: <Clock size={20} />,
      theme: (stats?.activeWithdrawals ?? 0) > 0 ? styles.dangerTheme : styles.successTheme,
      highlight: (stats?.activeWithdrawals ?? 0) > 0,
    },
    {
      id: 'lowStock',
      label: 'Low Stock Alert',
      value: stats?.lowStockCount ?? 0,
      footnote: `${stats?.outOfStockCount ?? 0} out of stock items`,
      icon: <AlertTriangle size={20} />,
      theme: (stats?.lowStockCount ?? 0) > 0 ? styles.warningTheme : styles.neutralTheme,
    },
    {
      id: 'expired',
      label: 'Expired Medicines',
      value: stats?.expiredCount ?? 0,
      footnote: 'Blocked from administration',
      icon: <AlertOctagon size={20} />,
      theme: (stats?.expiredCount ?? 0) > 0 ? styles.dangerTheme : styles.neutralTheme,
    },
    {
      id: 'value',
      label: 'Inventory Value',
      value: formatCurrency(stats?.totalInventoryValue ?? 0),
      footnote: 'Total replacement value in ₦',
      icon: <Coins size={20} />,
      theme: styles.primaryTheme,
    },
  ];

  return (
    <div className={styles.gridContainer}>
      {cards.map((c) => {
        const isSelected = activeFilter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`${styles.statCard} ${c.theme} ${isSelected ? styles.selectedCard : ''} ${c.highlight ? styles.highlightPulse : ''}`}
            onClick={() => onSelectFilter && onSelectFilter(c.id)}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>{c.label}</span>
              <div className={styles.cardIconBox}>{c.icon}</div>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardValue}>{c.value}</div>
              <div className={styles.cardFootnote}>{c.footnote}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
