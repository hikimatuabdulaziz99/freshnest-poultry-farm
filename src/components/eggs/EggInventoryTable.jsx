import { useState } from 'react';
import {
  Boxes,
  Plus,
  Download,
  Search,
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';
import { EGG_GRADES, MOVEMENT_TYPES } from '../../services/eggProductionService.js';
import styles from './EggInventoryTable.module.css';

/**
 * Egg Inventory Balances & Stock Movements Ledger
 */
export function EggInventoryTable({
  stock = {},
  movements = [],
  onOpenMovementModal,
  onExportCSV,
}) {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const byGrade = stock?.byGrade || {};

  const filteredMovements = movements.filter((m) => {
    if (selectedGrade && m.grade !== selectedGrade) return false;
    if (selectedType && m.movementType !== selectedType) return false;
    if (startDate && m.movementDate < startDate) return false;
    if (endDate && m.movementDate > endDate) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchId = m.movementId && m.movementId.toLowerCase().includes(q);
      const matchRef = m.referenceId && m.referenceId.toLowerCase().includes(q);
      const matchNotes = m.notes && m.notes.toLowerCase().includes(q);
      if (!matchId && !matchRef && !matchNotes) return false;
    }
    return true;
  });

  const gradeCards = [
    { grade: 'Grade A', count: byGrade['Grade A'] || 0, class: styles.cardGradeA },
    { grade: 'Grade B', count: byGrade['Grade B'] || 0, class: styles.cardGradeB },
    { grade: 'Small Eggs', count: byGrade['Small Eggs'] || 0, class: styles.cardSmall },
    { grade: 'Cracked Eggs', count: byGrade['Cracked Eggs'] || 0, class: styles.cardCracked },
    { grade: 'Dirty Eggs', count: byGrade['Dirty Eggs'] || 0, class: styles.cardDirty },
    { grade: 'Damaged / Rejected Eggs', count: byGrade['Damaged / Rejected Eggs'] || 0, class: styles.cardDamaged },
  ];

  return (
    <div className={styles.inventoryContainer}>
      {/* 1. Stock Balances by Grade */}
      <div className={styles.stockCardsGrid}>
        {gradeCards.map((c) => {
          const crates = Math.floor(c.count / 30);
          const loose = c.count % 30;
          return (
            <div key={c.grade} className={`${styles.stockCard} ${c.class}`}>
              <div className={styles.stockCardHeader}>
                <span className={styles.stockGradeTitle}>{c.grade}</span>
                <Boxes size={16} color="#64748b" />
              </div>
              <div className={styles.stockValue}>{formatNumber(c.count)}</div>
              <div className={styles.stockCrates}>
                {crates} crates{loose > 0 ? `, ${loose} loose` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Stock Movement Ledger Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderBar}>
          <div className={styles.filterGroup}>
            <div style={{ position: 'relative', minWidth: 200, flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search movements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                style={{ paddingLeft: 32, width: '100%' }}
              />
            </div>

            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">All Grades</option>
              {EGG_GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">All Movement Types</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
              title="Start Date"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
              title="End Date"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onExportCSV}
              className={styles.btnSecondary}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onOpenMovementModal}
              className={styles.btnPrimary}
            >
              <Plus size={15} />
              <span>Record Stock Movement</span>
            </button>
          </div>
        </div>

        <div className={styles.responsiveTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Movement ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Grade</th>
                <th>Quantity</th>
                <th>Crates</th>
                <th>Reference / Reason</th>
                <th>Recorded By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length > 0 ? (
                filteredMovements.map((mov) => {
                  const isPositive = ['COLLECTION', 'IN', 'ADJUSTMENT_IN'].includes(mov.movementType);
                  const crates = Math.floor(mov.quantity / 30);
                  const loose = mov.quantity % 30;

                  let typeStyle = styles.typeIn;
                  if (mov.movementType === 'SALE') typeStyle = styles.typeOut;
                  else if (['DAMAGE', 'DISPOSAL'].includes(mov.movementType)) typeStyle = styles.typeDamage;
                  else if (mov.movementType === 'ADJUSTMENT') typeStyle = styles.typeAdjustment;

                  return (
                    <tr key={mov.id || mov.movementId}>
                      <td>
                        <span className={styles.movIdPill}>{mov.movementId}</span>
                      </td>
                      <td>{mov.movementDate}</td>
                      <td>
                        <span className={`${styles.typeBadge} ${typeStyle}`}>
                          {mov.movementType}
                        </span>
                      </td>
                      <td><strong>{mov.grade}</strong></td>
                      <td className={`${styles.qtyCell} ${isPositive ? styles.qtyPos : styles.qtyNeg}`}>
                        {isPositive ? '+' : '-'}{formatNumber(mov.quantity)}
                      </td>
                      <td>
                        {crates} crates{loose > 0 ? ` + ${loose}` : ''}
                      </td>
                      <td>{mov.referenceId || '-'}</td>
                      <td>{mov.recordedBy || 'Staff'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{mov.notes || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className={styles.emptyState}>
                      <Boxes size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                      <p>No inventory movements recorded yet. Collections automatically credit stock here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
