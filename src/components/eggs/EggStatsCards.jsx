import {
  Egg,
  Boxes,
  Percent,
  TrendingUp,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './EggStatsCards.module.css';

/**
 * Egg Production Statistics Cards
 * 6 Key Flock Egg Yield & Inventory Metrics
 */
export function EggStatsCards({ stats, activeFilter, onSelectFilter }) {
  const stock = stats?.stock || {};
  const sellableEggs = stock.totalSellableEggs ?? 0;
  const sellableCrates = stock.totalSellableCrates ?? 0;
  const sellableLoose = stock.totalSellableLoose ?? 0;

  const defectEggs = stock.totalDefectEggs ?? 0;
  const defectCrates = stock.totalDefectCrates ?? 0;

  const todayCollected = stats?.todayCollected ?? 0;
  const todayMorning = stats?.todayMorning ?? 0;
  const todayAfternoon = stats?.todayAfternoon ?? 0;
  const todayEvening = stats?.todayEvening ?? 0;

  const cards = [
    {
      id: 'today',
      label: "Today's Collection",
      value: `${formatNumber(todayCollected)} eggs`,
      footnote: todayCollected > 0
        ? `M: ${todayMorning} | A: ${todayAfternoon} | E: ${todayEvening}`
        : 'No collections logged today',
      icon: <Egg size={20} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'sellableStock',
      label: 'Sellable Egg Stock',
      value: `${formatNumber(sellableEggs)} eggs`,
      footnote: `${sellableCrates} crates${sellableLoose > 0 ? `, ${sellableLoose} loose` : ''}`,
      icon: <Boxes size={20} />,
      theme: styles.successTheme,
    },
    {
      id: 'hdp',
      label: 'Laying Rate (HDP)',
      value: `${stats?.overallHDP ?? 0}%`,
      footnote: `${formatNumber(stats?.totalLivingLayers ?? 0)} active laying hens`,
      icon: <Percent size={20} />,
      theme: styles.infoTheme,
    },
    {
      id: 'sevenDayAvg',
      label: '7-Day Daily Average',
      value: `${formatNumber(stats?.sevenDayDailyAvg ?? 0)} eggs`,
      footnote: `${formatNumber(stats?.past7Collected ?? 0)} eggs past 7 days`,
      icon: <TrendingUp size={20} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'defectRate',
      label: '30-Day Defect Rate',
      value: `${stats?.defectRate ?? 0}%`,
      footnote: 'Cracked, dirty & damaged',
      icon: <AlertTriangle size={20} />,
      theme: (stats?.defectRate ?? 0) > 5 ? styles.warningTheme : styles.successTheme,
    },
    {
      id: 'defectStock',
      label: 'Defect Stock (Rejects)',
      value: `${formatNumber(defectEggs)} eggs`,
      footnote: `${defectCrates} crates awaiting disposal`,
      icon: <Archive size={20} />,
      theme: styles.neutralTheme,
    },
  ];

  return (
    <div className={styles.gridContainer}>
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;
        return (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            className={`${styles.statCard} ${card.theme} ${isSelected ? styles.selectedCard : ''}`}
            onClick={() => onSelectFilter && onSelectFilter(card.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectFilter && onSelectFilter(card.id);
              }
            }}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>{card.label}</span>
              <div className={styles.iconWrapper}>{card.icon}</div>
            </div>
            <div className={styles.cardValue}>{card.value}</div>
            <div className={styles.cardFootnote}>{card.footnote}</div>
          </div>
        );
      })}
    </div>
  );
}
