import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ActionButton } from '../../ActionButton';
import { DebouncedTextarea } from '../../DebouncedTextarea';
import { Tooltip } from '../../Tooltip';
import { CopyIcon } from '../../icons/AppIcons';
import { DEFAULT_MULTIVIEW_PROMPT } from '../../../services/gemini/constants';
import { generateMultiviewTurnaroundPrompt } from '../../../services/geminiService';
import { generateThumbnail } from '../../../utils/imageUtils';
import { useLLMModelConfig } from '../../../hooks/useLLMModelConfig';
import { useLanguage } from '../../../localization';

export interface MultiviewBatchItem {
    id: string;
    index: number; // 1-based (01, 02, etc.)
    image: string; // Data URL or base64
    prompt: string; // Generated turnaround prompt
    status?: 'idle' | 'generating' | 'completed' | 'error';
    error?: string;
    isSelected?: boolean;
}

interface MultiviewSequenceViewProps {
    nodeId: string;
    parsedValue: any;
    onValueUpdate: (updates: any) => void;
    connectedInputs?: Set<string | undefined>;
    getUpstreamNodeValues: (nodeId: string, handleType?: string) => any[];
    addToast?: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
    onSelectNode?: () => void;
    onSavePromptToLibrary?: (prompt: string) => void;
    leftPaneWidth: number;
    onResizeLeftPane: (e: React.MouseEvent) => void;
    t: (key: string, options?: any) => string;
}

export const MultiviewSequenceView: React.FC<MultiviewSequenceViewProps> = ({
    nodeId,
    parsedValue,
    onValueUpdate,
    connectedInputs,
    getUpstreamNodeValues,
    addToast,
    onSelectNode,
    onSavePromptToLibrary,
    leftPaneWidth,
    onResizeLeftPane,
    t
}) => {
    const { language } = useLanguage();
    const { flashModel, proModel, flashLabel, proLabel } = useLLMModelConfig();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
    const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState<number | null>(null);
    const abortRef = useRef<boolean>(false);

    // Multiview architect prompt
    const multiviewPrompt = parsedValue.multiviewPrompt !== undefined
        ? parsedValue.multiviewPrompt
        : DEFAULT_MULTIVIEW_PROMPT;

    // Multiview model
    const multiviewModel = parsedValue.multiviewModel || parsedValue.modificationModel || 'flash';
    const isFlash = multiviewModel === 'flash' || multiviewModel.includes('flash') || (!multiviewModel.includes('pro') && multiviewModel !== 'pro');

    // Items in batch
    const items: MultiviewBatchItem[] = useMemo(() => {
        if (Array.isArray(parsedValue.multiviewItems) && parsedValue.multiviewItems.length > 0) {
            return parsedValue.multiviewItems;
        }
        return [];
    }, [parsedValue.multiviewItems]);

    // Check upstream images
    const isImageInputConnected = connectedInputs?.has('image') || connectedInputs?.has(undefined);
    const upstreamImages = useMemo(() => {
        const values = getUpstreamNodeValues(nodeId, 'image');
        const list: { base64ImageData: string; mimeType: string }[] = [];
        values.forEach(v => {
            if (typeof v === 'object' && v !== null && 'base64ImageData' in v && v.base64ImageData) {
                list.push(v as { base64ImageData: string; mimeType: string });
            } else if (typeof v === 'string' && v.startsWith('data:image')) {
                const parts = v.split(',');
                const mime = v.match(/:(.*?);/)?.[1] || 'image/png';
                list.push({ base64ImageData: parts[1], mimeType: mime });
            }
        });
        return list;
    }, [getUpstreamNodeValues, nodeId, connectedInputs]);

    // Automatically sync upstream images if batch is empty and upstream images are detected
    useEffect(() => {
        if (upstreamImages.length > 0 && items.length === 0) {
            const newItems: MultiviewBatchItem[] = upstreamImages.map((img, idx) => ({
                id: `upstream-${idx + 1}-${Date.now()}`,
                index: idx + 1,
                image: `data:${img.mimeType || 'image/png'};base64,${img.base64ImageData}`,
                prompt: '',
                status: 'idle',
                isSelected: true
            }));
            onValueUpdate({ multiviewItems: newItems });
        }
    }, [upstreamImages, items.length, onValueUpdate]);

    const handleImportUpstreamImages = () => {
        if (upstreamImages.length === 0) {
            if (addToast) addToast(language === 'ru' ? 'Нет подключенных входных изображений' : 'No upstream images found', 'warning');
            return;
        }
        const existingUrls = new Set(items.map(it => it.image));
        const newItems: MultiviewBatchItem[] = [...items];
        let addedCount = 0;

        upstreamImages.forEach((img) => {
            const dataUrl = `data:${img.mimeType || 'image/png'};base64,${img.base64ImageData}`;
            if (!existingUrls.has(dataUrl)) {
                newItems.push({
                    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    index: newItems.length + 1,
                    image: dataUrl,
                    prompt: '',
                    status: 'idle',
                    isSelected: true
                });
                addedCount++;
            }
        });

        // Re-index
        const reindexed = newItems.map((item, idx) => ({ ...item, index: idx + 1 }));
        onValueUpdate({ multiviewItems: reindexed });

        if (addToast) {
            addToast(
                language === 'ru'
                    ? `Импортировано ${addedCount} изображений из входа`
                    : `Imported ${addedCount} upstream images`,
                'success'
            );
        }
    };

    const handleModelChange = (model: string) => {
        onValueUpdate({ multiviewModel: model });
    };

    const handlePromptChange = (newPrompt: string) => {
        onValueUpdate({ multiviewPrompt: newPrompt });
    };

    const handleResetPrompt = () => {
        handlePromptChange(DEFAULT_MULTIVIEW_PROMPT);
        if (addToast) {
            addToast(
                language === 'ru'
                    ? 'Сброшено к стандартному промпту 3D Multiview Architect'
                    : 'Reset to default 3D Multiview Architect specification',
                'info'
            );
        }
    };

    const handlePastePrompt = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                handlePromptChange(text);
                if (addToast) addToast(t('toast.pastedFromClipboard'), 'success');
            }
        } catch {
            if (addToast) addToast(t('toast.pasteFailed'), 'error');
        }
    };

    const handleCopyPrompt = () => {
        if (multiviewPrompt) {
            navigator.clipboard.writeText(multiviewPrompt);
            if (addToast) addToast(t('toast.copiedToClipboard'), 'success');
        }
    };

    const handleAddImages = async (newImages: string[]) => {
        if (newImages.length === 0) return;
        const currentItems = [...items];
        const processedItems: MultiviewBatchItem[] = [...currentItems];

        for (const dataUrl of newImages) {
            let thumb = dataUrl;
            try {
                thumb = await generateThumbnail(dataUrl, 512, 512);
            } catch {
                thumb = dataUrl;
            }
            processedItems.push({
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                index: processedItems.length + 1,
                image: thumb,
                prompt: '',
                status: 'idle',
                isSelected: true
            });
        }

        const reindexed = processedItems.map((item, idx) => ({ ...item, index: idx + 1 }));
        onValueUpdate({ multiviewItems: reindexed });
        if (addToast) {
            addToast(
                language === 'ru'
                    ? `Добавлено ${newImages.length} изображений`
                    : `Added ${newImages.length} image(s)`,
                'success'
            );
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const promises = files.map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target?.result as string);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then((urls) => {
            handleAddImages(urls.filter(Boolean));
        });

        if (e.target) e.target.value = '';
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        const promises = files.map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target?.result as string);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(promises).then((urls) => {
            handleAddImages(urls.filter(Boolean));
        });
    };

    const handlePasteImageFromClipboard = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            const newImages: string[] = [];

            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const url = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve(ev.target?.result as string);
                            reader.readAsDataURL(blob);
                        });
                        if (url) newImages.push(url);
                    }
                }
            }

            if (newImages.length > 0) {
                handleAddImages(newImages);
            } else {
                if (addToast) addToast(language === 'ru' ? 'В буфере обмена нет изображения' : 'No image found in clipboard', 'error');
            }
        } catch {
            if (addToast) addToast(language === 'ru' ? 'Не удалось прочитать изображение из буфера' : 'Could not read image from clipboard', 'error');
        }
    };

    const handleDeleteItem = (id: string) => {
        const filtered = items.filter(it => it.id !== id);
        const reindexed = filtered.map((it, idx) => ({ ...it, index: idx + 1 }));
        onValueUpdate({ multiviewItems: reindexed });
    };

    const handleToggleSelectItem = (id: string) => {
        const updated = items.map(it => it.id === id ? { ...it, isSelected: it.isSelected === false ? true : false } : it);
        onValueUpdate({ multiviewItems: updated });
    };

    const handleSelectAll = (select: boolean) => {
        const updated = items.map(it => ({ ...it, isSelected: select }));
        onValueUpdate({ multiviewItems: updated });
    };

    const handleClearAllItems = () => {
        onValueUpdate({ multiviewItems: [] });
    };

    const handleUpdateItemPrompt = (id: string, newPrompt: string) => {
        const updated = items.map(it => it.id === id ? { ...it, prompt: newPrompt } : it);
        onValueUpdate({ multiviewItems: updated });
    };

    // Single item generation
    const handleGenerateSingleItem = async (item: MultiviewBatchItem) => {
        if (!item.image) return;
        const currentItems = [...items];
        const updatedStart = currentItems.map(it => it.id === item.id ? { ...it, status: 'generating' as const, error: undefined } : it);
        onValueUpdate({ multiviewItems: updatedStart });

        try {
            const parts = item.image.split(',');
            const mime = item.image.match(/:(.*?);/)?.[1] || 'image/png';
            const base64Data = parts[1];

            const result = await generateMultiviewTurnaroundPrompt(
                { base64ImageData: base64Data, mimeType: mime },
                multiviewPrompt,
                multiviewModel
            );

            const updatedEnd = parsedValue.multiviewItems?.map((it: MultiviewBatchItem) =>
                it.id === item.id ? { ...it, prompt: result, status: 'completed' as const } : it
            ) || [];
            onValueUpdate({ multiviewItems: updatedEnd });

            if (addToast) {
                addToast(
                    language === 'ru'
                        ? `Промпт для изображения ${String(item.index).padStart(2, '0')} успешно сгенерирован`
                        : `Turnaround prompt for image ${String(item.index).padStart(2, '0')} generated`,
                    'success'
                );
            }
        } catch (err: any) {
            const updatedErr = parsedValue.multiviewItems?.map((it: MultiviewBatchItem) =>
                it.id === item.id ? { ...it, status: 'error' as const, error: err?.message || 'Failed' } : it
            ) || [];
            onValueUpdate({ multiviewItems: updatedErr });
            if (addToast) addToast(err?.message || 'Generation failed', 'error');
        }
    };

    // Sequential batch generation
    const handleStartBatchGeneration = async () => {
        const targetItems = items.filter(it => it.isSelected !== false);
        if (targetItems.length === 0) {
            if (addToast) addToast(language === 'ru' ? 'Выберите хотя бы одно изображение' : 'Please select at least one image', 'warning');
            return;
        }

        setIsGeneratingBatch(true);
        abortRef.current = false;

        let workingItems = [...items];

        for (let i = 0; i < targetItems.length; i++) {
            if (abortRef.current) break;
            const currentTarget = targetItems[i];
            setCurrentGeneratingIndex(currentTarget.index);

            // Mark current item generating
            workingItems = workingItems.map(it => it.id === currentTarget.id ? { ...it, status: 'generating', error: undefined } : it);
            onValueUpdate({ multiviewItems: workingItems });

            try {
                const parts = currentTarget.image.split(',');
                const mime = currentTarget.image.match(/:(.*?);/)?.[1] || 'image/png';
                const base64Data = parts[1];

                const result = await generateMultiviewTurnaroundPrompt(
                    { base64ImageData: base64Data, mimeType: mime },
                    multiviewPrompt,
                    multiviewModel
                );

                workingItems = workingItems.map(it => it.id === currentTarget.id ? { ...it, prompt: result, status: 'completed' } : it);
                onValueUpdate({ multiviewItems: workingItems });
            } catch (err: any) {
                workingItems = workingItems.map(it => it.id === currentTarget.id ? { ...it, status: 'error', error: err?.message || 'Error' } : it);
                onValueUpdate({ multiviewItems: workingItems });
            }
        }

        setIsGeneratingBatch(false);
        setCurrentGeneratingIndex(null);

        if (!abortRef.current && addToast) {
            addToast(
                language === 'ru'
                    ? `Пакетная генерация мультивью промптов завершена!`
                    : `Batch turnaround prompt generation complete!`,
                'success'
            );
        }
    };

    const handleStopGeneration = () => {
        abortRef.current = true;
        setIsGeneratingBatch(false);
        setCurrentGeneratingIndex(null);
        if (addToast) addToast(language === 'ru' ? 'Генерация остановлена' : 'Generation stopped', 'info');
    };

    const handleCopyAllPrompts = () => {
        const generatedList = items.filter(it => it.prompt && it.prompt.trim() !== '');
        if (generatedList.length === 0) {
            if (addToast) addToast(language === 'ru' ? 'Нет сгенерированных промптов' : 'No generated prompts to copy', 'warning');
            return;
        }

        const formatted = generatedList.map(it => {
            const idxStr = String(it.index).padStart(2, '0');
            return `=== [Image ${idxStr}] Multiview Turnaround Prompt ===\n${it.prompt}\n`;
        }).join('\n');

        navigator.clipboard.writeText(formatted);
        if (addToast) addToast(language === 'ru' ? `Скопировано ${generatedList.length} промптов` : `Copied ${generatedList.length} prompts`, 'success');
    };

    const handleClearResults = () => {
        const updated = items.map(it => ({ ...it, prompt: '', status: 'idle' as const, error: undefined }));
        onValueUpdate({ multiviewItems: updated });
    };

    const selectedCount = items.filter(it => it.isSelected !== false).length;
    const completedCount = items.filter(it => it.prompt && it.prompt.trim() !== '').length;

    return (
        <div className="relative h-full w-full flex space-x-2 select-none" onMouseDown={e => e.stopPropagation()}>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* LEFT PANE: CONTROLS, ARCHITECT PROMPT & INPUT IMAGES BATCH */}
            <div className="h-full flex flex-col space-y-2 flex-shrink-0 min-h-0" style={{ width: `${leftPaneWidth}px` }}>
                {/* Top Controls Row */}
                <div className="flex items-center space-x-2 h-10 flex-shrink-0">
                    {/* Model Switcher */}
                    <div className="flex bg-gray-900 rounded-md p-1 space-x-1 h-10 flex-shrink-0 w-28 border border-gray-800">
                        <Tooltip content={`Flash (${flashLabel || flashModel})`} className="h-full flex-1">
                            <button
                                onClick={() => handleModelChange('flash')}
                                disabled={isGeneratingBatch}
                                className={`flex-1 rounded text-[10px] font-bold transition-colors h-full ${
                                    isFlash ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Flash
                            </button>
                        </Tooltip>
                        <Tooltip content={`Pro (${proLabel || proModel})`} className="h-full flex-1">
                            <button
                                onClick={() => handleModelChange('pro')}
                                disabled={isGeneratingBatch}
                                className={`flex-1 rounded text-[10px] font-bold transition-colors h-full ${
                                    !isFlash ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Pro
                            </button>
                        </Tooltip>
                    </div>

                    {/* Generate / Stop Button */}
                    {isGeneratingBatch ? (
                        <button
                            onClick={handleStopGeneration}
                            className="flex-grow h-10 px-4 font-bold text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors shadow flex items-center justify-center space-x-2 text-xs"
                        >
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>
                                {language === 'ru'
                                    ? `Генерация ${currentGeneratingIndex || 1}/${targetItemsCount(items)} (Остановить)`
                                    : `Generating ${currentGeneratingIndex || 1}/${targetItemsCount(items)} (Stop)`}
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={handleStartBatchGeneration}
                            disabled={items.length === 0}
                            className="flex-grow h-10 px-4 font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md transition-all shadow-md shadow-purple-600/30 flex items-center justify-center space-x-2 text-xs"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            <span>
                                {language === 'ru'
                                    ? `Сгенерировать мультивью (${selectedCount})`
                                    : `Generate Multiview Prompts (${selectedCount})`}
                            </span>
                        </button>
                    )}
                </div>

                {/* Section 1: Master Architect Prompt (Fixed Height / Resizable) */}
                <div className="flex flex-col flex-shrink-0 bg-gray-950/60 rounded-lg border border-gray-800 p-2 space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider truncate">
                                {language === 'ru' ? '3D Turnaround Architect (Промпт для каждого кадра)' : '3D Turnaround Architect Specification'}
                            </label>
                        </div>
                        <div className="flex items-center space-x-1">
                            <ActionButton title={language === 'ru' ? 'Сбросить к стандарту' : 'Reset to default specification'} onClick={handleResetPrompt}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.paste')} onClick={handlePastePrompt}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </ActionButton>
                            <ActionButton title={t('node.action.copy')} onClick={handleCopyPrompt}>
                                <CopyIcon className="h-3.5 w-3.5" />
                            </ActionButton>
                        </div>
                    </div>
                    <DebouncedTextarea
                        value={multiviewPrompt}
                        onDebouncedChange={handlePromptChange}
                        placeholder="Architect prompt instructions for 3D turnaround..."
                        className="w-full h-24 p-2 bg-input border-none rounded-md resize-y focus:ring-2 focus:ring-purple-500 focus:outline-none text-[11px] leading-relaxed text-gray-200"
                        onWheel={e => e.stopPropagation()}
                        onMouseDown={e => { e.stopPropagation(); onSelectNode?.(); }}
                    />
                </div>

                {/* Section 2: Input Images Batch Queue / Gallery (Expands to fill remaining height) */}
                <div
                    className={`flex-1 flex flex-col min-h-0 bg-gray-950/60 rounded-lg border transition-colors p-2 ${
                        isDraggingOver ? 'border-purple-500 bg-purple-950/20' : 'border-gray-800'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={handleFileDrop}
                >
                    {/* Header with Batch Actions */}
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                                {language === 'ru' ? 'Пакет изображений' : 'Input Images Batch'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-900/60 text-purple-300 font-mono font-bold border border-purple-700/50">
                                {items.length}
                            </span>
                            {upstreamImages.length > 0 && (
                                <button
                                    onClick={handleImportUpstreamImages}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 hover:bg-blue-800 border border-blue-700/50 transition-colors flex items-center space-x-1"
                                    title="Import images from connected upstream node"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>+{upstreamImages.length} из входа</span>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center space-x-1">
                            <ActionButton title={language === 'ru' ? 'Вставить изображение из буфера' : 'Paste image from clipboard'} onClick={handlePasteImageFromClipboard}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </ActionButton>
                            <ActionButton title={language === 'ru' ? 'Загрузить изображения' : 'Upload image files'} onClick={() => fileInputRef.current?.click()}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </ActionButton>
                            {items.length > 0 && (
                                <>
                                    <ActionButton
                                        title={selectedCount === items.length ? 'Deselect All' : 'Select All'}
                                        onClick={() => handleSelectAll(selectedCount !== items.length)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </ActionButton>
                                    <ActionButton title={language === 'ru' ? 'Очистить все изображения' : 'Clear all images'} onClick={handleClearAllItems}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </ActionButton>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Image Cards List / Drop Zone */}
                    {items.length > 0 ? (
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-0">
                            {items.map((item) => {
                                const idxStr = String(item.index).padStart(2, '0');
                                const isCurrent = currentGeneratingIndex === item.index;
                                const isDone = !!item.prompt && item.prompt.trim() !== '';

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center space-x-2 p-1.5 rounded-md border transition-all ${
                                            isCurrent
                                                ? 'bg-purple-950/50 border-purple-500 shadow-sm shadow-purple-500/30'
                                                : isDone
                                                ? 'bg-gray-900/80 border-gray-700/80 hover:border-purple-500/50'
                                                : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={item.isSelected !== false}
                                            onChange={() => handleToggleSelectItem(item.id)}
                                            className="rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                                        />

                                        {/* Number Badge (01-N) */}
                                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-black/60 text-purple-300 border border-purple-800/40">
                                            {idxStr}
                                        </span>

                                        {/* Thumbnail Preview */}
                                        <div className="w-12 h-12 rounded bg-black/50 border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                                            <img
                                                src={item.image}
                                                alt={`Batch item ${idxStr}`}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>

                                        {/* Info & Status */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center space-x-1">
                                                <span className="text-[11px] font-medium text-gray-200 truncate">
                                                    Image #{idxStr}
                                                </span>
                                                {item.status === 'generating' && (
                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/80 text-purple-200 border border-purple-600 flex items-center space-x-1 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                                        <span>{language === 'ru' ? 'Генерация...' : 'Generating...'}</span>
                                                    </span>
                                                )}
                                                {isDone && (
                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 flex items-center space-x-0.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        <span>{language === 'ru' ? 'Готово' : 'Ready'}</span>
                                                    </span>
                                                )}
                                                {item.status === 'error' && (
                                                    <span className="text-[9px] px-1 py-0.2 rounded bg-red-950/80 text-red-300 border border-red-700/50">
                                                        {language === 'ru' ? 'Ошибка' : 'Error'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[9px] text-gray-500 truncate mt-0.5">
                                                {item.prompt ? item.prompt.slice(0, 45) + '...' : (language === 'ru' ? 'Промпт не сгенерирован' : 'No prompt generated')}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                            <ActionButton
                                                title={language === 'ru' ? 'Сгенерировать этот элемент' : 'Generate prompt for this item'}
                                                onClick={() => handleGenerateSingleItem(item)}
                                                disabled={isGeneratingBatch}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </ActionButton>
                                            <ActionButton
                                                title={language === 'ru' ? 'Удалить из пакета' : 'Delete from batch'}
                                                onClick={() => handleDeleteItem(item.id)}
                                                disabled={isGeneratingBatch}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </ActionButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-700 hover:border-purple-500 rounded bg-gray-900/30 hover:bg-purple-950/20 cursor-pointer transition-colors p-4 text-center min-h-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-300 font-semibold mb-1">
                                {language === 'ru' ? 'Пакет изображений пуст' : 'Batch image queue is empty'}
                            </span>
                            <span className="text-[10px] text-gray-400 max-w-[280px]">
                                {language === 'ru'
                                    ? 'Перетащите сюда файлы изображений, вставьте из буфера (Ctrl+V) или подключите узел'
                                    : 'Drop multiple image files here, paste from clipboard (Ctrl+V), or connect upstream node'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* RESIZER SPLITTER */}
            <div
                onMouseDown={onResizeLeftPane}
                className="w-2 h-full bg-gray-700/50 hover:bg-purple-600 cursor-col-resize rounded transition-colors flex-shrink-0"
            />

            {/* RIGHT PANE: GENERATED MULTIVIEW TURNAROUND CARDS (IMAGE + OUTPUT PROMPT) */}
            <div className="h-full flex flex-col space-y-2 min-w-0 min-h-0" style={{ width: '0', flexGrow: 1 }}>
                {/* Right Pane Toolbar */}
                <div className="flex items-center justify-between h-10 px-2 bg-gray-900/80 rounded-lg border border-gray-800 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                            {language === 'ru' ? 'Результаты (Мультивью промпты)' : 'Generated Turnaround Prompts'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono font-bold">
                            {completedCount} / {items.length}
                        </span>
                    </div>

                    <div className="flex items-center space-x-1">
                        <ActionButton
                            title={language === 'ru' ? 'Скопировать все сгенерированные промпты' : 'Copy all generated turnaround prompts'}
                            onClick={handleCopyAllPrompts}
                            disabled={completedCount === 0}
                        >
                            <div className="flex items-center space-x-1 text-xs px-1 text-purple-300">
                                <CopyIcon className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold">{language === 'ru' ? 'Все промпты' : 'All Prompts'}</span>
                            </div>
                        </ActionButton>
                        <ActionButton
                            title={language === 'ru' ? 'Очистить результаты' : 'Clear results'}
                            onClick={handleClearResults}
                            disabled={completedCount === 0}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </ActionButton>
                    </div>
                </div>

                {/* Right Pane Cards List */}
                {items.length > 0 ? (
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                        {items.map((item) => {
                            const idxStr = String(item.index).padStart(2, '0');
                            const hasPrompt = !!item.prompt && item.prompt.trim() !== '';

                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col bg-gray-950/60 rounded-lg border border-purple-900/30 p-2.5 space-y-2 group shadow-sm transition-all hover:border-purple-600/50"
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between flex-shrink-0">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-700/60">
                                                Image {idxStr}
                                            </span>
                                            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-tighter">
                                                {language === 'ru' ? '4-View Turnaround Prompt' : '4-View Turnaround Prompt'}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-1">
                                            <ActionButton
                                                title={language === 'ru' ? 'Перегенерировать этот элемент' : 'Regenerate this item'}
                                                onClick={() => handleGenerateSingleItem(item)}
                                                disabled={isGeneratingBatch}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </ActionButton>
                                            <ActionButton
                                                title={t('node.action.copy')}
                                                onClick={() => {
                                                    if (item.prompt) {
                                                        navigator.clipboard.writeText(item.prompt);
                                                        if (addToast) addToast(t('toast.copiedToClipboard'));
                                                    }
                                                }}
                                                disabled={!hasPrompt}
                                            >
                                                <CopyIcon className="h-3.5 w-3.5 text-purple-300" />
                                            </ActionButton>
                                            <ActionButton
                                                title={t('catalog.saveTo')}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onSavePromptToLibrary && item.prompt) {
                                                        onSavePromptToLibrary(item.prompt);
                                                    }
                                                }}
                                                disabled={!hasPrompt}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" />
                                                </svg>
                                            </ActionButton>
                                        </div>
                                    </div>

                                    {/* Card Body: Split Thumbnail & Textarea */}
                                    <div className="flex space-x-2.5 items-stretch min-h-[110px]">
                                        {/* Left Thumbnail */}
                                        <div className="w-28 rounded-lg bg-black/50 border border-gray-800 p-1 flex items-center justify-center flex-shrink-0 relative overflow-hidden group/img">
                                            <img
                                                src={item.image}
                                                alt={`Thumbnail ${idxStr}`}
                                                className="max-h-full max-w-full object-contain drop-shadow"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(item.image);
                                                            const blob = await res.blob();
                                                            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                                                            if (addToast) addToast(t('toast.copiedToClipboard'));
                                                        } catch {
                                                            if (addToast) addToast('Failed to copy image', 'error');
                                                        }
                                                    }}
                                                    className="p-1 rounded-full bg-gray-800 text-white hover:bg-gray-700 shadow"
                                                    title="Copy image"
                                                >
                                                    <CopyIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right Textarea */}
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <DebouncedTextarea
                                                value={item.prompt}
                                                onDebouncedChange={(val) => handleUpdateItemPrompt(item.id, val)}
                                                placeholder={
                                                    language === 'ru'
                                                        ? `Здесь появится сгенерированный мультивью-промпт для изображения ${idxStr}...`
                                                        : `Generated 4-view turnaround prompt for image ${idxStr} will appear here...`
                                                }
                                                className="w-full h-full min-h-[96px] p-2 bg-input border-none rounded-md resize-y focus:ring-2 focus:ring-purple-500 focus:outline-none text-[11px] leading-relaxed text-white"
                                                onWheel={e => e.stopPropagation()}
                                                onMouseDown={e => { e.stopPropagation(); onSelectNode?.(); }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-800 rounded-lg bg-gray-950/30 p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-xs text-gray-400 font-semibold mb-1">
                            {language === 'ru' ? 'Нет сгенерированных карточек' : 'No generated cards yet'}
                        </span>
                        <span className="text-[10px] text-gray-500 max-w-[260px]">
                            {language === 'ru'
                                ? 'Добавьте изображения слева и нажмите "Сгенерировать мультивью", чтобы получить готовый пакет'
                                : 'Add images on the left and click "Generate Multiview" to produce turnaround prompts'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

function targetItemsCount(items: MultiviewBatchItem[]): number {
    return items.filter(it => it.isSelected !== false).length;
}
