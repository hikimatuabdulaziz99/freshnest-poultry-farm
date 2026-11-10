import {
  LayoutDashboard,
  Bird,
  Layers,
  Wheat,
  Pill,
  Syringe,
  Egg,
  Activity,
  ShoppingBag,
  Receipt,
  Boxes,
  FileBarChart,
  SlidersHorizontal,
  Database,
  X,
  ChevronRight,
} from 'lucide-react';
import { APP_INFO, APP_MODULES, MODULE_CATEGORIES } from '../../utils/constants.js';
import { PWAInstallButton } from './PWAInstallButton.jsx';
import styles from './Sidebar.module.css';

// Icon mapping helper
const ICON_MAP = {
  LayoutDashboard,
  Bird,
  Layers,
  Wheat,
  Pill,
  Syringe,
  Egg,
  ActivitySquare: Activity,
  ShoppingBag,
  Receipt,
  Boxes,
  FileBarChart,
  SlidersHorizontal,
};

export function Sidebar({
  activeModuleId,
  onSelectModule,
  isOpen = false,
  onCloseMobile = () => {},
}) {
  // Group modules by category
  const categories = Object.values(MODULE_CATEGORIES);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.openMobile : ''}`}>
        {/* Brand Header */}
        <div className={styles.brandContainer}>
          <div className={styles.brandLogoBox}>
            <div className={styles.logoIconBg}>
              <Egg className={styles.logoIconEgg} size={22} />
              <Bird className={styles.logoIconBird} size={15} />
            </div>
            <div className={styles.brandTextWrapper}>
              <span className={styles.brandTitle}>FRESHNEST</span>
              <span className={styles.brandSubtitle}>POULTRY FARM</span>
            </div>
          </div>
          <button
            className={styles.closeMobileBtn}
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tagline Banner */}
        <div className={styles.taglineBox}>
          <p className={styles.taglineText}>Smart Management for Healthy Poultry Farming</p>
        </div>

        {/* Navigation Categories & Module Links */}
        <nav className={styles.navContainer} aria-label="Main Navigation">
          {categories.map((category) => {
            const moduleList = APP_MODULES.filter((m) => m.category === category);
            if (moduleList.length === 0) return null;

            return (
              <div key={category} className={styles.navSection}>
                <h4 className={styles.sectionHeader}>{category}</h4>
                <ul className={styles.navList}>
                  {moduleList.map((mod) => {
                    const IconComponent = ICON_MAP[mod.icon] || Layers;
                    const isActive = activeModuleId === mod.id;

                    return (
                      <li key={mod.id}>
                        <button
                          type="button"
                          className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                          onClick={() => {
                            onSelectModule(mod.id);
                            onCloseMobile();
                          }}
                        >
                          <span className={styles.navIconWrapper}>
                            <IconComponent size={18} />
                          </span>
                          <span className={styles.navLabel}>{mod.label}</span>
                          {isActive && <ChevronRight size={14} className={styles.activeArrow} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* PWA In-App Install Prompt */}
        <div className={styles.installArea}>
          <PWAInstallButton className={styles.sidebarInstallBtn} />
        </div>

        {/* Offline Engine Footer Pill */}
        <div className={styles.footerInfo}>
          <div className={styles.offlineEngineBadge}>
            <Database size={15} className={styles.engineIcon} />
            <div className={styles.engineText}>
              <span className={styles.engineTitle}>Dexie.js Offline DB</span>
              <span className={styles.engineStatus}>IndexedDB v1.0 Ready</span>
            </div>
          </div>
          <div className={styles.versionNote}>
            <span>{APP_INFO.shortName} System v{APP_INFO.version}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
