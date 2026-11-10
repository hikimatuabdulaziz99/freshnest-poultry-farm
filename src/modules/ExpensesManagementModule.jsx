import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Calendar,
  Download,
  Receipt,
  List,
  BarChart2,
  Link as LinkIcon,
} from 'lucide-react';
import { db } from '../database/db.js';
import { expenseService } from '../services/expenseService.js';
import { ExpenseStatCards } from '../components/expenses/ExpenseStatCards.jsx';
import { ExpenseTable } from '../components/expenses/ExpenseTable.jsx';
import { ExpenseRecordModal } from '../components/expenses/ExpenseRecordModal.jsx';
import { ExpensePaymentModal } from '../components/expenses/ExpensePaymentModal.jsx';
import { ExpenseVoucherModal } from '../components/expenses/ExpenseVoucherModal.jsx';
import { ExpenseCancelModal } from '../components/expenses/ExpenseCancelModal.jsx';
import { ExpenseAnalyticsCard } from '../components/expenses/ExpenseAnalyticsCard.jsx';
import { UnlinkedPurchasesModal } from '../components/expenses/UnlinkedPurchasesModal.jsx';
import styles from './ExpensesManagementModule.module.css';

/**
 * Module 11: FreshNest Expenses Management Module
 * Pure offline-first architecture for recording operational expenditures,
 * tracking supplier payables (full/partial/unpaid), purchase integration (feed, meds, vaccines),
 * printable disbursement vouchers, and cash outflow analytics.
 */
export function ExpensesManagementModule() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'analytics'
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [pens, setPens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTargetExpense, setPaymentTargetExpense] = useState(null);

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherTargetExpense, setVoucherTargetExpense] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetExpense, setCancelTargetExpense] = useState(null);

  const [unlinkedModalOpen, setUnlinkedModalOpen] = useState(false);

  // Load all module data from IndexedDB
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Seed demo expenses if table is completely empty
      await expenseService.seedDemoExpenses();

      // 2. Fetch parallel data
      const [allExpenses, allCategories, allStats, allBatches, allPens] = await Promise.all([
        expenseService.getExpenses(),
        expenseService.getCategories(),
        expenseService.getExpenseStats(),
        db.batches.toArray(),
        db.pens.toArray(),
      ]);

      setExpenses(allExpenses);
      setCategories(allCategories);
      setStats(allStats);
      setBatches(allBatches);
      setPens(allPens);
    } catch (err) {
      console.error('Error loading expenses module data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleSaveExpense = async (formData, expenseIdToEdit) => {
    if (expenseIdToEdit) {
      await expenseService.editExpense(expenseIdToEdit, formData);
    } else {
      await expenseService.recordExpense(formData);
    }
    await loadData();
  };

  const handleSavePayment = async (paymentData) => {
    await expenseService.recordExpensePayment(paymentData);
    await loadData();
  };

  const handleCancelExpense = async (expenseId, reason) => {
    await expenseService.cancelExpense(expenseId, reason);
    await loadData();
  };

  const handleAddCustomCategory = async (catName) => {
    const added = await expenseService.addCustomCategory(catName);
    const updated = await expenseService.getCategories();
    setCategories(updated);
    return added;
  };

  const handleExportCSV = async () => {
    try {
      const csv = await expenseService.exportExpensesCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FreshNest_Expenses_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting expenses CSV:', err);
    }
  };

  return (
    <div className={styles.moduleContainer}>
      {/* 1. Official Header & Welcome Banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerBadgeRow}>
            <span className={styles.farmPill}>FreshNest Poultry Farm</span>
            <span className={styles.dateText}>
              <Calendar size={13} />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <h1 className={styles.welcomeTitle}>Module 11: Expenses Management</h1>
          <p className={styles.welcomeTagline}>
            Operational Cost Tracking, Supplier Payables & Cash Outflow Control
          </p>
          <p className={styles.welcomeDesc}>
            Record daily farm overhead, integrate stock purchases from feeds, medications, and vaccines
            without duplicate stock-ins, manage outstanding credit balances, and generate printable payment vouchers.
          </p>
        </div>

        <div className={styles.bannerRight}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setExpenseToEdit(null);
              setRecordModalOpen(true);
            }}
          >
            <Plus size={16} /> Record Expense
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setUnlinkedModalOpen(true)}
            title="Scan Feeds, Medications, and Vaccines for unlinked purchases"
          >
            <LinkIcon size={14} /> Link Purchases
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleExportCSV}
            title="Export Expense Ledger to CSV"
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={loadData}
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className={styles.navTabs}>
        <button
          type="button"
          className={`${styles.navTab} ${activeTab === 'overview' ? styles.navTabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Receipt size={16} /> Overview
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${activeTab === 'history' ? styles.navTabActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <List size={16} /> Expense History ({expenses.length})
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${activeTab === 'analytics' ? styles.navTabActive : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={16} /> Analytics & Trends
        </button>
      </div>

      {/* 3. Tab Contents */}
      {isLoading ? (
        <div className={styles.loadingState}>
          Loading expense records and financial ledgers...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              {/* Stat Cards */}
              <ExpenseStatCards stats={stats} />

              {/* Analytics Preview */}
              <ExpenseAnalyticsCard stats={stats} />

              {/* Recent Expenses Table */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1b4332', margin: 0 }}>
                    Recent Expenditures
                  </h3>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#40916c', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                    onClick={() => setActiveTab('history')}
                  >
                    View All Expenses →
                  </button>
                </div>
                <ExpenseTable
                  expenses={expenses.slice(0, 8)}
                  categories={categories}
                  onViewVoucher={(expense) => {
                    setVoucherTargetExpense(expense);
                    setVoucherModalOpen(true);
                  }}
                  onRecordPayment={(expense) => {
                    setPaymentTargetExpense(expense);
                    setPaymentModalOpen(true);
                  }}
                  onEditExpense={(expense) => {
                    setExpenseToEdit(expense);
                    setRecordModalOpen(true);
                  }}
                  onCancelExpense={(expense) => {
                    setCancelTargetExpense(expense);
                    setCancelModalOpen(true);
                  }}
                />
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <ExpenseTable
              expenses={expenses}
              categories={categories}
              onViewVoucher={(expense) => {
                setVoucherTargetExpense(expense);
                setVoucherModalOpen(true);
              }}
              onRecordPayment={(expense) => {
                setPaymentTargetExpense(expense);
                setPaymentModalOpen(true);
              }}
              onEditExpense={(expense) => {
                setExpenseToEdit(expense);
                setRecordModalOpen(true);
              }}
              onCancelExpense={(expense) => {
                setCancelTargetExpense(expense);
                setCancelModalOpen(true);
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <ExpenseAnalyticsCard stats={stats} />
          )}
        </>
      )}

      {/* 4. Modals */}
      {/* Record / Edit Expense Modal */}
      <ExpenseRecordModal
        isOpen={recordModalOpen}
        onClose={() => {
          setRecordModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        categories={categories}
        onAddCustomCategory={handleAddCustomCategory}
        batches={batches}
        pens={pens}
      />

      {/* Record Additional Payment Modal */}
      <ExpensePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPaymentTargetExpense(null);
        }}
        onSavePayment={handleSavePayment}
        expense={paymentTargetExpense}
      />

      {/* Expense Voucher Modal */}
      <ExpenseVoucherModal
        isOpen={voucherModalOpen}
        onClose={() => {
          setVoucherModalOpen(false);
          setVoucherTargetExpense(null);
        }}
        expense={voucherTargetExpense}
      />

      {/* Cancel Expense Modal */}
      <ExpenseCancelModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelTargetExpense(null);
        }}
        onConfirmCancel={handleCancelExpense}
        expense={cancelTargetExpense}
      />

      {/* Unlinked Stock Purchases Modal */}
      <UnlinkedPurchasesModal
        isOpen={unlinkedModalOpen}
        onClose={() => setUnlinkedModalOpen(false)}
        onLinkedSuccess={loadData}
      />
    </div>
  );
}
