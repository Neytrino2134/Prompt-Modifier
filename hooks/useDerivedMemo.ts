
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
    const len = val.length;
    // Sample evenly across the string (up to 20 samples) to catch changes anywhere in large JSON payloads
    const samplesCount = Math.min(20, Math.max(2, Math.floor(len / 100)));
    const step = Math.max(1, Math.floor(len / samplesCount));
    for (let i = 0; i < len; i += step) {
        const slice = val.slice(i, i + 32);
        for (let j = 0; j < slice.length; j++) {
            hash = ((hash << 5) - hash) + slice.charCodeAt(j);
            hash = hash & hash;
        }
    }
    return `${len}-${hash}`;
};

// Specialized signature generator for Character Nodes to ensure Index/Name/Ratio/Text changes are always caught immediately
const getCharacterIdentitySignature = (val: string) => {
    if (!val) return 'empty';
    // We strictly look for keys that affect the Sequence Generator display
    // Using a regex to extract these specific values creates a signature that changes ONLY when relevant data changes,
    // avoiding re-renders on unrelated changes but guaranteeing re-renders on these.
    // keys: index, alias, name, selectedRatio, prompt, isOutput, isActive
    const matches = val.match(/"(index|alias|name|selectedRatio|prompt|isActive|isOutput)"\s*:\s*("[^"]*"|true|false|null)/g);
    
    // Also include a simple hash of the full string to catch subtle description edits not caught by regex
    let hash = 0;
    for (let i = 0; i < Math.min(val.length, 200); i++) {
        hash = ((hash << 5) - hash) + val.charCodeAt(i);
    }
    
    return (matches ? matches.join(',') : 'no-match') + `-${hash}`;
};

// Specialized signature generator for Batch Prepare Nodes to ensure View swaps/mutes/packs update immediately
const getBatchPrepareSignature = (val: string) => {
    if (!val) return 'empty';
    try {
        const parsed = JSON.parse(val);
        const activeViews = parsed.activeViews || parsed.multiview || {};
        const muted = parsed.mutedViews || {};
        const f = activeViews.front ? `${activeViews.front.length}-${activeViews.front.slice(20, 60)}` : 'null';
        const b = activeViews.back ? `${activeViews.back.length}-${activeViews.back.slice(20, 60)}` : 'null';
        const l = activeViews.left ? `${activeViews.left.length}-${activeViews.left.slice(20, 60)}` : 'null';
        const r = activeViews.right ? `${activeViews.right.length}-${activeViews.right.slice(20, 60)}` : 'null';
        const mf = muted.front ? '1' : '0';
        const mb = muted.back ? '1' : '0';
        const ml = muted.left ? '1' : '0';
        const mr = muted.right ? '1' : '0';
        const packId = parsed.activePackId || '';
        const packsCount = Array.isArray(parsed.packs) ? parsed.packs.length : 0;
        return `batchprep:${f}:${b}:${l}:${r}:${mf}${mb}${ml}${mr}:${packId}:${packsCount}:${val.length}`;
    } catch {
        return generateSignature(val);
    }
};

const getNodeValueSignature = (node: Node | undefined): string => {
    if (!node || !node.value) return 'empty';
    if (node.type === NodeType.BATCH_PREPARE) {
        return getBatchPrepareSignature(node.value);
    }
    if (node.type === NodeType.CHARACTER_CARD || node.type === NodeType.CHARACTER_GENERATOR) {
        return `char:${getCharacterIdentitySignature(node.value)}`;
    }
    return generateSignature(node.value);
};

export const useDerivedMemo = (props: UseDerivedMemoProps) => {
    const { connections, nodes, getFullSizeImage } = props;

    // Cache refs to avoid re-parsing JSON during layout updates (drags)
    const characterDataCache = useRef<{ signature: string, data: Map<string, any[]> }>({ signature: '', data: new Map() });
    const imageSourcesCache = useRef<{ signature: string, data: Map<string, (string | null)[]> }>({ signature: '', data: new Map() });
    const upstreamValuesCache = useRef<Map<string, { signature: string, values: any[] }>>(new Map());
    const imageCacheInputs = useRef<{ values: Array<[string, string]>; connections: Connection[]; getter: typeof getFullSizeImage } | null>(null);
    const previous = imageCacheInputs.current;
    // Exact value comparisons avoid collisions in sampled JSON signatures, and
    // include upstream nodes behind reroutes. Replacing only an original image
    // also invalidates results even when its thumbnail/value is unchanged.
    if (!previous || previous.getter !== getFullSizeImage || previous.connections !== connections
        || previous.values.length !== nodes.length
        || nodes.some((node, i) => previous.values[i][0] !== node.id || previous.values[i][1] !== node.value)) {
        upstreamValuesCache.current.clear();
        imageSourcesCache.current.signature = '\0';
        characterDataCache.current.signature = '\0';
        imageCacheInputs.current = { values: nodes.map(node => [node.id, node.value]), connections, getter: getFullSizeImage };
    }

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

    const findImageDataSource = useCallback((fromNodeId: string, fromHandleId: string | undefined, visited: Set<string>, optimizedForUI: boolean, imageGetter = getFullSizeImage): string | null => {
        if (visited.has(fromNodeId)) return null;
        visited.add(fromNodeId);

        const node = nodes.find(n => n.id === fromNodeId);
        if (!node) return null;

        const outputType = getOutputHandleType(node, fromHandleId);
        if (outputType !== 'image' && node.type !== NodeType.REROUTE_DOT) return null;

        if (node.type === NodeType.IMAGE_ANALYZER || node.type === NodeType.REROUTE_DOT) {
            const inputConn = connections.find(c => c.toNodeId === fromNodeId);
            if (inputConn) return findImageDataSource(inputConn.fromNodeId, inputConn.fromHandleId, visited, optimizedForUI, imageGetter);
        }

        const fullRes = imageGetter(node.id, 0);
        let parsed: any = {};
        try {
            parsed = JSON.parse(node.value || '{}');
        } catch {
            // node.value might be a raw data URL or plain string
        }

        switch (node.type) {
            case NodeType.IMAGE_OUTPUT: {
                const rawVal = typeof node.value === 'string' ? node.value : '';
                const imgVal = (typeof parsed === 'object' && parsed !== null) ? (parsed.image || parsed.outputImage) : null;
                if (optimizedForUI) {
                    return rawVal.startsWith('data:') ? rawVal : (imgVal || fullRes || (rawVal ? rawVal : null));
                }
                return fullRes || (rawVal.startsWith('data:') ? rawVal : null) || imgVal || null;
            }
            case NodeType.IMAGE_INPUT: {
                const rawVal = typeof node.value === 'string' ? node.value : '';
                if (rawVal.startsWith('data:image')) return rawVal;

                const mode = parsed.mode || 'full';
                if (mode === 'single' && (parsed.cropRect || parsed.croppedImage)) {
                    const croppedFull = imageGetter(node.id, 1);
                    if (croppedFull && !optimizedForUI) return croppedFull;
                    if (parsed.croppedImage) return parsed.croppedImage;
                } else if (mode === 'grid' && parsed.grid) {
                    const firstFull = imageGetter(node.id, 1);
                    if (firstFull && !optimizedForUI) return firstFull;
                    if (parsed.extractedImages?.[0]) return parsed.extractedImages[0];
                } else if (mode === 'frames') {
                    const firstFull = imageGetter(node.id, 1);
                    if (firstFull && !optimizedForUI) return firstFull;
                    if (parsed.frameImages?.[0]) return parsed.frameImages[0];
                } else if (mode === 'batch') {
                    const subMode = parsed.batchConfig?.subMode || (parsed.grid ? 'grid' : 'crop');
                    if (subMode === 'grid' && parsed.grid && Array.isArray(parsed.extractedImages) && parsed.extractedImages.length > 0) {
                        const firstFull = imageGetter(node.id, 1);
                        if (firstFull && !optimizedForUI) return firstFull;
                        if (parsed.extractedImages?.[0]) return parsed.extractedImages[0];
                    } else if (subMode === 'crop' && (parsed.cropRect || parsed.croppedImage)) {
                        const croppedFull = imageGetter(node.id, 1);
                        if (croppedFull && !optimizedForUI) return croppedFull;
                        if (parsed.croppedImage) return parsed.croppedImage;
                    }
                }
                return (optimizedForUI && parsed.image) ? parsed.image : (fullRes || parsed.image || null);
            }
            case NodeType.PROMPT_PROCESSOR: {
                const inputConn = connections.find(c => c.toNodeId === fromNodeId && (c.toHandleId === 'image' || c.toHandleId === undefined));
                if (inputConn) {
                    return findImageDataSource(inputConn.fromNodeId, inputConn.fromHandleId, visited, optimizedForUI, imageGetter);
                }
                return parsed.multiviewInputImage || parsed.image || fullRes || null;
            }
            case NodeType.PROMPT_SEQUENCE_EDITOR: {
                if (parsed.activeTab === 'multiview' && Array.isArray(parsed.multiviewItems) && parsed.multiviewItems.length > 0) {
                    return parsed.multiviewItems[0]?.image || null;
                }
                const inputConn = connections.find(c => c.toNodeId === fromNodeId && (c.toHandleId === 'image' || c.toHandleId === undefined));
                if (inputConn) {
                    return findImageDataSource(inputConn.fromNodeId, inputConn.fromHandleId, visited, optimizedForUI, imageGetter);
                }
                return null;
            }
            case NodeType.POSE_CREATOR: return parsed.renderedImage || fullRes || null;
            case NodeType.IMAGE_ANALYZER:
                return optimizedForUI ? (parsed.image || fullRes || null) : (fullRes || parsed.image || null);
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
                 // Respect the selected ratio of the character card for image output
                 const ratio = outputChar.selectedRatio || '1:1';
                 const ratioIdx = RATIO_INDICES[ratio] || 1;
                 
                 const cachedFull = imageGetter(node.id, (charIdx * 10) + ratioIdx) || imageGetter(node.id, charIdx * 10);
                 if (cachedFull && !optimizedForUI) return cachedFull;
                 
                 // Fallback to thumbnail of selected ratio or general image
                 return outputChar?.thumbnails?.[ratio] || outputChar?.image || cachedFull || null;

            case NodeType.IMAGE_EDITOR: {
                if (parsed.isSequenceMode && Array.isArray(parsed.sequenceOutputs) && parsed.sequenceOutputs.length > 0) {
                    const checked = Array.isArray(parsed.checkedSequenceOutputIndices) && parsed.checkedSequenceOutputIndices.length > 0
                        ? parsed.checkedSequenceOutputIndices
                        : parsed.sequenceOutputs.map((_: any, i: number) => i);
                    const firstIdx = checked[0] !== undefined ? checked[0] : 0;
                    const out = parsed.sequenceOutputs[firstIdx];
                    const full = imageGetter(node.id, 1000 + firstIdx);
                    if (full && !optimizedForUI) return full;
                    if (out?.thumbnail) return out.thumbnail;
                }
                return optimizedForUI ? (parsed.outputImage || fullRes || null) : (fullRes || parsed.outputImage || null);
            }
            case NodeType.IMAGE_SEQUENCE_GENERATOR: {
                if (parsed.images) {
                    const checked = parsed.checkedFrameNumbers || [];
                    const frameNum = checked[0] !== undefined ? checked[0] : (parsed.selectedFrameNumber !== null ? parsed.selectedFrameNumber : 0);
                    const full = imageGetter(node.id, 1000 + frameNum);
                    if (full && !optimizedForUI) return full;
                    if (parsed.images[frameNum]) return parsed.images[frameNum];
                }
                return fullRes || null;
            }
            case NodeType.BATCH_PREPARE: {
                const activeMultiview = parsed.multiview || parsed.activeViews || {};
                const muted = parsed.mutedViews || {};
                if (fromHandleId === 'front') return muted.front ? null : (activeMultiview.front || null);
                if (fromHandleId === 'back') return muted.back ? null : (activeMultiview.back || null);
                if (fromHandleId === 'left') return muted.left ? null : (activeMultiview.left || null);
                if (fromHandleId === 'right') return muted.right ? null : (activeMultiview.right || null);
                
                return (
                    (!muted.front && activeMultiview.front) ||
                    (!muted.left && activeMultiview.left) ||
                    (!muted.back && activeMultiview.back) ||
                    (!muted.right && activeMultiview.right) ||
                    null
                );
            }
            case NodeType.NOTE: {
                if (fromHandleId === 'all_images' || fromHandleId === undefined || fromHandleId === 'image') {
                    if (Array.isArray(parsed.references) && parsed.references.length > 0) {
                        const firstIdx = parsed.references.findIndex((r: any) => r.image);
                        if (firstIdx !== -1) {
                            const full = imageGetter(node.id, firstIdx);
                            if (full && !optimizedForUI) return full;
                            const thumb = parsed.references[firstIdx]?.image;
                            return (optimizedForUI && thumb) ? thumb : (full || thumb || null);
                        }
                    }
                }
                return null;
            }
        }
        if (typeof node.value === 'string' && node.value.startsWith('data:image')) {
            return node.value;
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
            if (!fromNode) return '';
            
            // Special handling for Character nodes to ensure updates to Index/Name/Ratio are caught instantly
            if (fromNode.type === NodeType.CHARACTER_CARD || fromNode.type === NodeType.CHARACTER_GENERATOR) {
                return `${c.id}:${fromNode.id}:${getCharacterIdentitySignature(fromNode.value || '')}`;
            }

            return `${c.id}:${fromNode.id}:${generateSignature(fromNode.value || '')}`; 
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
                                nodeData.push({ 
                                    name: charData.name, 
                                    alias: charData.index || charData.alias, 
                                    prompt: charData.prompt, 
                                    fullDescription: charData.fullDescription, 
                                    image: charData.imageBase64 ? `data:image/png;base64,${charData.imageBase64}` : null, 
                                    _sourceNodeId: fromNode.id, 
                                    _connectionId: source.connectionId 
                                });
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
                                // Default to all active if handle ambiguous
                                charsToProcess = characters
                                    .map((c, idx) => ({ data: c, originalIndex: idx }))
                                    .filter(item => item.data.isActive !== false);
                            }

                            charsToProcess.forEach(({ data, originalIndex }) => {
                                if (!data) return;
                                
                                // Prioritize image sources
                                const sources = data.thumbnails ? { ...(data.thumbnails as object) } : (data.imageSources || {});
                                
                                // Hydrate sources from cache if available
                                Object.entries(RATIO_INDICES).forEach(([ratio, index]) => { 
                                    const cached = getFullSizeImage(fromNode.id, (originalIndex * 10) + index); 
                                    if (cached) (sources as any)[ratio] = cached; 
                                });

                                // Determine active image based on selectedRatio
                                const activeRatio = data.selectedRatio || '1:1';
                                const activeImage = (sources as any)[activeRatio] || data.image || getFullSizeImage(fromNode.id, originalIndex * 10);

                                nodeData.push({ 
                                    ...data, 
                                    alias: data.index || data.alias, 
                                    image: activeImage, // IMPORTANT: Send the image matching the selected ratio
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

    const getUpstreamNodeValues = useCallback((nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI: boolean = false, imageGetter = getFullSizeImage) => {
        const activeNodes = currentNodes || nodes;
        const inputConnections = connections.filter(c => c.toNodeId === nodeId && (
            handleId === undefined || 
            c.toHandleId === handleId || 
            (!c.toHandleId && handleId === 'image') || 
            (c.toHandleId === 'image' && handleId === undefined)
        ));
        
        if (inputConnections.length === 0) return [];

        const sigParts = inputConnections.map(c => {
            const fn = activeNodes.find(n => n.id === c.fromNodeId);
            return `${c.id}:${c.fromHandleId || ''}:${c.toHandleId || ''}:${fn?.id || ''}:${getNodeValueSignature(fn)}`;
        });
        const incomingSig = sigParts.join('|');
        const cacheKey = `${nodeId}_${handleId || 'all'}_${optimizedForUI ? '1' : '0'}`;
        const cached = upstreamValuesCache.current.get(cacheKey);
        if ((imageGetter === getFullSizeImage && (!currentNodes || currentNodes === nodes)) && cached && cached.signature === incomingSig) {
            return cached.values;
        }

        const values: (string | any)[] = [];
        
        for (const conn of inputConnections) {
            const fromNode = activeNodes.find(n => n.id === conn.fromNodeId);
            if (!fromNode) continue;

            if (fromNode.type === NodeType.REROUTE_DOT) {
                values.push(...getUpstreamNodeValues(fromNode.id, undefined, activeNodes, optimizedForUI, imageGetter));
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
                    } else if (fromNode.type === NodeType.PROMPT_PROCESSOR || fromNode.type === NodeType.VIDEO_PROMPT_PROCESSOR) {
                        values.push(parsed.prompt || parsed.multiviewOutput || '');
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
                    } else if (fromNode.type === NodeType.NOTE) {
                        const isRefMode = parsed.activeTab === 'reference' || conn.fromHandleId === 'all_captions';
                        if (isRefMode) {
                            const refs = Array.isArray(parsed.references) ? parsed.references : [];
                            const captions = refs
                                .map((r: any) => (typeof r.caption === 'string' ? r.caption : ''))
                                .filter((c: string) => c.trim().length > 0);
                            values.push(captions.join('\n\n'));
                        } else {
                            values.push(parsed.text || '');
                        }
                    } else if (fromNode.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
                        if (parsed.activeTab === 'multiview') {
                            const items = Array.isArray(parsed.multiviewItems) ? parsed.multiviewItems : [];
                            const promptsList = items.map((it: any, i: number) => ({
                                frameNumber: it.index !== undefined ? it.index : (i + 1),
                                prompt: it.prompt || '',
                                image: it.image || null
                            }));

                            if (conn.fromHandleId === 'text' || conn.fromHandleId === 'all_prompts') {
                                values.push(JSON.stringify({
                                    type: 'multiview-batch-data',
                                    multiviewPrompt: parsed.multiviewPrompt || '',
                                    prompts: promptsList,
                                    finalPrompts: promptsList,
                                    items: items
                                }));
                            } else if (conn.fromHandleId === 'all_data' || conn.fromHandleId === 'all_prompt_data') {
                                values.push(JSON.stringify({
                                    type: 'multiview-batch-data',
                                    multiviewPrompt: parsed.multiviewPrompt || '',
                                    items: items,
                                    prompts: promptsList,
                                    finalPrompts: promptsList
                                }));
                            } else {
                                values.push(fromNode.value);
                            }
                        } else {
                            if (conn.fromHandleId === 'all_data' || conn.fromHandleId === 'all_prompt_data') {
                                values.push(JSON.stringify({
                                    type: 'script-prompt-modifier-data',
                                    sourcePrompts: parsed.sourcePrompts || [],
                                    modifiedPrompts: parsed.modifiedPrompts || [],
                                    finalPrompts: parsed.finalPrompts || []
                                }));
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
                             const url = imageGetter(fromNode.id, 1000 + frameNum) || imgs[frameNum];
                             if (url && url.startsWith('data:')) {
                                 const parts = url.split(',');
                                 const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                 values.push({ base64ImageData: parts[1], mimeType: mime });
                             }
                        });
                        if (checked.length > 0) continue; 
                    } catch {}
                } else if (fromNode.type === NodeType.IMAGE_INPUT) {
                    try {
                        const parsed = JSON.parse(fromNode.value || '{}');
                        const mode = parsed.mode || 'full';
                        if (mode === 'grid' && parsed.grid) {
                            const totalCells = (parsed.grid.cols || 1) * (parsed.grid.rows || 1);
                            const selectedCells: number[] = Array.isArray(parsed.grid.selectedCells)
                                ? parsed.grid.selectedCells
                                : Array.from({ length: totalCells }, (_, i) => i);
                            
                            const thumbs = parsed.extractedImages || [];
                            let pushedAny = false;
                            selectedCells.forEach((cellIdx) => {
                                const fullUrl = imageGetter(fromNode.id, 1 + cellIdx);
                                const thumbUrl = thumbs[cellIdx];
                                const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl);
                                if (url && url.startsWith('data:')) {
                                    const parts = url.split(',');
                                    const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                    values.push({ base64ImageData: parts[1], mimeType: mime });
                                    pushedAny = true;
                                }
                            });
                            if (pushedAny) continue;
                        } else if (mode === 'frames') {
                            const frames = parsed.framesConfig?.frames || [];
                            const thumbs = parsed.frameImages || [];
                            let pushedAny = false;
                            frames.forEach((_: any, frameIdx: number) => {
                                const fullUrl = imageGetter(fromNode.id, 1 + frameIdx);
                                const thumbUrl = thumbs[frameIdx];
                                const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl);
                                if (url && url.startsWith('data:')) {
                                    const parts = url.split(',');
                                    const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                    values.push({ base64ImageData: parts[1], mimeType: mime });
                                    pushedAny = true;
                                }
                            });
                            if (pushedAny) continue;
                        } else if (mode === 'single' && (parsed.cropRect || parsed.croppedImage)) {
                            const fullUrl = imageGetter(fromNode.id, 1);
                            const thumbUrl = parsed.croppedImage;
                            const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl || imageGetter(fromNode.id, 0) || parsed.image);
                            if (url && url.startsWith('data:')) {
                                const parts = url.split(',');
                                const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                                continue;
                            }
                        } else if (mode === 'batch') {
                            const subMode = parsed.batchConfig?.subMode || (parsed.grid ? 'grid' : 'crop');
                            if (subMode === 'grid' && parsed.grid && Array.isArray(parsed.extractedImages) && parsed.extractedImages.length > 0) {
                                const totalCells = (parsed.grid.cols || 1) * (parsed.grid.rows || 1);
                                const selectedCells: number[] = Array.isArray(parsed.grid.selectedCells)
                                    ? parsed.grid.selectedCells
                                    : Array.from({ length: totalCells }, (_, i) => i);
                                
                                const thumbs = parsed.extractedImages || [];
                                let pushedAny = false;
                                selectedCells.forEach((cellIdx) => {
                                    const fullUrl = imageGetter(fromNode.id, 1 + cellIdx);
                                    const thumbUrl = thumbs[cellIdx];
                                    const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl);
                                    if (url && url.startsWith('data:')) {
                                        const parts = url.split(',');
                                        const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                        values.push({ base64ImageData: parts[1], mimeType: mime });
                                        pushedAny = true;
                                    }
                                });
                                if (pushedAny) continue;
                            } else if (subMode === 'crop' && (parsed.cropRect || parsed.croppedImage)) {
                                const fullUrl = imageGetter(fromNode.id, 1);
                                const thumbUrl = parsed.croppedImage;
                                const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl || imageGetter(fromNode.id, 0) || parsed.image);
                                if (url && url.startsWith('data:')) {
                                    const parts = url.split(',');
                                    const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                    values.push({ base64ImageData: parts[1], mimeType: mime });
                                    continue;
                                }
                            } else if (Array.isArray(parsed.batchFiles) && parsed.batchFiles.length > 0) {
                                let pushedAny = false;
                                parsed.batchFiles.forEach((file: any, fileIdx: number) => {
                                    const fullUrl = imageGetter(fromNode.id, fileIdx);
                                    const url = optimizedForUI ? (file.thumbnailUrl || file.dataUrl) : (file.dataUrl || fullUrl);
                                    if (url && url.startsWith('data:')) {
                                        const parts = url.split(',');
                                        const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                        values.push({ base64ImageData: parts[1], mimeType: mime });
                                        pushedAny = true;
                                    }
                                });
                                if (pushedAny) continue;
                            }
                        } else {
                            // Normal / Full Mode or fallback
                            if (Array.isArray(parsed.batchFiles) && parsed.batchFiles.length > 0) {
                                let pushedAny = false;
                                parsed.batchFiles.forEach((file: any, fileIdx: number) => {
                                    const fullUrl = imageGetter(fromNode.id, fileIdx);
                                    const url = optimizedForUI ? (file.thumbnailUrl || file.dataUrl) : (file.dataUrl || fullUrl);
                                    if (url && url.startsWith('data:')) {
                                        const parts = url.split(',');
                                        const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                        values.push({ base64ImageData: parts[1], mimeType: mime });
                                        pushedAny = true;
                                    }
                                });
                                if (pushedAny) continue;
                            }

                            const fullUrl = imageGetter(fromNode.id, 0);
                            const thumbUrl = parsed.image;
                            const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl);
                            if (url && url.startsWith('data:')) {
                                const parts = url.split(',');
                                const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                                continue;
                            }
                        }
                    } catch {}
                } else if (fromNode.type === NodeType.PROMPT_PROCESSOR) {
                    const imgUrl = findImageDataSource(fromNode.id, 'image', new Set(), optimizedForUI, imageGetter);
                    if (imgUrl && imgUrl.startsWith('data:')) {
                        const parts = imgUrl.split(',');
                        const mime = imgUrl.match(/:(.*?);/)?.[1] || 'image/png';
                        values.push({ base64ImageData: parts[1], mimeType: mime });
                        continue;
                    }
                } else if (fromNode.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
                    try {
                        const parsed = JSON.parse(fromNode.value || '{}');
                        if (parsed.activeTab === 'multiview' && Array.isArray(parsed.multiviewItems) && parsed.multiviewItems.length > 0) {
                            let pushedAny = false;
                            parsed.multiviewItems.forEach((item: any) => {
                                const url = item.image;
                                if (url && url.startsWith('data:')) {
                                    const parts = url.split(',');
                                    const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                    values.push({ base64ImageData: parts[1], mimeType: mime });
                                    pushedAny = true;
                                }
                            });
                            if (pushedAny) continue;
                        }
                    } catch {}
                    const imgUrl = findImageDataSource(fromNode.id, conn.fromHandleId, new Set(), optimizedForUI, imageGetter);
                    if (imgUrl && imgUrl.startsWith('data:')) {
                        const parts = imgUrl.split(',');
                        const mime = imgUrl.match(/:(.*?);/)?.[1] || 'image/png';
                        values.push({ base64ImageData: parts[1], mimeType: mime });
                        continue;
                    }
                } else if (fromNode.type === NodeType.BATCH_PREPARE) {
                    try {
                        const parsed = JSON.parse(fromNode.value || '{}');
                        const activeMultiview = parsed.multiview || parsed.activeViews || {};
                        const muted = parsed.mutedViews || {};

                        if (conn.fromHandleId === 'front') {
                            if (!muted.front && activeMultiview.front) {
                                const fullUrl = activeMultiview.front;
                                const parts = fullUrl.split(',');
                                const mime = fullUrl.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                            }
                            continue;
                        } else if (conn.fromHandleId === 'back') {
                            if (!muted.back && activeMultiview.back) {
                                const fullUrl = activeMultiview.back;
                                const parts = fullUrl.split(',');
                                const mime = fullUrl.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                            }
                            continue;
                        } else if (conn.fromHandleId === 'left') {
                            if (!muted.left && activeMultiview.left) {
                                const fullUrl = activeMultiview.left;
                                const parts = fullUrl.split(',');
                                const mime = fullUrl.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                            }
                            continue;
                        } else if (conn.fromHandleId === 'right') {
                            if (!muted.right && activeMultiview.right) {
                                const fullUrl = activeMultiview.right;
                                const parts = fullUrl.split(',');
                                const mime = fullUrl.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                            }
                            continue;
                        }

                        // Generic handle: return exactly the 4 active views (front, back, left, right), respecting muted status
                        const packViews = [
                            muted.front ? null : (activeMultiview.front || null),
                            muted.back ? null : (activeMultiview.back || null),
                            muted.left ? null : (activeMultiview.left || null),
                            muted.right ? null : (activeMultiview.right || null)
                        ];

                        packViews.forEach((viewUrl) => {
                            if (viewUrl && typeof viewUrl === 'string' && viewUrl.startsWith('data:')) {
                                const parts = viewUrl.split(',');
                                const mime = viewUrl.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                            } else if (viewUrl && typeof viewUrl === 'string' && (viewUrl.startsWith('http') || viewUrl.startsWith('blob:'))) {
                                values.push(viewUrl);
                            } else {
                                values.push(null);
                            }
                        });

                        continue;
                    } catch {}
                } else if (fromNode.type === NodeType.IMAGE_OUTPUT) {
                    const fullUrl = imageGetter(fromNode.id, 0);
                    let rawUrl = (typeof fromNode.value === 'string' && fromNode.value.startsWith('data:')) ? fromNode.value : '';
                    if (!rawUrl) {
                        try {
                            const parsed = JSON.parse(fromNode.value || '{}');
                            rawUrl = parsed.image || parsed.outputImage || '';
                        } catch {}
                    }
                    const url = (optimizedForUI && rawUrl) ? rawUrl : (fullUrl || rawUrl);
                    if (url && url.startsWith('data:')) {
                        const parts = url.split(',');
                        const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                        values.push({ base64ImageData: parts[1], mimeType: mime });
                        continue;
                    }
                } else if (fromNode.type === NodeType.IMAGE_EDITOR) {
                    try {
                        const parsed = JSON.parse(fromNode.value || '{}');
                        if (parsed.isSequenceMode && Array.isArray(parsed.sequenceOutputs) && parsed.sequenceOutputs.length > 0) {
                            const checked: number[] = Array.isArray(parsed.checkedSequenceOutputIndices) && parsed.checkedSequenceOutputIndices.length > 0
                                ? parsed.checkedSequenceOutputIndices
                                : parsed.sequenceOutputs.map((_: any, i: number) => i);

                            let pushedAny = false;
                            checked.forEach((frameIdx: number) => {
                                const out = parsed.sequenceOutputs[frameIdx];
                                if (!out) return;
                                const fullUrl = imageGetter(fromNode.id, 1000 + frameIdx);
                                const thumbUrl = out.thumbnail;
                                const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl);
                                if (url && url.startsWith('data:')) {
                                    const parts = url.split(',');
                                    const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                    values.push({ base64ImageData: parts[1], mimeType: mime });
                                    pushedAny = true;
                                }
                            });
                            if (pushedAny) continue;
                        } else if (parsed.outputImage) {
                            const fullUrl = imageGetter(fromNode.id, 0);
                            const thumbUrl = parsed.outputImage;
                            const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl);
                            if (url && url.startsWith('data:')) {
                                const parts = url.split(',');
                                const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                values.push({ base64ImageData: parts[1], mimeType: mime });
                                continue;
                            }
                        }
                    } catch {}
                } else if (fromNode.type === NodeType.NOTE) {
                    try {
                        const parsed = JSON.parse(fromNode.value || '{}');
                        const isRef = parsed.activeTab === 'reference' || conn.fromHandleId === 'all_images' || conn.fromHandleId === undefined;
                        if (isRef && Array.isArray(parsed.references) && parsed.references.length > 0) {
                            let pushedAny = false;
                            parsed.references.forEach((ref: any, refIdx: number) => {
                                const fullUrl = imageGetter(fromNode.id, refIdx);
                                const thumbUrl = ref.image;
                                const url = (optimizedForUI && thumbUrl) ? thumbUrl : (fullUrl || thumbUrl);
                                if (url && url.startsWith('data:')) {
                                    const parts = url.split(',');
                                    const mime = url.match(/:(.*?);/)?.[1] || 'image/png';
                                    values.push({ base64ImageData: parts[1], mimeType: mime });
                                    pushedAny = true;
                                }
                            });
                            if (pushedAny) continue;
                        }
                    } catch {}
                }

                const url = findImageDataSource(conn.fromNodeId, conn.fromHandleId, new Set(), optimizedForUI, imageGetter);
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
        if (!currentNodes || currentNodes === nodes) upstreamValuesCache.current.set(cacheKey, { signature: incomingSig, values });
        return values;
    }, [nodes, connections, findImageDataSource, getFullSizeImage]);

    return { connectedInputs, connectedImageSources, connectedCharacterData, connectedInputTypes, getConnectionPoints, getUpstreamNodeValues };
};
