import {
  Skull,
  Calendar,
  AlertTriangle,
  Percent,
  Activity,
  Layers,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './MortalityStatCards.module.css';

/**
 * Mortality Statistics Cards
 * 6 Key Flock Health & Mortality Metrics
 */
export function MortalityStatCards({ stats }) {
  const todayDeaths = stats?.todayDeaths ?? 0;
  const thisMonthDeaths = stats?.thisMonthDeaths ?? 0;
  const thisYearDeaths = stats?.thisYearDeaths ?? 0;
  const overallRate = stats?.overallMortalityRate ?? 0;
  const highestBatch = stats?.highestMortalityBatch;
  const topCause = stats?.mortalityByCause?.[0];

  const cards = [
    {
      id: 'today',
      label: "Today's Deaths",
      value: `${formatNumber(todayDeaths)} birds`,
      footnote: todayDeaths > 0
        ? `7-day daily avg: ${stats?.sevenDayDailyAvg ?? 0}`
        : 'Zero flock deaths recorded today',
      icon: <Skull size={20} />,
      theme: todayDeaths > 0 ? styles.dangerTheme : styles.successTheme,
    },
    {
      id: 'thisMonth',
      label: 'Deaths This Month',
      value: `${formatNumber(thisMonthDeaths)} birds`,
      footnote: 'Current calendar month (MTD)',
      icon: <Calendar size={20} />,
      theme: styles.warningTheme,
    },
    {
      id: 'thisYear',
      label: 'Deaths This Year',
      value: `${formatNumber(thisYearDeaths)} birds`,
      footnote: 'Current calendar year (YTD)',
      icon: <Activity size={20} />,
      theme: styles.neutralTheme,
    },
    {
      id: 'overallRate',
      label: 'Flock Mortality Rate',
      value: `${overallRate}%`,
      footnote: 'Across all active farm cohorts',
      icon: <Percent size={20} />,
      theme: overallRate > 5 ? styles.dangerTheme : styles.primaryTheme,
    },
    {
      id: 'highestBatch',
      label: 'Highest Risk Batch',
      value: highestBatch ? highestBatch.batchCode : 'None',
      footnote: highestBatch
        ? `${highestBatch.deaths} deaths (${highestBatch.mortalityRate}%)`
        : 'All batches within threshold',
      icon: <Layers size={20} />,
      theme: highestBatch?.mortalityRate > 5 ? styles.dangerTheme : styles.infoTheme,
    },
    {
      id: 'topCause',
      label: 'Top Cause of Loss',
      value: topCause ? topCause.cause : 'None',
      footnote: topCause
        ? `${topCause.count} birds (${topCause.percentage}% of losses)`
        : 'No cause patterns logged',
      icon: <AlertTriangle size={20} />,
      theme: styles.warningTheme,
    },
  ];

  return (
    <div className={styles.gridContainer}>
      {cards.map((card) => (
        <div key={card.id} className={`${styles.statCard} ${card.theme}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>{card.label}</span>
            <div className={styles.iconWrapper}>{card.icon}</div>
          </div>
          <div className={styles.cardValue}>{card.value}</div>
          <div className={styles.cardFootnote}>{card.footnote}</div>
        </div>
      ))}
    </div>
  );
}
