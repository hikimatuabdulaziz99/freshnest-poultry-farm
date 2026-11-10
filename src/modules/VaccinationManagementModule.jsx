import { useState, useEffect, useCallback } from 'react';
import {
  Syringe,
  Plus,
  ShoppingCart,
  Calendar,
  ClipboardList,
  RefreshCw,
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';
import { db } from '../database/db.js';
import { vaccineService } from '../services/vaccineService.js';
import { VaccineStatsGrid } from '../components/vaccination/VaccineStatsGrid.jsx';
import { VaccineTable } from '../components/vaccination/VaccineTable.jsx';
import { VaccineScheduleTable } from '../components/vaccination/VaccineScheduleTable.jsx';
import { VaccineHistoryTable } from '../components/vaccination/VaccineHistoryTable.jsx';
import { VaccineFormModal } from '../components/vaccination/VaccineFormModal.jsx';
import { VaccinePurchaseModal } from '../components/vaccination/VaccinePurchaseModal.jsx';
import { VaccineScheduleModal } from '../components/vaccination/VaccineScheduleModal.jsx';
import { VaccineAdminModal } from '../components/vaccination/VaccineAdminModal.jsx';
import { VaccineDetailsModal } from '../components/vaccination/VaccineDetailsModal.jsx';
import { VaccineDeleteModal } from '../components/vaccination/VaccineDeleteModal.jsx';
import styles from './VaccinationManagementModule.module.css';

/**
 * Module 07: FreshNest Flock Vaccination & Immunisation Management
 * Offline-first biologics management, cold chain storage monitoring,
 * flock cohort scheduling, safe administration workflows, and biosecurity enforcement.
 */
export function VaccinationManagementModule() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'schedule', 'history'
  const [vaccines, setVaccines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [alerts, setAlerts] = useState({ dueToday: [], overdue: [], upcoming7Days: [], expiredVaccines: [], lowStock: [] });
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [birds, setBirds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formEditItem, setFormEditItem] = useState(null);

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseTargetVac, setPurchaseTargetVac] = useState(null);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTargetVac, setScheduleTargetVac] = useState(null);

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminTargetVac, setAdminTargetVac] = useState(null);
  const [adminTargetSchedule, setAdminTargetSchedule] = useState(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsVac, setDetailsVac] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteVac, setDeleteVac] = useState(null);

  // Load all module data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Seed standard poultry vaccines if table is empty
      await vaccineService.seedInitialVaccines();

      // 2. Fetch vaccines, schedules, history, and alerts
      const [allVaccines, allSchedules, allLogs, vacStats, vacAlerts, allBatches, allBirds] =
        await Promise.all([
          vaccineService.getVaccines(),
          vaccineService.getVaccinationSchedules(),
          vaccineService.getVaccinationHistory(),
          vaccineService.getVaccinationStatistics(),
          vaccineService.getVaccinationAlerts(),
          db.batches.toArray(),
          db.birds.toArray(),
        ]);

      setVaccines(allVaccines);
      setSchedules(allSchedules);
      setHistoryLogs(allLogs);
      setStats(vacStats);
      setAlerts(vacAlerts);
      setBatches(allBatches);
      setBirds(allBirds);
    } catch (err) {
      console.error('Failed to load vaccination module data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for Vaccine CRUD
  const handleSaveVaccine = async (formData) => {
    try {
      if (formEditItem) {
        await vaccineService.updateVaccine(formEditItem.id, formData);
      } else {
        await vaccineService.createVaccine(formData);
      }
      setFormModalOpen(false);
      setFormEditItem(null);
      await loadData();
    } catch (err) {
      console.error('Save vaccine failed:', err);
      throw err;
    }
  };

  const handleStockInSubmit = async (purchaseData) => {
    try {
      await vaccineService.recordVaccinePurchase(purchaseData);
      setPurchaseModalOpen(false);
      setPurchaseTargetVac(null);
      await loadData();
    } catch (err) {
      console.error('Vaccine stock-in failed:', err);
      throw err;
    }
  };

  const handleScheduleSubmit = async (scheduleData) => {
    try {
      await vaccineService.createVaccinationSchedule(scheduleData);
      setScheduleModalOpen(false);
      setScheduleTargetVac(null);
      await loadData();
    } catch (err) {
      console.error('Create schedule failed:', err);
      throw err;
    }
  };

  const handleAdministerSubmit = async (adminData) => {
    try {
      await vaccineService.recordVaccination(adminData);
      setAdminModalOpen(false);
      setAdminTargetVac(null);
      setAdminTargetSchedule(null);
      await loadData();
    } catch (err) {
      console.error('Vaccination administration failed:', err);
      throw err;
    }
  };

  const handleCancelSchedule = async (scheduleId) => {
    if (window.confirm('Are you sure you want to cancel this scheduled vaccination?')) {
      try {
        await vaccineService.cancelVaccinationSchedule(scheduleId, 'Cancelled by operator');
        await loadData();
      } catch (err) {
        console.error('Cancel schedule failed:', err);
      }
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      await vaccineService.deleteVaccine(id);
      setDeleteModalOpen(false);
      setDeleteVac(null);
      await loadData();
    } catch (err) {
      console.error('Delete vaccine failed:', err);
      throw err;
    }
  };

  const handleArchiveConfirm = async (id) => {
    try {
      await vaccineService.archiveVaccine(id);
      setDeleteModalOpen(false);
      setDeleteVac(null);
      await loadData();
    } catch (err) {
      console.error('Archive vaccine failed:', err);
      throw err;
    }
  };

  const hasUrgentAlerts =
    alerts.overdue.length > 0 ||
    alerts.dueToday.length > 0 ||
    alerts.expiredVaccines.length > 0;

  return (
    <div className={styles.moduleContainer}>
      {/* Module Header */}
      <div className={styles.moduleHeader}>
        <div className={styles.headerInfo}>
          <div className={styles.headerIcon}>
            <Syringe size={26} />
          </div>
          <div>
            <h1 className={styles.moduleTitle}>Flock Vaccination & Biosecurity</h1>
            <p className={styles.moduleSubtitle}>
              Offline immunisation schedules, cold chain storage tracking, and batch disease prevention
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={loadData}
            title="Refresh Data"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          </button>

          <button
            type="button"
            className={styles.secondaryActionBtn}
            onClick={() => {
              setPurchaseTargetVac(null);
              setPurchaseModalOpen(true);
            }}
          >
            <ShoppingCart size={16} />
            <span>Stock In</span>
          </button>

          <button
            type="button"
            className={styles.scheduleActionBtn}
            onClick={() => {
              setScheduleTargetVac(null);
              setScheduleModalOpen(true);
            }}
          >
            <Calendar size={16} />
            <span>+ Schedule</span>
          </button>

          <button
            type="button"
            className={styles.administerActionBtn}
            onClick={() => {
              setAdminTargetVac(null);
              setAdminTargetSchedule(null);
              setAdminModalOpen(true);
            }}
          >
            <Syringe size={16} />
            <span>Administer</span>
          </button>

          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => {
              setFormEditItem(null);
              setFormModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Add Vaccine</span>
          </button>
        </div>
      </div>

      {/* Urgent Biosecurity & Schedule Alerts Banner */}
      {hasUrgentAlerts && (
        <div className={styles.urgentAlertBanner}>
          <div className={styles.urgentAlertLeft}>
            {alerts.expiredVaccines.length > 0 ? (
              <AlertOctagon size={22} className={styles.alertIconDanger} />
            ) : (
              <AlertTriangle size={22} className={styles.alertIconWarning} />
            )}
            <div>
              <h4 className={styles.urgentAlertTitle}>Flock Immunisation Attention Required</h4>
              <p className={styles.urgentAlertText}>
                {alerts.overdue.length > 0 && (
                  <span className={styles.urgentBadgeOverdue}>
                    {alerts.overdue.length} Overdue Vaccination{alerts.overdue.length > 1 ? 's' : ''}
                  </span>
                )}
                {alerts.dueToday.length > 0 && (
                  <span className={styles.urgentBadgeDue}>
                    {alerts.dueToday.length} Due Today
                  </span>
                )}
                {alerts.expiredVaccines.length > 0 && (
                  <span className={styles.urgentBadgeExpired}>
                    {alerts.expiredVaccines.length} Expired Vaccine{alerts.expiredVaccines.length > 1 ? 's' : ''} (Administration Blocked)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.urgentAlertAction}
            onClick={() => setActiveTab('schedule')}
          >
            <span>Review Calendar</span>
          </button>
        </div>
      )}

      {/* Top Stats Grid */}
      <VaccineStatsGrid stats={stats} />

      {/* Navigation Tabs */}
      <div className={styles.navBar}>
        <div className={styles.tabList}>
          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === 'inventory' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Syringe size={17} />
            <span>Vaccine Inventory ({vaccines.length})</span>
          </button>

          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === 'schedule' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Calendar size={17} />
            <span>Vaccination Calendar & Schedule ({schedules.filter((s) => s.status !== 'Cancelled').length})</span>
            {(alerts.dueToday.length > 0 || alerts.overdue.length > 0) && (
              <span className={styles.tabBadge}>
                {alerts.dueToday.length + alerts.overdue.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === 'history' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <ClipboardList size={17} />
            <span>Administration Logs ({historyLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      <div className={styles.tabContent}>
        {activeTab === 'inventory' && (
          <VaccineTable
            vaccines={vaccines}
            onAddNew={() => {
              setFormEditItem(null);
              setFormModalOpen(true);
            }}
            onView={(vac) => {
              setDetailsVac(vac);
              setDetailsModalOpen(true);
            }}
            onEdit={(vac) => {
              setFormEditItem(vac);
              setFormModalOpen(true);
            }}
            onRestock={(vac) => {
              setPurchaseTargetVac(vac);
              setPurchaseModalOpen(true);
            }}
            onSchedule={(vac) => {
              setScheduleTargetVac(vac);
              setScheduleModalOpen(true);
            }}
            onAdminister={(vac) => {
              setAdminTargetVac(vac);
              setAdminTargetSchedule(null);
              setAdminModalOpen(true);
            }}
            onDelete={(vac) => {
              setDeleteVac(vac);
              setDeleteModalOpen(true);
            }}
          />
        )}

        {activeTab === 'schedule' && (
          <VaccineScheduleTable
            schedules={schedules}
            onScheduleNew={() => {
              setScheduleTargetVac(null);
              setScheduleModalOpen(true);
            }}
            onAdminister={(schedule) => {
              const matchedVac = vaccines.find((v) => v.vaccineId === schedule.vaccineId);
              setAdminTargetVac(matchedVac || null);
              setAdminTargetSchedule(schedule);
              setAdminModalOpen(true);
            }}
            onCancel={handleCancelSchedule}
          />
        )}

        {activeTab === 'history' && (
          <VaccineHistoryTable
            logs={historyLogs}
            onRecordNew={() => {
              setAdminTargetVac(null);
              setAdminTargetSchedule(null);
              setAdminModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <VaccineFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setFormEditItem(null);
        }}
        onSubmit={handleSaveVaccine}
        initialData={formEditItem}
      />

      <VaccinePurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          setPurchaseTargetVac(null);
        }}
        onSubmit={handleStockInSubmit}
        vaccines={vaccines}
        selectedVaccine={purchaseTargetVac}
      />

      <VaccineScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setScheduleTargetVac(null);
        }}
        onSubmit={handleScheduleSubmit}
        vaccines={vaccines}
        batches={batches}
        selectedVaccine={scheduleTargetVac}
      />

      <VaccineAdminModal
        isOpen={adminModalOpen}
        onClose={() => {
          setAdminModalOpen(false);
          setAdminTargetVac(null);
          setAdminTargetSchedule(null);
        }}
        onSubmit={handleAdministerSubmit}
        vaccines={vaccines}
        batches={batches}
        birds={birds}
        schedules={schedules}
        selectedVaccine={adminTargetVac}
        selectedSchedule={adminTargetSchedule}
      />

      <VaccineDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsVac(null);
        }}
        vaccine={detailsVac}
        onRestock={(vac) => {
          setPurchaseTargetVac(vac);
          setPurchaseModalOpen(true);
        }}
        onSchedule={(vac) => {
          setScheduleTargetVac(vac);
          setScheduleModalOpen(true);
        }}
        onAdminister={(vac) => {
          setAdminTargetVac(vac);
          setAdminTargetSchedule(null);
          setAdminModalOpen(true);
        }}
        onEdit={(vac) => {
          setFormEditItem(vac);
          setFormModalOpen(true);
        }}
      />

      <VaccineDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteVac(null);
        }}
        vaccine={deleteVac}
        onConfirmDelete={handleDeleteConfirm}
        onArchive={handleArchiveConfirm}
      />
    </div>
  );
}
