import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Calendar,
  Layers,
  FileText,
  BarChart2,
} from 'lucide-react';
import { db } from '../database/db.js';
import { mortalityService } from '../services/mortalityService.js';
import { MortalityStatCards } from '../components/mortality/MortalityStatCards.jsx';
import { MortalityAlertsBanner } from '../components/mortality/MortalityAlertsBanner.jsx';
import { MortalityAnalyticsCard } from '../components/mortality/MortalityAnalyticsCard.jsx';
import { MortalityTable } from '../components/mortality/MortalityTable.jsx';
import { MortalityBatchRatesTable } from '../components/mortality/MortalityBatchRatesTable.jsx';
import { MortalityRecordModal } from '../components/mortality/MortalityRecordModal.jsx';
import { MortalityDetailsModal } from '../components/mortality/MortalityDetailsModal.jsx';
import { MortalityDeleteModal } from '../components/mortality/MortalityDeleteModal.jsx';
import styles from './MortalityManagementModule.module.css';

/**
 * Module 09: FreshNest Mortality Management Module
 * Offline-first tracking for flock and individual bird mortalities with atomic
 * population synchronization, biosecurity disposal logging, and early warning alerts.
 */
export function MortalityManagementModule() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'logs' | 'cohorts'
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [birds, setBirds] = useState([]);
  const [pens, setPens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] = useState(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsTargetLog, setDetailsTargetLog] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetLog, setDeleteTargetLog] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all module data from IndexedDB
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Seed demo mortality records if empty and batches exist
      await mortalityService.seedInitialMortalityData();

      // 2. Fetch parallel data
      const [allLogs, allStats, allAlerts, allBatches, allBirds, allPens] = await Promise.all([
        mortalityService.getMortalityLogs(),
        mortalityService.getMortalityStats(),
        mortalityService.getMortalityAlerts(),
        db.batches.toArray(),
        db.birds.toArray(),
        db.pens ? db.pens.toArray() : Promise.resolve([]),
      ]);

      setLogs(allLogs);
      setStats(allStats);
      setAlerts(allAlerts);
      setBatches(allBatches);
      setBirds(allBirds);
      setPens(allPens);
    } catch (err) {
      console.error('Error loading mortality module data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleSaveMortality = async (formData) => {
    if (editTargetLog && editTargetLog.id) {
      await mortalityService.updateMortality(editTargetLog.id, formData);
    } else {
      await mortalityService.recordMortality(formData);
    }
    await loadData();
  };

  const handleDeleteConfirm = async (logId) => {
    setIsDeleting(true);
    try {
      await mortalityService.deleteMortality(logId);
      setDeleteModalOpen(false);
      setDeleteTargetLog(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting mortality log:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await mortalityService.exportMortalityCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FreshNest_Mortality_History_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting mortality CSV:', err);
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
            <span className={styles.farmPill}>Module 09 · Mortality Management</span>
            <span className={styles.dateText}>
              <Calendar size={13} />
              {todayFormatted}
            </span>
          </div>
          <h2 className={styles.welcomeTitle}>Flock Health & Mortality Log</h2>
          <p className={styles.welcomeDesc}>
            Accurate casualty recording, cause classification, biosecurity disposal logs,
            and early warning alerts for flock loss rate thresholds.
          </p>
        </div>

        <div className={styles.bannerRight}>
          <button
            type="button"
            className={styles.btnOutline}
            onClick={loadData}
            title="Refresh Data from IndexedDB"
          >
            <RefreshCw size={14} className={isLoading ? styles.spinning : ''} />
            Refresh
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setEditTargetLog(null);
              setRecordModalOpen(true);
            }}
          >
            <Plus size={16} />
            Record Mortality
          </button>
        </div>
      </div>

      {/* 2. Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart2 size={16} />
          Overview & Stats
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'logs' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FileText size={16} />
          Mortality History ({logs.length})
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'cohorts' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('cohorts')}
        >
          <Layers size={16} />
          Batch Rates & Survival
        </button>
      </div>

      {/* 3. Tab Contents */}
      {isLoading ? (
        <div className={styles.loadingBox}>
          <RefreshCw size={24} className={styles.spinning} style={{ marginRight: 8 }} />
          Loading mortality records from local database...
        </div>
      ) : (
        <div className={styles.tabContent}>
          {/* TAB 1: OVERVIEW & STATS */}
          {activeTab === 'overview' && (
            <>
              {/* Stat Cards */}
              <MortalityStatCards stats={stats} />

              {/* Early Warning Alerts */}
              <MortalityAlertsBanner alerts={alerts} />

              {/* Trends & Cause Breakdown */}
              <MortalityAnalyticsCard stats={stats} />

              {/* Recent Logs Table Preview */}
              <div style={{ marginTop: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#1B4332' }}>
                  Recent Mortality Entries
                </h4>
                <MortalityTable
                  logs={logs.slice(0, 5)}
                  batches={batches}
                  pens={pens}
                  onViewDetails={(log) => {
                    setDetailsTargetLog(log);
                    setDetailsModalOpen(true);
                  }}
                  onEditLog={(log) => {
                    setEditTargetLog(log);
                    setRecordModalOpen(true);
                  }}
                  onDeleteLog={(log) => {
                    setDeleteTargetLog(log);
                    setDeleteModalOpen(true);
                  }}
                  onExportCSV={handleExportCSV}
                />
              </div>
            </>
          )}

          {/* TAB 2: MORTALITY HISTORY TABLE */}
          {activeTab === 'logs' && (
            <MortalityTable
              logs={logs}
              batches={batches}
              pens={pens}
              onViewDetails={(log) => {
                setDetailsTargetLog(log);
                setDetailsModalOpen(true);
              }}
              onEditLog={(log) => {
                setEditTargetLog(log);
                setRecordModalOpen(true);
              }}
              onDeleteLog={(log) => {
                setDeleteTargetLog(log);
                setDeleteModalOpen(true);
              }}
              onExportCSV={handleExportCSV}
            />
          )}

          {/* TAB 3: BATCH RATES & SURVIVAL */}
          {activeTab === 'cohorts' && (
            <MortalityBatchRatesTable batchStats={stats?.batchStats || []} />
          )}
        </div>
      )}

      {/* 4. Modals */}
      <MortalityRecordModal
        isOpen={recordModalOpen}
        onClose={() => {
          setRecordModalOpen(false);
          setEditTargetLog(null);
        }}
        onSave={handleSaveMortality}
        batches={batches}
        birds={birds}
        initialData={editTargetLog}
      />

      <MortalityDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsTargetLog(null);
        }}
        log={detailsTargetLog}
      />

      <MortalityDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTargetLog(null);
        }}
        onConfirm={handleDeleteConfirm}
        log={deleteTargetLog}
        isDeleting={isDeleting}
      />
    </div>
  );
}
