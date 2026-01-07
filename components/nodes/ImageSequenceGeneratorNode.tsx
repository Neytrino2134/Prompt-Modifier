


import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { NodeContentProps, CharacterConcept } from '../../types';
import { NodeType } from '../../types';
import { formatImageForAspectRatio, generateThumbnail, cropImageTo169 } from '../../utils/imageUtils';
import { DebouncedTextarea } from '../DebouncedTextarea';
import { useAppContext } from '../../contexts/AppContext';
import ImageEditorModal from '../ImageEditorModal';
import CustomSelect from '../CustomSelect';
import { expandImageAspectRatio } from '../../services/imageActions';
import { ActionButton } from '../ActionButton';
import JSZip from 'jszip';
import { CustomCheckbox } from '../CustomCheckbox';

import { CharacterConceptsPanel } from './image-sequence/CharacterConceptsPanel';
import { SourcePromptList } from './image-sequence/SourcePromptList';
import { OutputGalleryPanel } from './image-sequence/OutputGalleryPanel';
import { GenerationControls } from './image-sequence/GenerationControls';

const MIN_LEFT_PANE_WIDTH = 640; 
const MIN_RIGHT_PANE_WIDTH = 660; 
const NORMAL_CONCEPTS_HEIGHT = 390; 
const HEADER_HEIGHT_PX = 37;

export const ImageSequenceGeneratorNode: React.FC<NodeContentProps> = ({ node, onValueChange, onLoadImageSequenceFile, onGenerateImageSequence, onGenerateSelectedFrames, onStopImageSequence, isGeneratingSequence, onRegenerateFrame, onDownloadImageFromUrl, onCopyImageToClipboard, t, deselectAllNodes, connectedCharacterData, onDetachAndPasteConcept, onDetachImageToNode, onSaveSequenceToCatalog, setError, setImageViewer, getFullSizeImage, setFullSizeImage, connectedInputs, onRefreshUpstreamData, clearImagesForNodeFromCache, getUpstreamNodeValues, addToast, onSaveScriptToDisk, viewTransform }) => {
    
    const isPromptInputConnected = connectedInputs?.has('prompt_input');
    const context = useAppContext();
    const { nodes: allNodes, onAddNode, connections, handleNavigateToNodeFrame, setConnections, setSelectedNodeIds } = context || {};
    
    const contentRef = useRef<HTMLDivElement>(null);
    const leftPaneRef = useRef<HTMLDivElement>(null);
    const sourceListRef = useRef<any>(null); 
    const dragStartRef = useRef<{ startX: number, startWidth: number } | null>(null);

    // Track the last opened editor to append images if it's still open
    const lastOpenedEditorIdRef = useRef<string | null>(null);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
    const editingFrameRef = useRef<number | null>(null);
    
    // ZIP Progress State
    const [zipProgress, setZipProgress] = useState<number | null>(null);
    
    // Permission Guide Overlay State
    const [showPermissionOverlay, setShowPermissionOverlay] = useState(false);

    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return { prompts: [], images: {}, currentIndex: -1, isGenerating: false, autoDownload: false, selectedFrameNumber: null, frameStatuses: {}, aspectRatio: '16:9', characterConcepts: [], model: 'gemini-2.5-flash-image', characterPromptCombination: 'replace', enableAspectRatio: false, checkedFrameNumbers: [], styleOverride: '', isStyleSelected: false, isStyleCollapsed: true, isStyleInserted: true, isSceneContextInserted: true, isUsedCharsCollapsed: true, isIntegrationSettingsCollapsed: true, isCharacterPromptCombinationCollapsed: true, integrationPrompt: '', usedCharacters: [], conceptsMode: 'normal', connectedCharacterConfig: {}, collapsedScenes: [], collapsedOutputScenes: [], autoCrop169: true, leftPaneWidth: MIN_LEFT_PANE_WIDTH, createZip: false, imageDimensions: {}, sceneContexts: {}, expandedSceneContexts: [] };
        }
    }, [node.value]);

    const parsedValueRef = useRef(parsedValue);
    useEffect(() => { parsedValueRef.current = parsedValue; }, [parsedValue]);

    let initialWidth = parsedValue.leftPaneWidth;
    if (!initialWidth && parsedValue.leftPaneRatio) {
        initialWidth = Math.max(MIN_LEFT_PANE_WIDTH, (node.width || 1200) * parsedValue.leftPaneRatio);
    } else if (!initialWidth) {
        initialWidth = MIN_LEFT_PANE_WIDTH;
    }

    const { prompts = [], images = {}, selectedFrameNumber = null, frameStatuses = {}, aspectRatio = '16:9', autoDownload = false, characterConcepts = [], model = 'gemini-2.5-flash-image', characterPromptCombination = 'replace', enableAspectRatio = false, checkedFrameNumbers = [], styleOverride = '', isStyleCollapsed = true, isStyleInserted = true, isSceneContextInserted = true, isUsedCharsCollapsed = true, isIntegrationSettingsCollapsed = true, isCharacterPromptCombinationCollapsed = true, integrationPrompt = '', usedCharacters = [], conceptsMode = 'normal', collapsedScenes = [], collapsedOutputScenes = [], autoCrop169 = true, leftPaneWidth = MIN_LEFT_PANE_WIDTH, createZip = false, imageDimensions = {}, sceneContexts = {}, expandedSceneContexts = [] } = parsedValue;
    
    // Sorted Used Characters Logic
    const sortedUsedCharacters = useMemo(() => {
        return [...usedCharacters].map((char: any, originalIndex: number) => ({
            ...char,
            originalIndex
        })).sort((a: any, b: any) => {
             const getNum = (str: string) => parseInt((str || '0').replace(/[^0-9]/g, ''), 10);
             return getNum(a.index) - getNum(b.index);
        });
    }, [usedCharacters]);
    
    const isAnyFrameBusy = useMemo(() => Object.values(frameStatuses).some((s: any) => s === 'pending' || s === 'generating'), [frameStatuses]);
    const isGlobalBusy = !!isGeneratingSequence || isAnyFrameBusy;
    const conceptsPaneHeight = useMemo(() => {
        if (conceptsMode === 'collapsed') return HEADER_HEIGHT_PX;
        if (conceptsMode === 'expanded') return '100%'; 
        return NORMAL_CONCEPTS_HEIGHT;
    }, [conceptsMode]);

    const sortedPrompts = useMemo(() => [...prompts].sort((a:any,b:any) => a.frameNumber - b.frameNumber), [prompts]);
    const groupedPrompts = useMemo(() => {
        const sorted = [...prompts].sort((a, b) => a.frameNumber - b.frameNumber);
        const grouped: { scene: number, title: string, prompts: any[] }[] = [];
        let currentScene = -1;
        let currentGroup: { scene: number, title: string, prompts: any[] } | null = null;
        sorted.forEach((p: any) => {
            const scene = p.sceneNumber || 1;
            if (scene !== currentScene) {
                currentScene = scene;
                const title = p.sceneTitle || '';
                currentGroup = { scene, title, prompts: [] };
                grouped.push(currentGroup);
            }
            if (currentGroup) currentGroup.prompts.push(p);
        });
        return grouped;
    }, [prompts]);

    const handleValueUpdate = useCallback((updates: any) => {
        const current = parsedValueRef.current;
        const newValue = { ...current, ...updates };
        parsedValueRef.current = newValue;
        onValueChange(node.id, JSON.stringify(newValue));
    }, [node.id, onValueChange]);

    useEffect(() => {
        if (!node.width) return;
        const maxLeftWidth = node.width - MIN_RIGHT_PANE_WIDTH;
        if (leftPaneWidth > maxLeftWidth) handleValueUpdate({ leftPaneWidth: Math.max(MIN_LEFT_PANE_WIDTH, maxLeftWidth) });
        else if (leftPaneWidth < MIN_LEFT_PANE_WIDTH) handleValueUpdate({ leftPaneWidth: MIN_LEFT_PANE_WIDTH });
    }, [node.width, leftPaneWidth, handleValueUpdate]);

    const upstreamChars = connectedCharacterData || []; 
    const sortedUpstream = useMemo(() => [...upstreamChars].sort((a, b) => {
             const idxA = parseInt((a.alias || '0').replace(/[^0-9]/g, ''), 10);
             const idxB = parseInt((b.alias || '0').replace(/[^0-9]/g, ''), 10);
             return idxA - idxB;
    }), [upstreamChars]);
    const upstreamCount = sortedUpstream.length;
    
    const allConcepts = useMemo(() => {
        // Use deterministic IDs for upstream items to prevent duplicates/flashing on re-renders
        const mappedUpstream = sortedUpstream.map((c: any, idx: number) => ({ 
            ...c, 
            id: c.index || c.alias || c.name || `upstream-stable-${idx}`, 
            index: c.index || c.alias,
            image: c.image || c.imageSources?.['1:1'] || null,
            isConnected: true, 
            uniqueKey: `upstream-${c.index || idx}`, // Stable key
            _connectionId: c._connectionId,
            _sourceNodeId: c._sourceNodeId
        }));
        const mappedLocal = characterConcepts.map((c: any) => ({ 
            ...c, 
            index: c.id,
            isConnected: false, 
            uniqueKey: `local-${c.id}` 
        }));
        return [...mappedUpstream, ...mappedLocal];
    }, [sortedUpstream, characterConcepts]);

    // Validation Logic for Used Characters
    const validationResults = useMemo(() => {
        let hasError = false;
        let matchCount = 0;
        const normalize = (str: string) => (str || '').toLowerCase().trim();

        const results = sortedUsedCharacters.map((char: any) => {
            const uName = normalize(char.name);
            const uIndex = normalize(char.index);
            
            if (!uName && !uIndex) return { status: 'empty' };

            // 1. Find by Index (ID/Alias/Index)
            const indexMatch = allConcepts.find(c => normalize(c.index || c.id || c.alias) === uIndex);
            
            // 2. Find by Name
            const nameMatch = allConcepts.find(c => normalize(c.name) === uName);

            // Case 1: Perfect Match (Same Concept found by both)
            if (indexMatch && nameMatch && indexMatch === nameMatch) {
                matchCount++;
                return { status: 'match' };
            }

            // Case 2: Index exists, but name differs
            if (indexMatch) {
                const actualName = indexMatch.name;
                if (normalize(actualName) !== uName) {
                    hasError = true;
                    return { status: 'mismatch_name', expectedName: actualName, conceptIndex: indexMatch.index || indexMatch.id };
                }
            }

            // Case 3: Name exists, but index differs
            if (nameMatch) {
                const actualIndex = nameMatch.index || nameMatch.id || nameMatch.alias;
                if (normalize(actualIndex) !== uIndex) {
                     hasError = true;
                     return { status: 'mismatch_index', expectedIndex: actualIndex, conceptName: nameMatch.name };
                }
            }
            
            // Case 4: No match found
            return { status: 'missing' };
        });

        const allValid = sortedUsedCharacters.length > 0 && matchCount === sortedUsedCharacters.length && !hasError;

        return { results, hasError, allValid };
    }, [sortedUsedCharacters, allConcepts]);

    // Calculate duplicates (indices) for concept panel
    const duplicateIndices = useMemo(() => {
        const counts: Record<string, number> = {};
        const duplicates = new Set<string>();
        allConcepts.forEach(c => {
            const id = (c.id || '').trim(); // Using ID/Index
            if (id) {
                counts[id] = (counts[id] || 0) + 1;
            }
        });
        Object.keys(counts).forEach(key => {
            if (counts[key] > 1) {
                duplicates.add(key);
            }
        });
        return duplicates;
    }, [allConcepts]);

    const reindexLocalConcepts = (currentLocal: CharacterConcept[]) => {
        let maxUpstreamIndex = 0;
        sortedUpstream.forEach(c => {
             const idx = parseInt((c.index || c.alias || '0').replace(/[^0-9]/g, ''), 10);
             if (!isNaN(idx)) maxUpstreamIndex = Math.max(maxUpstreamIndex, idx);
        });
        if (maxUpstreamIndex === 0 && upstreamCount > 0) maxUpstreamIndex = upstreamCount;
        return currentLocal.map((c, i) => {
            const nextIndex = maxUpstreamIndex + i + 1;
            return { ...c, id: `Entity-${nextIndex}`, name: `Entity-${nextIndex}` }; // Updated to Entity
        });
    };

    const handleUpdateConcept = useCallback((index: number, updates: Partial<CharacterConcept>, isConnected: boolean, uniqueKey?: string) => {
        if (isConnected) return;
        const localIndex = index - upstreamCount;
        if (localIndex >= 0 && localIndex < characterConcepts.length) {
            const currentConcepts = [...characterConcepts];
            currentConcepts[localIndex] = { ...currentConcepts[localIndex], ...updates };
            handleValueUpdate({ characterConcepts: currentConcepts });
        }
    }, [characterConcepts, upstreamCount, handleValueUpdate]);

    const handleDeleteConcept = useCallback((index: number) => {
        const localIndex = index - upstreamCount;
        if (localIndex >= 0) {
            const newLocalConcepts = characterConcepts.filter((_, i) => i !== localIndex);
            const reindexed = reindexLocalConcepts(newLocalConcepts);
            handleValueUpdate({ characterConcepts: reindexed });
        }
    }, [characterConcepts, upstreamCount, handleValueUpdate, reindexLocalConcepts]);

    const handleAddConcept = useCallback(() => {
        const newConcept = { id: '', name: '', prompt: '', image: null };
        const newConcepts = [...characterConcepts, newConcept];
        const reindexed = reindexLocalConcepts(newConcepts);
        handleValueUpdate({ characterConcepts: reindexed });
    }, [characterConcepts, handleValueUpdate, reindexLocalConcepts]);
    
    // NEW: Clear Concepts Button Logic - Removes Local AND Cuts Upstream
    const handleClearConcepts = useCallback(() => {
        // 1. Clear Local State
        handleValueUpdate({ characterConcepts: [] });
        
        // 2. Clear Upstream Connections (Specific handle)
        if (setConnections) {
            setConnections(prev => prev.filter(c => 
                !(c.toNodeId === node.id && c.toHandleId === 'character_data')
            ));
        }

        if (onRefreshUpstreamData) {
            onRefreshUpstreamData(node.id);
        }
        addToast(t('toast.contentCleared'), 'info');
    }, [handleValueUpdate, onRefreshUpstreamData, node.id, addToast, t, setConnections]);

    // NEW: Enhanced Detach Logic for "All Data"
    const handleDetachConcept = useCallback((concept: any) => {
        // 1. Identify source and connection
        if (concept._sourceNodeId && setConnections && allNodes && connections) {
             const sourceNode = allNodes.find(n => n.id === concept._sourceNodeId);
             
             // Try to find the specific connection that feeds character data
             const incomingConnections = connections.filter(c => c.toNodeId === node.id && c.toHandleId === 'character_data');
             
             // 2. Check if it's a Character Card connected specifically
             if (sourceNode && sourceNode.type === NodeType.CHARACTER_CARD) {
                 
                  // Retrieve ALL characters from the card
                  let cardData = [];
                  try { cardData = JSON.parse(sourceNode.value || '[]'); } catch {}
                  if (!Array.isArray(cardData)) cardData = [cardData];

                  // Determine next available ID index
                  let maxId = 0;
                  characterConcepts.forEach((c: any) => {
                      const match = (c.id || '').match(/(?:Character|Entity)-(\d+)/i); // Updated Regex
                      if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
                  });
                  
                  // Map all characters to concepts
                  const newConcepts = cardData.map((c: any, i: number) => ({
                      id: `Entity-${maxId + i + 1}`, // Updated to Entity
                      name: c.name || `Entity ${maxId + i + 1}`,
                      prompt: c.prompt || '',
                      image: c.thumbnails?.['1:1'] || c.image || null, // Use thumbnail
                      fullDescription: c.fullDescription || ''
                  }));

                  // Append to local state
                  handleValueUpdate({ characterConcepts: [...characterConcepts, ...newConcepts] });

                  // Cut ALL incoming character connections to ensure no duplicates
                  setConnections(prev => prev.filter(c => !(c.toNodeId === node.id && c.toHandleId === 'character_data')));
                  
                  addToast(t('toast.pastedFromClipboard'), "success");
                  return;
             }
        }

        // Fallback to standard single detach if it wasn't a Card node via 'all_data' or other logic applied
        if (onDetachAndPasteConcept) {
             onDetachAndPasteConcept(node.id, concept);
        }
    }, [allNodes, connections, setConnections, characterConcepts, handleValueUpdate, onDetachAndPasteConcept, node.id, addToast, t]);

    const handleMoveConcept = useCallback((index: number, direction: 'up' | 'down') => {
        const localIndex = index - upstreamCount;
        if (localIndex < 0) return; 
        const newConcepts = [...characterConcepts];
        const targetLocalIndex = direction === 'up' ? localIndex - 1 : localIndex + 1;
        if (targetLocalIndex >= 0 && targetLocalIndex < newConcepts.length) {
            [newConcepts[localIndex], newConcepts[targetLocalIndex]] = [newConcepts[targetLocalIndex], newConcepts[localIndex]];
            const reindexed = reindexLocalConcepts(newConcepts);
            handleValueUpdate({ characterConcepts: reindexed });
        }
    }, [characterConcepts, upstreamCount, handleValueUpdate, reindexLocalConcepts]);

    const handleToggleConceptsMode = useCallback((mode: 'normal' | 'collapsed' | 'expanded') => {
        handleValueUpdate({ conceptsMode: mode });
    }, [handleValueUpdate]);

    const handleDetachToEditorWithToast = useCallback(() => {
        if (prompts.length === 0 || !onAddNode) return;
        
        // Position to the LEFT of the current node
        const offsetLeft = 1350; 
        const pos = { x: node.position.x - offsetLeft, y: node.position.y };
        
        const editorId = onAddNode(NodeType.PROMPT_SEQUENCE_EDITOR, pos);
        
        const editorValue = {
            instruction: '',
            sourcePrompts: prompts,
            modifiedPrompts: [],
            checkedSourceFrameNumbers: [],
            selectedFrameNumber: null,
            styleOverride: styleOverride,
            usedCharacters: usedCharacters,
            leftPaneRatio: 0.5
        };
        
        onValueChange(editorId, JSON.stringify(editorValue));
        
        if (setSelectedNodeIds) {
            setSelectedNodeIds([editorId]);
        }
        
        addToast("Prompts detached to Prompt Sequence Editor (Left)", "success");
    }, [prompts, onAddNode, node, styleOverride, usedCharacters, onValueChange, addToast, setSelectedNodeIds]);

    const handleClearAllWithToast = useCallback(() => {
        handleValueUpdate({ prompts: [], images: {}, frameStatuses: {} });
        addToast("All prompts cleared", "info");
    }, [handleValueUpdate, addToast]);

    // NEW: Clear Images Only
    const handleClearImages = useCallback(() => {
        handleValueUpdate({ images: {} }); // Clear thumbnails in state
        clearImagesForNodeFromCache(node.id); // Clear heavy memory cache
        addToast(t('toast.contentCleared'));
    }, [handleValueUpdate, clearImagesForNodeFromCache, node.id, addToast, t]);

    // NEW: Clear Text Prompts Only
    const handleClearTextOnly = useCallback(() => {
         const currentPrompts = [...(parsedValueRef.current.prompts || [])];
         const newPrompts = currentPrompts.map((p: any) => ({
             ...p,
             prompt: '',
             videoPrompt: '',
             shotType: 'WS'
         }));
         handleValueUpdate({ prompts: newPrompts });
         addToast("Text prompts cleared", "info");
    }, [handleValueUpdate, addToast]);

    const handleAddPrompt = useCallback((afterFrame?: number) => {
        const currentPrompts = [...(parsedValueRef.current.prompts || [])];
        const nextFrame = currentPrompts.length > 0 ? Math.max(...currentPrompts.map((p: any) => p.frameNumber)) + 1 : 1;
        const nextScene = currentPrompts.length > 0 ? currentPrompts[currentPrompts.length - 1].sceneNumber : 1;
        
        const newPrompt = {
            frameNumber: nextFrame,
            sceneNumber: nextScene,
            sceneTitle: '',
            prompt: '',
            videoPrompt: '',
            shotType: 'WS',
            characters: [],
            duration: 3,
            isCollapsed: true
        };

        if (afterFrame !== undefined && afterFrame !== -1) {
            const idx = currentPrompts.findIndex(p => p.frameNumber === afterFrame);
            if (idx !== -1) {
                currentPrompts.splice(idx + 1, 0, newPrompt);
                const reindexed = currentPrompts.map((p, i) => ({ ...p, frameNumber: i + 1 }));
                handleValueUpdate({ prompts: reindexed });
                return;
            }
        }
        
        handleValueUpdate({ prompts: [...currentPrompts, newPrompt] });
        setTimeout(() => sourceListRef.current?.scrollToBottom(), 100);
    }, [handleValueUpdate]);

    const handleAddScene = useCallback(() => {
        const currentPrompts = [...(parsedValueRef.current.prompts || [])];
        const lastScene = currentPrompts.length > 0 ? Math.max(...currentPrompts.map((p: any) => p.sceneNumber || 1)) : 0;
        const nextScene = lastScene + 1;
        const nextFrame = currentPrompts.length > 0 ? Math.max(...currentPrompts.map((p: any) => p.frameNumber)) + 1 : 1;
        
        const newPrompt = {
            frameNumber: nextFrame,
            sceneNumber: nextScene,
            sceneTitle: `Scene ${nextScene}`,
            prompt: '',
            videoPrompt: '',
            shotType: 'WS',
            characters: [],
            duration: 3,
            isCollapsed: false
        };
        
        handleValueUpdate({ prompts: [...currentPrompts, newPrompt] });
        setTimeout(() => sourceListRef.current?.scrollToBottom(), 100);
    }, [handleValueUpdate]);

    const handleEditInSource = useCallback((frameNumber: number) => {
        if (!isPromptInputConnected || !handleNavigateToNodeFrame) return;
        const sourceConn = connections?.find(c => c.toNodeId === node.id && c.toHandleId === 'prompt_input');
        if (sourceConn) {
             handleNavigateToNodeFrame(sourceConn.fromNodeId, frameNumber);
        }
    }, [isPromptInputConnected, handleNavigateToNodeFrame, connections, node.id]);

    const handleEditPrompt = useCallback((frameNumber: number) => {
        const currentPrompts = parsedValueRef.current.prompts || [];
        const currentCollapsedScenes = parsedValueRef.current.collapsedScenes || [];

        const targetPrompt = currentPrompts.find((p: any) => p.frameNumber === frameNumber);
        if (!targetPrompt) return;

        // Ensure the scene is expanded
        const sceneNum = targetPrompt.sceneNumber || 1;
        let newCollapsed = [...currentCollapsedScenes];
        let stateUpdated = false;

        if (newCollapsed.includes(sceneNum)) {
            newCollapsed = newCollapsed.filter(s => s !== sceneNum);
            stateUpdated = true;
        }

        // Ensure specific prompt card is expanded
        let newPrompts = currentPrompts;
        if (targetPrompt.isCollapsed) {
             newPrompts = currentPrompts.map((p: any) => 
                p.frameNumber === frameNumber ? { ...p, isCollapsed: false } : p
             );
             stateUpdated = true;
        }

        handleValueUpdate({ 
            collapsedScenes: newCollapsed,
            prompts: newPrompts,
            selectedFrameNumber: frameNumber
        });

        // Scroll to the frame
        if (sourceListRef.current) {
            // Add a small delay to allow React to render the expanded items before scrolling
            setTimeout(() => {
                sourceListRef.current.scrollToFrame(frameNumber);
            }, 50);
        }
    }, [handleValueUpdate]);

    const handleUnlink = useCallback(() => {
        if (setConnections && node.id) {
            setConnections(prev => prev.filter(c => !(c.toNodeId === node.id && c.toHandleId === 'prompt_input')));
            addToast("Unlinked from source. Data copied to local.", "info");
        }
    }, [setConnections, node.id, addToast]);

    const handleFrameDoubleClick = useCallback((frameNumber: number) => {
        // Try to get Full Res first
        const fullRes = getFullSizeImage(node.id, 1000 + frameNumber);
        const src = fullRes || images[frameNumber];
        
        if (src) {
            // Filter frames that actually have images to prevent viewer errors
            const validPrompts = prompts.filter(p => (getFullSizeImage(node.id, 1000 + p.frameNumber) || images[p.frameNumber]));
            
            // Map to viewer source format
            const viewerSources = validPrompts.map(p => ({
                src: getFullSizeImage(node.id, 1000 + p.frameNumber) || images[p.frameNumber],
                frameNumber: p.frameNumber,
                prompt: p.prompt
            }));

            // Find index in the VALID filtered list
            const initialIndex = validPrompts.findIndex(p => p.frameNumber === frameNumber);

            if (initialIndex !== -1) {
                setImageViewer({
                    sources: viewerSources,
                    initialIndex: initialIndex
                });
            }
        }
    }, [images, prompts, setImageViewer, getFullSizeImage, node.id]);

    const handleOpenAI = useCallback((imageUrl: string) => {
        if (!onAddNode) return;
        
        let targetNodeId = null;

        // Check if we already have an opened editor for this generator (via ref)
        // AND verify if that node still exists
        if (lastOpenedEditorIdRef.current) {
            const existingNode = allNodes?.find(n => n.id === lastOpenedEditorIdRef.current);
            if (existingNode && existingNode.type === NodeType.IMAGE_EDITOR) {
                targetNodeId = existingNode.id;
            } else {
                lastOpenedEditorIdRef.current = null; // Stale ref
            }
        }

        if (!targetNodeId) {
            // Create new editor to the RIGHT
            const pos = { x: node.position.x + node.width + 100, y: node.position.y };
            targetNodeId = onAddNode(NodeType.IMAGE_EDITOR, pos);
            lastOpenedEditorIdRef.current = targetNodeId;
            
            // Init new node with image
            onValueChange(targetNodeId, JSON.stringify({
                inputImages: [imageUrl],
                prompt: '',
                aspectRatio: aspectRatio,
                enableAspectRatio: true,
                model: 'gemini-2.5-flash-image'
            }));
            
            // Also cache full res for the new node (Input 0 -> index 1)
            // Note: Since we are in the generator logic, we need to manually trigger cache set for the new ID
            setFullSizeImage(targetNodeId, 1, imageUrl);
            generateThumbnail(imageUrl, 256, 256).then(thumb => {
                 onValueChange(targetNodeId!, JSON.stringify({
                    inputImages: [thumb],
                    prompt: '',
                    aspectRatio: aspectRatio,
                    enableAspectRatio: true,
                    model: 'gemini-2.5-flash-image'
                 }));
            });
            
        } else {
            // Append to existing editor
            const targetNode = allNodes?.find(n => n.id === targetNodeId);
            if (targetNode) {
                const currentVal = JSON.parse(targetNode.value || '{}');
                const currentImages = currentVal.inputImages || [];
                
                // Add to list
                // We need thumbnail for the list, full res for cache
                generateThumbnail(imageUrl, 256, 256).then(thumb => {
                    const newImages = [...currentImages, thumb];
                    onValueChange(targetNodeId!, JSON.stringify({ ...currentVal, inputImages: newImages }));
                    
                    // Set full res cache for the new slot (index = length before add + 1)
                    setFullSizeImage(targetNodeId!, currentImages.length + 1, imageUrl);
                });
            }
        }
        
        if (targetNodeId && setSelectedNodeIds) {
            setSelectedNodeIds([targetNodeId]);
        }
        
    }, [onAddNode, node, allNodes, onValueChange, setFullSizeImage, setSelectedNodeIds, aspectRatio]);

    const handleSelectByAspectRatio = useCallback((type: 'square' | 'landscape' | 'portrait') => {
        const currentDimensions = parsedValueRef.current.imageDimensions || {};
        const newChecked = prompts.filter(p => {
            const dims = currentDimensions[p.frameNumber];
            if (!dims) return false;
            const ratio = dims.width / dims.height;
            if (type === 'landscape') return ratio > 1.2;
            if (type === 'portrait') return ratio < 0.85;
            if (type === 'square') return ratio >= 0.85 && ratio <= 1.2;
            return false;
        }).map(p => p.frameNumber);

        if (newChecked.length === 0) {
            addToast("No images match this aspect ratio", "info");
        } else {
            handleValueUpdate({ checkedFrameNumbers: newChecked });
        }
    }, [prompts, handleValueUpdate, addToast]);

    const handleSelectSceneByAspectRatio = useCallback((sceneNumber: number, type: 'square' | 'landscape' | 'portrait') => {
        const currentDimensions = parsedValueRef.current.imageDimensions || {};
        // Filter prompts for this scene
        const scenePrompts = prompts.filter((p: any) => (p.sceneNumber || 1) === sceneNumber);

        const matchingFrames = scenePrompts.filter((p: any) => {
            const dims = currentDimensions[p.frameNumber];
            if (!dims) return false;
            const ratio = dims.width / dims.height;
            if (type === 'landscape') return ratio > 1.2;
            if (type === 'portrait') return ratio < 0.85;
            if (type === 'square') return ratio >= 0.85 && ratio <= 1.2;
            return false;
        }).map((p: any) => p.frameNumber);

        if (matchingFrames.length === 0) {
            addToast(`No ${type} images found in Scene ${sceneNumber}`, "info");
        } else {
            handleValueUpdate({ checkedFrameNumbers: matchingFrames });
        }
    }, [prompts, handleValueUpdate, addToast]);

    const handleDownloadSelected = useCallback(async () => {
        const sorted = [...checkedFrameNumbers].sort((a, b) => a - b);
        if (sorted.length === 0) return;

        // Check session storage to see if we've already shown the guide
        const hasSeenOverlay = sessionStorage.getItem('download_permission_shown');

        // If not creating ZIP and multiple files are selected, show warning overlay ONLY if not seen yet
        if (!createZip && sorted.length > 1 && !hasSeenOverlay) {
            setShowPermissionOverlay(true);
        }

        if (createZip) {
            setZipProgress(0); // Start progress
            // addToast("Preparing ZIP archive...", "info"); // Removed in favor of overlay

            try {
                const JSZipConstructor = (JSZip as any).default || JSZip;
                const zip = new JSZipConstructor();
                const now = new Date();
                const date = now.toISOString().split('T')[0];
                const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
                
                let fileCount = 0;
                for (const frameNum of sorted) {
                    const src = getFullSizeImage(node.id, 1000 + frameNum) || images[frameNum];
                    if (src && src.startsWith('data:image')) {
                        const padded = String(frameNum).padStart(3, '0');
                        const ext = src.match(/image\/(png|jpeg|jpg)/)?.[1] || 'png';
                        // Optimization: Convert to blob first to avoid main thread freeze
                        const blob = await (await fetch(src)).blob();
                        zip.file(`Frame_${padded}_seq_gen_${date}_${time}.${ext}`, blob);
                        fileCount++;
                    }
                }

                if (fileCount === 0) {
                    addToast("No valid images found to ZIP", "error");
                    setZipProgress(null);
                    return;
                }

                // USE 'STORE' compression (no compression) to speed up archiving
                const content = await zip.generateAsync({ 
                    type: 'blob',
                    compression: 'STORE' 
                }, (metadata: any) => {
                    setZipProgress(metadata.percent);
                });

                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `Image_Sequence_${date}_${time}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                addToast("ZIP archive downloaded", "success");
            } catch (e) { 
                console.error("ZIP Error:", e);
                addToast("Failed to create ZIP", "error"); 
            } finally {
                setZipProgress(null); // Reset progress
            }
        } else {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            for (const frameNum of sorted) {
                const src = getFullSizeImage(node.id, 1000 + frameNum) || images[frameNum];
                if (src) {
                    const p = prompts.find((p:any) => p.frameNumber === frameNum)?.prompt || '';
                    const padded = String(frameNum).padStart(3, '0');
                    const filename = `Frame_${padded}_seq_gen_${date}_${time}.png`;
                    onDownloadImageFromUrl(src, frameNum, p, filename);
                    await new Promise(r => setTimeout(r, 300));
                }
            }
        }
    }, [checkedFrameNumbers, createZip, getFullSizeImage, node.id, images, prompts, onDownloadImageFromUrl, addToast]);

    const handleForceRefresh = useCallback(() => {
        const resetStatuses = { ...frameStatuses };
        Object.keys(resetStatuses).forEach(k => {
            if (resetStatuses[Number(k)] !== 'done') resetStatuses[Number(k)] = 'idle';
        });
        handleValueUpdate({ frameStatuses: resetStatuses });
        if (onRefreshUpstreamData) onRefreshUpstreamData(node.id);
    }, [frameStatuses, handleValueUpdate, onRefreshUpstreamData, node.id]);

    const handleExpandFrame = useCallback(async (frameNumber: number, ratio: string) => {
        const fullSize = getFullSizeImage(node.id, 1000 + frameNumber) || images[frameNumber];
        if (!fullSize) return;
        
        const p = prompts.find((p: any) => p.frameNumber === frameNumber)?.prompt || '';
        
        try {
            const currentStatuses = { ...parsedValueRef.current.frameStatuses };
            currentStatuses[frameNumber] = 'generating';
            handleValueUpdate({ frameStatuses: currentStatuses });
            
            const newImage = await expandImageAspectRatio(fullSize, ratio, p);
            const thumb = await generateThumbnail(newImage, 128, 128); 
            
            setFullSizeImage(node.id, 1000 + frameNumber, newImage);
            
            const nextImages = { ...parsedValueRef.current.images, [frameNumber]: thumb };
            const nextStatuses = { ...parsedValueRef.current.frameStatuses, [frameNumber]: 'done' };
            handleValueUpdate({
                images: nextImages,
                frameStatuses: nextStatuses
            });
        } catch (e: any) {
            addToast(`Expansion failed: ${e.message}`, 'error');
            const nextStatuses = { ...parsedValueRef.current.frameStatuses, [frameNumber]: 'error' };
            handleValueUpdate({ frameStatuses: nextStatuses });
        }
    }, [getFullSizeImage, node.id, images, prompts, handleValueUpdate, addToast, setFullSizeImage]);

    const handleBatchExpand = useCallback(async (ratio: string) => {
        const targetFrames = [...checkedFrameNumbers].sort((a,b) => a-b);
        if (targetFrames.length === 0) return;
        
        for (const frameNum of targetFrames) {
            await handleExpandFrame(frameNum, ratio);
        }
    }, [checkedFrameNumbers, handleExpandFrame]);

    const handleHorizontalResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const scale = viewTransform?.scale || 1;
        dragStartRef.current = { startX: e.clientX, startWidth: parsedValueRef.current.leftPaneWidth || MIN_LEFT_PANE_WIDTH };
        const handleMouseMove = (ev: MouseEvent) => {
            const start = dragStartRef.current;
            if (!start) return;
            const deltaX = (ev.clientX - start.startX) / scale;
            const newWidth = start.startWidth + deltaX;
            const maxLeftWidth = node.width - MIN_RIGHT_PANE_WIDTH;
            const clampedWidth = Math.max(MIN_LEFT_PANE_WIDTH, Math.min(newWidth, maxLeftWidth));
            handleValueUpdate({ leftPaneWidth: clampedWidth });
        };
        const handleMouseUp = () => { 
            dragStartRef.current = null; 
            window.removeEventListener('mousemove', handleMouseMove); 
            window.removeEventListener('mouseup', handleMouseUp); 
        };
        window.addEventListener('mousemove', handleMouseMove); 
        window.addEventListener('mouseup', handleMouseUp);
    }, [handleValueUpdate, viewTransform, node.width]);

    const calculateUpstreamUpdates = useCallback(() => {
        if (!getUpstreamNodeValues) return null;
        const upstreamValues = getUpstreamNodeValues(node.id, 'prompt_input');
        if (!upstreamValues || upstreamValues.length === 0) return null;
        const promptMap = new Map<number, any>();
        let styleOverrideFromUpstream = styleOverride;
        let usedCharactersFromUpstream = usedCharacters;
        let sceneContextsFromUpstream = sceneContexts;
        let implicitFrameCounter = 1;
        upstreamValues.forEach((val: any) => {
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    let extractedPrompts: any[] = [];
                    if (parsed.type === 'script-prompt-modifier-data') {
                        extractedPrompts = parsed.finalPrompts || parsed.prompts || [];
                        if (parsed.styleOverride) styleOverrideFromUpstream = parsed.styleOverride;
                        if (parsed.usedCharacters) usedCharactersFromUpstream = parsed.usedCharacters;
                        if (parsed.sceneContexts) sceneContextsFromUpstream = parsed.sceneContexts;
                        if (parsed.videoPrompts) {
                             const videoMap = new Map(parsed.videoPrompts.map((vp: any) => [vp.frameNumber, vp]));
                             extractedPrompts = extractedPrompts.map((p: any) => ({...p, videoPrompt: p.videoPrompt || videoMap.get(p.frameNumber) || ''}));
                        }
                    } else if (parsed.sourcePrompts || parsed.modifiedPrompts) {
                        const source = parsed.sourcePrompts || [];
                        const mod = parsed.modifiedPrompts || [];
                        const mergedMap = new Map();
                        source.forEach((p: any) => mergedMap.set(p.frameNumber, p));
                        mod.forEach((p: any) => mergedMap.set(p.frameNumber, { ...mergedMap.get(p.frameNumber), ...p }));
                        extractedPrompts = Array.from(mergedMap.values());
                        if (parsed.styleOverride) styleOverrideFromUpstream = parsed.styleOverride;
                        if (parsed.usedCharacters) usedCharactersFromUpstream = parsed.usedCharacters;
                        if (parsed.sceneContexts) sceneContextsFromUpstream = parsed.sceneContexts;
                    } else if (Array.isArray(parsed)) { extractedPrompts = parsed; }
                    
                    if (extractedPrompts.length > 0) {
                        extractedPrompts.forEach((p: any) => {
                            const frameNum = p.frameNumber !== undefined ? p.frameNumber : implicitFrameCounter++;
                            const currentPrompts = parsedValueRef.current.prompts || [];
                            const existing = currentPrompts.find((ep: any) => ep.frameNumber === frameNum);
                            const isCollapsed = existing ? existing.isCollapsed : true;
                            promptMap.set(frameNum, { frameNumber: frameNum, sceneNumber: p.sceneNumber || 1, sceneTitle: p.sceneTitle || '', prompt: p.prompt || '', videoPrompt: p.videoPrompt || '', shotType: p.shotType || p.ShotType || 'WS', characters: p.characters || [], duration: p.duration || 3, isCollapsed: isCollapsed });
                        });
                    }
                } catch { }
            }
        });
        if (promptMap.size > 0) return { prompts: Array.from(promptMap.values()).sort((a, b) => a.frameNumber - b.frameNumber), styleOverride: styleOverrideFromUpstream, usedCharacters: usedCharactersFromUpstream, sceneContexts: sceneContextsFromUpstream };
        return null;
    }, [getUpstreamNodeValues, node.id, styleOverride, usedCharacters, sceneContexts]);

    useEffect(() => {
        if (isPromptInputConnected && !isGeneratingSequence) {
            const updates = calculateUpstreamUpdates();
            if (updates) {
                const currentPromptsStr = JSON.stringify(parsedValueRef.current.prompts);
                const newPromptsStr = JSON.stringify(updates.prompts);
                const currentStyle = parsedValueRef.current.styleOverride;
                const currentUsedChars = JSON.stringify(parsedValueRef.current.usedCharacters);
                const newUsedChars = JSON.stringify(updates.usedCharacters);
                const currentContexts = JSON.stringify(parsedValueRef.current.sceneContexts);
                const newContexts = JSON.stringify(updates.sceneContexts);
                
                if (currentPromptsStr !== newPromptsStr || currentStyle !== updates.styleOverride || currentUsedChars !== newUsedChars || currentContexts !== newContexts) handleValueUpdate(updates);
            }
        }
    }, [isPromptInputConnected, calculateUpstreamUpdates, handleValueUpdate, isGeneratingSequence]);

    const handleApplyEditor = (imageDataUrl: string) => {
        const frameNumber = editingFrameRef.current;
        if (frameNumber !== null) {
             setFullSizeImage(node.id, 1000 + frameNumber, imageDataUrl);
             generateThumbnail(imageDataUrl, 128, 128).then(thumb => handleValueUpdate({ images: { ...images, [frameNumber]: thumb } })); 
        }
    };

    const handleUpdateUsedCharacterName = (idx: number, newName: string) => {
        // Find the character by originalIndex to update correctly
        // We use the original index to update the main array, regardless of sort order
        const targetOriginalIndex = sortedUsedCharacters[idx].originalIndex;
        
        const newChars = [...usedCharacters];
        if (newChars[targetOriginalIndex]) {
             newChars[targetOriginalIndex] = { ...newChars[targetOriginalIndex], name: newName };
             handleValueUpdate({ usedCharacters: newChars });
        }
    };

    const handleToggleUsedCharsCollapse = () => handleValueUpdate({ isUsedCharsCollapsed: !isUsedCharsCollapsed });
    const handleToggleStyleCollapse = () => handleValueUpdate({ isStyleCollapsed: !isStyleCollapsed });
    const handleToggleInsertStyle = (checked: boolean) => handleValueUpdate({ isStyleInserted: checked });
    const handleToggleInsertSceneContext = (checked: boolean) => handleValueUpdate({ isSceneContextInserted: checked }); // New Handler
    const handleToggleIntegrationSettings = () => handleValueUpdate({ isIntegrationSettingsCollapsed: !isIntegrationSettingsCollapsed });
    const handleToggleCharacterPromptCombinationCollapse = () => handleValueUpdate({ isCharacterPromptCombinationCollapsed: !isCharacterPromptCombinationCollapsed });

    const onCopyPrompt = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('toast.copiedToClipboard'), 'info');
    }, [addToast, t]);

    const onCopyVideoPrompt = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('toast.copiedToClipboard'), 'info');
    }, [addToast, t]);

    const handleReportDimensions = useCallback((frameNumber: number, width: number, height: number) => {
        const currentDimensions = parsedValueRef.current.imageDimensions || {};
        if (currentDimensions[frameNumber]?.width === width && currentDimensions[frameNumber]?.height === height) return;
        handleValueUpdate({ imageDimensions: { ...currentDimensions, [frameNumber]: { width, height } } });
    }, [handleValueUpdate]);

    const handleUpdateSceneContext = (sceneNum: number, text: string) => {
        const newContexts = { ...sceneContexts, [sceneNum]: text };
        handleValueUpdate({ sceneContexts: newContexts });
    };

    const handleToggleSceneContext = (sceneNum: number) => {
        const current = expandedSceneContexts || [];
        const newExpanded = current.includes(sceneNum)
            ? current.filter((s: number) => s !== sceneNum)
            : [...current, sceneNum];
        handleValueUpdate({ expandedSceneContexts: newExpanded });
    };

    return (
        <div className="flex h-full w-full space-x-2" onWheel={(e) => e.stopPropagation()}>
            <ImageEditorModal isOpen={isEditorOpen} onClose={() => { setIsEditorOpen(false); editingFrameRef.current = null; }} onApply={handleApplyEditor} imageSrc={editorImageSrc} />

            <div ref={leftPaneRef} className="h-full flex flex-col flex-shrink-0" style={{ width: `${leftPaneWidth}px` }}>
                 <div className="flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out relative z-10" style={{ height: typeof conceptsPaneHeight === 'string' ? conceptsPaneHeight : `${conceptsPaneHeight}px` }}>
                    <CharacterConceptsPanel 
                        allConcepts={allConcepts} 
                        characterConcepts={characterConcepts} 
                        conceptSortOrder={[]} 
                        onUpdateConcept={handleUpdateConcept} 
                        onDeleteConcept={handleDeleteConcept} 
                        onMoveConcept={handleMoveConcept} 
                        onAddConcept={handleAddConcept} 
                        onDetachConnectedConcept={(concept) => handleDetachConcept(concept)} 
                        onClearConcepts={handleClearConcepts} // Added
                        handleViewImage={(url) => setImageViewer({ sources: [{ src: url, frameNumber: 0 }], initialIndex: 0 })} 
                        t={t} 
                        deselectAllNodes={deselectAllNodes} 
                        conceptsMode={conceptsMode} 
                        onToggleMode={handleToggleConceptsMode}
                        duplicateIndices={duplicateIndices} // Pass validation result
                    />
                </div>
                
                 {conceptsMode !== 'expanded' && (
                    <div className="flex-grow flex flex-col min-h-0 pt-2"> 
                         <div className="flex flex-col space-y-1 mb-1 flex-shrink-0">
                             <div 
                                className={`flex justify-between items-center cursor-pointer hover:bg-gray-700/50 rounded-md px-1 transition-colors group ${validationResults.hasError ? "bg-red-900/30" : validationResults.allValid ? "bg-cyan-900/30" : ""}`}
                                onClick={handleToggleUsedCharsCollapse}
                             >
                                <label className={`text-[10px] font-bold uppercase cursor-pointer py-1 flex-grow flex items-center gap-2 ${validationResults.hasError ? "text-red-400" : validationResults.allValid ? "text-cyan-400" : "text-gray-400"}`}>
                                    {validationResults.hasError ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    ) : validationResults.allValid ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    ) : null}
                                    Используемые персонажи
                                    {validationResults.allValid && <span className="text-[9px] font-normal opacity-70 ml-1">(Все совпадают)</span>}
                                </label>
                                <div className="text-gray-500 group-hover:text-gray-300 p-1">
                                    {isUsedCharsCollapsed 
                                        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                    }
                                </div>
                             </div>
                             {!isUsedCharsCollapsed && (
                                <div 
                                    onWheel={e => e.stopPropagation()}
                                    className="bg-gray-700/50 p-2 rounded-md border border-gray-600 max-h-32 overflow-y-auto custom-scrollbar"
                                >
                                    {sortedUsedCharacters.length > 0 ? sortedUsedCharacters.map((char: any, i: number) => {
                                        const result = validationResults.results[i] || { status: 'missing' };
                                        
                                        let icon = null;
                                        let textColor = "text-gray-400";
                                        let tooltip = "";

                                        if (result.status === 'match') {
                                            icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
                                            textColor = "text-green-400";
                                            tooltip = "Совпадение имени и индекса";
                                        } else if (result.status === 'mismatch_name') {
                                            icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
                                            textColor = "text-red-400";
                                            tooltip = `Индекс совпадает (${char.index}), но имя отличается. Ожидается: "${result.expectedName}"`;
                                        } else if (result.status === 'mismatch_index') {
                                            icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
                                            textColor = "text-red-400";
                                            tooltip = `Имя совпадает ("${char.name}"), но индекс отличается. Исправьте индекс на: ${result.expectedIndex}`;
                                        } else {
                                             // Missing or Empty
                                             icon = <span className="text-gray-600 text-[10px]">•</span>;
                                             tooltip = "Персонаж не найден в концептах";
                                        }

                                        return (
                                            <div key={i} className="flex items-center gap-2 mb-1 last:mb-0 group/item" title={tooltip}>
                                                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                                                    {icon}
                                                </div>
                                                <span className={`text-[10px] font-mono w-20 shrink-0 truncate ${textColor}`}>{char.index}:</span>
                                                <input 
                                                    type="text" 
                                                    value={char.name} 
                                                    onChange={(e) => handleUpdateUsedCharacterName(i, e.target.value)}
                                                    className={`flex-grow bg-gray-800 border-none rounded px-1.5 py-0.5 text-[10px] outline-none focus:ring-1 focus:ring-cyan-500 ${result.status.startsWith('mismatch') ? 'text-red-200 bg-red-900/20' : 'text-gray-200'}`}
                                                    onMouseDown={e => e.stopPropagation()}
                                                />
                                            </div>
                                        );
                                    }) : <div className="text-[10px] text-gray-500 italic">Персонажи не указаны.</div>}
                                </div>
                             )}
                        </div>

                        {/* Integration Instruction Panel */}
                        <div className="flex flex-col space-y-1 mb-2 flex-shrink-0">
                            <div 
                                className="flex justify-between items-center cursor-pointer hover:bg-gray-700/50 rounded-md px-1 transition-colors group"
                                onClick={handleToggleIntegrationSettings}
                            >
                                <label className="text-[10px] font-bold text-gray-400 uppercase cursor-pointer py-1 flex-grow">Инструкция интеграции</label>
                                <div className="text-gray-500 group-hover:text-gray-300 p-1">
                                    {isIntegrationSettingsCollapsed 
                                        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                    }
                                </div>
                            </div>
                            {!isIntegrationSettingsCollapsed && (
                                <DebouncedTextarea 
                                    value={integrationPrompt} 
                                    onDebouncedChange={(v) => handleValueUpdate({ integrationPrompt: v })} 
                                    placeholder="Integrate these Entities into the scene..."
                                    className="w-full p-2 bg-gray-700 border-none rounded-md resize-none focus:outline-none text-xs" 
                                    style={{ minHeight: '60px' }} 
                                    onMouseDown={e => e.stopPropagation()} 
                                    onWheel={(e) => e.stopPropagation()} 
                                />
                            )}
                        </div>

                         <div 
                            onWheel={e => e.stopPropagation()}
                            className="flex-shrink-0 flex flex-col space-y-2 mb-2"
                         >
                            <div className="flex flex-col space-y-1">
                                <div 
                                    className="flex justify-between items-center cursor-pointer hover:bg-gray-700/50 rounded-md px-1 transition-colors group"
                                    onClick={handleToggleCharacterPromptCombinationCollapse}
                                >
                                    <label className="text-[10px] font-bold text-gray-400 uppercase cursor-pointer py-1 flex-grow">
                                        {t('image_sequence.character_prompt_combination')}
                                        {characterPromptCombination !== 'none' && (
                                            <span className="text-cyan-400 font-normal ml-1 normal-case">
                                                ({characterPromptCombination === 'combine' ? t('image_sequence.combination_combine') : t('image_sequence.combination_replace')})
                                            </span>
                                        )}
                                    </label>
                                    <div className="text-gray-500 group-hover:text-gray-300 p-1">
                                        {isCharacterPromptCombinationCollapsed
                                            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                        }
                                    </div>
                                </div>

                                {!isCharacterPromptCombinationCollapsed && (
                                    <div className="flex items-center space-x-4 bg-gray-800/50 p-2 rounded-md border border-gray-700">
                                        <CustomCheckbox 
                                            checked={characterPromptCombination === 'combine'}
                                            onChange={(checked) => handleValueUpdate({ characterPromptCombination: checked ? 'combine' : 'none' })}
                                            label={t('image_sequence.combination_combine')}
                                            title="Добавляет описание персонажа к промпту кадра."
                                        />
                                        <CustomCheckbox 
                                            checked={characterPromptCombination === 'replace'}
                                            onChange={(checked) => handleValueUpdate({ characterPromptCombination: checked ? 'replace' : 'none' })}
                                            label={t('image_sequence.combination_replace')}
                                            title="Заменяет теги (напр. Character-1) в промпте на описание персонажа."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Style Panel */}
                        <div className="flex flex-col space-y-1 mb-2 flex-shrink-0">
                             <div 
                                className="flex justify-between items-center cursor-pointer hover:bg-gray-700/50 rounded-md px-1 transition-colors group"
                                onClick={handleToggleStyleCollapse}
                             >
                                <div className="flex items-center gap-2 flex-grow">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase cursor-pointer py-1">{t('node.content.style')}</label>
                                    
                                    {/* Insert Style Checkbox */}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <CustomCheckbox
                                            checked={isStyleInserted}
                                            onChange={handleToggleInsertStyle}
                                            title="Автоматически добавляет описание стиля ко всем кадрам."
                                            label="Вставлять стиль"
                                        />
                                    </div>

                                    {/* Insert Scene Context Checkbox */}
                                    <div onClick={(e) => e.stopPropagation()} className="ml-2">
                                        <CustomCheckbox
                                            checked={isSceneContextInserted}
                                            onChange={handleToggleInsertSceneContext}
                                            title="Автоматически добавляет описание контекста сцены ко всем кадрам этой сцены."
                                            label={t('node.content.insertSceneContext')}
                                        />
                                    </div>
                                </div>

                                <div className="text-gray-500 group-hover:text-gray-300 p-1">
                                    {isStyleCollapsed 
                                        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                    }
                                </div>
                             </div>
                             {!isStyleCollapsed && <DebouncedTextarea value={styleOverride} onDebouncedChange={(v) => handleValueUpdate({ styleOverride: v })} className="w-full p-2 bg-gray-700 border-none rounded-md resize-none focus:outline-none text-xs" style={{ minHeight: '60px' }} onMouseDown={e => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} />}
                        </div>

                        {/* Visible Divider */}
                        <div className="w-full h-0.5 bg-gray-600/80 my-3 flex-shrink-0"></div>

                        <SourcePromptList 
                            ref={sourceListRef} 
                            prompts={prompts} 
                            collapsedScenes={collapsedScenes} 
                            checkedFrameNumbers={checkedFrameNumbers} 
                            selectionKey="checkedFrameNumbers" 
                            selectedFrameNumber={selectedFrameNumber} 
                            isLinked={!!isPromptInputConnected} 
                            onUpdatePrompts={handleValueUpdate} 
                            onLoadFile={() => onLoadImageSequenceFile(node.id)} 
                            onSaveToCatalog={() => onSaveSequenceToCatalog(node.id)} 
                            onSaveToDisk={() => onSaveScriptToDisk(node.id)} 
                            t={t} 
                            onSelect={(f) => handleValueUpdate({ selectedFrameNumber: f })} 
                            onToggleCollapse={(f) => { const newPrompts = prompts.map((p: any) => p.frameNumber === f ? {...p, isCollapsed: !p.isCollapsed} : p); handleValueUpdate({ prompts: newPrompts }); }} 
                            onToggleScene={(scene) => { const newCollapsed = collapsedScenes.includes(scene) ? collapsedScenes.filter((s: number) => s !== scene) : [...collapsedScenes, scene]; handleValueUpdate({ collapsedScenes: newCollapsed }); }} 
                            onDetachToEditor={handleDetachToEditorWithToast} 
                            onClearAll={handleClearAllWithToast}
                            onAddPrompt={handleAddPrompt} 
                            onAddScene={handleAddScene} 
                            onDeletePrompt={(frame) => { const rem = prompts.filter((p:any) => p.frameNumber !== frame); handleValueUpdate({prompts: rem}); }} 
                            onMovePromptUp={() => {}} 
                            onMovePromptDown={() => {}} 
                            onMoveToStart={() => {}} 
                            onMoveToEnd={() => {}} 
                            onRegenerate={(f) => onRegenerateFrame(node.id, f)} 
                            isAnyGenerationInProgress={isGlobalBusy} 
                            onEditInSource={handleEditInSource} 
                            onEditPrompt={handleEditPrompt} 
                            isGeneratingSequence={!!isGeneratingSequence} 
                            allConceptsLength={allConcepts.length} 
                            onUnlink={handleUnlink} 
                            addToast={addToast}
                            onClearTextOnly={handleClearTextOnly}
                            // New props passed down
                            sceneContexts={sceneContexts}
                            onUpdateSceneContext={handleUpdateSceneContext}
                            expandedSceneContexts={expandedSceneContexts}
                            onToggleSceneContext={handleToggleSceneContext}
                        />
                    </div>
                )}
            </div>

            <div onMouseDown={handleHorizontalResize} className="w-2 h-full bg-gray-700/50 hover:bg-cyan-600 cursor-col-resize rounded transition-colors flex-shrink-0"></div>

            <div className="flex-grow flex flex-col space-y-2 min-w-0" style={{ width: '0', flexGrow: 1, position: 'relative' }}>
                 {/* Progress Overlay */}
                 {zipProgress !== null && (
                    <div className="absolute inset-0 z-50 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-md">
                        <div className="text-cyan-400 font-bold text-lg mb-4 animate-pulse">Archiving Sequence...</div>
                        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-600 shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-100 ease-out relative"
                                style={{ width: `${zipProgress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[progress-bar-stripes_1s_linear_infinite]" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                            </div>
                        </div>
                        <div className="text-gray-300 font-mono mt-2">{zipProgress.toFixed(0)}%</div>
                    </div>
                 )}
                 
                 {/* Permission Guide Overlay */}
                 {showPermissionOverlay && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start pt-20 text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gray-800 p-6 rounded-xl border border-cyan-500 shadow-2xl max-w-md mx-4 relative">
                            {/* Arrow pointing up */}
                            <div className="absolute -top-12 right-4 md:right-1/4 animate-bounce text-cyan-400">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            </div>
                            
                            <h3 className="text-xl font-bold text-white mb-2">Разрешите скачивание</h3>
                            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                                Браузер заблокировал скачивание нескольких файлов.<br/>
                                Пожалуйста, обратите внимание на значок в адресной строке или всплывающее окно и выберите <b>"Разрешить всегда"</b> (Allow automatic downloads).
                            </p>
                            
                            <button 
                                onClick={() => {
                                    setShowPermissionOverlay(false);
                                    sessionStorage.setItem('download_permission_shown', 'true');
                                }}
                                className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded transition-colors"
                            >
                                Готово
                            </button>
                        </div>
                    </div>,
                    document.body
                 )}

                 <OutputGalleryPanel 
                    prompts={prompts} 
                    images={images} 
                    frameStatuses={frameStatuses} 
                    selectedFrameNumber={selectedFrameNumber} 
                    checkedFrameNumbers={checkedFrameNumbers} 
                    collapsedOutputScenes={collapsedOutputScenes} 
                    isGeneratingSequence={!!isGeneratingSequence} 
                    isAnyFrameGenerating={isAnyFrameBusy} 
                    t={t} 
                    onUpdateState={(updates) => { 
                        // If output panel requests a clear of sequenceOutputs (which is old logic), route it to handleClearImages
                        if (updates.sequenceOutputs && updates.sequenceOutputs.length === 0) { 
                            handleClearImages(); 
                        } else { 
                            handleValueUpdate(updates); 
                        } 
                    }} 
                    groupedPrompts={groupedPrompts} 
                    onRegenerate={(f) => onRegenerateFrame(node.id, f)} 
                    onDownload={(f, p) => {
                        const src = getFullSizeImage(node.id, 1000 + f) || images[f];
                        if (src) {
                             const now = new Date();
                             const date = now.toISOString().split('T')[0];
                             const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
                             const paddedFrame = String(f).padStart(3, '0');
                             const filename = `Frame_${paddedFrame}_seq_gen_${date}_${time}.png`;
                             onDownloadImageFromUrl(src, f, p, filename);
                        }
                    }} 
                    onCopy={(f) => onCopyImageToClipboard(getFullSizeImage(node.id, 1000 + f) || images[f])} 
                    onCopyPrompt={onCopyPrompt} 
                    onCopyVideoPrompt={onCopyVideoPrompt} 
                    onStopFrame={(f) => onStopImageSequence()} 
                    onFrameSelect={(f) => handleValueUpdate({ selectedFrameNumber: f })} 
                    onFrameDoubleClick={handleFrameDoubleClick} 
                    onCheckFrame={(f, shift) => { if (shift) { handleValueUpdate({ checkedFrameNumbers: [f] }); } else { const current = parsedValueRef.current.checkedFrameNumbers || []; const newChecked = current.includes(f) ? current.filter((n: number) => n !== f) : [...current, f]; handleValueUpdate({ checkedFrameNumbers: newChecked }); } }} 
                    onOpenRaster={(f, url) => { setEditorImageSrc(url); editingFrameRef.current = f; setIsEditorOpen(true); }} 
                    onOpenAI={handleOpenAI} 
                    onReplaceImage={(f, url) => { setFullSizeImage(node.id, 1000 + f, url); handleValueUpdate({ images: { ...images, [f]: url } }); }} 
                    onEditPrompt={handleEditPrompt} 
                    onEditInSource={handleEditInSource} 
                    readOnlyPrompt={!!isPromptInputConnected} 
                    getFullSizeImage={(f) => getFullSizeImage(node.id, f)} 
                    onSelectByAspectRatio={handleSelectByAspectRatio} 
                    onSelectSceneByAspectRatio={handleSelectSceneByAspectRatio}
                    onSelectAll={() => handleValueUpdate({ checkedFrameNumbers: prompts.map((p:any) => p.frameNumber) })} 
                    onSelectNone={() => handleValueUpdate({ checkedFrameNumbers: [] })} 
                    onInvertSelection={() => { const current = parsedValueRef.current.checkedFrameNumbers || []; const all = prompts.map((p:any) => p.frameNumber); const newChecked = all.filter((n: number) => !current.includes(n)); handleValueUpdate({ checkedFrameNumbers: newChecked }); }} 
                    onRunSelected={() => onGenerateSelectedFrames(node.id)} 
                    onDownloadSelected={handleDownloadSelected} 
                    onForceRefresh={handleForceRefresh} 
                    onExpandFrame={handleExpandFrame} 
                    onExpandSelected={handleBatchExpand} 
                    onReportDimensions={handleReportDimensions} 
                    // Pass the new specific clear handler
                    onClearImages={handleClearImages}
                />
                 <GenerationControls model={model} autoCrop169={autoCrop169} autoDownload={autoDownload} createZip={createZip} isGeneratingSequence={!!isGeneratingSequence} isAnyFrameGenerating={isAnyFrameBusy} checkedCount={checkedFrameNumbers.length} promptsLength={prompts.length} onUpdateState={handleValueUpdate} onGenerateSelected={() => onGenerateSelectedFrames(node.id)} onDownloadSelected={handleDownloadSelected} onStartQueue={() => onGenerateImageSequence(node.id, 0)} onExpandSelected={handleBatchExpand} t={t} />
            </div>
        </div>
    );
};