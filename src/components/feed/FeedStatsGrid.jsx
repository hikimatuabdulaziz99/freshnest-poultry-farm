import {
  Wheat,
  Scale,
  ShoppingBag,
  TrendingDown,
  AlertTriangle,
  Coins,
} from 'lucide-react';
import { formatNumber, formatCurrency } from '../../utils/formatters.js';
import styles from './FeedStatsGrid.module.css';

/**
 * Feed Statistics Overview Grid
 * Renders 6 core inventory and consumption metrics in Nigerian Naira (₦)
 */
export function FeedStatsGrid({ stats, activeFilter, onSelectFilter }) {
  const cards = [
    {
      id: 'all',
      label: 'Feed Products',
      value: stats?.totalProducts ?? 0,
      footnote: 'Distinct rations & formulas',
      icon: <Wheat size={20} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'stock',
      label: 'Available Stock',
      value: `${formatNumber(stats?.totalStockKg ?? 0)} kg`,
      footnote: 'Ready for flock dispensing',
      icon: <Scale size={20} />,
      theme: styles.successTheme,
    },
    {
      id: 'purchases',
      label: 'Total Purchases',
      value: formatCurrency(stats?.totalPurchasesSpend ?? 0),
      footnote: `${formatNumber(stats?.totalPurchasesCount ?? 0)} replenishment orders`,
      icon: <ShoppingBag size={20} />,
      theme: styles.infoTheme,
    },
    {
      id: 'consumed',
      label: 'Feed Consumed',
      value: `${formatNumber(stats?.totalConsumedKg ?? 0)} kg`,
      footnote: 'Cumulative flock rations',
      icon: <TrendingDown size={20} />,
      theme: styles.neutralTheme,
    },
    {
      id: 'alerts',
      label: 'Stock Alerts',
      value: (stats?.lowStockCount ?? 0) + (stats?.expiredCount ?? 0),
      footnote: `${stats?.outOfStockCount ?? 0} empty · ${stats?.expiredCount ?? 0} expired`,
      icon: <AlertTriangle size={20} />,
      theme: (stats?.lowStockCount ?? 0) + (stats?.expiredCount ?? 0) > 0 ? styles.warningTheme : styles.successTheme,
    },
    {
      id: 'valuation',
      label: 'Inventory Valuation',
      value: formatCurrency(stats?.totalInventoryValue ?? 0),
      footnote: 'Current warehouse asset value',
      icon: <Coins size={20} />,
      theme: styles.emeraldTheme,
    },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;
        return (
          <button
            key={card.id}
            type="button"
            className={`${styles.card} ${card.theme} ${isSelected ? styles.selectedCard : ''}`}
            onClick={() => onSelectFilter && onSelectFilter(card.id)}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>{card.label}</span>
              <div className={styles.iconWrapper}>{card.icon}</div>
            </div>
            <div className={styles.cardValue}>{card.value}</div>
            <div className={styles.cardFootnote}>{card.footnote}</div>
          </button>
        );
      })}
    </div>
  );
}
