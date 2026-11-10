import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Home,
  Plus,
  RefreshCw,
  CheckCircle2,
  X,
} from 'lucide-react';
import { batchService } from '../services/batchService.js';
import { penService } from '../services/penService.js';
import { Button } from '../components/common/Button.jsx';
import { BatchStatsGrid } from '../components/batches/BatchStatsGrid.jsx';
import { BatchTable } from '../components/batches/BatchTable.jsx';
import { BatchFormModal } from '../components/batches/BatchFormModal.jsx';
import { BatchDetailsModal } from '../components/batches/BatchDetailsModal.jsx';
import { BatchDeleteModal } from '../components/batches/BatchDeleteModal.jsx';
import { PenTable } from '../components/batches/PenTable.jsx';
import { PenFormModal } from '../components/batches/PenFormModal.jsx';
import { PenDetailsModal } from '../components/batches/PenDetailsModal.jsx';
import { PenDeleteModal } from '../components/batches/PenDeleteModal.jsx';
import { PenStatsGrid } from '../components/batches/PenStatsGrid.jsx';
import styles from './BatchManagementModule.module.css';

/**
 * MODULE 04: Batch & Pen Management Module
 * Comprehensive cohort tracking from day-old chick arrival to harvest,
 * and pen housing management with strict capacity validation.
 */
export function BatchManagementModule({ onRefreshDb }) {
  // Navigation Tabs: 'batches' | 'pens'
  const [activeTab, setActiveTab] = useState('batches');

  // Batch States
  const [batchStats, setBatchStats] = useState({
    totalBatches: 0,
    activeBatches: 0,
    plannedBatches: 0,
    completedBatches: 0,
    archivedBatches: 0,
    totalBatchBirds: 0,
    activeBatchBirds: 0,
  });
  const [batches, setBatches] = useState([]);
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(10);
  const [batchTotalPages, setBatchTotalPages] = useState(1);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchTypeFilter, setBatchTypeFilter] = useState('all');
  const [batchStatusFilter, setBatchStatusFilter] = useState('all');
  const [batchPenFilter, setBatchPenFilter] = useState('all');
  const [batchSortBy, setBatchSortBy] = useState('id');
  const [batchSortOrder, setBatchSortOrder] = useState('desc');

  // Pen States
  const [pens, setPens] = useState([]);
  const [penStats, setPenStats] = useState({
    totalPens: 0,
    availablePens: 0,
    occupiedPens: 0,
    totalCapacity: 0,
    totalOccupied: 0,
    availableCapacity: 0,
    overallOccupancyPct: 0,
  });
  const [penSearch, setPenSearch] = useState('');
  const [penTypeFilter, setPenTypeFilter] = useState('all');
  const [penStatusFilter, setPenStatusFilter] = useState('all');
  const [penSortBy, setPenSortBy] = useState('penId');
  const [penSortOrder, setPenSortOrder] = useState('asc');

  // Loading & Toast State
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Modals for Batches
  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState(null);
  const [selectedBatchForDetails, setSelectedBatchForDetails] = useState(null);
  const [batchToDelete, setBatchToDelete] = useState(null);

  // Modals for Pens
  const [isPenFormOpen, setIsPenFormOpen] = useState(false);
  const [penToEdit, setPenToEdit] = useState(null);
  const [selectedPenForDetails, setSelectedPenForDetails] = useState(null);
  const [penToDelete, setPenToDelete] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Load All Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        bStats,
        bList,
        pStats,
        pList,
      ] = await Promise.all([
        batchService.getBatchStats(),
        batchService.getBatches({
          search: batchSearch,
          type: batchTypeFilter,
          status: batchStatusFilter,
          penId: batchPenFilter,
          sortBy: batchSortBy,
          sortOrder: batchSortOrder,
          page: batchPage,
          pageSize: batchPageSize,
        }),
        penService.getPenStats(),
        penService.getPens({
          search: penSearch,
          type: penTypeFilter,
          status: penStatusFilter,
          sortBy: penSortBy,
          sortOrder: penSortOrder,
        }),
      ]);

      setBatchStats(bStats);
      setBatches(bList.items);
      setTotalBatches(bList.total);
      setBatchTotalPages(bList.totalPages);

      setPenStats(pStats);
      setPens(pList);
    } catch (err) {
      console.error('Failed to load batch/pen data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    batchSearch,
    batchTypeFilter,
    batchStatusFilter,
    batchPenFilter,
    batchSortBy,
    batchSortOrder,
    batchPage,
    batchPageSize,
    penSearch,
    penTypeFilter,
    penStatusFilter,
    penSortBy,
    penSortOrder,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Batch Handlers
  const handleSaveBatch = async (payload, existingId) => {
    if (existingId) {
      const updated = await batchService.updateBatch(existingId, payload);
      showToast(`Batch #${updated.batchId || updated.id} updated successfully.`);
      if (selectedBatchForDetails && selectedBatchForDetails.id === existingId) {
        const full = await batchService.getBatchById(existingId);
        setSelectedBatchForDetails(full);
      }
    } else {
      const created = await batchService.createBatch(payload);
      showToast(`Flock Batch #${created.batchId} created and assigned to ${payload.penId}.`);
    }

    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleArchiveBatch = async (batch) => {
    await batchService.archiveBatch(batch.id);
    showToast(`Batch #${batch.batchId || batch.id} was archived. Pen capacity released.`);
    if (selectedBatchForDetails && selectedBatchForDetails.id === batch.id) {
      const full = await batchService.getBatchById(batch.id);
      setSelectedBatchForDetails(full);
    }
    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleDeleteBatch = async (id) => {
    await batchService.deleteBatch(id);
    showToast('Batch record was deleted.');
    if (selectedBatchForDetails && selectedBatchForDetails.id === id) {
      setSelectedBatchForDetails(null);
    }
    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleViewBatch = async (batch) => {
    const full = await batchService.getBatchById(batch.id);
    setSelectedBatchForDetails(full || batch);
  };

  const handleOpenEditBatch = (batch) => {
    setBatchToEdit(batch);
    setIsBatchFormOpen(true);
  };

  const handleOpenAddBatch = () => {
    setBatchToEdit(null);
    setIsBatchFormOpen(true);
  };

  // Pen Handlers
  const handleSavePen = async (payload, existingId) => {
    if (existingId) {
      const updated = await penService.updatePen(existingId, payload);
      showToast(`Pen #${updated.penId} updated successfully.`);
      if (selectedPenForDetails && selectedPenForDetails.id === existingId) {
        const full = await penService.getPenById(existingId);
        setSelectedPenForDetails(full);
      }
    } else {
      const created = await penService.createPen(payload);
      showToast(`Housing Unit #${created.penId} (${created.name}) created.`);
    }

    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleDeletePen = async (id) => {
    await penService.deletePen(id);
    showToast('Pen was deleted successfully.');
    if (selectedPenForDetails && selectedPenForDetails.id === id) {
      setSelectedPenForDetails(null);
    }
    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  const handleViewPen = async (pen) => {
    const full = await penService.getPenById(pen.id);
    setSelectedPenForDetails(full || pen);
  };

  const handleOpenEditPen = (pen) => {
    setPenToEdit(pen);
    setIsPenFormOpen(true);
  };

  const handleOpenAddPen = () => {
    setPenToEdit(null);
    setIsPenFormOpen(true);
  };

  return (
    <div className={styles.moduleContainer}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.moduleIconBox}>
            <Layers size={26} />
          </div>
          <div className={styles.headerTextGroup}>
            <h2 className={styles.title}>Batch & Pen Management</h2>
            <p className={styles.subtitle}>
              Flock cohort lifecycles, arrival tracking, pen capacity limits, and housing occupancy.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="md"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={() => {
              loadData();
              if (onRefreshDb) onRefreshDb();
            }}
            title="Refresh database records"
          >
            Refresh
          </Button>

          {activeTab === 'batches' ? (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={handleOpenAddBatch}
            >
              Create New Batch
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={handleOpenAddPen}
            >
              Add New Pen
            </Button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toast}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToastMessage('')}
            aria-label="Dismiss toast"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'batches' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <Layers size={17} />
          <span>Flock Batches</span>
          <span className={styles.tabBadge}>{totalBatches}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'pens' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('pens')}
        >
          <Home size={17} />
          <span>Pens & Housing Units</span>
          <span className={styles.tabBadge}>{pens.length}</span>
        </button>
      </div>

      {/* Tab 1: Flock Batches */}
      {activeTab === 'batches' && (
        <>
          <BatchStatsGrid
            stats={batchStats}
            activeStatusFilter={batchStatusFilter}
            onSelectStatusFilter={(statusId) => {
              setBatchStatusFilter(statusId);
              setBatchPage(1);
            }}
          />

          <BatchTable
            batches={batches}
            total={totalBatches}
            page={batchPage}
            pageSize={batchPageSize}
            totalPages={batchTotalPages}
            search={batchSearch}
            typeFilter={batchTypeFilter}
            statusFilter={batchStatusFilter}
            penFilter={batchPenFilter}
            sortBy={batchSortBy}
            sortOrder={batchSortOrder}
            pens={pens}
            onSearchChange={(val) => {
              setBatchSearch(val);
              setBatchPage(1);
            }}
            onTypeFilterChange={(val) => {
              setBatchTypeFilter(val);
              setBatchPage(1);
            }}
            onStatusFilterChange={(val) => {
              setBatchStatusFilter(val);
              setBatchPage(1);
            }}
            onPenFilterChange={(val) => {
              setBatchPenFilter(val);
              setBatchPage(1);
            }}
            onSortChange={(field, order) => {
              setBatchSortBy(field);
              setBatchSortOrder(order);
            }}
            onPageChange={setBatchPage}
            onPageSizeChange={(newSize) => {
              setBatchPageSize(newSize);
              setBatchPage(1);
            }}
            onResetFilters={() => {
              setBatchSearch('');
              setBatchTypeFilter('all');
              setBatchStatusFilter('all');
              setBatchPenFilter('all');
              setBatchPage(1);
            }}
            onViewBatch={handleViewBatch}
            onEditBatch={handleOpenEditBatch}
            onArchiveBatch={handleArchiveBatch}
            onDeleteBatch={setBatchToDelete}
            onRegisterNew={handleOpenAddBatch}
          />
        </>
      )}

      {/* Tab 2: Pens & Housing Units */}
      {activeTab === 'pens' && (
        <>
          <PenStatsGrid
            stats={penStats}
            activeStatusFilter={penStatusFilter}
            onSelectStatusFilter={(statusId) => {
              setPenStatusFilter(statusId);
            }}
          />
          <PenTable
            pens={pens}
            search={penSearch}
            typeFilter={penTypeFilter}
            statusFilter={penStatusFilter}
            sortBy={penSortBy}
            sortOrder={penSortOrder}
            onSearchChange={setPenSearch}
            onTypeFilterChange={setPenTypeFilter}
            onStatusFilterChange={setPenStatusFilter}
            onSortChange={(field, order) => {
              setPenSortBy(field);
              setPenSortOrder(order);
            }}
            onResetFilters={() => {
              setPenSearch('');
              setPenTypeFilter('all');
              setPenStatusFilter('all');
            }}
            onViewPen={handleViewPen}
            onEditPen={handleOpenEditPen}
            onDeletePen={setPenToDelete}
            onCreateNew={handleOpenAddPen}
          />
        </>
      )}

      {/* Modals for Batches */}
      <BatchFormModal
        isOpen={isBatchFormOpen}
        onClose={() => {
          setIsBatchFormOpen(false);
          setBatchToEdit(null);
        }}
        onSave={handleSaveBatch}
        batchToEdit={batchToEdit}
        pens={pens}
      />

      <BatchDetailsModal
        batch={selectedBatchForDetails}
        isOpen={Boolean(selectedBatchForDetails)}
        onClose={() => setSelectedBatchForDetails(null)}
        onEdit={(b) => {
          setSelectedBatchForDetails(null);
          handleOpenEditBatch(b);
        }}
        onArchive={(b) => {
          handleArchiveBatch(b);
        }}
        onDelete={(b) => {
          setSelectedBatchForDetails(null);
          setBatchToDelete(b);
        }}
      />

      <BatchDeleteModal
        batch={batchToDelete}
        isOpen={Boolean(batchToDelete)}
        onClose={() => setBatchToDelete(null)}
        onConfirmDelete={handleDeleteBatch}
        onConfirmArchive={handleArchiveBatch}
      />

      {/* Modals for Pens */}
      <PenFormModal
        isOpen={isPenFormOpen}
        onClose={() => {
          setIsPenFormOpen(false);
          setPenToEdit(null);
        }}
        onSave={handleSavePen}
        penToEdit={penToEdit}
      />

      <PenDetailsModal
        pen={selectedPenForDetails}
        isOpen={Boolean(selectedPenForDetails)}
        onClose={() => setSelectedPenForDetails(null)}
        onEdit={(p) => {
          setSelectedPenForDetails(null);
          handleOpenEditPen(p);
        }}
        onDelete={(p) => {
          setSelectedPenForDetails(null);
          setPenToDelete(p);
        }}
      />

      <PenDeleteModal
        pen={penToDelete}
        isOpen={Boolean(penToDelete)}
        onClose={() => setPenToDelete(null)}
        onConfirmDelete={handleDeletePen}
      />
    </div>
  );
}
