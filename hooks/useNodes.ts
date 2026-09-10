
import { useState, useCallback, useRef } from 'react';
import { Node, NodeType, Point, ToastType } from '../types';
import { readPromptFromPNG } from '../utils/pngMetadata';
import { getEmptyValueForNodeType, getDuplicatedValueForNodeType, RATIO_INDICES } from '../utils/nodeUtils';
import { generateThumbnail } from '../utils/imageUtils';

export const useNodes = (initialNodes: Node[], initialCounter: number, addToast: (message: string, type?: ToastType) => void, t: (key: string) => string, setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void, getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined) => {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const nodeIdCounter = useRef<number>(initialCounter);

    const handleValueChange = useCallback((nodeId: string, value: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, value } : n));
    }, []);

    const handleRenameNode = useCallback((nodeId: string, newTitle: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, title: newTitle } : n));
    }, []);

    const handleClearNodeNewFlag = useCallback((nodeId: string) => {
        setNodes(nds => nds.map(n => {
            if (n.id === nodeId && n.isNewlyCreated) {
                return { ...n, isNewlyCreated: false };
            }
            return n;
        }));
    }, []);

    const handleDeleteNode = (nodeId: string) => {
        setNodes(nds => nds.filter(n => n.id !== nodeId));
    };

    const handleDuplicateNode = useCallback((nodeId: string): string | undefined => {
        const nodeToDup = nodes.find(n => n.id === nodeId);
        if (!nodeToDup) return;
        nodeIdCounter.current++;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        const newNode: Node = {
            ...nodeToDup,
            id: newNodeId,
            position: { x: nodeToDup.position.x + 30, y: nodeToDup.position.y + 30 },
            isNewlyCreated: true,
            value: getDuplicatedValueForNodeType(nodeToDup),
        };
        setNodes(nds => [...nds, newNode]);
        addToast(t('toast.nodeDuplicated'));
        return newNodeId;
    }, [nodes, nodeIdCounter, setNodes, addToast, t]);

    const handleDuplicateNodeWithContent = useCallback((nodeId: string): string | undefined => {
        const nodeToDup = nodes.find(n => n.id === nodeId);
        if (!nodeToDup) return;
        nodeIdCounter.current++;
        const newNodeId = `node-${nodeIdCounter.current}-${Date.now()}`;
        const newNode: Node = {
            ...nodeToDup,
            id: newNodeId,
            position: { x: nodeToDup.position.x + 30, y: nodeToDup.position.y + 30 },
            isNewlyCreated: true,
            value: nodeToDup.value,
        };

        // Character Card logic: up to 10 characters supported in duplication loop (0..9) * 10
        // Standard loop 0-50 covers generic nodes + 5 characters. Increased to 100 for safety.
        // Note Cache logic: References use indexes 0...N. Loop handles it.
        for (let i = 0; i <= 100; i++) {
            const cachedImg = getFullSizeImage(nodeId, i);
            if (cachedImg) {
                setFullSizeImage(newNodeId, i, cachedImg);
            }
        }

        setNodes(nds => [...nds, newNode]);
        addToast(t('toast.nodeDuplicated'));
        return newNodeId;
    }, [nodes, nodeIdCounter, setNodes, addToast, t, getFullSizeImage, setFullSizeImage]);

    const handlePasteNodeValue = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return "Node not found.";

        try {
            const text = await navigator.clipboard.readText();
            if (!text) return "Clipboard empty.";

            if (node.type === NodeType.CHARACTER_CARD) {
                try {
                    const parsed = JSON.parse(text);
                    let cardDataArray: any[] = [];

                    if (Array.isArray(parsed)) {
                        cardDataArray = parsed;
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        cardDataArray = [parsed];
                    }

                    // Check if it looks like character card data
                    const isPotentialCardData = cardDataArray.length > 0 && (
                        cardDataArray[0].type === 'character-card' ||
                        cardDataArray[0].name ||
                        cardDataArray[0].imageSources ||
                        cardDataArray[0].prompt
                    );

                    if (isPotentialCardData) {
                        // 1. Get Existing Data
                        let existingCharacters = [];
                        try {
                            existingCharacters = JSON.parse(node.value || '[]');
                            if (!Array.isArray(existingCharacters)) existingCharacters = [existingCharacters];
                        } catch { existingCharacters = []; }

                        // 2. Determine Start Index for new items (Append mode)
                        const startIndex = existingCharacters.length;

                        // 3. Process new items
                        const newCharacters = await Promise.all(cardDataArray.map(async (cardData, i) => {
                            const actualIndex = startIndex + i; // Offset by existing count

                            const loadedSources = cardData.imageSources || { '1:1': null, '16:9': null, '9:16': null };
                            const newThumbnails: Record<string, string | null> = { '1:1': null, '16:9': null, '9:16': null };

                            if (cardData.image && !cardData.imageSources) {
                                loadedSources['1:1'] = cardData.image;
                            }

                            // Pre-process sources to fix raw base64
                            const processedSources: Record<string, string | null> = {};
                            for (const [ratio, rawSrc] of Object.entries(loadedSources)) {
                                let src = rawSrc as string | null;
                                if (typeof src === 'string' && !src.startsWith('data:') && src.length > 20) {
                                    // Fix missing prefix
                                    src = `data:image/png;base64,${src}`;
                                }
                                processedSources[ratio] = src;
                            }

                            for (const [ratio, src] of Object.entries(processedSources)) {
                                if (typeof src === 'string' && src.startsWith('data:')) {
                                    const index = RATIO_INDICES[ratio];
                                    // Set full size image using correct offset for this character index
                                    if (index) setFullSizeImage(nodeId, (actualIndex * 10) + index, src);

                                    try {
                                        const thumbnail = await generateThumbnail(src, 256, 256);
                                        newThumbnails[ratio] = thumbnail;
                                    } catch {
                                        newThumbnails[ratio] = src;
                                    }
                                } else {
                                    newThumbnails[ratio] = src as string | null;
                                }
                            }

                            const ratio = cardData.selectedRatio || '1:1';
                            const activeHighRes = processedSources[ratio];

                            // Set base index for active image
                            if (activeHighRes && typeof activeHighRes === 'string' && activeHighRes.startsWith('data:')) {
                                setFullSizeImage(nodeId, actualIndex * 10, activeHighRes);
                            }

                            return {
                                id: `char-card-${Date.now()}-${actualIndex}`,
                                name: cardData.name || '',
                                index: cardData.index || cardData.alias || `Entity-${actualIndex + 1}`,
                                prompt: cardData.prompt || cardData.imagePrompt || '',
                                fullDescription: cardData.fullDescription || cardData.description || '',
                                selectedRatio: ratio,
                                image: newThumbnails[ratio],
                                thumbnails: newThumbnails,
                                isOutput: false // Appended items are not output by default
                            };
                        }));

                        // 4. Merge
                        const finalData = [...existingCharacters, ...newCharacters];

                        // 5. Update Node Value and Width
                        const CARD_WIDTH_STEP = 410;
                        const CARD_BASE_WIDTH = 110;
                        const newWidth = (finalData.length * CARD_WIDTH_STEP) + CARD_BASE_WIDTH;

                        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, value: JSON.stringify(finalData), width: newWidth } : n));

                        addToast(t('toast.pastedFromClipboard'));
                        return null;
                    }
                } catch (e) { }
            } else if (node.type === NodeType.NOTE) {
                // Note Node Paste Logic (Supports full note data payload, reference arrays, and plain text)
                try {
                    const parsedClipboard = JSON.parse(text);

                    // Case 1: Note payload (with type === 'note-data' or containing activeTab / references)
                    if (
                        parsedClipboard.type === 'note-data' ||
                        (typeof parsedClipboard === 'object' && parsedClipboard !== null && ('references' in parsedClipboard || 'activeTab' in parsedClipboard))
                    ) {
                        const currentParsed = JSON.parse(node.value || '{}');
                        const incomingRefs = Array.isArray(parsedClipboard.references) ? parsedClipboard.references : [];

                        // Process references & sync to fullSizeImage cache
                        const processedRefs: any[] = [];
                        for (let i = 0; i < incomingRefs.length; i++) {
                            const ref = incomingRefs[i];
                            const imgSrc = ref.image;
                            let thumb = imgSrc;
                            if (imgSrc && typeof imgSrc === 'string' && imgSrc.startsWith('data:')) {
                                setFullSizeImage(nodeId, i, imgSrc);
                                try {
                                    thumb = await generateThumbnail(imgSrc, 256, 256);
                                } catch {
                                    thumb = imgSrc;
                                }
                            }
                            processedRefs.push({
                                id: ref.id || `ref-${Date.now()}-${i}`,
                                image: thumb,
                                caption: ref.caption || ''
                            });
                        }

                        const updatedValue = {
                            ...currentParsed,
                            text: parsedClipboard.text !== undefined ? parsedClipboard.text : (currentParsed.text || ''),
                            references: processedRefs,
                            activeTab: parsedClipboard.activeTab || (processedRefs.length > 0 ? 'reference' : (currentParsed.activeTab || 'note')),
                            style: parsedClipboard.style ? { ...(currentParsed.style || {}), ...parsedClipboard.style } : currentParsed.style,
                            isMinimal: parsedClipboard.isMinimal !== undefined ? parsedClipboard.isMinimal : currentParsed.isMinimal
                        };

                        handleValueChange(nodeId, JSON.stringify(updatedValue));
                        addToast(t('toast.pastedFromClipboard'));
                        return null;
                    }

                    // Case 2: Pasting an array of items (references, cards, prompt frames)
                    if (Array.isArray(parsedClipboard) && parsedClipboard.length > 0) {
                        const currentParsed = JSON.parse(node.value || '{}');
                        const existingRefs = currentParsed.references || [];
                        const startIndex = existingRefs.length;
                        const newRefs: any[] = [];

                        for (let i = 0; i < parsedClipboard.length; i++) {
                            const item = parsedClipboard[i];
                            const actualIndex = startIndex + i;
                            const rawImg = item.image || item.src || (item.imageSources ? (item.imageSources['1:1'] || Object.values(item.imageSources)[0]) : null);
                            let thumb = rawImg;
                            if (rawImg && typeof rawImg === 'string' && rawImg.startsWith('data:')) {
                                setFullSizeImage(nodeId, actualIndex, rawImg);
                                try {
                                    thumb = await generateThumbnail(rawImg, 256, 256);
                                } catch {
                                    thumb = rawImg;
                                }
                            }
                            newRefs.push({
                                id: `ref-${Date.now()}-${actualIndex}`,
                                image: thumb,
                                caption: item.caption || item.prompt || item.name || item.title || ''
                            });
                        }

                        const updatedValue = {
                            ...currentParsed,
                            references: [...existingRefs, ...newRefs],
                            activeTab: 'reference'
                        };
                        handleValueChange(nodeId, JSON.stringify(updatedValue));
                        addToast(t('toast.pastedFromClipboard'));
                        return null;
                    }

                    // Case 3: JSON with text/prompt property
                    const currentParsed = JSON.parse(node.value || '{}');
                    const incomingText = parsedClipboard.text || parsedClipboard.prompt || text;
                    const currentText = currentParsed.text || '';
                    const newText = currentText ? `${currentText}\n${incomingText}` : incomingText;
                    handleValueChange(nodeId, JSON.stringify({ ...currentParsed, text: newText }));
                    addToast(t('toast.pastedFromClipboard'));
                    return null;
                } catch (e) {
                    // Fallback for plain text
                    try {
                        const currentParsed = JSON.parse(node.value || '{}');
                        const currentText = currentParsed.text || '';
                        const newText = currentText ? `${currentText}\n${text}` : text;
                        handleValueChange(nodeId, JSON.stringify({ ...currentParsed, text: newText }));
                        addToast(t('toast.pastedFromClipboard'));
                        return null;
                    } catch {
                        const newText = node.value ? `${node.value}\n${text}` : text;
                        handleValueChange(nodeId, JSON.stringify({ text: newText, references: [], activeTab: 'note' }));
                        addToast(t('toast.pastedFromClipboard'));
                        return null;
                    }
                }
            } else if (node.type === NodeType.IMAGE_INPUT) {
                try {
                    const parsedClipboard = JSON.parse(text);

                    // Case 1: Full Image Input Payload or Object with Batch/Grid/Image
                    if (
                        parsedClipboard.type === 'image-input-data' ||
                        (typeof parsedClipboard === 'object' && parsedClipboard !== null && !Array.isArray(parsedClipboard) && ('batchFiles' in parsedClipboard || 'grid' in parsedClipboard || 'mode' in parsedClipboard || 'image' in parsedClipboard || 'fullSizeImage' in parsedClipboard))
                    ) {
                        const mainImg = parsedClipboard.fullSizeImage || parsedClipboard.image || (parsedClipboard.batchFiles?.[0]?.dataUrl) || null;
                        let mainThumb = parsedClipboard.image || null;

                        if (mainImg && typeof mainImg === 'string' && mainImg.startsWith('data:')) {
                            setFullSizeImage(nodeId, 0, mainImg);
                            try {
                                mainThumb = await generateThumbnail(mainImg, 256, 256);
                            } catch {
                                mainThumb = mainImg;
                            }
                        }

                        if (parsedClipboard.slices && typeof parsedClipboard.slices === 'object') {
                            Object.entries(parsedClipboard.slices).forEach(([frame, sliceUrl]) => {
                                if (typeof sliceUrl === 'string' && sliceUrl.startsWith('data:')) {
                                    setFullSizeImage(nodeId, Number(frame), sliceUrl);
                                }
                            });
                        }

                        let currentVal: any = {};
                        try {
                            currentVal = JSON.parse(node.value || '{}');
                        } catch {
                            currentVal = {};
                        }

                        const incomingBatch = Array.isArray(parsedClipboard.batchFiles) ? parsedClipboard.batchFiles : [];
                        const restoredBatchFiles: any[] = [];

                        for (let i = 0; i < incomingBatch.length; i++) {
                            const item = incomingBatch[i];
                            let itemThumb = item.thumbnailUrl;
                            if (!itemThumb && item.dataUrl && typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:')) {
                                try {
                                    itemThumb = await generateThumbnail(item.dataUrl, 128, 128);
                                } catch {
                                    itemThumb = item.dataUrl;
                                }
                            }
                            restoredBatchFiles.push({
                                id: item.id || `batch-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 7)}`,
                                name: item.name || `image_${i + 1}.png`,
                                dataUrl: item.dataUrl || itemThumb || mainImg,
                                thumbnailUrl: itemThumb || item.dataUrl,
                                width: item.width,
                                height: item.height,
                                size: item.size,
                                cropRect: item.cropRect,
                                gridConfig: item.gridConfig
                            });
                        }

                        const updatedValue = {
                            ...currentVal,
                            image: mainThumb !== null ? mainThumb : currentVal.image,
                            prompt: parsedClipboard.prompt !== undefined ? parsedClipboard.prompt : (currentVal.prompt || ''),
                            mode: parsedClipboard.mode || (restoredBatchFiles.length > 0 ? 'batch' : (parsedClipboard.grid ? 'grid' : (parsedClipboard.cropRect ? 'single' : (currentVal.mode || 'full')))),
                            cropRect: parsedClipboard.cropRect !== undefined ? parsedClipboard.cropRect : currentVal.cropRect,
                            croppedImage: parsedClipboard.croppedImage !== undefined ? parsedClipboard.croppedImage : currentVal.croppedImage,
                            grid: parsedClipboard.grid !== undefined ? parsedClipboard.grid : currentVal.grid,
                            batchConfig: parsedClipboard.batchConfig !== undefined ? parsedClipboard.batchConfig : currentVal.batchConfig,
                            batchFiles: restoredBatchFiles.length > 0 ? restoredBatchFiles : (currentVal.batchFiles || []),
                            extractedImages: parsedClipboard.extractedImages !== undefined ? parsedClipboard.extractedImages : currentVal.extractedImages,
                            showSlicesDrawer: parsedClipboard.showSlicesDrawer !== undefined ? parsedClipboard.showSlicesDrawer : currentVal.showSlicesDrawer,
                            showControls: parsedClipboard.showControls !== undefined ? parsedClipboard.showControls : currentVal.showControls
                        };

                        handleValueChange(nodeId, JSON.stringify(updatedValue));
                        addToast(t('toast.pastedFromClipboard'));
                        return null;
                    }

                    // Case 2: Pasting an array of batch items or image objects
                    if (Array.isArray(parsedClipboard) && parsedClipboard.length > 0) {
                        let currentVal: any = {};
                        try {
                            currentVal = JSON.parse(node.value || '{}');
                        } catch {
                            currentVal = {};
                        }

                        const existingBatch = currentVal.batchFiles || [];
                        const newBatch: any[] = [];

                        for (let i = 0; i < parsedClipboard.length; i++) {
                            const item = parsedClipboard[i];
                            const rawSrc = item.dataUrl || item.image || item.src || (item.imageSources ? (item.imageSources['1:1'] || Object.values(item.imageSources)[0]) : null);
                            if (rawSrc && typeof rawSrc === 'string' && rawSrc.startsWith('data:')) {
                                let thumb = item.thumbnailUrl;
                                if (!thumb) {
                                    try {
                                        thumb = await generateThumbnail(rawSrc, 128, 128);
                                    } catch {
                                        thumb = rawSrc;
                                    }
                                }
                                newBatch.push({
                                    id: `batch-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 7)}`,
                                    name: item.name || item.caption || `image_${existingBatch.length + i + 1}.png`,
                                    dataUrl: rawSrc,
                                    thumbnailUrl: thumb,
                                    width: item.width,
                                    height: item.height,
                                    size: item.size,
                                    cropRect: item.cropRect,
                                    gridConfig: item.gridConfig
                                });
                            }
                        }

                        if (newBatch.length > 0) {
                            const mergedBatch = [...existingBatch, ...newBatch];
                            const firstImg = mergedBatch[0]?.dataUrl;
                            if (firstImg && (!currentVal.image || existingBatch.length === 0)) {
                                setFullSizeImage(nodeId, 0, firstImg);
                            }
                            const updatedValue = {
                                ...currentVal,
                                mode: 'batch',
                                batchFiles: mergedBatch
                            };
                            handleValueChange(nodeId, JSON.stringify(updatedValue));
                            addToast(t('toast.pastedFromClipboard'));
                            return null;
                        }
                    }
                } catch {
                    // Fallback for plain text: set as prompt if valid
                    if (text && !text.startsWith('data:image')) {
                        try {
                            const currentVal = JSON.parse(node.value || '{}');
                            handleValueChange(nodeId, JSON.stringify({ ...currentVal, prompt: text }));
                            addToast(t('toast.pastedFromClipboard'));
                            return null;
                        } catch {
                            // ignore
                        }
                    }
                }
            }

            handleValueChange(nodeId, text);
            addToast(t('toast.pastedFromClipboard'));
            return null;
        } catch (err) {
            addToast(t('toast.pasteFailed'), 'error');
            return "Could not read from clipboard.";
        }
    };

    const handlePasteImageToNode = async (nodeId: string, imageFile: File | null = null) => {
        const handleFile = (file: File) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const dataUrl = event.target?.result as string;
                if (!dataUrl) return;

                const thumbnailUrl = await generateThumbnail(dataUrl, 512, 512);
                const prompt = await readPromptFromPNG(dataUrl);

                setNodes(currentNodes => {
                    const nodeIndex = currentNodes.findIndex(n => n.id === nodeId);
                    if (nodeIndex === -1) return currentNodes;

                    const node = currentNodes[nodeIndex];
                    let newValue = node.value;
                    let newWidth = node.width;

                    try {
                        const parsed = JSON.parse(node.value || '{}');

                        if (node.type === NodeType.IMAGE_EDITOR) {
                            const newImages = [...(parsed.inputImages || []), thumbnailUrl];
                            setFullSizeImage(nodeId, newImages.length, dataUrl);
                            newValue = JSON.stringify({ ...parsed, inputImages: newImages, prompt: prompt || parsed.prompt || '' });
                        } else if (node.type === NodeType.NOTE) {
                             // Note Node Image Paste Logic (Append to References)
                             const references = parsed.references || [];
                             const newRefId = `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                             
                             // Calculate index for cache (must shift if inserting in middle, but here we append)
                             // Note uses index 0, 1, 2... for references based on array index.
                             const nextIndex = references.length; 
                             
                             setFullSizeImage(nodeId, nextIndex, dataUrl);
                             
                             const newRef = {
                                 id: newRefId,
                                 image: thumbnailUrl,
                                 caption: prompt || ''
                             };
                             
                             newValue = JSON.stringify({ 
                                 ...parsed, 
                                 references: [...references, newRef],
                                 activeTab: 'reference' // Switch to references tab
                             });
                        } else if (node.type === NodeType.IMAGE_INPUT || node.type === NodeType.IMAGE_ANALYZER || node.type === NodeType.CHARACTER_CARD || node.type === NodeType.TRANSLATOR) {

                            // Specific handling for Translator Node
                            if (node.type === NodeType.TRANSLATOR) {
                                // Store image in JSON, but also update text if prompt found
                                newValue = JSON.stringify({
                                    ...parsed,
                                    image: thumbnailUrl,
                                    // Optionally append found prompt to input text?
                                    // For now just update image. User can clear text if needed.
                                });
                                // We store full res in cache slot 0 for translator too if we want better OCR,
                                // but for now thumbnails (512px) might be enough for OCR or we can use cache.
                                // Let's use cache slot 0 for translator full res image.
                                setFullSizeImage(nodeId, 0, dataUrl);

                            } else {
                                setFullSizeImage(nodeId, 0, dataUrl);
                            }

                            if (node.type === NodeType.CHARACTER_CARD) {
                                let chars = Array.isArray(parsed) ? [...parsed] : [parsed];
                                const nextIndex = chars.length;
                                const ratio = '1:1';
                                const thumbs = { '1:1': thumbnailUrl, '16:9': null, '9:16': null };

                                const newChar = {
                                    id: `char-card-${Date.now()}-${nextIndex}`,
                                    name: `New Entity ${nextIndex + 1}`,
                                    index: `Entity-${nextIndex + 1}`,
                                    image: thumbnailUrl,
                                    thumbnails: thumbs,
                                    selectedRatio: ratio,
                                    prompt: prompt || '',
                                    fullDescription: '',
                                    targetLanguage: 'en',
                                    isOutput: chars.length === 0
                                };

                                chars.push(newChar);
                                const ratioIndex = RATIO_INDICES[ratio];
                                if (ratioIndex) setFullSizeImage(nodeId, (nextIndex * 10) + ratioIndex, dataUrl);
                                setFullSizeImage(nodeId, nextIndex * 10, dataUrl);

                                const CARD_WIDTH_STEP = 410;
                                const CARD_BASE_WIDTH = 110;
                                newWidth = (chars.length * CARD_WIDTH_STEP) + CARD_BASE_WIDTH;

                                newValue = JSON.stringify(chars);
                            } else if (node.type !== NodeType.TRANSLATOR) {
                                // Image Input / Analyzer
                                if (node.type === NodeType.IMAGE_INPUT) {
                                    if (parsed.mode === 'batch') {
                                        const existingBatch = Array.isArray(parsed.batchFiles) ? parsed.batchFiles : [];
                                        const nextIdx = existingBatch.length;
                                        const newBatchItem = {
                                            id: `batch-${Date.now()}-${nextIdx}-${Math.random().toString(36).substring(2, 7)}`,
                                            name: `Pasted_Image_${nextIdx + 1}.png`,
                                            dataUrl: dataUrl,
                                            thumbnailUrl: thumbnailUrl,
                                            size: Math.round(dataUrl.length * 0.75)
                                        };
                                        const mergedBatch = [...existingBatch, newBatchItem];
                                        if (existingBatch.length === 0 || !parsed.image) {
                                            setFullSizeImage(nodeId, 0, dataUrl);
                                            newValue = JSON.stringify({
                                                ...parsed,
                                                image: thumbnailUrl,
                                                batchFiles: mergedBatch
                                            });
                                        } else {
                                            newValue = JSON.stringify({
                                                ...parsed,
                                                batchFiles: mergedBatch
                                            });
                                        }
                                    } else {
                                        newValue = JSON.stringify({ 
                                            ...parsed, 
                                            image: thumbnailUrl, 
                                            prompt: prompt || parsed.prompt || '',
                                            extractedImages: [], 
                                            croppedImage: null 
                                        });
                                    }
                                } else {
                                    newValue = JSON.stringify({ ...parsed, image: thumbnailUrl, prompt: prompt || parsed.prompt || '' });
                                }
                            }
                        } else {
                            return currentNodes;
                        }
                    } catch {
                        // Fallback for new/empty nodes
                        if (node.type === NodeType.IMAGE_INPUT || node.type === NodeType.IMAGE_ANALYZER) {
                            setFullSizeImage(nodeId, 0, dataUrl);
                            newValue = JSON.stringify({ image: thumbnailUrl, prompt: prompt || '' });
                        } else if (node.type === NodeType.TRANSLATOR) {
                            setFullSizeImage(nodeId, 0, dataUrl);
                            newValue = JSON.stringify({ image: thumbnailUrl });
                        } else if (node.type === NodeType.IMAGE_EDITOR) {
                            setFullSizeImage(nodeId, 1, dataUrl);
                            newValue = JSON.stringify({ inputImages: [thumbnailUrl], prompt: prompt || '' });
                        } else if (node.type === NodeType.NOTE) {
                             // Fresh Note Node
                             const newRefId = `ref-${Date.now()}`;
                             setFullSizeImage(nodeId, 0, dataUrl);
                             newValue = JSON.stringify({ 
                                 text: node.value || '', 
                                 references: [{ id: newRefId, image: thumbnailUrl, caption: prompt || '' }], 
                                 activeTab: 'reference' 
                             });
                        } else if (node.type === NodeType.CHARACTER_CARD) {
                            setFullSizeImage(nodeId, 0, dataUrl);
                            const thumbs = { '1:1': thumbnailUrl, '16:9': null, '9:16': null };
                            newValue = JSON.stringify([{
                                id: `char-card-${Date.now()}`,
                                image: thumbnailUrl,
                                thumbnails: thumbs,
                                selectedRatio: '1:1',
                                name: 'New Entity 1',
                                index: 'Entity-1',
                                prompt: prompt || '',
                                isOutput: true
                            }]);
                            setFullSizeImage(nodeId, 1, dataUrl);
                            const CARD_WIDTH_STEP = 410;
                            const CARD_BASE_WIDTH = 110;
                            newWidth = CARD_WIDTH_STEP + CARD_BASE_WIDTH;
                        } else {
                            return currentNodes;
                        }
                    }

                    const newNodes = [...currentNodes];
                    newNodes[nodeIndex] = { ...node, value: newValue, width: newWidth };
                    return newNodes;
                });

                addToast(t('toast.pastedFromClipboard'));
            };
            reader.readAsDataURL(file);
        };

        if (imageFile) {
            handleFile(imageFile);
            return null;
        }

        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const file = new File([blob], "pasted_image.png", { type: blob.type });
                        handleFile(file);
                        return null;
                    }
                }
            }
            addToast(t('toast.pasteFailed'), 'error');
            return "No image found on clipboard.";
        } catch (err) {
            addToast(t('toast.pasteFailed'), 'error');
            return "Could not read from clipboard.";
        }
    };

    const handleCopyNodeValue = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return "Node not found.";

        let imageUrl: string | null = null;
        let textToCopy: string = node.value;

        try {
            if (node.value?.startsWith('{') || node.value?.startsWith('[')) {
                const parsed = JSON.parse(node.value);
                switch (node.type) {
                    case NodeType.IMAGE_INPUT:
                        {
                            const fullRes = getFullSizeImage(node.id, 0) || parsed.image || (parsed.batchFiles?.[0]?.dataUrl) || null;

                            // Collect all high-res slices from cache
                            const slices: Record<number, string> = {};
                            for (let i = 1; i <= 100; i++) {
                                const sliceImg = getFullSizeImage(node.id, i);
                                if (sliceImg) {
                                    slices[i] = sliceImg;
                                }
                            }

                            // Process batch files to make sure they contain full dataUrls
                            let processedBatchFiles: any[] = [];
                            if (Array.isArray(parsed.batchFiles)) {
                                processedBatchFiles = parsed.batchFiles.map((bf: any) => ({
                                    id: bf.id || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
                                    name: bf.name || 'image.png',
                                    dataUrl: bf.dataUrl || bf.thumbnailUrl || fullRes,
                                    thumbnailUrl: bf.thumbnailUrl,
                                    width: bf.width,
                                    height: bf.height,
                                    size: bf.size,
                                    cropRect: bf.cropRect,
                                    gridConfig: bf.gridConfig
                                }));
                            }

                            const exportPayload = {
                                type: 'image-input-data',
                                nodeTitle: node.title,
                                image: fullRes,
                                fullSizeImage: fullRes,
                                prompt: parsed.prompt || '',
                                mode: parsed.mode || (processedBatchFiles.length > 0 ? 'batch' : (parsed.grid ? 'grid' : (parsed.cropRect ? 'single' : 'full'))),
                                cropRect: parsed.cropRect || null,
                                croppedImage: parsed.croppedImage || null,
                                grid: parsed.grid || null,
                                batchConfig: parsed.batchConfig || null,
                                batchFiles: processedBatchFiles,
                                extractedImages: parsed.extractedImages || [],
                                slices: Object.keys(slices).length > 0 ? slices : undefined,
                                showSlicesDrawer: parsed.showSlicesDrawer,
                                showControls: parsed.showControls,
                                width: node.width,
                                height: node.height
                            };

                            textToCopy = JSON.stringify(exportPayload, null, 2);
                            imageUrl = null;
                        }
                        break;
                    case NodeType.IMAGE_ANALYZER:
                        imageUrl = getFullSizeImage(node.id, 0) || parsed.image;
                        textToCopy = parsed.prompt || parsed.description || '';
                        break;
                    case NodeType.CHARACTER_CARD:
                        {
                            const charArr = Array.isArray(parsed) ? parsed : [parsed];
                            const exportData = charArr.map((char: any, i: number) => {
                                const fullSources: Record<string, string | null> = { ...char.thumbnails };
                                Object.entries(RATIO_INDICES).forEach(([ratio, index]) => {
                                    const fullRes = getFullSizeImage(node.id, (i * 10) + index);
                                    if (fullRes) fullSources[ratio] = fullRes;
                                });
                                const activeRatio = char.selectedRatio || '1:1';
                                const activeHighRes = getFullSizeImage(node.id, i * 10);
                                const imageToSave = activeHighRes || fullSources[activeRatio] || char.image;
                                const exportChar = {
                                    type: 'character-card',
                                    nodeTitle: node.title,
                                    ...char,
                                    image: imageToSave,
                                    imageSources: fullSources
                                };
                                delete exportChar.thumbnails;
                                delete exportChar.id;
                                return exportChar;
                            });
                            textToCopy = JSON.stringify(exportData, null, 2);
                            imageUrl = null;
                        }
                        break;
                    case NodeType.IMAGE_EDITOR:
                        imageUrl = getFullSizeImage(node.id, 0) || parsed.outputImage;
                        textToCopy = parsed.prompt || '';
                        break;
                    case NodeType.IMAGE_OUTPUT:
                        imageUrl = getFullSizeImage(node.id, 0) || node.value;
                        textToCopy = '';
                        break;
                    case NodeType.TRANSLATOR:
                        textToCopy = parsed.translatedText || parsed.inputText || '';
                        break;
                    case NodeType.PROMPT_PROCESSOR:
                        textToCopy = parsed.prompt || '';
                        break;
                    case NodeType.NOTE:
                        {
                            const exportReferences = (parsed.references || []).map((ref: any, i: number) => {
                                const highRes = getFullSizeImage(node.id, i);
                                return {
                                    id: ref.id || `ref-${i}`,
                                    image: highRes || ref.image || null,
                                    caption: ref.caption || ''
                                };
                            });
                            const notePayload = {
                                type: 'note-data',
                                nodeTitle: node.title,
                                activeTab: parsed.activeTab || 'note',
                                text: parsed.text || '',
                                style: parsed.style,
                                isMinimal: parsed.isMinimal,
                                references: exportReferences
                            };
                            textToCopy = JSON.stringify(notePayload, null, 2);
                        }
                        break;
                    case NodeType.PROMPT_ANALYZER:
                    case NodeType.CHARACTER_ANALYZER:
                    case NodeType.SCRIPT_GENERATOR:
                    case NodeType.CHARACTER_GENERATOR:
                        textToCopy = JSON.stringify(parsed, null, 2);
                        break;
                    default:
                        textToCopy = node.value;
                }
            } else if (node.type === NodeType.IMAGE_INPUT && node.value.startsWith('data:image')) {
                const fullRes = getFullSizeImage(node.id, 0) || node.value;
                const exportPayload = {
                    type: 'image-input-data',
                    nodeTitle: node.title,
                    image: fullRes,
                    fullSizeImage: fullRes,
                    mode: 'full',
                    prompt: '',
                    width: node.width,
                    height: node.height
                };
                textToCopy = JSON.stringify(exportPayload, null, 2);
                imageUrl = null;
            } else if (node.type === NodeType.IMAGE_OUTPUT && node.value.startsWith('data:image')) {
                imageUrl = getFullSizeImage(node.id, 0) || node.value;
                textToCopy = '';
            } else {
                textToCopy = node.value;
            }
        } catch {
            textToCopy = node.value;
        }

        try {
            if (imageUrl && imageUrl.startsWith('data:image')) {
                const response = await fetch(imageUrl);
                let blob = await response.blob();
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
                    } catch (e) { }
                }
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                addToast(t('toast.copiedToClipboard'));
                return null;
            } else if (textToCopy && typeof textToCopy === 'string' && textToCopy.trim() !== '') {
                await navigator.clipboard.writeText(textToCopy);
                addToast(t('toast.copiedToClipboard'));
                return null;
            }
        } catch (err) {
            return "Could not write to clipboard.";
        }
        return "Nothing to copy.";
    };

    const handleAspectRatioChange = (nodeId: string, aspectRatio: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, aspectRatio } : n));
    };

    const handleResolutionChange = (nodeId: string, resolution: '720p' | '1080p' | '1K' | '2K' | '4K') => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, resolution } : n));
    };

    const handleModelChange = (nodeId: string, model: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, model } : n));
    };

    const handleQualityChange = (nodeId: string, quality: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, quality } : n));
    };

    const handleOutputFormatChange = (nodeId: string, outputFormat: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, outputFormat } : n));
    };

    const handleSizeChange = (nodeId: string, size: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, size } : n));
    };

    const handleCustomPromptChange = (nodeId: string, customPrompt: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, customPrompt } : n));
    };

    const handleAutoDownloadChange = (nodeId: string, enabled: boolean) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, autoDownload: enabled } : n));
    };

    const handleDurationChange = (nodeId: string, duration: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, duration } : n));
    };

    const handleUseBatchChange = (nodeId: string, useBatch: boolean) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, useBatch } : n));
    };

    const handleVideoModeChange = (nodeId: string, videoMode: 'text_to_video' | 'image_to_video' | 'video_edit') => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, videoMode } : n));
    };

    const handleSetImageEditorOutputToInput = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.IMAGE_EDITOR) return;
        try {
            const parsed = JSON.parse(node.value);
            if (parsed.outputImage) {
                const newImages = [...(parsed.inputImages || []), parsed.outputImage];
                const fullResOutput = getFullSizeImage(nodeId, 0);
                if (fullResOutput) {
                    setFullSizeImage(nodeId, newImages.length, fullResOutput);
                }
                handleValueChange(nodeId, JSON.stringify({ ...parsed, inputImages: newImages, outputImage: null }));
            }
        } catch { }
    };

    const handleRefreshImageEditor = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type !== NodeType.IMAGE_EDITOR) return;
        let preservedSettings = {};
        try {
            const current = JSON.parse(node.value || '{}');
            preservedSettings = { enableAspectRatio: current.enableAspectRatio, enableOutpainting: current.enableOutpainting, aspectRatio: current.aspectRatio, outpaintingPrompt: current.outpaintingPrompt };
        } catch { }
        const empty = JSON.parse(getEmptyValueForNodeType(node));
        const newValue = { ...empty, ...preservedSettings };
        handleValueChange(nodeId, JSON.stringify(newValue));
    };

    const handleToggleNodeCollapse = (nodeId: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n));
    };

    const handleToggleNodePin = (nodeId: string) => {
        setNodes(nds => nds.map(n => {
            if (n.id === nodeId) {
                return { ...n, isPinned: !n.isPinned };
            }
            return n;
        }));
    };

    const handleToggleNodeHandles = (nodeId: string) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, collapsedHandles: !n.collapsedHandles } : n));
    };

    return {
        nodes,
        setNodes,
        nodeIdCounter,
        handleValueChange,
        handleRenameNode,
        handleDeleteNode,
        handleDuplicateNode,
        handleDuplicateNodeWithContent,
        handlePasteNodeValue,
        handlePasteImageToNode,
        handleCopyNodeValue,
        handleAspectRatioChange,
        handleResolutionChange,
        handleModelChange,
        handleQualityChange,
        handleOutputFormatChange,
        handleSizeChange,
        handleCustomPromptChange,
        handleAutoDownloadChange,
        handleDurationChange,
        handleUseBatchChange,
        handleVideoModeChange,
        handleSetImageEditorOutputToInput,
        handleRefreshImageEditor,
        handleToggleNodeCollapse,
        handleToggleNodePin,
        handleToggleNodeHandles,
        handleClearNodeNewFlag
    };
};
