import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  PlusCircle,
  Calendar,
  Syringe,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Thermometer,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import {
  VACCINE_TYPES,
  ADMINISTRATION_METHODS,
} from '../../services/vaccineService.js';
import styles from './VaccineTable.module.css';

/**
 * Vaccine Inventory Catalog Table
 * Supports search, method/type filters, cold chain badges, and operational action triggers
 */
export function VaccineTable({
  vaccines = [],
  onViewDetails,
  onRestock,
  onSchedule,
  onAdminister,
  onEdit,
  onDelete,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedMethod, setSelectedMethod] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtered list
  const filteredVaccines = useMemo(() => {
    return vaccines.filter((item) => {
      if (selectedType !== 'All' && item.vaccineType !== selectedType) {
        return false;
      }

      if (selectedMethod !== 'All' && item.administrationMethod !== selectedMethod) {
        return false;
      }

      if (selectedStatus !== 'All' && item.status !== selectedStatus) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesCode = (item.vaccineId || '').toLowerCase().includes(q);
        const matchesDisease = (item.targetDisease || '').toLowerCase().includes(q);
        const matchesManufacturer = (item.manufacturer || '').toLowerCase().includes(q);
        const matchesSupplier = (item.supplier || '').toLowerCase().includes(q);
        return matchesName || matchesCode || matchesDisease || matchesManufacturer || matchesSupplier;
      }

      return true;
    });
  }, [vaccines, selectedType, selectedMethod, selectedStatus, searchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredVaccines.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVaccines.slice(start, start + itemsPerPage);
  }, [filteredVaccines, currentPage]);

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
            placeholder="Search by vaccine, disease, manufacturer, or supplier..."
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
              <option value="All">All Vaccine Types</option>
              {VACCINE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Methods</option>
              {ADMINISTRATION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
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
        <table className={styles.vaccineTable}>
          <thead>
            <tr>
              <th>Vaccine Name & ID</th>
              <th>Target Disease</th>
              <th>Type</th>
              <th>Method</th>
              <th>Target Age</th>
              <th>Available Stock</th>
              <th>Unit Cost (₦)</th>
              <th>Expiry Date</th>
              <th>Cold Chain</th>
              <th>Status</th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <AlertTriangle size={32} className={styles.emptyIcon} />
                    <p className={styles.emptyTitle}>No vaccines found</p>
                    <p className={styles.emptyText}>
                      Try adjusting your search criteria or register a new vaccine product.
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
                    <td className={styles.nameCell}>
                      <div className={styles.nameWrap}>
                        <strong className={styles.vaccineName}>{item.name}</strong>
                        <span className={styles.vaccineId}>{item.vaccineId}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.diseaseBadge}>{item.targetDisease}</span>
                    </td>
                    <td>
                      <span className={styles.typeText}>{item.vaccineType}</span>
                    </td>
                    <td>
                      <span className={styles.methodBadge}>{item.administrationMethod}</span>
                    </td>
                    <td className={styles.ageCell}>
                      {item.recommendedAgeDays > 0 ? `Day ${item.recommendedAgeDays}` : 'Day 1'}
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
                        <span className={styles.reorderHint}>Reorder: {reorder}</span>
                      </div>
                    </td>
                    <td className={styles.priceCell}>
                      {formatCurrency(item.unitPrice || 0)}
                      <span className={styles.priceUnit}>/{item.unit === 'doses' ? 'dose' : item.unit}</span>
                    </td>
                    <td className={styles.dateCell}>
                      <span className={isExpired ? styles.expiredText : undefined}>
                        {formatDate(item.expiryDate)}
                      </span>
                    </td>
                    <td className={styles.tempCell}>
                      <span className={styles.coldChainBadge} title={item.storageTemperature}>
                        <Thermometer size={12} />
                        {item.storageTemperature?.includes('2°C') ? '2-8°C' : 'Cold Chain'}
                      </span>
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
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.restockBtn}`}
                          onClick={() => onRestock(item)}
                          title="Stock-In / Purchase"
                          aria-label={`Stock-in for ${item.name}`}
                        >
                          <PlusCircle size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.scheduleBtn}`}
                          onClick={() => onSchedule(item)}
                          title="Schedule for Batch"
                          aria-label={`Schedule ${item.name}`}
                        >
                          <Calendar size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.administerBtn}`}
                          onClick={() => onAdminister(item)}
                          title="Administer Vaccine"
                          aria-label={`Administer ${item.name}`}
                          disabled={stock <= 0 || isExpired}
                        >
                          <Syringe size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onEdit(item)}
                          title="Edit Vaccine"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => onDelete(item)}
                          title="Delete Vaccine"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 size={15} />
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
      {filteredVaccines.length > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredVaccines.length)}</strong> of{' '}
            <strong>{filteredVaccines.length}</strong> vaccine items
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
