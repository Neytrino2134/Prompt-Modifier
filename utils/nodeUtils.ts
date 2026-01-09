


import { Node, NodeType, Connection, Point } from '../types';

export const HEADER_HEIGHT = 40;
export const CONTENT_PADDING = 12;
export const COLLAPSED_NODE_HEIGHT = HEADER_HEIGHT + 4; 

export const RATIO_INDICES: Record<string, number> = {
    '1:1': 1,
    '16:9': 2,
    '9:16': 3
};

export const isRestrictedDockingNode = (type: NodeType): boolean => {
    return [
        NodeType.IMAGE_EDITOR,
        NodeType.PROMPT_SEQUENCE_EDITOR,
        NodeType.IMAGE_SEQUENCE_GENERATOR,
        NodeType.POSE_CREATOR
    ].includes(type);
};

// Math Helpers for Intersection Logic
const distanceToSegment = (p: Point, a: Point, b: Point) => {
    const pa = { x: p.x - a.x, y: p.y - a.y };
    const ba = { x: b.x - a.x, y: b.y - a.y };
    const h = Math.max(0, Math.min(1, (pa.x * ba.x + pa.y * ba.y) / (ba.x * ba.x + ba.y * ba.y)));
    const dx = pa.x - h * ba.x;
    const dy = pa.y - h * ba.y;
    return Math.sqrt(dx * dx + dy * dy);
};

const getCubicBezierPoint = (t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point => {
    const k = 1 - t;
    return {
        x: k * k * k * p0.x + 3 * k * k * t * p1.x + 3 * k * t * t * p2.x + t * t * t * p3.x,
        y: k * k * k * p0.y + 3 * k * t * t * p1.y + 3 * k * t * t * p2.y + t * t * t * p3.y
    };
};

export const isPointNearConnection = (
    point: Point,
    start: Point,
    end: Point,
    threshold: number = 20
): boolean => {
    // Spaghetti Style (Bezier) Approximation
    const cp1 = { x: start.x + Math.abs(end.x - start.x) * 0.5, y: start.y };
    const cp2 = { x: end.x - Math.abs(end.x - start.x) * 0.5, y: end.y };
    
    // Sample points along the curve
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = getCubicBezierPoint(t, start, cp1, cp2, end);
        const dist = Math.hypot(point.x - p.x, point.y - p.y);
        if (dist < threshold) return true;
    }
    
    // Fallback: Check direct distance for straight segments or near endpoints
    if (distanceToSegment(point, start, end) < threshold) return true;

    return false;
};

export const calculateGroupBounds = (nodesInGroup: Node[]) => {
    if (nodesInGroup.length === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodesInGroup.forEach(node => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + node.width);
        
        const height = node.isCollapsed ? COLLAPSED_NODE_HEIGHT : node.height;
        maxY = Math.max(maxY, node.position.y + height);
    });

    const padding = 30;
    const paddingTop = 70;

    return {
        position: { x: minX - padding, y: minY - paddingTop },
        width: (maxX - minX) + (padding * 2),
        height: (maxY - minY) + paddingTop + padding
    };
};

export const getOutputHandleType = (node: Node, handleId?: string): 'text' | 'image' | 'character_data' | 'video' | 'audio' | null => {
    switch (node.type) {
        case NodeType.TEXT_INPUT: return 'text';
        case NodeType.IMAGE_INPUT:
            if (handleId === 'text') return 'text';
            return 'image';
        case NodeType.PROMPT_PROCESSOR: return 'text';
        case NodeType.PROMPT_SANITIZER: return 'text';
        case NodeType.VIDEO_PROMPT_PROCESSOR: return 'text';
        case NodeType.TRANSLATOR: return 'text';
        case NodeType.PROMPT_ANALYZER: return 'text';
        case NodeType.CHARACTER_ANALYZER: return 'text';
        case NodeType.CHARACTER_GENERATOR: return 'character_data';
        case NodeType.CHARACTER_CARD: 
            if (handleId === 'image') return 'image';
            if (['prompt', 'appearance', 'personality', 'clothing'].includes(handleId || '')) return 'text';
            if (handleId === 'all_data') return 'character_data';
            if (handleId === 'primary_data') return 'character_data';
            return 'character_data';
        case NodeType.IMAGE_ANALYZER:
            if (handleId === 'image') return 'image';
            if (handleId === 'text') return 'text';
            return null; // Disable default handle to use custom handles in component
        case NodeType.IMAGE_EDITOR: return 'image';
        case NodeType.GEMINI_CHAT: return null;
        case NodeType.IMAGE_OUTPUT: return 'image';
        case NodeType.VIDEO_OUTPUT: return 'video';
        case NodeType.SCRIPT_GENERATOR: return 'text';
        case NodeType.SCRIPT_VIEWER:
            if (handleId === 'all-image-prompts' || handleId === 'all-video-prompts' || handleId === 'full-json') return 'text';
            return 'text';
        case NodeType.PROMPT_SEQUENCE_EDITOR:
             if (handleId === 'all_data') return 'text';
             // Removed 'prompt_data' output
             return null;
        case NodeType.IMAGE_SEQUENCE_GENERATOR:
            if (handleId === 'all_images') return 'image';
            return null;
        case NodeType.NOTE:
             if (handleId === 'all_images') return 'image';
             if (handleId === 'all_captions') return 'text';
             // Removed 'reference_data' output
             return null;
        case NodeType.REROUTE_DOT:
            try {
                const parsed = JSON.parse(node.value || '{}');
                return parsed.type || null;
            } catch {
                return null;
            }
        // Video Editor has no outputs for now
        case NodeType.VIDEO_EDITOR: return 'video';
        case NodeType.MEDIA_VIEWER: 
             try {
                const parsed = JSON.parse(node.value || '{}');
                return parsed.type === 'audio' ? 'audio' : 'video';
            } catch {
                return 'video';
            }
        case NodeType.DATA_PROTECTION: return 'text';
        case NodeType.POSE_CREATOR: return 'image';
        default: return null;
    }
};

export const getInputHandleType = (node: Node, handleId?: string): 'text' | 'image' | 'character_data' | 'video' | 'audio' | null => {
    switch (node.type) {
        case NodeType.TEXT_INPUT: return null;
        case NodeType.PROMPT_PROCESSOR: return 'text';
        case NodeType.PROMPT_SANITIZER: return 'text';
        case NodeType.VIDEO_PROMPT_PROCESSOR: return 'text';
        case NodeType.TRANSLATOR: return 'text';
        case NodeType.PROMPT_ANALYZER: return 'text';
        case NodeType.CHARACTER_ANALYZER: return 'text';
        case NodeType.CHARACTER_GENERATOR: return 'text';
        case NodeType.IMAGE_ANALYZER: return 'image';
        case NodeType.IMAGE_EDITOR: 
            if (handleId === 'image_b') return 'image';
            return handleId as 'text' | 'image';
        case NodeType.IMAGE_OUTPUT: return 'text';
        case NodeType.VIDEO_OUTPUT: return 'text';
        case NodeType.IMAGE_SEQUENCE_GENERATOR:
            if (handleId === 'prompt_input') return 'text';
            return 'character_data';
        case NodeType.GEMINI_CHAT: return 'text'; // Allow feeding text into Chat
        case NodeType.SCRIPT_GENERATOR: return 'text';
        case NodeType.SCRIPT_VIEWER: return null;
        case NodeType.PROMPT_SEQUENCE_EDITOR: 
            // Changed from reference_data to prompts_sequence and ensure it returns text
            if (handleId === 'prompts_sequence') return 'text';
            return null;
        case NodeType.DATA_READER: return null;
        case NodeType.REROUTE_DOT: return null;
        case NodeType.VIDEO_EDITOR: 
            // Specific handles for Video Editor
            if (handleId === 'video') return 'video';
            if (handleId === 'audio') return 'audio';
            if (handleId === 'image') return 'image';
            if (handleId === 'text') return 'text';
            return null; 
        case NodeType.NOTE:
            // Ensure this returns text to unblock connection
            if (handleId === 'prompt_data') return 'text';
            return null;
        case NodeType.MEDIA_VIEWER: return null;
        case NodeType.DATA_PROTECTION: return 'text';
        case NodeType.POSE_CREATOR: return null;
        case NodeType.CHARACTER_CARD: return 'text';
        default: return null;
    }
};

export const getEmptyValueForNodeType = (node: Node): string => {
    const { type } = node;
    switch (type) {
        case NodeType.POSE_CREATOR:
            return JSON.stringify({ 
                image: null, 
                aspectRatio: '1:1', 
                resolution: '1K', 
                joints: [] // Initialized on mount if empty
            });
        case NodeType.VIDEO_EDITOR:
            return JSON.stringify({ 
                currentTime: 0, 
                totalDuration: 30, 
                clips: [], 
                tracks: [{ id: 2, name: 'V2', type: 'video', isMuted: false, isVisible: true }, { id: 1, name: 'V1', type: 'video', isMuted: false, isVisible: true }, { id: 101, name: 'A1', type: 'audio', isMuted: false, isVisible: true }],
                mediaFiles: [],
                isPlaying: false, 
                zoom: 20
            });
        
        // Fallback for others
        case NodeType.TEXT_INPUT:
        case NodeType.PROMPT_SANITIZER:
        case NodeType.IMAGE_OUTPUT:
        case NodeType.VIDEO_OUTPUT:
            return '';
        case NodeType.NOTE: return JSON.stringify({ text: '', references: [], activeTab: 'note' });
        case NodeType.PROMPT_PROCESSOR: return JSON.stringify({ inputPrompt: '', prompt: '', safePrompt: true });
        case NodeType.VIDEO_PROMPT_PROCESSOR: return JSON.stringify({ inputPrompt: '', prompt: '' });
        case NodeType.IMAGE_INPUT: return JSON.stringify({ image: null, prompt: '' });
        case NodeType.PROMPT_ANALYZER: return JSON.stringify({ environment: '', characters: [], action: '', emotion: '', style: '', softPrompt: false });
        case NodeType.CHARACTER_ANALYZER: return JSON.stringify({ character: '', clothing: '' });
        case NodeType.CHARACTER_GENERATOR: return JSON.stringify({ prompt: '', characters: [] });
        case NodeType.CHARACTER_CARD: return JSON.stringify([{ name: 'New Entity 1', index: 'Entity-1', image: null, thumbnails: { '1:1': null, '16:9': null, '9:16': null }, selectedRatio: '1:1', prompt: '', fullDescription: '' }]);
        case NodeType.IMAGE_ANALYZER: return JSON.stringify({ image: null, description: '', softPrompt: false });
        case NodeType.IMAGE_SEQUENCE_GENERATOR: return JSON.stringify({ prompts: [], images: {}, currentIndex: -1, isGenerating: false, autoDownload: false, selectedFrameNumber: null, frameStatuses: {}, aspectRatio: '16:9', characterConcepts: [], model: 'gemini-2.5-flash-image', characterPromptCombination: 'replace', enableAspectRatio: false, isStyleCollapsed: true, checkedFrameNumbers: [], topPaneHeight: 440, leftPaneWidth: 570, autoCrop169: true });
        case NodeType.PROMPT_SEQUENCE_EDITOR: return JSON.stringify({ instruction: '', sourcePrompts: [], modifiedPrompts: [], leftPaneWidth: 500, checkedSourceFrameNumbers: [], selectedFrameNumber: null, targetLanguage: 'en', modificationModel: 'gemini-3-flash-preview', sceneContexts: {}, expandedSceneContexts: [] });
        case NodeType.IMAGE_EDITOR: return JSON.stringify({ inputImages: [], prompt: '', outputImage: null, aspectRatio: '1:1', enableAspectRatio: false, enableOutpainting: false, outpaintingPrompt: '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.', model: 'gemini-2.5-flash-image', autoDownload: true, autoCrop169: false, leftPaneWidth: 360, topPaneHeight: 330 });
        case NodeType.GEMINI_CHAT: return JSON.stringify({ messages: [], currentInput: '', lastPrompt: '' });
        case NodeType.TRANSLATOR: return JSON.stringify({ targetLanguage: 'ru', inputText: '', translatedText: '', image: null });
        case NodeType.SCRIPT_GENERATOR: return JSON.stringify({ prompt: '', summary: '', detailedCharacters: [], scenes: [], targetLanguage: 'en' });
        case NodeType.SCRIPT_VIEWER: return '{}';
        case NodeType.REROUTE_DOT: return JSON.stringify({ type: null });
        case NodeType.DATA_READER: return JSON.stringify({ text: '', image: null });
        case NodeType.MEDIA_VIEWER: return JSON.stringify({ src: '', type: 'video', name: '', markers: [], volume: 0.4 });
        case NodeType.DATA_PROTECTION: return JSON.stringify({ score: 0, bits: 100, survivedWords: [] });
        case NodeType.POSE_CREATOR: return JSON.stringify({ joints: [], aspectRatio: '1:1', resolution: '1K', renderedImage: null, aiPrompt: '' });
        default: return '';
    }
};

export const getDuplicatedValueForNodeType = (node: Node): string => {
    const { type, value } = node;
    const emptyValue = getEmptyValueForNodeType(node);

    try {
        const parsedOriginal = JSON.parse(value || '{}');
        const parsedEmpty = JSON.parse(emptyValue);

        switch (type) {
             case NodeType.POSE_CREATOR:
                return JSON.stringify({
                    ...parsedEmpty,
                    joints: parsedOriginal.joints || parsedEmpty.joints,
                    aspectRatio: parsedOriginal.aspectRatio || parsedEmpty.aspectRatio,
                    resolution: parsedOriginal.resolution || parsedEmpty.resolution
                });
             case NodeType.VIDEO_EDITOR:
                return JSON.stringify({
                    ...parsedEmpty,
                    tracks: parsedOriginal.tracks || parsedEmpty.tracks,
                    totalDuration: parsedOriginal.totalDuration || 30,
                    mediaFiles: parsedOriginal.mediaFiles || []
                });
             case NodeType.PROMPT_PROCESSOR: return JSON.stringify({ inputPrompt: parsedOriginal.inputPrompt || '', prompt: '', safePrompt: parsedOriginal.safePrompt !== undefined ? parsedOriginal.safePrompt : true });
             case NodeType.VIDEO_PROMPT_PROCESSOR: return JSON.stringify({ inputPrompt: parsedOriginal.inputPrompt || '', prompt: '' });
             case NodeType.TRANSLATOR: return JSON.stringify({ ...parsedEmpty, targetLanguage: parsedOriginal.targetLanguage || 'ru' });
             case NodeType.IMAGE_EDITOR: return JSON.stringify({ ...parsedEmpty, aspectRatio: parsedOriginal.aspectRatio || '1:1', enableAspectRatio: parsedOriginal.enableAspectRatio !== undefined ? parsedOriginal.enableAspectRatio : false, enableOutpainting: parsedOriginal.enableOutpainting !== undefined ? parsedOriginal.enableOutpainting : false, outpaintingPrompt: parsedOriginal.outpaintingPrompt || '{main_prompt}. Fill the background with environment - fill in the white areas to naturally expand the image area of the original scene.', model: parsedOriginal.model || 'gemini-2.5-flash-image', autoDownload: parsedOriginal.autoDownload !== undefined ? parsedOriginal.autoDownload : true, autoCrop169: parsedOriginal.autoCrop169 !== undefined ? parsedOriginal.autoCrop169 : false, leftPaneWidth: parsedOriginal.leftPaneWidth || 360, topPaneHeight: parsedOriginal.topPaneHeight || 330 });
             case NodeType.IMAGE_SEQUENCE_GENERATOR: return JSON.stringify({ ...parsedEmpty, prompts: [], characterConcepts: parsedOriginal.characterConcepts || [], aspectRatio: parsedOriginal.aspectRatio || '16:9', autoDownload: parsedOriginal.autoDownload || false, model: parsedOriginal.model || 'gemini-2.5-flash-image', topPaneHeight: parsedOriginal.topPaneHeight || 440, leftPaneWidth: parsedOriginal.leftPaneWidth || 570, enableAspectRatio: parsedOriginal.enableAspectRatio !== undefined ? parsedOriginal.enableAspectRatio : false, isStyleCollapsed: parsedOriginal.isStyleCollapsed !== undefined ? parsedOriginal.isStyleCollapsed : true, autoCrop169: parsedOriginal.autoCrop169 !== undefined ? parsedOriginal.autoCrop169 : true });
             case NodeType.CHARACTER_CARD: return JSON.stringify({ ...parsedEmpty, name: parsedOriginal.name, index: parsedOriginal.index, prompt: parsedOriginal.prompt, fullDescription: parsedOriginal.fullDescription, selectedRatio: parsedOriginal.selectedRatio });
             case NodeType.NOTE: return emptyValue;
             case NodeType.PROMPT_SEQUENCE_EDITOR: return JSON.stringify({ ...parsedEmpty, targetLanguage: parsedOriginal.targetLanguage, modificationModel: parsedOriginal.modificationModel, leftPaneWidth: parsedOriginal.leftPaneWidth || 500 });
             case NodeType.MEDIA_VIEWER: return emptyValue; // Return empty value for Media Viewer duplication
             case NodeType.DATA_PROTECTION: return emptyValue; // Reset game state on duplicate
            default: return emptyValue;
        }
    } catch (e) {
        return emptyValue;
    }
};

export const getMinNodeSize = (nodeType: NodeType): { minWidth: number, minHeight: number } => {
    switch (nodeType) {
        case NodeType.POSE_CREATOR: return { minWidth: 600, minHeight: 800 };
        case NodeType.VIDEO_EDITOR: return { minWidth: 920, minHeight: 640 };
        case NodeType.TEXT_INPUT: return { minWidth: 460, minHeight: 300 };
        case NodeType.IMAGE_INPUT: return { minWidth: 460, minHeight: 340 };
        case NodeType.PROMPT_PROCESSOR: return { minWidth: 460, minHeight: 410 };
        case NodeType.PROMPT_SANITIZER: return { minWidth: 460, minHeight: 280 };
        case NodeType.VIDEO_PROMPT_PROCESSOR: return { minWidth: 460, minHeight: 410 };
        case NodeType.IMAGE_OUTPUT: return { minWidth: 460, minHeight: 700 };
        case NodeType.VIDEO_OUTPUT: return { minWidth: 460, minHeight: 680 };
        case NodeType.PROMPT_ANALYZER: return { minWidth: 460, minHeight: 1000 };
        case NodeType.CHARACTER_ANALYZER: return { minWidth: 460, minHeight: 500 };
        case NodeType.CHARACTER_GENERATOR: return { minWidth: 500, minHeight: 840 };
        case NodeType.CHARACTER_CARD: return { minWidth: 520, minHeight: 960 };
        case NodeType.IMAGE_ANALYZER: return { minWidth: 460, minHeight: 680 };
        case NodeType.IMAGE_EDITOR: return { minWidth: 1000, minHeight: 920 };
        case NodeType.IMAGE_SEQUENCE_GENERATOR: return { minWidth: 1300, minHeight: 920 };
        case NodeType.PROMPT_SEQUENCE_EDITOR: return { minWidth: 1300, minHeight: 920 };
        case NodeType.GEMINI_CHAT: return { minWidth: 400, minHeight: 640 };
        case NodeType.TRANSLATOR: return { minWidth: 380, minHeight: 640 };
        case NodeType.SCRIPT_GENERATOR: return { minWidth: 500, minHeight: 1000 };
        case NodeType.SCRIPT_VIEWER: return { minWidth: 500, minHeight: 600 };
        case NodeType.NOTE: return { minWidth: 460, minHeight: 660 };
        case NodeType.REROUTE_DOT: return { minWidth: 60, minHeight: 40 };
        case NodeType.DATA_READER: return { minWidth: 400, minHeight: 500 };
        case NodeType.MEDIA_VIEWER: return { minWidth: 480, minHeight: 320 };
        case NodeType.DATA_PROTECTION: return { minWidth: 800, minHeight: 600 };
        default: return { minWidth: 200, minHeight: 150 };
    }
};

export const getConnectionPoints = (fromNode: Node, toNode: Node, connection: Connection): { start: { x: number; y: number }, end: { x: number; y: number } } => {
    
    // Internal helper to keep logic consistent for external usage if needed
    const getHandlePosition = (node: Node, handleId: string | undefined, isInput: boolean): Point => {
        const isCollapsed = node.isCollapsed;
        if (node.type === NodeType.REROUTE_DOT) {
             let isRL = false;
             try { isRL = JSON.parse(node.value || '{}').direction === 'RL'; } catch {}
             return { x: node.position.x + (isInput ? (isRL ? node.width : 0) : (isRL ? 0 : node.width)), y: node.position.y + node.height / 2 };
        }

        if (node.dockState) {
            const x = isInput ? 0 : 160;
            let handles: (string | undefined)[] = isInput ? [undefined] : [undefined];
            if (node.type === NodeType.IMAGE_EDITOR && isInput) handles = ['image', 'text'];
            else if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR && isInput) handles = ['character_data', 'prompt_input'];
            let idx = handles.indexOf(handleId); if (idx === -1) idx = 0;
            return { x: node.position.x + x, y: node.position.y + (idx + 1) * (48 / (handles.length + 1)) };
        }
        
        const min = getMinNodeSize(node.type);
        const w = Math.max(node.width, min.minWidth);
        const h = isCollapsed ? COLLAPSED_NODE_HEIGHT : Math.max(node.height, min.minHeight);
        const x = isInput ? 0 : w;
        let y = h / 2;

        if (isCollapsed) {
            if (node.type === NodeType.CHARACTER_CARD && !isInput) {
                // Collapsed CHARACTER_CARD Handles
                const dataHandles = ['all_data', 'primary_data'];
                const propHandles = ['image', 'prompt', 'appearance', 'personality', 'clothing'];
                
                let activeHandles = [...dataHandles, ...propHandles];
                
                // --- NEW: Respect collapsedHandles property for coordinates ---
                if (node.collapsedHandles) {
                    activeHandles = dataHandles;
                }
                
                const handleIndex = activeHandles.indexOf(handleId || '');
                if (handleIndex !== -1) {
                    // Match visual calculation: HEADER_HEIGHT + (step * (index + 1))
                    // Visual uses node.height in expanded, but COLLAPSED_NODE_HEIGHT in collapsed
                    // The standard collapsed rendering usually divides height evenly.
                    // Let's stick to standard even division for collapsed nodes as per visual.
                    y = (handleIndex + 1) * (COLLAPSED_NODE_HEIGHT / (activeHandles.length + 1));
                } else {
                    y = COLLAPSED_NODE_HEIGHT / 2;
                }
            } else if (node.type === NodeType.VIDEO_EDITOR && isInput) {
                // Collapsed VIDEO_EDITOR Handles (match order in NodeHandles)
                // Order: Video, Audio, Image, Text
                const ids = ['video', 'audio', 'image', 'text'];
                const handleIndex = ids.indexOf(handleId || '');
                if (handleIndex !== -1) {
                     y = (handleIndex + 1) * (COLLAPSED_NODE_HEIGHT / (ids.length + 1));
                } else {
                     y = COLLAPSED_NODE_HEIGHT / 2;
                }
            } else {
                y = COLLAPSED_NODE_HEIGHT / 2;
            }
        } else {
            if (node.type === NodeType.IMAGE_EDITOR && isInput) {
                // PARSE NODE VALUE FOR MODES
                let topPaneHeight = 330;
                let isSeqCombo = false;
                let isSeqEditPrompts = false;
                
                try {
                     const val = JSON.parse(node.value || '{}');
                     if (val.topPaneHeight) topPaneHeight = val.topPaneHeight;
                     isSeqCombo = val.isSequenceMode && val.isSequentialCombinationMode;
                     isSeqEditPrompts = val.isSequenceMode && val.isSequentialEditingWithPrompts;
                } catch {}

                const topY = HEADER_HEIGHT + CONTENT_PADDING;
                
                if (handleId === 'image') {
                    // Logic MUST match NodeHandles.tsx:
                    // If SeqCombo: 25%
                    // If SeqEditPrompts: -1000 (Hidden)
                    // Else: 50%
                    if (isSeqEditPrompts) y = h / 2; // Fallback, visually hidden
                    else if (isSeqCombo) y = topY + (topPaneHeight * 0.25);
                    else y = topY + (topPaneHeight * 0.5);
                }
                else if (handleId === 'image_b') {
                    // If SeqCombo: 75%
                    // If SeqEditPrompts: 50%
                    // Else: Hidden
                    if (isSeqCombo) y = topY + (topPaneHeight * 0.75);
                    else if (isSeqEditPrompts) y = topY + (topPaneHeight * 0.5);
                    else y = h / 2; // Fallback
                }
                else if (handleId === 'text') {
                    // Bottom Section
                    const resizerHeight = 16;
                    const textTop = topY + topPaneHeight + resizerHeight;
                    // Remaining height
                    const textH = h - textTop - CONTENT_PADDING;
                    y = textTop + (textH / 2);
                }
            } else if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR && isInput) {
                let conceptsMode = 'normal';
                try {
                    const val = JSON.parse(node.value || '{}');
                    if (val.conceptsMode) conceptsMode = val.conceptsMode;
                } catch {}

                let conceptsHeight = 390; // Default Normal
                if (conceptsMode === 'collapsed') conceptsHeight = 37;
                else if (conceptsMode === 'expanded') conceptsHeight = h - HEADER_HEIGHT - CONTENT_PADDING;

                const topSectionTop = HEADER_HEIGHT + CONTENT_PADDING;
                
                if (handleId === 'character_data') {
                    y = topSectionTop + (conceptsHeight / 2);
                } else if (handleId === 'prompt_input') {
                    // If expanded, prompts hidden/pushed down
                    if (conceptsMode === 'expanded') {
                         y = h - 10; // Bottom edge
                    } else {
                        const gap = 8; // pt-2 in LeftPane
                        const bottomSectionTop = topSectionTop + conceptsHeight + gap;
                        y = bottomSectionTop + ((h - bottomSectionTop - CONTENT_PADDING) / 2);
                    }
                }
            } else if (node.type === NodeType.VIDEO_EDITOR && isInput) {
                // Video Editor Handles Layout
                // Header is ~40px
                const startY = HEADER_HEIGHT + 20; // 60px
                const step = 50;
                
                if (handleId === 'video') y = startY;           // 60px
                else if (handleId === 'audio') y = startY + step; // 110px
                else if (handleId === 'image') y = startY + step * 2; // 160px
                else if (handleId === 'text') y = startY + step * 3; // 210px
                else y = h / 2; // Fallback
            } else if (node.type === NodeType.IMAGE_INPUT && !isInput) {
                // Expanded IMAGE_INPUT Output Handles Calculation
                // Matches logic in NodeHandles.tsx
                const contentHeight = h - HEADER_HEIGHT - 2 * CONTENT_PADDING;
                const availableContentHeight = Math.max(0, contentHeight);
                
                if (handleId === 'image') {
                    // Positioned at 1/4 of the content area below header
                    y = HEADER_HEIGHT + CONTENT_PADDING + (availableContentHeight / 4);
                } else if (handleId === 'text') {
                     // Positioned near bottom
                     y = h - 80;
                }
            } else if (node.type === NodeType.CHARACTER_CARD && !isInput) {
                const dataHandles = ['all_data', 'primary_data'];
                const propHandles = ['image', 'prompt', 'appearance', 'personality', 'clothing'];
                
                let activeHandles = [...dataHandles, ...propHandles];
                
                // Only show data handles if collapsedHandles is true
                if (node.collapsedHandles) {
                    activeHandles = dataHandles;
                }
                
                const contentHeight = h - HEADER_HEIGHT - 20;
                const step = contentHeight / (activeHandles.length + 1);
                
                const handleIndex = activeHandles.indexOf(handleId || '');
                if (handleIndex !== -1) {
                     y = HEADER_HEIGHT + (step * (handleIndex + 1));
                }
            } else if (node.type === NodeType.PROMPT_ANALYZER && !isInput) {
                try {
                    const parsed = JSON.parse(node.value || '{}');
                    const charCount = parsed.characters?.length || 0;
                    const total = 4 + charCount;
                    let idx = 0;
                    if (handleId === 'environment') idx = 0;
                    else if (handleId?.startsWith('character-')) idx = 1 + parseInt(handleId.split('-')[1]);
                    else if (handleId === 'action') idx = 1 + charCount;
                    else if (handleId === 'emotion') idx = 2 + charCount;
                    else if (handleId === 'style') idx = 3 + charCount;
                    y = HEADER_HEIGHT + CONTENT_PADDING + ((h - HEADER_HEIGHT - 60) / total) * (idx + 0.5);
                } catch {}
            } else if (node.type === NodeType.IMAGE_ANALYZER && !isInput) {
                 const contentHeight = h - HEADER_HEIGHT - 2 * CONTENT_PADDING;
                 const spacing = 8;
                 const paneHeight = (contentHeight - spacing) / 2;
                 const imagePaneTop = HEADER_HEIGHT + CONTENT_PADDING;
                 
                 if (handleId === 'image') {
                     y = imagePaneTop + paneHeight / 2;
                 } else if (handleId === 'text') {
                     y = imagePaneTop + paneHeight + spacing + paneHeight / 2;
                 }
            }
        }
        return { x: node.position.x + x, y: node.position.y + y };
    };

    return { start: getHandlePosition(fromNode, connection.fromHandleId, false), end: getHandlePosition(toNode, connection.toHandleId, true) };
};