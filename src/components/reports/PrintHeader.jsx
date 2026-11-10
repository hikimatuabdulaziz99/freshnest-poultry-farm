import { useState, useEffect } from 'react';
import { Egg, Bird } from 'lucide-react';
import { APP_INFO } from '../../utils/constants.js';
import { db } from '../../database/db.js';
import styles from './PrintHeader.module.css';

export function PrintHeader({ title, startDate, endDate, generationDate = new Date(), farmName: propFarmName }) {
  const [farmName, setFarmName] = useState(propFarmName || APP_INFO.name);
  const [farmLogo, setFarmLogo] = useState(null);

  useEffect(() => {
    if (propFarmName) {
      setFarmName(propFarmName);
    }
    async function loadFarmProfile() {
      try {
        if (!propFarmName) {
          const setting = await db.farmSettings.get('farm_name');
          if (setting && setting.value) {
            setFarmName(setting.value);
          }
        }
        const logoSetting = await db.farmSettings.get('farm_logo');
        if (logoSetting && logoSetting.value) {
          setFarmLogo(logoSetting.value);
        }
      } catch {
        // Fallback
      }
    }
    loadFarmProfile();
  }, [propFarmName]);

  const formattedGenDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(generationDate);

  return (
    <div className={styles.printHeaderRoot}>
      <div className={styles.headerLeft}>
        <div className={styles.logoRow}>
          {farmLogo ? (
            <img src={farmLogo} alt={farmName} className={styles.farmLogoImg} />
          ) : (
            <div className={styles.iconBox}>
              <Egg size={22} className={styles.eggIcon} />
              <Bird size={14} className={styles.birdIcon} />
            </div>
          )}
          <div>
            <h1 className={styles.farmTitle}>{farmName}</h1>
            <p className={styles.farmSubtitle}>{APP_INFO.tagline}</p>
          </div>
        </div>
      </div>

      <div className={styles.headerRight}>
        <h2 className={styles.reportTitle}>{title || 'Farm Performance Report'}</h2>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Reporting Period:</span>
          <span className={styles.metaValue}>{startDate} to {endDate}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Generated On:</span>
          <span className={styles.metaValue}>{formattedGenDate}</span>
        </div>
      </div>
    </div>
  );
}
