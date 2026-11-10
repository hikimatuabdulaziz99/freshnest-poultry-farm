import {
  Clock,
  Bird,
  Layers,
  Wheat,
  Egg,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Card } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';
import { formatDate } from '../../utils/formatters.js';
import styles from './RecentActivities.module.css';

const ICON_MAP = {
  birds: Bird,
  batches: Layers,
  feed: Wheat,
  eggs: Egg,
  mortality: AlertTriangle,
  sales: ShoppingBag,
};

export function RecentActivities({ activities = [], onSelectModule }) {
  return (
    <Card
      title="Recent Farm Activity"
      subtitle="Live audit trail of flock changes, feed logs, harvest, and sales from IndexedDB"
      icon={<Activity size={20} />}
      action={
        activities.length > 0 && (
          <span className={styles.activityCounter}>
            {activities.length} Recent {activities.length === 1 ? 'Event' : 'Events'}
          </span>
        )
      }
    >
      {activities.length === 0 ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyClockBox}>
            <Clock size={30} className={styles.emptyClockIcon} />
          </div>
          <h5 className={styles.emptyTitle}>No Activity Recorded Yet</h5>
          <p className={styles.emptyDesc}>
            As you register birds, create batches, log daily egg collections, or record sales,
            a timestamped audit trail of all operational events will appear here.
          </p>
          <div className={styles.emptyActions}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectModule && onSelectModule('batches')}
              icon={<Layers size={14} />}
            >
              Start with a Batch
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectModule && onSelectModule('birds')}
              icon={<Bird size={14} />}
            >
              Register Bird
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.activityList}>
          {activities.map((act) => {
            const Icon = ICON_MAP[act.module] || Clock;
            return (
              <div
                key={act.id}
                className={styles.activityItem}
                onClick={() => onSelectModule && onSelectModule(act.module)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectModule && onSelectModule(act.module);
                  }
                }}
              >
                <div className={`${styles.iconWrap} ${styles[act.module] || styles.default}`}>
                  <Icon size={16} />
                </div>

                <div className={styles.activityDetails}>
                  <div className={styles.activityTop}>
                    <span className={styles.activityType}>{act.type}</span>
                    <span className={styles.activityTime}>{formatDate(act.timestamp)}</span>
                  </div>
                  <h5 className={styles.activityTitle}>{act.title}</h5>
                  <p className={styles.activityMeta}>{act.detail}</p>
                </div>

                <ArrowRight size={14} className={styles.itemArrow} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
