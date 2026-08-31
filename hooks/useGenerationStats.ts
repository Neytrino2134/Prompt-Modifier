import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GenerationRecord,
  StatsFilter,
  StatsSummary,
  getGenerationRecords,
  computeStatsSummary,
  recordGenerationEvent,
  clearGenerationStats,
  exportStatsAsJSON,
  exportStatsAsCSV,
  syncWithHistoryItems,
  STATS_UPDATED_EVENT,
  StatsPeriod,
  ModelCategory
} from '../utils/generationStats';

export const useGenerationStats = () => {
  const [records, setRecords] = useState<GenerationRecord[]>(() => getGenerationRecords());
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [filter, setFilter] = useState<StatsFilter>({
    period: '28d',
    category: 'all',
    model: 'all',
    aspectRatio: 'all',
    resolution: 'all',
    searchQuery: '',
  });

  const refreshStats = useCallback(() => {
    setRecords(getGenerationRecords());
  }, []);

  // Listen for background generation updates
  useEffect(() => {
    const handleUpdate = () => {
      refreshStats();
    };

    window.addEventListener(STATS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(STATS_UPDATED_EVENT, handleUpdate);
  }, [refreshStats]);

  // Initial load
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Compute stats summary
  const summary: StatsSummary = useMemo(() => {
    return computeStatsSummary(records, filter);
  }, [records, filter]);

  // Overview quick stats (across entire dataset regardless of modal filter for panel display)
  const generalOverview = useMemo(() => {
    return computeStatsSummary(records, { period: 'all' });
  }, [records]);

  const updatePeriod = useCallback((period: StatsPeriod) => {
    setFilter(prev => ({ ...prev, period }));
  }, []);

  const updateCategory = useCallback((category: 'all' | ModelCategory) => {
    setFilter(prev => ({ ...prev, category }));
  }, []);

  const updateModel = useCallback((model: string) => {
    setFilter(prev => ({ ...prev, model }));
  }, []);

  const updateAspectRatio = useCallback((aspectRatio: string) => {
    setFilter(prev => ({ ...prev, aspectRatio }));
  }, []);

  const updateResolution = useCallback((resolution: string) => {
    setFilter(prev => ({ ...prev, resolution }));
  }, []);

  const updateSearchQuery = useCallback((searchQuery: string) => {
    setFilter(prev => ({ ...prev, searchQuery }));
  }, []);

  const setCustomDateRange = useCallback((startDate: number, endDate: number) => {
    setFilter(prev => ({ ...prev, period: 'custom', startDate, endDate }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilter({
      period: '28d',
      category: 'all',
      model: 'all',
      aspectRatio: 'all',
      resolution: 'all',
      searchQuery: '',
    });
  }, []);

  const openDetailedModal = useCallback((period?: StatsPeriod) => {
    if (period) {
      setFilter(prev => ({ ...prev, period }));
    }
    setIsStatsModalOpen(true);
  }, []);

  const closeDetailedModal = useCallback(() => {
    setIsStatsModalOpen(false);
  }, []);

  const handleRecordGeneration = useCallback((event: {
    id?: string;
    timestamp?: number;
    model?: string;
    aspectRatio?: string;
    resolution?: string;
    prompt?: string;
    source?: string;
  }) => {
    const rec = recordGenerationEvent(event);
    setRecords(getGenerationRecords());
    return rec;
  }, []);

  const handleClearStats = useCallback(() => {
    clearGenerationStats();
    setRecords([]);
  }, []);

  const handleSyncHistory = useCallback((items: any[]) => {
    syncWithHistoryItems(items);
    setRecords(getGenerationRecords());
  }, []);

  return {
    records,
    filter,
    setFilter,
    summary,
    generalOverview,
    isStatsModalOpen,
    setIsStatsModalOpen,
    openDetailedModal,
    closeDetailedModal,
    updatePeriod,
    updateCategory,
    updateModel,
    updateAspectRatio,
    updateResolution,
    updateSearchQuery,
    setCustomDateRange,
    resetFilters,
    recordGeneration: handleRecordGeneration,
    clearStats: handleClearStats,
    syncWithHistory: handleSyncHistory,
    exportJSON: exportStatsAsJSON,
    exportCSV: exportStatsAsCSV,
    refreshStats,
  };
};
