// Generation Statistics Service and Analytics Engine

export type ModelCategory = 'pro_3_0' | 'flash_3_1' | 'lite_3_1' | 'other';

export interface GenerationRecord {
  id: string;
  timestamp: number;
  model: string;
  modelDisplayName: string;
  category: ModelCategory;
  aspectRatio: string;
  resolution?: string;
  prompt?: string;
  promptLength?: number;
  source?: string;
}

export type StatsPeriod = '1d' | '7d' | '28d' | '90d' | 'all' | 'custom';

export interface StatsFilter {
  period: StatsPeriod;
  startDate?: number;
  endDate?: number;
  category?: 'all' | ModelCategory;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  searchQuery?: string;
}

export interface CategoryMeta {
  category: ModelCategory;
  label: string;
  badgeClass: string;
  color: string;
  barColor: string;
  textColor: string;
}

export interface StatsSummary {
  totalLifetimeCount: number;
  filteredCount: number;
  todayCount: number;
  sevenDaysCount: number;
  twentyEightDaysCount: number;
  averagePerDay: number;
  activeDaysCount: number;
  topModel: { model: string; displayName: string; category: ModelCategory; count: number; percentage: number } | null;
  topCategory: { category: ModelCategory; label: string; count: number; percentage: number } | null;
  topRatio: { ratio: string; count: number; percentage: number } | null;
  topResolution: { resolution: string; count: number; percentage: number } | null;
  peakHour: { hour: number; label: string; count: number } | null;
  peakDay: { dayIndex: number; dayName: string; count: number } | null;
  dailyTimeline: Array<{
    date: string;
    fullDate: string;
    timestamp: number;
    count: number;
    byCategory: Record<ModelCategory, number>;
    byModel: Record<string, number>;
  }>;
  modelBreakdown: Array<{
    model: string;
    displayName: string;
    category: ModelCategory;
    count: number;
    percentage: number;
    badgeClass: string;
    barColor: string;
  }>;
  categoryBreakdown: Array<{
    category: ModelCategory;
    label: string;
    count: number;
    percentage: number;
    badgeClass: string;
    color: string;
    barColor: string;
    textColor: string;
  }>;
  ratioBreakdown: Array<{
    ratio: string;
    count: number;
    percentage: number;
  }>;
  resolutionBreakdown: Array<{
    resolution: string;
    count: number;
    percentage: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    label: string;
    count: number;
    percentage: number;
  }>;
  weekdayDistribution: Array<{
    dayIndex: number;
    dayName: string;
    shortName: string;
    count: number;
    percentage: number;
  }>;
  filteredRecords: GenerationRecord[];
}

const STORAGE_KEY_LOG = 'gemini_generation_stats_log_v2';
const STORAGE_KEY_TOTAL = 'gemini_generation_stats_lifetime_total';
export const STATS_UPDATED_EVENT = 'generation-stats-updated';

// Category metadata definitions: 3.0 Pro, 3.1 Flash, 3.1 Lite, and Other (2.5 flash, Imagen, etc.)
export const CATEGORY_METAS: Record<ModelCategory, CategoryMeta> = {
  pro_3_0: {
    category: 'pro_3_0',
    label: '3.0 Pro',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    color: 'rgb(168, 85, 247)',
    barColor: '#a855f7',
    textColor: 'text-purple-400',
  },
  flash_3_1: {
    category: 'flash_3_1',
    label: '3.1 Flash',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    color: 'rgb(245, 158, 11)',
    barColor: '#f59e0b',
    textColor: 'text-amber-400',
  },
  lite_3_1: {
    category: 'lite_3_1',
    label: '3.1 Lite',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    color: 'rgb(16, 185, 129)',
    barColor: '#10b981',
    textColor: 'text-emerald-400',
  },
  other: {
    category: 'other',
    label: 'Другие',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    color: 'rgb(59, 130, 246)',
    barColor: '#3b82f6',
    textColor: 'text-blue-400',
  },
};

/**
 * Maps model ID to high-level model category:
 * - 'pro_3_0': 3.0 pro (Gemini 3.0 Pro Image / Nano Banana Pro / gemini-3-pro-image-preview)
 * - 'flash_3_1': 3.1 Flash (Gemini 3.1 Flash Image / Nano Banana 2 / gemini-3.1-flash-image)
 * - 'lite_3_1': 3.1 Lite (Gemini 3.1 Flash Image Preview / Nana Banana 2 Lite / gemini-3.1-flash-image-preview)
 * - 'other': 2.5 flash, Imagen 4.0, Imagen 3.0, and any other models
 */
export const getModelCategory = (modelRaw?: string): ModelCategory => {
  if (!modelRaw) return 'other';
  const model = modelRaw.toLowerCase().trim();

  // 1. 3.1 Lite check (Preview / Lite variant of 3.1)
  if (
    model === 'gemini-3.1-flash-image-preview' ||
    (model.includes('3.1') && (model.includes('lite') || model.includes('preview'))) ||
    model.includes('banana 2 lite') ||
    model.includes('3.1 lite')
  ) {
    return 'lite_3_1';
  }

  // 2. 3.1 Flash check (Standard 3.1 Flash / Nano Banana 2)
  if (
    model === 'gemini-3.1-flash-image' ||
    (model.includes('3.1') && model.includes('flash')) ||
    (model.includes('banana 2') && !model.includes('lite')) ||
    model.includes('3.1 flash')
  ) {
    return 'flash_3_1';
  }

  // 3. 3.0 Pro check (Gemini 3.0 Pro / Nano Banana Pro)
  if (
    model === 'gemini-3-pro-image-preview' ||
    model.includes('3-pro') ||
    model.includes('3.0-pro') ||
    model.includes('3.0 pro') ||
    model.includes('banana pro') ||
    (model.includes('pro') && (model.includes('3.0') || model.includes('3')))
  ) {
    return 'pro_3_0';
  }

  // 4. All other models (2.5 flash, Imagen 4.0, Imagen 3.0, etc.) go to "other"
  return 'other';
};

/**
 * Standardized user-facing model display name
 */
export const getStandardModelName = (modelRaw?: string): string => {
  if (!modelRaw) return 'Imagen 4.0';
  const model = modelRaw.trim();

  const nameMap: Record<string, string> = {
    'gemini-3-pro-image-preview': 'Gemini 3.0 Pro Image (Nano Banana Pro)',
    'gemini-3.1-flash-image': 'Gemini 3.1 Flash Image (Nano Banana 2)',
    'gemini-3.1-flash-image-preview': 'Gemini 3.1 Flash Image Preview (Nana Banana 2 Lite)',
    'gemini-2.5-flash-image': 'Gemini 2.5 Flash Image (Nano Banana)',
    'imagen-4.0-generate-001': 'Imagen 4.0',
    'imagen-4.0-ultra-generate-preview-06-06': 'Imagen 4.0 Ultra',
    'imagen-3.0-generate-002': 'Imagen 3.0',
    'imagen-3.0-generate-001': 'Imagen 3.0',
    'imagen-3.0-capability-001': 'Imagen 3.0',
    'imagen-4.0-upscale-preview': 'Imagen 4.0 Upscale',
  };

  if (nameMap[model]) return nameMap[model];
  if (model.startsWith('imagen-4.0')) return 'Imagen 4.0';
  if (model.startsWith('imagen-3.0')) return 'Imagen 3.0';
  if (model.startsWith('gemini-')) return model.replace('gemini-', 'Gemini ');
  return model;
};

/**
 * Retrieves all generation records from storage
 */
export const getGenerationRecords = (): GenerationRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOG);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to read generation stats log', e);
  }
  return [];
};

/**
 * Returns total lifetime generation count
 */
export const getLifetimeGenerationCount = (): number => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TOTAL);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    // Fallback to record count
    const records = getGenerationRecords();
    return records.length;
  } catch {
    return 0;
  }
};

/**
 * Saves records array to localStorage (capped to prevent overflow)
 */
const saveGenerationRecords = (records: GenerationRecord[], totalIncrement = 0) => {
  try {
    // Keep up to 25,000 metadata records
    const capped = records.slice(0, 25000);
    localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(capped));

    if (totalIncrement > 0) {
      const currentTotal = getLifetimeGenerationCount();
      localStorage.setItem(STORAGE_KEY_TOTAL, (currentTotal + totalIncrement).toString());
    } else {
      const currentTotal = getLifetimeGenerationCount();
      if (capped.length > currentTotal) {
        localStorage.setItem(STORAGE_KEY_TOTAL, capped.length.toString());
      }
    }

    window.dispatchEvent(new CustomEvent(STATS_UPDATED_EVENT, { detail: { count: records.length } }));
  } catch (e) {
    console.error('Failed to save generation stats log', e);
  }
};

/**
 * Records a single generation event into persistent statistics
 */
export const recordGenerationEvent = (event: {
  id?: string;
  timestamp?: number;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  prompt?: string;
  source?: string;
}): GenerationRecord => {
  const records = getGenerationRecords();
  const model = event.model || 'imagen-4.0-generate-001';
  const category = getModelCategory(model);
  const modelDisplayName = getStandardModelName(model);
  const aspectRatio = event.aspectRatio || '1:1';
  const prompt = event.prompt || '';

  const newRecord: GenerationRecord = {
    id: event.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: event.timestamp || Date.now(),
    model,
    modelDisplayName,
    category,
    aspectRatio,
    resolution: event.resolution,
    prompt: prompt.slice(0, 500), // snippet for search & preview
    promptLength: prompt.length,
    source: event.source || 'image_generation',
  };

  // Avoid exact duplicates if called repeatedly with same ID
  const existingIdx = records.findIndex(r => r.id === newRecord.id);
  if (existingIdx !== -1) {
    records[existingIdx] = newRecord;
    saveGenerationRecords(records, 0);
  } else {
    records.unshift(newRecord);
    saveGenerationRecords(records, 1);
  }

  return newRecord;
};

/**
 * Synchronizes existing history items (from IndexedDB) into stats log
 */
export const syncWithHistoryItems = (items: Array<{
  id: string;
  timestamp: number;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  prompt?: string;
}>) => {
  if (!items || items.length === 0) return;
  const records = getGenerationRecords();
  const existingMap = new Map<string, boolean>();
  records.forEach(r => existingMap.set(r.id, true));

  let addedCount = 0;
  const toAdd: GenerationRecord[] = [];

  items.forEach(item => {
    if (!existingMap.has(item.id)) {
      const model = item.model || 'imagen-4.0-generate-001';
      toAdd.push({
        id: item.id,
        timestamp: item.timestamp || Date.now(),
        model,
        modelDisplayName: getStandardModelName(model),
        category: getModelCategory(model),
        aspectRatio: item.aspectRatio || '1:1',
        resolution: item.resolution,
        prompt: (item.prompt || '').slice(0, 500),
        promptLength: (item.prompt || '').length,
      });
      existingMap.set(item.id, true);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    const merged = [...records, ...toAdd].sort((a, b) => b.timestamp - a.timestamp);
    saveGenerationRecords(merged, addedCount);
  }
};

/**
 * Clears all generation statistics
 */
export const clearGenerationStats = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_LOG);
    localStorage.setItem(STORAGE_KEY_TOTAL, '0');
    window.dispatchEvent(new CustomEvent(STATS_UPDATED_EVENT, { detail: { count: 0 } }));
  } catch (e) {
    console.error('Failed to clear generation stats', e);
  }
};

/**
 * Exports stats as JSON file
 */
export const exportStatsAsJSON = () => {
  const records = getGenerationRecords();
  const summary = computeStatsSummary(records, { period: 'all' });
  const data = {
    exportedAt: new Date().toISOString(),
    totalGenerations: getLifetimeGenerationCount(),
    recordsCount: records.length,
    summary,
    records,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `generation_statistics_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Exports stats as CSV file
 */
export const exportStatsAsCSV = () => {
  const records = getGenerationRecords();
  const headers = ['ID', 'Date', 'Time', 'Timestamp', 'Model_ID', 'Model_Name', 'Category', 'Aspect_Ratio', 'Resolution', 'Prompt_Length', 'Prompt'];
  
  const rows = records.map(r => {
    const d = new Date(r.timestamp);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString();
    const cleanPrompt = (r.prompt || '').replace(/"/g, '""');
    return [
      r.id,
      `"${dateStr}"`,
      `"${timeStr}"`,
      r.timestamp,
      `"${r.model}"`,
      `"${r.modelDisplayName}"`,
      `"${r.category}"`,
      `"${r.aspectRatio}"`,
      `"${r.resolution || ''}"`,
      r.promptLength || 0,
      `"${cleanPrompt}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `generation_statistics_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAY_SHORT_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Main analytics computation engine: calculates all summary metrics, breakdowns, distributions and timelines
 */
export const computeStatsSummary = (
  records: GenerationRecord[],
  filter: StatsFilter = { period: 'all' }
): StatsSummary => {
  const now = Date.now();
  const lifetimeTotal = Math.max(getLifetimeGenerationCount(), records.length);

  // Time boundaries for standard presets
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const twentyEightDaysAgoMs = now - 28 * 24 * 60 * 60 * 1000;
  const ninetyDaysAgoMs = now - 90 * 24 * 60 * 60 * 1000;

  // Preset counts across the full dataset
  let todayCount = 0;
  let sevenDaysCount = 0;
  let twentyEightDaysCount = 0;

  records.forEach(r => {
    if (r.timestamp >= todayStartMs) todayCount++;
    if (r.timestamp >= sevenDaysAgoMs) sevenDaysCount++;
    if (r.timestamp >= twentyEightDaysAgoMs) twentyEightDaysCount++;
  });

  // Determine active time range based on filter.period
  let rangeStartMs = 0;
  let rangeEndMs = now;

  if (filter.period === '1d') {
    rangeStartMs = todayStartMs;
  } else if (filter.period === '7d') {
    rangeStartMs = sevenDaysAgoMs;
  } else if (filter.period === '28d') {
    rangeStartMs = twentyEightDaysAgoMs;
  } else if (filter.period === '90d') {
    rangeStartMs = ninetyDaysAgoMs;
  } else if (filter.period === 'custom') {
    if (filter.startDate) rangeStartMs = filter.startDate;
    if (filter.endDate) rangeEndMs = filter.endDate;
  }

  // Filter records
  const queryLower = filter.searchQuery ? filter.searchQuery.toLowerCase().trim() : '';

  const filtered = records.filter(r => {
    // Time filter
    if (filter.period !== 'all') {
      if (r.timestamp < rangeStartMs || r.timestamp > rangeEndMs) return false;
    }
    // Category filter
    if (filter.category && filter.category !== 'all') {
      if (r.category !== filter.category) return false;
    }
    // Specific model filter
    if (filter.model && filter.model !== 'all') {
      if (r.model !== filter.model) return false;
    }
    // Aspect ratio filter
    if (filter.aspectRatio && filter.aspectRatio !== 'all') {
      if (r.aspectRatio !== filter.aspectRatio) return false;
    }
    // Resolution filter
    if (filter.resolution && filter.resolution !== 'all') {
      if (r.resolution !== filter.resolution) return false;
    }
    // Search query filter
    if (queryLower) {
      const matchPrompt = r.prompt && r.prompt.toLowerCase().includes(queryLower);
      const matchModel = r.modelDisplayName.toLowerCase().includes(queryLower) || r.model.toLowerCase().includes(queryLower);
      const matchRes = r.resolution && r.resolution.toLowerCase().includes(queryLower);
      const matchRatio = r.aspectRatio && r.aspectRatio.toLowerCase().includes(queryLower);
      if (!matchPrompt && !matchModel && !matchRes && !matchRatio) return false;
    }
    return true;
  });

  const filteredCount = filtered.length;

  // Compute breakdown maps
  const modelCounts = new Map<string, { count: number; displayName: string; category: ModelCategory }>();
  const categoryCounts: Record<ModelCategory, number> = {
    pro_3_0: 0,
    flash_3_1: 0,
    lite_3_1: 0,
    other: 0,
  };
  const ratioCounts = new Map<string, number>();
  const resolutionCounts = new Map<string, number>();
  const hourCounts = new Array<number>(24).fill(0);
  const weekdayCounts = new Array<number>(7).fill(0);
  const activeDaysSet = new Set<string>();

  // Daily timeline bucket map (YYYY-MM-DD -> stats)
  const dailyMap = new Map<string, {
    date: string;
    fullDate: string;
    timestamp: number;
    count: number;
    byCategory: Record<ModelCategory, number>;
    byModel: Record<string, number>;
  }>();

  filtered.forEach(r => {
    const d = new Date(r.timestamp);
    const dateKey = d.toISOString().slice(0, 10);
    activeDaysSet.add(dateKey);

    // Model tally
    const currentModel = modelCounts.get(r.model) || { count: 0, displayName: r.modelDisplayName, category: r.category };
    currentModel.count++;
    modelCounts.set(r.model, currentModel);

    // Category tally
    const cat: ModelCategory = r.category in categoryCounts ? r.category : 'other';
    categoryCounts[cat]++;

    // Ratio tally
    const ratio = r.aspectRatio || '1:1';
    ratioCounts.set(ratio, (ratioCounts.get(ratio) || 0) + 1);

    // Resolution tally
    const res = r.resolution || 'Standard (1K)';
    resolutionCounts.set(res, (resolutionCounts.get(res) || 0) + 1);

    // Hour tally (0..23)
    const hour = d.getHours();
    hourCounts[hour]++;

    // Weekday tally (0..6)
    const day = d.getDay();
    weekdayCounts[day]++;

    // Daily timeline tally
    let dayEntry = dailyMap.get(dateKey);
    if (!dayEntry) {
      const fullDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      dayEntry = {
        date: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
        fullDate,
        timestamp: new Date(dateKey).getTime(),
        count: 0,
        byCategory: { pro_3_0: 0, flash_3_1: 0, lite_3_1: 0, other: 0 },
        byModel: {},
      };
      dailyMap.set(dateKey, dayEntry);
    }
    dayEntry.count++;
    dayEntry.byCategory[cat] = (dayEntry.byCategory[cat] || 0) + 1;
    dayEntry.byModel[r.model] = (dayEntry.byModel[r.model] || 0) + 1;
  });

  // Prepare filled timeline (for 7d or 28d or custom, fill missing days with 0 for smooth charts)
  let dailyTimeline: Array<{
    date: string;
    fullDate: string;
    timestamp: number;
    count: number;
    byCategory: Record<ModelCategory, number>;
    byModel: Record<string, number>;
  }> = [];

  const daysToSpan = filter.period === '1d' ? 1 : filter.period === '7d' ? 7 : filter.period === '28d' ? 28 : filter.period === '90d' ? 90 : 0;

  if (daysToSpan > 0 && daysToSpan <= 90) {
    const dayMs = 24 * 60 * 60 * 1000;
    const endMidnight = new Date();
    endMidnight.setHours(23, 59, 59, 999);

    for (let i = daysToSpan - 1; i >= 0; i--) {
      const targetDate = new Date(endMidnight.getTime() - i * dayMs);
      const key = targetDate.toISOString().slice(0, 10);
      const existing = dailyMap.get(key);
      if (existing) {
        dailyTimeline.push(existing);
      } else {
        const fullDate = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        dailyTimeline.push({
          date: targetDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
          fullDate,
          timestamp: targetDate.getTime(),
          count: 0,
          byCategory: { pro_3_0: 0, flash_3_1: 0, lite_3_1: 0, other: 0 },
          byModel: {},
        });
      }
    }
  } else {
    // Sort chronological for 'all' or large custom ranges
    dailyTimeline = Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Model breakdown array
  const modelBreakdown = Array.from(modelCounts.entries())
    .map(([model, data]) => {
      const percentage = filteredCount > 0 ? Math.round((data.count / filteredCount) * 1000) / 10 : 0;
      const meta = CATEGORY_METAS[data.category] || CATEGORY_METAS.other;
      return {
        model,
        displayName: data.displayName,
        category: data.category,
        count: data.count,
        percentage,
        badgeClass: meta.badgeClass,
        barColor: meta.barColor,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Category breakdown array
  const categoryBreakdown = (Object.keys(categoryCounts) as ModelCategory[])
    .map(cat => {
      const count = categoryCounts[cat];
      const percentage = filteredCount > 0 ? Math.round((count / filteredCount) * 1000) / 10 : 0;
      const meta = CATEGORY_METAS[cat] || CATEGORY_METAS.other;
      return {
        category: cat,
        label: meta.label,
        count,
        percentage,
        badgeClass: meta.badgeClass,
        color: meta.color,
        barColor: meta.barColor,
        textColor: meta.textColor,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Ratio breakdown array
  const ratioBreakdown = Array.from(ratioCounts.entries())
    .map(([ratio, count]) => ({
      ratio,
      count,
      percentage: filteredCount > 0 ? Math.round((count / filteredCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Resolution breakdown array
  const resolutionBreakdown = Array.from(resolutionCounts.entries())
    .map(([resolution, count]) => ({
      resolution,
      count,
      percentage: filteredCount > 0 ? Math.round((count / filteredCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Hourly distribution array
  const hourlyDistribution = hourCounts.map((count, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    count,
    percentage: filteredCount > 0 ? Math.round((count / filteredCount) * 1000) / 10 : 0,
  }));

  // Weekday distribution array (Starting from Monday)
  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  const weekdayDistribution = weekdayOrder.map(dayIndex => ({
    dayIndex,
    dayName: DAY_NAMES[dayIndex],
    shortName: DAY_SHORT_NAMES[dayIndex],
    count: weekdayCounts[dayIndex],
    percentage: filteredCount > 0 ? Math.round((weekdayCounts[dayIndex] / filteredCount) * 1000) / 10 : 0,
  }));

  // Top metrics
  const topModel = modelBreakdown.length > 0 ? modelBreakdown[0] : null;
  const topCategory = categoryBreakdown.length > 0 && categoryBreakdown[0].count > 0 ? categoryBreakdown[0] : null;
  const topRatio = ratioBreakdown.length > 0 ? ratioBreakdown[0] : null;
  const topResolution = resolutionBreakdown.length > 0 ? resolutionBreakdown[0] : null;

  // Peak hour
  let peakHourObj: { hour: number; label: string; count: number } | null = null;
  let maxHourCount = 0;
  hourlyDistribution.forEach(h => {
    if (h.count > maxHourCount) {
      maxHourCount = h.count;
      peakHourObj = { hour: h.hour, label: h.label, count: h.count };
    }
  });

  // Peak day
  let peakDayObj: { dayIndex: number; dayName: string; count: number } | null = null;
  let maxDayCount = 0;
  weekdayDistribution.forEach(w => {
    if (w.count > maxDayCount) {
      maxDayCount = w.count;
      peakDayObj = { dayIndex: w.dayIndex, dayName: w.dayName, count: w.count };
    }
  });

  // Average generations per day
  const effectiveDays = Math.max(1, activeDaysSet.size, daysToSpan > 0 ? daysToSpan : 1);
  const averagePerDay = Math.round((filteredCount / effectiveDays) * 10) / 10;

  return {
    totalLifetimeCount: lifetimeTotal,
    filteredCount,
    todayCount,
    sevenDaysCount,
    twentyEightDaysCount,
    averagePerDay,
    activeDaysCount: activeDaysSet.size,
    topModel,
    topCategory,
    topRatio,
    topResolution,
    peakHour: peakHourObj,
    peakDay: peakDayObj,
    dailyTimeline,
    modelBreakdown,
    categoryBreakdown,
    ratioBreakdown,
    resolutionBreakdown,
    hourlyDistribution,
    weekdayDistribution,
    filteredRecords: filtered,
  };
};
