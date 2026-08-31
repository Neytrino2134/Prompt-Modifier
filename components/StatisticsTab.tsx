import React, { useState } from 'react';
import { useLanguage } from '../localization';
import { useGenerationStats } from '../hooks/useGenerationStats';
import { CATEGORY_METAS, ModelCategory } from '../utils/generationStats';

interface StatisticsTabProps {
  onOpenDetailedModal: () => void;
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ onOpenDetailedModal }) => {
  const { t } = useLanguage();
  const { generalOverview, exportJSON, exportCSV, refreshStats } = useGenerationStats();
  const [selectedQuickPeriod, setSelectedQuickPeriod] = useState<'all' | '28d' | '7d' | '1d'>('all');

  const {
    totalLifetimeCount,
    todayCount,
    sevenDaysCount,
    twentyEightDaysCount,
    categoryBreakdown,
    modelBreakdown,
    ratioBreakdown,
    resolutionBreakdown,
    dailyTimeline,
    topModel,
  } = generalOverview;

  // Max count for timeline mini-chart scaling
  const maxDayCount = Math.max(1, ...dailyTimeline.slice(-14).map(d => d.count));

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 text-gray-200">
      {/* Top Main Stat Card */}
      <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-gray-800/90 to-gray-900 border border-gray-700/80 shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
              {t('stats.totalGenerations') || 'Всего сгенерировано'}
            </span>
            <div className="text-3xl font-extrabold text-white mt-0.5 tracking-tight flex items-baseline gap-2">
              <span>{totalLifetimeCount.toLocaleString()}</span>
              <span className="text-xs font-normal text-gray-400">{t('stats.imagesUnit') || 'изображений'}</span>
            </div>
          </div>
          <button
            onClick={() => refreshStats()}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title={t('common.refresh') || 'Обновить'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Quick Period Badges (Today / 7d / 28d) */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-800">
          <div className="bg-gray-900/60 rounded-lg p-2 text-center border border-gray-800/60">
            <span className="text-[10px] text-gray-400 block font-medium">
              {t('stats.periodToday') || 'Сегодня (24ч)'}
            </span>
            <span className="text-sm font-bold text-amber-400 mt-0.5 block">
              {todayCount}
            </span>
          </div>

          <div className="bg-gray-900/60 rounded-lg p-2 text-center border border-gray-800/60">
            <span className="text-[10px] text-gray-400 block font-medium">
              {t('stats.period7d') || '7 дней'}
            </span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
              {sevenDaysCount}
            </span>
          </div>

          <div className="bg-gray-900/60 rounded-lg p-2 text-center border border-gray-800/60">
            <span className="text-[10px] text-gray-400 block font-medium">
              {t('stats.period28d') || '28 дней'}
            </span>
            <span className="text-sm font-bold text-purple-400 mt-0.5 block">
              {twentyEightDaysCount}
            </span>
          </div>
        </div>
      </div>

      {/* Button to Open Detailed Modal */}
      <button
        onClick={onOpenDetailedModal}
        className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-accent/90 to-accent hover:from-accent hover:to-accent-hover text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>{t('stats.openDetailedModal') || 'Подробная статистика и фильтры'}</span>
        <svg className="w-3.5 h-3.5 ml-auto opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Model Categories Breakdown */}
      <div className="p-3.5 rounded-xl bg-gray-850 bg-gray-800/40 border border-gray-800 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-200">
            {t('stats.categoriesTitle') || 'Разделение по моделям'}
          </span>
          <span className="text-[11px] text-gray-400">
            {categoryBreakdown.filter(c => c.count > 0).length} {t('stats.activeCategories') || 'активно'}
          </span>
        </div>

        {/* Categories Bars */}
        <div className="space-y-2">
          {categoryBreakdown.map(cat => {
            const meta = CATEGORY_METAS[cat.category] || CATEGORY_METAS.other;
            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: meta.barColor }}
                    />
                    <span className="text-gray-300 font-medium">{cat.label}</span>
                  </span>
                  <span className="font-mono text-gray-400 text-[11px]">
                    <span className="text-gray-200 font-semibold">{cat.count}</span>
                    <span className="text-gray-500 ml-1">({cat.percentage}%)</span>
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(cat.count > 0 ? 3 : 0, cat.percentage)}%`,
                      backgroundColor: meta.barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aspect Ratio & Resolution Summary */}
      {(ratioBreakdown.length > 0 || resolutionBreakdown.length > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {/* Aspect Ratio Widget */}
          <div className="p-3 rounded-xl bg-gray-800/40 border border-gray-800 space-y-2">
            <span className="text-[11px] font-semibold text-gray-300 block">
              {t('stats.aspectRatio') || 'Соотношение'}
            </span>
            <div className="space-y-1">
              {ratioBreakdown.slice(0, 3).map(r => (
                <div key={r.ratio} className="flex justify-between items-center text-[11px]">
                  <span className="font-mono text-cyan-300 font-medium">{r.ratio}</span>
                  <span className="text-gray-400 font-mono">
                    {r.count} <span className="text-gray-500">({r.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Widget */}
          <div className="p-3 rounded-xl bg-gray-800/40 border border-gray-800 space-y-2">
            <span className="text-[11px] font-semibold text-gray-300 block">
              {t('stats.resolution') || 'Разрешение'}
            </span>
            <div className="space-y-1">
              {resolutionBreakdown.slice(0, 3).map(res => (
                <div key={res.resolution} className="flex justify-between items-center text-[11px]">
                  <span className="text-indigo-300 font-medium truncate max-w-[70px]" title={res.resolution}>
                    {res.resolution}
                  </span>
                  <span className="text-gray-400 font-mono">
                    {res.count} <span className="text-gray-500">({res.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent 14-Days Activity Sparkline */}
      <div className="p-3.5 rounded-xl bg-gray-800/40 border border-gray-800 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-200">
            {t('stats.recentActivity') || 'Активность за 14 дней'}
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            {t('stats.peakDay') || 'Макс'}: {maxDayCount}
          </span>
        </div>

        {/* Mini Chart */}
        <div className="flex items-end justify-between gap-1 h-14 pt-2 px-1">
          {dailyTimeline.slice(-14).map((d, idx) => {
            const heightPercent = maxDayCount > 0 ? Math.round((d.count / maxDayCount) * 100) : 0;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                  <div className="bg-gray-900 text-white text-[10px] py-1 px-1.5 rounded border border-gray-700 whitespace-nowrap shadow-lg">
                    <span className="font-semibold block">{d.fullDate}</span>
                    <span className="text-accent">{d.count} {t('stats.imagesUnit') || 'картинок'}</span>
                  </div>
                </div>
                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all ${
                    d.count > 0 ? 'bg-accent/80 group-hover:bg-accent' : 'bg-gray-800/60'
                  }`}
                  style={{ height: `${Math.max(4, heightPercent)}%` }}
                />
                {/* Day label */}
                <span className="text-[8px] text-gray-500 font-mono scale-90 -mt-0.5">
                  {d.date.split('/')[1] || d.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Models Mini List */}
      {modelBreakdown.length > 0 && (
        <div className="p-3.5 rounded-xl bg-gray-800/40 border border-gray-800 space-y-2.5">
          <span className="text-xs font-semibold text-gray-200 block">
            {t('stats.popularModels') || 'Популярные модели'}
          </span>

          <div className="space-y-1.5">
            {modelBreakdown.slice(0, 4).map((m, idx) => (
              <div
                key={m.model}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50 border border-gray-800/60 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <span className="text-[10px] font-mono text-gray-500 w-3.5">{idx + 1}.</span>
                  <span className="font-medium text-gray-200 truncate" title={m.displayName}>
                    {m.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${m.badgeClass}`}>
                    {m.category}
                  </span>
                  <span className="text-xs font-bold text-white font-mono">{m.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Export & Actions Footer */}
      <div className="pt-1 flex gap-2">
        <button
          onClick={exportCSV}
          className="flex-1 py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-gray-700/60"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>CSV</span>
        </button>

        <button
          onClick={exportJSON}
          className="flex-1 py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-gray-700/60"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>JSON</span>
        </button>
      </div>
    </div>
  );
};
