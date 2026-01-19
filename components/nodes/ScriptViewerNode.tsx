
import React, { useMemo, useState } from 'react';
import type { NodeContentProps } from '../../types';
import { languages } from '../../localization';
import CustomSelect from '../CustomSelect';
import { ActionButton } from '../ActionButton';

// --- Interfaces based on provided JSON structures ---

interface ScriptGeneratorData {
    type: 'script-generator-data';
    model?: string;
    prompt?: string;
    targetLanguage?: string;
    summary?: string;
    detailedCharacters?: {
        id?: string;
        name: string;
        fullDescription: string;
        prompt?: string;
        alias?: string;
    }[];
    scenes?: {
        sceneNumber: number;
        title?: string;
        description: string;
        narratorText?: string;
    }[];
    visualStyle?: string;
    customVisualStyle?: string;
    generatedStyle?: string;
}

interface ScriptAnalyzerData {
    type: 'script-analyzer-data';
    model?: string;
    targetLanguage?: string;
    visualStyle?: string;
    characters?: {
        id?: string;
        name: string;
        fullDescription: string;
        imagePrompt?: string;
        alias?: string;
    }[];
    scenes?: {
        sceneNumber: number;
        title?: string;
        description?: string;
        sceneContext?: string; // Added sceneContext
        narratorText?: string;
        frames: {
            frameNumber: number;
            characters?: string[];
            duration?: number;
            description?: string;
            imagePrompt?: string;
            environmentPrompt?: string; // Added environmentPrompt
            videoPrompt?: string; // Added videoPrompt
            shotType?: string; // Added shotType
        }[];
    }[];
}

// Unified type for parsing
type ParsedScriptData = 
    | { type: 'empty'; targetLanguage: string }
    | { type: 'invalid'; targetLanguage: string }
    | { type: 'generator'; data: ScriptGeneratorData; targetLanguage: string }
    | { type: 'analyzer'; data: ScriptAnalyzerData; targetLanguage: string };


const renderFormattedDescription = (desc: string) => {
    return (desc || '').split('\n').filter(line => line.trim() !== '').map((line, i) => {
        if (line.startsWith('####')) {
            return <h5 key={i} className="block text-cyan-400 font-bold mt-2 mb-1 text-base">{line.replace(/####/g, '').trim()}</h5>;
        }
        return <span key={i} className="block select-text break-words whitespace-pre-wrap">{line}</span>;
    });
};

const CollapseToggle: React.FC<{ isCollapsed: boolean; onClick: (e: React.MouseEvent) => void; className?: string }> = ({ isCollapsed, onClick, className }) => (
    <button 
        onClick={onClick}
        className={`p-1 rounded hover:bg-gray-600 text-gray-400 hover:text-white transition-colors focus:outline-none ${className}`}
    >
        {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        )}
    </button>
);

export const ScriptViewerNode: React.FC<NodeContentProps> = ({ node, onValueChange, onLoadScriptFile, t, onSaveScriptToCatalog, onSaveScriptToDisk, onTranslateScript, isTranslatingScript }) => {

    // State for tracking collapsed items (Sections, Characters, Scenes, Frames)
    // We use a set of strings ID.
    const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

    const toggleCollapse = (id: string) => {
        setCollapsedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const parsedData: ParsedScriptData = useMemo(() => {
        try {
            if (!node.value || node.value === '{}') return { type: 'empty', targetLanguage: 'en' };
            const data = JSON.parse(node.value);
            const targetLanguage = data.targetLanguage || 'en';

            if (data.type === 'script-generator-data') {
                 return { type: 'generator', data: data as ScriptGeneratorData, targetLanguage };
            }
            if (data.type === 'script-analyzer-data') {
                 return { type: 'analyzer', data: data as ScriptAnalyzerData, targetLanguage };
            }

            // Legacy/Fallback detection
            if (data.summary && data.detailedCharacters && data.scenes) {
                return { type: 'generator', data: { ...data, type: 'script-generator-data' }, targetLanguage };
            }
            if (data.characters && data.scenes && Array.isArray(data.scenes) && data.scenes[0]?.frames) {
                 return { type: 'analyzer', data: { ...data, type: 'script-analyzer-data' }, targetLanguage };
            }

            return { type: 'invalid', targetLanguage };
        } catch {
            return { type: 'invalid', targetLanguage: 'en' };
        }
    }, [node.value]);

    const handleLanguageChange = (langCode: string) => {
        try {
            const data = JSON.parse(node.value || '{}');
            const newData = { ...data, targetLanguage: langCode };
            onValueChange(node.id, JSON.stringify(newData, null, 2));
        } catch {
            onValueChange(node.id, JSON.stringify({ targetLanguage: langCode }, null, 2));
        }
    };

    const renderHeader = (title: string, model?: string) => (
        <div className="mb-4 pb-2 border-b border-gray-600 flex justify-between items-end">
            <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                {model && <p className="text-xs text-gray-400 mt-0.5">Model: <span className="text-cyan-300">{model}</span></p>}
            </div>
            <div className="text-xs text-gray-500 font-mono">JSON</div>
        </div>
    );

    const renderCard = (title: string, content: string, id: string) => (
        <div key={id} className="relative bg-gray-700/50 p-3 rounded-lg group overflow-hidden mb-2">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-cyan-400 mb-1 truncate">{title}</h4>
                <div className="flex-shrink-0 ml-2">
                    <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(content); }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </ActionButton>
                </div>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap select-text break-words">{content}</div>
        </div>
    );

    const renderBulkDataHandles = () => {
        const isAnalyzer = parsedData.type === 'analyzer';
        
        const items = [
            { id: 'full-json', label: 'Full Data JSON', copyVal: node.value }
        ];
        
        // Only Analyzer has bulk prompt handles
        if (isAnalyzer) {
             items.push({ id: 'all-image-prompts', label: 'All Image Prompts', copyVal: '' });
             items.push({ id: 'all-video-prompts', label: 'All Video Prompts', copyVal: '' });
        }

        // Helper to extract prompts for copy button
        const getPrompts = (type: 'img' | 'vid') => {
            const data = parsedData.type === 'analyzer' ? parsedData.data : null;
            if (!data || !data.scenes) return '';
            const prompts: string[] = [];
            if (parsedData.type === 'analyzer') {
                 (data as ScriptAnalyzerData).scenes?.forEach(s => s.frames.forEach(f => {
                     const p = type === 'img' ? f.imagePrompt : f.videoPrompt;
                     if (p) prompts.push(p);
                 }));
            }
            return prompts.join('\n');
        };

        return (
            <div className="mb-4 space-y-2">
                {items.map(item => (
                    <div key={item.id} className="relative flex justify-between items-center p-2 rounded bg-gray-800 border border-gray-700 shadow-sm">
                        <span className="text-xs font-bold text-gray-400 pl-1 uppercase tracking-wider">{item.label}</span>
                        <div className="flex items-center">
                            <ActionButton title={t('node.action.copy')} onClick={(e) => { 
                                e.stopPropagation(); 
                                const val = item.id === 'full-json' ? item.copyVal : (item.id === 'all-image-prompts' ? getPrompts('img') : getPrompts('vid'));
                                navigator.clipboard.writeText(val || ''); 
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </ActionButton>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderCharacterCard = (char: any, index: number, showImagePrompt: boolean) => {
        const cardId = `char-${index}`;
        const isCollapsed = collapsedItems.has(cardId);

        return (
            <div key={char.id || index} className="bg-gray-700/50 rounded-lg group overflow-hidden mb-2 border border-gray-600/30">
                <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-700/80 transition-colors"
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(cardId); }}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CollapseToggle isCollapsed={isCollapsed} onClick={(e) => { e.stopPropagation(); toggleCollapse(cardId); }} />
                        <h4 className="font-bold text-cyan-400 truncate">
                            {char.name} 
                            {char.alias && <span className="text-xs font-mono text-gray-400 ml-2">({char.alias})</span>}
                            {char.index && <span className="text-xs font-mono text-gray-500 ml-2">[{char.index}]</span>}
                        </h4>
                    </div>
                    <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                        <div className="opacity-100">
                            <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(char.fullDescription); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </ActionButton>
                        </div>
                    </div>
                </div>
                {!isCollapsed && (
                    <div className="px-3 pb-3 pt-0 text-sm text-gray-300 whitespace-pre-wrap select-text break-words border-t border-gray-600/30 mt-1">
                        {renderFormattedDescription(char.fullDescription)}
                        {showImagePrompt && char.imagePrompt && (
                            <div className="mt-2 p-2 bg-gray-800/50 rounded border-l-2 border-cyan-500">
                                <span className="text-xs font-bold text-gray-400 block uppercase mb-1">Image Prompt</span>
                                <span className="text-xs text-gray-300">{char.imagePrompt}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderFrameCard = (frame: any, sceneNumber: number) => {
        const frameTitle = `Frame ${frame.frameNumber} ${frame.duration ? `(${frame.duration}s)` : ''} ${frame.shotType ? `[${frame.shotType}]` : ''}`;
        const characterList = frame.characters?.join(', ') || '';
        const frameId = `frame-${sceneNumber}-${frame.frameNumber}`;
        const isCollapsed = collapsedItems.has(frameId);
        
        const subPrompts = [
            { label: 'Description', value: frame.description },
            { label: 'Environment', value: frame.environmentPrompt },
            { label: 'Image Prompt', value: frame.imagePrompt },
            { label: 'Video Prompt', value: frame.videoPrompt },
        ].filter(p => p.value); 
    
        return (
            <div key={`frame-${frame.frameNumber}`} className="bg-gray-700/50 rounded-lg overflow-hidden mb-2 border border-gray-600/20">
                <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-700/80 transition-colors"
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(frameId); }}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CollapseToggle isCollapsed={isCollapsed} onClick={(e) => { e.stopPropagation(); toggleCollapse(frameId); }} />
                        <h4 className="font-bold text-cyan-300 text-sm truncate">{frameTitle}</h4>
                        {characterList && <span className="text-xs text-gray-400 truncate max-w-[120px]" title={characterList}>Chars: {characterList}</span>}
                    </div>
                </div>
                
                {!isCollapsed && (
                    <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gray-600/20 mt-1">
                        {subPrompts.map(p => (
                            <div key={p.label} className="relative bg-gray-800/50 p-2 rounded group overflow-hidden">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400 truncate">{p.label}</label>
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        <div>
                                            <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.value); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            </ActionButton>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-200 whitespace-pre-wrap select-text break-words leading-relaxed">{p.value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };
    
    const renderContent = () => {
        switch (parsedData.type) {
            case 'empty':
                return (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 16.5h3M15 19.5h-6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0115.75 19.5h-1.5" /></svg>
                        <p className="font-semibold">No Script Loaded</p>
                        <p className="text-sm mt-1">Drop a JSON file here or use the "Load" button.</p>
                    </div>
                );

            case 'invalid':
                return (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <span className="text-red-400 font-bold mb-2">Format Error</span>
                        <span className="text-sm text-gray-400">{t('node.content.unrecognizedFormat')}</span>
                    </div>
                );

            case 'generator': {
                const data = parsedData.data;
                const styleToShow = data.customVisualStyle || data.visualStyle || data.generatedStyle || '';
                const isCharsCollapsed = collapsedItems.has('section-characters');
                const isScenesCollapsed = collapsedItems.has('section-scenes');

                return (
                    <div className="space-y-6 pb-4">
                        {renderHeader("Generated Script", data.model)}
                        {renderBulkDataHandles()}
                        
                        {styleToShow && (
                            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-600/50">
                                <h3 className="font-bold text-cyan-400 mb-1 text-sm uppercase tracking-wider">{t('node.content.style')}</h3>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{styleToShow}</p>
                            </div>
                        )}

                        {data.summary && (
                            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-600/50">
                                <h3 className="font-bold text-cyan-400 mb-1 text-sm uppercase tracking-wider">{t('node.content.summary')}</h3>
                                {renderCard('Summary', data.summary, 'summary')}
                            </div>
                        )}

                        {data.detailedCharacters && data.detailedCharacters.length > 0 && (
                            <div>
                                <div 
                                    className="flex items-center mb-3 border-b border-gray-700 pb-1 cursor-pointer hover:bg-gray-800/50 rounded px-1 -mx-1"
                                    onClick={() => toggleCollapse('section-characters')}
                                >
                                    <CollapseToggle isCollapsed={isCharsCollapsed} onClick={(e) => {e.stopPropagation(); toggleCollapse('section-characters');}} />
                                    <h3 className="font-bold text-cyan-400 text-sm uppercase tracking-wider ml-2 select-none">{t('node.content.characters')}</h3>
                                </div>
                                {!isCharsCollapsed && (
                                    <div className="space-y-2">
                                    {data.detailedCharacters.map((char, i) => renderCharacterCard(char, i, false))}
                                    </div>
                                )}
                            </div>
                        )}

                        {data.scenes && data.scenes.length > 0 && (
                             <div>
                                <div 
                                    className="flex items-center mb-3 border-b border-gray-700 pb-1 cursor-pointer hover:bg-gray-800/50 rounded px-1 -mx-1"
                                    onClick={() => toggleCollapse('section-scenes')}
                                >
                                    <CollapseToggle isCollapsed={isScenesCollapsed} onClick={(e) => {e.stopPropagation(); toggleCollapse('section-scenes');}} />
                                    <h3 className="font-bold text-cyan-400 text-sm uppercase tracking-wider ml-2 select-none">{t('node.content.scenes')}</h3>
                                </div>
                                {!isScenesCollapsed && (
                                    <div className="space-y-6">
                                        {data.scenes.map((scene, i) => {
                                            const sceneId = `scene-${scene.sceneNumber}`;
                                            const isSceneCollapsed = collapsedItems.has(sceneId);
                                            return (
                                                <div key={`scene-container-${i}`} className="relative pl-4 border-l-2 border-gray-700">
                                                    <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 bg-gray-600 rounded-full"></div>
                                                    <div 
                                                        className="flex items-center mb-2 cursor-pointer hover:bg-gray-800/30 rounded"
                                                        onClick={() => toggleCollapse(sceneId)}
                                                    >
                                                         <CollapseToggle isCollapsed={isSceneCollapsed} onClick={(e) => {e.stopPropagation(); toggleCollapse(sceneId);}} />
                                                         <h4 className="font-bold text-white text-lg ml-2 select-none">Scene {scene.sceneNumber}: <span className="text-gray-300 font-normal">{scene.title}</span></h4>
                                                    </div>
                                                    
                                                    {!isSceneCollapsed && (
                                                        <>
                                                            {renderCard(`Description`, scene.description, `scene-${i}`)}
                                                            {scene.narratorText && renderCard(`Narrator`, scene.narratorText, `scene-${i}-narrator`)}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            }

            case 'analyzer': {
                const data = parsedData.data;
                const isCharsCollapsed = collapsedItems.has('section-characters');
                const isScenesCollapsed = collapsedItems.has('section-scenes');

                return (
                    <div className="space-y-6 pb-4">
                        {renderHeader("Analyzed Script", data.model)}
                        {renderBulkDataHandles()}
                        
                         {data.visualStyle && (
                            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-600/50">
                                <h3 className="font-bold text-cyan-400 mb-1 text-sm uppercase tracking-wider">{t('node.content.style')}</h3>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{data.visualStyle}</p>
                            </div>
                        )}

                        {data.characters && data.characters.length > 0 && (
                            <div>
                                <div 
                                    className="flex items-center mb-3 border-b border-gray-700 pb-1 cursor-pointer hover:bg-gray-800/50 rounded px-1 -mx-1"
                                    onClick={() => toggleCollapse('section-characters')}
                                >
                                    <CollapseToggle isCollapsed={isCharsCollapsed} onClick={(e) => {e.stopPropagation(); toggleCollapse('section-characters');}} />
                                    <h3 className="font-bold text-cyan-400 text-sm uppercase tracking-wider ml-2 select-none">{t('node.content.characters')}</h3>
                                </div>
                                {!isCharsCollapsed && (
                                    <div className="space-y-2">
                                        {data.characters.map((char, i) => renderCharacterCard(char, i, true))}
                                    </div>
                                )}
                            </div>
                        )}

                        {data.scenes && data.scenes.length > 0 && (
                            <div>
                                <div 
                                    className="flex items-center mb-3 border-b border-gray-700 pb-1 cursor-pointer hover:bg-gray-800/50 rounded px-1 -mx-1"
                                    onClick={() => toggleCollapse('section-scenes')}
                                >
                                    <CollapseToggle isCollapsed={isScenesCollapsed} onClick={(e) => {e.stopPropagation(); toggleCollapse('section-scenes');}} />
                                    <h3 className="font-bold text-cyan-400 text-sm uppercase tracking-wider ml-2 select-none">Scenes & Frames</h3>
                                </div>
                                
                                {!isScenesCollapsed && (
                                    <div className="space-y-8">
                                        {data.scenes.map((scene, i) => {
                                            const sceneId = `scene-${scene.sceneNumber}`;
                                            const isSceneCollapsed = collapsedItems.has(sceneId);
                                            return (
                                                <div key={`scene-${scene.sceneNumber}`} className="bg-gray-800/20 rounded-xl p-2 border border-gray-700">
                                                    <div 
                                                        className="bg-gray-900/50 p-2 rounded-lg mb-3 border-l-4 border-cyan-500 flex items-center cursor-pointer hover:bg-gray-900 transition-colors"
                                                        onClick={() => toggleCollapse(sceneId)}
                                                    >
                                                        <CollapseToggle isCollapsed={isSceneCollapsed} onClick={(e) => {e.stopPropagation(); toggleCollapse(sceneId);}} />
                                                        <div className="ml-2 w-full">
                                                            <div className="flex justify-between items-center">
                                                                <h4 className="font-bold text-lg text-white">{scene.title ? scene.title : `Scene ${scene.sceneNumber}`}</h4>
                                                            </div>
                                                            {/* Display Scene Context if available */}
                                                            {scene.sceneContext && (
                                                                <div className="mt-2 text-xs text-gray-400 italic bg-black/20 p-1.5 rounded border border-gray-700/50">
                                                                    <span className="font-bold text-gray-500 uppercase mr-1">Context:</span>
                                                                    {scene.sceneContext}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {!isSceneCollapsed && (
                                                        <div className="pl-2 space-y-2">
                                                            {scene.frames?.map((frame) => renderFrameCard(frame, scene.sceneNumber))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div className="relative flex flex-col h-full overflow-x-hidden">
            <div className="flex-shrink-0 flex items-center space-x-2 mb-2">
                <div className="w-32">
                    <CustomSelect
                        id={`lang-select-${node.id}`}
                        value={parsedData.targetLanguage || 'en'}
                        onChange={handleLanguageChange}
                        disabled={isTranslatingScript === node.id}
                        options={Object.entries(languages).map(([code, { name }]) => ({ value: code, label: name }))}
                    />
                </div>
                <button
                    onClick={() => onTranslateScript(node.id)}
                    disabled={isTranslatingScript === node.id || parsedData.type === 'empty' || parsedData.type === 'invalid'}
                    className="px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                >
                    {isTranslatingScript === node.id ? t('node.content.translating') : t('node.content.translate')}
                </button>
            </div>
            
            <div className="flex-grow min-h-0 overflow-y-auto pr-2 overflow-x-hidden custom-scrollbar" onWheel={e => e.stopPropagation()}>
                {renderContent()}
            </div>

            <div className="flex-shrink-0 flex items-center justify-end space-x-2 mt-2 pt-2 border-t border-gray-700">
                <button
                    onClick={() => onLoadScriptFile(node.id)}
                    className="flex-1 px-4 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 transition-colors duration-200"
                >
                    {t('node.content.loadScript')}
                </button>
                <button
                    onClick={() => onSaveScriptToCatalog(node.id)}
                    disabled={parsedData.type === 'empty' || parsedData.type === 'invalid'}
                    className="flex-1 px-4 py-2 font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
                    title={t('catalog.saveTo')}
                >
                    {t('catalog.saveTo')}
                </button>
                <ActionButton title={t('group.saveToDisk')} onClick={() => onSaveScriptToDisk(node.id)} disabled={parsedData.type === 'empty' || parsedData.type === 'invalid'}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </ActionButton>
            </div>
        </div>
    );
};
