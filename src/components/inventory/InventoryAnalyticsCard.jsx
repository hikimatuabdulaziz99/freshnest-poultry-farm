import {
  PieChart,
  Warehouse,
} from 'lucide-react';
import { formatNaira } from '../../services/inventoryService.js';
import styles from './InventoryAnalyticsCard.module.css';

export function InventoryAnalyticsCard({ stats }) {
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const locationBreakdown = stats?.locationBreakdown || [];

  return (
    <div className={styles.analyticsContainer}>
      {/* 1. Category Valuation Breakdown */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <PieChart size={18} color="#1b4332" />
              Stock Valuation by Category
            </h4>
            <span className={styles.cardSubtitle}>
              Monetary distribution across supply classifications
            </span>
          </div>
        </div>

        <div className={styles.breakdownList}>
          {categoryBreakdown.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#718096', margin: '2rem 0' }}>
              No inventory catalog data available
            </p>
          ) : (
            categoryBreakdown.map((item) => (
              <div key={item.category} className={styles.breakdownItem}>
                <div className={styles.breakdownHeader}>
                  <span className={styles.breakdownLabel}>
                    {item.category}
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                      ({item.itemCount} {item.itemCount === 1 ? 'item' : 'items'} · {item.unitsCount} units)
                    </span>
                  </span>
                  <span className={styles.breakdownValue}>
                    {formatNaira(item.valuation)} ({item.percentage}%)
                  </span>
                </div>
                <div className={styles.progressBarBg}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Storage Location Distribution */}
      <div className={styles.analyticsCard}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <Warehouse size={18} color="#1b4332" />
              Storehouse & Warehouse Distribution
            </h4>
            <span className={styles.cardSubtitle}>
              Supply allocation across physical farm facilities
            </span>
          </div>
        </div>

        <div className={styles.locationsGrid}>
          {locationBreakdown.length === 0 ? (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#718096', margin: '2rem 0' }}>
              No location data recorded
            </p>
          ) : (
            locationBreakdown.map((loc) => (
              <div key={loc.location} className={styles.locationTile}>
                <span className={styles.locName}>{loc.location}</span>
                <span className={styles.locStats}>
                  <strong>{loc.itemCount}</strong> {loc.itemCount === 1 ? 'catalog item' : 'catalog items'}
                </span>
                <span className={styles.locStats}>
                  <strong>{loc.unitsCount.toLocaleString()}</strong> total units in storage
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
