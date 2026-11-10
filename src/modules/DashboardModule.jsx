import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Database,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { StatCardsGrid } from '../components/dashboard/StatCardsGrid.jsx';
import { ProductionCharts } from '../components/dashboard/ProductionCharts.jsx';
import { QuickActions } from '../components/dashboard/QuickActions.jsx';
import { RecentActivities } from '../components/dashboard/RecentActivities.jsx';
import { FarmAlerts } from '../components/dashboard/FarmAlerts.jsx';
import { Button } from '../components/common/Button.jsx';
import { dbService } from '../services/dbService.js';
import { APP_INFO } from '../utils/constants.js';
import styles from './DashboardModule.module.css';

export function DashboardModule({
  dbStatus,
  onSelectModule,
  onRefreshDb,
}) {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all dashboard metrics dynamically from IndexedDB
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, analyticsData, activitiesData, alertsData] = await Promise.all([
        dbService.getDashboardStats(),
        dbService.getProductionAnalytics(),
        dbService.getRecentActivities(8),
        dbService.getAlertsAndReminders(),
      ]);

      setStats(statsData);
      setAnalytics(analyticsData);
      setActivities(activitiesData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, dbStatus]);

  const handleRefresh = async () => {
    if (onRefreshDb) await onRefreshDb();
    await loadDashboardData();
  };

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className={styles.dashboardContainer}>
      {/* 1. Dashboard Welcome & Overview Header */}
      <div className={styles.welcomeBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerBadgeRow}>
            <span className={styles.farmPill}>{APP_INFO.name}</span>
            <span className={styles.dateText}>
              <Calendar size={13} className={styles.dateIcon} />
              {todayFormatted}
            </span>
          </div>

          <h2 className={styles.welcomeTitle}>Welcome to FreshNest Poultry Farm</h2>
          <p className={styles.welcomeTagline}>{APP_INFO.tagline}</p>
          <p className={styles.welcomeDesc}>
            Central management console monitoring live flock health, daily egg production,
            feed rations, veterinary withdrawal compliance, and farm finances.
          </p>

          <div className={styles.systemMetadataStrip}>
            <div className={styles.metaItem}>
              <Database size={14} className={styles.metaIcon} />
              <span>Offline Database: {dbStatus?.isReady ? 'Dexie IndexedDB Connected' : 'Connecting...'}</span>
            </div>
            <span className={styles.metaDivider}>·</span>
            <div className={styles.metaItem}>
              <ShieldCheck size={14} className={styles.metaIcon} />
              <span>Biosecurity Status: Normal</span>
            </div>
            <span className={styles.metaDivider}>·</span>
            <div className={styles.metaItem}>
              <User size={14} className={styles.metaIcon} />
              <span>Role: Farm Administrator</span>
            </div>
          </div>
        </div>

        <div className={styles.bannerRight}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className={styles.refreshBtn}
            icon={<RefreshCw size={14} className={isLoading ? styles.spinning : ''} />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* 2. 10 Statistics Cards Grid */}
      <section aria-label="Key Performance Statistics">
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionHeading}>Farm Performance Metrics</h3>
          <span className={styles.sectionSubtitle}>
            Live values aggregated dynamically from {dbStatus?.tableCounts ? Object.keys(dbStatus.tableCounts).length : 14} local database tables
          </span>
        </div>
        <StatCardsGrid stats={stats} onSelectModule={onSelectModule} />
      </section>

      {/* 3. Production Analytics Charts */}
      <section aria-label="Production Analytics">
        <ProductionCharts analytics={analytics} onSelectModule={onSelectModule} />
      </section>

      {/* 4. Quick Actions */}
      <section aria-label="Quick Farm Actions">
        <QuickActions onSelectModule={onSelectModule} />
      </section>

      {/* 5. Alerts & Activities Two-Column Split */}
      <div className={styles.twoColumnSection}>
        {/* Alerts and Reminders */}
        <div className={styles.columnItem}>
          <FarmAlerts alerts={alerts} onSelectModule={onSelectModule} />
        </div>

        {/* Recent Farm Activities */}
        <div className={styles.columnItem}>
          <RecentActivities activities={activities} onSelectModule={onSelectModule} />
        </div>
      </div>
    </div>
  );
}
