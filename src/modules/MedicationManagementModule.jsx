import { useState, useEffect, useCallback } from 'react';
import {
  Pill,
  Plus,
  ShoppingCart,
  Syringe,
  ShieldAlert,
  ClipboardList,
  RefreshCw,
  PackageCheck,
} from 'lucide-react';
import { db } from '../database/db.js';
import { medicationService } from '../services/medicationService.js';
import { MedicationStatsGrid } from '../components/medication/MedicationStatsGrid.jsx';
import { MedicationTable } from '../components/medication/MedicationTable.jsx';
import { TreatmentHistoryTable } from '../components/medication/TreatmentHistoryTable.jsx';
import { WithdrawalWarningsBanner } from '../components/medication/WithdrawalWarningsBanner.jsx';
import { MedicationFormModal } from '../components/medication/MedicationFormModal.jsx';
import { MedicationPurchaseModal } from '../components/medication/MedicationPurchaseModal.jsx';
import { MedicationAdminModal } from '../components/medication/MedicationAdminModal.jsx';
import { MedicationDetailsModal } from '../components/medication/MedicationDetailsModal.jsx';
import { MedicationDeleteModal } from '../components/medication/MedicationDeleteModal.jsx';
import styles from './MedicationManagementModule.module.css';

/**
 * Module 06: FreshNest Medication & Flock Health Management
 * Complete pharmaceutical inventory, purchase tracking, batch & bird treatment administration,
 * biosecurity safeguards, and food-safety withdrawal tracking in Nigerian Naira (₦).
 */
export function MedicationManagementModule() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'treatments', 'withdrawals'
  const [medications, setMedications] = useState([]);
  const [treatmentLogs, setTreatmentLogs] = useState([]);
  const [activeRestrictions, setActiveRestrictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [birds, setBirds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formEditItem, setFormEditItem] = useState(null);

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseTargetMed, setPurchaseTargetMed] = useState(null);

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminTargetMed, setAdminTargetMed] = useState(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsMed, setDetailsMed] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteMed, setDeleteMed] = useState(null);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Seed initial medications if catalog is empty
      await medicationService.seedInitialMedicationsIfEmpty();

      // 2. Fetch all module records
      const [allMeds, allLogs, restrictions, medStats, allBatches, allBirds] = await Promise.all([
        medicationService.getMedications(),
        medicationService.getMedicationLogs(),
        medicationService.getActiveWithdrawalRestrictions(),
        medicationService.getMedicationStatistics(),
        db.batches.toArray(),
        db.birds.toArray(),
      ]);

      setMedications(allMeds);
      setTreatmentLogs(allLogs);
      setActiveRestrictions(restrictions);
      setStats(medStats);
      setBatches(allBatches);
      setBirds(allBirds);
    } catch (err) {
      console.error('Failed to load medication module data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for Products
  const handleOpenNewMedModal = () => {
    setFormEditItem(null);
    setFormModalOpen(true);
  };

  const handleOpenEditMedModal = (med) => {
    setFormEditItem(med);
    setFormModalOpen(true);
  };

  const handleSaveMedication = async (data) => {
    if (formEditItem) {
      await medicationService.updateMedication(formEditItem.id, data);
    } else {
      await medicationService.createMedication(data);
    }
    await loadData();
  };

  // Handlers for Stock-In / Purchases
  const handleOpenRestock = (med = null) => {
    setPurchaseTargetMed(med);
    setPurchaseModalOpen(true);
  };

  const handleSavePurchase = async (purchaseData) => {
    await medicationService.recordMedicationPurchase(purchaseData);
    await loadData();
  };

  // Handlers for Treatment Administration
  const handleOpenAdminister = (med = null) => {
    setAdminTargetMed(med);
    setAdminModalOpen(true);
  };

  const handleSaveAdministration = async (adminData, options) => {
    await medicationService.administerMedication(adminData, options);
    await loadData();
  };

  // Handlers for Details and Deletion
  const handleOpenDetails = (med) => {
    setDetailsMed(med);
    setDetailsModalOpen(true);
  };

  const handleOpenDelete = (med) => {
    setDeleteMed(med);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (id) => {
    await medicationService.deleteMedication(id);
    await loadData();
  };

  const handleArchiveMed = async (med) => {
    await medicationService.updateMedication(med.id, {
      currentStock: 0,
      status: 'Out of Stock',
    });
    await loadData();
  };

  const handleSelectStatFilter = (filterId) => {
    if (filterId === 'withdrawals') {
      setActiveTab('withdrawals');
    } else if (filterId === 'treatments') {
      setActiveTab('treatments');
    } else {
      setActiveTab('inventory');
    }
  };

  return (
    <div className={styles.moduleRoot}>
      {/* Top Header */}
      <div className={styles.moduleHeader}>
        <div className={styles.titleArea}>
          <div className={styles.iconBox}>
            <Pill size={24} />
          </div>
          <div>
            <h1 className={styles.moduleTitle}>Medication & Health Management</h1>
            <p className={styles.moduleSubtitle}>
              Pharmaceutical inventory, treatments, biosecurity controls, and food-safety withdrawal tracking.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={loadData}
            title="Refresh Data"
            aria-label="Refresh medication data"
          >
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          </button>

          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={() => handleOpenRestock(null)}
          >
            <ShoppingCart size={16} />
            <span>Stock-In (Purchase)</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnSecondary}
            onClick={() => handleOpenAdminister(null)}
          >
            <Syringe size={16} />
            <span>Administer Treatment</span>
          </button>

          <button
            type="button"
            className={styles.actionBtnPrimary}
            onClick={handleOpenNewMedModal}
          >
            <Plus size={16} />
            <span>New Medication</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <MedicationStatsGrid
        stats={stats}
        activeFilter={activeTab}
        onSelectFilter={handleSelectStatFilter}
      />

      {/* Active Food Safety Withdrawal Notice */}
      <WithdrawalWarningsBanner
        activeRestrictions={activeRestrictions}
        onSelectTarget={() => setActiveTab('treatments')}
      />

      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'inventory' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <PackageCheck size={16} />
          <span>Medication Inventory ({medications.length})</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'treatments' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('treatments')}
        >
          <ClipboardList size={16} />
          <span>Treatment Records ({treatmentLogs.length})</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'withdrawals' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('withdrawals')}
        >
          <ShieldAlert size={16} />
          <span>Food Safety & Withdrawals</span>
          {activeRestrictions.length > 0 && (
            <span className={styles.tabBadgeRed}>{activeRestrictions.length}</span>
          )}
        </button>
      </div>

      {/* Tab Viewport */}
      <div className={styles.tabContent}>
        {activeTab === 'inventory' && (
          <MedicationTable
            medications={medications}
            onViewDetails={handleOpenDetails}
            onRestock={handleOpenRestock}
            onAdminister={handleOpenAdminister}
            onEdit={handleOpenEditMedModal}
            onDelete={handleOpenDelete}
          />
        )}

        {activeTab === 'treatments' && (
          <TreatmentHistoryTable
            logs={treatmentLogs}
            onViewDetails={(log) => {
              const med = medications.find((m) => m.medicationId === log.medicationId);
              if (med) handleOpenDetails(med);
            }}
          />
        )}

        {activeTab === 'withdrawals' && (
          <div className={styles.withdrawalSafetyView}>
            <div className={styles.safetyCardHeader}>
              <div className={styles.safetyIconBox}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className={styles.safetyTitle}>Poultry Food Safety & Meat/Egg Withdrawal Enforcement</h3>
                <p className={styles.safetyDesc}>
                  Veterinary medicines require mandatory withdrawal intervals before eggs or broiler meat can be sold or consumed. This ensures zero antimicrobial residue reaches consumers.
                </p>
              </div>
            </div>

            <div className={styles.activeRestrictionsSection}>
              <h4 className={styles.sectionSubtitle}>
                Current Active Withdrawal Holds ({activeRestrictions.length})
              </h4>
              {activeRestrictions.length === 0 ? (
                <div className={styles.allClearCard}>
                  <p>All flocks and birds have passed their drug withdrawal periods. No sales or harvest restrictions currently apply.</p>
                </div>
              ) : (
                <div className={styles.restrictionsGrid}>
                  {activeRestrictions.map((res) => (
                    <div key={res.id || res.logId} className={styles.resCard}>
                      <div className={styles.resCardHeader}>
                        <span className={styles.resTargetBadge}>{res.targetType}</span>
                        <strong className={styles.resTargetName}>{res.targetDisplay}</strong>
                      </div>
                      <div className={styles.resDrugRow}>
                        <span>Medication:</span>
                        <strong>{res.medicationName}</strong>
                      </div>
                      <div className={styles.resDrugRow}>
                        <span>Withdrawal Period:</span>
                        <span>{res.withdrawalPeriodDays} days</span>
                      </div>
                      <div className={styles.resDrugRow}>
                        <span>Clearance Date:</span>
                        <strong className={styles.resHoldDate}>{res.withdrawalEndDate}</strong>
                      </div>
                      <div className={styles.resDaysRemainingBox}>
                        <span>HOLD: {res.daysRemaining} day{res.daysRemaining === 1 ? '' : 's'} remaining</span>
                      </div>
                      <p className={styles.resWarningText}>
                        Do not harvest or sell meat or eggs from this flock until {res.withdrawalEndDate}.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <MedicationFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleSaveMedication}
        initialData={formEditItem}
        isEdit={Boolean(formEditItem)}
      />

      <MedicationPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSubmit={handleSavePurchase}
        medications={medications}
        selectedMedication={purchaseTargetMed}
      />

      <MedicationAdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSubmit={handleSaveAdministration}
        medications={medications}
        batches={batches}
        birds={birds}
        selectedMedication={adminTargetMed}
      />

      <MedicationDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        medication={detailsMed}
        onRestock={handleOpenRestock}
        onAdminister={handleOpenAdminister}
        onEdit={handleOpenEditMedModal}
      />

      <MedicationDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        medication={deleteMed}
        onConfirmDelete={handleConfirmDelete}
        onArchive={handleArchiveMed}
      />
    </div>
  );
}
