import {
  Database,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import styles from './ModulePlaceholder.module.css';

/**
 * ModulePlaceholder
 * Foundation container displayed for modules scheduled in subsequent implementation phases.
 * Provides clear schema readiness, table mapping, and technical specs without fake data.
 */
export function ModulePlaceholder({ module, dbStatus, onNavigateToDashboard }) {
  if (!module) return null;

  return (
    <div className={styles.placeholderContainer}>
      {/* Module Overview Banner */}
      <Card className={styles.heroCard}>
        <div className={styles.heroContent}>
          <div className={styles.titleBadgeRow}>
            <Badge variant="primary" size="md">
              {module.category}
            </Badge>
            <Badge variant="accent" size="md" dot>
              Foundation Architecture Ready
            </Badge>
          </div>

          <h2 className={styles.moduleTitle}>{module.label}</h2>
          <p className={styles.moduleDescription}>{module.description}</p>

          <div className={styles.architecturePill}>
            <ShieldCheck size={16} className={styles.archIcon} />
            <span>IndexedDB Schema V1 Provisioned — Ready for Module Logic</span>
          </div>
        </div>
      </Card>

      <div className={styles.twoColumnGrid}>
        {/* Scheduled Capabilities */}
        <Card
          title="Planned Capabilities"
          subtitle="Feature requirements prepared for this module"
          icon={<Sparkles size={20} />}
        >
          <ul className={styles.featureList}>
            {module.futureCapabilities?.map((cap, idx) => (
              <li key={idx} className={styles.featureItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Database Foundation & Table Mapping */}
        <Card
          title="Associated Database Tables"
          subtitle="IndexedDB stores defined in Dexie.js Schema V1"
          icon={<Database size={20} />}
        >
          <div className={styles.tableList}>
            {module.associatedTables?.map((tableName) => {
              const recordCount = dbStatus?.tableCounts?.[tableName] ?? 0;
              return (
                <div key={tableName} className={styles.tableItem}>
                  <div className={styles.tableInfo}>
                    <Layers size={16} className={styles.tableIcon} />
                    <div>
                      <span className={styles.tableName}>{tableName}</span>
                      <span className={styles.tableEngine}>Dexie IndexedDB Store</span>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {recordCount} Records (Clean)
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className={styles.dbNote}>
            <p>
              Schema keys and indexes are pre-compiled in <code>src/database/schema.js</code>.
              Data integrity is strictly maintained offline.
            </p>
          </div>
        </Card>
      </div>

      {/* Navigation Return */}
      <div className={styles.bottomBar}>
        <Button
          variant="outline"
          size="md"
          onClick={onNavigateToDashboard}
          icon={<ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />}
        >
          Return to Foundation Dashboard
        </Button>
      </div>
    </div>
  );
}
