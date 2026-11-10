import { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Receipt,
  Egg,
} from 'lucide-react';
import { salesService, formatNaira } from '../../services/salesService.js';
import styles from './ReceiptModal.module.css';

export function ReceiptModal({
  isOpen,
  onClose,
  sale,
}) {
  const [receiptData, setReceiptData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sale) {
      setIsLoading(true);
      salesService.generateReceiptData(sale.saleId || sale.id).then((data) => {
        setReceiptData(data);
      }).catch(console.error).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const farm = receiptData?.farm || {
    name: 'FreshNest Poultry Farm',
    tagline: 'Smart Management for Healthy Poultry Farming',
    address: 'KM 14, Old Abeokuta Expressway, Ogun State, Nigeria',
    phone: '+234 803 123 4567',
    email: 'sales@freshnestpoultry.ng',
  };

  const saleInfo = receiptData?.sale || sale;
  const payments = receiptData?.payments || sale.payments || [];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIcon}>
              <Receipt size={20} />
            </div>
            <div>
              <h3 className={styles.modalTitle}>Sales Receipt & Invoice</h3>
              <p className={styles.modalSubtitle}>
                {saleInfo.saleId || `SALE-${saleInfo.id}`} · Official Farm Transaction Record
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Printable Receipt */}
        <div className={styles.modalBody}>
          <div className={styles.receiptPaper}>
            {/* 1. Farm Header */}
            <div className={styles.receiptTopHeader}>
              <div className={styles.receiptLogoRow}>
                <Egg size={22} color="#1B4332" />
                <span>{farm.name}</span>
              </div>
              <div className={styles.receiptTagline}>{farm.tagline}</div>
              <div className={styles.receiptContact}>
                <div>{farm.address}</div>
                <div>Tel: {farm.phone} · Email: {farm.email}</div>
              </div>
            </div>

            {/* 2. Metadata Grid */}
            <div className={styles.receiptMetaGrid}>
              <div className={styles.metaBlock}>
                <span className={styles.metaLabel}>Receipt / Sale ID:</span>
                <span className={styles.metaVal}>{saleInfo.saleId || saleInfo.invoiceNumber}</span>
              </div>
              <div className={styles.metaBlock} style={{ textAlign: 'right' }}>
                <span className={styles.metaLabel}>Sale Date:</span>
                <span className={styles.metaVal}>{saleInfo.saleDate || saleInfo.date}</span>
              </div>
              <div className={styles.metaBlock}>
                <span className={styles.metaLabel}>Billed To:</span>
                <span className={styles.metaVal}>{saleInfo.customerName}</span>
                {saleInfo.customerPhone && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{saleInfo.customerPhone}</span>
                )}
              </div>
              <div className={styles.metaBlock} style={{ textAlign: 'right' }}>
                <span className={styles.metaLabel}>Payment Status:</span>
                <span
                  className={styles.metaVal}
                  style={{
                    color: saleInfo.paymentStatus === 'Paid' ? '#166534' : (saleInfo.paymentStatus === 'Partial' ? '#b45309' : '#dc2626'),
                    fontWeight: 700,
                  }}
                >
                  {saleInfo.paymentStatus}
                </span>
              </div>
            </div>

            {/* 3. Itemized Purchased Table */}
            <table className={styles.receiptItemsTable}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>{saleInfo.productDescription || saleInfo.productType}</strong>
                    {saleInfo.batchCode && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Batch: {saleInfo.batchCode}</div>
                    )}
                    {saleInfo.birdTag && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tag: {saleInfo.birdTag}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{saleInfo.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatNaira(saleInfo.unitPrice)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNaira(saleInfo.subtotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* 4. Totals Breakdown */}
            <div className={styles.totalsSection}>
              <div className={styles.totalRow}>
                <span>Subtotal:</span>
                <span>{formatNaira(saleInfo.subtotal)}</span>
              </div>
              {Number(saleInfo.discount) > 0 && (
                <div className={styles.totalRow}>
                  <span>Discount:</span>
                  <span style={{ color: '#b91c1c' }}>- {formatNaira(saleInfo.discount)}</span>
                </div>
              )}
              <div className={styles.grandTotalRow}>
                <span>Total Amount Due:</span>
                <span>{formatNaira(saleInfo.totalAmount)}</span>
              </div>
              <div className={styles.totalRow} style={{ marginTop: '0.35rem' }}>
                <span>Total Amount Paid:</span>
                <span style={{ color: '#166534', fontWeight: 700 }}>{formatNaira(saleInfo.amountPaid)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Outstanding Balance:</span>
                <span style={{ color: Number(saleInfo.outstandingBalance) > 0 ? '#b91c1c' : '#166534', fontWeight: 700 }}>
                  {formatNaira(saleInfo.outstandingBalance)}
                </span>
              </div>
            </div>

            {/* 5. Payments History Ledger */}
            {payments.length > 0 && (
              <div className={styles.paymentsHistoryBox}>
                <div className={styles.paymentsHistoryTitle}>Payment Receipts History</div>
                {payments.map((p) => (
                  <div key={p.id || p.paymentId} className={styles.paymentHistoryRow}>
                    <span>{p.paymentId || 'PAY'} · {p.paymentDate || p.date} ({p.paymentMethod})</span>
                    <strong style={{ color: '#166534' }}>{formatNaira(p.amount)}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Footer Note */}
            <div className={styles.receiptFooterNote}>
              Thank you for patronizing FreshNest Poultry Farm!
              <br />
              All livestock & poultry products are guaranteed disease-screened and certified healthy.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnClose} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={styles.btnPrint}
            onClick={handlePrint}
            disabled={isLoading}
          >
            <Printer size={16} />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
