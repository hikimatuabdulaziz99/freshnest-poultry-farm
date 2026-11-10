import styles from './Button.module.css';

/**
 * Reusable Button Component
 * Supports variants: primary, secondary, outline, ghost, danger
 * Sizes: sm, md, lg
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  icon = null,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}) {
  const buttonClass = [
    styles.button,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    fullWidth ? styles.fullWidth : '',
    disabled ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className={styles.iconWrapper}>{icon}</span>}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
