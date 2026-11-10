import { useState, useMemo } from 'react';
import {
  Search,
  FilterX,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  ArrowRightLeft,
} from 'lucide-react';
import { MOVEMENT_TYPES, STORAGE_LOCATIONS } from '../../services/inventoryService.js';
import styles from './StockMovementsTable.module.css';

export function StockMovementsTable({ movements = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (selectedType && m.movementType !== selectedType) return false;
      if (selectedLocation && m.storageLocation !== selectedLocation) return false;
      if (startDate && (m.date || m.movementDate) < startDate) return false;
      if (endDate && (m.date || m.movementDate) > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = m.movementId?.toLowerCase().includes(q);
        const itemMatch = m.itemId?.toLowerCase().includes(q) || m.itemName?.toLowerCase().includes(q);
        const reasonMatch = m.reason?.toLowerCase().includes(q) || m.referenceNumber?.toLowerCase().includes(q);
        const userMatch = m.recordedBy?.toLowerCase().includes(q);
        if (!idMatch && !itemMatch && !reasonMatch && !userMatch) return false;
      }

      return true;
    });
  }, [movements, selectedType, selectedLocation, startDate, endDate, searchQuery]);

  const hasActiveFilters = searchQuery || selectedType || selectedLocation || startDate || endDate;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedLocation('');
    setStartDate('');
    setEndDate('');
  };

  const getMovementTypeBadge = (type) => {
    switch (type) {
      case 'STOCK_IN':
        return (
          <span className={`${styles.typeBadge} ${styles.typeStockIn}`}>
            <ArrowDownLeft size={12} /> Stock Received
          </span>
        );
      case 'STOCK_OUT':
        return (
          <span className={`${styles.typeBadge} ${styles.typeStockOut}`}>
            <ArrowUpRight size={12} /> Stock Used
          </span>
        );
      case 'ADJUSTMENT_INCREASE':
        return (
          <span className={`${styles.typeBadge} ${styles.typeAdjInc}`}>
            <Sliders size={12} /> Adjustment (+)
          </span>
        );
      case 'ADJUSTMENT_DECREASE':
        return (
          <span className={`${styles.typeBadge} ${styles.typeAdjDec}`}>
            <Sliders size={12} /> Adjustment (-)
          </span>
        );
      case 'TRANSFER_OUT':
        return (
          <span className={`${styles.typeBadge} ${styles.typeTransfer}`}>
            <ArrowRightLeft size={12} /> Transfer OUT
          </span>
        );
      case 'TRANSFER_IN':
        return (
          <span className={`${styles.typeBadge} ${styles.typeTransfer}`}>
            <ArrowRightLeft size={12} /> Transfer IN
          </span>
        );
      default:
        return (
          <span className={styles.typeBadge}>
            {type}
          </span>
        );
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
            placeholder="Search movements by ID, item, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterControls}>
          {/* Movement Type Filter */}
          <select
            className={styles.filterSelect}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Movement Types</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* Storage Location Filter */}
          <select
            className={styles.filterSelect}
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {STORAGE_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start date"
          />
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End date"
          />

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

      {/* Movements Table */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Movement ID</th>
              <th>Date</th>
              <th>Item Name</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Balance Flow</th>
              <th>Storage Location</th>
              <th>Reason / Purpose / Ref</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <div className={styles.emptyState}>
                    <History size={40} style={{ margin: '0 auto 0.75rem', color: '#a0aec0', display: 'block' }} />
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                      No inventory movements recorded
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                      Stock-in, stock-out, adjustment, and transfer transactions will be logged here with immutable audit trails.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => (
                <tr key={m.id || m.movementId}>
                  <td className={styles.idCell}>{m.movementId}</td>
                  <td>{m.date || m.movementDate}</td>
                  <td>
                    <strong>{m.itemName}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.itemId}</div>
                  </td>
                  <td>{getMovementTypeBadge(m.movementType)}</td>
                  <td style={{ fontWeight: 700 }}>
                    {m.movementType === 'STOCK_IN' || m.movementType === 'ADJUSTMENT_INCREASE' || m.movementType === 'TRANSFER_IN' ? '+' : '-'}
                    {m.quantity} {m.unit || 'units'}
                  </td>
                  <td>
                    <span className={styles.balanceFlow}>
                      {m.previousBalance} → <span className={styles.newBalanceText}>{m.newBalance}</span> {m.unit || 'units'}
                    </span>
                  </td>
                  <td>{m.storageLocation}</td>
                  <td style={{ maxWidth: 220, fontSize: '0.8125rem' }}>
                    {m.reason || m.referenceNumber || '—'}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{m.recordedBy || 'Administrator'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
