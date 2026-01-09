
import { useMemo } from 'react';
import { SCENE_HEADER_HEIGHT, CARD_COLLAPSED_HEIGHT, CARD_EXPANDED_HEIGHT, CARD_EXPANDED_HEIGHT_NO_VIDEO, SHOT_TYPE_INSTRUCTIONS, SCENE_CONTEXT_HEIGHT, SCENE_CONTEXT_COLLAPSED_HEIGHT } from './Constants';

export interface PromptItem {
    frameNumber: number;
    sceneNumber?: number;
    sceneTitle?: string;
    prompt: string;
    videoPrompt?: string;
    characters?: string[];
    duration?: number;
    isCollapsed?: boolean;
    shotType?: string; // Needed for height calc
}

export const usePromptVirtualization = (
    prompts: PromptItem[],
    collapsedScenes: number[],
    scrollTop: number,
    containerHeight: number = 800, // Default fallback
    showVideoPrompts: boolean = true,
    showSceneHeaders: boolean = true, // New parameter
    sceneContexts: Record<string, string> = {}, // New parameter
    expandedSceneContexts: number[] = [] // New parameter
) => {
    // 1. Group prompts by Scene
    const groupedPrompts = useMemo(() => {
        const sorted = [...prompts].sort((a, b) => a.frameNumber - b.frameNumber);
        const grouped: { scene: number, title: string, prompts: PromptItem[] }[] = [];
        let currentScene = -1;
        let currentGroup: { scene: number, title: string, prompts: PromptItem[] } | null = null;

        sorted.forEach((p) => {
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

    // 2. Calculate Virtual Items (Flattened list with positions)
    const virtualItems = useMemo(() => {
        const flattenItems: { type: 'scene_header' | 'scene_context' | 'prompt', h: number, top: number, data: any, scene: number }[] = [];
        let y = 0;
        groupedPrompts.forEach(g => {
             // Add Header only if enabled
             if (showSceneHeaders) {
                 flattenItems.push({ type: 'scene_header', h: SCENE_HEADER_HEIGHT, top: y, data: g, scene: g.scene });
                 y += SCENE_HEADER_HEIGHT;
             }
             
             // Add Prompts if scene not collapsed OR if headers are hidden (flat view implies expanded)
             if (!showSceneHeaders || !collapsedScenes.includes(g.scene)) {
                 
                 // Inject Scene Context Card
                 const contextVal = sceneContexts[String(g.scene)] || '';
                 const contextHeight = expandedSceneContexts.includes(g.scene) ? SCENE_CONTEXT_HEIGHT : SCENE_CONTEXT_COLLAPSED_HEIGHT;
                 
                 // Add margin bottom to context card
                 flattenItems.push({ type: 'scene_context', h: contextHeight + 8, top: y, data: contextVal, scene: g.scene });
                 y += contextHeight + 8;

                 g.prompts.forEach(p => {
                     // Check if this prompt has a shot instruction displayed
                     const shotInstruction = p.shotType ? SHOT_TYPE_INSTRUCTIONS[p.shotType] : undefined;
                     const extraHeight = shotInstruction ? 30 : 0;
                     
                     const expandedHeight = (showVideoPrompts ? CARD_EXPANDED_HEIGHT : CARD_EXPANDED_HEIGHT_NO_VIDEO) + extraHeight;
                     const height = (p.isCollapsed ? CARD_COLLAPSED_HEIGHT : expandedHeight) + 8; // + margin bottom
                     
                     flattenItems.push({ type: 'prompt', h: height, top: y, data: p, scene: g.scene });
                     y += height;
                 });
             }
        });
        return { items: flattenItems, totalHeight: y };
    }, [groupedPrompts, collapsedScenes, showVideoPrompts, showSceneHeaders, sceneContexts, expandedSceneContexts]);

    // 3. Get Visible Items based on scroll
    const visibleItems = useMemo(() => {
        const buffer = 800;
        const visibleRangeStart = Math.max(0, scrollTop - buffer);
        const visibleRangeEnd = scrollTop + containerHeight + buffer;

        return virtualItems.items.filter((item) => {
            const itemBottom = item.top + item.h;
            return itemBottom > visibleRangeStart && item.top < visibleRangeEnd;
        });
    }, [virtualItems, scrollTop, containerHeight]);

    // 4. Helper to find scroll position for a specific frame
    const getScrollPositionForFrame = (frameNumber: number) => {
        const item = virtualItems.items.find(i => i.type === 'prompt' && i.data.frameNumber === frameNumber);
        return item ? item.top : null;
    };

    // 5. Helper to find scroll position for a scene
    const getScrollPositionForScene = (sceneNumber: number) => {
        if (!showSceneHeaders) return null; // Cannot scroll to header if hidden
        const item = virtualItems.items.find(i => i.type === 'scene_header' && i.scene === sceneNumber);
        return item ? item.top : null;
    };

    return {
        groupedPrompts,
        virtualItems,
        visibleItems,
        totalHeight: virtualItems.totalHeight,
        getScrollPositionForFrame,
        getScrollPositionForScene
    };
};
