import {
  Syringe,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './VaccineStatsGrid.module.css';

/**
 * Vaccine Statistics Grid
 * 7 Key Vaccine Pharmacy and Immunisation Schedule Metrics
 */
export function VaccineStatsGrid({ stats, activeFilter, onSelectFilter }) {
  const cards = [
    {
      id: 'products',
      label: 'Vaccine Products',
      value: stats?.totalProducts ?? 0,
      footnote: 'Catalogued vaccines',
      icon: <Syringe size={20} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'stock',
      label: 'Available Stock',
      value: `${formatNumber(stats?.totalStock ?? 0)}`,
      footnote: 'Doses in cold storage',
      icon: <Package size={20} />,
      theme: styles.successTheme,
    },
    {
      id: 'scheduled',
      label: 'Scheduled Events',
      value: formatNumber(stats?.scheduledVaccinations ?? 0),
      footnote: 'Cohort immunisation events',
      icon: <Calendar size={20} />,
      theme: styles.infoTheme,
    },
    {
      id: 'completed',
      label: 'Completed',
      value: formatNumber(stats?.completedVaccinations ?? 0),
      footnote: 'Successfully administered',
      icon: <CheckCircle2 size={20} />,
      theme: styles.successTheme,
    },
    {
      id: 'dueToday',
      label: 'Due Today',
      value: stats?.dueToday ?? 0,
      footnote: (stats?.dueToday ?? 0) > 0 ? 'Administer immunisation today' : 'No vaccinations due today',
      icon: <Clock size={20} />,
      theme: (stats?.dueToday ?? 0) > 0 ? styles.warningTheme : styles.neutralTheme,
      highlight: (stats?.dueToday ?? 0) > 0,
    },
    {
      id: 'overdue',
      label: 'Overdue Events',
      value: stats?.overdueVaccinations ?? 0,
      footnote: (stats?.overdueVaccinations ?? 0) > 0 ? 'Flock disease vulnerability!' : 'All schedules on track',
      icon: <AlertOctagon size={20} />,
      theme: (stats?.overdueVaccinations ?? 0) > 0 ? styles.dangerTheme : styles.successTheme,
      highlight: (stats?.overdueVaccinations ?? 0) > 0,
    },
    {
      id: 'alerts',
      label: 'Stock & Expiry Alerts',
      value: (stats?.lowStockVaccines ?? 0) + (stats?.expiredCount ?? 0),
      footnote: `${stats?.outOfStockCount ?? 0} empty · ${stats?.expiredCount ?? 0} expired`,
      icon: <AlertTriangle size={20} />,
      theme: (stats?.lowStockVaccines ?? 0) + (stats?.expiredCount ?? 0) > 0 ? styles.warningTheme : styles.neutralTheme,
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
