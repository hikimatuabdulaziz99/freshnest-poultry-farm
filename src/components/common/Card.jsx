import styles from './Card.module.css';

/**
 * Reusable Card component adhering to FreshNest Design System
 * Rounded corners, subtle shadows, clean borders, optional header/footer
 */
export function Card({
  children,
  title,
  subtitle,
  action,
  icon,
  className = '',
  variant = 'default',
  noPadding = false,
}) {
  const cardClass = [
    styles.card,
    styles[variant] || styles.default,
    noPadding ? styles.noPadding : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasHeader = title || subtitle || action || icon;

  return (
    <div className={cardClass}>
      {hasHeader && (
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            {icon && <span className={styles.headerIcon}>{icon}</span>}
            <div>
              {title && <h3 className={styles.title}>{title}</h3>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>
          {action && <div className={styles.headerAction}>{action}</div>}
        </div>
      )}
      <div className={noPadding ? styles.bodyNoPadding : styles.body}>
        {children}
      </div>
    </div>
  );
}
