import React, { useRef } from 'react';
import { TripoRecentTask, clearTripoRecentTasks } from '../../services/tripoService';
import { ThreeDBatchJob } from '../../services/tripoBatchService';
import { ThreedStatusFilter } from './types';
import { ThreeDBatchJobCard } from './ThreeDBatchJobCard';
import { Tripo3DTaskCard } from './Tripo3DTaskCard';
import { 
    Zap, RefreshCw, Box, FolderDown, ArrowDownCircle, FileJson, 
    UploadCloud, FileText, Loader2, Download, Trash2, Layers 
} from 'lucide-react';

interface Tripo3DTabProps {
    tripoBalance: number | null;
    isTripoBalanceLoading: boolean;
    refreshTripoBalance: () => void;
    recent3dTasks: TripoRecentTask[];
    setRecent3dTasks: React.Dispatch<React.SetStateAction<TripoRecentTask[]>>;
    threeDBatchJobs: ThreeDBatchJob[];
    threedStatusFilter: ThreedStatusFilter;
    setThreedStatusFilter: (f: ThreedStatusFilter) => void;
    fetchingTasksLimit: number | null;
    showManualImport: boolean;
    setShowManualImport: React.Dispatch<React.SetStateAction<boolean>>;
    manualTaskId: string;
    setManualTaskId: (id: string) => void;
    isImportingTaskId: boolean;
    isBatchProcessing: boolean;
    expanded3DBatchIds: Record<string, boolean>;
    setExpanded3DBatchIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    downloading3DZipId: string | null;
    onFetchRecentGenerations: (limit: number) => void;
    onExportAll3dTasks: () => void;
    onImportTask: (customId?: string) => void;
    onUploadSingleJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUploadBatchJsons: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenBatchPasteModal: () => void;
    onDownloadAll3DModelsZip: (job: ThreeDBatchJob) => Promise<void>;
    onDownloadMetadataJsonZip: (job: ThreeDBatchJob) => void;
    onDelete3DBatchJob: (jobId: string) => void;
    onRefreshSingleTask: (taskId: string) => void;
    onRemoveSingleTask: (taskId: string) => void;
    onDownload3dModel: (modelUrl: string, prompt?: string, taskId?: string) => void;
    onDownload3dPreview: (previewUrl: string, prompt?: string, taskId?: string) => void;
    onDownloadTaskJson: (task: TripoRecentTask) => void;
    onLoadModelIntoNode: (task: TripoRecentTask) => void;
    setImageViewer?: (viewer: any) => void;
    addToast?: (msg: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

export const Tripo3DTab: React.FC<Tripo3DTabProps> = ({
    tripoBalance,
    isTripoBalanceLoading,
    refreshTripoBalance,
    recent3dTasks,
    setRecent3dTasks,
    threeDBatchJobs,
    threedStatusFilter,
    setThreedStatusFilter,
    fetchingTasksLimit,
    showManualImport,
    setShowManualImport,
    manualTaskId,
    setManualTaskId,
    isImportingTaskId,
    isBatchProcessing,
    expanded3DBatchIds,
    setExpanded3DBatchIds,
    downloading3DZipId,
    onFetchRecentGenerations,
    onExportAll3dTasks,
    onImportTask,
    onUploadSingleJson,
    onUploadBatchJsons,
    onOpenBatchPasteModal,
    onDownloadAll3DModelsZip,
    onDownloadMetadataJsonZip,
    onDelete3DBatchJob,
    onRefreshSingleTask,
    onRemoveSingleTask,
    onDownload3dModel,
    onDownload3dPreview,
    onDownloadTaskJson,
    onLoadModelIntoNode,
    setImageViewer,
    addToast
}) => {
    const singleJsonInputRef = useRef<HTMLInputElement>(null);
    const batchJsonInputRef = useRef<HTMLInputElement>(null);

    const filtered3dTasks = recent3dTasks.filter(task => {
        if (threedStatusFilter === 'success') return task.status === 'success';
        if (threedStatusFilter === 'running') return task.status === 'running' || task.status === 'queued';
        if (threedStatusFilter === 'failed') return task.status === 'failed' || task.status === 'cancelled';
        return true;
    });

    return (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950">
            {/* Top Credit Balance Card (Positioned Above Tripo AI 3D Title) */}
            <div className="p-3 rounded-lg bg-gray-900 border border-yellow-700/40 text-xs text-gray-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-yellow-950/80 border border-yellow-700/60 text-yellow-400 flex items-center justify-center">
                        <Zap className={`w-4 h-4 text-yellow-400 ${isTripoBalanceLoading ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-semibold text-yellow-500 tracking-wider">
                            Баланс Tripo AI
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-base font-bold text-yellow-300 font-mono tracking-tight">
                                {tripoBalance !== null ? tripoBalance : (isTripoBalanceLoading ? '...' : '—')}
                            </span>
                            <span className="text-xs text-yellow-400/90 font-medium">кредитов</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refreshTripoBalance()}
                        disabled={isTripoBalanceLoading}
                        className="px-2.5 py-1.5 rounded-md bg-yellow-950/60 hover:bg-yellow-900/80 text-yellow-300 border border-yellow-700/60 hover:border-yellow-500 transition-all text-xs font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        title="Обновить баланс кредитов Tripo 3D"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTripoBalanceLoading ? 'animate-spin' : ''}`} />
                        <span>Обновить</span>
                    </button>
                </div>
            </div>

            {/* Tripo AI 3D Models Title Header & Fetch/Import Banner */}
            <div className="p-3 rounded-lg bg-gray-900 border border-purple-900/40 text-xs text-gray-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-purple-300 flex items-center justify-center">
                            <Box className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-100 flex items-center gap-1.5">
                                <span>Tripo AI • 3D Модели</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/50">
                                    v3.1 / v2.5
                                </span>
                            </h4>
                            <p className="text-[10px] text-gray-400">
                                Запрос моделей по Task ID, пакетный импорт JSON и скачивание .GLB
                            </p>
                        </div>
                    </div>

                    {/* Global Actions */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={onExportAll3dTasks}
                            disabled={recent3dTasks.length === 0}
                            className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                            title="Экспортировать все сохранённые 3D задачи в файл бэкапа JSON"
                        >
                            <FolderDown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Экспорт в JSON</span>
                        </button>
                        <button
                            onClick={() => onFetchRecentGenerations(100)}
                            disabled={fetchingTasksLimit !== null}
                            className="px-2 py-1 rounded bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-800/60 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                            title="Обновить статусы и ссылки для всех задач"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${fetchingTasksLimit !== null ? 'animate-spin' : ''}`} />
                            <span>Обновить все</span>
                        </button>
                    </div>
                </div>

                {/* Hidden File Inputs for JSON Import */}
                <input
                    ref={singleJsonInputRef}
                    type="file"
                    accept=".json"
                    onChange={onUploadSingleJson}
                    className="hidden"
                />
                <input
                    ref={batchJsonInputRef}
                    type="file"
                    accept=".json"
                    multiple
                    onChange={onUploadBatchJsons}
                    className="hidden"
                />

                {/* Action Buttons Toolbar: By ID, Single JSON, Batch JSON, Paste IDs */}
                <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setShowManualImport(prev => !prev)}
                        className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 border shadow-sm ${
                            showManualImport 
                                ? 'bg-purple-800 text-white border-purple-400' 
                                : 'bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-800/80'
                        }`}
                        title="Запросить готовую модель по конкретному Task ID из Tripo API"
                    >
                        <ArrowDownCircle className="w-3.5 h-3.5 text-purple-300" />
                        <span>Запрос по Task ID</span>
                    </button>

                    <button
                        onClick={() => singleJsonInputRef.current?.click()}
                        disabled={isBatchProcessing}
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/60 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        title="Выбрать сохранённый JSON файл задачи (3D_Model_...json)"
                    >
                        <FileJson className="w-3.5 h-3.5 text-amber-400" />
                        <span>Выбрать JSON задачи</span>
                    </button>

                    <button
                        onClick={() => batchJsonInputRef.current?.click()}
                        disabled={isBatchProcessing}
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        title="Пакетная загрузка: выбрать сразу несколько сохранённых JSON файлов задач"
                    >
                        <UploadCloud className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Пакетная загрузка JSON</span>
                    </button>

                    <button
                        onClick={onOpenBatchPasteModal}
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/60 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Вставить список из нескольких Task IDs для массового запроса"
                    >
                        <FileText className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Вставить список ID</span>
                    </button>
                </div>

                {/* Collapsible Manual Task ID Input */}
                {showManualImport && (
                    <div className="p-2.5 rounded-lg bg-gray-950 border border-purple-700/60 flex items-center gap-2 animate-fadeIn">
                        <input
                            type="text"
                            placeholder="Вставьте Task ID (напр. task_xxxxxxxx или tripo_...)..."
                            value={manualTaskId}
                            onChange={(e) => setManualTaskId(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onImportTask();
                            }}
                            className="flex-1 bg-gray-900 border border-gray-700 text-xs px-2.5 py-1.5 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                        />
                        <button
                            onClick={() => onImportTask()}
                            disabled={isImportingTaskId || !manualTaskId.trim()}
                            className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {isImportingTaskId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span>Запросить модель</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Filter Pills & Toolbar for 3D Models */}
            <div className="p-2 border-b border-gray-800 bg-gray-900/60 flex flex-wrap gap-1.5 items-center justify-between">
                <div className="flex gap-1 bg-gray-950 p-0.5 rounded-lg border border-gray-800 text-xs">
                    <button
                        onClick={() => setThreedStatusFilter('all')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                            threedStatusFilter === 'all' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Все ({recent3dTasks.length})
                    </button>
                    <button
                        onClick={() => setThreedStatusFilter('success')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                            threedStatusFilter === 'success' ? 'bg-emerald-700 text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Готовые ({recent3dTasks.filter(t => t.status === 'success').length})
                    </button>
                    <button
                        onClick={() => setThreedStatusFilter('running')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                            threedStatusFilter === 'running' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        В процессе ({recent3dTasks.filter(t => t.status === 'running' || t.status === 'queued').length})
                    </button>
                    <button
                        onClick={() => setThreedStatusFilter('failed')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                            threedStatusFilter === 'failed' ? 'bg-red-700 text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Ошибки ({recent3dTasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length})
                    </button>
                </div>

                {recent3dTasks.length > 0 && (
                    <button
                        onClick={() => {
                            if (window.confirm('Очистить локальный список недавних 3D генераций?')) {
                                clearTripoRecentTasks();
                                setRecent3dTasks([]);
                            }
                        }}
                        className="text-xs text-gray-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-800 transition-colors flex items-center gap-1"
                        title="Очистить локальный список"
                    >
                        <Trash2 className="w-3 h-3" />
                        <span>Очистить список</span>
                    </button>
                )}
            </div>

            {/* 3D Batch Generation Master Jobs Section */}
            {threeDBatchJobs.length > 0 && (
                <div className="space-y-3 pb-2 border-b border-gray-800">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
                        <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Пакетные задачи 3D ({threeDBatchJobs.length})</span>
                        </span>
                        <span className="text-[10px] text-gray-500">
                            {threeDBatchJobs.filter(j => j.status === 'running' || j.status === 'queued').length > 0
                                ? '⚡ Выполняется генерация...'
                                : 'Все задачи завершены'}
                        </span>
                    </div>

                    {threeDBatchJobs.map(job => (
                        <ThreeDBatchJobCard
                            key={job.id}
                            job={job}
                            isExpanded={!!expanded3DBatchIds[job.id]}
                            onToggleExpand={() => setExpanded3DBatchIds(p => ({ ...p, [job.id]: !p[job.id] }))}
                            isDownloadingZip={downloading3DZipId === job.id}
                            onDownloadAll3DModelsZip={onDownloadAll3DModelsZip}
                            onDownloadMetadataJsonZip={onDownloadMetadataJsonZip}
                            onDeleteJob={onDelete3DBatchJob}
                            addToast={addToast}
                        />
                    ))}
                </div>
            )}

            {/* 3D Models Cards List */}
            <div className="space-y-3">
                {filtered3dTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-center px-4 rounded-lg border border-dashed border-gray-800 bg-gray-950/40">
                        <Box className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
                        <p className="text-sm font-medium text-gray-400">Нет сохраненных 3D моделей</p>
                        <p className="text-xs text-gray-600 mt-1 max-w-xs">
                            Нажмите кнопку "Запросить 5 / 10 / 15 последних" выше или создайте новую модель в узле 3D Generation.
                        </p>
                    </div>
                ) : (
                    filtered3dTasks.map(task => (
                        <Tripo3DTaskCard
                            key={task.taskId}
                            task={task}
                            onRefresh={onRefreshSingleTask}
                            onRemove={onRemoveSingleTask}
                            onDownloadModel={onDownload3dModel}
                            onDownloadPreview={onDownload3dPreview}
                            onDownloadJson={onDownloadTaskJson}
                            onLoadIntoNode={onLoadModelIntoNode}
                            setImageViewer={setImageViewer}
                            addToast={addToast}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
