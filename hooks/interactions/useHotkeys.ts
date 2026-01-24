
import React, { useEffect, MutableRefObject } from 'react';
import { NodeType, Tool, Node } from '../../types';

interface UseHotkeysProps {
    selectedNodeIds: string[];
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    nodesRef: MutableRefObject<Node[]>;
    groupsRef: MutableRefObject<any[]>;
    draggingInfoRef: MutableRefObject<any>;
    isTyping: boolean;
    handleSaveCanvas: () => void;
    handleLoadCanvas: () => void;
    copyNodeValue: (id: string) => void;
    copyGroup: (id: string) => void;
    handlePaste: (isAlternativeMode?: boolean) => void;
    handleToggleCatalog: () => void;
    handleOpenQuickSearch: (pos: {x: number, y: number}) => void;
    handleOpenQuickAdd: (position: {x: number, y: number}) => void; // Added
    deselectAllNodes: () => void;
    handleDuplicateNode: (id: string) => string | undefined;
    handleDuplicateNodeWithContent: (id: string) => string | undefined;
    deleteNodeAndConnections: (id: string) => void;
    requestDeleteNodes: (ids: string[], pos: {x: number, y: number}) => void;
    handleGroupSelection: () => void;
    handleToggleNodeCollapse: (id: string) => void;
    handleToggleNodePin: (id: string) => void;
    onAddNode: (type: NodeType, pos: {x: number, y: number}) => void;
    pointerPositionRef: MutableRefObject<{x: number, y: number}>;
    clientPointerPositionRef: MutableRefObject<{x: number, y: number}>;
    handleCloseAddNodeMenus: () => void;
    setIsSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
    setLineStyle: React.Dispatch<React.SetStateAction<any>>;
    setIsSmartGuidesEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setActiveTool: (tool: Tool) => void;
    setIsShiftDown: (val: boolean) => void;
    setIsCtrlDown: (val: boolean) => void;
    setIsAltDown: (val: boolean) => void;
    setIsZDown: (val: boolean) => void;
    setSelectionRect: (val: any) => void;
    isRadialMenuOpen: boolean;
    setIsRadialMenuOpen: (val: boolean) => void;
    setRadialMenuPosition: (val: any) => void;
    radialMenuSelectedItem: NodeType | null;
    setRadialMenuSelectedItem: (val: any) => void;
    getTransformedPoint: (p: any) => any;
    radialMenuPosition: any;
    quickSlots: (NodeType | null)[];
    isConnectionQuickAddOpen: boolean;
    isInstantCloseEnabled: boolean;
    handleAlignNodes: (ids: string[], type: any) => void;
    onAddNodeCallback?: (type: NodeType, pos: any) => void;
    undoPosition: (nodes: Node[]) => void;
    redoPosition: (nodes: Node[]) => void;
    handleValueChange: (nodeId: string, value: string) => void;
}

export const useHotkeys = (props: UseHotkeysProps) => {
    const {
        selectedNodeIds, setSelectedNodeIds, nodesRef, groupsRef, draggingInfoRef, isTyping,
        handleSaveCanvas, handleLoadCanvas, copyNodeValue, copyGroup, handlePaste,
        handleToggleCatalog, handleOpenQuickSearch, handleOpenQuickAdd, deselectAllNodes, handleDuplicateNode,
        handleDuplicateNodeWithContent, deleteNodeAndConnections, requestDeleteNodes,
        handleGroupSelection, handleToggleNodeCollapse, handleToggleNodePin, onAddNode, pointerPositionRef,
        clientPointerPositionRef, handleCloseAddNodeMenus, setIsSnapToGrid, setLineStyle,
        setIsSmartGuidesEnabled, setActiveTool, setIsShiftDown, setIsCtrlDown, setIsAltDown, setIsZDown,
        setSelectionRect, isRadialMenuOpen, setIsRadialMenuOpen, setRadialMenuPosition,
        radialMenuSelectedItem, setRadialMenuSelectedItem, getTransformedPoint, radialMenuPosition,
        quickSlots, isConnectionQuickAddOpen, isInstantCloseEnabled, handleAlignNodes,
        undoPosition, redoPosition, handleValueChange
    } = props;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // FIX: Catalog (Ctrl + Space) needs to be checked BEFORE input filtering
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') { 
                e.preventDefault(); 
                handleToggleCatalog(); 
                return; 
            }

            const target = e.target as HTMLElement;
            // Basic check if user is typing in an input
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            if (e.key === 'Shift' && !e.repeat) setIsShiftDown(true);
            if (e.key === 'Control' && !e.repeat) setIsCtrlDown(true);
            if (e.key === 'Alt' && !e.repeat) setIsAltDown(true);
            
            // Only trigger Z (Zoom) if we are NOT in multi-select mode (where Z becomes Undo)
            if (e.code === 'KeyZ' && !e.repeat && selectedNodeIds.length <= 1 && !e.ctrlKey && !e.metaKey) {
                setIsZDown(true);
            }

            // Spacebar for Quick Add Menu
            // Only triggers if no nodes are selected (avoids conflict with Media Player play/pause)
            if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && selectedNodeIds.length === 0) {
                e.preventDefault();
                if (!e.repeat) {
                    handleOpenQuickAdd(clientPointerPositionRef.current);
                }
                return;
            }

            // Tab for Radial Menu
            if (e.code === 'Tab') {
                e.preventDefault();
                if (!isRadialMenuOpen) {
                    setRadialMenuPosition(clientPointerPositionRef.current);
                    setIsRadialMenuOpen(true);
                }
            }
            
            // Global Undo / Redo
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
                e.preventDefault();
                if (e.shiftKey) {
                    redoPosition(nodesRef.current);
                } else {
                    undoPosition(nodesRef.current);
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
                e.preventDefault();
                redoPosition(nodesRef.current);
                return;
            }

            // Alignment Shortcuts (Override standard keys when 2+ nodes selected)
            if (selectedNodeIds.length > 1) {
                // With Modifiers (Ctrl/Cmd)
                if (e.ctrlKey || e.metaKey) {
                    // Overrides standard Duplicate (D) behavior for multi-select
                    if (e.code === 'KeyD') { e.preventDefault(); handleAlignNodes(selectedNodeIds, 'distribute-horizontal'); return; }
                    // Overrides standard or other mappings for E
                    if (e.code === 'KeyE') { e.preventDefault(); handleAlignNodes(selectedNodeIds, 'distribute-vertical'); return; }
                } 
                // Single Keys (No Ctrl/Alt/Meta, Shift allowed if not conflicting)
                else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    switch(e.code) {
                        case 'KeyF': e.preventDefault(); handleAlignNodes(selectedNodeIds, 'left'); return;
                        case 'KeyT': e.preventDefault(); handleAlignNodes(selectedNodeIds, 'top'); return; // Overrides Text Input creation
                        case 'KeyB': e.preventDefault(); handleAlignNodes(selectedNodeIds, 'bottom'); return;
                        case 'KeyR': e.preventDefault(); handleAlignNodes(selectedNodeIds, 'right'); return;
                        case 'KeyE': e.preventDefault(); handleAlignNodes(selectedNodeIds, 'center-x'); return;
                        case 'KeyD': e.preventDefault(); handleAlignNodes(selectedNodeIds, 'center-y'); return; // Overrides Duplicate
                        case 'KeyZ': e.preventDefault(); undoPosition(nodesRef.current); return; // Undo Alignment
                    }
                }
            } else {
                // Single Selection or No Selection Logic
                
                // Add Node (F)
                if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                    e.preventDefault();
                    handleOpenQuickSearch(clientPointerPositionRef.current);
                    return;
                }
            }

            // Standard Alignment Shortcuts (Legacy or backup, keep for now if user reverts selection)
            // (Previous block handles 2+ selection logic authoritatively)

            // Save/Load
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); handleSaveCanvas(); return; }
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyO') { e.preventDefault(); handleLoadCanvas(); return; }

            // Copy/Paste
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyC') {
                // Check for text selection first
                const selection = window.getSelection();
                if (selection && selection.toString().length > 0) {
                    // Allow browser default copy behavior (do not preventDefault)
                    return;
                }

                if (selectedNodeIds.length > 0) {
                    e.preventDefault();
                    const lastSelectedNodeId = selectedNodeIds[selectedNodeIds.length - 1];
                    copyNodeValue(lastSelectedNodeId);
                    return;
                } else if (draggingInfoRef.current && draggingInfoRef.current.type === 'group') {
                    e.preventDefault();
                    copyGroup(draggingInfoRef.current.id);
                    return;
                } else if (draggingInfoRef.current && draggingInfoRef.current.type === 'node') {
                    const draggedNodeId = draggingInfoRef.current.id;
                    const parentGroup = groupsRef.current.find((g: any) => g.nodeIds.includes(draggedNodeId));
                    if (parentGroup) {
                        e.preventDefault();
                        copyGroup(parentGroup.id);
                        return;
                    }
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') { 
                e.preventDefault(); 
                handlePaste(e.shiftKey); 
            }

            // Select All
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyA') {
                e.preventDefault();
                setSelectedNodeIds(nodesRef.current.map(n => n.id));
                return;
            }

            // Deselect
            if (e.altKey && e.code === 'KeyA') { e.preventDefault(); deselectAllNodes(); return; }

            // Duplicate (Only if not caught by alignment 'D')
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && selectedNodeIds.length > 0) {
                // Caught by distribute horizontal if >1 selection above
                e.preventDefault();
                if (!e.repeat) {
                    const newIds = selectedNodeIds.map(id => handleDuplicateNodeWithContent(id)).filter((id): id is string => !!id);
                    if (newIds.length > 0) setSelectedNodeIds(newIds);
                }
                return;
            }
            if (e.code === 'KeyD' && !(e.ctrlKey || e.metaKey) && selectedNodeIds.length > 0) {
                 // Caught by align center-y if >1 selection above
                e.preventDefault();
                if (!e.repeat) {
                    const newIds = selectedNodeIds.map(id => handleDuplicateNode(id)).filter((id): id is string => !!id);
                    if (newIds.length > 0) setSelectedNodeIds(newIds);
                }
                return;
            }

            // Delete
            if ((e.code === 'Delete' || e.code === 'KeyX') && selectedNodeIds.length > 0) { 
                e.preventDefault(); 
                if (e.shiftKey || isInstantCloseEnabled) {
                     selectedNodeIds.forEach(id => deleteNodeAndConnections(id));
                     setSelectedNodeIds([]);
                } else {
                     requestDeleteNodes(selectedNodeIds, clientPointerPositionRef.current);
                }
                return; 
            }

            // Collapse
            if (e.code === 'KeyH' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); if (!e.repeat) selectedNodeIds.forEach(handleToggleNodeCollapse); return; }

            // Group / Gemini Chat Logic for 'G'
            if (e.code === 'KeyG' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) { 
                e.preventDefault(); 
                if (!e.repeat) {
                    if (selectedNodeIds.length > 1) {
                        handleGroupSelection();
                    } else {
                        onAddNode(NodeType.GEMINI_CHAT, pointerPositionRef.current);
                        handleCloseAddNodeMenus();
                    }
                }
                return; 
            }
  
            // Quick Slots
            if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.code.startsWith('Digit') && !isConnectionQuickAddOpen) {
                const digit = parseInt(e.code.replace('Digit', ''));
                if (digit >= 1 && digit <= 8) {
                    const nodeType = quickSlots[digit - 1];
                    if (nodeType) {
                        e.preventDefault();
                        if (!e.repeat) onAddNode(nodeType, pointerPositionRef.current);
                        return;
                    }
                }
            }

            // Node Creation Shortcuts
            let nodeTypeToAdd: NodeType | null = null;
            const code = e.code;
            if (e.ctrlKey && e.shiftKey) {
              switch(code) {
                case 'KeyA': nodeTypeToAdd = NodeType.CHARACTER_ANALYZER; break;
                case 'KeyC': nodeTypeToAdd = NodeType.CHARACTER_CARD; break;
              }
            } else if (e.shiftKey) {
              switch (code) {
                case 'KeyA': nodeTypeToAdd = NodeType.IMAGE_ANALYZER; break;
                case 'KeyI': nodeTypeToAdd = NodeType.IMAGE_EDITOR; break;
                case 'KeyC': nodeTypeToAdd = NodeType.CHARACTER_GENERATOR; break;
                case 'KeyR': nodeTypeToAdd = NodeType.DATA_READER; break;
                case 'KeyV': nodeTypeToAdd = NodeType.SCRIPT_VIEWER; break;
                case 'KeyQ': nodeTypeToAdd = NodeType.IMAGE_SEQUENCE_GENERATOR; break;
                case 'KeyW': e.preventDefault(); if (!e.repeat) setIsSnapToGrid(prev => !prev); return;
                case 'KeyE': e.preventDefault(); if (!e.repeat) setLineStyle((prev: any) => prev === 'spaghetti' ? 'orthogonal' : 'spaghetti'); return;
                case 'KeyL': e.preventDefault(); if (!e.repeat) setIsSmartGuidesEnabled(prev => !prev); return;
                case 'KeyP': nodeTypeToAdd = NodeType.VIDEO_PROMPT_PROCESSOR; break;
                case 'KeyO': nodeTypeToAdd = NodeType.VIDEO_OUTPUT; break;
              }
            } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                switch (code) {
                    case 'KeyT': nodeTypeToAdd = NodeType.TEXT_INPUT; break; // Note: 'T' is overridden for alignment if multi-selected
                    case 'KeyI': nodeTypeToAdd = NodeType.IMAGE_INPUT; break;
                    case 'KeyA': nodeTypeToAdd = NodeType.PROMPT_ANALYZER; break;
                    case 'KeyP': nodeTypeToAdd = NodeType.PROMPT_PROCESSOR; break;
                    case 'KeyO': nodeTypeToAdd = NodeType.IMAGE_OUTPUT; break;
                    case 'KeyM': 
                        // Conflict Fix: If a Media Viewer node is selected, M adds a marker (handled locally).
                        // Do NOT create a new node in that case.
                        const isMediaViewerSelected = selectedNodeIds.length === 1 && 
                            nodesRef.current.find(n => n.id === selectedNodeIds[0])?.type === NodeType.MEDIA_VIEWER;
                        
                        if (!isMediaViewerSelected) {
                            nodeTypeToAdd = NodeType.MEDIA_VIEWER; 
                        }
                        break;
                    case 'KeyL': nodeTypeToAdd = NodeType.TRANSLATOR; break;
                    case 'KeyN': nodeTypeToAdd = NodeType.NOTE; break;
                    case 'KeyQ': nodeTypeToAdd = NodeType.PROMPT_SEQUENCE_EDITOR; break;
                    case 'KeyE': nodeTypeToAdd = NodeType.VIDEO_EDITOR; break;
                }
            }
            if (nodeTypeToAdd) {
              e.preventDefault();
              if (!e.repeat) {
                onAddNode(nodeTypeToAdd, pointerPositionRef.current);
                handleCloseAddNodeMenus();
              }
              return;
            }
            if (e.metaKey) return;
            
            // Tools
            if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
                switch (e.code) {
                    case 'KeyV': e.preventDefault(); setActiveTool('edit'); break;
                    case 'KeyC': e.preventDefault(); setActiveTool('cutter'); break;
                    case 'KeyS': e.preventDefault(); setActiveTool('selection'); break;
                    case 'KeyR': e.preventDefault(); setActiveTool('reroute'); break;
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftDown(false);
                setSelectionRect(null);
            }
            if (e.key === 'Control') setIsCtrlDown(false);
            if (e.key === 'Alt') setIsAltDown(false);
            if (e.code === 'KeyZ') setIsZDown(false);
            if (e.code === 'Tab') {
                if (isRadialMenuOpen) { 
                    if (radialMenuSelectedItem) {
                        onAddNode(radialMenuSelectedItem, getTransformedPoint(radialMenuPosition));
                    }
                    setIsRadialMenuOpen(false);
                    setRadialMenuSelectedItem(null);
                }
            }
        };

        const resetInteractionState = () => {
            setIsShiftDown(false); setIsCtrlDown(false); setIsAltDown(false); setIsZDown(false);
            setIsRadialMenuOpen(false); setRadialMenuSelectedItem(null); setSelectionRect(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', resetInteractionState);
        window.addEventListener('focus', resetInteractionState);
        document.addEventListener('visibilitychange', resetInteractionState);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', resetInteractionState);
            window.removeEventListener('focus', resetInteractionState);
            document.removeEventListener('visibilitychange', resetInteractionState);
        };
    }, [selectedNodeIds, nodesRef, draggingInfoRef, isTyping, handleSaveCanvas, handleLoadCanvas, copyNodeValue, copyGroup, handlePaste, handleToggleCatalog, handleOpenQuickSearch, handleOpenQuickAdd, deselectAllNodes, handleDuplicateNode, handleDuplicateNodeWithContent, deleteNodeAndConnections, requestDeleteNodes, handleGroupSelection, handleToggleNodeCollapse, onAddNode, pointerPositionRef, clientPointerPositionRef, handleCloseAddNodeMenus, setIsSnapToGrid, setLineStyle, setIsSmartGuidesEnabled, setActiveTool, setIsShiftDown, setIsCtrlDown, setIsAltDown, setIsZDown, setSelectionRect, isRadialMenuOpen, setIsRadialMenuOpen, setRadialMenuPosition, radialMenuSelectedItem, setRadialMenuSelectedItem, getTransformedPoint, radialMenuPosition, quickSlots, isConnectionQuickAddOpen, isInstantCloseEnabled, handleAlignNodes, undoPosition, redoPosition, handleValueChange]);
};
