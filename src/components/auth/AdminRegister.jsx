import { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  AtSign,
  Lock,
  Egg,
  Bird,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { cryptoService } from '../../services/cryptoService.js';
import { APP_INFO } from '../../utils/constants.js';
import styles from './AdminRegister.module.css';

export function AdminRegister({ onRegisterSuccess, onSwitchToLogin, onBackToHome }) {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordStrength = cryptoService.evaluatePasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Field completeness validation
    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.username.trim()) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Password is required.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    if (!passwordStrength.isValid) {
      setErrorMessage(`Password requirement not met: ${passwordStrength.message}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await onRegisterSuccess({
        fullName: formData.fullName,
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create administrator account.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Administrator account created successfully! Redirecting to login...');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
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
            <Egg size={24} className={styles.logoEgg} />
            <Bird size={16} className={styles.logoBird} />
          </div>
          <h1 className={styles.brandTitle}>{APP_INFO.name}</h1>
          <p className={styles.brandTagline}>{APP_INFO.tagline}</p>
        </div>

        {/* Setup Banner */}
        <div className={styles.setupHero}>
          <div className={styles.setupIconBox}>
            <ShieldCheck size={20} className={styles.setupIcon} />
          </div>
          <div>
            <h2 className={styles.setupTitle}>Initial Administrator Setup</h2>
            <p className={styles.setupSubtitle}>
              Create your primary administrator credentials to secure this local poultry farm installation.
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={16} className={styles.errorIcon} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successAlert} role="status">
            <CheckCircle2 size={16} className={styles.successIcon} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Full Name */}
          <div className={styles.inputGroup}>
            <label htmlFor="reg-fullname" className={styles.label}>
              Administrator Full Name <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.inputIcon} />
              <input
                id="reg-fullname"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Hikimatu Abdulaziz"
                className={styles.input}
                disabled={isSubmitting}
                autoComplete="name"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div className={styles.inputGroup}>
            <label htmlFor="reg-username" className={styles.label}>
              Administrator Username <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <AtSign size={16} className={styles.inputIcon} />
              <input
                id="reg-username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. farmadmin"
                className={styles.input}
                disabled={isSubmitting}
                autoComplete="username"
                required
              />
            </div>
            <span className={styles.helperText}>Use lowercase letters, numbers, or hyphens (unique identifier).</span>
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="reg-password" className={styles.label}>
              Master Password <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters with letters & numbers"
                className={styles.input}
                disabled={isSubmitting}
                autoComplete="new-password"
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

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className={styles.strengthMeter}>
                <div className={styles.strengthBars}>
                  <div className={`${styles.strengthBar} ${passwordStrength.score >= 1 ? styles.activeScore : ''}`} />
                  <div className={`${styles.strengthBar} ${passwordStrength.score >= 2 ? styles.activeScore : ''}`} />
                  <div className={`${styles.strengthBar} ${passwordStrength.score >= 3 ? styles.activeScore : ''}`} />
                  <div className={`${styles.strengthBar} ${passwordStrength.score >= 4 ? styles.activeScore : ''}`} />
                </div>
                <span className={styles.strengthLabel}>Strength: {passwordStrength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="reg-confirm-password" className={styles.label}>
              Confirm Password <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password to confirm"
                className={styles.input}
                disabled={isSubmitting}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.toggleVisibilityBtn}
                onClick={() => setShowConfirmPassword((p) => !p)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className={styles.securityBox}>
            <p className={styles.securityText}>
              Credentials are encrypted client-side using the native Web Crypto API (PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique cryptographic salt). Plain-text passwords are never stored.
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Establishing Security Keys...' : 'Create Administrator Account'}
          </button>

          {onSwitchToLogin && (
            <div className={styles.footerLink}>
              <span>Already created your account? </span>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={onSwitchToLogin}
              >
                Sign in here
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
