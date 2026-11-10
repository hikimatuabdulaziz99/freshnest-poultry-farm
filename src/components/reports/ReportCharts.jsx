import { useState } from 'react';
import {
  TrendingUp,
  Egg,
  AlertTriangle,
  Wheat,
  PieChart,
  ShoppingBag,
  Receipt,
  Boxes,
  Inbox,
} from 'lucide-react';
import { formatNaira } from '../../services/reportsService.js';
import styles from './ReportCharts.module.css';

export function ReportCharts({ chartsData }) {
  const [activeChartTab, setActiveChartTab] = useState('finance'); // 'finance' | 'eggs' | 'mortality' | 'feed' | 'birds' | 'salesCat' | 'expCat' | 'invCat'

  const {
    financeTrends = [],
    eggTrends = [],
    mortalityTrends = [],
    feedTrends = [],
    birdDistribution = [],
    revenueByCategory = [],
    expensesByCategory = [],
    inventoryByCategory = [],
  } = chartsData || {};

  const chartTabs = [
    { id: 'finance', label: 'Sales vs Expenses', icon: TrendingUp },
    { id: 'eggs', label: 'Egg Production', icon: Egg },
    { id: 'mortality', label: 'Mortality Trend', icon: AlertTriangle },
    { id: 'feed', label: 'Feed Consumption', icon: Wheat },
    { id: 'birds', label: 'Flock Composition', icon: PieChart },
    { id: 'salesCat', label: 'Revenue by Product', icon: ShoppingBag },
    { id: 'expCat', label: 'Expenses by Category', icon: Receipt },
    { id: 'invCat', label: 'Inventory by Category', icon: Boxes },
  ];

  // Helper for rendering line / bar trends
  const renderEmptyState = (title, message) => (
    <div className={styles.emptyChart}>
      <Inbox size={32} className={styles.emptyIcon} />
      <h4 className={styles.emptyTitle}>{title}</h4>
      <p className={styles.emptyDesc}>{message}</p>
    </div>
  );

  return (
    <div className={styles.chartsWrapper}>
      {/* Chart Selector Tabs */}
      <div className={styles.chartTabBar}>
        {chartTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeChartTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.chartTabBtn} ${isActive ? styles.chartTabBtnActive : ''}`}
              onClick={() => setActiveChartTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.chartCard}>
        {/* 1. Sales vs Expenses Trend */}
        {activeChartTab === 'finance' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Sales Revenue vs Operational Expenses</h3>
                <p className={styles.chartSubtitle}>
                  Comparison of invoiced sales and incurred expenses over the selected period
                </p>
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendItem}>
                  <span className={styles.legendColorSales} /> Sales Revenue
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendColorExpenses} /> Expenses Incurred
                </span>
              </div>
            </div>

            {financeTrends.length === 0 ? (
              renderEmptyState('No Financial Transactions in Selected Period', 'Sales or expense transactions logged within this date range will display here.')
            ) : (
              <div className={styles.svgContainer}>
                {(() => {
                  const maxVal = Math.max(
                    1,
                    ...financeTrends.map((d) => Math.max(d.sales || 0, d.expenses || 0))
                  );
                  const height = 200;
                  const barWidth = Math.min(24, Math.max(8, 500 / (financeTrends.length * 2.5)));

                  return (
                    <div className={styles.barChartScroll}>
                      <div className={styles.barsContainer}>
                        {financeTrends.map((item, idx) => {
                          const salesH = Math.round(((item.sales || 0) / maxVal) * height);
                          const expH = Math.round(((item.expenses || 0) / maxVal) * height);

                          return (
                            <div key={idx} className={styles.barGroup}>
                              <div className={styles.barPair} style={{ height: `${height}px` }}>
                                <div
                                  className={styles.barSales}
                                  style={{ height: `${salesH}px`, width: `${barWidth}px` }}
                                  title={`Date: ${item.date}\nSales: ${formatNaira(item.sales)}`}
                                />
                                <div
                                  className={styles.barExpenses}
                                  style={{ height: `${expH}px`, width: `${barWidth}px` }}
                                  title={`Date: ${item.date}\nExpenses: ${formatNaira(item.expenses)}`}
                                />
                              </div>
                              <span className={styles.barLabel}>{item.date.slice(5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 2. Egg Production Trend */}
        {activeChartTab === 'eggs' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Daily Egg Production Yield</h3>
                <p className={styles.chartSubtitle}>Total daily eggs collected across laying cohorts</p>
              </div>
            </div>

            {eggTrends.length === 0 ? (
              renderEmptyState('No Egg Collection Records', 'Record egg collection logs in the Egg Production module to see yield curves.')
            ) : (
              <div className={styles.svgContainer}>
                {(() => {
                  const maxEggs = Math.max(1, ...eggTrends.map((d) => d.count || 0));
                  const height = 180;
                  const width = 650;
                  const points = eggTrends.map((d, i) => {
                    const x = eggTrends.length === 1 ? width / 2 : (i / (eggTrends.length - 1)) * (width - 40) + 20;
                    const y = height - ((d.count || 0) / maxEggs) * (height - 30) - 10;
                    return { x, y, count: d.count, date: d.date };
                  });

                  const pointsPath = points.map((p) => `${p.x},${p.y}`).join(' ');

                  return (
                    <svg viewBox={`0 0 ${width} ${height + 30}`} className={styles.svgElement}>
                      {/* Grid lines */}
                      <line x1="20" y1="20" x2={width - 20} y2="20" stroke="#E2E8F0" strokeDasharray="3 3" />
                      <line x1="20" y1={height / 2} x2={width - 20} y2={height / 2} stroke="#E2E8F0" strokeDasharray="3 3" />
                      <line x1="20" y1={height} x2={width - 20} y2={height} stroke="#CBD5E0" />

                      {/* Area Fill */}
                      {points.length > 1 && (
                        <polygon
                          points={`20,${height} ${pointsPath} ${width - 20},${height}`}
                          fill="rgba(116, 198, 157, 0.25)"
                        />
                      )}

                      {/* Line */}
                      <polyline
                        points={pointsPath}
                        fill="none"
                        stroke="#1B4332"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data Dots */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="5" fill="#40916C" stroke="#FFFFFF" strokeWidth="2" />
                          <text x={p.x} y={height + 20} textAnchor="middle" fontSize="10" fill="#4A5568">
                            {p.date.slice(5)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 3. Mortality Trend */}
        {activeChartTab === 'mortality' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Flock Mortality & Loss Trend</h3>
                <p className={styles.chartSubtitle}>Recorded bird deaths over time for health monitoring</p>
              </div>
            </div>

            {mortalityTrends.length === 0 ? (
              renderEmptyState('Zero Mortalities Recorded', 'No bird deaths were logged in the selected period. Excellent biosecurity status!')
            ) : (
              <div className={styles.svgContainer}>
                {(() => {
                  const maxDeaths = Math.max(1, ...mortalityTrends.map((d) => d.count || 0));
                  const height = 180;
                  return (
                    <div className={styles.barsContainer}>
                      {mortalityTrends.map((item, idx) => {
                        const barH = Math.round(((item.count || 0) / maxDeaths) * height);
                        return (
                          <div key={idx} className={styles.barGroup}>
                            <div className={styles.barPair} style={{ height: `${height}px` }}>
                              <div
                                className={styles.barMortality}
                                style={{ height: `${barH}px`, width: '20px' }}
                                title={`Date: ${item.date}\nDeaths: ${item.count}`}
                              />
                            </div>
                            <span className={styles.barLabel}>{item.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 4. Feed Consumption Trend */}
        {activeChartTab === 'feed' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Daily Feed Distribution (kg)</h3>
                <p className={styles.chartSubtitle}>Rations distributed to active flock pens</p>
              </div>
            </div>

            {feedTrends.length === 0 ? (
              renderEmptyState('No Feeding Logs Found', 'Log daily feed rations in the Feed Management module to see consumption trends.')
            ) : (
              <div className={styles.svgContainer}>
                {(() => {
                  const maxKg = Math.max(1, ...feedTrends.map((d) => d.kg || 0));
                  const height = 180;
                  return (
                    <div className={styles.barsContainer}>
                      {feedTrends.map((item, idx) => {
                        const barH = Math.round(((item.kg || 0) / maxKg) * height);
                        return (
                          <div key={idx} className={styles.barGroup}>
                            <div className={styles.barPair} style={{ height: `${height}px` }}>
                              <div
                                className={styles.barFeed}
                                style={{ height: `${barH}px`, width: '20px' }}
                                title={`Date: ${item.date}\nFeed: ${item.kg} kg`}
                              />
                            </div>
                            <span className={styles.barLabel}>{item.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 5. Bird Flock Composition */}
        {activeChartTab === 'birds' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Bird Flock Distribution by Breed</h3>
                <p className={styles.chartSubtitle}>Breakdown of individual tagged birds across breeds</p>
              </div>
            </div>

            {birdDistribution.length === 0 ? (
              renderEmptyState('No Registered Birds', 'Register breeder stock or individual tagged birds to see flock composition.')
            ) : (
              <div className={styles.distributionList}>
                {(() => {
                  const total = birdDistribution.reduce((sum, b) => sum + (b.count || 0), 0);
                  return birdDistribution.map((item, idx) => {
                    const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                    return (
                      <div key={idx} className={styles.distRow}>
                        <div className={styles.distMeta}>
                          <span className={styles.distName}>{item.type}</span>
                          <span className={styles.distValue}>{item.count} birds ({pct}%)</span>
                        </div>
                        <div className={styles.distTrack}>
                          <div
                            className={styles.distFill}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: idx % 2 === 0 ? '#1B4332' : '#40916C',
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* 6. Revenue by Product Category */}
        {activeChartTab === 'salesCat' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Revenue Breakdown by Product</h3>
                <p className={styles.chartSubtitle}>Invoiced sales across live birds, table eggs, and farm produce</p>
              </div>
            </div>

            {revenueByCategory.length === 0 ? (
              renderEmptyState('No Sales Recorded', 'Completed sales within the selected period will appear categorized here.')
            ) : (
              <div className={styles.distributionList}>
                {(() => {
                  const total = revenueByCategory.reduce((sum, c) => sum + (c.amount || 0), 0);
                  return revenueByCategory.map((item, idx) => {
                    const pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
                    return (
                      <div key={idx} className={styles.distRow}>
                        <div className={styles.distMeta}>
                          <span className={styles.distName}>{item.category}</span>
                          <span className={styles.distValue}>{formatNaira(item.amount)} ({pct}%)</span>
                        </div>
                        <div className={styles.distTrack}>
                          <div
                            className={styles.distFill}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: idx % 2 === 0 ? '#40916C' : '#74C69D',
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* 7. Expenses by Category */}
        {activeChartTab === 'expCat' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>Operational Expenses by Category</h3>
                <p className={styles.chartSubtitle}>Breakdown of operating expenditure and supply costs</p>
              </div>
            </div>

            {expensesByCategory.length === 0 ? (
              renderEmptyState('No Expenses Incurred', 'No operating expenses logged in this date range.')
            ) : (
              <div className={styles.distributionList}>
                {(() => {
                  const total = expensesByCategory.reduce((sum, c) => sum + (c.amount || 0), 0);
                  return expensesByCategory.map((item, idx) => {
                    const pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
                    return (
                      <div key={idx} className={styles.distRow}>
                        <div className={styles.distMeta}>
                          <span className={styles.distName}>{item.category}</span>
                          <span className={styles.distValue}>{formatNaira(item.amount)} ({pct}%)</span>
                        </div>
                        <div className={styles.distTrack}>
                          <div
                            className={styles.distFill}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: idx % 2 === 0 ? '#C53030' : '#E53E3E',
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* 8. Inventory Value by Category */}
        {activeChartTab === 'invCat' && (
          <div className={styles.chartContent}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.chartTitle}>General Supplies Inventory Valuation</h3>
                <p className={styles.chartSubtitle}>Current estimated monetary value of supplies and tools</p>
              </div>
            </div>

            {inventoryByCategory.length === 0 ? (
              renderEmptyState('Inventory Catalog Empty', 'Register general farm supplies to monitor category valuations.')
            ) : (
              <div className={styles.distributionList}>
                {(() => {
                  const total = inventoryByCategory.reduce((sum, c) => sum + (c.amount || 0), 0);
                  return inventoryByCategory.map((item, idx) => {
                    const pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
                    return (
                      <div key={idx} className={styles.distRow}>
                        <div className={styles.distMeta}>
                          <span className={styles.distName}>{item.category}</span>
                          <span className={styles.distValue}>{formatNaira(item.amount)} ({pct}%)</span>
                        </div>
                        <div className={styles.distTrack}>
                          <div
                            className={styles.distFill}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: idx % 2 === 0 ? '#1B4332' : '#40916C',
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
