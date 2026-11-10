import { useState, useEffect, useCallback } from 'react';
import { Bird, Plus, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { birdService } from '../services/birdService.js';
import { Button } from '../components/common/Button.jsx';
import { BirdStatsGrid } from '../components/birds/BirdStatsGrid.jsx';
import { BirdTable } from '../components/birds/BirdTable.jsx';
import { BirdFormModal } from '../components/birds/BirdFormModal.jsx';
import { BirdDetailsModal } from '../components/birds/BirdDetailsModal.jsx';
import { BirdDeleteModal } from '../components/birds/BirdDeleteModal.jsx';
import styles from './BirdManagementModule.module.css';

/**
 * MODULE 03: Bird Management Module
 * Comprehensive individual bird registry, wing/leg tagging, biological profiling,
 * health status observation, and cohort batch linkage.
 */
export function BirdManagementModule({ onRefreshDb }) {
  // Data States
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    sick: 0,
    quarantined: 0,
    sold: 0,
    dead: 0,
    standalone: 0,
    batchAssigned: 0,
  });
  const [birds, setBirds] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [batches, setBatches] = useState([]);
  const [houses, setHouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [houseFilter, setHouseFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [birdToEdit, setBirdToEdit] = useState(null);
  const [selectedBirdForDetails, setSelectedBirdForDetails] = useState(null);
  const [birdToDelete, setBirdToDelete] = useState(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, birdsData, availableBatches, distinctHouses] = await Promise.all([
        birdService.getBirdStats(),
        birdService.getBirds({
          search,
          type: typeFilter,
          gender: genderFilter,
          status: statusFilter,
          batchId: batchFilter,
          houseNumber: houseFilter,
          sortBy,
          sortOrder,
          page,
          pageSize,
        }),
        birdService.getAvailableBatches(),
        birdService.getDistinctHouses(),
      ]);

      setStats(statsData);
      setBirds(birdsData.items);
      setTotal(birdsData.total);
      setTotalPages(birdsData.totalPages);
      setBatches(availableBatches);
      setHouses(distinctHouses);
    } catch (err) {
      console.error('Failed to load bird records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, genderFilter, statusFilter, batchFilter, houseFilter, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Register or Update Save
  const handleSaveBird = async (payload, existingId) => {
    if (existingId) {
      const updated = await birdService.updateBird(existingId, payload);
      showToast(`Bird record #${updated.birdId || updated.id} updated successfully.`);
      // If currently viewing details of this bird, update details modal state
      if (selectedBirdForDetails && selectedBirdForDetails.id === existingId) {
        const fullBird = await birdService.getBirdById(existingId);
        setSelectedBirdForDetails(fullBird);
      }
    } else {
      const created = await birdService.createBird(payload);
      showToast(`Bird #${created.birdId} (${created.breed}) successfully registered.`);
    }

    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  // Handle Delete
  const handleConfirmDelete = async (id) => {
    await birdService.deleteBird(id);
    showToast('Bird record was permanently deleted.');
    if (selectedBirdForDetails && selectedBirdForDetails.id === id) {
      setSelectedBirdForDetails(null);
    }
    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  // Handle Quick Status Transition from Details Modal
  const handleQuickStatusUpdate = async (id, newStatus) => {
    await birdService.updateBird(id, { status: newStatus });
    const fullBird = await birdService.getBirdById(id);
    setSelectedBirdForDetails(fullBird);
    showToast(`Status updated to "${newStatus}".`);
    await loadData();
    if (onRefreshDb) onRefreshDb();
  };

  // Open Details Modal
  const handleViewBird = async (bird) => {
    const fullBird = await birdService.getBirdById(bird.id);
    setSelectedBirdForDetails(fullBird || bird);
  };

  // Open Edit Modal
  const handleOpenEdit = (bird) => {
    setBirdToEdit(bird);
    setIsFormModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setBirdToEdit(null);
    setIsFormModalOpen(true);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setGenderFilter('all');
    setStatusFilter('all');
    setBatchFilter('all');
    setHouseFilter('all');
    setPage(1);
  };

  // Handle Stat Card Filter Click
  const handleSelectStatusFilter = (statusId) => {
    setStatusFilter(statusId);
    setPage(1);
  };

  return (
    <div className={styles.moduleContainer}>
      {/* Header & Quick Action */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.moduleIconBox}>
            <Bird size={26} />
          </div>
          <div className={styles.headerTextGroup}>
            <h2 className={styles.title}>Bird Management</h2>
            <p className={styles.subtitle}>
              Individual bird registry, wing tags, genetics, health statuses, and pen assignments.
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

          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={handleOpenAdd}
          >
            Register New Bird
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
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

      {/* Bird Statistics Summary Grid */}
      <BirdStatsGrid
        stats={stats}
        activeStatusFilter={statusFilter}
        onSelectStatusFilter={handleSelectStatusFilter}
      />

      {/* Bird Records Table */}
      <BirdTable
        birds={birds}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        search={search}
        typeFilter={typeFilter}
        genderFilter={genderFilter}
        statusFilter={statusFilter}
        batchFilter={batchFilter}
        houseFilter={houseFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        batches={batches}
        houses={houses}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onTypeFilterChange={(val) => {
          setTypeFilter(val);
          setPage(1);
        }}
        onGenderFilterChange={(val) => {
          setGenderFilter(val);
          setPage(1);
        }}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        onBatchFilterChange={(val) => {
          setBatchFilter(val);
          setPage(1);
        }}
        onHouseFilterChange={(val) => {
          setHouseFilter(val);
          setPage(1);
        }}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
        onViewBird={handleViewBird}
        onEditBird={handleOpenEdit}
        onDeleteBird={setBirdToDelete}
        onRegisterNew={handleOpenAdd}
      />

      {/* Registration & Editing Modal */}
      <BirdFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setBirdToEdit(null);
        }}
        onSave={handleSaveBird}
        birdToEdit={birdToEdit}
        batches={batches}
        houses={houses}
      />

      {/* Detailed Bird Profile Modal */}
      <BirdDetailsModal
        bird={selectedBirdForDetails}
        isOpen={Boolean(selectedBirdForDetails)}
        onClose={() => setSelectedBirdForDetails(null)}
        onEdit={(bird) => {
          setSelectedBirdForDetails(null);
          handleOpenEdit(bird);
        }}
        onDelete={(bird) => {
          setSelectedBirdForDetails(null);
          setBirdToDelete(bird);
        }}
        onUpdateStatus={handleQuickStatusUpdate}
      />

      {/* Deletion Confirmation Modal */}
      <BirdDeleteModal
        bird={birdToDelete}
        isOpen={Boolean(birdToDelete)}
        onClose={() => setBirdToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
