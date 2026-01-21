
import React, { useState } from 'react';
import { CharacterData } from './types';
import { ActionButton } from '../../ActionButton';
import { Tooltip } from '../../Tooltip';
import { StarIcon, StarFilledIcon, PromptIcon, CopyIcon, DetachIcon, EyeIcon, EyeOffIcon } from '../../../components/icons/AppIcons';
import { InputWithSpinners } from './SharedUI';
import { CharacterDescriptionArea } from './CharacterDescriptionArea';
import { CharacterImageArea } from './CharacterImageArea';
import { RATIO_INDICES } from '../../../utils/nodeUtils';

interface CharacterCardItemProps {
    char: CharacterData;
    index: number;
    nodeId: string;
    isDragging: boolean;
    // Handlers passed from parent
    onUpdate: (updates: Partial<CharacterData>) => void;
    onRemove: () => void;
    onSetAsOutput: () => void;
    onToggleActive: () => void; // New prop
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    // New Smart Drag Handler
    onSmartDragOver: (e: React.DragEvent) => void;
    
    // Image Area Handlers
    onRatioChange: (ratio: string) => void;
    onPasteImage: () => void;
    onClearImage: () => void;
    onCopyImage: () => void;
    onGenerateImage: () => void;
    onEditRaster: () => void;
    onEditAI: () => void;
    onCrop1x1: () => void;
    onExpandRatio: (ratio: string) => void;
    onSetEditingIndex: () => void;
    
    // Description Handlers
    onSyncFromConnection: () => void;
    
    // Footer Handlers
    onLoad: () => void;
    onSave: () => void;
    onSaveToCatalog: () => void;
    onCopySpecific: () => void;
    onPasteSpecific: () => void;
    onDetach: () => void;
    onModify: () => void;
    
    // External State needed
    getFullSizeImage: (idx: number) => string | undefined;
    setImageViewer: (state: any) => void;
    onCopyImageToClipboard: (src: string) => void;
    processNewImage: (data: string) => void;
    
    t: (key: string) => string;
    deselectAllNodes: () => void;
    languages: any;
    secondaryLanguage: string;
    isModifyingCharacter: string | null;
    isUpdatingDescription: string | null;
    onUpdateDescription: () => void;
    
    // Personality Update
    isUpdatingPersonality: string | null;
    onUpdatePersonality: () => void;

    // Appearance Update
    isUpdatingAppearance: string | null;
    onUpdateAppearance: () => void;
    
    // Clothing Update
    isUpdatingClothing: string | null;
    onUpdateClothing: () => void;
    
    transformingRatio: string | null;
    isGeneratingImage: boolean;
    isUpdatingCharacterPrompt: string | null;
    
    // Modification request state passed down
    modificationRequest: string;
    setModificationRequest: (val: string) => void;
    hasDuplicateIndex?: boolean; // New prop for duplicate validation
}

// Optimized width to fit node (380px card as requested)
const SINGLE_CARD_WIDTH = 380;

const SUFFIX_CHAR = "Full body character concept on a gray background";
const SUFFIX_OBJ = "Full-length conceptual object on a grey background";

const CollapseIndicator: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => (
    <div className={`p-0.5 text-gray-400 transition-transform duration-200 flex items-center justify-center ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}>
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-3 w-3" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={3}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
    </div>
);

const CharacterCardItem: React.FC<CharacterCardItemProps> = ({
    char, index, nodeId, isDragging,
    onUpdate, onRemove, onSetAsOutput, onToggleActive, onDragStart, onDragEnd, onSmartDragOver,
    onRatioChange, onPasteImage, onClearImage, onCopyImage, onGenerateImage, onEditRaster, onEditAI, onCrop1x1, onExpandRatio, onSetEditingIndex,
    onSyncFromConnection, onLoad, onSave, onSaveToCatalog, onCopySpecific, onPasteSpecific, onDetach, onModify,
    getFullSizeImage, setImageViewer, onCopyImageToClipboard, processNewImage,
    t, deselectAllNodes, languages, secondaryLanguage, isModifyingCharacter, isUpdatingDescription, onUpdateDescription,
    isUpdatingPersonality, onUpdatePersonality,
    isUpdatingAppearance, onUpdateAppearance,
    isUpdatingClothing, onUpdateClothing,
    transformingRatio, isGeneratingImage, isUpdatingCharacterPrompt, modificationRequest, setModificationRequest,
    hasDuplicateIndex
}) => {
    
    const [isDragOver, setIsDragOver] = useState(false);
    const cardOpKey = `${nodeId}-${index}`;

    // Determine visual style for inactive state
    const inactiveClass = !char.isActive ? "opacity-50 grayscale pointer-events-none" : "";

    // Destructure collapse states with defaults
    const isImageCollapsed = char.isImageCollapsed ?? false;
    const isPromptCollapsed = char.isPromptCollapsed ?? false;

    return (
        <div 
            className="flex flex-col h-full border border-gray-800 rounded-xl bg-gray-900/80 p-2.5 overflow-hidden shadow-xl hover:border-gray-700 transition-all flex-shrink-0"
            style={{ width: `${SINGLE_CARD_WIDTH}px`, contain: 'content', opacity: isDragging ? 0.4 : 1, transform: isDragging ? 'scale(0.95)' : 'none' }}
            onDragOver={onSmartDragOver} 
        >
            {/* Header - DRAGGABLE - Always Active */}
            <div 
                className="h-8 bg-gray-700 rounded-t-lg border-b border-gray-600 flex items-center px-3 cursor-grab active:cursor-grabbing hover:bg-gray-800 transition-colors mb-2 group/handle relative flex-shrink-0 gap-2"
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                 <div className="flex items-center gap-1 overflow-hidden flex-grow">
                    <span className="text-xs font-bold truncate">
                        <span className={hasDuplicateIndex ? "text-red-500 font-black" : "text-accent-text"}>{char.index || 'CH'}:</span> <span className="text-gray-200 ml-1">{char.name || 'Unnamed'}</span>
                        <span className="text-[9px] text-gray-500 font-mono ml-2 opacity-50">#{char.id}</span>
                    </span>
                 </div>

                 <div className="flex items-center gap-1 shrink-0">
                    <Tooltip content={char.isActive ? "Mute Card (Exclude from Output)" : "Unmute Card"}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleActive(); }}
                            className={`p-0.5 rounded hover:bg-gray-600 transition-colors ${!char.isActive ? 'text-gray-500' : 'text-gray-400 hover:text-white'}`}
                            onMouseDown={e => e.stopPropagation()} 
                        >
                            {char.isActive ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                        </button>
                    </Tooltip>

                    <Tooltip content={t('node.action.markPrimary')}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSetAsOutput(); }}
                            className={`p-0.5 rounded hover:bg-gray-700 transition-colors ${char.isOutput ? 'text-accent-text' : 'text-gray-500 hover:text-gray-300'}`}
                            onMouseDown={e => e.stopPropagation()} 
                        >
                            {char.isOutput ? <StarFilledIcon className="h-4 w-4" /> : <StarIcon className="h-4 w-4" />}
                        </button>
                    </Tooltip>
                    <Tooltip content={t('node.action.removeCard')}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="p-0.5 rounded hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors"
                            onMouseDown={e => e.stopPropagation()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5} strokeLinecap="round" />
                            </svg>
                        </button>
                    </Tooltip>
                 </div>
            </div>
            
            {/* Wrap Content to disable interaction when inactive */}
            <div className={`flex flex-col flex-grow min-h-0 ${inactiveClass}`}>
                <div className="flex gap-2 flex-shrink-0 items-center mb-2 h-[32px]">
                    <input 
                        type="text" 
                        value={char.name} 
                        onChange={(e) => onUpdate({ name: e.target.value })} 
                        placeholder={t('node.content.character')} 
                        className="flex-grow min-w-0 px-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:ring-1 focus:ring-accent outline-none h-[32px] transition-colors hover:border-gray-500" 
                        onMouseDown={e => e.stopPropagation()} 
                        onFocus={deselectAllNodes} 
                    />
                    <InputWithSpinners 
                        value={char.index} 
                        onChange={(val) => onUpdate({ index: val })} 
                        placeholder="Index" 
                        onFocus={deselectAllNodes}
                        readOnly={true} 
                        className={`w-28 shrink-0 ${hasDuplicateIndex ? 'border-red-500 hover:border-red-500' : ''}`}
                    />
                </div>

                {/* Image Area with Tabs and Collapse */}
                <div className="flex flex-col flex-shrink-0 mb-1">
                    <div 
                        className="flex items-end justify-between h-7 relative z-30 mb-0 cursor-pointer hover:bg-gray-800/60 transition-colors rounded-t-md"
                        onClick={(e) => { e.stopPropagation(); onUpdate({ isImageCollapsed: !isImageCollapsed }); }}
                    >
                         <div className="flex items-end pl-2 gap-1 h-full" onClick={(e) => e.stopPropagation()}>
                            {['1:1', '16:9', '9:16'].map(r => (
                                <button 
                                    key={r} 
                                    onClick={(e) => { e.stopPropagation(); onRatioChange(r); }} 
                                    onDragEnter={(e) => { e.stopPropagation(); onRatioChange(r); }}
                                    className={`px-3 py-1 text-[10px] font-bold outline-none transition-colors rounded-t-md ${
                                        char.selectedRatio === r 
                                            ? 'bg-gray-700/50 text-white h-full shadow-none' 
                                            : 'bg-gray-900/40 text-gray-500 h-[80%] hover:bg-gray-700/50 hover:text-gray-300'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                         </div>
                         
                         <div className="pb-1 pr-1">
                             <CollapseIndicator isCollapsed={isImageCollapsed} />
                         </div>
                    </div>
                    
                    {!isImageCollapsed && (
                        <CharacterImageArea 
                            char={char}
                            cardIdx={index}
                            nodeId={nodeId}
                            isDragOver={isDragOver}
                            setIsDragOver={setIsDragOver}
                            onRatioChange={onRatioChange}
                            onPasteImage={onPasteImage}
                            onClearImage={onClearImage}
                            onCopyImage={onCopyImage}
                            onGenerateImage={onGenerateImage}
                            onEditRaster={onEditRaster}
                            onEditAI={onEditAI}
                            onCrop1x1={onCrop1x1}
                            onExpandRatio={onExpandRatio}
                            onSetEditingIndex={onSetEditingIndex}
                            getFullSizeImage={getFullSizeImage}
                            setImageViewer={setImageViewer}
                            onCopyImageToClipboard={onCopyImageToClipboard}
                            processNewImage={processNewImage}
                            transformingRatio={transformingRatio}
                            isGeneratingImage={isGeneratingImage}
                            t={t}
                        />
                    )}
                </div>

                {/* Collapsible Prompt Section */}
                <div className="flex flex-col shrink-0 mb-2 border border-gray-700/50 rounded-xl bg-gray-900/20 shadow-inner overflow-hidden">
                    <div 
                        className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition-colors select-none"
                        onClick={(e) => { e.stopPropagation(); onUpdate({ isPromptCollapsed: !isPromptCollapsed }); }}
                    >
                        <div className="flex items-center gap-2">
                            <div className={`transform transition-transform duration-200 ${isPromptCollapsed ? '-rotate-90' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                             <span className="text-gray-400"><PromptIcon className="h-3 w-3" /></span>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('node.content.prompt')}</span>
                        </div>
                        
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                             {/* Actions (Update from Image, Copy) */}
                            <ActionButton 
                                title={t('node.content.updatePromptFromImage')} 
                                onClick={() => onSyncFromConnection()} 
                                tooltipPosition="left"
                                disabled={isUpdatingCharacterPrompt === cardOpKey}
                            >
                                {isUpdatingCharacterPrompt === cardOpKey ? (
                                    <svg className="animate-spin h-3 w-3 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                )}
                            </ActionButton>
                            <ActionButton title={t('node.action.copy')} onClick={() => navigator.clipboard.writeText(char.prompt)} tooltipPosition="left">
                                <CopyIcon className="h-3 w-3" />
                            </ActionButton>
                        </div>
                    </div>
                    
                    {!isPromptCollapsed && (
                        <div className="p-2 space-y-2">
                            <textarea 
                                value={char.prompt} 
                                onChange={e => onUpdate({ prompt: e.target.value })} 
                                className="w-full p-2 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-200 resize-y focus:border-accent outline-none min-h-[60px] max-h-[200px] custom-scrollbar" 
                                placeholder={t('node.content.promptPlaceholder')}
                                onMouseDown={e => e.stopPropagation()} 
                                onFocus={deselectAllNodes} 
                            />
                            
                            {/* Additional Prompt Input */}
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{t('node.content.additionalPromptSuffix')}</label>
                                    <div className="flex gap-0.5">
                                        <Tooltip content={t('node.action.characterConcept')}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onUpdate({ additionalPrompt: SUFFIX_CHAR }); }}
                                                className={`p-0.5 rounded hover:bg-gray-700 transition-colors ${char.additionalPrompt === SUFFIX_CHAR ? 'text-accent' : 'text-gray-500 hover:text-accent'}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={t('node.action.objectConcept')}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onUpdate({ additionalPrompt: SUFFIX_OBJ }); }}
                                                className={`p-0.5 rounded hover:bg-gray-700 transition-colors ${char.additionalPrompt === SUFFIX_OBJ ? 'text-accent' : 'text-gray-500 hover:text-accent'}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={char.additionalPrompt || ''}
                                    onChange={e => onUpdate({ additionalPrompt: e.target.value })}
                                    className="w-full p-1 bg-gray-900/60 border border-gray-700 rounded text-xs text-gray-400 focus:border-accent outline-none"
                                    onMouseDown={e => e.stopPropagation()}
                                    onFocus={deselectAllNodes}
                                />
                            </div>

                            {/* Modification Request Section */}
                            <div className="flex flex-col gap-1 border-t border-gray-700/50 pt-2 mt-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter px-1">{t('node.content.modificationRequest')}</label>
                                <div className="flex gap-2 h-[32px]">
                                    <input 
                                        value={modificationRequest} 
                                        onChange={e => setModificationRequest(e.target.value)} 
                                        placeholder="..." 
                                        className="flex-grow bg-gray-900/60 border border-gray-700 rounded px-2 text-xs text-white focus:border-accent outline-none h-full" 
                                        onMouseDown={e => e.stopPropagation()} 
                                        onFocus={deselectAllNodes} 
                                    />
                                    
                                     {/* Language Switcher */}
                                     {[
                                        { code: 'en', label: 'EN' },
                                        { code: secondaryLanguage, label: languages[secondaryLanguage].short }
                                     ].map((l, idx) => (
                                        <button 
                                            key={l.code + idx} 
                                            onClick={(e) => { e.stopPropagation(); onUpdate({ targetLanguage: l.code }); }} 
                                            className={`h-full w-8 rounded text-[10px] font-bold transition-colors flex items-center justify-center border ${
                                                char.targetLanguage === l.code 
                                                ? 'bg-accent text-white border-accent' 
                                                : 'bg-gray-900/60 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                                            }`}
                                        >
                                            {l.label}
                                        </button>
                                     ))}
                                     
                                    <div className="flex gap-1 h-full">
                                        <Tooltip content={t('node.action.modifyCharacter')}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onModify(); }} 
                                                disabled={!modificationRequest.trim() || isModifyingCharacter === cardOpKey} 
                                                className="w-8 bg-accent hover:bg-accent-hover text-white rounded flex items-center justify-center disabled:opacity-50 h-full"
                                            >
                                                {isModifyingCharacter === cardOpKey ? (
                                                     <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                )}
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Character Description Header */}
                <div 
                    className="flex-grow min-h-0 mt-2 relative p-0 border border-gray-700/50 rounded-xl bg-gray-900/20 shadow-inner overflow-hidden flex flex-col overflow-x-hidden"
                >
                    <div 
                        className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition-colors select-none flex-shrink-0"
                        onClick={() => onUpdate({ isDescriptionCollapsed: !char.isDescriptionCollapsed })}
                    >
                        <div className="flex items-center gap-2">
                            <div className={`transform transition-transform duration-200 ${char.isDescriptionCollapsed ? '-rotate-90' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t('node.content.fullDescriptionTitle')}</span>
                        </div>
                        <div className="flex gap-1">
                            <ActionButton 
                                title={t('node.action.updateDescription')}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onUpdateDescription(); 
                                }} 
                                disabled={isUpdatingDescription === cardOpKey || !char.prompt} 
                                className="p-1 text-gray-500 hover:text-accent-text transition-colors"
                                tooltipPosition="left"
                            >
                                {isUpdatingDescription === cardOpKey ? (
                                    <svg className="animate-spin h-3 w-3 text-accent-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                            </ActionButton>

                            <ActionButton 
                                title={t('node.action.copy')} 
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(char.fullDescription); }}
                                className="p-1 text-gray-500 hover:text-accent-text transition-colors"
                                tooltipPosition="left"
                            >
                                <CopyIcon className="h-3 w-3" />
                            </ActionButton>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    {!char.isDescriptionCollapsed && (
                        <div 
                            className="overflow-y-auto custom-scrollbar flex-grow overflow-x-hidden mr-1" 
                            onWheel={e => e.stopPropagation()}
                            style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}
                        >
                            <CharacterDescriptionArea 
                                fullDescription={char.fullDescription || ''} 
                                onDescriptionChange={(val) => onUpdate({ fullDescription: val })}
                                t={t}
                                onFocus={deselectAllNodes}
                                isUpdatingPersonality={isUpdatingPersonality === `${cardOpKey}-personality`}
                                onUpdatePersonality={onUpdatePersonality}
                                isUpdatingAppearance={isUpdatingAppearance === `${cardOpKey}-appearance`}
                                onUpdateAppearance={onUpdateAppearance}
                                isUpdatingClothing={isUpdatingClothing === `${cardOpKey}-clothing`}
                                onUpdateClothing={onUpdateClothing}
                            />
                        </div>
                    )}
                </div>

                {/* FIXED FOOTER BUTTONS */}
                <div className="flex gap-1.5 pt-2.5 mt-auto border-t border-gray-700/50 flex-shrink-0 bg-gray-800/20 backdrop-blur-sm">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSave(); }} 
                        className="flex-1 h-9 bg-accent hover:bg-accent-hover text-white font-bold rounded text-[10px] uppercase tracking-tighter transition-colors"
                    >
                        {t('node.action.saveCharacter')}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onLoad(); }} 
                        className="flex-1 h-9 bg-accent-secondary hover:bg-accent-secondary-hover text-white font-bold rounded text-[10px] uppercase tracking-tighter transition-colors"
                    >
                        {t('node.action.loadCharacter')}
                    </button>
                    
                    <div className="flex gap-1.5 ml-auto">
                        <ActionButton title={t('catalog.saveTo')} onClick={(e) => { e.stopPropagation(); onSaveToCatalog(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </ActionButton>
                        <ActionButton title={t('node.action.copy')} onClick={(e) => { e.stopPropagation(); onCopySpecific(); }}>
                            <CopyIcon className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton title={t('node.action.paste')} onClick={(e) => { e.stopPropagation(); onPasteSpecific(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </ActionButton>
                        <ActionButton title={t('node.action.detachAndPaste')} onClick={(e) => { e.stopPropagation(); onDetach(); }} tooltipPosition="top" tooltipAlign="end">
                            <DetachIcon className="h-4 w-4" />
                        </ActionButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CharacterCardItemMemoized = React.memo(CharacterCardItem);
export default CharacterCardItem;
