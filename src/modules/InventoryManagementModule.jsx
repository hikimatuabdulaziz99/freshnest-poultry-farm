import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Calendar,
  Download,
  Boxes,
  List,
  History,
  BarChart2,
  PackagePlus,
  Wheat,
} from 'lucide-react';
import { db } from '../database/db.js';
import { inventoryService } from '../services/inventoryService.js';
import { InventoryStatCards } from '../components/inventory/InventoryStatCards.jsx';
import { InventoryAlertsBanner } from '../components/inventory/InventoryAlertsBanner.jsx';
import { InventoryTable } from '../components/inventory/InventoryTable.jsx';
import { StockMovementsTable } from '../components/inventory/StockMovementsTable.jsx';
import { InventoryItemModal } from '../components/inventory/InventoryItemModal.jsx';
import { StockInModal } from '../components/inventory/StockInModal.jsx';
import { StockOutModal } from '../components/inventory/StockOutModal.jsx';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal.jsx';
import { StockTransferModal } from '../components/inventory/StockTransferModal.jsx';
import { SpecializedInventoriesCard } from '../components/inventory/SpecializedInventoriesCard.jsx';
import { InventoryAnalyticsCard } from '../components/inventory/InventoryAnalyticsCard.jsx';
import styles from './InventoryManagementModule.module.css';

/**
 * Module 12: FreshNest Inventory Management Module
 * Comprehensive offline-first management for general farm supplies, tools, equipment,
 * packaging materials, and consumables; atomic stock-in/out, paired location transfers,
 * biosecurity expiration tracking, and read-only specialized inventory bridges.
 */
export function InventoryManagementModule({ onSelectModule }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'catalog' | 'movements' | 'specialized' | 'analytics'
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [specializedSummary, setSpecializedSummary] = useState(null);
  const [batches, setBatches] = useState([]);
  const [pens, setPens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [targetStockInItem, setTargetStockInItem] = useState(null);

  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [targetStockOutItem, setTargetStockOutItem] = useState(null);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [targetAdjustItem, setTargetAdjustItem] = useState(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [targetTransferItem, setTargetTransferItem] = useState(null);

  // Load all module data from IndexedDB
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Seed demo inventory supplies if catalog is completely empty
      await inventoryService.seedDemoInventory();

      // 2. Fetch parallel data
      const [allItems, allMovements, allCategories, allStats, allAlerts, specSummary, allBatches, allPens] = await Promise.all([
        inventoryService.getItems(),
        inventoryService.getMovements(),
        inventoryService.getCategories(),
        inventoryService.getInventoryStats(),
        inventoryService.getInventoryAlerts(),
        inventoryService.getSpecializedInventoriesSummary(),
        db.batches.toArray(),
        db.pens.toArray(),
      ]);

      setItems(allItems);
      setMovements(allMovements);
      setCategories(allCategories);
      setStats(allStats);
      setAlerts(allAlerts);
      setSpecializedSummary(specSummary);
      setBatches(allBatches);
      setPens(allPens);
    } catch (err) {
      console.error('Error loading inventory module data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleSaveItem = async (formData, itemIdToEdit) => {
    if (itemIdToEdit) {
      await inventoryService.updateItem(itemIdToEdit, formData);
    } else {
      await inventoryService.createItem(formData);
    }
    await loadData();
  };

  const handleStockIn = async (stockInData) => {
    await inventoryService.recordStockIn(stockInData);
    await loadData();
  };

  const handleStockOut = async (stockOutData) => {
    await inventoryService.recordStockOut(stockOutData);
    await loadData();
  };

  const handleAdjust = async (adjustData) => {
    await inventoryService.recordAdjustment(adjustData);
    await loadData();
  };

  const handleTransfer = async (transferData) => {
    await inventoryService.recordTransfer(transferData);
    await loadData();
  };

  const handleAddCustomCategory = async (catName) => {
    const added = await inventoryService.addCustomCategory(catName);
    const updated = await inventoryService.getCategories();
    setCategories(updated);
    return added;
  };

  const handleExportCatalogCSV = async () => {
    try {
      const csv = await inventoryService.exportInventoryCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FreshNest_Inventory_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting inventory CSV:', err);
    }
  };

  const handleExportMovementsCSV = async () => {
    try {
      const csv = await inventoryService.exportMovementsCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FreshNest_Stock_Movements_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting movements CSV:', err);
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
          <h1 className={styles.welcomeTitle}>Module 12: Inventory Management</h1>
          <p className={styles.welcomeTagline}>
            Farm Supplies, Tools, Packaging, Equipment & Consumables Ledger
          </p>
          <p className={styles.welcomeDesc}>
            Maintain full control over general farm storehouses, track stock receipts and disbursements,
            execute paired storage transfers, prevent negative stock, and monitor biosecurity expiration alerts.
          </p>
        </div>

        <div className={styles.bannerRight}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setItemToEdit(null);
              setItemModalOpen(true);
            }}
          >
            <Plus size={16} /> Register Item
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              if (items.length > 0) {
                setTargetStockInItem(items[0]);
                setStockInModalOpen(true);
              }
            }}
            title="Receive Supplies"
          >
            <PackagePlus size={14} /> Quick Stock-In
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={activeTab === 'movements' ? handleExportMovementsCSV : handleExportCatalogCSV}
            title="Export CSV"
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={loadData}
            title="Refresh Inventory"
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
          <Boxes size={16} /> Overview
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${activeTab === 'catalog' ? styles.navTabActive : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <List size={16} /> Supplies Catalog ({items.length})
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${activeTab === 'movements' ? styles.navTabActive : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          <History size={16} /> Stock Movements ({movements.length})
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${activeTab === 'specialized' ? styles.navTabActive : ''}`}
          onClick={() => setActiveTab('specialized')}
        >
          <Wheat size={16} /> Specialized Farm Stocks
        </button>
        <button
          type="button"
          className={`${styles.navTab} ${activeTab === 'analytics' ? styles.navTabActive : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={16} /> Valuation & Analytics
        </button>
      </div>

      {/* 3. Tab Contents */}
      {isLoading ? (
        <div className={styles.loadingState}>
          Loading farm inventory catalog and movement ledgers...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <>
              {/* Stat Cards */}
              <InventoryStatCards stats={stats} />

              {/* Critical Alerts Banner */}
              <InventoryAlertsBanner alerts={alerts} />

              {/* Analytics Preview */}
              <InventoryAnalyticsCard stats={stats} />

              {/* Catalog Snapshot */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1b4332', margin: 0 }}>
                    Supplies in Stock
                  </h3>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#40916c', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                    onClick={() => setActiveTab('catalog')}
                  >
                    View All Catalog Items →
                  </button>
                </div>
                <InventoryTable
                  items={items.slice(0, 6)}
                  categories={categories}
                  onStockIn={(item) => {
                    setTargetStockInItem(item);
                    setStockInModalOpen(true);
                  }}
                  onStockOut={(item) => {
                    setTargetStockOutItem(item);
                    setStockOutModalOpen(true);
                  }}
                  onAdjust={(item) => {
                    setTargetAdjustItem(item);
                    setAdjustModalOpen(true);
                  }}
                  onTransfer={(item) => {
                    setTargetTransferItem(item);
                    setTransferModalOpen(true);
                  }}
                  onEditItem={(item) => {
                    setItemToEdit(item);
                    setItemModalOpen(true);
                  }}
                />
              </div>
            </>
          )}

          {activeTab === 'catalog' && (
            <InventoryTable
              items={items}
              categories={categories}
              onStockIn={(item) => {
                setTargetStockInItem(item);
                setStockInModalOpen(true);
              }}
              onStockOut={(item) => {
                setTargetStockOutItem(item);
                setStockOutModalOpen(true);
              }}
              onAdjust={(item) => {
                setTargetAdjustItem(item);
                setAdjustModalOpen(true);
              }}
              onTransfer={(item) => {
                setTargetTransferItem(item);
                setTransferModalOpen(true);
              }}
              onEditItem={(item) => {
                setItemToEdit(item);
                setItemModalOpen(true);
              }}
            />
          )}

          {activeTab === 'movements' && (
            <StockMovementsTable movements={movements} items={items} />
          )}

          {activeTab === 'specialized' && (
            <SpecializedInventoriesCard
              specializedSummary={specializedSummary}
              onNavigateModule={onSelectModule}
            />
          )}

          {activeTab === 'analytics' && (
            <InventoryAnalyticsCard stats={stats} />
          )}
        </>
      )}

      {/* 4. Modals */}
      {/* Register / Edit Item Modal */}
      <InventoryItemModal
        isOpen={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setItemToEdit(null);
        }}
        onSave={handleSaveItem}
        itemToEdit={itemToEdit}
        categories={categories}
        onAddCustomCategory={handleAddCustomCategory}
      />

      {/* Stock-In Modal */}
      <StockInModal
        isOpen={stockInModalOpen}
        onClose={() => {
          setStockInModalOpen(false);
          setTargetStockInItem(null);
        }}
        onConfirmStockIn={handleStockIn}
        item={targetStockInItem}
      />

      {/* Stock-Out Modal */}
      <StockOutModal
        isOpen={stockOutModalOpen}
        onClose={() => {
          setStockOutModalOpen(false);
          setTargetStockOutItem(null);
        }}
        onConfirmStockOut={handleStockOut}
        item={targetStockOutItem}
        batches={batches}
        pens={pens}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={adjustModalOpen}
        onClose={() => {
          setAdjustModalOpen(false);
          setTargetAdjustItem(null);
        }}
        onConfirmAdjustment={handleAdjust}
        item={targetAdjustItem}
      />

      {/* Stock Transfer Modal */}
      <StockTransferModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setTargetTransferItem(null);
        }}
        onConfirmTransfer={handleTransfer}
        item={targetTransferItem}
      />
    </div>
  );
}
