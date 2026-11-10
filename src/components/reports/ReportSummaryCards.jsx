import {
  Bird,
  Layers,
  Egg,
  TrendingUp,
  Wheat,
  Activity,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  Receipt,
  Wallet,
  Clock,
  DollarSign,
  Boxes,
} from 'lucide-react';
import { formatNaira } from '../../services/reportsService.js';
import styles from './ReportSummaryCards.module.css';

export function ReportSummaryCards({ summary, isLoading = false }) {
  if (!summary && !isLoading) return null;

  const cards = [
    {
      id: 'livingBirds',
      label: 'Living Bird Flock',
      value: (summary?.currentLivingBirds || 0).toLocaleString(),
      subtext: `From ${summary?.totalBirdRecords || 0} registered bird tags`,
      icon: Bird,
      category: 'flock',
    },
    {
      id: 'activeBatches',
      label: 'Active Flock Batches',
      value: (summary?.activeBatches || 0).toLocaleString(),
      subtext: 'Ongoing cohort rearing',
      icon: Layers,
      category: 'flock',
    },
    {
      id: 'eggsCollected',
      label: 'Eggs Collected',
      value: (summary?.eggsCollected || 0).toLocaleString(),
      subtext: 'Good & graded table eggs',
      icon: Egg,
      category: 'production',
    },
    {
      id: 'averageHdp',
      label: 'Average Lay Rate (HDP)',
      value: `${summary?.averageHdp || 0}%`,
      subtext: 'Hen-Day Production benchmark',
      icon: TrendingUp,
      category: 'production',
    },
    {
      id: 'feedConsumed',
      label: 'Feed Consumed',
      value: `${(summary?.feedConsumedKg || 0).toLocaleString()} kg`,
      subtext: 'Rations distributed to flock',
      icon: Wheat,
      category: 'production',
    },
    {
      id: 'mortalityRate',
      label: 'Flock Mortality Rate',
      value: `${summary?.mortalityRate || 0}%`,
      subtext: `${summary?.mortalityCount || 0} total deaths recorded`,
      icon: Activity,
      category: 'health',
      isWarning: (summary?.mortalityRate || 0) > 3,
    },
    {
      id: 'salesRevenue',
      label: 'Sales Revenue',
      value: formatNaira(summary?.salesRevenue || 0),
      subtext: 'Total invoiced sales (accrual)',
      icon: ShoppingBag,
      category: 'finance',
    },
    {
      id: 'paymentsReceived',
      label: 'Payments Received',
      value: formatNaira(summary?.paymentsReceived || 0),
      subtext: 'Actual cash inflows collected',
      icon: CreditCard,
      category: 'finance',
    },
    {
      id: 'customerReceivables',
      label: 'Customer Receivables',
      value: formatNaira(summary?.customerReceivables || 0),
      subtext: 'Uncollected customer balances',
      icon: AlertCircle,
      category: 'finance',
      isWarning: (summary?.customerReceivables || 0) > 0,
    },
    {
      id: 'expensesIncurred',
      label: 'Expenses Incurred',
      value: formatNaira(summary?.expensesIncurred || 0),
      subtext: 'Operational costs committed',
      icon: Receipt,
      category: 'finance',
    },
    {
      id: 'expensesPaid',
      label: 'Expenses Paid',
      value: formatNaira(summary?.expensesPaid || 0),
      subtext: 'Actual cash disbursed to vendors',
      icon: Wallet,
      category: 'finance',
    },
    {
      id: 'supplierPayables',
      label: 'Supplier Payables',
      value: formatNaira(summary?.supplierPayables || 0),
      subtext: 'Outstanding expense debt',
      icon: Clock,
      category: 'finance',
      isWarning: (summary?.supplierPayables || 0) > 0,
    },
    {
      id: 'estimatedProfit',
      label: 'Estimated Profit',
      value: formatNaira(summary?.estimatedProfit || 0),
      subtext: 'Sales Revenue − Expenses Incurred',
      icon: DollarSign,
      category: 'finance',
      isPositive: (summary?.estimatedProfit || 0) >= 0,
      isNegative: (summary?.estimatedProfit || 0) < 0,
    },
    {
      id: 'inventoryValuation',
      label: 'Supplies Inventory Valuation',
      value: formatNaira(summary?.generalInventoryValuation || 0),
      subtext: 'Current value of farm supplies',
      icon: Boxes,
      category: 'inventory',
    },
  ];

  return (
    <div className={styles.summaryContainer}>
      <div className={styles.cardsGrid}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`${styles.card} ${card.isPositive ? styles.cardPositive : ''} ${card.isNegative ? styles.cardNegative : ''}`}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>{card.label}</span>
                <div className={styles.iconCircle}>
                  <Icon size={16} />
                </div>
              </div>

              <div className={styles.cardBody}>
                {isLoading ? (
                  <div className={styles.skeletonValue} />
                ) : (
                  <span
                    className={`${styles.cardValue} ${card.isPositive ? styles.textPositive : ''} ${card.isNegative ? styles.textNegative : ''} ${card.isWarning ? styles.textWarning : ''}`}
                  >
                    {card.value}
                  </span>
                )}
                <span className={styles.cardSubtext}>{card.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
