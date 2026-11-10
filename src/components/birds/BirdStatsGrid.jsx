import {
  Bird,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShoppingBag,
  Skull,
  Info,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './BirdStatsGrid.module.css';

/**
 * Bird Management Statistics Summary Grid
 * Displays 6 core metrics and clarifies individual bird records vs cohort batches.
 */
export function BirdStatsGrid({ stats, activeStatusFilter, onSelectStatusFilter }) {
  const cards = [
    {
      id: 'all',
      label: 'Total Bird Records',
      value: stats?.total ?? 0,
      footnote: `${stats?.standalone ?? 0} standalone · ${stats?.batchAssigned ?? 0} in batches`,
      icon: <Bird size={20} />,
      theme: styles.primaryTheme,
    },
    {
      id: 'Active',
      label: 'Active Birds',
      value: stats?.active ?? 0,
      footnote: 'Healthy & productive stock',
      icon: <CheckCircle2 size={20} />,
      theme: styles.successTheme,
    },
    {
      id: 'Sick',
      label: 'Sick Birds',
      value: stats?.sick ?? 0,
      footnote: 'Under treatment observation',
      icon: <AlertTriangle size={20} />,
      theme: styles.warningTheme,
    },
    {
      id: 'Quarantined',
      label: 'Quarantined',
      value: stats?.quarantined ?? 0,
      footnote: 'Isolated biosecurity bay',
      icon: <ShieldAlert size={20} />,
      theme: styles.quarantineTheme,
    },
    {
      id: 'Sold',
      label: 'Sold Birds',
      value: stats?.sold ?? 0,
      footnote: 'Transferred or commercial sales',
      icon: <ShoppingBag size={20} />,
      theme: styles.neutralTheme,
    },
    {
      id: 'Dead',
      label: 'Dead Birds',
      value: stats?.dead ?? 0,
      footnote: 'Recorded mortalities',
      icon: <Skull size={20} />,
      theme: styles.dangerTheme,
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

      {/* Population Architecture Clarification */}
      <div className={styles.architectureBanner}>
        <div className={styles.bannerIcon}>
          <Info size={20} />
        </div>
        <div className={styles.bannerContent}>
          <h4 className={styles.bannerTitle}>
            Farm Population Architecture: Individual Birds vs Cohort Batches
          </h4>
          <p className={styles.bannerText}>
            Individual bird records are reserved for individually identified breeders, pedigree stock,
            cockerels, or isolated birds. Standalone birds contribute directly to overall farm headcount,
            while birds assigned to an active cohort batch are managed within that batch's population to
            prevent double-counting across the dashboard.
          </p>
          <div className={styles.bannerChips}>
            <span className={styles.chip}>
              Standalone Stock: <span className={styles.chipStrong}>{formatNumber(stats?.standalone ?? 0)}</span> (Direct Population)
            </span>
            <span className={styles.chip}>
              Batch Assigned: <span className={styles.chipStrong}>{formatNumber(stats?.batchAssigned ?? 0)}</span> (Managed via Batches)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
