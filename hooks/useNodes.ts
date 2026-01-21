
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
                            newValue = JSON.stringify({ ...parsed, inputImages: newImages });
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
                                newValue = JSON.stringify({ ...parsed, image: thumbnailUrl, prompt: prompt || parsed.prompt || '' });
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
                        imageUrl = getFullSizeImage(node.id, 0) || parsed.image;
                        if (!imageUrl) textToCopy = parsed.prompt || '';
                        else textToCopy = '';
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
                    case NodeType.PROMPT_ANALYZER:
                    case NodeType.CHARACTER_ANALYZER:
                    case NodeType.SCRIPT_GENERATOR:
                    case NodeType.CHARACTER_GENERATOR:
                        textToCopy = JSON.stringify(parsed, null, 2);
                        break;
                    default:
                        textToCopy = node.value;
                }
            } else if ((node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.IMAGE_INPUT) && node.value.startsWith('data:image')) {
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

    const handleAutoDownloadChange = (nodeId: string, enabled: boolean) => {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, autoDownload: enabled } : n));
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
                if (n.dockState) {
                    const { dockState, ...rest } = n;
                    return { ...rest, isPinned: false };
                } else {
                    return {
                        ...n,
                        isPinned: true,
                        dockState: {
                            mode: 'tr',
                            original: {
                                x: n.position.x,
                                y: n.position.y,
                                width: n.width,
                                height: n.height
                            }
                        }
                    };
                }
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
        handleAutoDownloadChange,
        handleSetImageEditorOutputToInput,
        handleRefreshImageEditor,
        handleToggleNodeCollapse,
        handleToggleNodePin,
        handleToggleNodeHandles,
        handleClearNodeNewFlag
    };
};
