import { BarChart3, PieChart } from 'lucide-react';
import styles from './MortalityAnalyticsCard.module.css';

export function MortalityAnalyticsCard({ stats }) {
  const trendDays = stats?.trendDays || [];
  const mortalityByCause = stats?.mortalityByCause || [];

  // Calculate max count for trend bar scaling
  const maxTrendCount = Math.max(...trendDays.map((d) => d.count), 5);

  return (
    <div className={styles.container}>
      {/* 1. 7-Day Mortality Trend */}
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleBox}>
            <BarChart3 size={18} className={styles.icon} />
            <div>
              <h4 className={styles.title}>7-Day Mortality Trend</h4>
              <p className={styles.subtitle}>Daily losses across all farm pens</p>
            </div>
          </div>
        </div>

        {trendDays.length === 0 ? (
          <div className={styles.emptyState}>No recent mortality trend data</div>
        ) : (
          <div className={styles.chartWrapper}>
            {trendDays.map((day) => {
              const heightPct = Math.round((day.count / maxTrendCount) * 100);
              const isHigh = day.count > (stats?.sevenDayDailyAvg * 1.5) && day.count >= 3;
              return (
                <div key={day.date} className={styles.barCol}>
                  <span className={styles.barValue}>{day.count}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${isHigh ? styles.barFillDanger : ''}`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>
                  <span className={styles.barLabel}>{day.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Mortality by Cause Breakdown */}
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleBox}>
            <PieChart size={18} className={styles.icon} />
            <div>
              <h4 className={styles.title}>Causes of Loss Breakdown</h4>
              <p className={styles.subtitle}>Categorised pathological & environmental factors</p>
            </div>
          </div>
        </div>

        {mortalityByCause.length === 0 ? (
          <div className={styles.emptyState}>No mortality records logged yet</div>
        ) : (
          <div className={styles.causeList}>
            {mortalityByCause.slice(0, 5).map((item) => (
              <div key={item.cause} className={styles.causeItem}>
                <div className={styles.causeRow}>
                  <span className={styles.causeName}>{item.cause}</span>
                  <span className={styles.causeMetrics}>
                    {item.count} birds ({item.percentage}%)
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
