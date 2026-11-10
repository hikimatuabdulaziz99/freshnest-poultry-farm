import {
  Wheat,
  PlusCircle,
  TrendingDown,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  Layers,
  MapPin,
  Calendar,
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '../../utils/formatters.js';
import styles from './FeedTable.module.css';

/**
 * Status Badge Renderer
 */
function StatusBadge({ status }) {
  let badgeClass = styles.badgeInStock;
  let icon = null;

  if (status === 'Expired') {
    badgeClass = styles.badgeExpired;
    icon = <Clock size={12} />;
  } else if (status === 'Out of Stock') {
    badgeClass = styles.badgeOutOfStock;
    icon = <AlertTriangle size={12} />;
  } else if (status === 'Low Stock') {
    badgeClass = styles.badgeLowStock;
    icon = <AlertTriangle size={12} />;
  }

  return (
    <span className={`${styles.badge} ${badgeClass}`}>
      {icon}
      {status}
    </span>
  );
}

/**
 * Feed Inventory Catalog Table
 */
export function FeedTable({
  feeds = [],
  isLoading = false,
  onViewDetails,
  onEditFeed,
  onDeleteFeed,
  onStockIn,
  onDispenseFeed,
  onAddNewFeed,
}) {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <span>Loading feed inventory records...</span>
      </div>
    );
  }

  if (!feeds || feeds.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIconBox}>
          <Wheat size={40} />
        </div>
        <h3 className={styles.emptyTitle}>No Feed Products Found</h3>
        <p className={styles.emptyText}>
          No feed products match the current filter or search criteria. Register your feeds,
          rations, and custom formulations to track stock in Nigerian Naira (₦).
        </p>
        <button type="button" className={styles.emptyActionBtn} onClick={onAddNewFeed}>
          <PlusCircle size={16} />
          Register New Feed Product
        </button>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Feed ID & Name</th>
            <th>Type & Form</th>
            <th>Target Bird</th>
            <th>Current Stock</th>
            <th>Reorder Level</th>
            <th>Unit Cost (₦)</th>
            <th>Inventory Value (₦)</th>
            <th>Status</th>
            <th>Expiry Date</th>
            <th className={styles.actionsHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {feeds.map((feed) => {
            const stock = Number(feed.currentStock) || 0;
            const reorder = Number(feed.reorderLevel) || 0;
            const unitCost = Number(feed.unitCost) || 0;
            const totalVal = stock * unitCost;
            const isNearExpiry =
              feed.expiryDate &&
              new Date(feed.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // Calculate percentage of reorder level for visual bar
            const stockPercent = reorder > 0 ? Math.min(100, Math.round((stock / (reorder * 2)) * 100)) : 100;

            return (
              <tr key={feed.id} className={styles.tableRow}>
                {/* ID & Name */}
                <td>
                  <div className={styles.nameCell}>
                    <span className={styles.feedIdBadge}>{feed.feedId || `FEED-${feed.id}`}</span>
                    <button
                      type="button"
                      className={styles.nameButton}
                      onClick={() => onViewDetails(feed)}
                    >
                      {feed.name}
                    </button>
                    <span className={styles.brandSubtext}>
                      {feed.brand || 'Standard Mill'}
                      {feed.storageLocation ? ` · ${feed.storageLocation}` : ''}
                    </span>
                  </div>
                </td>

                {/* Type & Form */}
                <td>
                  <div className={styles.typeCell}>
                    <span className={styles.typeText}>{feed.type}</span>
                    <span className={styles.formBadge}>{feed.form || 'Mash'}</span>
                  </div>
                </td>

                {/* Target Bird */}
                <td>
                  <span className={styles.targetBirdTag}>
                    <Layers size={12} />
                    {feed.targetBirdType || 'All Birds'}
                  </span>
                </td>

                {/* Current Stock */}
                <td>
                  <div className={styles.stockCell}>
                    <span className={`${styles.stockValue} ${stock <= reorder ? styles.stockWarning : ''}`}>
                      {formatNumber(stock)} {feed.unit || 'kg'}
                    </span>
                    <div className={styles.stockBarTrack}>
                      <div
                        className={`${styles.stockBarFill} ${
                          stock <= 0
                            ? styles.barDanger
                            : stock <= reorder
                            ? styles.barWarning
                            : styles.barSuccess
                        }`}
                        style={{ width: `${Math.max(5, stockPercent)}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Reorder Level */}
                <td>
                  <span className={styles.reorderText}>
                    {formatNumber(reorder)} {feed.unit || 'kg'}
                  </span>
                </td>

                {/* Unit Cost */}
                <td>
                  <span className={styles.costText}>{formatCurrency(unitCost)}</span>
                  <span className={styles.perUnitLabel}>per {feed.unit || 'kg'}</span>
                </td>

                {/* Inventory Value */}
                <td>
                  <span className={styles.inventoryValue}>{formatCurrency(totalVal)}</span>
                </td>

                {/* Status */}
                <td>
                  <StatusBadge status={feed.status} />
                </td>

                {/* Expiry Date */}
                <td>
                  <div className={styles.expiryCell}>
                    <span className={`${styles.dateText} ${isNearExpiry ? styles.expiryWarning : ''}`}>
                      <Calendar size={12} />
                      {formatDate(feed.expiryDate)}
                    </span>
                    {feed.storageLocation && (
                      <span className={styles.locationSubtext}>
                        <MapPin size={10} />
                        {feed.storageLocation}
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td>
                  <div className={styles.actionButtons}>
                    {/* Quick Stock-In */}
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionStockIn}`}
                      title="Record Purchase / Stock-In"
                      onClick={() => onStockIn(feed)}
                    >
                      <PlusCircle size={15} />
                    </button>

                    {/* Quick Feeding */}
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionDispense}`}
                      title="Disburse / Feed Batch"
                      disabled={stock <= 0}
                      onClick={() => onDispenseFeed(feed)}
                    >
                      <TrendingDown size={15} />
                    </button>

                    {/* View Details */}
                    <button
                      type="button"
                      className={styles.actionBtn}
                      title="View Specifications & History"
                      onClick={() => onViewDetails(feed)}
                    >
                      <Eye size={15} />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      className={styles.actionBtn}
                      title="Edit Feed Product"
                      onClick={() => onEditFeed(feed)}
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionDelete}`}
                      title="Delete or Archive Feed"
                      onClick={() => onDeleteFeed(feed)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
