import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Eye,
  Edit3,
  Trash2,
  AlertCircle,
  Layers,
  Bird,
} from 'lucide-react';
import { COMMON_CAUSES } from '../../services/mortalityService.js';
import styles from './MortalityTable.module.css';

export function MortalityTable({
  logs = [],
  batches = [],
  pens = [],
  onViewDetails,
  onEditLog,
  onDeleteLog,
  onExportCSV,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedPen, setSelectedPen] = useState('');
  const [selectedCause, setSelectedCause] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract unique causes from logs to include custom causes
  const allCauses = useMemo(() => {
    const set = new Set(COMMON_CAUSES);
    logs.forEach((l) => {
      if (l.cause) set.add(l.cause);
    });
    return Array.from(set);
  }, [logs]);

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedType && log.recordType !== selectedType) return false;
      if (selectedBatch && String(log.batchId) !== String(selectedBatch)) return false;
      if (selectedPen && String(log.penId) !== String(selectedPen) && log.penName !== selectedPen) return false;
      if (selectedCause && log.cause?.toLowerCase() !== selectedCause.toLowerCase()) return false;
      if (startDate && log.date < startDate) return false;
      if (endDate && log.date > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = log.mortalityId?.toLowerCase().includes(q);
        const codeMatch = log.targetCode?.toLowerCase().includes(q);
        const nameMatch = log.targetName?.toLowerCase().includes(q);
        const causeMatch = log.cause?.toLowerCase().includes(q);
        const penMatch = log.penName?.toLowerCase().includes(q);
        const staffMatch = log.recordedBy?.toLowerCase().includes(q);
        const notesMatch = log.notes?.toLowerCase().includes(q);
        if (!idMatch && !codeMatch && !nameMatch && !causeMatch && !penMatch && !staffMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedType, selectedBatch, selectedPen, selectedCause, startDate, endDate, searchQuery]);

  const hasActiveFilters = searchQuery || selectedBatch || selectedPen || selectedCause || selectedType || startDate || endDate;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedBatch('');
    setSelectedPen('');
    setSelectedCause('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className={styles.tableContainer}>
      {/* 1. Header with Filters & Search */}
      <div className={styles.tableHeaderBar}>
        <div className={styles.searchFilterGroup}>
          {/* Search box */}
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search ID, batch, cause..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Record Type Filter */}
          <select
            className={styles.selectInput}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="BATCH">Flock / Batch</option>
            <option value="BIRD">Individual Bird</option>
          </select>

          {/* Batch Filter */}
          <select
            className={styles.selectInput}
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchCode || b.name}
              </option>
            ))}
          </select>

          {/* Pen Filter */}
          <select
            className={styles.selectInput}
            value={selectedPen}
            onChange={(e) => setSelectedPen(e.target.value)}
          >
            <option value="">All Pens</option>
            {pens
              .filter((p, idx, arr) => arr.findIndex((x) => (x.id || x.penId) === (p.id || p.penId)) === idx)
              .map((p, idx) => (
                <option key={`mort-pen-${p.id || p.penId || idx}`} value={p.id}>
                  {p.name || p.penId}
                </option>
              ))}
          </select>

          {/* Cause Filter */}
          <select
            className={styles.selectInput}
            value={selectedCause}
            onChange={(e) => setSelectedCause(e.target.value)}
          >
            <option value="">All Causes</option>
            {allCauses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            className={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
          />
          <input
            type="date"
            className={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
          />

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleClearFilters}
            >
              Clear
            </button>
          )}
        </div>

        {/* CSV Export */}
        <div className={styles.actionButtonGroup}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={onExportCSV}
            title="Export Mortality Records to CSV"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Responsive Data Table */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mortality ID</th>
              <th>Date</th>
              <th>Type</th>
              <th>Target</th>
              <th>Quantity</th>
              <th>Cause of Death</th>
              <th>Pen / House</th>
              <th>Recorded By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className={styles.emptyState}>
                    <AlertCircle size={36} className={styles.emptyIcon} />
                    <h5 className={styles.emptyTitle}>No Mortality Records Found</h5>
                    <p className={styles.emptyText}>
                      {hasActiveFilters
                        ? 'No records match your selected filter criteria. Try adjusting your search query or clearing filters.'
                        : 'No deceased or culled birds have been recorded yet.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isBatch = log.recordType === 'BATCH';
                return (
                  <tr key={log.id}>
                    <td>
                      <span className={styles.idBadge}>
                        {log.mortalityId || `MORT-${log.id}`}
                      </span>
                    </td>
                    <td>{log.date}</td>
                    <td>
                      <span
                        className={`${styles.typeBadge} ${
                          isBatch ? styles.typeBatch : styles.typeBird
                        }`}
                      >
                        {isBatch ? <Layers size={11} /> : <Bird size={11} />}
                        {isBatch ? 'Batch' : 'Bird'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.targetCell}>
                        <span className={styles.targetName}>
                          {log.targetCode}
                        </span>
                        <span className={styles.targetSub}>
                          {log.targetName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.quantityBadge}>
                        -{log.quantity || log.count || 1}
                      </span>
                    </td>
                    <td>
                      <span className={styles.causeBadge}>{log.cause}</span>
                    </td>
                    <td>{log.penName || 'General Pen'}</td>
                    <td>{log.recordedBy || 'Farm Staff'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => onViewDetails && onViewDetails(log)}
                          title="View Complete Mortality Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => onEditLog && onEditLog(log)}
                          title="Edit Mortality Record"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.deleteBtn}`}
                          onClick={() => onDeleteLog && onDeleteLog(log)}
                          title="Delete Mortality Record"
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
    </div>
  );
}
