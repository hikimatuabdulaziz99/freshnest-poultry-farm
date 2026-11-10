import {
  Boxes,
  AlertTriangle,
  Layers,
  Banknote,
} from 'lucide-react';
import { formatNaira } from '../../services/inventoryService.js';
import styles from './InventoryStatCards.module.css';

export function InventoryStatCards({ stats }) {
  const totalItems = stats?.totalItems || 0;
  const totalUnits = stats?.totalStockUnits || 0;
  const valuation = stats?.estimatedTotalValuation || 0;
  const lowStock = stats?.lowStockCount || 0;
  const outOfStock = stats?.outOfStockCount || 0;
  const expired = stats?.expiredCount || 0;
  const criticalCount = lowStock + outOfStock + expired;

  return (
    <div className={styles.statsGrid}>
      {/* 1. Total Estimated Valuation */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Estimated Valuation</span>
          <h3 className={styles.statValue}>{formatNaira(valuation)}</h3>
          <span className={styles.statSubtext}>
            Total inventory asset value
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconForest}`}>
          <Banknote size={24} />
        </div>
      </div>

      {/* 2. Total Supplies Stock Units */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Total Stock Units</span>
          <h3 className={styles.statValue}>{totalUnits.toLocaleString()}</h3>
          <span className={styles.statSubtext}>
            Across all general farm stores
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconFresh}`}>
          <Boxes size={24} />
        </div>
      </div>

      {/* 3. Catalog Item Varieties */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Active Catalog Items</span>
          <h3 className={styles.statValue}>{totalItems.toLocaleString()}</h3>
          <span className={styles.statSubtext}>
            Supplies, tools, packaging & equipment
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconBlue}`}>
          <Layers size={24} />
        </div>
      </div>

      {/* 4. Attention Required / Alerts */}
      <div className={styles.statCard}>
        <div className={styles.statInfo}>
          <span className={styles.statLabel}>Attention Needed</span>
          <h3
            className={styles.statValue}
            style={{ color: criticalCount > 0 ? '#b45309' : '#1a202c' }}
          >
            {criticalCount}
          </h3>
          <span className={styles.statSubtext}>
            {outOfStock > 0
              ? `${outOfStock} out of stock · ${lowStock} low`
              : lowStock > 0
              ? `${lowStock} below reorder level`
              : 'All stocks at healthy levels'}
          </span>
        </div>
        <div className={`${styles.iconBox} ${styles.iconAmber}`}>
          <AlertTriangle size={24} />
        </div>
      </div>
    </div>
  );
}
