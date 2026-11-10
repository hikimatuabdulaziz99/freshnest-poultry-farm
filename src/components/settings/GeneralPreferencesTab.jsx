import { useState, useEffect } from 'react';
import {
  Coins,
  Calendar,
  Layers,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { settingsService, DEFAULT_PREFERENCES } from '../../services/settingsService.js';
import styles from './GeneralPreferencesTab.module.css';

export function GeneralPreferencesTab() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    async function loadPrefs() {
      setIsLoading(true);
      try {
        const loaded = await settingsService.getGeneralPreferences();
        setPrefs(loaded);
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrefs((prev) => ({ ...prev, [name]: value }));
    if (statusMessage) setStatusMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      await settingsService.updateGeneralPreferences(prefs);
      setStatusMessage({ type: 'success', text: 'System preferences saved successfully!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save preferences.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingBox}>
        <RefreshCw size={24} className={styles.spinning} />
        <span>Loading system preferences...</span>
      </div>
    );
  }

  return (
    <div className={styles.tabContainer}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.tabTitle}>System & Display Preferences</h3>
          <p className={styles.tabSubtitle}>
            Configure standard currency symbols, commercial egg crate units, and localized date presentation
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`${styles.statusAlert} ${statusMessage.type === 'success' ? styles.alertSuccess : styles.alertError}`}
          role="alert"
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Safety & Integrity Notice */}
      <div className={styles.noticeCard}>
        <div className={styles.noticeIconBox}>
          <ShieldCheck size={20} className={styles.noticeIcon} />
        </div>
        <div className={styles.noticeContent}>
          <h4 className={styles.noticeTitle}>Financial & Inventory Integrity Guard</h4>
          <p className={styles.noticeText}>
            FreshNest executes all financial accounting in integer kobo precision to eliminate floating-point penny errors.
            Changing visual preferences will never modify historical sales records, expense vouchers, or egg crate inventory quantities.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.prefsForm}>
        <div className={styles.fieldsGrid}>
          {/* Currency Code */}
          <div className={styles.formGroup}>
            <label htmlFor="pref_currency" className={styles.formLabel}>
              <Coins size={14} className={styles.labelIcon} />
              Default Operational Currency
            </label>
            <select
              id="pref_currency"
              name="currency"
              value={prefs.currency}
              onChange={handleChange}
              className={styles.formSelect}
            >
              <option value="NGN">NGN – Nigerian Naira (₦)</option>
              <option value="USD">USD – US Dollar ($)</option>
              <option value="GBP">GBP – British Pound (£)</option>
              <option value="EUR">EUR – Euro (€)</option>
              <option value="GHS">GHS – Ghanaian Cedi (₵)</option>
            </select>
            <span className={styles.fieldNote}>Primary currency for sales, invoices, and expense ledgers</span>
          </div>

          {/* Currency Symbol */}
          <div className={styles.formGroup}>
            <label htmlFor="pref_currency_symbol" className={styles.formLabel}>
              <Coins size={14} className={styles.labelIcon} />
              Currency Display Symbol
            </label>
            <input
              id="pref_currency_symbol"
              type="text"
              name="currency_symbol"
              value={prefs.currency_symbol}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="₦"
              maxLength={3}
            />
            <span className={styles.fieldNote}>Symbol displayed alongside financial summaries</span>
          </div>

          {/* Egg Crate Size */}
          <div className={styles.formGroup}>
            <label htmlFor="pref_egg_crate_size" className={styles.formLabel}>
              <Layers size={14} className={styles.labelIcon} />
              Standard Commercial Crate Size (Eggs per Tray)
            </label>
            <input
              id="pref_egg_crate_size"
              type="number"
              name="egg_crate_size"
              min="1"
              max="100"
              value={prefs.egg_crate_size}
              onChange={handleChange}
              className={styles.formInput}
              required
            />
            <span className={styles.fieldNote}>Default is 30 eggs per standard paper pulp tray</span>
          </div>

          {/* Date Display Format */}
          <div className={styles.formGroup}>
            <label htmlFor="pref_date_format" className={styles.formLabel}>
              <Calendar size={14} className={styles.labelIcon} />
              Date Presentation Format
            </label>
            <select
              id="pref_date_format"
              name="date_format"
              value={prefs.date_format}
              onChange={handleChange}
              className={styles.formSelect}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 07/11/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-07)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/07/2026)</option>
              <option value="DD MMM YYYY">DD MMM YYYY (e.g. 07 Nov 2026)</option>
            </select>
            <span className={styles.fieldNote}>Applied to tables, printable receipts, and report ledgers</span>
          </div>

          {/* Timezone & Local Date Handling */}
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="pref_local_date_mode" className={styles.formLabel}>
              <Globe size={14} className={styles.labelIcon} />
              Farm Regional Timezone
            </label>
            <select
              id="pref_local_date_mode"
              name="local_date_mode"
              value={prefs.local_date_mode}
              onChange={handleChange}
              className={styles.formSelect}
            >
              <option value="Africa/Lagos">West Africa Time – Lagos, Nigeria (UTC+1)</option>
              <option value="Africa/Accra">Greenwich Mean Time – Accra, Ghana (UTC+0)</option>
              <option value="Africa/Nairobi">East Africa Time – Nairobi, Kenya (UTC+3)</option>
              <option value="UTC">Universal Coordinated Time (UTC)</option>
            </select>
            <span className={styles.fieldNote}>Guarantees local calendar dates match morning and evening farm logs</span>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveBtn} disabled={isSaving}>
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
