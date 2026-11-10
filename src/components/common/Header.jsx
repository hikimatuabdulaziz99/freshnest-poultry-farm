import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Database,
  RefreshCw,
  Download,
  CheckCircle2,
  Bell,
  Calendar,
  AlertTriangle,
  Info,
  LogOut,
} from 'lucide-react';
import { Button } from './Button.jsx';
import { PWAInstallButton } from './PWAInstallButton.jsx';
import { dbService } from '../../services/dbService.js';
import styles from './Header.module.css';

export function Header({
  activeModule,
  dbStatus,
  onOpenMobileMenu,
  onRefreshDb,
  onSelectModule,
  admin,
  onOpenProfile,
  onLogout,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const popoverRef = useRef(null);

  // Today's formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Load real database alerts
  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await dbService.getAlertsAndReminders();
        setAlerts(data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    loadAlerts();
  }, [dbStatus]);

  // Close notifications popover on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportBackup = async () => {
    try {
      const backup = await dbService.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `freshnest-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export backup:', err);
    }
  };

  return (
    <header className={styles.header}>
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className={styles.leftSection}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
        >
          <Menu size={22} />
        </button>

        <div className={styles.brandBreadcrumb}>
          <div className={styles.farmNameTag}>FreshNest Poultry Farm</div>
          <div className={styles.breadcrumbTrail}>
            <span className={styles.categoryBadge}>{activeModule?.category || 'Farm'}</span>
            <span className={styles.divider}>/</span>
            <h1 className={styles.pageTitle}>{activeModule?.label || 'Dashboard'}</h1>
          </div>
        </div>
      </div>

      {/* Center: Live Date & Farm Presence */}
      <div className={styles.centerSection}>
        <div className={styles.dateBadge}>
          <Calendar size={14} className={styles.calendarIcon} />
          <span>{todayFormatted}</span>
        </div>
      </div>

      {/* Right: Offline status, Notifications, User profile */}
      <div className={styles.rightSection}>
        {/* Offline-First & Database Status */}
        <div className={styles.statusPillGroup}>
          <div
            className={styles.dbBadge}
            title={
              dbStatus?.isReady
                ? `Dexie DB v${dbStatus.version} active. Storage: ${dbStatus.storageEstimate?.usageMb || 0} MB used`
                : 'Connecting to local database...'
            }
          >
            <Database size={14} className={styles.dbIcon} />
            <span className={styles.dbStatusText}>
              {dbStatus?.isReady ? 'IndexedDB Ready' : 'DB Initializing...'}
            </span>
            {dbStatus?.isReady && (
              <CheckCircle2 size={13} className={styles.checkIcon} />
            )}
          </div>
        </div>

        {/* Database Quick Actions & PWA Install */}
        <div className={styles.actionGroup}>
          <PWAInstallButton variant="compact" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshDb}
            title="Refresh database state"
            icon={<RefreshCw size={14} />}
          >
            Check DB
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            title="Export full offline database backup"
            icon={<Download size={14} />}
          >
            Backup
          </Button>
        </div>

        {/* Notification Bell with Dropdown Popover */}
        <div className={styles.notificationWrapper} ref={popoverRef}>
          <button
            type="button"
            className={`${styles.iconButton} ${notificationsOpen ? styles.iconButtonActive : ''}`}
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label="Farm notifications"
            title="Farm Alerts & Reminders"
          >
            <Bell size={18} />
            {alerts.length > 0 && (
              <span className={styles.notificationCount}>{alerts.length}</span>
            )}
          </button>

          {/* Interactive Notifications Popover */}
          {notificationsOpen && (
            <div className={styles.notificationDropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownTitleGroup}>
                  <h4 className={styles.dropdownTitle}>Farm Notifications</h4>
                  <span className={styles.dropdownSubtitle}>
                    {alerts.length} active {alerts.length === 1 ? 'alert' : 'alerts'}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.refreshAlertsBtn}
                  onClick={async () => {
                    const data = await dbService.getAlertsAndReminders();
                    setAlerts(data);
                  }}
                  title="Refresh alerts"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className={styles.notificationList}>
                {alerts.length === 0 ? (
                  <div className={styles.emptyNotifications}>
                    <CheckCircle2 size={28} className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>All Schedules Clear</p>
                    <p className={styles.emptyDesc}>
                      No stock shortages, expired medications, or critical deadlines detected.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`${styles.alertItem} ${styles[alert.severity] || styles.warning}`}
                      onClick={() => {
                        if (onSelectModule && alert.module) {
                          onSelectModule(alert.module);
                          setNotificationsOpen(false);
                        }
                      }}
                    >
                      <div className={styles.alertIconWrapper}>
                        {alert.severity === 'danger' ? (
                          <AlertTriangle size={15} />
                        ) : (
                          <Info size={15} />
                        )}
                      </div>
                      <div className={styles.alertContent}>
                        <h5 className={styles.alertItemTitle}>{alert.title}</h5>
                        <p className={styles.alertItemMessage}>{alert.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area (Clickable to open Admin Profile & Security) */}
        <div
          className={styles.userProfileArea}
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onOpenProfile && onOpenProfile();
            }
          }}
          title="Click to view Administrator Profile & Security"
        >
          <div className={styles.avatar}>
            <span>{admin?.fullName ? admin.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'FA'}</span>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{admin?.fullName || 'Farm Administrator'}</span>
            <span className={styles.userRole}>Farm Administrator</span>
          </div>
        </div>

        {/* Direct Logout Action */}
        {onLogout && (
          <button
            type="button"
            className={styles.headerLogoutBtn}
            onClick={onLogout}
            title="Sign out of administrator session"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
