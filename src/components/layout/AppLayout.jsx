import { useState } from 'react';
import { Sidebar } from '../common/Sidebar.jsx';
import { Header } from '../common/Header.jsx';
import { OfflineStatusBanner } from '../common/OfflineStatusBanner.jsx';
import { UpdateReadyBanner } from '../common/UpdateReadyBanner.jsx';
import styles from './AppLayout.module.css';

/**
 * Reusable Application Layout for FreshNest Poultry Farm
 * Provides sticky sidebar, top navigation, responsive mobile drawer, and main content area
 */
export function AppLayout({
  children,
  activeModule,
  activeModuleId,
  onSelectModule,
  dbStatus,
  onRefreshDb,
  admin,
  onOpenProfile,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.layoutRoot}>
      {/* Primary Sidebar */}
      <Sidebar
        activeModuleId={activeModuleId}
        onSelectModule={onSelectModule}
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Viewport Container */}
      <div className={styles.viewport}>
        <UpdateReadyBanner />
        <OfflineStatusBanner />
        <Header
          activeModule={activeModule}
          dbStatus={dbStatus}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onRefreshDb={onRefreshDb}
          onSelectModule={onSelectModule}
          admin={admin}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
        />

        <main className={styles.mainContent}>
          <div className={styles.contentContainer}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
