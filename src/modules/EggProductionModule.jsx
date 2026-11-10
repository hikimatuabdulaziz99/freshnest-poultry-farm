import { useState, useEffect, useCallback } from 'react';
import {
  Egg,
  Plus,
  Boxes,
  Sliders,
  TrendingUp,
  FileText,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { db } from '../database/db.js';
import { eggProductionService } from '../services/eggProductionService.js';
import { EggStatsCards } from '../components/eggs/EggStatsCards.jsx';
import { EggCollectionTable } from '../components/eggs/EggCollectionTable.jsx';
import { EggGradingView } from '../components/eggs/EggGradingView.jsx';
import { EggInventoryTable } from '../components/eggs/EggInventoryTable.jsx';
import { EggProductionCharts } from '../components/eggs/EggProductionCharts.jsx';
import { EggCollectionModal } from '../components/eggs/EggCollectionModal.jsx';
import { EggGradingModal } from '../components/eggs/EggGradingModal.jsx';
import { EggMovementModal } from '../components/eggs/EggMovementModal.jsx';
import { EggDetailsModal } from '../components/eggs/EggDetailsModal.jsx';
import { EggDeleteModal } from '../components/eggs/EggDeleteModal.jsx';
import styles from './EggProductionModule.module.css';

/**
 * Module 08: FreshNest Egg Production Management
 * Offline-first commercial egg collection, Hen-Day Production (HDP) curves,
 * quality grading (Grade A, Grade B, Small, Rejects), crate packing,
 * and atomic inventory stock tracking.
 */
export function EggProductionModule() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'collections', 'grading', 'inventory', 'reports'
  const [logs, setLogs] = useState([]);
  const [movements, setMovements] = useState([]);
  const [stock, setStock] = useState({ byGrade: {}, totalSellableEggs: 0, totalSellableCrates: 0, totalDefectEggs: 0, totalEggsInStock: 0 });
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionEditData, setCollectionEditData] = useState(null);

  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [gradingTargetLog, setGradingTargetLog] = useState(null);

  const [movementModalOpen, setMovementModalOpen] = useState(false);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsTargetLog, setDetailsTargetLog] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetLog, setDeleteTargetLog] = useState(null);

  // Load all module data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Seed demo egg records if tables are empty and batches exist
      await eggProductionService.seedInitialEggData();

      // 2. Fetch parallel data
      const [allLogs, allMovements, currentStock, prodStats, allBatches] = await Promise.all([
        eggProductionService.getCollectionLogs(),
        eggProductionService.getInventoryMovements(),
        eggProductionService.getInventoryStock(),
        eggProductionService.getEggProductionStats(),
        db.batches.toArray(),
      ]);

      setLogs(allLogs);
      setMovements(allMovements);
      setStock(currentStock);
      setStats(prodStats);
      setBatches(allBatches);
    } catch (err) {
      console.error('Error loading egg production module data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleSaveCollection = async (formData) => {
    if (collectionEditData && collectionEditData.id) {
      await eggProductionService.updateCollectionLog(collectionEditData.id, formData);
    } else {
      await eggProductionService.createCollectionLog(formData);
    }
    await loadData();
  };

  const handleGradeCollection = async (logId, gradingData) => {
    await eggProductionService.gradeCollection(logId, gradingData);
    await loadData();
  };

  const handleRecordMovement = async (movData) => {
    await eggProductionService.recordStockMovement(movData);
    await loadData();
  };

  const handleDeleteCollection = async (id) => {
    await eggProductionService.deleteCollectionLog(id);
    await loadData();
  };

  const handleExportCollections = async () => {
    const csv = await eggProductionService.exportCollectionsCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freshnest_egg_collections_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMovements = async () => {
    const csv = await eggProductionService.exportInventoryCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freshnest_egg_inventory_movements_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Active layer flocks
  const layerBatches = batches.filter((b) => (b.birdType === 'Layer' || b.birdType === 'Pullet') && b.status !== 'Closed' && b.status !== 'Archived');
  const totalLayers = layerBatches.reduce((sum, b) => sum + (Math.max(0, Number(b.currentCount ?? b.initialCount)) || 0), 0);

  return (
    <div className={styles.moduleContainer}>
      {/* 1. Header Banner */}
      <div className={styles.moduleHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconBox}>
            <Egg size={26} />
          </div>
          <div>
            <h2 className={styles.headerTitle}>Egg Production &amp; Grading</h2>
            <p className={styles.headerSubtitle}>
              Daily flock collections, Hen-Day Production (HDP) curves, commercial quality sorting &amp; crate inventory
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => {
              setCollectionEditData(null);
              setCollectionModalOpen(true);
            }}
            className={styles.btnPrimary}
          >
            <Plus size={16} />
            <span>Log Daily Collection</span>
          </button>

          <button
            type="button"
            onClick={() => setMovementModalOpen(true)}
            className={styles.btnSecondary}
          >
            <Boxes size={16} />
            <span>Stock Movement</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className={styles.btnIcon}
            title="Refresh database"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 2. Active Laying Flock Banner */}
      <div className={styles.flockBanner}>
        <div className={styles.flockBannerInfo}>
          <Layers size={22} color="#d8f3dc" />
          <div>
            <div className={styles.flockBannerTitle}>
              Active Laying Flocks: {layerBatches.length} Cohorts
            </div>
            <div className={styles.flockBannerSub}>
              {layerBatches.map((b) => `${b.batchCode} (${b.breed})`).join(' · ') || 'No active layer flocks'}
            </div>
          </div>
        </div>

        <div className={styles.flockBannerMetrics}>
          <div className={styles.bannerMetric}>
            <span className={styles.bannerMetricLabel}>Total Laying Hens</span>
            <span className={styles.bannerMetricValue}>{totalLayers.toLocaleString()} hens</span>
          </div>
          <div className={styles.bannerMetric}>
            <span className={styles.bannerMetricLabel}>Today's Laying Rate</span>
            <span className={styles.bannerMetricValue}>{stats?.overallHDP ?? 0}% HDP</span>
          </div>
          <div className={styles.bannerMetric}>
            <span className={styles.bannerMetricLabel}>Today Harvested</span>
            <span className={styles.bannerMetricValue}>{(stats?.todayCollected ?? 0).toLocaleString()} eggs</span>
          </div>
        </div>
      </div>

      {/* 3. 6 Key Stat Cards */}
      <EggStatsCards
        stats={stats}
        activeFilter={activeTab}
        onSelectFilter={(filterId) => {
          if (filterId === 'today' || filterId === 'sevenDayAvg') setActiveTab('collections');
          else if (filterId === 'sellableStock' || filterId === 'defectStock') setActiveTab('inventory');
          else if (filterId === 'hdp') setActiveTab('reports');
          else if (filterId === 'defectRate') setActiveTab('grading');
        }}
      />

      {/* 4. Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={16} />
          <span>Overview &amp; Trends</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'collections' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          <Egg size={16} />
          <span>Daily Collections</span>
          <span className={styles.tabBadge}>{logs.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'grading' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('grading')}
        >
          <Sliders size={16} />
          <span>Egg Grading &amp; Quality</span>
          {logs.filter((l) => !l.graded).length > 0 && (
            <span className={styles.tabBadge} style={{ backgroundColor: '#b45309', color: '#ffffff' }}>
              {logs.filter((l) => !l.graded).length} pending
            </span>
          )}
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'inventory' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Boxes size={16} />
          <span>Egg Inventory &amp; Crates</span>
          <span className={styles.tabBadge}>
            {stock?.totalSellableCrates || 0} crates
          </span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'reports' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={16} />
          <span>Performance &amp; Benchmarks</span>
        </button>
      </div>

      {/* 5. Tab Content Views */}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <RefreshCw size={32} className="animate-spin" />
          <p>Loading egg production data from local IndexedDB...</p>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <EggProductionCharts stats={stats} />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-main, #1a202c)' }}>
                    Recent Daily Collection Logs
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('collections')}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary, #1b4332)', cursor: 'pointer' }}
                  >
                    View All Collections &rarr;
                  </button>
                </div>
                <EggCollectionTable
                  logs={logs.slice(0, 5)}
                  batches={batches}
                  onViewDetails={(log) => {
                    setDetailsTargetLog(log);
                    setDetailsModalOpen(true);
                  }}
                  onEditLog={(log) => {
                    setCollectionEditData(log);
                    setCollectionModalOpen(true);
                  }}
                  onGradeLog={(log) => {
                    setGradingTargetLog(log);
                    setGradingModalOpen(true);
                  }}
                  onDeleteLog={(log) => {
                    setDeleteTargetLog(log);
                    setDeleteModalOpen(true);
                  }}
                  onExportCSV={handleExportCollections}
                  onAddLog={() => {
                    setCollectionEditData(null);
                    setCollectionModalOpen(true);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'collections' && (
            <EggCollectionTable
              logs={logs}
              batches={batches}
              onViewDetails={(log) => {
                setDetailsTargetLog(log);
                setDetailsModalOpen(true);
              }}
              onEditLog={(log) => {
                setCollectionEditData(log);
                setCollectionModalOpen(true);
              }}
              onGradeLog={(log) => {
                setGradingTargetLog(log);
                setGradingModalOpen(true);
              }}
              onDeleteLog={(log) => {
                setDeleteTargetLog(log);
                setDeleteModalOpen(true);
              }}
              onExportCSV={handleExportCollections}
              onAddLog={() => {
                setCollectionEditData(null);
                setCollectionModalOpen(true);
              }}
            />
          )}

          {activeTab === 'grading' && (
            <EggGradingView
              logs={logs}
              onOpenGradingModal={(log) => {
                setGradingTargetLog(log);
                setGradingModalOpen(true);
              }}
            />
          )}

          {activeTab === 'inventory' && (
            <EggInventoryTable
              stock={stock}
              movements={movements}
              onOpenMovementModal={() => setMovementModalOpen(true)}
              onExportCSV={handleExportMovements}
            />
          )}

          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <EggProductionCharts stats={stats} />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <EggCollectionModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        onSubmit={handleSaveCollection}
        batches={batches}
        initialData={collectionEditData}
      />

      <EggGradingModal
        isOpen={gradingModalOpen}
        onClose={() => setGradingModalOpen(false)}
        onSubmit={handleGradeCollection}
        log={gradingTargetLog}
      />

      <EggMovementModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
        onSubmit={handleRecordMovement}
        stock={stock}
      />

      <EggDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        log={detailsTargetLog}
      />

      <EggDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteCollection}
        log={deleteTargetLog}
      />
    </div>
  );
}
