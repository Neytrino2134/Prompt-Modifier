import { useCallback, useRef } from 'react';
import { NodeType } from '../../types';
import { addMetadataToPNG } from '../../utils/pngMetadata';
import { getConnectionPoints, getOutputHandleType, getMinNodeSize } from '../../utils/nodeUtils';

interface UseMediaAndImageActionsParams {
    nodes: any[];
    setNodes: (nodes: any[] | ((prev: any[]) => any[])) => void;
    connections: any[];
    setConnections: React.Dispatch<React.SetStateAction<any[]>>;
    viewTransform: { scale: number; translate: { x: number; y: number } };
    setViewTransform: React.Dispatch<React.SetStateAction<{ scale: number; translate: { x: number; y: number } }>>;
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: any[], optimizedForUI?: boolean) => any[];
    handleValueChange: (nodeId: string, value: string) => void;
    onAddNode: (type: NodeType, position: { x: number; y: number }, title?: string, options?: any) => string;
    setSelectedNodeIds: (ids: string[]) => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    t: (key: string) => string;
}

export const useMediaAndImageActions = ({
    nodes,
    connections,
    setConnections,
    viewTransform,
    setViewTransform,
    getUpstreamNodeValues,
    handleValueChange,
    onAddNode,
    setSelectedNodeIds,
    addToast,
    t
}: UseMediaAndImageActionsParams) => {
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;
    const viewTransformRef = useRef(viewTransform);
    viewTransformRef.current = viewTransform;

    const onDownloadImageFromUrl = useCallback((imageUrl: string, frameNumber: number, prompt: string, filenameOverride?: string) => {
        let assetUrl = imageUrl;
        if (imageUrl.startsWith('data:image/png')) {
            assetUrl = addMetadataToPNG(imageUrl, 'prompt', prompt);
        }
        const link = document.createElement('a');
        link.href = assetUrl;

        if (filenameOverride) {
            link.download = filenameOverride;
        } else {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
            const padded = String(frameNumber).padStart(3, '0');
            link.download = `Image_${padded}_${date}_${time}.png`;
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const onCopyImageToClipboard = useCallback(async (imageUrl: string): Promise<void> => {
        try {
            if (imageUrl && imageUrl.startsWith('data:image')) {
                const response = await fetch(imageUrl);
                let blob = await response.blob();

                // Convert to PNG if not already PNG
                if (blob.type !== 'image/png') {
                    try {
                        const imageBitmap = await createImageBitmap(blob);
                        const canvas = document.createElement('canvas');
                        canvas.width = imageBitmap.width;
                        canvas.height = imageBitmap.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(imageBitmap, 0, 0);
                            const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
                            if (pngBlob) blob = pngBlob;
                        }
                    } catch (e) {
                        console.error('Failed to convert image to PNG:', e);
                    }
                }

                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                addToast(t('toast.copiedToClipboard'));
            } else {
                addToast(t('toast.pasteFailed'), 'error');
            }
        } catch (err) {
            console.error('Failed to copy image to clipboard:', err);
            addToast(t('toast.pasteFailed'), 'error');
        }
    }, [addToast, t]);

    const onReadData = useCallback((nodeId: string) => {
        const currentNodes = nodesRef.current;
        const node = currentNodes.find(n => n.id === nodeId);
        if (!node) return;

        const values = getUpstreamNodeValues(nodeId, undefined, currentNodes, false);

        let text = '';
        let image: string | null = null;
        const images: string[] = [];
        let mediaUrl: string | null = null;
        let mediaType: 'video' | 'audio' = 'video';

        values.forEach(val => {
            if (typeof val === 'string') {
                if (val.startsWith('data:image')) {
                    if (!image) image = val;
                    images.push(val);
                } else if (val.startsWith('data:video') || val.startsWith('data:audio') || val.match(/^https?:\/\/.*\.(mp4|webm|ogg|mp3|wav)$/i)) {
                    if (!mediaUrl) {
                        mediaUrl = val;
                        mediaType = val.startsWith('data:audio') || val.match(/\.(mp3|wav)$/i) ? 'audio' : 'video';
                    }
                } else {
                    if (text) text += (text ? '\n\n' : '') + val;
                    else text = val;
                }
            } else if (typeof val === 'object' && val !== null) {
                if (val.base64ImageData) {
                    const dataUrl = `data:${val.mimeType || 'image/png'};base64,${val.base64ImageData}`;
                    if (!image) image = dataUrl;
                    images.push(dataUrl);
                } else {
                    const str = JSON.stringify(val, null, 2);
                    if (text) text += (text ? '\n\n' : '') + str;
                    else text = str;
                }
            }
        });

        try {
            const current = JSON.parse(node.value || '{}');
            const newData = { text, image, images, mediaUrl, mediaType };

            if (JSON.stringify(current) !== JSON.stringify(newData)) {
                handleValueChange(nodeId, JSON.stringify(newData));
            }
        } catch {
            handleValueChange(nodeId, JSON.stringify({ text, image, images, mediaUrl, mediaType }));
        }

    }, [getUpstreamNodeValues, handleValueChange]);

    const handleSplitConnection = useCallback((connectionId: string) => {
        const connection = connections.find(c => c.id === connectionId);
        if (!connection) return;

        const fromNode = nodes.find(n => n.id === connection.fromNodeId);
        const toNode = nodes.find(n => n.id === connection.toNodeId);
        if (!fromNode || !toNode) return;

        const { start, end } = getConnectionPoints(fromNode, toNode, connection);

        const { minWidth, minHeight } = getMinNodeSize(NodeType.REROUTE_DOT);
        const midPoint = {
            x: (start.x + end.x) / 2 - (minWidth / 2),
            y: (start.y + end.y) / 2 - (minHeight / 2)
        };

        const fromType = getOutputHandleType(fromNode, connection.fromHandleId);
        const newNodeId = onAddNode(NodeType.REROUTE_DOT, midPoint);
        const newValue = JSON.stringify({ type: fromType, direction: 'LR' });
        handleValueChange(newNodeId, newValue);

        setConnections(prev => {
            const filtered = prev.filter(c => c.id !== connectionId);

            const conn1 = {
                id: `conn-split-1-${Date.now()}`,
                fromNodeId: connection.fromNodeId,
                fromHandleId: connection.fromHandleId,
                toNodeId: newNodeId,
                toHandleId: undefined
            };

            const conn2 = {
                id: `conn-split-2-${Date.now()}`,
                fromNodeId: newNodeId,
                fromHandleId: undefined,
                toNodeId: connection.toNodeId,
                toHandleId: connection.toHandleId
            };

            return [...filtered, conn1, conn2];
        });

    }, [connections, nodes, onAddNode, handleValueChange, setConnections]);

    const handleNavigateToNodeFrame = useCallback((nodeId: string, frameNumber: number) => {
        const targetNode = nodesRef.current.find(n => n.id === nodeId);
        if (!targetNode) return;

        setSelectedNodeIds([nodeId]);

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        const targetX = targetNode.position.x + (targetNode.width / 2);
        const targetY = targetNode.position.y + 300;

        const scale = viewTransformRef.current.scale;

        const newTx = (screenW / 2) - (targetX * scale);
        const newTy = (screenH / 2) - (targetY * scale);

        setViewTransform(prev => ({
            scale: prev.scale,
            translate: { x: newTx, y: newTy }
        }));

        try {
            const currentVal = JSON.parse(targetNode.value || '{}');
            if (currentVal.selectedFrameNumber !== frameNumber) {
                handleValueChange(nodeId, JSON.stringify({ ...currentVal, selectedFrameNumber: frameNumber }));
            }
        } catch (e) {
            console.error("Failed to update node selection frame", e);
        }

    }, [setSelectedNodeIds, setViewTransform, handleValueChange]);

    return {
        onDownloadImageFromUrl,
        onCopyImageToClipboard,
        onReadData,
        handleSplitConnection,
        handleNavigateToNodeFrame
    };
};
