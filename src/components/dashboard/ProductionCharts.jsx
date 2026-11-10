import { useState } from 'react';
import {
  Egg,
  AlertTriangle,
  TrendingUp,
  Layers,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { Card } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';
import { formatNumber } from '../../utils/formatters.js';
import styles from './ProductionCharts.module.css';

export function ProductionCharts({ analytics, onSelectModule }) {
  const [activeTab, setActiveTab] = useState('eggs'); // 'eggs' | 'mortality' | 'finance' | 'flock'

  const {
    eggTrends = [],
    mortalityTrends = [],
    financeTrends = [],
    batchPopulation = [],
  } = analytics || {};

  return (
    <Card
      title="Production & Farm Performance Analytics"
      subtitle="Actual yield metrics, health trends, and financial cashflow from local IndexedDB"
      icon={<BarChart3 size={20} />}
      action={
        <div className={styles.segmentedControl}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'eggs' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('eggs')}
          >
            Egg Yield
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'mortality' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('mortality')}
          >
            Mortality
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'finance' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            Cashflow
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'flock' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('flock')}
          >
            Flock Batches
          </button>
        </div>
      }
    >
      <div className={styles.chartViewport}>
        {/* 1. Egg Production Trends */}
        {activeTab === 'eggs' && (
          <div className={styles.chartSection}>
            <div className={styles.chartMetaRow}>
              <div>
                <h4 className={styles.chartSubheading}>Daily Egg Collection Yield</h4>
                <p className={styles.chartDescription}>
                  Tracking daily collected trays and laying consistency over time
                </p>
              </div>
              <span className={styles.recordBadge}>
                {eggTrends.length} {eggTrends.length === 1 ? 'Day Logged' : 'Days Logged'}
              </span>
            </div>

            {eggTrends.length === 0 ? (
              <div className={styles.emptyChartContainer}>
                <div className={styles.emptyIconBox}>
                  <Egg size={32} className={styles.emptyIcon} />
                </div>
                <h5 className={styles.emptyTitle}>No Egg Collections Recorded</h5>
                <p className={styles.emptyDesc}>
                  Daily collection records will populate this yield curve with laying percentages,
                  cracked counts, and Hen-Day Production (HDP) benchmarks.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectModule && onSelectModule('eggs')}
                  icon={<ArrowRight size={14} />}
                >
                  Record Today's Egg Collection
                </Button>
              </div>
            ) : (
              <div className={styles.svgChartContainer}>
                <svg viewBox="0 0 700 240" className={styles.svgElement} preserveAspectRatio="none">
                  {/* Gridlines */}
                  <line x1="40" y1="30" x2="680" y2="30" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="40" y1="90" x2="680" y2="90" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="40" y1="150" x2="680" y2="150" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="40" y1="200" x2="680" y2="200" stroke="#CBD5E1" />

                  {/* Dynamic Trend Area & Line */}
                  {(() => {
                    const maxVal = Math.max(...eggTrends.map((t) => t.count), 10);
                    const points = eggTrends.map((t, idx) => {
                      const x = 50 + (idx / Math.max(eggTrends.length - 1, 1)) * 610;
                      const y = 200 - (t.count / maxVal) * 160;
                      return { x, y, ...t };
                    });
                    const dLine = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                    const dArea = `${dLine} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;

                    return (
                      <g>
                        <defs>
                          <linearGradient id="eggGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#40916C" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#40916C" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d={dArea} fill="url(#eggGrad)" />
                        <path d={dLine} fill="none" stroke="#2D6A4F" strokeWidth="2.5" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#1B4332" strokeWidth="2" />
                            <text x={p.x} y="220" textAnchor="middle" fontSize="10" fill="#718096">
                              {p.date.slice(5)}
                            </text>
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1B4332">
                              {formatNumber(p.count)}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        )}

        {/* 2. Mortality Trends */}
        {activeTab === 'mortality' && (
          <div className={styles.chartSection}>
            <div className={styles.chartMetaRow}>
              <div>
                <h4 className={styles.chartSubheading}>Flock Mortality & Health Incidents</h4>
                <p className={styles.chartDescription}>
                  Biosecurity tracking to detect disease spikes early and safeguard flock survival
                </p>
              </div>
              <span className={styles.recordBadge}>
                {mortalityTrends.length} {mortalityTrends.length === 1 ? 'Incident Logged' : 'Incidents Logged'}
              </span>
            </div>

            {mortalityTrends.length === 0 ? (
              <div className={styles.emptyChartContainer}>
                <div className={styles.emptyIconBoxGreen}>
                  <AlertTriangle size={32} className={styles.emptyIconGreen} />
                </div>
                <h5 className={styles.emptyTitle}>Zero Mortality Recorded</h5>
                <p className={styles.emptyDesc}>
                  Flock biosecurity is nominal with no logged bird deaths. When mortality logs are recorded,
                  daily casualty counts will appear here for epidemic surveillance.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectModule && onSelectModule('mortality')}
                  icon={<ArrowRight size={14} />}
                >
                  Record Mortality Incident
                </Button>
              </div>
            ) : (
              <div className={styles.svgChartContainer}>
                <svg viewBox="0 0 700 240" className={styles.svgElement} preserveAspectRatio="none">
                  <line x1="40" y1="30" x2="680" y2="30" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="40" y1="110" x2="680" y2="110" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="40" y1="200" x2="680" y2="200" stroke="#CBD5E1" />

                  {(() => {
                    const maxVal = Math.max(...mortalityTrends.map((t) => t.count), 5);
                    const barWidth = Math.min(30, 500 / Math.max(mortalityTrends.length, 1));
                    return mortalityTrends.map((t, idx) => {
                      const x = 60 + (idx / Math.max(mortalityTrends.length - 1, 1)) * 580 - barWidth / 2;
                      const h = (t.count / maxVal) * 160;
                      const y = 200 - h;
                      return (
                        <g key={idx}>
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={h}
                            rx="3"
                            fill="#DC2626"
                            opacity="0.85"
                          />
                          <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#DC2626">
                            {t.count}
                          </text>
                          <text x={x + barWidth / 2} y="218" textAnchor="middle" fontSize="10" fill="#718096">
                            {t.date.slice(5)}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
            )}
          </div>
        )}

        {/* 3. Sales & Expenses Cashflow */}
        {activeTab === 'finance' && (
          <div className={styles.chartSection}>
            <div className={styles.chartMetaRow}>
              <div>
                <h4 className={styles.chartSubheading}>Farm Cashflow: Sales vs. Expenses</h4>
                <p className={styles.chartDescription}>
                  Monthly revenue breakdown comparing produce income against operational expenditures
                </p>
              </div>
              <div className={styles.legendGroup}>
                <span className={styles.legendSales}>
                  <span className={styles.legendDotSales} /> Sales Revenue
                </span>
                <span className={styles.legendExpenses}>
                  <span className={styles.legendDotExpenses} /> Expenses
                </span>
              </div>
            </div>

            {financeTrends.length === 0 ? (
              <div className={styles.emptyChartContainer}>
                <div className={styles.emptyIconBox}>
                  <TrendingUp size={32} className={styles.emptyIcon} />
                </div>
                <h5 className={styles.emptyTitle}>No Financial Transactions Recorded</h5>
                <p className={styles.emptyDesc}>
                  Enter sales invoices and operational farm expenses (feed purchases, wages, utility costs)
                  to monitor gross profit margin and monthly cashflow.
                </p>
                <div className={styles.emptyActionRow}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectModule && onSelectModule('sales')}
                  >
                    Add Farm Sale
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectModule && onSelectModule('expenses')}
                  >
                    Add Expense
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.svgChartContainer}>
                <svg viewBox="0 0 700 240" className={styles.svgElement} preserveAspectRatio="none">
                  <line x1="40" y1="40" x2="680" y2="40" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="40" y1="120" x2="680" y2="120" stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="40" y1="200" x2="680" y2="200" stroke="#CBD5E1" />

                  {(() => {
                    const maxVal = Math.max(
                      ...financeTrends.map((f) => Math.max(f.sales, f.expenses)),
                      100
                    );
                    const groupWidth = 600 / Math.max(financeTrends.length, 1);
                    return financeTrends.map((f, idx) => {
                      const cx = 70 + idx * groupWidth;
                      const hSale = (f.sales / maxVal) * 150;
                      const hExp = (f.expenses / maxVal) * 150;
                      return (
                        <g key={idx}>
                          <rect
                            x={cx - 16}
                            y={200 - hSale}
                            width="14"
                            height={hSale}
                            rx="3"
                            fill="#1B4332"
                          />
                          <rect
                            x={cx + 2}
                            y={200 - hExp}
                            width="14"
                            height={hExp}
                            rx="3"
                            fill="#D97706"
                          />
                          <text x={cx} y="218" textAnchor="middle" fontSize="10" fill="#718096">
                            {f.date}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
            )}
          </div>
        )}

        {/* 4. Bird Population by Batch */}
        {activeTab === 'flock' && (
          <div className={styles.chartSection}>
            <div className={styles.chartMetaRow}>
              <div>
                <h4 className={styles.chartSubheading}>Flock Population by Batch Cohort</h4>
                <p className={styles.chartDescription}>
                  Active flock distribution across housing units and rearing stages
                </p>
              </div>
              <span className={styles.recordBadge}>
                {batchPopulation.length} {batchPopulation.length === 1 ? 'Batch' : 'Batches'}
              </span>
            </div>

            {batchPopulation.length === 0 ? (
              <div className={styles.emptyChartContainer}>
                <div className={styles.emptyIconBox}>
                  <Layers size={32} className={styles.emptyIcon} />
                </div>
                <h5 className={styles.emptyTitle}>No Active Batches Created</h5>
                <p className={styles.emptyDesc}>
                  Set up your first bird batch (e.g. Day-Old Broilers, Pullets, or Layers)
                  to begin tracking flock growth curves, feeding schedules, and pen density.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectModule && onSelectModule('batches')}
                  icon={<ArrowRight size={14} />}
                >
                  Create First Batch
                </Button>
              </div>
            ) : (
              <div className={styles.batchList}>
                {batchPopulation.map((batch, idx) => (
                  <div key={idx} className={styles.batchRow}>
                    <div className={styles.batchInfo}>
                      <span className={styles.batchCode}>{batch.batchCode}</span>
                      <span className={styles.batchBreed}>{batch.breed}</span>
                    </div>
                    <div className={styles.batchBarWrapper}>
                      <div
                        className={styles.batchBarFill}
                        style={{
                          width: `${Math.min(100, Math.max(10, (batch.currentCount / 1000) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className={styles.batchCountBox}>
                      <span className={styles.batchCount}>{formatNumber(batch.currentCount)}</span>
                      <span className={styles.batchStatus}>{batch.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
