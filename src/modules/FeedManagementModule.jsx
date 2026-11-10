import { useState, useEffect, useCallback } from 'react';
import {
  Wheat,
  Plus,
  ShoppingBag,
  TrendingDown,
  History,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { feedService, FEED_TYPES, FEED_STATUSES } from '../services/feedService.js';
import { db } from '../database/db.js';
import { FeedStatsGrid } from '../components/feed/FeedStatsGrid.jsx';
import { FeedTable } from '../components/feed/FeedTable.jsx';
import { FeedFormModal } from '../components/feed/FeedFormModal.jsx';
import { FeedPurchaseModal } from '../components/feed/FeedPurchaseModal.jsx';
import { FeedConsumptionModal } from '../components/feed/FeedConsumptionModal.jsx';
import { FeedDetailsModal } from '../components/feed/FeedDetailsModal.jsx';
import { FeedDeleteModal } from '../components/feed/FeedDeleteModal.jsx';
import { FeedHistoryTable } from '../components/feed/FeedHistoryTable.jsx';
import { formatNumber, formatCurrency, formatDate } from '../utils/formatters.js';
import styles from './FeedManagementModule.module.css';

/**
 * FreshNest Module 05: Feed Management
 * Comprehensive Feed Inventory, Stock-In Replenishment, Stock-Out Disbursement,
 * Audit Transaction History, and Biosecurity Alerts.
 */
export function FeedManagementModule({ onNavigateToDashboard: _onNavigateToDashboard, onRefreshDb }) {

  // Navigation & View State
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'purchases' | 'consumption' | 'history' | 'alerts'
  const [statsFilter, setStatsFilter] = useState('all');

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Data State
  const [feeds, setFeeds] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [feedLogs, setFeedLogs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [lowStockFeeds, setLowStockFeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [feedToEdit, setFeedToEdit] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedFeedForPurchase, setSelectedFeedForPurchase] = useState(null);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [selectedFeedForConsumption, setSelectedFeedForConsumption] = useState(null);
  const [selectedFeedForDetails, setSelectedFeedForDetails] = useState(null);
  const [feedToDelete, setFeedToDelete] = useState(null);

  // Toast / Status banner
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Main Data Loading Routine
  const loadModuleData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Determine active status filter from stats cards
      let effectiveStatus = selectedStatus;
      if (statsFilter === 'alerts') {
        effectiveStatus = 'all'; // handled via filter
      }

      const [feedsResult, feedStats, txList, purchaseList, logList, batchList, lowStockList] =
        await Promise.all([
          feedService.getFeeds({
            search: searchQuery,
            type: selectedType,
            status: effectiveStatus,
            sortBy,
            sortOrder,
            page: currentPage,
            limit: itemsPerPage,
          }),
          feedService.getFeedStatistics(),
          feedService.getFeedTransactions(),
          feedService.getFeedPurchases({ limit: 50 }),
          feedService.getFeedLogs({ limit: 50 }),
          db.batches.toArray(),
          feedService.getLowStockFeeds(),
        ]);

      setFeeds(feedsResult.items);
      setTotalCount(feedsResult.totalCount);
      setStats(feedStats);
      setTransactions(txList);
      setPurchases(purchaseList);
      setFeedLogs(logList);
      setBatches(batchList.filter((b) => b.status !== 'Completed' && b.status !== 'Archived'));
      setLowStockFeeds(lowStockList);
    } catch (err) {
      console.error('Failed to load feed management data:', err);
      showToast('Error refreshing feed data: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedType, selectedStatus, statsFilter, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    loadModuleData();
  }, [loadModuleData]);

  // Handle Quick Stats Selection
  const handleSelectStatsFilter = (filterId) => {
    setStatsFilter(filterId);
    if (filterId === 'alerts') {
      setActiveTab('alerts');
    } else if (filterId === 'purchases') {
      setActiveTab('purchases');
    } else if (filterId === 'consumed') {
      setActiveTab('consumption');
    } else {
      setActiveTab('inventory');
      setSelectedStatus('all');
    }
  };

  // CRUD Handlers
  const handleSaveFeed = async (payload, id) => {
    if (id) {
      await feedService.updateFeed(id, payload);
      showToast(`Feed product "${payload.name}" updated successfully.`);
    } else {
      const created = await feedService.createFeed(payload);
      showToast(`Feed product "${created.name}" registered with ID ${created.feedId}.`);
    }
    await loadModuleData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleSavePurchase = async (payload) => {
    const result = await feedService.recordFeedPurchase(payload);
    showToast(
      `Stock-In recorded! Added ${payload.quantity} ${result.updatedFeed?.unit} of ${result.updatedFeed?.name}.`
    );
    await loadModuleData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleSaveConsumption = async (payload, options) => {
    const result = await feedService.recordFeedConsumption(payload, options);
    showToast(
      `Disbursed ${payload.quantity} ${result.updatedFeed?.unit} of ${result.updatedFeed?.name} successfully.`
    );
    await loadModuleData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleDeleteFeed = async (id, options) => {
    await feedService.deleteFeed(id, options);
    showToast('Feed product removed successfully.');
    await loadModuleData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleArchiveFeed = async (id) => {
    await feedService.updateFeed(id, { status: 'Out of Stock', notes: '[Archived product]' });
    showToast('Feed product archived safely.');
    await loadModuleData();
    if (onRefreshDb) onRefreshDb();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className={styles.moduleContainer}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`${styles.toast} ${
            toastMessage.type === 'error' ? styles.toastError : styles.toastSuccess
          }`}
        >
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Module Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>
            <Wheat size={28} />
          </div>
          <div>
            <div className={styles.badgeRow}>
              <span className={styles.moduleBadge}>Module 05 · Feed Management</span>
              <span className={styles.currencyBadge}>Currency: Nigerian Naira (₦)</span>
            </div>
            <h1 className={styles.title}>Feed Inventory & Ration Management</h1>
            <p className={styles.subtitle}>
              Monitor feed silos, record verified stock replenishments in ₦, disburse flock rations,
              and enforce strict biosecurity and negative-stock prevention.
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => {
              setFeedToEdit(null);
              setIsFormModalOpen(true);
            }}
          >
            <Plus size={16} />
            Add Feed Product
          </button>
          <button
            type="button"
            className={styles.stockInActionBtn}
            onClick={() => {
              setSelectedFeedForPurchase(null);
              setIsPurchaseModalOpen(true);
            }}
          >
            <ShoppingBag size={16} />
            Record Purchase (Stock In)
          </button>
          <button
            type="button"
            className={styles.dispenseActionBtn}
            onClick={() => {
              setSelectedFeedForConsumption(null);
              setIsConsumptionModalOpen(true);
            }}
          >
            <TrendingDown size={16} />
            Record Feeding (Stock Out)
          </button>
        </div>
      </div>

      {/* 6-Card Feed Statistics Grid */}
      <FeedStatsGrid
        stats={stats}
        activeFilter={statsFilter}
        onSelectFilter={handleSelectStatsFilter}
      />

      {/* Main Content Tabs */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'inventory' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Wheat size={16} />
          Inventory Catalog ({stats?.totalProducts ?? 0})
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'purchases' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('purchases')}
        >
          <ShoppingBag size={16} />
          Stock-In Orders ({purchases.length})
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'consumption' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('consumption')}
        >
          <TrendingDown size={16} />
          Flock Feeding Logs ({feedLogs.length})
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'history' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          Transaction Audit Ledger ({transactions.length})
        </button>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'alerts' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <AlertTriangle size={16} />
          Stock Alerts ({lowStockFeeds.length})
        </button>
      </div>

      {/* TAB 1: INVENTORY CATALOG */}
      {activeTab === 'inventory' && (
        <div className={styles.tabContent}>
          {/* Controls Bar */}
          <div className={styles.controlsBar}>
            {/* Search */}
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search feed name, ID, brand, location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.searchInput}
              />
            </div>

            {/* Filter by Type */}
            <div className={styles.filterGroup}>
              <Filter size={15} className={styles.filterIcon} />
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.selectFilter}
              >
                <option value="all">All Feed Types</option>
                {FEED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className={styles.filterGroup}>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.selectFilter}
              >
                <option value="all">All Stock Statuses</option>
                {FEED_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className={styles.filterGroup}>
              <SlidersHorizontal size={15} className={styles.filterIcon} />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className={styles.selectFilter}
              >
                <option value="name-asc">Sort by Name (A-Z)</option>
                <option value="name-desc">Sort by Name (Z-A)</option>
                <option value="currentStock-desc">Stock Level (Highest)</option>
                <option value="currentStock-asc">Stock Level (Lowest)</option>
                <option value="unitCost-desc">Unit Cost (Highest ₦)</option>
                <option value="unitCost-asc">Unit Cost (Lowest ₦)</option>
                <option value="expiryDate-asc">Expiry Date (Earliest)</option>
              </select>
            </div>

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={loadModuleData}
              title="Refresh inventory"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Table */}
          <FeedTable
            feeds={feeds}
            isLoading={isLoading}
            onViewDetails={(feed) => setSelectedFeedForDetails(feed)}
            onEditFeed={(feed) => {
              setFeedToEdit(feed);
              setIsFormModalOpen(true);
            }}
            onDeleteFeed={(feed) => setFeedToDelete(feed)}
            onStockIn={(feed) => {
              setSelectedFeedForPurchase(feed);
              setIsPurchaseModalOpen(true);
            }}
            onDispenseFeed={(feed) => {
              setSelectedFeedForConsumption(feed);
              setIsConsumptionModalOpen(true);
            }}
            onAddNewFeed={() => {
              setFeedToEdit(null);
              setIsFormModalOpen(true);
            }}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.paginationBar}>
              <span className={styles.paginationInfo}>
                Showing {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} feeds
              </span>
              <div className={styles.paginationButtons}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className={styles.pageIndicator}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PURCHASES / STOCK-IN */}
      {activeTab === 'purchases' && (
        <div className={styles.tabContent}>
          <div className={styles.subTabHeader}>
            <div>
              <h3 className={styles.subTabTitle}>Feed Replenishment Orders</h3>
              <p className={styles.subTabSubtitle}>
                Complete audit ledger of incoming shipments, supplier contacts, and costs in ₦
              </p>
            </div>
            <button
              type="button"
              className={styles.subTabActionBtn}
              onClick={() => {
                setSelectedFeedForPurchase(null);
                setIsPurchaseModalOpen(true);
              }}
            >
              <ShoppingBag size={15} />
              New Purchase Order
            </button>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.simpleTable}>
              <thead>
                <tr>
                  <th>Purchase ID</th>
                  <th>Date</th>
                  <th>Feed Product</th>
                  <th>Quantity In</th>
                  <th>Unit Price (₦)</th>
                  <th>Total Spent (₦)</th>
                  <th>Supplier / Mill</th>
                  <th>Invoice Ref</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyTd}>
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={styles.codeBadge}>{p.purchaseId}</span>
                      </td>
                      <td>{formatDate(p.purchaseDate)}</td>
                      <td>
                        <strong>{p.feedName}</strong>
                      </td>
                      <td className={styles.positiveQty}>
                        +{formatNumber(p.quantity)} {p.unit}
                      </td>
                      <td>{formatCurrency(p.unitCost)}</td>
                      <td className={styles.boldCell}>{formatCurrency(p.totalCost)}</td>
                      <td>{p.supplier}</td>
                      <td>{p.invoiceNumber || '—'}</td>
                      <td>{p.recordedBy || 'Admin'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FEEDING LOGS / STOCK-OUT */}
      {activeTab === 'consumption' && (
        <div className={styles.tabContent}>
          <div className={styles.subTabHeader}>
            <div>
              <h3 className={styles.subTabTitle}>Daily Flock Feeding Logs</h3>
              <p className={styles.subTabSubtitle}>
                Batch disbursement logs with consumption rates and per-bird calculations
              </p>
            </div>
            <button
              type="button"
              className={styles.subTabActionBtn}
              onClick={() => {
                setSelectedFeedForConsumption(null);
                setIsConsumptionModalOpen(true);
              }}
            >
              <TrendingDown size={15} />
              Record Feeding Session
            </button>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.simpleTable}>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Date</th>
                  <th>Session</th>
                  <th>Recipient Batch</th>
                  <th>Feed Product</th>
                  <th>Disbursed Quantity</th>
                  <th>Birds Fed</th>
                  <th>Consumption Rate</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {feedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyTd}>
                      No feeding logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  feedLogs.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span className={styles.codeBadge}>{l.logId}</span>
                      </td>
                      <td>{formatDate(l.date)}</td>
                      <td>
                        <span className={styles.sessionTag}>{l.session}</span>
                      </td>
                      <td>{l.batchCode || (l.batchId ? `Batch #${l.batchId}` : 'General Flock')}</td>
                      <td>
                        <strong>{l.feedName}</strong>
                      </td>
                      <td className={styles.negativeQty}>
                        -{formatNumber(l.quantity)} {l.unit}
                      </td>
                      <td>{l.birdsFed ? `${formatNumber(l.birdsFed)} birds` : '—'}</td>
                      <td className={styles.boldCell}>
                        {l.consumptionPerBirdGrams ? `${l.consumptionPerBirdGrams} g/bird` : '—'}
                      </td>
                      <td>{l.recordedBy || 'Admin'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TRANSACTION AUDIT LEDGER */}
      {activeTab === 'history' && (
        <div className={styles.tabContent}>
          <FeedHistoryTable
            transactions={transactions}
            isLoading={isLoading}
            onRecordPurchase={() => {
              setSelectedFeedForPurchase(null);
              setIsPurchaseModalOpen(true);
            }}
            onRecordFeeding={() => {
              setSelectedFeedForConsumption(null);
              setIsConsumptionModalOpen(true);
            }}
          />
        </div>
      )}

      {/* TAB 5: STOCK ALERTS & SAFETY */}
      {activeTab === 'alerts' && (
        <div className={styles.tabContent}>
          <div className={styles.subTabHeader}>
            <div>
              <h3 className={styles.subTabTitle}>Inventory Stock Alerts & Safety Notices</h3>
              <p className={styles.subTabSubtitle}>
                Feed items currently at or below minimum reorder thresholds or past expiration
              </p>
            </div>
          </div>

          {lowStockFeeds.length === 0 ? (
            <div className={styles.allClearCard}>
              <Wheat size={36} className={styles.allClearIcon} />
              <h4>All Feeds Well Stocked</h4>
              <p>No products are currently low on stock or past their expiration dates.</p>
            </div>
          ) : (
            <div className={styles.alertsGrid}>
              {lowStockFeeds.map((feed) => {
                const isExpired = feed.status === 'Expired';
                const isOut = feed.status === 'Out of Stock';
                return (
                  <div
                    key={feed.id}
                    className={`${styles.alertCard} ${
                      isExpired ? styles.alertExpired : isOut ? styles.alertOut : styles.alertLow
                    }`}
                  >
                    <div className={styles.alertCardHeader}>
                      <div className={styles.alertCardTitleGroup}>
                        <AlertTriangle size={18} className={styles.alertCardIcon} />
                        <div>
                          <h4 className={styles.alertCardTitle}>{feed.name}</h4>
                          <span className={styles.alertCardSub}>
                            {feed.feedId || `FEED-${feed.id}`} · {feed.type}
                          </span>
                        </div>
                      </div>
                      <span className={styles.alertStatusBadge}>{feed.status}</span>
                    </div>

                    <div className={styles.alertMetrics}>
                      <div className={styles.alertMetric}>
                        <span className={styles.alertMetricLabel}>Current Stock:</span>
                        <span className={styles.alertMetricValue}>
                          {formatNumber(feed.currentStock)} {feed.unit}
                        </span>
                      </div>
                      <div className={styles.alertMetric}>
                        <span className={styles.alertMetricLabel}>Reorder Threshold:</span>
                        <span className={styles.alertMetricValue}>
                          {formatNumber(feed.reorderLevel)} {feed.unit}
                        </span>
                      </div>
                      <div className={styles.alertMetric}>
                        <span className={styles.alertMetricLabel}>Expiry Date:</span>
                        <span
                          className={`${styles.alertMetricValue} ${
                            isExpired ? styles.textDanger : ''
                          }`}
                        >
                          {formatDate(feed.expiryDate)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.alertActions}>
                      <button
                        type="button"
                        className={styles.alertRestockBtn}
                        onClick={() => {
                          setSelectedFeedForPurchase(feed);
                          setIsPurchaseModalOpen(true);
                        }}
                      >
                        <ShoppingBag size={14} />
                        Restock Now (Stock In)
                      </button>
                      <button
                        type="button"
                        className={styles.alertViewBtn}
                        onClick={() => setSelectedFeedForDetails(feed)}
                      >
                        View Product
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALL MODALS */}
      <FeedFormModal
        isOpen={isFormModalOpen}
        feedToEdit={feedToEdit}
        onClose={() => {
          setIsFormModalOpen(false);
          setFeedToEdit(null);
        }}
        onSave={handleSaveFeed}
      />

      <FeedPurchaseModal
        isOpen={isPurchaseModalOpen}
        feeds={feeds}
        preselectedFeed={selectedFeedForPurchase}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setSelectedFeedForPurchase(null);
        }}
        onSavePurchase={handleSavePurchase}
      />

      <FeedConsumptionModal
        isOpen={isConsumptionModalOpen}
        feeds={feeds}
        batches={batches}
        preselectedFeed={selectedFeedForConsumption}
        onClose={() => {
          setIsConsumptionModalOpen(false);
          setSelectedFeedForConsumption(null);
        }}
        onSaveConsumption={handleSaveConsumption}
      />

      <FeedDetailsModal
        isOpen={Boolean(selectedFeedForDetails)}
        feed={selectedFeedForDetails}
        onClose={() => setSelectedFeedForDetails(null)}
        onStockIn={(feed) => {
          setSelectedFeedForPurchase(feed);
          setIsPurchaseModalOpen(true);
        }}
        onDispense={(feed) => {
          setSelectedFeedForConsumption(feed);
          setIsConsumptionModalOpen(true);
        }}
        onEdit={(feed) => {
          setFeedToEdit(feed);
          setIsFormModalOpen(true);
        }}
      />

      <FeedDeleteModal
        isOpen={Boolean(feedToDelete)}
        feed={feedToDelete}
        onClose={() => setFeedToDelete(null)}
        onDelete={handleDeleteFeed}
        onArchive={handleArchiveFeed}
      />
    </div>
  );
}
