import {
  Bird,
  HeartPulse,
  Layers,
  AlertTriangle,
  Egg,
  Wheat,
  Pill,
  ShoppingBag,
  Receipt,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { formatNumber, formatCurrency } from '../../utils/formatters.js';
import styles from './StatCardsGrid.module.css';

export function StatCardsGrid({ stats, onSelectModule }) {
  const cards = [
    {
      id: 'total-birds',
      label: 'Total Birds',
      value: formatNumber(stats?.totalBirds || 0),
      subtext: 'Cumulative bird population',
      icon: Bird,
      color: 'forest',
      moduleId: 'birds',
    },
    {
      id: 'active-birds',
      label: 'Active Birds',
      value: formatNumber(stats?.activeBirds || 0),
      subtext: 'Current live flock size',
      icon: HeartPulse,
      color: 'fresh',
      moduleId: 'batches',
    },
    {
      id: 'total-batches',
      label: 'Total Batches',
      value: formatNumber(stats?.totalBatches || 0),
      subtext: 'Flock cohort groups',
      icon: Layers,
      color: 'accent',
      moduleId: 'batches',
    },
    {
      id: 'dead-birds',
      label: 'Dead Birds',
      value: formatNumber(stats?.deadBirds || 0),
      subtext: 'Recorded mortality count',
      icon: AlertTriangle,
      color: stats?.deadBirds > 0 ? 'danger' : 'neutral',
      moduleId: 'mortality',
    },
    {
      id: 'eggs-today',
      label: 'Eggs Collected Today',
      value: formatNumber(stats?.eggsToday || 0),
      subtext: 'Today’s tray production',
      icon: Egg,
      color: 'gold',
      moduleId: 'eggs',
    },
    {
      id: 'feed-stock',
      label: 'Available Feed Stock',
      value: `${formatNumber(stats?.feedStock || 0)} kg`,
      subtext: 'Total feed warehouse inventory',
      icon: Wheat,
      color: 'fresh',
      moduleId: 'feed',
    },
    {
      id: 'medication-stock',
      label: 'Medication Stock',
      value: `${formatNumber(stats?.medicationStock || 0)} units`,
      subtext: 'Active veterinary treatments',
      icon: Pill,
      color: 'accent',
      moduleId: 'medication',
    },
    {
      id: 'total-sales',
      label: 'Total Sales',
      value: formatCurrency(stats?.totalSales || 0),
      subtext: stats?.totalRevenueReceived !== undefined
        ? `${formatCurrency(stats.totalRevenueReceived)} cash collected`
        : 'Revenue from birds & eggs',
      icon: ShoppingBag,
      color: 'forest',
      moduleId: 'sales',
    },
    {
      id: 'total-expenses',
      label: 'Total Expenses',
      value: formatCurrency(stats?.totalExpenses || 0),
      subtext: stats?.totalExpensesPaid !== undefined
        ? `${formatCurrency(stats.totalExpensesPaid)} cash paid`
        : 'Feed, vet, & farm overhead',
      icon: Receipt,
      color: 'neutral',
      moduleId: 'expenses',
    },
    {
      id: 'estimated-profit',
      label: 'Estimated Profit',
      value: formatCurrency(stats?.estimatedProfit || 0),
      subtext: 'Net operational earnings',
      icon: TrendingUp,
      color: (stats?.estimatedProfit || 0) >= 0 ? 'fresh' : 'danger',
      moduleId: 'reports',
    },
  ];

  return (
    <div className={styles.gridContainer}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`${styles.statCard} ${styles[card.color] || styles.neutral}`}
            onClick={() => onSelectModule && onSelectModule(card.moduleId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectModule && onSelectModule(card.moduleId);
              }
            }}
            title={`View ${card.label} in ${card.moduleId} module`}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>{card.label}</span>
              <div className={styles.iconBox}>
                <Icon size={18} />
              </div>
            </div>

            <div className={styles.valueRow}>
              <span className={styles.cardValue}>{card.value}</span>
            </div>

            <div className={styles.cardFooter}>
              <span className={styles.cardSubtext}>{card.subtext}</span>
              <ArrowUpRight size={13} className={styles.arrowIcon} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
