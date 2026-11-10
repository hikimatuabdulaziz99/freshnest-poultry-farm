import { useState, useMemo } from 'react';
import {
  Search,
  FilterX,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  ArrowRightLeft,
  Edit2,
  Package,
} from 'lucide-react';
import { formatNaira, STORAGE_LOCATIONS } from '../../services/inventoryService.js';
import styles from './InventoryTable.module.css';

export function InventoryTable({
  items = [],
  categories = [],
  onStockIn,
  onStockOut,
  onAdjust,
  onTransfer,
  onEditItem,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      if (selectedLocation && (item.storageLocation || item.location) !== selectedLocation) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (lowStockOnly && !item.isLowStock && !item.isOutOfStock) return false;
      if (expiringOnly && !item.isNearExpiry && !item.isExpired) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = item.itemId?.toLowerCase().includes(q);
        const nameMatch = (item.itemName || item.name)?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        const locMatch = (item.storageLocation || item.location)?.toLowerCase().includes(q);
        const suppMatch = item.supplier?.toLowerCase().includes(q);
        const skuMatch = item.sku?.toLowerCase().includes(q);

        if (!idMatch && !nameMatch && !descMatch && !catMatch && !locMatch && !suppMatch && !skuMatch) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedCategory, selectedLocation, selectedStatus, lowStockOnly, expiringOnly, searchQuery]);

  const hasActiveFilters = searchQuery || selectedCategory || selectedLocation || selectedStatus || lowStockOnly || expiringOnly;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSelectedStatus('');
    setLowStockOnly(false);
    setExpiringOnly(false);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return styles.statusActive;
      case 'Low Stock':
        return styles.statusLow;
      case 'Out of Stock':
        return styles.statusOut;
      case 'Expired':
        return styles.statusExpired;
      default:
        return '';
    }
  };

  return (
    <div className={styles.tableContainer}>
      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search supplies by name, ID, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          {/* Category Filter */}
          <select
            className={styles.filterSelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Storage Location Filter */}
          <select
            className={styles.filterSelect}
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All Storage Locations</option>
            {STORAGE_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className={styles.filterSelect}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Expired">Expired</option>
          </select>

          {/* Quick Checkboxes */}
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            Low Stock Only
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={expiringOnly}
              onChange={(e) => setExpiringOnly(e.target.checked)}
            />
            Expiring / Expired
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearFilters}
              title="Reset all filters"
            >
              <FilterX size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Storage Location</th>
              <th>Current Balance</th>
              <th>Min / Reorder</th>
              <th>Unit Cost</th>
              <th>Total Value</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="10">
                  <div className={styles.emptyState}>
                    <Package size={40} className={styles.emptyIcon} />
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                      No inventory items found
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                      {hasActiveFilters
                        ? 'Try clearing active filters to view all catalog items.'
                        : 'Add farm supplies, tools, or equipment to the inventory catalog.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const qty = item.currentQuantity || 0;
                return (
                  <tr key={item.id || item.itemId}>
                    <td className={styles.idCell}>
                      {item.itemId || `INV-${String(item.id).padStart(4, '0')}`}
                    </td>
                    <td>
                      <span className={styles.itemTitle}>{item.itemName || item.name}</span>
                      {item.description && (
                        <span className={styles.itemDesc} title={item.description}>
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>{item.category}</span>
                    </td>
                    <td>{item.storageLocation || item.location || 'Main Store'}</td>
                    <td>
                      <span
                        className={styles.qtyValue}
                        style={{
                          color: qty === 0 ? '#dc2626' : item.isLowStock ? '#b45309' : '#1b4332',
                        }}
                      >
                        {qty.toLocaleString()} {item.unit}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {item.minimumStockLevel} / {item.reorderLevel} {item.unit}
                    </td>
                    <td>{formatNaira(item.unitCost || 0)}</td>
                    <td style={{ fontWeight: 700 }}>
                      {formatNaira(item.totalValuation || 0)}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell} style={{ justifyContent: 'center' }}>
                        {/* 1. Stock In */}
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnIn}`}
                          onClick={() => onStockIn(item)}
                          title="Record Stock-In (Receive Supplies)"
                        >
                          <PackagePlus size={15} />
                        </button>

                        {/* 2. Stock Out / Disburse */}
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnOut}`}
                          onClick={() => onStockOut(item)}
                          disabled={qty === 0}
                          style={{ opacity: qty === 0 ? 0.4 : 1, cursor: qty === 0 ? 'not-allowed' : 'pointer' }}
                          title={qty === 0 ? 'Out of stock' : 'Disburse / Use Stock'}
                        >
                          <PackageMinus size={15} />
                        </button>

                        {/* 3. Stock Adjustment */}
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onAdjust(item)}
                          title="Stock Adjustment (Audit Correction)"
                        >
                          <SlidersHorizontal size={14} />
                        </button>

                        {/* 4. Stock Transfer */}
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onTransfer(item)}
                          disabled={qty === 0}
                          style={{ opacity: qty === 0 ? 0.4 : 1, cursor: qty === 0 ? 'not-allowed' : 'pointer' }}
                          title={qty === 0 ? 'Out of stock' : 'Transfer between Storage Locations'}
                        >
                          <ArrowRightLeft size={14} />
                        </button>

                        {/* 5. Edit Item Metadata */}
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onEditItem(item)}
                          title="Edit Item Details"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
