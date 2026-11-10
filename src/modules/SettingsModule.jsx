import { useState } from 'react';
import {
  Building2,
  Sliders,
  Database,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { FarmProfileTab } from '../components/settings/FarmProfileTab.jsx';
import { GeneralPreferencesTab } from '../components/settings/GeneralPreferencesTab.jsx';
import { DatabaseInfoTab } from '../components/settings/DatabaseInfoTab.jsx';
import { BackupRestoreTab } from '../components/settings/BackupRestoreTab.jsx';
import styles from './SettingsModule.module.css';

export function SettingsModule({ dbStatus, onRefreshDb }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'preferences' | 'database' | 'backup'
  const [globalNotice, setGlobalNotice] = useState(null);

  const tabs = [
    { id: 'profile', label: 'Farm Profile', icon: Building2 },
    { id: 'preferences', label: 'General Preferences', icon: Sliders },
    { id: 'database', label: 'Database Information', icon: Database },
    { id: 'backup', label: 'Backup & Restore', icon: Archive },
  ];

  const handleDatabaseRestored = async () => {
    setGlobalNotice('Database successfully restored. All application metrics have been refreshed.');
    if (onRefreshDb) {
      await onRefreshDb();
    }
  };

  const handleProfileUpdated = () => {
    setGlobalNotice('Farm business profile updated.');
  };

  return (
    <div className={styles.moduleRoot}>
      {/* Module Header */}
      <div className={styles.screenHeader}>
        <div>
          <h2 className={styles.moduleTitle}>Settings, Backup & Restore</h2>
          <p className={styles.moduleSubtitle}>
            Manage farm business profile, currency conventions, IndexedDB storage diagnostics, and complete disaster recovery archives
          </p>
        </div>
      </div>

      {globalNotice && (
        <div className={styles.globalNotice} role="status">
          <CheckCircle2 size={16} />
          <span>{globalNotice}</span>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={() => setGlobalNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className={styles.settingsTabBar}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setGlobalNotice(null);
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className={styles.tabContentCard}>
        {activeTab === 'profile' && (
          <FarmProfileTab onProfileUpdated={handleProfileUpdated} />
        )}

        {activeTab === 'preferences' && (
          <GeneralPreferencesTab />
        )}

        {activeTab === 'database' && (
          <DatabaseInfoTab />
        )}

        {activeTab === 'backup' && (
          <BackupRestoreTab
            dbStatus={dbStatus}
            onDatabaseRestored={handleDatabaseRestored}
          />
        )}
      </div>
    </div>
  );
}
