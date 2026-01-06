
import { useMemo, useRef, useCallback } from 'react';
import type { Node, Connection, Point } from '../types';
import { NodeType } from '../types';
import { getOutputHandleType, RATIO_INDICES, HEADER_HEIGHT, CONTENT_PADDING, COLLAPSED_NODE_HEIGHT, getMinNodeSize, getConnectionPoints } from '../utils/nodeUtils';

interface UseDerivedMemoProps {
    connections: Connection[];
    nodes: Node[];
    selectedNodeIds: string[];
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
}

// Helper to extract specific section from character fullDescription
const extractMarkdownSection = (text: string, targetSection: 'Appearance' | 'Personality' | 'Clothing'): string => {
    if (!text) return '';

    // Mapping of localized headers to internal keys
    const sectionMap: Record<string, 'Appearance' | 'Personality' | 'Clothing'> = {
        'appearance': 'Appearance', 'внешность': 'Appearance', 'apariencia': 'Appearance',
        'personality': 'Personality', 'личность': 'Personality', 'характер': 'Personality', 'personalidad': 'Personality',
        'clothing': 'Clothing', 'одежда': 'Clothing', 'ropa': 'Clothing'
    };

    // Regex to find all #### Headers and their content
    const sectionRegex = /####\s*([^\n]+)\s*([\s\S]*?)(?=####|$)/gi;
    let match;
    
    while ((match = sectionRegex.exec(text)) !== null) {
        const header = match[1].trim().toLowerCase();
        const content = match[2].trim();
        const detectedKey = sectionMap[header];
        
        if (detectedKey === targetSection) {
            return content;
        }
    }

    return '';
};

// Simple string hash function for detecting content changes
const generateSignature = (val: string) => {
    if (!val) return '0';
    let hash = 0;
    // To be efficient with large base64 strings, we sample: start + length + end
    // But for character cards JSON which isn't huge (images are thumbnails), full string or dense sample is okay.
    // Let's use length + simple sampling to catch "isOutput" flag swaps that don't change length.
    const len = val.length;
    // Sample first 500 and last 500 chars to catch property changes at ends of JSON
    const sample = len > 1000 ? val.substring(0, 500) + val.substring(len - 500) : val;
    
    for (let i = 0; i < sample.length; i++) {
        const char = sample.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `${len}-${hash}`;
};

export const useDerivedMemo = (props: UseDerivedMemoProps) => {
    const { connections, nodes, getFullSizeImage } = props;

    // Cache refs to avoid re-parsing JSON during layout updates (drags)
    const characterDataCache = useRef<{ signature: string, data: Map<string, any[]> }>({ signature: '', data: new Map() });
    const imageSourcesCache = useRef<{ signature: string, data: Map<string, (string | null)[]> }>({ signature: '', data: new Map() });

    const connectedInputs = useMemo(() => {
        const map = new Map<string, Set<string | undefined>>();
        connections.forEach(conn => {
            if (!map.has(conn.toNodeId)) map.set(conn.toNodeId, new Set());
            map.get(conn.toNodeId)!.add(conn.toHandleId);
        });
        return map;
    }, [connections]);
    
    const connectedInputTypes = useMemo(() => {
        const map = new Map<string, string>();
        connections.forEach(conn => {
            const toNode = nodes.find(n => n.id === conn.toNodeId);
            if (toNode && (toNode.type === NodeType.DATA_READER || toNode.type === NodeType.REROUTE_DOT)) {
                 const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                 if (fromNode) {
                     const type = getOutputHandleType(fromNode, conn.fromHandleId);
                     if (type) map.set(conn.toNodeId, type);
                 }
            }
        });
        return map;
    }, [connections, nodes]);

    const findImageDataSource = useCallback((fromNodeId: string, fromHandleId: string | undefined, visited: Set<string>, optimizedForUI: boolean): string | null => {
        if (visited.has(fromNodeId)) return null;
        visited.add(fromNodeId);

        const node = nodes.find(n => n.id === fromNodeId);
        if (!node) return null;

        const outputType = getOutputHandleType(node, fromHandleId);
        if (outputType !== 'image' && node.type !== NodeType.REROUTE_DOT) return null;

        if (node.type === NodeType.IMAGE_ANALYZER || node.type === NodeType.REROUTE_DOT) {
            const inputConn = connections.find(c => c.toNodeId === fromNodeId);
            if (inputConn) return findImageDataSource(inputConn.fromNodeId, inputConn.fromHandleId, visited, optimizedForUI);
        }

        try {
            const parsed = JSON.parse(node.value || '{}');
            switch (node.type) {
                case NodeType.IMAGE_INPUT: return (optimizedForUI && parsed.image) ? parsed.image : (getFullSizeImage(node.id, 0) || parsed.image || null);
                case NodeType.POSE_CREATOR: return parsed.renderedImage || null;
                case NodeType.IMAGE_ANALYZER:
                case NodeType.CHARACTER_CARD:
                     if (node.type === NodeType.CHARACTER_CARD && fromHandleId !== 'image') break;
                     
                     const charArr = Array.isArray(parsed) ? parsed : [parsed];
                     // Only consider active characters for direct image output, or just the primary one
                     // Usually image output from card is primary.
                     const outputChar = charArr.find((c: any) => c.isOutput) || charArr[0];
                     
                     // If primary is inactive, do we return null? 
                     // The requirement specifically mentioned "All character data" output point.
                     // For 'image' output, it's safer to respect it too if it's the primary one.
                     if (outputChar && outputChar.isActive === false) return null;

                     const charIdx = charArr.indexOf(outputChar);
                     const ratioIdx = RATIO_INDICES[outputChar.selectedRatio] || 1;
                     const cachedFull = getFullSizeImage(node.id, (charIdx * 10) + ratioIdx);
                     if (cachedFull && !optimizedForUI) return cachedFull;
                     return outputChar?.image || outputChar?.thumbnails?.[outputChar.selectedRatio] || null;

                case NodeType.IMAGE_OUTPUT: return getFullSizeImage(node.id, 0) || (node.value.startsWith('data:') ? node.value : null);
                case NodeType.IMAGE_EDITOR: return optimizedForUI ? parsed.outputImage : (getFullSizeImage(node.id, 0) || parsed.outputImage || null);
            }
        } catch {
            if (node.type === NodeType.IMAGE_INPUT && node.value.startsWith('data:image')) return node.value;
        }
        return null;
    }, [nodes, connections, getFullSizeImage]);
  
    const connectedImageSources = useMemo(() => {
        const relevantConnections = connections.filter(conn => {
            const toNode = nodes.find(n => n.id === conn.toNodeId);
            if (!toNode) return false;
            return (toNode.type === NodeType.IMAGE_EDITOR && conn.toHandleId === 'image') || toNode.type === NodeType.IMAGE_ANALYZER;
        });

        const signatureParts = relevantConnections.map(c => {
             const fromNode = nodes.find(n => n.id === c.fromNodeId);
             return `${c.id}:${fromNode?.id}:${generateSignature(fromNode?.value || '')}`;
        });
        const currentSignature = signatureParts.join('|');

        if (currentSignature === imageSourcesCache.current.signature) {
            return imageSourcesCache.current.data;
        }

        const map = new Map<string, (string | null)[]>();
        relevantConnections.forEach(conn => {
            if (!map.has(conn.toNodeId)) map.set(conn.toNodeId, []);
            map.get(conn.toNodeId)!.push(findImageDataSource(conn.fromNodeId, conn.fromHandleId, new Set(), false));
        });

        imageSourcesCache.current = { signature: currentSignature, data: map };
        return map;
    }, [connections, nodes, findImageDataSource]);

    const connectedCharacterData = useMemo(() => {
        const targets = nodes.filter(n => n.type === NodeType.IMAGE_SEQUENCE_GENERATOR);
        
        const relevantConnections = connections.filter(c => targets.some(t => t.id === c.toNodeId) && c.toHandleId === 'character_data');
        
        const signatureParts = relevantConnections.map(c => {
            const fromNode = nodes.find(n => n.id === c.fromNodeId);
            return `${c.id}:${fromNode?.id}:${generateSignature(fromNode?.value || '')}`; 
        });
        const currentSignature = signatureParts.join('|');

        if (currentSignature === characterDataCache.current.signature) {
            return characterDataCache.current.data;
        }

        const findUpstreamSources = (nodeId: string, handleId: string | undefined, visited = new Set<string>()): { node: Node, handleId?: string, connectionId: string }[] => {
            if (visited.has(nodeId)) return [];
            visited.add(nodeId);
            const inputConns = connections.filter(c => c.toNodeId === nodeId && (handleId === undefined || c.toHandleId === handleId));
            const results: { node: Node, handleId?: string, connectionId: string }[] = [];
            for (const conn of inputConns) {
                const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                if (!fromNode) continue;
                if (fromNode.type === NodeType.REROUTE_DOT) {
                     results.push(...findUpstreamSources(fromNode.id, undefined, visited));
                }
                else if (getOutputHandleType(fromNode, conn.fromHandleId) === 'character_data') {
                    results.push({ node: fromNode, handleId: conn.fromHandleId, connectionId: conn.id });
                }
            }
            return results;
        };

        const map = new Map<string, any[]>();
        targets.forEach(toNode => {
            const sources = findUpstreamSources(toNode.id, 'character_data');
            
            if (sources.length > 0) {
                const nodeData: any[] = [];
                const processedSignatures = new Set<string>();

                sources.forEach(source => {
                    const fromNode = source.node;
                    const signature = `${fromNode.id}:${source.handleId || 'default'}`;
                    
                    if (processedSignatures.has(signature)) return;
                    processedSignatures.add(signature);

                    try {
                        const parsedValue = JSON.parse(fromNode.value);
                        if (fromNode.type === NodeType.CHARACTER_GENERATOR) {
                            const match = source.handleId?.match(/character-(\d+)/);
                            const index = match ? parseInt(match[1], 10) : -1;
                            if (index >= 0 && parsedValue.characters?.[index]) {
                                const charData = parsedValue.characters[index];
                                nodeData.push({ name: charData.name, alias: charData.index || charData.alias, prompt: charData.prompt, fullDescription: charData.fullDescription, image: charData.imageBase64 ? `data:image/png;base64,${charData.imageBase64}` : null, _sourceNodeId: fromNode.id, _connectionId: source.connectionId });
                            }
                        } else if (fromNode.type === NodeType.CHARACTER_CARD) {
                            const characters = Array.isArray(parsedValue) ? parsedValue : [parsedValue];
                            const hId = source.handleId;
                            
                            let charsToProcess: { data: any, originalIndex: number }[] = [];

                            if (hId === 'all_data') {
                                // Filter out inactive (muted) characters
                                charsToProcess = characters
                                    .map((c, idx) => ({ data: c, originalIndex: idx }))
                                    .filter(item => item.data.isActive !== false);
                            } else if (hId === 'primary_data') {
                                const primaryChar = characters.find((c: any) => c.isOutput) || characters[0];
                                // Primary data output respects mute status too
                                if (primaryChar && primaryChar.isActive !== false) {
                                    const idx = characters.indexOf(primaryChar);
                                    charsToProcess = [{ data: primaryChar, originalIndex: idx }];
                                }
                            } else if (hId && hId.startsWith('char_')) {
                                const idx = parseInt(hId.split('_')[1]);
                                if (characters[idx] && characters[idx].isActive !== false) {
                                    charsToProcess = [{ data: characters[idx], originalIndex: idx }];
                                }
                            } else {
                                // Default to all active
                                charsToProcess = characters
                                    .map((c, idx) => ({ data: c, originalIndex: idx }))
                                    .filter(item => item.data.isActive !== false);
                            }

                            charsToProcess.forEach(({ data, originalIndex }) => {
                                if (!data) return;
                                const sources = data.thumbnails ? { ...(data.thumbnails as object) } : (data.imageSources || {});
                                Object.entries(RATIO_INDICES).forEach(([ratio, index]) => { 
                                    const cached = getFullSizeImage(fromNode.id, (originalIndex * 10) + index); 
                                    if (cached) (sources as any)[ratio] = cached; 
                                });
                                nodeData.push({ 
                                    ...data, 
                                    alias: data.index || data.alias, 
                                    imageSources: sources, 
                                    nodeTitle: fromNode.title, 
                                    _sourceNodeId: fromNode.id, 
                                    _connectionId: source.connectionId, 
                                    _fullResImage: getFullSizeImage(fromNode.id, originalIndex * 10) 
                                });
                            });
                        }
                    } catch {}
                });
                if (nodeData.length > 0) map.set(toNode.id, nodeData);
            }
        });

        characterDataCache.current = { signature: currentSignature, data: map };
        return map;
    }, [connections, nodes, getFullSizeImage]);

    const getUpstreamNodeValues = useCallback((nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI: boolean = false) => {
        const activeNodes = currentNodes || nodes;
        const inputConnections = connections.filter(c => c.toNodeId === nodeId && (handleId === undefined || c.toHandleId === handleId));
        
        const values: (string | any)[] = [];
        
        for (const conn of inputConnections) {
            const fromNode = activeNodes.find(n => n.id === conn.fromNodeId);
            if (!fromNode) continue;

            if (fromNode.type === NodeType.REROUTE_DOT) {
                values.push(...getUpstreamNodeValues(fromNode.id, undefined, activeNodes, optimizedForUI));
                continue;
            }

            const outputType = getOutputHandleType(fromNode, conn.fromHandleId);

            if (outputType === 'character_data') {
                try {
                    const parsed = JSON.parse(fromNode.value || '{}');
                    if (fromNode.type === NodeType.CHARACTER_GENERATOR && conn.fromHandleId?.startsWith('character-')) {
                         const idx = parseInt(conn.fromHandleId.split('-')[1]);
                         if (parsed.characters && parsed.characters[idx]) {
                             values.push(parsed.characters[idx]);
                         }
                    } else if (fromNode.type === NodeType.CHARACTER_CARD) {
                        // Handle filtering for generic character_data read (e.g. Data Reader)
                        const chars = Array.isArray(parsed) ? parsed : [parsed];
                        // Filter inactive if reading via all_data
                        if (conn.fromHandleId === 'all_data') {
                             values.push(chars.filter((c: any) => c.isActive !== false));
                        } else {
                             values.push(parsed);
                        }
                    } else {
                         values.push(parsed);
                    }
                } catch {
                    values.push(fromNode.value);
                }
            } else if (outputType === 'text') {
                try {
                    const parsed = JSON.parse(fromNode.value || '{}');
                    if (fromNode.type === NodeType.PROMPT_ANALYZER && conn.fromHandleId) {
                        if (conn.fromHandleId.startsWith('character-')) {
                            const index = parseInt(conn.fromHandleId.split('-')[1], 10);
                            values.push(parsed.characters?.[index] || '');
                        } else {
                            values.push(parsed[conn.fromHandleId] || '');
                        }
                    } else if (fromNode.type === NodeType.IMAGE_INPUT && conn.fromHandleId === 'text') {
                        values.push(parsed.prompt || '');
                    } else if (fromNode.type === NodeType.IMAGE_ANALYZER && conn.fromHandleId === 'text') {
                        values.push(parsed.description || '');
                    } else if (fromNode.type === NodeType.CHARACTER_CARD) {
                        const charArr = Array.isArray(parsed) ? parsed : [parsed];
                        const char = charArr.find((c:any) => c.isOutput) || charArr[0];
                        
                        // Respect Inactive State even for text properties if it's the primary character
                        if (char && char.isActive === false) {
                            // Skip or push empty string? Usually skip value for upstream processing
                        } else {
                            const fullDesc = char?.fullDescription || '';

                            if (conn.fromHandleId === 'prompt') {
                                values.push(char?.prompt || '');
                            } else if (conn.fromHandleId === 'appearance') {
                                values.push(extractMarkdownSection(fullDesc, 'Appearance'));
                            } else if (conn.fromHandleId === 'personality') {
                                values.push(extractMarkdownSection(fullDesc, 'Personality'));
                            } else if (conn.fromHandleId === 'clothing') {
                                values.push(extractMarkdownSection(fullDesc, 'Clothing'));
                            } else {
                                values.push(fromNode.value);
                            }
                        }
                    } else {
                        values.push(fromNode.value);
                    }
                } catch {
                    values.push(fromNode.value);
                }
            } else if (outputType === 'image') {
                if (fromNode.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
                    try {
                        const parsed = JSON.parse(fromNode.value);
                        const checked = parsed.checkedFrameNumbers || [];
                        const imgs = parsed.images || {};
                        checked.forEach((frameNum: number) => {
                             const url = getFullSizeImage(fromNode.id, 1000 + frameNum) || imgs[frameNum];
                             if (url && url.startsWith('data:')) {
                                 const parts = url.split(',');
                                 const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                 values.push({ base64ImageData: parts[1], mimeType: mime });
                             }
                        });
                        if (checked.length > 0) continue; 
                    } catch {}
                }

                const url = findImageDataSource(conn.fromNodeId, conn.fromHandleId, new Set(), optimizedForUI);
                if (url && url.startsWith('data:')) {
                    const parts = url.split(',');
                    const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                    values.push({ base64ImageData: parts[1], mimeType: mime });
                }
            } else if (fromNode.type === NodeType.MEDIA_VIEWER) {
                 try {
                     const parsed = JSON.parse(fromNode.value || '{}');
                     if (parsed.src) values.push(parsed.src);
                 } catch {
                     values.push(fromNode.value);
                 }
            } else {
                values.push(fromNode.value);
            }
        }
        return values;
    }, [nodes, connections, findImageDataSource, getFullSizeImage]);

    return { connectedInputs, connectedImageSources, connectedCharacterData, connectedInputTypes, getConnectionPoints, getUpstreamNodeValues };
};
