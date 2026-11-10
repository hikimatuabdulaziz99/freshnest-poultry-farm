import {
  Home,
  CheckCircle2,
  AlertCircle,
  Users,
  PieChart,
  Percent,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './BatchStatsGrid.module.css';

/**
 * Housing Units (Pens) Statistics Grid
 * Visual breakdown of farm housing units, current bird loads, and available capacity.
 */
export function PenStatsGrid({ stats, activeStatusFilter, onSelectStatusFilter }) {
  const cards = [
    {
      id: 'all',
      label: 'Total Pens',
      value: stats?.totalPens ?? 0,
      footnote: `${stats?.availablePens ?? 0} operational units`,
      icon: <Home size={18} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'Active',
      label: 'Available Units',
      value: stats?.availablePens ?? 0,
      footnote: 'Ready for placement',
      icon: <CheckCircle2 size={18} />,
      theme: styles.successTheme,
    },
    {
      id: 'Occupied',
      label: 'Occupied Units',
      value: stats?.occupiedPens ?? 0,
      footnote: 'Currently housing cohorts',
      icon: <Users size={18} />,
      theme: styles.infoTheme,
    },
    {
      id: 'capacity',
      label: 'Total Capacity',
      value: formatNumber(stats?.totalCapacity ?? 0),
      footnote: 'Max birds across all pens',
      icon: <PieChart size={18} />,
      theme: styles.warningTheme,
    },
    {
      id: 'occupancy',
      label: 'Live Occupancy',
      value: formatNumber(stats?.totalOccupied ?? 0),
      footnote: `${stats?.overallOccupancyPct ?? 0}% utilization`,
      icon: <Percent size={18} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'availableSpace',
      label: 'Space Available',
      value: formatNumber(stats?.availableCapacity ?? 0),
      footnote: 'Birds room remaining',
      icon: <AlertCircle size={18} />,
      theme: styles.neutralTheme,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        {cards.map((card) => {
          const isFilterable = card.id === 'all' || card.id === 'Active' || card.id === 'Maintenance' || card.id === 'Closed';
          const isActive = activeStatusFilter === card.id;

          return (
            <div
              key={card.label}
              className={`${styles.statCard} ${card.theme} ${isActive ? styles.statCardActive : ''}`}
              onClick={() => {
                if (isFilterable && onSelectStatusFilter) {
                  onSelectStatusFilter(card.id);
                }
              }}
              style={{ cursor: isFilterable ? 'pointer' : 'default' }}
            >
              <div className={styles.cardTop}>
                <span className={styles.statLabel}>{card.label}</span>
                <div className={styles.iconWrapper}>{card.icon}</div>
              </div>
              <div className={styles.statValue}>{card.value}</div>
              <div className={styles.footnote}>{card.footnote}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
