import {
  Wheat,
  Pill,
  Syringe,
  Egg,
  ExternalLink,
} from 'lucide-react';
import styles from './SpecializedInventoriesCard.module.css';

export function SpecializedInventoriesCard({ specializedSummary, onNavigateModule }) {
  if (!specializedSummary) return null;

  const { feeds, medications, vaccines, eggs } = specializedSummary;

  return (
    <div className={styles.container}>
      <div className={styles.noticeBanner}>
        <strong>Specialized Inventory Isolation & Biosecurity Protocol:</strong>
        <p style={{ margin: '0.25rem 0 0' }}>
          To maintain strict bio-safety, nutritional formulas, and withdrawal period tracking, specialized livestock inventories
          are managed exclusively within their dedicated modules. The summaries below are read-only references to prevent duplicate counting
          and stock confusion.
        </p>
      </div>

      <div className={styles.cardsGrid}>
        {/* 1. Feeds */}
        <div className={styles.specialCard}>
          <div>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconBox} ${styles.iconGreen}`}>
                <Wheat size={22} />
              </div>
              <span className={styles.moduleBadge}>Module 05</span>
            </div>
            <h4 className={styles.cardTitle}>Feed Inventory</h4>
            <p className={styles.cardDesc}>Flock rations, mash, pellets & premixes</p>
          </div>

          <div className={styles.statsList}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Feed Formulas Catalog:</span>
              <span className={styles.statValue}>{feeds.count} products</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Stock on Hand:</span>
              <span className={styles.statValue}>{feeds.totalStockKg.toLocaleString()} kg</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Low Stock Formulas:</span>
              <span className={styles.statValue} style={{ color: feeds.lowStockCount > 0 ? '#b45309' : '#1b4332' }}>
                {feeds.lowStockCount} items
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => onNavigateModule && onNavigateModule('feed')}
          >
            Open Feed Management <ExternalLink size={13} />
          </button>
        </div>

        {/* 2. Medications */}
        <div className={styles.specialCard}>
          <div>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconBox} ${styles.iconBlue}`}>
                <Pill size={22} />
              </div>
              <span className={styles.moduleBadge}>Module 06</span>
            </div>
            <h4 className={styles.cardTitle}>Medication Inventory</h4>
            <p className={styles.cardDesc}>Antibiotics, vitamins & pharmacy items</p>
          </div>

          <div className={styles.statsList}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Pharmacy Drugs:</span>
              <span className={styles.statValue}>{medications.count} products</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Stock Units:</span>
              <span className={styles.statValue}>{medications.totalStockUnits.toLocaleString()} units</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Withdrawal Periods:</span>
              <span className={styles.statValue}>Enforced</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => onNavigateModule && onNavigateModule('medication')}
          >
            Open Medication Management <ExternalLink size={13} />
          </button>
        </div>

        {/* 3. Vaccines */}
        <div className={styles.specialCard}>
          <div>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconBox} ${styles.iconPurple}`}>
                <Syringe size={22} />
              </div>
              <span className={styles.moduleBadge}>Module 07</span>
            </div>
            <h4 className={styles.cardTitle}>Vaccine Cold Chain</h4>
            <p className={styles.cardDesc}>Biological immunizations & schedules</p>
          </div>

          <div className={styles.statsList}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Registered Vaccines:</span>
              <span className={styles.statValue}>{vaccines.count} vaccines</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Available Doses:</span>
              <span className={styles.statValue}>{vaccines.totalDoses.toLocaleString()} doses</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Cold Chain Integrity:</span>
              <span className={styles.statValue} style={{ color: '#1b4332' }}>Monitored</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => onNavigateModule && onNavigateModule('vaccination')}
          >
            Open Vaccination Management <ExternalLink size={13} />
          </button>
        </div>

        {/* 4. Eggs */}
        <div className={styles.specialCard}>
          <div>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconBox} ${styles.iconAmber}`}>
                <Egg size={22} />
              </div>
              <span className={styles.moduleBadge}>Module 08</span>
            </div>
            <h4 className={styles.cardTitle}>Egg Inventory</h4>
            <p className={styles.cardDesc}>Graded table eggs & crates on hand</p>
          </div>

          <div className={styles.statsList}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Table Eggs:</span>
              <span className={styles.statValue}>{eggs.totalEggs.toLocaleString()} eggs</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Full Crates (30s):</span>
              <span className={styles.statValue}>{eggs.crates.toLocaleString()} crates</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Loose Eggs:</span>
              <span className={styles.statValue}>{eggs.loose} eggs</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => onNavigateModule && onNavigateModule('eggs')}
          >
            Open Egg Production <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
