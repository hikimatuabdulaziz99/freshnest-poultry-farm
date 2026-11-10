import { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Image,
  RefreshCw,
} from 'lucide-react';
import { settingsService, DEFAULT_FARM_PROFILE } from '../../services/settingsService.js';
import styles from './FarmProfileTab.module.css';

export function FarmProfileTab({ onProfileUpdated }) {
  const [formData, setFormData] = useState(DEFAULT_FARM_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const profile = await settingsService.getFarmProfile();
        setFormData(profile);
      } catch (err) {
        console.error('Error loading farm profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (statusMessage) setStatusMessage(null);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select a valid image file (PNG, JPG, or SVG).' });
      return;
    }

    // Limit to 1MB for base64 storage in IndexedDB
    if (file.size > 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Logo image must be smaller than 1MB.' });
      return;
    }

    const reader = new window.FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result;
      if (typeof base64 === 'string') {
        setFormData((prev) => ({ ...prev, farm_logo: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await settingsService.updateFarmProfile(formData);
      setStatusMessage({ type: 'success', text: 'Farm profile settings saved successfully!' });
      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingBox}>
        <RefreshCw size={24} className={styles.spinning} />
        <span>Loading farm profile settings...</span>
      </div>
    );
  }

  return (
    <div className={styles.tabContainer}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.tabTitle}>Farm Profile & Identity</h3>
          <p className={styles.tabSubtitle}>
            Configure your farm business name, contact channels, location, and official branding
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

      <form onSubmit={handleSubmit} className={styles.profileForm}>
        {/* Logo and Brand Preview */}
        <div className={styles.logoSection}>
          <div className={styles.logoPreviewBox}>
            {formData.farm_logo ? (
              <img src={formData.farm_logo} alt="Farm Logo" className={styles.logoImg} />
            ) : (
              <div className={styles.logoPlaceholder}>
                <Image size={28} />
                <span>No Logo</span>
              </div>
            )}
          </div>
          <div className={styles.logoUploadControls}>
            <label htmlFor="farm-logo-upload" className={styles.uploadBtn}>
              <Image size={14} />
              <span>Upload Farm Logo</span>
            </label>
            <input
              id="farm-logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className={styles.hiddenFileInput}
            />
            {formData.farm_logo && (
              <button
                type="button"
                className={styles.removeLogoBtn}
                onClick={() => setFormData((prev) => ({ ...prev, farm_logo: '' }))}
              >
                Remove Logo
              </button>
            )}
            <p className={styles.fieldHint}>Supported formats: PNG, JPG, or SVG (Max: 1MB)</p>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className={styles.fieldsGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="farm_name" className={styles.formLabel}>
              <Building2 size={14} className={styles.labelIcon} />
              Farm Business Name <span className={styles.requiredStar}>*</span>
            </label>
            <input
              id="farm_name"
              type="text"
              name="farm_name"
              value={formData.farm_name}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="e.g. FreshNest Poultry Farm"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="farm_admin_name" className={styles.formLabel}>
              <User size={14} className={styles.labelIcon} />
              Farm Administrator / Manager Name
            </label>
            <input
              id="farm_admin_name"
              type="text"
              name="farm_admin_name"
              value={formData.farm_admin_name}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="e.g. Alh. Babatunde Ibrahim"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="farm_phone" className={styles.formLabel}>
              <Phone size={14} className={styles.labelIcon} />
              Farm Contact Phone <span className={styles.requiredStar}>*</span>
            </label>
            <input
              id="farm_phone"
              type="tel"
              name="farm_phone"
              value={formData.farm_phone}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="e.g. +234 803 123 4567"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="farm_email" className={styles.formLabel}>
              <Mail size={14} className={styles.labelIcon} />
              Farm Official Email <span className={styles.requiredStar}>*</span>
            </label>
            <input
              id="farm_email"
              type="email"
              name="farm_email"
              value={formData.farm_email}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="e.g. info@freshnestpoultry.ng"
              required
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="farm_address" className={styles.formLabel}>
              <MapPin size={14} className={styles.labelIcon} />
              Physical Farm Location / Address
            </label>
            <input
              id="farm_address"
              type="text"
              name="farm_address"
              value={formData.farm_address}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="e.g. KM 14, Old Abeokuta Expressway, Farm Settlement, Ogun State, Nigeria"
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="farm_description" className={styles.formLabel}>
              <FileText size={14} className={styles.labelIcon} />
              Farm Description & Operation Scope
            </label>
            <textarea
              id="farm_description"
              name="farm_description"
              rows={3}
              value={formData.farm_description}
              onChange={handleChange}
              className={styles.formTextarea}
              placeholder="Brief description of farm operations, layer flocks, broiler houses, and produce..."
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.saveBtn} disabled={isSaving}>
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Farm Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
