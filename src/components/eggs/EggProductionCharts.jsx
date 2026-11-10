import {
  TrendingUp,
  PieChart,
  Award,
  Layers,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import styles from './EggProductionCharts.module.css';

/**
 * Visual Production Trends & Batch Comparisons
 */
export function EggProductionCharts({
  stats = {},
}) {
  const trendDays = stats?.trendDays || [];
  const maxTotal = Math.max(...trendDays.map((d) => d.total || 0), 10);
  const stock = stats?.stock || {};
  const byGrade = stock?.byGrade || {};
  const totalStock = stock?.totalEggsInStock || 1;

  const distributions = [
    { name: 'Grade A (Large)', count: byGrade['Grade A'] || 0, color: '#1b4332' },
    { name: 'Grade B (Medium)', count: byGrade['Grade B'] || 0, color: '#0369a1' },
    { name: 'Small Eggs', count: byGrade['Small Eggs'] || 0, color: '#d97706' },
    { name: 'Cracked Eggs', count: byGrade['Cracked Eggs'] || 0, color: '#f59e0b' },
    { name: 'Dirty Eggs', count: byGrade['Dirty Eggs'] || 0, color: '#ea580c' },
    { name: 'Damaged / Rejected', count: byGrade['Damaged / Rejected Eggs'] || 0, color: '#dc2626' },
  ];

  const batchPerformance = stats?.batchPerformance || [];

  return (
    <div className={styles.chartsContainer}>
      <div className={styles.chartsGrid}>
        {/* 1. 7-Day Collection Trend */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>7-Day Daily Egg Collection Trend</h3>
              <span className={styles.chartSubtitle}>
                Daily harvest yield with good eggs (Dark Green) vs defects (Red)
              </span>
            </div>
            <TrendingUp size={20} color="#1b4332" />
          </div>

          <div className={styles.barsWrapper}>
            {trendDays.map((day) => {
              const goodHeight = maxTotal > 0 ? (day.good / maxTotal) * 100 : 0;
              const defectHeight = maxTotal > 0 ? (day.cracked + day.dirty + day.damaged / maxTotal) * 100 : 0;
              return (
                <div key={day.date} className={styles.barCol}>
                  <span className={styles.barValueTag}>{formatNumber(day.total)}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barGood}
                      style={{ height: `${goodHeight}%` }}
                      title={`Good Eggs: ${day.good}`}
                    />
                    {defectHeight > 0 && (
                      <div
                        className={styles.barDefect}
                        style={{ height: `${defectHeight}%` }}
                        title={`Defects: ${day.cracked + day.dirty + day.damaged}`}
                      />
                    )}
                  </div>
                  <span className={styles.barDateLabel}>{day.label}</span>
                  <span className={styles.barHdpLabel}>{day.hdp}%</span>
                </div>
              );
            })}
          </div>

          <div className={styles.benchmarkBox}>
            <div className={styles.benchmarkTitle}>
              <Award size={16} />
              <span>Commercial Laying Curve Benchmark</span>
            </div>
            <p className={styles.benchmarkText}>
              Top-performing commercial layer flocks (e.g. Isa Brown / Lohmann Brown) achieve 90%–95% Hen-Day Production during peak weeks (26–36). Current farm laying average is <strong>{stats?.overallHDP ?? 0}%</strong>.
            </p>
          </div>
        </div>

        {/* 2. Inventory Quality Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Stock Quality Breakdown</h3>
              <span className={styles.chartSubtitle}>Current storage inventory distribution</span>
            </div>
            <PieChart size={20} color="#1b4332" />
          </div>

          <div className={styles.distributionList}>
            {distributions.map((item) => {
              const pct = totalStock > 0 ? ((item.count / totalStock) * 100).toFixed(1) : 0;
              return (
                <div key={item.name} className={styles.distItem}>
                  <div className={styles.distHeader}>
                    <span>{item.name}</span>
                    <span style={{ color: item.color }}>{formatNumber(item.count)} ({pct}%)</span>
                  </div>
                  <div className={styles.distBarBg}>
                    <div
                      className={styles.distBarFill}
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Batch Laying Performance Comparison Table */}
      {batchPerformance.length > 0 && (
        <div className={styles.batchTableCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Batch & Flock Yield Comparison</h3>
              <span className={styles.chartSubtitle}>Cohort performance across active pens and breeds</span>
            </div>
            <Layers size={20} color="#1b4332" />
          </div>

          <table className={styles.batchTable}>
            <thead>
              <tr>
                <th>Batch Code</th>
                <th>Breed & Type</th>
                <th>Active Hens</th>
                <th>Total Eggs Recorded</th>
                <th>Avg Daily Yield</th>
                <th>Laying Rate (HDP)</th>
                <th>Total Defects</th>
              </tr>
            </thead>
            <tbody>
              {batchPerformance.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.batchCode}</strong></td>
                  <td>{b.breed} ({b.birdType})</td>
                  <td>{formatNumber(b.livingHens)}</td>
                  <td>{formatNumber(b.totalEggs)}</td>
                  <td>{formatNumber(b.avgDaily)} / day</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        backgroundColor: b.avgHdp >= 80 ? '#d8f3dc' : b.avgHdp >= 65 ? '#fef3c7' : '#fee2e2',
                        color: b.avgHdp >= 80 ? '#1b4332' : b.avgHdp >= 65 ? '#92400e' : '#991b1b',
                      }}
                    >
                      {b.avgHdp}%
                    </span>
                  </td>
                  <td>{formatNumber(b.defectCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
