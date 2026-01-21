
import React, { useCallback } from 'react';
import type { Node, Connection, Point, Group, ToastType, Alignment, DockMode } from '../types';
import { NodeType } from '../types';
import { getEmptyValueForNodeType, getOutputHandleType, getMinNodeSize, RATIO_INDICES } from '../utils/nodeUtils';
import { generateThumbnail } from '../utils/imageUtils';

// Constants for Character Card layout (matching CharacterCardNode logic)
export const CARD_NODE_WIDTH_STEP = 410;
export const CARD_NODE_BASE_WIDTH_OFFSET = 110;

interface UseEntityActionsProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    nodeIdCounter: React.MutableRefObject<number>;
    t: (key: string) => string;
    groups: Group[];
    setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
    clearImagesForNodeFromCache: (nodeId: string) => void;
    tabId: string;
    addToast: (message: string, type?: ToastType) => void;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    takeSnapshot?: (nodes: Node[]) => void;
}

export const useEntityActions = (props: UseEntityActionsProps) => {
    const { nodes, setNodes, connections, setConnections, nodeIdCounter, t, groups, setGroups, clearImagesForNodeFromCache, tabId, addToast, getFullSizeImage, setFullSizeImage, takeSnapshot } = props;

    const onAddNode = useCallback((type: NodeType, position: Point, title?: string, options: { centerNode?: boolean; alignToInput?: boolean; initialValue?: string } = { centerNode: true }): string => {
        nodeIdCounter.current++;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;

        const titles: Record<NodeType, string> = {
            [NodeType.TEXT_INPUT]: t('node.title.text_input'), [NodeType.IMAGE_INPUT]: t('node.title.image_input'),
            [NodeType.PROMPT_PROCESSOR]: t('node.title.prompt_processor'), [NodeType.VIDEO_PROMPT_PROCESSOR]: t('node.title.video_prompt_processor'),
            [NodeType.IMAGE_OUTPUT]: t('node.title.image_output'), [NodeType.VIDEO_OUTPUT]: t('node.title.video_output'),
            [NodeType.PROMPT_ANALYZER]: t('node.title.prompt_analyzer'), [NodeType.CHARACTER_ANALYZER]: t('node.title.character_analyzer'),
            [NodeType.CHARACTER_GENERATOR]: t('node.title.character_generator'), [NodeType.CHARACTER_CARD]: t('node.title.character_card'),
            [NodeType.IMAGE_ANALYZER]: t('node.title.image_analyzer'), [NodeType.IMAGE_EDITOR]: t('node.title.image_editor'),
            [NodeType.IMAGE_SEQUENCE_GENERATOR]: t('node.title.image_sequence_generator'), [NodeType.PROMPT_SEQUENCE_EDITOR]: t('node.title.prompt_sequence_editor'),
            [NodeType.GEMINI_CHAT]: t('node.title.gemini_chat'),
            [NodeType.TRANSLATOR]: t('node.title.translator'), [NodeType.SCRIPT_GENERATOR]: t('node.title.script_generator'),
            [NodeType.SCRIPT_VIEWER]: t('node.title.script_viewer'),
            [NodeType.NOTE]: t('node.title.note'), [NodeType.REROUTE_DOT]: t('node.title.reroute_dot'),
            [NodeType.PROMPT_SANITIZER]: t('node.title.prompt_sanitizer'),
            [NodeType.DATA_READER]: t('node.title.data_reader'),
            [NodeType.VIDEO_EDITOR]: t('node.title.video_editor'),
            [NodeType.MEDIA_VIEWER]: t('node.title.media_viewer'),
            [NodeType.DATA_PROTECTION]: t('node.title.data_protection'),
            [NodeType.POSE_CREATOR]: t('node.title.pose_creator'),
        };

        const newNode: Node = {
            id: newNodeId, type, position, title: title || titles[type] || 'New Node', value: '',
            width: 400, height: 300, isNewlyCreated: true
        };

        newNode.value = options.initialValue !== undefined ? options.initialValue : getEmptyValueForNodeType(newNode);

        switch (type) {
            case NodeType.IMAGE_EDITOR: newNode.width = 1000; newNode.height = 920; break;
            case NodeType.PROMPT_ANALYZER: newNode.width = 460; newNode.height = 1000; break;
            case NodeType.IMAGE_INPUT: newNode.width = 460; newNode.height = 340; break;
            case NodeType.IMAGE_ANALYZER: case NodeType.VIDEO_OUTPUT: newNode.width = 460; newNode.height = 680; break;
            case NodeType.PROMPT_PROCESSOR: newNode.width = 460; newNode.height = 410; break;
            case NodeType.VIDEO_PROMPT_PROCESSOR: newNode.width = 460; newNode.height = 410; break;
            case NodeType.IMAGE_OUTPUT:
                newNode.width = 460;
                newNode.height = 700;
                newNode.model = 'gemini-2.5-flash-image';
                newNode.autoDownload = true;
                break;
            case NodeType.GEMINI_CHAT: case NodeType.TRANSLATOR: newNode.width = 400; newNode.height = 640; break;
            case NodeType.NOTE: newNode.width = 460; newNode.height = 660; break;
            case NodeType.CHARACTER_ANALYZER: newNode.width = 460; newNode.height = 500; break;
            case NodeType.CHARACTER_CARD:
                newNode.width = 520;
                newNode.height = 960;
                newNode.collapsedHandles = true; // Default to collapsed outputs
                break;
            case NodeType.SCRIPT_GENERATOR: newNode.width = 500; newNode.height = 1000; break;
            case NodeType.SCRIPT_VIEWER: newNode.width = 500; newNode.height = 600; break;
            case NodeType.IMAGE_SEQUENCE_GENERATOR: newNode.width = 1400; newNode.height = 920; newNode.aspectRatio = '16:9'; break;
            case NodeType.PROMPT_SEQUENCE_EDITOR: newNode.width = 1300; newNode.height = 920; break;
            case NodeType.REROUTE_DOT: newNode.width = 60; newNode.height = 40; break;
            case NodeType.PROMPT_SANITIZER: newNode.width = 460; newNode.height = 280; break;
            case NodeType.DATA_READER: newNode.width = 400; newNode.height = 500; break;
            case NodeType.CHARACTER_GENERATOR: newNode.width = 520; newNode.height = 960; break;
            case NodeType.TEXT_INPUT: newNode.width = 460; newNode.height = 300; break;
            case NodeType.MEDIA_VIEWER: newNode.width = 500; newNode.height = 340; break;
            case NodeType.DATA_PROTECTION: newNode.width = 800; newNode.height = 600; break;
            case NodeType.VIDEO_EDITOR: newNode.width = 920; newNode.height = 640; break;
            case NodeType.POSE_CREATOR: newNode.width = 600; newNode.height = 800; break;
            default: newNode.width = 460; newNode.height = 280;
        }

        if (options.alignToInput) {
            newNode.position = { x: position.x, y: position.y - newNode.height / 2 };
        } else if (options.centerNode) {
            const HEADER_HEIGHT = 40;
            newNode.position = { x: position.x - newNode.width / 2, y: position.y - HEADER_HEIGHT / 2 };
        } else {
            newNode.position = position;
        }

        setNodes(nds => [...nds, newNode]);
        return newNodeId;
    }, [nodeIdCounter, setNodes, t]);

    const deleteNodeAndConnections = useCallback((nodeId: string) => {
        const nodeToDelete = nodes.find(n => n.id === nodeId);
        if (nodeToDelete && nodeToDelete.type === NodeType.REROUTE_DOT) {
            const incomingConn = connections.find(c => c.toNodeId === nodeId);
            const outgoingConns = connections.filter(c => c.fromNodeId === nodeId);
            if (incomingConn && outgoingConns.length > 0) {
                const newConnections = outgoingConns.map(outConn => ({ fromNodeId: incomingConn.fromNodeId, fromHandleId: incomingConn.fromHandleId, toNodeId: outConn.toNodeId, toHandleId: outConn.toHandleId, id: `conn-${Date.now()}-${Math.random()}` }));
                setConnections(conns => [...conns.filter(c => c.toNodeId !== nodeId && c.fromNodeId !== nodeId), ...newConnections]);
            }
        }
        setNodes(nds => nds.filter(n => n.id !== nodeId));
        setConnections(conns => conns.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
        setGroups(currentGroups => {
            return currentGroups
                .map(g => ({ ...g, nodeIds: g.nodeIds.filter(id => id !== nodeId) }))
                .filter(g => g.nodeIds.length > 0);
        });
        clearImagesForNodeFromCache(nodeId);
    }, [nodes, connections, setNodes, setConnections, setGroups, clearImagesForNodeFromCache, tabId]);

    const handleDockNode = useCallback((nodeId: string, mode: DockMode, capturePosition?: Point) => {
        setNodes(currentNodes => currentNodes.map(node => {
            if (node.id === nodeId) {
                const finalCanvasPosition = capturePosition || node.position;

                const original = node.dockState ? node.dockState.original : {
                    x: node.position.x,
                    y: node.position.y,
                    width: node.width,
                    height: node.height
                };

                const minSize = getMinNodeSize(node.type);
                const margin = 56;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                let newWidth = node.width;
                let newHeight = node.height;
                const doubleMargin = margin * 2;
                const quarterWidth = (windowWidth - doubleMargin) / 4;

                if (mode === 'left' || mode === 'right') {
                    newWidth = (windowWidth / 2) - (margin * 1.5);
                    newHeight = windowHeight - doubleMargin;
                } else if (mode === 'full') {
                    newWidth = windowWidth - doubleMargin;
                    newHeight = windowHeight - doubleMargin;
                } else if (['q1', 'q2', 'q3', 'q4'].includes(mode)) {
                    newWidth = quarterWidth;
                    newHeight = windowHeight - doubleMargin;
                } else {
                    newWidth = (windowWidth / 2) - (margin * 1.5);
                    newHeight = (windowHeight / 2) - (margin * 1.5);
                }

                newWidth = Math.max(newWidth, minSize.minWidth);
                newHeight = Math.max(newHeight, minSize.minHeight);

                return {
                    ...node,
                    isCollapsed: false,
                    position: finalCanvasPosition,
                    width: newWidth,
                    height: newHeight,
                    dockState: {
                        mode,
                        original
                    }
                };
            }
            return node;
        }));
    }, [setNodes]);

    const handleUndockNode = useCallback((nodeId: string) => {
        setNodes(currentNodes => {
            const node = currentNodes.find(n => n.id === nodeId);
            if (!node || !node.dockState) return currentNodes;

            const { original } = node.dockState;
            const minSize = getMinNodeSize(node.type);

            return currentNodes.map(n => {
                if (n.id === nodeId) {
                    return {
                        ...n,
                        dockState: undefined,
                        isPinned: false, // Ensure unpinned
                        position: { x: original.x, y: original.y }, // Restore to original position (before dock)
                        width: Math.max(minSize.minWidth, original.width),
                        height: Math.max(minSize.minHeight, original.height)
                    };
                }
                return n;
            });
        });

        setTimeout(() => {
            setNodes(nds => nds.map(n => {
                if (n.id === nodeId) {
                    return { ...n, width: n.width + 1, height: n.height + 1 };
                }
                return n;
            }));
            setTimeout(() => {
                setNodes(nds => nds.map(n => {
                    if (n.id === nodeId) {
                        return { ...n, width: n.width - 1, height: n.height - 1 };
                    }
                    return n;
                }));
            }, 50);
        }, 50);
    }, [setNodes]);

    const getPromptForNode = useCallback((nodeId: string): string => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return '';

        const upstreamValues = (connections: Connection[], allNodes: Node[]): string[] => {
            const inputConnections = connections.filter(c => c.toNodeId === nodeId);
            const parts: string[] = [];
            for (const conn of inputConnections) {
                const fromNode = allNodes.find(n => n.id === conn.fromNodeId);
                if (!fromNode) continue;
                let value = '';
                try {
                    const parsed = JSON.parse(fromNode.value || '{}');
                    if (fromNode.type === NodeType.PROMPT_ANALYZER && conn.fromHandleId) {
                        if (conn.fromHandleId.startsWith('character-')) {
                            const index = parseInt(conn.fromHandleId.split('-')[1], 10);
                            if (parsed.characters && Array.isArray(parsed.characters)) {
                                value = parsed.characters[index] || '';
                            }
                        } else {
                            value = parsed[conn.fromHandleId] || '';
                        }
                    } else if (fromNode.type === NodeType.IMAGE_INPUT && conn.fromHandleId === 'text') {
                        value = parsed.prompt || '';
                    } else if (fromNode.type === NodeType.IMAGE_ANALYZER) {
                        value = parsed.description || '';
                    } else {
                        value = fromNode.value;
                    }
                } catch {
                    value = fromNode.value;
                }
                parts.push(value);
            }
            return parts.filter(p => p && p.trim() !== '');
        };

        if (node.type === NodeType.IMAGE_EDITOR) {
            try { return JSON.parse(node.value).prompt || ''; } catch { return ''; }
        }
        if (node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.VIDEO_OUTPUT) {
            return upstreamValues(connections, nodes).join(', ');
        }
        return '';
    }, [nodes, connections]);

    const copyGroup = useCallback(async (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        const nodeIds = new Set(groupNodes.map(n => n.id));
        const internalConnections = connections.filter(c => nodeIds.has(c.fromNodeId) && nodeIds.has(c.toNodeId));

        const fullSizeImages: Record<string, Record<number, string>> = {};
        groupNodes.forEach(n => {
            for (let i = 0; i < 20; i++) {
                const img = getFullSizeImage(n.id, i);
                if (img) {
                    if (!fullSizeImages[n.id]) fullSizeImages[n.id] = {};
                    fullSizeImages[n.id][i] = img;
                }
            }
        });

        const data = {
            type: 'prompModifierGroup',
            name: group.title,
            nodes: groupNodes,
            connections: internalConnections,
            fullSizeImages
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            addToast(t('toast.copiedToClipboard'));
        } catch (e) {
            console.error("Failed to copy group to clipboard", e);
            addToast(t('toast.copyFailed') + " (Check console)", 'error');
        }
    }, [groups, nodes, connections, t, addToast, getFullSizeImage]);

    const duplicateGroup = useCallback((groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
        const nodeIds = new Set(groupNodes.map(n => n.id));
        const internalConnections = connections.filter(c => nodeIds.has(c.fromNodeId) && nodeIds.has(c.toNodeId));

        const idMap = new Map<string, string>();
        const timestamp = Date.now();
        const offset = { x: 50, y: 50 };

        const newNodes = groupNodes.map((node, index) => {
            nodeIdCounter.current++;
            const newId = `node-${nodeIdCounter.current}-${timestamp}-${index}`;
            idMap.set(node.id, newId);

            for (let i = 0; i < 20; i++) {
                const img = getFullSizeImage(node.id, i);
                if (img) setFullSizeImage(newId, i, img);
            }

            return {
                ...node,
                id: newId,
                position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
                isNewlyCreated: true
            };
        });

        const newGroupId = `group-${timestamp}-${Math.random().toString(36).substr(2, 5)}`;
        const newGroup: Group = {
            ...group,
            id: newGroupId,
            position: { x: group.position.x + offset.x, y: group.position.y + offset.y },
            nodeIds: newNodes.map(n => n.id),
            title: `${group.title}`
        };

        const newConnections = internalConnections.map((conn, index) => ({
            ...conn,
            id: `conn-${timestamp}-${index}`,
            fromNodeId: idMap.get(conn.fromNodeId)!,
            toNodeId: idMap.get(conn.toNodeId)!
        }));

        setNodes(prev => [...prev, ...newNodes]);
        setGroups(prev => [...prev, newGroup]);
        setConnections(prev => [...prev, ...newConnections]);

        addToast(t('toast.nodeDuplicated'));
    }, [groups, nodes, connections, nodeIdCounter, setNodes, setGroups, setConnections, t, addToast, getFullSizeImage, setFullSizeImage]);

    const pasteGroup = useCallback((clipboardData: any, position?: Point) => {
        const nodesSource = clipboardData.nodes || [];
        const connectionsSource = clipboardData.connections || [];
        const imagesSource = clipboardData.fullSizeImages || {};
        const groupName = clipboardData.name || (clipboardData.group ? clipboardData.group.title : "Imported Group");

        if (nodesSource.length === 0) return;

        const idMap = new Map<string, string>();
        const timestamp = Date.now();

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        nodesSource.forEach((n: Node) => {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + n.width);
            maxY = Math.max(maxY, n.position.y + n.height);
        });

        let offsetX = 50;
        let offsetY = 50;

        if (position) {
            offsetX = position.x - minX;
            offsetY = position.y - minY;
        } else {
            offsetX = 50 - minX;
            offsetY = 50 - minY;
        }

        const newNodes = nodesSource.map((node: Node, index: number) => {
            nodeIdCounter.current++;
            const newId = `node-${nodeIdCounter.current}-${timestamp}-${index}`;
            idMap.set(node.id, newId);

            if (imagesSource && imagesSource[node.id]) {
                Object.entries(imagesSource[node.id]).forEach(([frame, url]) => {
                    setFullSizeImage(newId, Number(frame), url as string);
                });
            }

            return {
                ...node,
                id: newId,
                position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
                isNewlyCreated: true
            };
        });

        const newGroupId = `group-${timestamp}-${Math.random().toString(36).substr(2, 5)}`;
        const padding = 30;
        const paddingTop = 70;

        const groupWidth = maxX - minX + padding * 2;
        const groupHeight = (maxY - minY) + paddingTop + padding;
        const groupX = (minX + offsetX) - padding;
        const groupY = (minY + offsetY) - paddingTop;

        const newGroup: Group = {
            id: newGroupId,
            title: groupName,
            position: { x: groupX, y: groupY },
            width: groupWidth,
            height: groupHeight,
            nodeIds: newNodes.map((n: any) => n.id),
        };

        const newConnections = connectionsSource.map((conn: Connection, index: number) => ({
            ...conn,
            id: `conn-${timestamp}-${index}`,
            fromNodeId: idMap.get(conn.fromNodeId)!,
            toNodeId: idMap.get(conn.toNodeId)!
        }));

        setNodes(prev => [...prev, ...newNodes]);
        setGroups(prev => [...prev, newGroup]);
        setConnections(prev => [...prev, ...newConnections]);

        addToast(t('toast.pastedFromClipboard'));
    }, [nodeIdCounter, setNodes, setGroups, setConnections, setFullSizeImage, t, addToast]);

    const handleAlignNodes = useCallback((selectedNodeIds: string[], type: Alignment) => {
        if (selectedNodeIds.length < 2) return;
        if ((type === 'distribute-horizontal' || type === 'distribute-vertical') && selectedNodeIds.length < 3) return;

        if (takeSnapshot) takeSnapshot(nodes);

        setNodes(currentNodes => {
            const selected = currentNodes.filter(n => selectedNodeIds.includes(n.id));
            if (selected.length < 2) return currentNodes;

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            selected.forEach(n => {
                minX = Math.min(minX, n.position.x);
                maxX = Math.max(maxX, n.position.x + n.width);
                minY = Math.min(minY, n.position.y);
                maxY = Math.max(maxY, n.position.y + n.height);
            });

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            if (type === 'distribute-horizontal') {
                selected.sort((a, b) => a.position.x - b.position.x);
                const firstNode = selected[0];
                const lastNode = selected[selected.length - 1];
                const startX = firstNode.position.x;
                const endX = lastNode.position.x + lastNode.width;
                const totalSpan = endX - startX;
                const totalNodeWidth = selected.reduce((sum, n) => sum + n.width, 0);
                const totalGapSpace = totalSpan - totalNodeWidth;
                const gap = totalGapSpace / (selected.length - 1);
                let currentX = startX;
                const newPositions = new Map<string, number>();
                newPositions.set(firstNode.id, currentX);
                currentX += firstNode.width + gap;
                for (let i = 1; i < selected.length - 1; i++) {
                    const node = selected[i];
                    newPositions.set(node.id, currentX);
                    currentX += node.width + gap;
                }
                newPositions.set(lastNode.id, lastNode.position.x);
                return currentNodes.map(n => {
                    if (newPositions.has(n.id)) {
                        return { ...n, position: { x: newPositions.get(n.id)! | 0, y: n.position.y } };
                    }
                    return n;
                });
            }

            if (type === 'distribute-vertical') {
                selected.sort((a, b) => a.position.y - b.position.y);
                const firstNode = selected[0];
                const lastNode = selected[selected.length - 1];
                const startY = firstNode.position.y;
                const endY = lastNode.position.y + lastNode.height;
                const totalSpan = endY - startY;
                const totalNodeHeight = selected.reduce((sum, n) => sum + n.height, 0);
                const totalGapSpace = totalSpan - totalNodeHeight;
                const gap = totalGapSpace / (selected.length - 1);
                let currentY = startY;
                const newPositions = new Map<string, number>();
                newPositions.set(firstNode.id, currentY);
                currentY += firstNode.height + gap;
                for (let i = 1; i < selected.length - 1; i++) {
                    const node = selected[i];
                    newPositions.set(node.id, currentY);
                    currentY += node.width + gap;
                }
                newPositions.set(lastNode.id, lastNode.position.y);
                return currentNodes.map(n => {
                    if (newPositions.has(n.id)) {
                        return { ...n, position: { x: n.position.x, y: newPositions.get(n.id)! | 0 } };
                    }
                    return n;
                });
            }

            return currentNodes.map(n => {
                if (!selectedNodeIds.includes(n.id)) return n;
                let newX = n.position.x;
                let newY = n.position.y;
                switch (type) {
                    case 'left': newX = minX; break;
                    case 'center-x': newX = centerX - (n.width / 2); break;
                    case 'right': newX = maxX - n.width; break;
                    case 'top': newY = minY; break;
                    case 'center-y': newY = centerY - (n.height / 2); break;
                    case 'bottom': newY = maxY - n.height; break;
                }
                return { ...n, position: { x: newX | 0, y: newY | 0 } };
            });
        });
    }, [setNodes, takeSnapshot, nodes]);

    const getTimestamp = () => new Date().toISOString().replace(/:/g, '-').replace('T', '_').split('.')[0];

    const handleDownloadImage = useCallback((nodeId: string, onDownloadImageFromUrl: any) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        let imageUrl: string | undefined;
        let prompt = '';

        try {
            const parsed = JSON.parse(node.value || '{}');

            if (node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.VIDEO_OUTPUT) {
                imageUrl = getFullSizeImage(nodeId, 0) || node.value;
                prompt = getPromptForNode(nodeId);
            } else if (node.type === NodeType.IMAGE_INPUT) {
                imageUrl = getFullSizeImage(nodeId, 0) || parsed.image;
                prompt = parsed.prompt || '';
            } else if (node.type === NodeType.IMAGE_EDITOR) {
                imageUrl = getFullSizeImage(nodeId, 0) || parsed.outputImage;
                prompt = parsed.prompt || '';
            } else if (node.type === NodeType.GEMINI_CHAT) {
                // EXPORT CHAT HISTORY
                const dataToSave = {
                    type: 'gemini-chat-history',
                    messages: parsed.messages || [],
                    currentInput: parsed.currentInput || '',
                    style: parsed.style || 'general',
                    attachment: parsed.attachment || null
                };

                const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const timestamp = getTimestamp();
                a.download = `Gemini_Chat_History_${timestamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                addToast(t('toast.scriptSaved'));
                return;
            }
        } catch (e) { }

        if (imageUrl) {
            onDownloadImageFromUrl(imageUrl, 0, prompt);
        }
    }, [nodes, getFullSizeImage, getPromptForNode, addToast, t]);

    return {
        onAddNode,
        deleteNodeAndConnections,
        getPromptForNode,
        copyGroup,
        duplicateGroup,
        pasteGroup,
        handleAlignNodes,
        handleDockNode,
        handleUndockNode,
        handleDownloadImage // Exposed here
    };
};