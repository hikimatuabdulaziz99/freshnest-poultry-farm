import {
  Layers,
  CheckCircle2,
  Clock,
  Archive,
  CheckCheck,
  Bird,
  Info,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './BatchStatsGrid.module.css';

/**
 * Batch Statistics Summary Grid
 * Displays 6 core metrics and clarifies cohort population management.
 */
export function BatchStatsGrid({ stats, activeStatusFilter, onSelectStatusFilter }) {
  const cards = [
    {
      id: 'all',
      label: 'Total Batches',
      value: stats?.totalBatches ?? 0,
      footnote: `${formatNumber(stats?.totalBatchBirds ?? 0)} cumulative chicks`,
      icon: <Layers size={18} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'Active',
      label: 'Active Batches',
      value: stats?.activeBatches ?? 0,
      footnote: `${formatNumber(stats?.activeBatchBirds ?? 0)} live flock headcount`,
      icon: <CheckCircle2 size={18} />,
      theme: styles.successTheme,
    },
    {
      id: 'Planned',
      label: 'Planned Batches',
      value: stats?.plannedBatches ?? 0,
      footnote: 'Pre-ordered / scheduled DOCs',
      icon: <Clock size={18} />,
      theme: styles.warningTheme,
    },
    {
      id: 'Completed',
      label: 'Completed Cycles',
      value: stats?.completedBatches ?? 0,
      footnote: 'Fully harvested or sold flocks',
      icon: <CheckCheck size={18} />,
      theme: styles.infoTheme,
    },
    {
      id: 'Archived',
      label: 'Archived Batches',
      value: stats?.archivedBatches ?? 0,
      footnote: 'Historical audits & records',
      icon: <Archive size={18} />,
      theme: styles.neutralTheme,
    },
    {
      id: 'birds',
      label: 'Live Batch Birds',
      value: stats?.activeBatchBirds ?? 0,
      footnote: 'Physical pen occupants',
      icon: <Bird size={18} />,
      theme: styles.highlightTheme,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        {cards.map((card) => {
          const isSelected = activeStatusFilter === card.id;
          return (
            <div
              key={card.id}
              className={`${styles.statCard} ${card.theme} ${isSelected ? styles.statCardActive : ''}`}
              onClick={() => onSelectStatusFilter && onSelectStatusFilter(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStatusFilter && onSelectStatusFilter(card.id);
                }
              }}
              title={`Click to filter by ${card.label}`}
            >
              <div className={card.cardTop}>
                <span className={styles.statLabel}>{card.label}</span>
                <div className={styles.iconWrapper}>{card.icon}</div>
              </div>
              <div className={styles.statValue}>{formatNumber(card.value)}</div>
              <div className={styles.statFootnote}>{card.footnote}</div>
            </div>
          );
        })}
      </div>

      {/* Cohort Population Clarification Banner */}
      <div className={styles.architectureBanner}>
        <div className={styles.bannerIcon}>
          <Info size={20} />
        </div>
        <div className={styles.bannerContent}>
          <h4 className={styles.bannerTitle}>
            Cohort Population Integrity: Initial Intake vs Current Live Count
          </h4>
          <p className={styles.bannerText}>
            FreshNest maintains initial placement count separately from live current count.
            Initial counts remain immutable for cumulative historical intake, while current count reflects
            live headcount and directly determines physical pen housing capacity.
          </p>
          <div className={styles.bannerChips}>
            <span className={styles.chip}>
              Active Live Headcount: <span className={styles.chipStrong}>{formatNumber(stats?.activeBatchBirds ?? 0)} birds</span>
            </span>
            <span className={styles.chip}>
              Active Cohorts: <span className={styles.chipStrong}>{formatNumber(stats?.activeBatches ?? 0)} batches</span>
            </span>
            <span className={styles.chip}>
              Cumulative Placed: <span className={styles.chipStrong}>{formatNumber(stats?.totalBatchBirds ?? 0)} birds</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
