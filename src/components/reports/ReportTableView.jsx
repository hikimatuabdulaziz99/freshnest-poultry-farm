import { useState, useMemo } from 'react';
import {
  Search,
  FilterX,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { formatNaira } from '../../services/reportsService.js';
import styles from './ReportTableView.module.css';

export function ReportTableView({ reportType, reportData, isLoading = false }) {
  const [searchTerm, setSearchTerm] = useState('');

  const records = reportData?.records || [];

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase().trim();

    return records.filter((r) => {
      return Object.values(r).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [records, searchTerm]);

  const renderBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active' || s === 'paid' || s === 'administered' || s === 'completed' || s === 'available') {
      return (
        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
          <CheckCircle2 size={11} /> {status}
        </span>
      );
    }
    if (s === 'partial' || s === 'pending' || s === 'scheduled' || s === 'near capacity' || s === 'low stock') {
      return (
        <span className={`${styles.badge} ${styles.badgeWarning}`}>
          <Clock size={11} /> {status}
        </span>
      );
    }
    if (s === 'unpaid' || s === 'cancelled' || s === 'dead' || s === 'full' || s === 'expired' || s === 'out of stock') {
      return (
        <span className={`${styles.badge} ${styles.badgeDanger}`}>
          <XCircle size={11} /> {status}
        </span>
      );
    }
    return <span className={styles.badge}>{status}</span>;
  };

  // Empty state render
  if (!isLoading && records.length === 0 && reportType !== 'overview' && reportType !== 'financial') {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIconBox}>
          <FileSpreadsheet size={32} className={styles.emptyIcon} />
        </div>
        <h4 className={styles.emptyTitle}>No Records Found for Selected Period</h4>
        <p className={styles.emptyDesc}>
          There are no logged transactions or operational records matching the selected date range.
          Try selecting a wider date preset (e.g. "This Year") or record new data in the corresponding module.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      {/* Search Bar & Header */}
      <div className={styles.tableTopBar}>
        <div className={styles.tableTitleGroup}>
          <h3 className={styles.tableHeading}>{reportData?.title || 'Report Ledger'}</h3>
          <span className={styles.recordCountBadge}>
            {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {records.length > 0 && (
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search in report table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <FilterX size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Render Appropriate Table Based on Report Type */}
      <div className={styles.tableResponsive}>
        {/* 1. Bird Population Report */}
        {reportType === 'birds' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Tag Number</th>
                <th>Breed</th>
                <th>Bird Type</th>
                <th>Cohort Batch</th>
                <th>Housing Pen</th>
                <th>Status</th>
                <th>Hatch Date</th>
                <th>Registration Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.tagNumber}</td>
                  <td>{r.breed}</td>
                  <td>{r.type}</td>
                  <td>{r.batchId}</td>
                  <td>{r.houseNumber}</td>
                  <td>{renderBadge(r.status)}</td>
                  <td>{r.hatchDate}</td>
                  <td className={styles.textMuted}>{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 2. Batch & Pen Report */}
        {reportType === 'batches' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Batch Code</th>
                <th>Breed</th>
                <th>Bird Type</th>
                <th>Pen Location</th>
                <th>Initial Count</th>
                <th>Current Count</th>
                <th>Mortality</th>
                <th>Arrival Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.batchCode}</td>
                  <td>{r.breed}</td>
                  <td>{r.birdType}</td>
                  <td>{r.penId}</td>
                  <td>{(r.initialCount || 0).toLocaleString()}</td>
                  <td className={styles.fontBold}>{(r.currentCount || 0).toLocaleString()}</td>
                  <td className={r.mortalityCount > 0 ? styles.textDanger : ''}>{r.mortalityCount}</td>
                  <td>{r.arrivalDate}</td>
                  <td>{renderBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} className={styles.fontBold}>Totals:</td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.initialCount || 0), 0).toLocaleString()}
                  </td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.currentCount || 0), 0).toLocaleString()}
                  </td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.mortalityCount || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* 3. Feed Consumption Report */}
        {reportType === 'feed' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Date</th>
                <th>Feed Name</th>
                <th>Flock Batch</th>
                <th>Quantity Fed (kg)</th>
                <th>Consumption Rate</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.logId}</td>
                  <td>{r.date}</td>
                  <td>{r.feedName}</td>
                  <td>{r.batchId}</td>
                  <td className={styles.fontBold}>{(r.quantity || 0).toLocaleString()} kg</td>
                  <td>{r.consumptionRate}</td>
                  <td className={styles.textMuted}>{r.recordedBy}</td>
                </tr>
              ))}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} className={styles.fontBold}>Total Feed Consumed:</td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.quantity || 0), 0).toLocaleString()} kg
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* 4. Medication Report */}
        {reportType === 'medication' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Date</th>
                <th>Medication</th>
                <th>Target Flock/Bird</th>
                <th>Dosage Given</th>
                <th>Reason / Disease</th>
                <th>Withdrawal End Date</th>
                <th>Administered By</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.logId}</td>
                  <td>{r.date}</td>
                  <td className={styles.fontBold}>{r.medicationName}</td>
                  <td>{r.target}</td>
                  <td>{r.dosage}</td>
                  <td>{r.reason}</td>
                  <td>
                    {r.isWithdrawalActive ? (
                      <span className={`${styles.badge} ${styles.badgeDanger}`}>
                        <AlertCircle size={10} /> Active until {r.withdrawalEndDate}
                      </span>
                    ) : (
                      r.withdrawalEndDate
                    )}
                  </td>
                  <td className={styles.textMuted}>{r.administeredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 5. Vaccination Report */}
        {reportType === 'vaccination' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Date</th>
                <th>Vaccine Name</th>
                <th>Target Batch</th>
                <th>Administration Method</th>
                <th>Doses Given</th>
                <th>Status</th>
                <th>Administered By</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.logId}</td>
                  <td>{r.date}</td>
                  <td className={styles.fontBold}>{r.vaccineName}</td>
                  <td>{r.batchId}</td>
                  <td>{r.method}</td>
                  <td>{(r.doses || 0).toLocaleString()}</td>
                  <td>{renderBadge(r.status)}</td>
                  <td className={styles.textMuted}>{r.administeredBy}</td>
                </tr>
              ))}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className={styles.fontBold}>Total Doses Administered:</td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (Number(r.doses) || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* 6. Egg Production Report */}
        {reportType === 'eggs' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Date</th>
                <th>Flock Batch</th>
                <th>Total Collected</th>
                <th>Good Eggs</th>
                <th>Cracked</th>
                <th>Dirty</th>
                <th>Hen-Day Laying %</th>
                <th>Collected By</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.logId}</td>
                  <td>{r.date}</td>
                  <td>{r.batchId}</td>
                  <td className={styles.fontBold}>{(r.totalCollected || 0).toLocaleString()}</td>
                  <td className={styles.textSuccess}>{(r.goodEggs || 0).toLocaleString()}</td>
                  <td className={r.crackedEggs > 0 ? styles.textWarning : ''}>{r.crackedEggs}</td>
                  <td className={r.dirtyEggs > 0 ? styles.textWarning : ''}>{r.dirtyEggs}</td>
                  <td className={styles.fontBold}>{r.hdp}</td>
                  <td className={styles.textMuted}>{r.collectedBy}</td>
                </tr>
              ))}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className={styles.fontBold}>Period Totals:</td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.totalCollected || 0), 0).toLocaleString()}
                  </td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.goodEggs || 0), 0).toLocaleString()}
                  </td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.crackedEggs || 0), 0).toLocaleString()}
                  </td>
                  <td className={styles.fontBold}>
                    {filteredRecords.reduce((sum, r) => sum + (r.dirtyEggs || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* 7. Mortality Report */}
        {reportType === 'mortality' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Mortality ID</th>
                <th>Date</th>
                <th>Affected Cohort / Bird</th>
                <th>Deaths Count</th>
                <th>Cause of Death</th>
                <th>Symptoms Observed</th>
                <th>Suspected Disease</th>
                <th>Disposal Method</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.mortalityId}</td>
                  <td>{r.date}</td>
                  <td>{r.batchId}</td>
                  <td className={`${styles.fontBold} ${styles.textDanger}`}>{r.count}</td>
                  <td>{r.cause}</td>
                  <td>{r.symptoms}</td>
                  <td>{r.suspectedDisease}</td>
                  <td>{r.disposalMethod}</td>
                  <td className={styles.textMuted}>{r.recordedBy}</td>
                </tr>
              ))}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className={styles.fontBold}>Total Deaths:</td>
                  <td className={`${styles.fontBold} ${styles.textDanger}`}>
                    {filteredRecords.reduce((sum, r) => sum + (r.count || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            )}
          </table>
        )}

        {/* 8. Sales & Revenue Report */}
        {reportType === 'sales' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Product Type</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Invoiced</th>
                <th>Amount Paid</th>
                <th>Receivables</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.saleId}</td>
                  <td>{r.date}</td>
                  <td>{r.customerName}</td>
                  <td>{r.productType}</td>
                  <td>{r.quantity}</td>
                  <td>{r.unitPrice}</td>
                  <td className={styles.fontBold}>{r.totalAmount}</td>
                  <td className={styles.textSuccess}>{r.amountPaid}</td>
                  <td className={r.outstandingBalance !== '₦0.00' ? styles.textWarning : ''}>{r.outstandingBalance}</td>
                  <td>{renderBadge(r.paymentStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 9. Expenses Report */}
        {reportType === 'expenses' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Expense ID</th>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payee / Supplier</th>
                <th>Total Incurred</th>
                <th>Amount Paid</th>
                <th>Payables</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.expenseId}</td>
                  <td>{r.date}</td>
                  <td>{r.category}</td>
                  <td>{r.description}</td>
                  <td>{r.supplier}</td>
                  <td className={styles.fontBold}>{r.amount}</td>
                  <td className={styles.textSuccess}>{r.amountPaid}</td>
                  <td className={r.outstandingBalance !== '₦0.00' ? styles.textWarning : ''}>{r.outstandingBalance}</td>
                  <td>{renderBadge(r.paymentStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 10. Inventory Report */}
        {reportType === 'inventory' && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Unit Cost</th>
                <th>Valuation</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className={styles.fontBold}>{r.itemId}</td>
                  <td className={styles.fontBold}>{r.name}</td>
                  <td>{r.category}</td>
                  <td>{r.currentQuantity}</td>
                  <td>{r.reorderLevel}</td>
                  <td>{r.unitCost}</td>
                  <td className={styles.fontBold}>{r.valuation}</td>
                  <td>{r.location}</td>
                  <td>{renderBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 11 & 12. Farm Overview & Financial Summary Statements */}
        {(reportType === 'overview' || reportType === 'financial') && (
          <div className={styles.financialStatementContainer}>
            <div className={styles.statementSection}>
              <h4 className={styles.statementTitle}>Operational Performance & Income Statement</h4>
              <table className={styles.statementTable}>
                <tbody>
                  <tr className={styles.statementRowHeader}>
                    <td colSpan={2}>Operating Revenue (Accrual)</td>
                  </tr>
                  <tr>
                    <td className={styles.statementIndent}>Total Invoiced Sales Revenue</td>
                    <td className={styles.statementValue}>{formatNaira(reportData?.summary?.salesRevenue || 0)}</td>
                  </tr>

                  <tr className={styles.statementRowHeader}>
                    <td colSpan={2}>Operating Expenses Incurred (Accrual)</td>
                  </tr>
                  <tr>
                    <td className={styles.statementIndent}>Total Farm Expenditures & Supplies</td>
                    <td className={styles.statementValue}>{formatNaira(reportData?.summary?.expensesIncurred || 0)}</td>
                  </tr>

                  <tr className={styles.statementRowHighlight}>
                    <td>Estimated Operating Profit (Sales − Expenses)</td>
                    <td className={styles.statementValueHighlight}>
                      {formatNaira(reportData?.summary?.estimatedProfit || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.statementSection}>
              <h4 className={styles.statementTitle}>Cashflow & Balance Sheet Items</h4>
              <table className={styles.statementTable}>
                <tbody>
                  <tr className={styles.statementRowHeader}>
                    <td colSpan={2}>Cash Inflows & Outflows</td>
                  </tr>
                  <tr>
                    <td className={styles.statementIndent}>Cash Received from Customers</td>
                    <td className={styles.statementValue}>{formatNaira(reportData?.summary?.paymentsReceived || 0)}</td>
                  </tr>
                  <tr>
                    <td className={styles.statementIndent}>Cash Disbursed to Vendors / Expenses</td>
                    <td className={styles.statementValue}>{formatNaira(reportData?.summary?.expensesPaid || 0)}</td>
                  </tr>
                  <tr className={styles.statementRowHighlight}>
                    <td>Net Operating Cashflow</td>
                    <td className={styles.statementValueHighlight}>
                      {formatNaira((reportData?.summary?.paymentsReceived || 0) - (reportData?.summary?.expensesPaid || 0))}
                    </td>
                  </tr>

                  <tr className={styles.statementRowHeader}>
                    <td colSpan={2}>Receivables & Payables</td>
                  </tr>
                  <tr>
                    <td className={styles.statementIndent}>Outstanding Customer Receivables</td>
                    <td className={styles.statementValue}>{formatNaira(reportData?.summary?.customerReceivables || 0)}</td>
                  </tr>
                  <tr>
                    <td className={styles.statementIndent}>Outstanding Supplier Payables</td>
                    <td className={styles.statementValue}>{formatNaira(reportData?.summary?.supplierPayables || 0)}</td>
                  </tr>
                  <tr>
                    <td className={styles.statementIndent}>General Supplies Inventory Valuation</td>
                    <td className={styles.statementValue}>{formatNaira(reportData?.summary?.generalInventoryValuation || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
