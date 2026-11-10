import { useState, useEffect } from 'react';
import {
  X,
  Wheat,
  Scale,
  ShoppingBag,
  TrendingDown,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { feedService } from '../../services/feedService.js';
import { formatNumber, formatCurrency, formatDate } from '../../utils/formatters.js';
import styles from './FeedDetailsModal.module.css';

/**
 * Detailed Feed Product Modal with Tabbed Overview, Stock-In, and Consumption History
 */
export function FeedDetailsModal({
  isOpen,
  feed,
  onClose,
  onStockIn,
  onDispense,
  onEdit,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'purchases' | 'logs'
  const [purchases, setPurchases] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadFeedHistory() {
      if (!feed) return;
      try {
        setIsLoadingHistory(true);
        const [purchaseList, logList] = await Promise.all([
          feedService.getFeedPurchases({ feedId: feed.feedId || feed.id }),
          feedService.getFeedLogs({ feedId: feed.feedId || feed.id }),
        ]);

        if (isMounted) {
          setPurchases(purchaseList);
          setLogs(logList);
        }
      } catch (err) {
        console.error('Failed to load feed transaction history:', err);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    }

    if (isOpen && feed) {
      loadFeedHistory();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, feed]);

  if (!isOpen || !feed) return null;

  const stock = Number(feed.currentStock) || 0;
  const reorder = Number(feed.reorderLevel) || 0;
  const cost = Number(feed.unitCost) || 0;
  const totalValuation = stock * cost;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBox}>
              <Wheat size={24} />
            </div>
            <div>
              <div className={styles.titleRow}>
                <h2 className={styles.title}>{feed.name}</h2>
                <span className={styles.feedIdBadge}>{feed.feedId || `FEED-${feed.id}`}</span>
                <span
                  className={`${styles.statusBadge} ${
                    feed.status === 'In Stock'
                      ? styles.badgeInStock
                      : feed.status === 'Low Stock'
                      ? styles.badgeLowStock
                      : feed.status === 'Expired'
                      ? styles.badgeExpired
                      : styles.badgeOutOfStock
                  }`}
                >
                  {feed.status}
                </span>
              </div>
              <p className={styles.subtitle}>
                {feed.brand || 'Standard Mill'} · {feed.type} · {feed.form || 'Mash'}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FileText size={16} />
            Overview & Specifications
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'purchases' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            <ShoppingBag size={16} />
            Purchases / Stock In ({purchases.length})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <TrendingDown size={16} />
            Feeding Logs / Stock Out ({logs.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className={styles.overviewContainer}>
              {/* Highlight Cards */}
              <div className={styles.highlightGrid}>
                <div className={styles.highlightCard}>
                  <div className={styles.highlightHeader}>
                    <Scale size={16} />
                    <span>Current Inventory</span>
                  </div>
                  <div className={styles.highlightValue}>
                    {formatNumber(stock)} {feed.unit || 'kg'}
                  </div>
                  <div className={styles.highlightSub}>
                    Reorder Threshold: {formatNumber(reorder)} {feed.unit || 'kg'}
                  </div>
                </div>

                <div className={styles.highlightCard}>
                  <div className={styles.highlightHeader}>
                    <ShoppingBag size={16} />
                    <span>Unit Cost (₦)</span>
                  </div>
                  <div className={styles.highlightValue}>{formatCurrency(cost)}</div>
                  <div className={styles.highlightSub}>per {feed.unit || 'kg'}</div>
                </div>

                <div className={styles.highlightCard}>
                  <div className={styles.highlightHeader}>
                    <Wheat size={16} />
                    <span>Total Asset Valuation</span>
                  </div>
                  <div className={styles.highlightValue}>{formatCurrency(totalValuation)}</div>
                  <div className={styles.highlightSub}>Warehouse inventory value</div>
                </div>
              </div>

              {/* Specs Grid */}
              <div className={styles.sectionTitle}>Product Specifications</div>
              <div className={styles.specsGrid}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Feed ID</span>
                  <span className={styles.specValue}>{feed.feedId || `FEED-${feed.id}`}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Product Type</span>
                  <span className={styles.specValue}>{feed.type}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Formulation Form</span>
                  <span className={styles.specValue}>{feed.form || 'Mash'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Target Bird Category</span>
                  <span className={styles.specValue}>{feed.targetBirdType || 'All Birds'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Brand / Manufacturer</span>
                  <span className={styles.specValue}>{feed.brand || 'Standard Mill'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Storage Location</span>
                  <span className={styles.specValue}>{feed.storageLocation || 'Store 1'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Crude Protein (CP)</span>
                  <span className={styles.specValue}>{feed.crudeProtein || 'Standard'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Energy (kcal/kg)</span>
                  <span className={styles.specValue}>{feed.energyKcal || 'Standard'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Expiry Date</span>
                  <span className={styles.specValue}>{formatDate(feed.expiryDate)}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Supplier Contact</span>
                  <span className={styles.specValue}>{feed.supplier || '—'}</span>
                </div>
              </div>

              {/* Formulation Notes */}
              {feed.notes && (
                <div className={styles.notesSection}>
                  <div className={styles.sectionTitle}>Formulation & Handling Notes</div>
                  <div className={styles.notesBox}>{feed.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PURCHASES (STOCK IN) */}
          {activeTab === 'purchases' && (
            <div className={styles.historyContainer}>
              {isLoadingHistory ? (
                <div className={styles.loadingBox}>Loading purchase history...</div>
              ) : purchases.length === 0 ? (
                <div className={styles.emptyHistoryBox}>
                  <ShoppingBag size={32} className={styles.emptyIcon} />
                  <h4>No Purchases Recorded</h4>
                  <p>No replenishment orders recorded yet for this feed product.</p>
                  <button
                    type="button"
                    className={styles.actionPromptBtn}
                    onClick={() => {
                      onClose();
                      onStockIn(feed);
                    }}
                  >
                    <PlusCircle size={15} />
                    Record Feed Purchase
                  </button>
                </div>
              ) : (
                <table className={styles.subTable}>
                  <thead>
                    <tr>
                      <th>Purchase ID</th>
                      <th>Date</th>
                      <th>Quantity</th>
                      <th>Unit Cost (₦)</th>
                      <th>Total Cost (₦)</th>
                      <th>Supplier</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className={styles.historyCode}>{p.purchaseId}</span>
                        </td>
                        <td>{formatDate(p.purchaseDate)}</td>
                        <td className={styles.qtyInCell}>
                          +{formatNumber(p.quantity)} {p.unit}
                        </td>
                        <td>{formatCurrency(p.unitCost)}</td>
                        <td className={styles.boldCell}>{formatCurrency(p.totalCost)}</td>
                        <td>{p.supplier}</td>
                        <td>{p.invoiceNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: FEEDING LOGS (STOCK OUT) */}
          {activeTab === 'logs' && (
            <div className={styles.historyContainer}>
              {isLoadingHistory ? (
                <div className={styles.loadingBox}>Loading consumption history...</div>
              ) : logs.length === 0 ? (
                <div className={styles.emptyHistoryBox}>
                  <TrendingDown size={32} className={styles.emptyIcon} />
                  <h4>No Feeding Logs Recorded</h4>
                  <p>No flock feeding disbursements logged yet for this feed.</p>
                  <button
                    type="button"
                    className={styles.actionPromptBtn}
                    disabled={stock <= 0}
                    onClick={() => {
                      onClose();
                      onDispense(feed);
                    }}
                  >
                    <TrendingDown size={15} />
                    Record Flock Feeding
                  </button>
                </div>
              ) : (
                <table className={styles.subTable}>
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Date</th>
                      <th>Session</th>
                      <th>Recipient Batch</th>
                      <th>Quantity</th>
                      <th>Birds Fed</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <span className={styles.historyCode}>{l.logId}</span>
                        </td>
                        <td>{formatDate(l.date)}</td>
                        <td>
                          <span className={styles.sessionBadge}>{l.session}</span>
                        </td>
                        <td>{l.batchCode || (l.batchId ? `Batch #${l.batchId}` : 'General Flock')}</td>
                        <td className={styles.qtyOutCell}>
                          -{formatNumber(l.quantity)} {l.unit}
                        </td>
                        <td>{l.birdsFed ? `${formatNumber(l.birdsFed)} birds` : '—'}</td>
                        <td className={styles.boldCell}>
                          {l.consumptionPerBirdGrams ? `${l.consumptionPerBirdGrams} g/bird` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button
              type="button"
              className={styles.footerSecondaryBtn}
              onClick={() => {
                onClose();
                onEdit(feed);
              }}
            >
              Edit Specs
            </button>
          </div>
          <div className={styles.footerRight}>
            <button
              type="button"
              className={styles.footerStockInBtn}
              onClick={() => {
                onClose();
                onStockIn(feed);
              }}
            >
              <PlusCircle size={16} />
              Stock In
            </button>
            <button
              type="button"
              className={styles.footerDispenseBtn}
              disabled={stock <= 0}
              onClick={() => {
                onClose();
                onDispense(feed);
              }}
            >
              <TrendingDown size={16} />
              Dispense Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
