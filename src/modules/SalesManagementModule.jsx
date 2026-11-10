import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Calendar,
  Download,
  ShoppingBag,
  List,
  BarChart2,
} from 'lucide-react';
import { db } from '../database/db.js';
import { salesService } from '../services/salesService.js';
import { SalesStatCards } from '../components/sales/SalesStatCards.jsx';
import { SalesTable } from '../components/sales/SalesTable.jsx';
import { SaleRecordModal } from '../components/sales/SaleRecordModal.jsx';
import { PaymentRecordModal } from '../components/sales/PaymentRecordModal.jsx';
import { ReceiptModal } from '../components/sales/ReceiptModal.jsx';
import { SaleCancelModal } from '../components/sales/SaleCancelModal.jsx';
import { SalesAnalyticsCard } from '../components/sales/SalesAnalyticsCard.jsx';
import styles from './SalesManagementModule.module.css';

/**
 * Module 10: FreshNest Sales & Revenue Management Module
 * Offline-first point of sale, customer receivables ledger, live bird flock deductions,
 * egg inventory sync, part/full payments, and printable receipts.
 */
export function SalesManagementModule() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'analytics'
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [birds, setBirds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTargetSale, setPaymentTargetSale] = useState(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptTargetSale, setReceiptTargetSale] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetSale, setCancelTargetSale] = useState(null);

  // Load all module data from IndexedDB
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Seed demo sales if empty
      await salesService.seedInitialSalesData();

      // 2. Fetch parallel data
      const [allSales, allStats, allBatches, allBirds] = await Promise.all([
        salesService.getSales(),
        salesService.getSalesStats(),
        db.batches.toArray(),
        db.birds.toArray(),
      ]);

      setSales(allSales);
      setStats(allStats);
      setBatches(allBatches);
      setBirds(allBirds);
    } catch (err) {
      console.error('Error loading sales module data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleSaveSale = async (formData) => {
    await salesService.recordSale(formData);
    await loadData();
  };

  const handleSavePayment = async (paymentData) => {
    await salesService.recordPayment(paymentData);
    await loadData();
  };

  const handleCancelSale = async (saleId, reason) => {
    await salesService.cancelSale(saleId, reason);
    await loadData();
  };

  const handleExportCSV = async () => {
    try {
      const csv = await salesService.exportSalesCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FreshNest_Sales_History_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting sales CSV:', err);
    }
  };

  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className={styles.moduleContainer}>
      {/* 1. Header Banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerBadgeRow}>
            <span className={styles.farmPill}>Module 10 · Sales & Revenue</span>
            <span className={styles.dateText}>
              <Calendar size={13} />
              {todayFormatted}
            </span>
          </div>
          <h2 className={styles.welcomeTitle}>Sales & Revenue Management</h2>
          <p className={styles.welcomeTagline}>
            Live Birds · Table Eggs · Customer Receivables · Printable Receipts
          </p>
          <p className={styles.welcomeDesc}>
            Manage farm commercial sales, synchronize bird and egg inventory stock atomically,
            record part or full customer payments, and track farm cash revenue in Nigerian Naira (₦).
          </p>
        </div>

        <div className={styles.bannerRight}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={loadData}
            title="Refresh database"
          >
            <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
            Refresh
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleExportCSV}
            title="Export CSV"
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setRecordModalOpen(true)}
          >
            <Plus size={16} />
            Record New Sale
          </button>
        </div>
      </div>

      {/* 2. Top Statistic Cards */}
      <SalesStatCards stats={stats} />

      {/* 3. Navigation Tabs */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <ShoppingBag size={15} />
          Overview & Quick Actions
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <List size={15} />
          Sales History ({sales.length})
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={15} />
          Revenue Analytics
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SalesTable
            sales={sales.slice(0, 5)}
            onViewReceipt={(s) => {
              setReceiptTargetSale(s);
              setReceiptModalOpen(true);
            }}
            onRecordPayment={(s) => {
              setPaymentTargetSale(s);
              setPaymentModalOpen(true);
            }}
            onCancelSale={(s) => {
              setCancelTargetSale(s);
              setCancelModalOpen(true);
            }}
          />

          <SalesAnalyticsCard stats={stats} />
        </div>
      )}

      {activeTab === 'history' && (
        <SalesTable
          sales={sales}
          onViewReceipt={(s) => {
            setReceiptTargetSale(s);
            setReceiptModalOpen(true);
          }}
          onRecordPayment={(s) => {
            setPaymentTargetSale(s);
            setPaymentModalOpen(true);
          }}
          onCancelSale={(s) => {
            setCancelTargetSale(s);
            setCancelModalOpen(true);
          }}
        />
      )}

      {activeTab === 'analytics' && (
        <SalesAnalyticsCard stats={stats} />
      )}

      {/* Modals */}
      <SaleRecordModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleSaveSale}
        batches={batches}
        birds={birds}
      />

      <PaymentRecordModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentTargetSale(null);
        }}
        sale={paymentTargetSale}
        onSavePayment={handleSavePayment}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setReceiptTargetSale(null);
        }}
        sale={receiptTargetSale}
      />

      <SaleCancelModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelTargetSale(null);
        }}
        sale={cancelTargetSale}
        onConfirmCancel={handleCancelSale}
      />
    </div>
  );
}
