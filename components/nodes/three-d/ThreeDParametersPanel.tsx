import React, { useRef } from 'react';
import { useLanguage } from '../../../localization';
import CustomSelect from '../../CustomSelect';
import { CustomToggle } from '../../CustomToggle';
import { 
    Box, 
    Sparkles, 
    Zap, 
    Layers, 
    Cpu, 
    Download, 
    ChevronLeft, 
    ChevronRight, 
    Copy, 
    FileJson, 
    RefreshCw, 
    KeyRound, 
    ArrowDownCircle 
} from 'lucide-react';
import { 
    TRIPO_MODEL_OPTIONS, 
    TripoModelOption, 
    getTripoModelOption, 
    DEFAULT_TRIPO_MODEL_VERSION, 
    getTripoFaceLimitRange,
    TripoTextureQuality 
} from '../../../services/tripoService';
import { ThreeDNodeState } from './types';

interface ThreeDParametersPanelProps {
    nodeId: string;
    state: ThreeDNodeState;
    isGenerating: boolean;
    onUpdateState: (updater: Partial<ThreeDNodeState> | ((prev: ThreeDNodeState) => Partial<ThreeDNodeState>)) => void;
    // Task ID & JSON actions
    inputQueryTaskId: string;
    setInputQueryTaskId: (val: string) => void;
    isQueryingTaskId: boolean;
    showTaskIdPanel: boolean;
    setShowTaskIdPanel: React.Dispatch<React.SetStateAction<boolean>>;
    onCopyTaskId: () => void;
    onManualDownloadTaskJson: () => void;
    onQueryTaskById: (id?: string) => void;
    onImportTaskJsonFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const getModelOptionIcon = (option: TripoModelOption) => {
    if (option.isFlagship) {
        return (
            <div className="flex -space-x-0.5 items-center">
                <Box className="w-3.5 h-3.5 text-purple-400" />
                <Sparkles className="w-2.5 h-2.5 text-yellow-300 relative -top-1 -right-0.5" />
            </div>
        );
    }
    if (option.badge === 'Precision') {
        return (
            <div className="flex -space-x-0.5 items-center">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <Zap className="w-2.5 h-2.5 text-cyan-200 relative -top-1" />
            </div>
        );
    }
    if (option.badge === 'Fast') {
        return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (option.badge === 'Quality') {
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
    }
    return <Box className="w-3.5 h-3.5 text-gray-400" />;
};

const ThreeDParametersPanelComponent: React.FC<ThreeDParametersPanelProps> = ({
    nodeId,
    state,
    isGenerating,
    onUpdateState,
    inputQueryTaskId,
    setInputQueryTaskId,
    isQueryingTaskId,
    showTaskIdPanel,
    setShowTaskIdPanel,
    onCopyTaskId,
    onManualDownloadTaskJson,
    onQueryTaskById,
    onImportTaskJsonFile
}) => {
    const { t } = useLanguage();
    const jsonFileInputRef = useRef<HTMLInputElement>(null);

    const modelIndex = TRIPO_MODEL_OPTIONS.findIndex(m => m.value === state.modelVersion);
    const currentModelOption = getTripoModelOption(state.modelVersion);

    const handlePrevModel = () => {
        if (modelIndex > 0) {
            onUpdateState({ modelVersion: TRIPO_MODEL_OPTIONS[modelIndex - 1].value, faceLimit: undefined, quadMesh: false });
        }
    };

    const handleNextModel = () => {
        if (modelIndex !== -1 && modelIndex < TRIPO_MODEL_OPTIONS.length - 1) {
            onUpdateState({ modelVersion: TRIPO_MODEL_OPTIONS[modelIndex + 1].value, faceLimit: undefined, quadMesh: false });
        }
    };

    return (
        <div className="bg-gray-950/85 border-t border-gray-800/90 p-3 space-y-2.5 shrink-0 overflow-visible relative z-30">
            {/* 2-Column Responsive Layout with strictly aligned rows */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start overflow-visible">
                {/* Left Column: Model Selection (md:col-span-6) */}
                <div className="md:col-span-6 space-y-1.5 min-w-0 overflow-visible">
                    <div className="h-5 flex items-center gap-1.5 min-w-0">
                        <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-200 truncate">{t('threed.model') || 'Tripo 3D Model'}</span>
                        {currentModelOption?.badge && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border shrink-0 ${
                                currentModelOption.isFlagship 
                                    ? 'bg-purple-950/90 text-purple-300 border-purple-600/60 shadow-sm' 
                                    : currentModelOption.badge === 'Precision'
                                        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/60 shadow-sm'
                                        : currentModelOption.badge === 'Fast'
                                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60 shadow-sm'
                                            : 'bg-blue-950/90 text-blue-300 border-blue-600/60 shadow-sm'
                            }`}>
                                {currentModelOption.badge}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1 overflow-visible">
                        <button
                            type="button"
                            title="Previous Model"
                            onClick={handlePrevModel}
                            disabled={isGenerating || modelIndex <= 0}
                            className="flex items-center justify-center h-[36px] w-[36px] bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1 min-w-0 overflow-visible">
                            <CustomSelect
                                value={state.modelVersion}
                                onChange={(val) => onUpdateState({ modelVersion: val, faceLimit: undefined, quadMesh: false })}
                                disabled={isGenerating}
                                direction="down"
                                title={currentModelOption?.description}
                                options={TRIPO_MODEL_OPTIONS.map(opt => ({
                                    value: opt.value,
                                    label: opt.label,
                                    badge: opt.badge,
                                    icon: getModelOptionIcon(opt)
                                }))}
                                renderTriggerContent={(selectedOption) => (
                                    <div className="flex items-center gap-2 font-medium text-xs truncate">
                                        {selectedOption?.icon}
                                        <span className="truncate">{selectedOption?.label || state.modelVersion}</span>
                                    </div>
                                )}
                            />
                        </div>
                        <button
                            type="button"
                            title="Next Model"
                            onClick={handleNextModel}
                            disabled={isGenerating || modelIndex >= TRIPO_MODEL_OPTIONS.length - 1 || modelIndex === -1}
                            className="flex items-center justify-center h-[36px] w-[36px] bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors shrink-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Right Columns: Texture Quality & Mesh Quality (md:col-span-6) */}
                <div className="md:col-span-6 grid grid-cols-2 gap-2 overflow-visible">
                    {/* Texture Quality */}
                    <div className="flex flex-col space-y-1.5 min-w-0 overflow-visible">
                        <div className="h-5 flex items-center gap-1.5 min-w-0">
                            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="text-xs font-semibold text-gray-300 truncate">{t('threed.textureQuality') || 'Texture Quality'}</span>
                        </div>
                        <CustomSelect
                            value={state.textureQuality}
                            onChange={(val) => onUpdateState({ textureQuality: val as TripoTextureQuality })}
                            disabled={isGenerating || !state.texture}
                            direction="down"
                            options={[
                                { value: 'extreme', label: 'Extreme (4K Texture • Max)' },
                                { value: 'detailed', label: 'Detailed (HQ Texture)' },
                                { value: 'standard', label: 'Standard Texture' }
                            ]}
                        />
                    </div>

                    {/* Mesh Quality / Face Limit */}
                    <div className="flex flex-col space-y-1.5 min-w-0 overflow-visible">
                        <div className="h-5 flex items-center gap-1.5 min-w-0">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="text-xs font-semibold text-gray-300 truncate">{t('threed.faceLimit') || 'Mesh Density'}</span>
                        </div>
                        <CustomSelect
                            value={state.faceLimit ? String(state.faceLimit) : ''}
                            onChange={(val) => onUpdateState({ faceLimit: val ? Number(val) : undefined })}
                            disabled={isGenerating}
                            direction="down"
                            options={[
                                { value: '1500000', label: '1.5M (H3.1 Standard)' },
                                { value: '1000000', label: '1M (1M Poly • Master)' },
                                { value: '500000', label: '500K (500K Poly • Ultra)' },
                                { value: '100000', label: '100K (100K Poly • High-Res)' },
                                { value: '50000', label: '50K (50K Poly • Detailed)' },
                                { value: '25000', label: '25K (25K Poly • Standard)' },
                                { value: '20000', label: '20K (P1 Max)' },
                                { value: '10000', label: '10K (10K Poly • Low Poly)' },
                                { value: '', label: 'Auto (Default Tripo)' }
                            ].filter(option => !option.value || Number(option.value) <= getTripoFaceLimitRange(state.modelVersion === 'default' ? DEFAULT_TRIPO_MODEL_VERSION : state.modelVersion, state.quadMesh).max)}
                        />
                    </div>
                </div>
            </div>

            {/* Stylish Toggles Row (CustomToggle with interactive pill track & floating tooltips) */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/80 overflow-visible">
                <CustomToggle
                    id={`node-${nodeId}-autosave-glb`}
                    checked={state.autoSave3d !== false}
                    onChange={(checked) => onUpdateState({ autoSave3d: checked })}
                    label="Автоскачивание .GLB"
                    tooltip="Автоматически скачивать файл 3D модели (.GLB) на диск при завершении генерации"
                    icon={<Download className="w-3.5 h-3.5 text-emerald-400" />}
                />
                <CustomToggle
                    id={`node-${nodeId}-autosave-json`}
                    checked={state.autoSaveJson !== false}
                    onChange={(checked) => onUpdateState({ autoSaveJson: checked })}
                    label="Автосохранение JSON задачи"
                    tooltip="Автоматически скачивать JSON файл с Task ID при создании задачи и обновлять при завершении"
                    icon={<FileJson className="w-3.5 h-3.5 text-amber-400" />}
                />
                <CustomToggle
                    id={`node-${nodeId}-texture`}
                    checked={state.texture}
                    onChange={(checked) => onUpdateState({ texture: checked, pbr: checked ? state.pbr : false })}
                    label={t('threed.texture') || 'Textures'}
                    tooltip={t('threed.textureTooltip') || 'Генерация диффузных текстур и UV-развёртки'}
                    icon={<Layers className="w-3.5 h-3.5" />}
                />
                <CustomToggle
                    id={`node-${nodeId}-pbr`}
                    checked={state.pbr && state.texture}
                    disabled={!state.texture}
                    onChange={(checked) => onUpdateState({ pbr: checked, texture: checked ? true : state.texture })}
                    label={t('threed.pbr') || 'PBR Materials'}
                    tooltip={t('threed.pbrTooltip') || 'Генерация карт шероховатости и металличности (Roughness / Metallic)'}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                />
                <CustomToggle
                    id={`node-${nodeId}-quadmesh`}
                    checked={state.quadMesh}
                    onChange={(checked) => onUpdateState({ quadMesh: checked, faceLimit: undefined })}
                    label={t('threed.quadMesh') || 'Quad Mesh'}
                    tooltip={t('threed.quadMeshTooltip') || 'Преобразование сетки в чистую четырёхугольную топологию (Quads)'}
                    icon={<Box className="w-3.5 h-3.5" />}
                />
                <CustomToggle
                    id={`node-${nodeId}-autorotate`}
                    checked={state.autoRotate}
                    onChange={(checked) => onUpdateState({ autoRotate: checked })}
                    label={t('threed.autoRotate') || 'Auto-Rotate'}
                    tooltip={t('threed.autoRotateTooltip') || 'Автоматическое плавное вращение 3D модели в окне предпросмотра'}
                    icon={<Zap className="w-3.5 h-3.5" />}
                />
            </div>

            {/* Task ID Safety, JSON Backup & Recovery Toolbar */}
            <div className="pt-2 border-t border-gray-800/80 space-y-2">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setShowTaskIdPanel(prev => !prev)}
                        className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-colors"
                    >
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Управление Task ID & JSON бэкап</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                            ({state.taskId ? state.taskId.slice(0, 10) + '...' : 'нет ID'})
                        </span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        {state.taskId && (
                            <button
                                type="button"
                                onClick={onCopyTaskId}
                                className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-[10px] font-mono flex items-center gap-1 transition-colors"
                                title="Скопировать Task ID в буфер"
                            >
                                <Copy className="w-2.5 h-2.5" />
                                <span>Копировать ID</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onManualDownloadTaskJson}
                            className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/60 text-[10px] flex items-center gap-1 transition-colors"
                            title="Скачать метаданные задачи в формате JSON"
                        >
                            <FileJson className="w-2.5 h-2.5 text-amber-400" />
                            <span>Скачать JSON</span>
                        </button>
                    </div>
                </div>

                {showTaskIdPanel && (
                    <div className="p-2.5 rounded-lg bg-gray-950/90 border border-cyan-900/50 space-y-2 animate-fadeIn">
                        {state.taskId && (
                            <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-gray-900 border border-gray-800 text-[10px] font-mono">
                                <span className="text-gray-400">Текущий Task ID:</span>
                                <span className="text-cyan-300 font-bold select-all truncate">{state.taskId}</span>
                                <button
                                    type="button"
                                    onClick={() => onQueryTaskById(state.taskId)}
                                    disabled={isQueryingTaskId}
                                    className="px-1.5 py-0.5 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-[10px] flex items-center gap-1"
                                    title="Обновить статус и ссылки модели из Tripo API"
                                >
                                    <RefreshCw className={`w-2.5 h-2.5 ${isQueryingTaskId ? 'animate-spin' : ''}`} />
                                    <span>Обновить</span>
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Вставьте сохранённый Task ID (task_...)"
                                value={inputQueryTaskId}
                                onChange={(e) => setInputQueryTaskId(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') onQueryTaskById(); }}
                                className="flex-1 bg-gray-900 border border-gray-700 text-xs px-2.5 py-1.5 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => onQueryTaskById()}
                                disabled={isQueryingTaskId || !inputQueryTaskId.trim()}
                                className="px-3 py-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-xs flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0"
                            >
                                {isQueryingTaskId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowDownCircle className="w-3 h-3" />}
                                <span>Загрузить по ID</span>
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-800/80">
                            <span className="text-[10px] text-gray-400">Восстановить из файла:</span>
                            <input
                                ref={jsonFileInputRef}
                                type="file"
                                accept=".json"
                                onChange={onImportTaskJsonFile}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => jsonFileInputRef.current?.click()}
                                className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs flex items-center gap-1.5 transition-colors"
                                title="Выбрать сохранённый файл 3D_Model_...json"
                            >
                                <FileJson className="w-3 h-3 text-amber-400" />
                                <span>Выбрать JSON задачи</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ThreeDParametersPanel = React.memo(ThreeDParametersPanelComponent);
