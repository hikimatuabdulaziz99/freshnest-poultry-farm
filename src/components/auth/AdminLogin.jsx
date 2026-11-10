import { useState } from 'react';
import {
  Lock,
  AtSign,
  Eye,
  EyeOff,
  Egg,
  Bird,
  AlertCircle,
  ShieldAlert,
  Info,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { APP_INFO } from '../../utils/constants.js';
import styles from './AdminLogin.module.css';

export function AdminLogin({ onLoginSuccess, onSwitchToRegister, onBackToHome }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    rememberSession: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedUser = credentials.username.trim();
    if (!trimmedUser) {
      setErrorMessage('Please enter your administrator username.');
      return;
    }
    if (!credentials.password) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await onLoginSuccess({
        username: trimmedUser,
        password: credentials.password,
        rememberSession: credentials.rememberSession,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your username and password.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authCard}>
        {onBackToHome && (
          <button
            type="button"
            className={styles.backToHomeBtn}
            onClick={onBackToHome}
          >
            <ArrowLeft size={15} />
            <span>Back to Farm Overview</span>
          </button>
        )}

        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.logoBadge}>
            <Egg size={26} className={styles.logoEgg} />
            <Bird size={17} className={styles.logoBird} />
          </div>
          <h1 className={styles.brandTitle}>{APP_INFO.name}</h1>
          <p className={styles.brandTagline}>{APP_INFO.tagline}</p>
        </div>

        {/* Console Header */}
        <div className={styles.loginTitleBox}>
          <h2 className={styles.loginTitle}>Administrator Sign In</h2>
          <p className={styles.loginSubtitle}>
            Authenticate with your local master credentials to access farm operations and management modules.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={16} className={styles.errorIcon} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Username */}
          <div className={styles.inputGroup}>
            <label htmlFor="login-username" className={styles.label}>
              Username
            </label>
            <div className={styles.inputWrapper}>
              <AtSign size={16} className={styles.inputIcon} />
              <input
                id="login-username"
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                placeholder="Enter administrator username"
                className={styles.input}
                disabled={isSubmitting}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="login-password" className={styles.label}>
              Master Password
            </label>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="Enter master password"
                className={styles.input}
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.toggleVisibilityBtn}
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Session & Security Badge */}
          <div className={styles.optionsRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="rememberSession"
                checked={credentials.rememberSession}
                onChange={handleChange}
                className={styles.checkbox}
                disabled={isSubmitting}
              />
              <span>Remember session on this device</span>
            </label>

            <button
              type="button"
              className={styles.infoToggleBtn}
              onClick={() => setShowSecurityInfo((p) => !p)}
              title="View local authentication security model"
            >
              <Info size={14} />
              <span>Security Model</span>
            </button>
          </div>

          {/* Expandable Security Architecture Info */}
          {showSecurityInfo && (
            <div className={styles.securityInfoBox}>
              <div className={styles.securityInfoTitle}>
                <ShieldAlert size={14} />
                <span>Offline Security Notice</span>
              </div>
              <p className={styles.securityInfoText}>
                FreshNest authenticates locally using PBKDF2-SHA256 password hashing. Passwords are never transmitted or stored in plain-text. Note that client-side authentication secures interface access on the farm premises, but does not substitute for physical device security or remote enterprise identity providers.
              </p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying PBKDF2 Hash...' : 'Sign In to Farm Console'}
          </button>
        </form>

        {/* Database Offline Status Footer */}
        <div className={styles.footerNote}>
          <div className={styles.offlinePill}>
            <CheckCircle2 size={12} className={styles.pillIcon} />
            <span>Local IndexedDB Authentication · Zero External Cloud Dependencies</span>
          </div>
          {onSwitchToRegister && (
            <div className={styles.switchBox}>
              <button
                type="button"
                className={styles.switchBtn}
                onClick={onSwitchToRegister}
              >
                Reset / Initial Registration View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
