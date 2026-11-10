import styles from './Badge.module.css';

/**
 * Reusable Badge Component
 * Variants: primary, secondary, success, warning, danger, neutral
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const badgeClass = [
    styles.badge,
    styles[variant] || styles.neutral,
    styles[size] || styles.md,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={badgeClass}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
