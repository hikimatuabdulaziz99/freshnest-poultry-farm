import { useState } from 'react';
import {
  X,
  User,
  AtSign,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LogOut,
  Info,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import { cryptoService } from '../../services/cryptoService.js';
import styles from './AdminProfileModal.module.css';

export function AdminProfileModal({
  admin,
  isOpen,
  onClose,
  onUpdateProfile,
  onChangePassword,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password' | 'security'
  
  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    fullName: admin?.fullName || '',
    username: admin?.username || '',
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !admin) return null;

  const newPasswordStrength = cryptoService.evaluatePasswordStrength(passwordForm.newPassword);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!profileForm.fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Full name cannot be blank.' });
      return;
    }
    if (!profileForm.username.trim()) {
      setStatusMessage({ type: 'error', text: 'Username cannot be blank.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await onUpdateProfile({
        fullName: profileForm.fullName,
        username: profileForm.username,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Administrator profile updated successfully.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!passwordForm.currentPassword) {
      setStatusMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (!passwordForm.newPassword) {
      setStatusMessage({ type: 'error', text: 'Please enter a new password.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setStatusMessage({ type: 'error', text: 'New password confirmation does not match.' });
      return;
    }
    if (!newPasswordStrength.isValid) {
      setStatusMessage({ type: 'error', text: `Password rule not met: ${newPasswordStrength.message}` });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await onChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Password successfully updated in local IndexedDB.' });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to change password.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} aria-hidden="true">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-profile-title"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleBox}>
            <div className={styles.avatarPill}>
              <span>FA</span>
            </div>
            <div>
              <h3 id="admin-profile-title" className={styles.modalTitle}>
                Administrator Profile & Security
              </h3>
              <p className={styles.modalSubtitle}>Manage your local master credentials and session settings</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
          >
            <User size={15} />
            <span>Profile & Account</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'password' ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab('password');
              setStatusMessage(null);
            }}
          >
            <KeyRound size={15} />
            <span>Change Password</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'security' ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab('security');
              setStatusMessage(null);
            }}
          >
            <ShieldCheck size={15} />
            <span>Security Architecture</span>
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div
            className={statusMessage.type === 'success' ? styles.alertSuccess : styles.alertError}
            role="status"
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} className={styles.alertIcon} />
            ) : (
              <AlertCircle size={16} className={styles.alertIcon} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Profile & Account Information */}
        {activeTab === 'profile' && (
          <div className={styles.tabContent}>
            {/* Account Metadata Grid */}
            <div className={styles.accountCard}>
              <div className={styles.accountDetail}>
                <span className={styles.metaLabel}>Role</span>
                <span className={styles.metaValue}>Farm Administrator</span>
              </div>
              <div className={styles.accountDetail}>
                <span className={styles.metaLabel}>Account Status</span>
                <span className={styles.metaStatusActive}>Active</span>
              </div>
              <div className={styles.accountDetail}>
                <span className={styles.metaLabel}>Created Date</span>
                <span className={styles.metaValue}>{formatDate(admin.createdAt)}</span>
              </div>
              <div className={styles.accountDetail}>
                <span className={styles.metaLabel}>Storage Key</span>
                <span className={styles.metaValue}>IndexedDB Account #{admin.id}</span>
              </div>
            </div>

            {/* Profile Update Form */}
            <form onSubmit={handleProfileSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="prof-fullname" className={styles.label}>
                  Full Name
                </label>
                <div className={styles.inputWrapper}>
                  <User size={16} className={styles.inputIcon} />
                  <input
                    id="prof-fullname"
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className={styles.input}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="prof-username" className={styles.label}>
                  Administrator Username
                </label>
                <div className={styles.inputWrapper}>
                  <AtSign size={16} className={styles.inputIcon} />
                  <input
                    id="prof-username"
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className={styles.input}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <span className={styles.helperText}>Used to log in to FreshNest Poultry Farm.</span>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className={styles.tabContent}>
            <div className={styles.inputGroup}>
              <label htmlFor="pwd-current" className={styles.label}>
                Current Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <KeyRound size={16} className={styles.inputIcon} />
                <input
                  id="pwd-current"
                  type={showCurrent ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter your current password"
                  className={styles.input}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleVisibilityBtn}
                  onClick={() => setShowCurrent((p) => !p)}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="pwd-new" className={styles.label}>
                New Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <KeyRound size={16} className={styles.inputIcon} />
                <input
                  id="pwd-new"
                  type={showNew ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Minimum 8 characters with letters & numbers"
                  className={styles.input}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleVisibilityBtn}
                  onClick={() => setShowNew((p) => !p)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordForm.newPassword && (
                <div className={styles.strengthMeter}>
                  <div className={styles.strengthBars}>
                    <div className={`${styles.strengthBar} ${newPasswordStrength.score >= 1 ? styles.activeScore : ''}`} />
                    <div className={`${styles.strengthBar} ${newPasswordStrength.score >= 2 ? styles.activeScore : ''}`} />
                    <div className={`${styles.strengthBar} ${newPasswordStrength.score >= 3 ? styles.activeScore : ''}`} />
                    <div className={`${styles.strengthBar} ${newPasswordStrength.score >= 4 ? styles.activeScore : ''}`} />
                  </div>
                  <span className={styles.strengthLabel}>Strength: {newPasswordStrength.label}</span>
                </div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="pwd-confirm" className={styles.label}>
                Confirm New Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <KeyRound size={16} className={styles.inputIcon} />
                <input
                  id="pwd-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className={styles.input}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className={styles.toggleVisibilityBtn}
                  onClick={() => setShowConfirm((p) => !p)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deriving New Key...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Security Architecture Disclosure */}
        {activeTab === 'security' && (
          <div className={styles.tabContent}>
            <div className={styles.securityAuditBox}>
              <div className={styles.auditItem}>
                <ShieldCheck size={18} className={styles.auditIcon} />
                <div>
                  <h4 className={styles.auditTitle}>Cryptographic Algorithm</h4>
                  <p className={styles.auditText}>
                    PBKDF2-HMAC-SHA256 with 100,000 key derivation iterations and a 128-bit cryptographically random salt per user.
                  </p>
                </div>
              </div>

              <div className={styles.auditItem}>
                <ShieldCheck size={18} className={styles.auditIcon} />
                <div>
                  <h4 className={styles.auditTitle}>Password Storage Rule</h4>
                  <p className={styles.auditText}>
                    Zero plain-text password storage. Stored records only contain derived hash bits and public salt parameters in IndexedDB.
                  </p>
                </div>
              </div>

              <div className={styles.auditItem}>
                <Info size={18} className={styles.auditIconMuted} />
                <div>
                  <h4 className={styles.auditTitle}>Browser-Local Security Scope & Limitations</h4>
                  <p className={styles.auditText}>
                    FreshNest runs offline in the client browser. Local authentication provides role enforcement and interface privacy against unauthorized farm attendants on the device. However, client-side authentication cannot provide mathematical guarantees against someone with direct access to browser storage or developer tools.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer with Logout Action */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <LogOut size={15} />
            <span>Sign Out of Administrator Session</span>
          </button>

          <button
            type="button"
            className={styles.doneBtn}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
