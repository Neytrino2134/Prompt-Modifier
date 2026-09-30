import React, { useState, useMemo, useEffect } from 'react';
import { BatchResultData, BatchResultFolder, BatchResultFileItem } from './types';
import { ActionButton } from '../../ActionButton';

interface ArchiveFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchResult: BatchResultData | null;
    onDownloadZip: () => void;
    addToast?: (msg: string, type?: any) => void;
}

export const ArchiveFolderModal: React.FC<ArchiveFolderModalProps> = ({
    isOpen,
    onClose,
    batchResult,
    onDownloadZip,
    addToast
}) => {
    const [selectedFolderIndex, setSelectedFolderIndex] = useState<number | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilterType, setSelectedFilterType] = useState<'all' | 'original' | 'slice' | 'crop'>('all');
    const [previewImage, setPreviewImage] = useState<BatchResultFileItem | null>(null);

    const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.showItemInFolder);

    useEffect(() => {
        if (!isOpen) {
            setPreviewImage(null);
            setSearchQuery('');
            setSelectedFolderIndex('all');
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (previewImage) {
                    setPreviewImage(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, previewImage, onClose]);

    const folders = batchResult?.folders || [];

    // Filtered files
    const displayedFiles = useMemo(() => {
        let files: Array<BatchResultFileItem & { folderName: string; folderIndex: number }> = [];

        folders.forEach((folder, idx) => {
            if (selectedFolderIndex === 'all' || selectedFolderIndex === idx) {
                folder.files.forEach((f) => {
                    files.push({
                        ...f,
                        folderName: folder.name,
                        folderIndex: idx
                    });
                });
            }
        });

        if (selectedFilterType !== 'all') {
            files = files.filter(f => f.type === selectedFilterType);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            files = files.filter(f => 
                f.name.toLowerCase().includes(q) || 
                f.folderName.toLowerCase().includes(q)
            );
        }

        return files;
    }, [folders, selectedFolderIndex, selectedFilterType, searchQuery]);

    const handleOpenInExplorer = async () => {
        try {
            if (isElectron && (window as any).electronAPI?.showItemInFolder) {
                const downloadPath = (window as any).electronAPI?.getDownloadPath ? await (window as any).electronAPI.getDownloadPath() : '';
                await (window as any).electronAPI.showItemInFolder(downloadPath || '');
                if (addToast) addToast('Папка с загрузками открыта в проводнике', 'info');
            } else {
                if (addToast) addToast('В веб-версии файлы сохраняются в стандартную папку загрузок браузера', 'info');
            }
        } catch (e) {
            console.error('Failed to open folder in explorer:', e);
        }
    };

    const handleDownloadSingleFile = (file: BatchResultFileItem) => {
        const a = document.createElement('a');
        a.href = file.dataUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (addToast) addToast(`Скачан файл: ${file.name}`, 'success');
    };

    const handleCopyFileToClipboard = async (file: BatchResultFileItem) => {
        try {
            const res = await fetch(file.dataUrl);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type || 'image/png']: blob })
            ]);
            if (addToast) addToast(`Изображение скопировано в буфер: ${file.name}`, 'success');
        } catch (err) {
            console.error('Failed to copy image to clipboard:', err);
            if (addToast) addToast('Не удалось скопировать в буфер обмена', 'error');
        }
    };

    if (!isOpen || !batchResult) return null;

    const totalFilesCount = folders.reduce((sum, f) => sum + f.files.length, 0);

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-gray-900 border border-cyan-700/50 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] max-h-[850px] flex flex-col overflow-hidden text-gray-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-gray-950 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-600/50 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                                    Папка и содержимое архива
                                </h2>
                                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono text-[11px] font-semibold">
                                    {folders.length} {folders.length === 1 ? 'папка' : folders.length < 5 ? 'папки' : 'папок'} • {totalFilesCount} файлов
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                                {batchResult.filename}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Open in OS Explorer Button */}
                        <button
                            type="button"
                            onClick={handleOpenInExplorer}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-700/60 hover:border-cyan-500 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                            title={isElectron ? "Открыть папку с файлами в проводнике Windows / Finder" : "Показать информацию о папке загрузок"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                            <span className="hidden sm:inline">Открыть в проводнике</span>
                            <span className="sm:hidden">Проводник</span>
                        </button>

                        {/* Download ZIP Button */}
                        <button
                            type="button"
                            onClick={onDownloadZip}
                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ring-1 ring-green-400/40"
                            title="Скачать весь ZIP архив целиком"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Скачать ZIP</span>
                        </button>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors border border-gray-700"
                            title="Закрыть окно (Esc)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="px-5 py-2.5 bg-gray-950/60 border-b border-gray-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск по имени файла или папки..."
                            className="w-full pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-2 text-gray-400 hover:text-white text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Filter Type Pills */}
                    <div className="flex items-center gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800 text-xs">
                        <button
                            type="button"
                            onClick={() => setSelectedFilterType('all')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                selectedFilterType === 'all'
                                    ? 'bg-cyan-600 text-white font-semibold'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Все ({totalFilesCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedFilterType('slice')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                selectedFilterType === 'slice'
                                    ? 'bg-cyan-600 text-white font-semibold'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Срезы / Сетки
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedFilterType('crop')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                selectedFilterType === 'crop'
                                    ? 'bg-cyan-600 text-white font-semibold'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Кропы
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedFilterType('original')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${
                                selectedFilterType === 'original'
                                    ? 'bg-cyan-600 text-white font-semibold'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Оригиналы
                        </button>
                    </div>
                </div>

                {/* Main Content Body (Sidebar Folders + Files Grid) */}
                <div className="flex-1 min-h-0 flex overflow-hidden">
                    {/* Left Sidebar: Folder List */}
                    <div className="w-64 sm:w-72 bg-gray-950/80 border-r border-gray-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                        <div className="p-3 border-b border-gray-800/80 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Структура папок</span>
                            <span className="font-mono text-cyan-400">{folders.length}</span>
                        </div>

                        <div className="p-2 space-y-1">
                            {/* All Folders Option */}
                            <button
                                type="button"
                                onClick={() => setSelectedFolderIndex('all')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                                    selectedFolderIndex === 'all'
                                        ? 'bg-cyan-900/60 border border-cyan-500 text-white font-semibold shadow-sm'
                                        : 'hover:bg-gray-850 text-gray-300 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-cyan-400">📁</span>
                                    <span className="truncate">Все папки архива</span>
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-cyan-300">
                                    {totalFilesCount}
                                </span>
                            </button>

                            {/* Individual Folders */}
                            {folders.map((folder, fIdx) => {
                                const isSelected = selectedFolderIndex === fIdx;
                                return (
                                    <button
                                        key={folder.name || fIdx}
                                        type="button"
                                        onClick={() => setSelectedFolderIndex(fIdx)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between group ${
                                            isSelected
                                                ? 'bg-cyan-900/60 border border-cyan-500 text-white font-semibold shadow-sm'
                                                : 'hover:bg-gray-850 text-gray-300 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-accent-secondary group-hover:scale-110 transition-transform shrink-0">📂</span>
                                            <div className="min-w-0">
                                                <div className="truncate font-mono text-[11px]">
                                                    {folder.name}
                                                </div>
                                                <div className="text-[9px] text-gray-500 truncate">
                                                    Исходник: {folder.sourceImageName}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-gray-400 shrink-0 ml-1">
                                            {folder.files.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Area: Files Grid */}
                    <div className="flex-1 min-w-0 bg-gray-900 overflow-y-auto p-4 custom-scrollbar">
                        {displayedFiles.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm font-medium text-gray-400">Файлы не найдены</p>
                                <p className="text-xs text-gray-600 mt-1">Попробуйте изменить поисковый запрос или фильтр</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {displayedFiles.map((file, idx) => {
                                    return (
                                        <div
                                            key={`${file.folderName}_${file.name}_${idx}`}
                                            className="group bg-gray-950 border border-gray-800 hover:border-cyan-500/70 rounded-lg overflow-hidden flex flex-col transition-all hover:shadow-lg relative"
                                        >
                                            {/* Thumbnail Container */}
                                            <div 
                                                onClick={() => setPreviewImage(file)}
                                                className="relative aspect-square w-full bg-gray-900 overflow-hidden cursor-pointer flex items-center justify-center p-1"
                                            >
                                                <img
                                                    src={file.dataUrl}
                                                    alt={file.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200 pointer-events-none"
                                                />

                                                {/* File Type Badge */}
                                                <div className="absolute top-1 left-1">
                                                    {file.type === 'original' && (
                                                        <span className="px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 text-[8px] font-mono border border-blue-500/60 font-semibold shadow">
                                                            Оригинал
                                                        </span>
                                                    )}
                                                    {file.type === 'crop' && (
                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 text-[8px] font-mono border border-emerald-500/60 font-semibold shadow">
                                                            Кроп
                                                        </span>
                                                    )}
                                                    {file.type === 'slice' && (
                                                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 text-[8px] font-mono border border-cyan-500/60 font-semibold shadow">
                                                            Срез r{file.row}_c{file.col}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Quick Overlay Action Buttons */}
                                                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-sm p-1 rounded-md border border-gray-700">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyFileToClipboard(file);
                                                        }}
                                                        className="p-1 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors"
                                                        title="Скопировать изображение в буфер"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadSingleFile(file);
                                                        }}
                                                        className="p-1 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors"
                                                        title="Скачать этот файл отдельно"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* File Info Bar */}
                                            <div className="p-2 border-t border-gray-800 flex flex-col gap-0.5 bg-gray-950">
                                                <div className="text-[11px] font-mono text-gray-200 font-medium truncate" title={file.name}>
                                                    {file.name}
                                                </div>
                                                <div className="text-[9px] text-gray-500 truncate font-mono">
                                                    📁 {file.folderName}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Status */}
                <div className="px-5 py-2.5 bg-gray-950 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 shrink-0">
                    <div className="flex items-center gap-2">
                        <span>Отображается: <b className="text-cyan-300 font-mono">{displayedFiles.length}</b> из {totalFilesCount} файлов</span>
                        {selectedFolderIndex !== 'all' && (
                            <span className="text-gray-500">• Папка: <b className="text-gray-300">{folders[selectedFolderIndex]?.name}</b></span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
                            Все изображения рассортированы по индивидуальным подпапкам внутри ZIP архива
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>

            {/* Full Image Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] bg-gray-950 border border-cyan-700/60 rounded-xl overflow-hidden flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-800">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-cyan-400 font-bold font-mono text-xs truncate">
                                    {previewImage.name}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                    (в папке {previewImage.folderName || ''})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleCopyFileToClipboard(previewImage)}
                                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded text-xs flex items-center gap-1 transition-colors"
                                >
                                    Скопировать
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDownloadSingleFile(previewImage)}
                                    className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                    Скачать
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewImage(null)}
                                    className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-xs"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-3 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)]">
                            <img
                                src={previewImage.dataUrl}
                                alt={previewImage.name}
                                className="max-w-full max-h-[75vh] object-contain rounded-md"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
