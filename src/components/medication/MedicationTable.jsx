import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  PlusCircle,
  Syringe,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { MEDICATION_TYPES } from '../../services/medicationService.js';
import styles from './MedicationTable.module.css';

/**
 * Medication Inventory Table
 * Interactive catalog with live search, category/status filters, stock bars, and action handlers
 */
export function MedicationTable({
  medications = [],
  onViewDetails,
  onRestock,
  onAdminister,
  onEdit,
  onDelete,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtered and searched data
  const filteredMedications = useMemo(() => {
    return medications.filter((item) => {
      // Type filter
      if (selectedType !== 'All' && item.type !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'All' && item.status !== selectedStatus) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesCode = (item.medicationId || '').toLowerCase().includes(q);
        const matchesIngredient = (item.activeIngredient || '').toLowerCase().includes(q);
        const matchesDisease = (item.targetDisease || '').toLowerCase().includes(q);
        const matchesSupplier = (item.supplier || '').toLowerCase().includes(q);
        return matchesName || matchesCode || matchesIngredient || matchesDisease || matchesSupplier;
      }

      return true;
    });
  }, [medications, selectedType, selectedStatus, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMedications.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMedications.slice(start, start + itemsPerPage);
  }, [filteredMedications, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeInStock}`}>
            <CheckCircle2 size={13} />
            In Stock
          </span>
        );
      case 'Low Stock':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeLowStock}`}>
            <AlertTriangle size={13} />
            Low Stock
          </span>
        );
      case 'Out of Stock':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeOutOfStock}`}>
            <AlertOctagon size={13} />
            Out of Stock
          </span>
        );
      case 'Expired':
        return (
          <span className={`${styles.statusBadge} ${styles.badgeExpired}`}>
            <ShieldAlert size={13} />
            Expired
          </span>
        );
      default:
        return <span className={styles.statusBadge}>{status || 'Normal'}</span>;
    }
  };

  return (
    <div className={styles.tableCard}>
      {/* Control Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by medicine, active ingredient, disease, or supplier..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.filtersWrapper}>
          <div className={styles.filterGroup}>
            <Filter size={15} className={styles.filterIcon} />
            <select
              className={styles.filterSelect}
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Categories</option>
              {MEDICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className={styles.tableResponsive}>
        <table className={styles.medicationTable}>
          <thead>
            <tr>
              <th>Medication Name & ID</th>
              <th>Category</th>
              <th>Active Ingredient</th>
              <th>Target Disease</th>
              <th>Current Stock</th>
              <th>Unit Price (₦)</th>
              <th>Expiry Date</th>
              <th>Withdrawal</th>
              <th>Status</th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <AlertTriangle size={32} className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No medications found</p>
                    <p className={styles.emptyText}>
                      Try adjusting your search criteria or register a new medication product.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedList.map((item) => {
                const stock = Number(item.currentStock) || 0;
                const reorder = Number(item.reorderLevel) || 0;
                const percent = reorder > 0 ? Math.min(100, Math.round((stock / (reorder * 2)) * 100)) : 100;
                const isExpired = item.status === 'Expired';

                return (
                  <tr key={item.id} className={isExpired ? styles.expiredRow : undefined}>
                    <td className={styles.medNameCell}>
                      <div className={styles.medNameWrap}>
                        <strong className={styles.medName}>{item.name}</strong>
                        <span className={styles.medCode}>{item.medicationId}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.typeBadge}>{item.type}</span>
                    </td>
                    <td className={styles.truncateCell} title={item.activeIngredient}>
                      {item.activeIngredient || '—'}
                    </td>
                    <td className={styles.truncateCell} title={item.targetDisease}>
                      {item.targetDisease || 'General Prophylaxis'}
                    </td>
                    <td>
                      <div className={styles.stockCell}>
                        <span className={styles.stockNumber}>
                          {stock} <small>{item.unit}</small>
                        </span>
                        <div className={styles.stockBarTrack}>
                          <div
                            className={`${styles.stockBarFill} ${
                              stock <= 0
                                ? styles.fillDanger
                                : stock <= reorder
                                ? styles.fillWarning
                                : styles.fillSuccess
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className={styles.reorderHint}>Threshold: {reorder}</span>
                      </div>
                    </td>
                    <td className={styles.priceCell}>
                      {formatCurrency(item.unitPrice || 0)}
                      <span className={styles.priceUnit}>/{item.unit}</span>
                    </td>
                    <td className={styles.dateCell}>
                      <span className={isExpired ? styles.expiredText : undefined}>
                        {formatDate(item.expiryDate)}
                      </span>
                    </td>
                    <td className={styles.withdrawalCell}>
                      {Number(item.withdrawalPeriodDays) > 0 ? (
                        <span className={styles.withdrawalBadge} title={`${item.withdrawalPeriodDays} days meat/egg hold`}>
                          {item.withdrawalPeriodDays}d hold
                        </span>
                      ) : (
                        <span className={styles.zeroWithdrawal}>0 days</span>
                      )}
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onViewDetails(item)}
                          title="View Details"
                          aria-label={`View details for ${item.name}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.restockBtn}`}
                          onClick={() => onRestock(item)}
                          title="Stock-In / Purchase"
                          aria-label={`Stock-in for ${item.name}`}
                        >
                          <PlusCircle size={16} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.administerBtn}`}
                          onClick={() => onAdminister(item)}
                          title="Administer Treatment"
                          aria-label={`Administer ${item.name}`}
                          disabled={stock <= 0}
                        >
                          <Syringe size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onEdit(item)}
                          title="Edit Medication"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => onDelete(item)}
                          title="Delete Medication"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 size={16} />
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

      {/* Pagination Bar */}
      {filteredMedications.length > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredMedications.length)}</strong> of{' '}
            <strong>{filteredMedications.length}</strong> items
          </div>
          <div className={styles.paginationButtons}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span className={styles.pageIndicator}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
