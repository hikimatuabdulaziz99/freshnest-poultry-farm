import { useState, useEffect, useCallback } from 'react';
import { initDatabase } from '../database/db.js';
import { dbService } from '../services/dbService.js';

/**
 * Custom hook to monitor IndexedDB connection, storage quota, and table readiness
 */
export function useDatabaseStatus() {
  const [status, setStatus] = useState({
    isLoading: true,
    isReady: false,
    version: null,
    databaseName: null,
    storageEstimate: null,
    tableCounts: {},
    totalRecords: 0,
    error: null,
  });

  const refreshStatus = useCallback(async () => {
    try {
      const initResult = await initDatabase();
      if (initResult.status === 'error') {
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          isReady: false,
          error: initResult.error,
        }));
        return;
      }

      const health = await dbService.getHealthStatus();
      setStatus({
        isLoading: false,
        isReady: health.connected,
        version: health.version,
        databaseName: health.databaseName,
        storageEstimate: health.storageEstimate,
        tableCounts: health.tableCounts,
        totalRecords: health.totalRecords,
        error: null,
      });
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        isReady: false,
        error: err.message || 'Database connection error',
      }));
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    ...status,
    refreshStatus,
  };
}
