import {
  Bird,
  Layers,
  Wheat,
  Pill,
  Syringe,
  Egg,
  AlertTriangle,
  ShoppingBag,
  FileBarChart,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card.jsx';
import styles from './QuickActions.module.css';

export function QuickActions({ onSelectModule }) {
  const actions = [
    {
      id: 'reg-birds',
      label: 'Register New Birds',
      description: 'Tag and index breeder stock or individual birds',
      icon: Bird,
      targetModule: 'birds',
      badge: 'Birds',
    },
    {
      id: 'new-batch',
      label: 'Create New Batch',
      description: 'Record day-old chick arrival, breed, & initial pen count',
      icon: Layers,
      targetModule: 'batches',
      badge: 'Batches',
    },
    {
      id: 'feed-purchase',
      label: 'Record Feed Purchase',
      description: 'Add incoming bags, starter/finisher mash, or grain',
      icon: Wheat,
      targetModule: 'feed',
      badge: 'Feed',
    },
    {
      id: 'med-admin',
      label: 'Administer Treatment',
      description: 'Log veterinary drug, dosage, & food safety withdrawal hold',
      icon: Pill,
      targetModule: 'medication',
      badge: 'Medication',
    },
    {
      id: 'vac-schedule',
      label: 'Schedule Vaccination',
      description: 'Plan cohort immunisation, LaSota, Gumboro, or Marek',
      icon: Syringe,
      targetModule: 'vaccination',
      badge: 'Vaccination',
    },
    {
      id: 'egg-collect',
      label: 'Record Egg Collection',
      description: 'Log morning & evening crate trays with defect grading',
      icon: Egg,
      targetModule: 'eggs',
      badge: 'Eggs',
    },
    {
      id: 'record-mortality',
      label: 'Record Mortality',
      description: 'Document deceased birds, suspected cause, & biosecurity',
      icon: AlertTriangle,
      targetModule: 'mortality',
      badge: 'Mortality',
    },
    {
      id: 'new-sale',
      label: 'Add New Sale',
      description: 'Generate customer invoice for live birds, eggs, or manure',
      icon: ShoppingBag,
      targetModule: 'sales',
      badge: 'Sales',
    },
    {
      id: 'farm-reports',
      label: 'Reports & Analytics',
      description: 'Review flock yields, operating expenses, and financial summaries',
      icon: FileBarChart,
      targetModule: 'reports',
      badge: 'Reports',
    },
  ];

  return (
    <Card
      title="Quick Farm Actions"
      subtitle="Immediate shortcuts to daily farm operational loggers"
      icon={<Zap size={20} />}
    >
      <div className={styles.actionGrid}>
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <div
              key={act.id}
              className={styles.actionButton}
              onClick={() => onSelectModule && onSelectModule(act.targetModule)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectModule && onSelectModule(act.targetModule);
                }
              }}
              title={`Navigate to ${act.label} in ${act.targetModule} module`}
            >
              <div className={styles.iconCircle}>
                <Icon size={18} />
              </div>

              <div className={styles.actionContent}>
                <div className={styles.labelRow}>
                  <h4 className={styles.actionLabel}>{act.label}</h4>
                  <span className={styles.moduleTag}>{act.badge}</span>
                </div>
                <p className={styles.actionDesc}>{act.description}</p>
              </div>

              <ArrowRight size={16} className={styles.actionArrow} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
