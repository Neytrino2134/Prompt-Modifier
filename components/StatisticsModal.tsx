import React, { useState, useMemo } from 'react';
import { useLanguage } from '../localization';
import { useGenerationStats } from '../hooks/useGenerationStats';
import {
  CATEGORY_METAS,
  ModelCategory,
  StatsPeriod,
  getStandardModelName,
} from '../utils/generationStats';
import { useAppContext } from '../contexts/AppContext';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const context = useAppContext();
  const historyItems = context?.historyItems || [];

  const {
    records,
    filter,
    summary,
    updatePeriod,
    updateGenerationMode,
    updateCategory,
    updateModel,
    updateAspectRatio,
    updateResolution,
    updateSearchQuery,
    setCustomDateRange,
    resetFilters,
    clearStats,
    syncWithHistory,
    exportJSON,
    exportCSV,
  } = useGenerationStats();

  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'time' | 'logs'>('overview');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleConfirmClear = () => {
    clearStats();
    setShowClearConfirm(false);
    showFeedback(t('stats.statsCleared') || 'Статистика очищена');
  };

  const handleSyncWithHistory = () => {
    if (historyItems.length > 0) {
      syncWithHistory(historyItems);
      showFeedback(t('stats.syncSuccess') || 'Статистика синхронизирована');
    }
  };

  // Available unique models in the dataset for dropdown
  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.model) set.add(r.model);
    });
    return Array.from(set);
  }, [records]);

  // Available unique aspect ratios in the dataset
  const uniqueRatios = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.aspectRatio) set.add(r.aspectRatio);
    });
    return Array.from(set);
  }, [records]);

  // Available unique resolutions in the dataset
  const uniqueResolutions = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.resolution) set.add(r.resolution);
    });
    return Array.from(set);
  }, [records]);

  if (!isOpen) return null;

  const {
    totalLifetimeCount,
    filteredCount,
    todayCount,
    sevenDaysCount,
    twentyEightDaysCount,
    averagePerDay,
    activeDaysCount,
    topModel,
    topCategory,
    topRatio,
    topResolution,
    peakHour,
    peakDay,
    dailyTimeline,
    modelBreakdown,
    categoryBreakdown,
    ratioBreakdown,
    resolutionBreakdown,
    hourlyDistribution,
    weekdayDistribution,
    filteredRecords,
  } = summary;

  const maxTimelineCount = Math.max(1, ...dailyTimeline.map(d => d.count));
  const maxHourlyCount = Math.max(1, ...hourlyDistribution.map(h => h.count));
  const maxWeekdayCount = Math.max(1, ...weekdayDistribution.map(w => w.count));

  const handleApplyCustomDate = () => {
    if (customStart && customEnd) {
      const startMs = new Date(customStart).getTime();
      const endMs = new Date(customEnd).getTime() + 24 * 60 * 60 * 1000 - 1;
      setCustomDateRange(startMs, endMs);
    }
  };

  const periodOptions: Array<{ id: StatsPeriod; label: string }> = [
    { id: '1d', label: t('stats.period1d') || '1 день (24ч)' },
    { id: '7d', label: t('stats.period7d') || '7 дней' },
    { id: '28d', label: t('stats.period28d') || '28 дней' },
    { id: '90d', label: t('stats.period90d') || '90 дней' },
    { id: 'all', label: t('stats.periodAll') || 'Все время' },
    { id: 'custom', label: t('stats.periodCustom') || 'Период...' },
  ];

  const categoryOptions: Array<{ id: 'all' | ModelCategory; label: string; badge?: string }> = [
    { id: 'all', label: t('stats.categoryAll') || 'Все категории' },
    { id: 'gpt_image_2', label: 'GPT-Image-2', badge: 'text-teal-400' },
    { id: 'pro_3_0', label: '3.0 Pro', badge: 'text-purple-400' },
    { id: 'flash_3_1', label: '3.1 Flash', badge: 'text-amber-400' },
    { id: 'lite_3_1', label: '3.1 Lite', badge: 'text-emerald-400' },
    { id: 'other', label: 'Другие (DALL-E / Imagen)', badge: 'text-blue-400' },
  ];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-5xl h-[88vh] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur sticky top-0 z-20 select-none">
          <div className="flex items-center gap-3 select-none">
            <div className="p-2.5 rounded-xl bg-accent/20 text-accent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {t('stats.modalTitle') || 'Статистика сгенерированных изображений'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-300">
                  {totalLifetimeCount} {t('stats.imagesUnit') || 'всего'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('stats.modalSubtitle') || 'Аналитика по количеству, моделям (Flash/Pro/Lite/Banana) и временным срезам'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 select-none">
            <button
              onClick={exportCSV}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 hover:text-white border border-gray-700 transition-colors"
              title="Export CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>CSV</span>
            </button>

            <button
              onClick={exportJSON}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 hover:text-white border border-gray-700 transition-colors"
              title="Export JSON"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title={t('common.close') || 'Закрыть'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="bg-accent/20 border-b border-accent/40 text-accent px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 animate-fade-in select-none">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Filters Bar */}
        <div className="p-3.5 sm:p-4 bg-gray-950/60 border-b border-gray-800 space-y-3 select-none">
          {/* Row 1: Period Tabs + Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
              {periodOptions.map(p => (
                <button
                  key={p.id}
                  onClick={() => updatePeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter.period === p.id
                      ? 'bg-accent text-white shadow-sm font-semibold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Quick Actions in Filter Bar: Reset Filters & Sync */}
            <div className="flex items-center gap-2">
              {historyItems.length > 0 && (
                <button
                  onClick={handleSyncWithHistory}
                  className="px-2.5 py-1 text-xs text-gray-400 hover:text-accent hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1 border border-gray-800 hover:border-gray-700"
                  title={t('stats.syncWithHistory') || 'Синхронизировать с историей'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{t('stats.syncWithHistory') || 'Синхронизировать'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  resetFilters();
                  showFeedback(t('stats.resetFilters') || 'Фильтры сброшены');
                }}
                className="px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1 border border-gray-800 hover:border-gray-700"
                title={t('stats.resetFilters') || 'Сбросить фильтры'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t('stats.resetFilters') || 'Сбросить фильтры'}</span>
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker (if period === 'custom') */}
          {filter.period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-gray-900 border border-gray-800 text-xs">
              <span className="text-gray-400">{t('stats.from') || 'От'}:</span>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-md px-2 py-1 text-white focus:outline-none focus:border-accent"
              />
              <span className="text-gray-400">{t('stats.to') || 'До'}:</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-md px-2 py-1 text-white focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleApplyCustomDate}
                className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded-md font-medium transition-colors"
              >
                {t('common.apply') || 'Применить'}
              </button>
            </div>
          )}

          {/* Row 2: Mode Filter (All / Normal / Batch API) + Category Filter Pills + Specific Model & Ratio Selectors + Search */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Mode filter pills */}
            <div className="flex items-center gap-1 bg-gray-900/90 p-0.5 rounded-lg border border-gray-800">
              <button
                onClick={() => updateGenerationMode('all')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  !filter.generationMode || filter.generationMode === 'all'
                    ? 'bg-gray-700 text-white font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={t('stats.allModes') || 'Все режимы генераций'}
              >
                {t('stats.allModes') || 'Все режимы'}
              </button>
              <button
                onClick={() => updateGenerationMode('normal')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  filter.generationMode === 'normal'
                    ? 'bg-cyan-900/80 border border-cyan-700/60 text-cyan-200 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={t('stats.normalGenerationsOnly') || 'Обычные генерации (Normal)'}
              >
                <span>⚡</span>
                <span>{t('stats.normalMode') || 'Обычные'}</span>
              </button>
              <button
                onClick={() => updateGenerationMode('batch')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  filter.generationMode === 'batch'
                    ? 'bg-amber-900/80 border border-amber-700/60 text-amber-200 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title={t('stats.batchGenerationsOnly') || 'Пакетные генерации (Batch API)'}
              >
                <span>📦</span>
                <span>{t('stats.batchMode') || 'Batch API'}</span>
              </button>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-1">
              {categoryOptions.map(c => (
                <button
                  key={c.id}
                  onClick={() => updateCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filter.category === c.id
                      ? 'bg-gray-700 text-white font-semibold shadow'
                      : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 hover:bg-gray-800/80'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Model Select */}
            {uniqueModels.length > 0 && (
              <select
                value={filter.model}
                onChange={e => updateModel(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-accent"
              >
                <option value="all">{t('stats.allModels') || 'Все модели'}</option>
                {uniqueModels.map(m => (
                  <option key={m} value={m}>
                    {getStandardModelName(m)}
                  </option>
                ))}
              </select>
            )}

            {/* Aspect Ratio Select */}
            {uniqueRatios.length > 0 && (
              <select
                value={filter.aspectRatio}
                onChange={e => updateAspectRatio(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-mono focus:outline-none focus:border-accent"
              >
                <option value="all">{t('stats.allRatios') || 'Все соотношения'}</option>
                {uniqueRatios.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            {/* Resolution Select */}
            {uniqueResolutions.length > 0 && (
              <select
                value={filter.resolution}
                onChange={e => updateResolution(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-xs text-indigo-300 focus:outline-none focus:border-accent"
              >
                <option value="all">{t('stats.allResolutions') || 'Все разрешения'}</option>
                {uniqueResolutions.map(res => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder={t('stats.searchPromptOrModel') || 'Поиск по промпту или модели...'}
                value={filter.searchQuery}
                onChange={e => updateSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
              <svg
                className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900/50 px-4 select-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('stats.tabOverview') || 'Обзор и Динамика'}
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'models'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('stats.tabModels') || 'Модели и Группы'}
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'time'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('stats.tabTime') || 'Время и Активность'}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('stats.tabLogs') || 'Журнал генераций'} ({filteredRecords.length})
          </button>
        </div>

        {/* Main Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top KPI Cards (Always visible or in Overview) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Filtered Total Card */}
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/80 shadow-sm relative overflow-hidden">
              <span className="text-[11px] text-gray-400 block font-medium">
                {t('stats.filteredGenerations') || 'В выборке'}
              </span>
              <div className="text-2xl font-extrabold text-white mt-1 tracking-tight">
                {filteredCount}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                {Math.round((filteredCount / Math.max(1, totalLifetimeCount)) * 100)}% {t('stats.ofTotal') || 'от общего'} ({totalLifetimeCount})
              </span>
            </div>

            {/* Daily Average */}
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/80 shadow-sm">
              <span className="text-[11px] text-gray-400 block font-medium">
                {t('stats.averagePerDay') || 'В среднем в день'}
              </span>
              <div className="text-2xl font-extrabold text-accent mt-1 tracking-tight">
                {averagePerDay}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                {activeDaysCount} {t('stats.activeDays') || 'активных дней'}
              </span>
            </div>

            {/* Top Model */}
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/80 shadow-sm">
              <span className="text-[11px] text-gray-400 block font-medium">
                {t('stats.topModel') || 'Топ модель'}
              </span>
              <div className="text-sm font-bold text-amber-300 mt-1 truncate" title={topModel?.displayName || '—'}>
                {topModel ? topModel.displayName : '—'}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                {topModel ? `${topModel.count} (${topModel.percentage}%)` : '—'}
              </span>
            </div>

            {/* Top Aspect Ratio */}
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/80 shadow-sm">
              <span className="text-[11px] text-gray-400 block font-medium">
                {t('stats.topRatio') || 'Топ соотношение'}
              </span>
              <div className="text-sm font-bold text-cyan-300 font-mono mt-1">
                {topRatio ? topRatio.ratio : '—'}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                {topRatio ? `${topRatio.count} (${topRatio.percentage}%)` : '—'}
              </span>
            </div>

            {/* Top Resolution */}
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/80 shadow-sm">
              <span className="text-[11px] text-gray-400 block font-medium">
                {t('stats.topResolution') || 'Топ разрешение'}
              </span>
              <div className="text-sm font-bold text-indigo-300 mt-1 truncate" title={topResolution?.resolution || '—'}>
                {topResolution ? topResolution.resolution : '—'}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">
                {topResolution ? `${topResolution.count} (${topResolution.percentage}%)` : '—'}
              </span>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & TIMELINE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Daily Timeline Chart */}
              <div className="p-5 rounded-2xl bg-gray-850 bg-gray-800/40 border border-gray-800 space-y-4 select-none">
                <div className="flex flex-wrap justify-between items-center gap-2 select-none">
                  <div>
                    <h3 className="text-sm font-bold text-white select-none">
                      {t('stats.generationTimeline') || 'Динамика генераций по дням'}
                    </h3>
                    <p className="text-xs text-gray-400 select-none">
                      {t('stats.timelineDesc') || 'Количество созданных картинок с разделением по группам моделей'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs select-none">
                    <span className="flex items-center gap-1.5 text-teal-400">
                      <span className="w-2 h-2 rounded-full bg-teal-500" /> GPT-Image-2
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-2 h-2 rounded-full bg-purple-500" /> 3.0 Pro
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> 3.1 Flash
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> 3.1 Lite
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500" /> Другие
                    </span>
                  </div>
                </div>

                {/* Timeline Bar Chart */}
                {dailyTimeline.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-xs">
                    {t('stats.noDataForPeriod') || 'Нет данных за выбранный период'}
                  </div>
                ) : (
                  <div className="min-h-[220px] pt-24 pb-2 px-2 flex items-end gap-1.5 sm:gap-2 overflow-x-auto relative">
                    {dailyTimeline.map((item, idx) => {
                      const heightPercent = maxTimelineCount > 0 ? (item.count / maxTimelineCount) * 100 : 0;
                      const tooltipAlignClass =
                        idx < 2
                          ? 'left-0 items-start'
                          : idx >= dailyTimeline.length - 2
                          ? 'right-0 items-end'
                          : 'left-1/2 -translate-x-1/2 items-center';

                      return (
                        <div
                          key={idx}
                          className="flex-1 min-w-[22px] max-w-[42px] flex flex-col items-center gap-1.5 group relative h-28 justify-end"
                        >
                          {/* Tooltip with non-clipped layout and smart positioning */}
                          <div className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col pointer-events-none z-50 min-w-[155px] ${tooltipAlignClass}`}>
                            <div className="bg-gray-950/95 backdrop-blur-md text-white text-[11px] p-2.5 rounded-xl border border-gray-700 shadow-2xl space-y-1 w-full select-none">
                              <div className="font-bold border-b border-gray-800 pb-1 text-gray-200">{item.fullDate}</div>
                              <div className="text-accent font-semibold flex justify-between">
                                <span>Всего:</span>
                                <span>{item.count}</span>
                              </div>
                              {item.byCategory.gpt_image_2 > 0 && (
                                <div className="text-teal-400 flex justify-between text-[10px]">
                                  <span>GPT-Image-2:</span> <span>{item.byCategory.gpt_image_2}</span>
                                </div>
                              )}
                              {item.byCategory.pro_3_0 > 0 && (
                                <div className="text-purple-400 flex justify-between text-[10px]">
                                  <span>3.0 Pro:</span> <span>{item.byCategory.pro_3_0}</span>
                                </div>
                              )}
                              {item.byCategory.flash_3_1 > 0 && (
                                <div className="text-amber-400 flex justify-between text-[10px]">
                                  <span>3.1 Flash:</span> <span>{item.byCategory.flash_3_1}</span>
                                </div>
                              )}
                              {item.byCategory.lite_3_1 > 0 && (
                                <div className="text-emerald-400 flex justify-between text-[10px]">
                                  <span>3.1 Lite:</span> <span>{item.byCategory.lite_3_1}</span>
                                </div>
                              )}
                              {item.byCategory.other > 0 && (
                                <div className="text-blue-400 flex justify-between text-[10px]">
                                  <span>Другие:</span> <span>{item.byCategory.other}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stacked Bar */}
                          <div
                            className="w-full rounded-t overflow-hidden flex flex-col justify-end transition-all"
                            style={{ height: `${Math.max(4, heightPercent)}%` }}
                          >
                            {item.count === 0 ? (
                              <div className="w-full h-full bg-gray-800/40 rounded-t" />
                            ) : (
                              <>
                                {item.byCategory.gpt_image_2 > 0 && (
                                  <div
                                    style={{ height: `${(item.byCategory.gpt_image_2 / item.count) * 100}%` }}
                                    className="bg-teal-500 hover:bg-teal-400 transition-colors"
                                  />
                                )}
                                {item.byCategory.pro_3_0 > 0 && (
                                  <div
                                    style={{ height: `${(item.byCategory.pro_3_0 / item.count) * 100}%` }}
                                    className="bg-purple-500 hover:bg-purple-400 transition-colors"
                                  />
                                )}
                                {item.byCategory.flash_3_1 > 0 && (
                                  <div
                                    style={{ height: `${(item.byCategory.flash_3_1 / item.count) * 100}%` }}
                                    className="bg-amber-500 hover:bg-amber-400 transition-colors"
                                  />
                                )}
                                {item.byCategory.lite_3_1 > 0 && (
                                  <div
                                    style={{ height: `${(item.byCategory.lite_3_1 / item.count) * 100}%` }}
                                    className="bg-emerald-500 hover:bg-emerald-400 transition-colors"
                                  />
                                )}
                                {item.byCategory.other > 0 && (
                                  <div
                                    style={{ height: `${(item.byCategory.other / item.count) * 100}%` }}
                                    className="bg-blue-500 hover:bg-blue-400 transition-colors"
                                  />
                                )}
                              </>
                            )}
                          </div>

                          {/* Date Label */}
                          <span className="text-[9px] text-gray-400 font-mono scale-90 truncate max-w-full select-none">
                            {item.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3-Column Distribution Grid: Categories, Aspect Ratios, Resolutions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Category Breakdown */}
                <div className="p-4 rounded-2xl bg-gray-800/40 border border-gray-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t('stats.categoryDistribution') || 'Группы моделей'}
                  </h4>
                  <div className="space-y-2.5">
                    {categoryBreakdown.map(cat => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-gray-200">{cat.label}</span>
                          <span className="font-mono text-gray-400">
                            {cat.count} <span className="text-gray-500">({cat.percentage}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(cat.count > 0 ? 3 : 0, cat.percentage)}%`,
                              backgroundColor: cat.barColor,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Breakdown */}
                <div className="p-4 rounded-2xl bg-gray-800/40 border border-gray-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t('stats.ratioDistribution') || 'Соотношения сторон'}
                  </h4>
                  <div className="space-y-2.5">
                    {ratioBreakdown.length === 0 ? (
                      <div className="text-xs text-gray-500 py-4 text-center">
                        {t('stats.noRatioData') || 'Нет данных'}
                      </div>
                    ) : (
                      ratioBreakdown.map(r => (
                        <div key={r.ratio} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-cyan-300 font-mono">{r.ratio}</span>
                            <span className="font-mono text-gray-400">
                              {r.count} <span className="text-gray-500">({r.percentage}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all"
                              style={{ width: `${Math.max(r.count > 0 ? 3 : 0, r.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Resolution Breakdown */}
                <div className="p-4 rounded-2xl bg-gray-800/40 border border-gray-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t('stats.resolutionDistribution') || 'Разрешения изображений'}
                  </h4>
                  <div className="space-y-2.5">
                    {resolutionBreakdown.length === 0 ? (
                      <div className="text-xs text-gray-500 py-4 text-center">
                        {t('stats.noResolutionData') || 'Нет данных'}
                      </div>
                    ) : (
                      resolutionBreakdown.map(res => (
                        <div key={res.resolution} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-indigo-300 truncate max-w-[130px]" title={res.resolution}>
                              {res.resolution}
                            </span>
                            <span className="font-mono text-gray-400">
                              {res.count} <span className="text-gray-500">({res.percentage}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${Math.max(res.count > 0 ? 3 : 0, res.percentage)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODELS BREAKDOWN */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-800/40 border border-gray-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">
                    {t('stats.modelsDetailedList') || 'Полная статистика по моделям'}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {modelBreakdown.length} {t('stats.uniqueModelsCount') || 'уникальных моделей'}
                  </span>
                </div>

                <div className="space-y-3">
                  {modelBreakdown.map(m => (
                    <div
                      key={m.model}
                      className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${m.badgeClass}`}>
                            {m.category}
                          </span>
                          <span className="text-sm font-bold text-white">{m.displayName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-400">ID: {m.model}</span>
                          <div className="text-right font-mono">
                            <span className="text-sm font-extrabold text-white">{m.count}</span>
                            <span className="text-xs text-gray-400 ml-1.5">({m.percentage}%)</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(m.count > 0 ? 2 : 0, m.percentage)}%`,
                            backgroundColor: m.barColor,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIME & ACTIVITY */}
          {activeTab === 'time' && (
            <div className="space-y-6">
              {/* Hourly Chart */}
              <div className="p-5 rounded-2xl bg-gray-800/40 border border-gray-800 space-y-4 select-none">
                <div className="flex justify-between items-center select-none">
                  <h3 className="text-sm font-bold text-white select-none">
                    {t('stats.hourlyDistributionTitle') || 'Активность по часам суток (0:00 - 23:00)'}
                  </h3>
                  <span className="text-xs text-gray-400 select-none">
                    {t('stats.peakHour') || 'Пик'}: {peakHour ? `${peakHour.label} (${peakHour.count})` : '—'}
                  </span>
                </div>

                <div className="h-44 flex items-end gap-1 pt-10 px-1 relative">
                  {hourlyDistribution.map(h => {
                    const heightPercent = maxHourlyCount > 0 ? (h.count / maxHourlyCount) * 100 : 0;
                    const tooltipAlignClass =
                      h.hour < 3
                        ? 'left-0 items-start'
                        : h.hour > 20
                        ? 'right-0 items-end'
                        : 'left-1/2 -translate-x-1/2 items-center';

                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        {/* Tooltip */}
                        <div className={`absolute bottom-full mb-1 hidden group-hover:flex flex-col pointer-events-none z-40 ${tooltipAlignClass}`}>
                          <div className="bg-gray-950/95 backdrop-blur-md text-white text-[10px] py-1 px-2 rounded border border-gray-700 whitespace-nowrap shadow-xl">
                            <span className="font-bold">{h.label}</span>: {h.count} ({h.percentage}%)
                          </div>
                        </div>
                        {/* Bar */}
                        <div
                          className={`w-full rounded-t transition-all ${
                            h.count > 0 ? 'bg-purple-500/80 group-hover:bg-purple-400' : 'bg-gray-800/40'
                          }`}
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                        />
                        {/* Label */}
                        <span className="text-[8px] text-gray-500 font-mono scale-90 select-none">
                          {h.hour % 3 === 0 ? h.hour : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekday Distribution Chart */}
              <div className="p-5 rounded-2xl bg-gray-800/40 border border-gray-800 space-y-4 select-none">
                <div className="flex justify-between items-center select-none">
                  <h3 className="text-sm font-bold text-white select-none">
                    {t('stats.weekdayDistributionTitle') || 'Активность по дням недели'}
                  </h3>
                  <span className="text-xs text-gray-400 select-none">
                    {t('stats.peakDay') || 'Пиковый день'}: {peakDay ? `${peakDay.dayName} (${peakDay.count})` : '—'}
                  </span>
                </div>

                <div className="h-40 flex items-end gap-3 pt-10 px-4 relative">
                  {weekdayDistribution.map((w, wIdx) => {
                    const heightPercent = maxWeekdayCount > 0 ? (w.count / maxWeekdayCount) * 100 : 0;
                    const tooltipAlignClass =
                      wIdx === 0
                        ? 'left-0 items-start'
                        : wIdx === weekdayDistribution.length - 1
                        ? 'right-0 items-end'
                        : 'left-1/2 -translate-x-1/2 items-center';

                    return (
                      <div
                        key={w.dayIndex}
                        className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                      >
                        {/* Tooltip */}
                        <div className={`absolute bottom-full mb-1 hidden group-hover:flex flex-col pointer-events-none z-40 ${tooltipAlignClass}`}>
                          <div className="bg-gray-950/95 backdrop-blur-md text-white text-[10px] py-1 px-2 rounded border border-gray-700 whitespace-nowrap shadow-xl">
                            <span className="font-bold">{w.dayName}</span>: {w.count} ({w.percentage}%)
                          </div>
                        </div>
                        {/* Bar */}
                        <div
                          className={`w-full rounded-t transition-all ${
                            w.count > 0 ? 'bg-emerald-500/80 group-hover:bg-emerald-400' : 'bg-gray-800/40'
                          }`}
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                        />
                        {/* Label */}
                        <span className="text-xs font-semibold text-gray-300 select-none">
                          {w.shortName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GENERATION LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {t('stats.showingRecords') || 'Показано записей'}: {filteredRecords.length}
                </span>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-xs">
                  {t('stats.noRecordsFound') || 'Записи генераций не найдены'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredRecords.map((rec, idx) => {
                    const d = new Date(rec.timestamp);
                    const meta = CATEGORY_METAS[rec.category] || CATEGORY_METAS.other;
                    return (
                      <div
                        key={rec.id || idx}
                        className="p-3 rounded-xl bg-gray-900/70 border border-gray-800 hover:border-gray-700 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${meta.badgeClass}`}>
                              {rec.category}
                            </span>
                            {rec.generationMode === 'batch' ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold uppercase">
                                📦 Batch
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-bold uppercase">
                                ⚡ Normal
                              </span>
                            )}
                            <span className="font-semibold text-gray-200">{rec.modelDisplayName}</span>
                            <span className="text-gray-500 text-[10px]">
                              {d.toLocaleDateString()} {d.toLocaleTimeString()}
                            </span>
                          </div>
                          {rec.prompt && (
                            <p className="text-gray-400 truncate text-[11px] italic" title={rec.prompt}>
                              "{rec.prompt}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px] text-gray-400">
                          <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700/60 text-gray-300">
                            {rec.aspectRatio}
                          </span>
                          {rec.resolution && (
                            <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700/60 text-gray-400">
                              {rec.resolution}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/90 flex flex-wrap justify-between items-center gap-3">
          <div>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-red-400/80 hover:text-red-300 hover:underline transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{t('stats.clearAllStats') || 'Очистить историю статистики...'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-950/80 border border-red-800/80 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-red-300 font-medium">
                  {t('stats.confirmClearPrompt') || 'Удалить всю статистику?'}
                </span>
                <button
                  onClick={handleConfirmClear}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold shadow transition-colors"
                >
                  {t('common.yesDelete') || 'Да, удалить'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                >
                  {t('common.cancel') || 'Отмена'}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 hover:text-white border border-gray-700 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={exportJSON}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 hover:text-white border border-gray-700 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-md transition-colors"
            >
              {t('common.close') || 'Закрыть'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
