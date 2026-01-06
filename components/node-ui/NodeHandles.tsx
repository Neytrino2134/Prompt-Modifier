
import React, { useMemo } from 'react';
import { Node, NodeType } from '../../types';
import { getInputHandleType, getOutputHandleType, COLLAPSED_NODE_HEIGHT, HEADER_HEIGHT, CONTENT_PADDING } from '../../utils/nodeUtils';

interface HandleProps {
  node: Node;
  getHandleColor: (type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null, handleId?: string) => string;
  handleCursor: string;
  t: (key: string) => string;
  isHovered: boolean;
  isCollapsed?: boolean;
  isProxy?: boolean;
  onOutputHandleMouseDown?: (e: React.MouseEvent<HTMLDivElement>, nodeId: string, handleId?: string) => void;
  onOutputHandleTouchStart?: (e: React.TouchEvent<HTMLDivElement>, nodeId: string, handleId?: string) => void;
  connectedInputType?: string; // New prop for Data Reader coloring
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute z-50 px-2 py-1 text-sm transition-opacity duration-200 ease-out opacity-0 pointer-events-none left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-700 text-slate-200 whitespace-nowrap rounded-md shadow-xl group-hover/handle:opacity-100">
        {text}
    </div>
);

const OutputTooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute z-50 px-2 py-1 text-sm transition-opacity duration-200 ease-out opacity-0 pointer-events-none right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-700 text-slate-200 whitespace-nowrap rounded-md shadow-xl group-hover/handle:opacity-100">
        {text}
    </div>
);

export const InputHandles: React.FC<HandleProps> = ({ node, getHandleColor, handleCursor, isCollapsed, isProxy, connectedInputType }) => {
    
    // Memoize parsed values to avoid repeated JSON.parse
    const imageEditorState = React.useMemo(() => {
        if (node.type === NodeType.IMAGE_EDITOR) {
            try {
                return JSON.parse(node.value || '{}');
            } catch { return {}; }
        }
        return {};
    }, [node.value, node.type]);

    const isImageEditorSequential = React.useMemo(() => {
        if (node.type === NodeType.IMAGE_EDITOR) {
            // Input B is needed for Combination Mode OR Sequential Editing with Prompts
            return imageEditorState.isSequenceMode && (imageEditorState.isSequentialCombinationMode || imageEditorState.isSequentialEditingWithPrompts);
        }
        return false;
    }, [node.type, imageEditorState]);
    
    const isSequentialEditingWithPrompts = React.useMemo(() => {
         if (node.type === NodeType.IMAGE_EDITOR) {
            return imageEditorState.isSequenceMode && imageEditorState.isSequentialEditingWithPrompts;
         }
         return false;
    }, [node.type, imageEditorState]);

    // Reroute Dot Direction Logic
    const isRerouteDot = node.type === NodeType.REROUTE_DOT;
    const isRL = React.useMemo(() => {
        if (!isRerouteDot) return false;
        try {
            const parsed = JSON.parse(node.value || '{}');
            return parsed.direction === 'RL';
        } catch { return false; }
    }, [isRerouteDot, node.value]);

    // Calculate left position based on direction
    // If RL, input is on the RIGHT (100% or similar)
    const handleLeftStyle = isRL ? { right: '-10px', left: 'auto' } : { left: '-10px' };
    
    // Override type for styling if connected (e.g. Data Reader)
    const getEffectiveType = (handleType: any) => {
        if (node.type === NodeType.DATA_READER && connectedInputType) {
            return connectedInputType as any;
        }
        return handleType;
    };

    const renderHandle = (handle: { handleId?: string; type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null; title: string }, top: string | number, key: string) => (
        <div 
            key={key} 
            style={{ top, cursor: handleCursor, ...handleLeftStyle }} 
            className={`absolute w-5 h-5 rounded-full border-2 border-gray-900 transform -translate-y-1/2 ${getHandleColor(getEffectiveType(handle.type), handle.handleId)} group/handle transition-[transform,border-color,background-color] duration-200 hover:scale-125 hover:border-white hover:z-20`}
            data-is-input-handle="true"
            data-node-id={node.id}
            data-handle-id={handle.handleId || ''}
            data-handle-type={handle.type || ''}
        >
            <Tooltip text={handle.title} />
        </div>
    );

    // --- Proxy Mode Handles ---
    if (isProxy) {
        let handles: { handleId?: string; type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null; title: string }[] = [];
        if (node.type === NodeType.IMAGE_EDITOR) {
             if (!isSequentialEditingWithPrompts) {
                 handles.push({ handleId: 'image', type: 'image', title: 'Image' });
             }
             if (isImageEditorSequential) {
                 handles.push({ handleId: 'image_b', type: 'image', title: 'Image B' });
             }
             handles.push({ handleId: 'text', type: 'text', title: 'Text' });
        } else if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
             handles = [{ handleId: 'character_data', type: 'character_data', title: 'Character Data Input' }, { handleId: 'prompt_input', type: 'text', title: 'Text' }];
        } else if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
             handles = [{ handleId: 'prompts_sequence', type: 'text', title: 'Prompts Sequence Input' }];
        } else if (node.type === NodeType.NOTE) {
             handles = [{ handleId: 'prompt_data', type: 'text', title: 'Prompt Input' }];
        } else if (node.type === NodeType.VIDEO_EDITOR) {
             handles = [
                 { handleId: 'video', type: 'video', title: 'Video' }, 
                 { handleId: 'audio', type: 'audio', title: 'Audio' }, 
                 { handleId: 'image', type: 'image', title: 'Image' }, 
                 { handleId: 'text', type: 'text', title: 'Text' }
             ];
        } else if (node.type === NodeType.CHARACTER_CARD) {
             handles = [{ handleId: undefined, type: 'text', title: 'Input' }];
        } else {
             const inputType = getInputHandleType(node, undefined);
             if (inputType !== null || node.type === NodeType.REROUTE_DOT || node.type === NodeType.DATA_READER) {
                 handles = [{ handleId: undefined, type: inputType, title: 'Input' }];
             }
        }
        
        if (handles.length === 0) return null;
        
        return (<> {handles.map((handle, index) => {
            const step = 48 / (handles.length + 1);
            return renderHandle(handle, `${(index + 1) * step}px`, handle.handleId || `proxy-in-${index}`);
        })} </>);
    }

    // --- Collapsed Mode Handles ---
    if (isCollapsed) {
        let handles: { handleId?: string; type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null; title: string }[] = [];
        if (node.type === NodeType.IMAGE_EDITOR) {
            // Order: image, image_b (if seq), text
            // Hide 'image' (Input A) if Sequential Editing With Prompts is enabled
            if (!isSequentialEditingWithPrompts) {
                handles.push({ handleId: 'image', type: 'image', title: 'Image Input A' });
            }
            
            if (isImageEditorSequential) {
                handles.push({ handleId: 'image_b', type: 'image', title: 'Image Input B' });
            }
            
            handles.push({ handleId: 'text', type: 'text', title: 'Text Input' });

        } else if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
            handles = [
                { handleId: 'character_data', type: 'character_data', title: 'Character Data Input' },
                { handleId: 'prompt_input', type: 'text', title: 'Prompts JSON Input' }
            ];
        } else if (node.type === NodeType.NOTE) {
             try {
                const parsed = JSON.parse(node.value || '{}');
                if (parsed.activeTab === 'note') return null;
             } catch {}
             handles = [{ handleId: 'prompt_data', type: 'text', title: 'Prompt Data Input' }];
        } else if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
             handles = [{ handleId: 'prompts_sequence', type: 'text', title: 'Prompts Sequence Input' }];
        } else if (node.type === NodeType.VIDEO_EDITOR) {
             handles = [
                 { handleId: 'video', type: 'video', title: 'Video Input' }, 
                 { handleId: 'audio', type: 'audio', title: 'Audio Input' }, 
                 { handleId: 'image', type: 'image', title: 'Image Input' }, 
                 { handleId: 'text', type: 'text', title: 'Text Input' }
             ];
        } else { 
            const inputType = getInputHandleType(node, undefined); 
            if (inputType !== null || node.type === NodeType.REROUTE_DOT || node.type === NodeType.DATA_READER) {
                handles = [{ handleId: undefined, type: inputType, title: 'Input' }]; 
            }
        }
        if (handles.length === 0) return null;
        return (<> {handles.map((handle, index) => renderHandle(handle, `${(index + 1) * (COLLAPSED_NODE_HEIGHT / (handles.length + 1))}px`, handle.handleId || `input-${index}`))} </>);
    }

    // --- Expanded Mode Handles (Specific Layouts) ---
    if (node.type === NodeType.IMAGE_EDITOR) {
        let topPaneHeight = 330; 
        if (imageEditorState.topPaneHeight) topPaneHeight = imageEditorState.topPaneHeight;

        const realImageSectionTop = HEADER_HEIGHT + CONTENT_PADDING;
        let imageHandleY; 
        let imageBHandleY;
        
        if (isImageEditorSequential) {
             imageHandleY = realImageSectionTop + (topPaneHeight * 0.25);
             imageBHandleY = realImageSectionTop + (topPaneHeight * 0.75);
        } else {
             imageHandleY = realImageSectionTop + (topPaneHeight * 0.5);
        }

        const resizerHeight = 16; 
        const realTextSectionTop = realImageSectionTop + topPaneHeight + resizerHeight; 
        const contentBottom = node.height - CONTENT_PADDING;
        const textSectionHeight = contentBottom - realTextSectionTop;
        const textHandleY = realTextSectionTop + (textSectionHeight / 2);
        
        return (
            <>
                {/* Hide Input A handle in Sequential Editing With Prompts mode */}
                {!isSequentialEditingWithPrompts && renderHandle({ type: 'image', handleId: 'image', title: isImageEditorSequential ? 'Image Input A' : 'Image Input' }, `${imageHandleY}px`, 'image')}
                
                {isImageEditorSequential && imageBHandleY && renderHandle({ type: 'image', handleId: 'image_b', title: 'Image Input B' }, `${imageBHandleY}px`, 'image_b')}
                
                {renderHandle({ type: 'text', handleId: 'text', title: 'Text Input' }, `${textHandleY}px`, 'text')}
            </>
        );
    }
    
    if (node.type === NodeType.VIDEO_EDITOR) {
        // Video Editor Handles Layout
        // Header is ~40px
        const startY = HEADER_HEIGHT + 20; // 60px
        const step = 50;

        return (
            <>
                {renderHandle({ type: 'video', handleId: 'video', title: 'Video Input' }, `${startY}px`, 'video')}
                {renderHandle({ type: 'audio', handleId: 'audio', title: 'Audio Input' }, `${startY + step}px`, 'audio')}
                {renderHandle({ type: 'image', handleId: 'image', title: 'Image Input' }, `${startY + step * 2}px`, 'image')}
                {renderHandle({ type: 'text', handleId: 'text', title: 'Text Input' }, `${startY + step * 3}px`, 'text')}
            </>
        );
    }

    if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
        let conceptsMode = 'normal';
        try {
             const val = JSON.parse(node.value || '{}');
             if (val.conceptsMode) conceptsMode = val.conceptsMode;
        } catch {}

        let conceptsHeight = 390; // Normal
        if (conceptsMode === 'collapsed') conceptsHeight = 37;
        else if (conceptsMode === 'expanded') conceptsHeight = node.height - HEADER_HEIGHT - CONTENT_PADDING;
        
        const topSectionTop = HEADER_HEIGHT + CONTENT_PADDING;
        // Center of Concepts pane
        const handle1Y = topSectionTop + (conceptsHeight / 2);
        
        const gap = 8; // pt-2 padding in LeftPane
        const bottomSectionTop = topSectionTop + conceptsHeight + gap;
        // Center of Prompt pane
        const handle2Y = bottomSectionTop + ((node.height - bottomSectionTop - CONTENT_PADDING) / 2);

        return (<>
            {renderHandle({ type: 'character_data', handleId: 'character_data', title: 'Character Data Input' }, `${handle1Y}px`, 'character_data')}
            {/* Hide Prompt Handle if Concepts Expanded covers it */}
            {conceptsMode !== 'expanded' && renderHandle({ type: 'text', handleId: 'prompt_input', title: 'Prompts JSON Input' }, `${handle2Y}px`, 'prompt_input')}
        </>);
    }
    if (node.type === NodeType.NOTE) {
        try {
            const parsed = JSON.parse(node.value || '{}');
            if (parsed.activeTab === 'note') return null;
        } catch {}
        
        const y = 80 + (node.height - 80) / 2;
        return renderHandle({ type: 'text', handleId: 'prompt_data', title: 'Prompt Data Input' }, `${y}px`, 'prompt_data');
    }
    if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
         return renderHandle({ type: 'text', handleId: 'prompts_sequence', title: 'Prompts Sequence Input' }, '50%', 'prompts_sequence');
    }

    const inputType = getInputHandleType(node, undefined);
    if (inputType === null) { 
        if (node.type === NodeType.REROUTE_DOT || node.type === NodeType.DATA_READER) return renderHandle({ type: null, handleId: undefined, title: 'Any Input' }, '50%', 'any');
        return null;
    }
    
    let title = 'Input';
    if (inputType === 'image') title = 'Image Input';
    else if (inputType === 'character_data') title = 'Character Data Input';
    else if (inputType === 'text') title = 'Text Input';
    else if (inputType === 'video') title = 'Video Input';
    else if (inputType === 'audio') title = 'Audio Input';

    return renderHandle({ 
        type: inputType, 
        handleId: undefined, 
        title: title
    }, '50%', 'default');
};

export const OutputHandles: React.FC<HandleProps> = ({ node, getHandleColor, handleCursor, onOutputHandleMouseDown, onOutputHandleTouchStart, t, isCollapsed, isProxy }) => {
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handleId?: string) => { e.stopPropagation(); onOutputHandleMouseDown && onOutputHandleMouseDown(e, node.id, handleId); };
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, handleId?: string) => { e.stopPropagation(); onOutputHandleTouchStart && onOutputHandleTouchStart(e, node.id, handleId); };
    
    const parsedValue = useMemo(() => {
        try {
            return JSON.parse(node.value || '{}');
        } catch {
            return {};
        }
    }, [node.value]);

    // Reroute Dot Direction Logic
    const isRerouteDot = node.type === NodeType.REROUTE_DOT;
    const isRL = React.useMemo(() => {
        if (!isRerouteDot) return false;
        try {
            const parsed = JSON.parse(node.value || '{}');
            return parsed.direction === 'RL';
        } catch { return false; }
    }, [isRerouteDot, node.value]);

    // Calculate left/right position based on direction
    const handleStyle = isRL ? { left: '-10px', right: 'auto' } : { right: '-10px' };

    const renderHandle = (handle: { handleId?: string; type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null; title: string }, top: string | number, key: string) => (
        <div 
            key={key} 
            onMouseDown={(e) => handleMouseDown(e, handle.handleId)} 
            onTouchStart={(e) => handleTouchStart(e, handle.handleId)} 
            style={{ top, cursor: handleCursor, ...handleStyle }} 
            className={`absolute w-5 h-5 rounded-full border-2 border-gray-900 transform -translate-y-1/2 ${getHandleColor(handle.type, handle.handleId)} group/handle transition-[transform,border-color,background-color] duration-200 hover:scale-125 hover:border-white hover:z-20`}
        >
            <OutputTooltip text={handle.title} />
        </div>
    );

    // --- Proxy Mode Outputs ---
    if (isProxy) {
        let handles: { handleId?: string; type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null; title: string }[] = [];
        const outputType = getOutputHandleType(node, undefined);
        if (node.type === NodeType.IMAGE_EDITOR) {
             handles = [{ handleId: undefined, type: 'image', title: 'Output' }];
        } else if (node.type === NodeType.CHARACTER_GENERATOR) {
             handles = [{ handleId: 'character-0', type: 'character_data', title: 'Characters' }];
        } else if (node.type === NodeType.NOTE) {
             handles = [{ handleId: 'all_images', type: 'image', title: 'Images' }, { handleId: 'all_captions', type: 'text', title: 'Captions' }];
        } else if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
             handles = [{ handleId: 'all_data', type: 'text', title: 'All Data' }];
        } else if (node.type === NodeType.CHARACTER_CARD) {
             handles = [{ handleId: 'all_data', type: 'character_data', title: 'All Data' }];
        } else if (outputType !== null || node.type === NodeType.REROUTE_DOT) {
             handles = [{ handleId: undefined, type: outputType, title: 'Output' }];
        }
        
        if (handles.length === 0) return null;
        
        return (<> {handles.map((handle, index) => {
             const step = 48 / (handles.length + 1);
             return renderHandle(handle, `${(index + 1) * step}px`, handle.handleId || `proxy-out-${index}`);
        })} </>);
    }

    // --- Collapsed Mode Outputs ---
    if (isCollapsed) {
        let handles: { handleId?: string; type: 'text' | 'image' | 'character_data' | 'video' | 'audio' | null; title: string }[] = [];
        if (node.type === NodeType.PROMPT_ANALYZER) {
            const { characters = [] } = parsedValue;
            const handleIds = ['environment', ...characters.map((_: any, i: number) => `character-${i}`), 'action', 'emotion', 'style'];
            handles = handleIds.map(id => ({ handleId: id, type: 'text', title: id.startsWith('character-') ? `${t('node.content.character')} ${parseInt(id.split('-')[1], 10) + 1}` : t(`node.content.${id}`) }));
        } else if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
            handles = [
                { handleId: 'all_data', type: 'text' as const, title: t('node.output.allPromptData') },
            ];
        } else if (node.type === NodeType.CHARACTER_ANALYZER) {
            handles = [
                { handleId: 'character', type: 'text', title: t('node.content.character') },
                { handleId: 'clothing', type: 'text', title: t('node.content.clothing') }
            ];
        } else if (node.type === NodeType.IMAGE_INPUT || node.type === NodeType.IMAGE_ANALYZER) {
            handles = [{ handleId: 'image', type: 'image', title: 'Image Output' }, { handleId: 'text', type: 'text', title: 'Text Output' }];
        } else if (node.type === NodeType.SCRIPT_GENERATOR) {
             const { summary, detailedCharacters = [], scenes = [] } = parsedValue;
             const characterHandles = detailedCharacters.map((_: any, i: number) => ({ handleId: `character-${i}`, type: 'text', title: `Character ${i + 1}` }));
             const sceneHandles = scenes.map((_: any, i: number) => ({ handleId: `scene-${i}`, type: 'text', title: `Scene ${i + 1}` }));
             handles = summary ? [{ handleId: 'summary', type: 'text', title: 'Summary' }, ...characterHandles, ...sceneHandles] : [...characterHandles, ...sceneHandles];
        } else if (node.type === NodeType.SCRIPT_VIEWER) {
            const type = parsedValue.type;
            handles = [{ handleId: 'full-json', type: 'text', title: 'Full Data JSON' }];
            if (type === 'script-analyzer-data') {
                handles.push(
                    { handleId: 'all-image-prompts', type: 'text', title: 'All Image Prompts' },
                    { handleId: 'all-video-prompts', type: 'text', title: 'All Video Prompts' }
                );
            }
        } else if (node.type === NodeType.CHARACTER_GENERATOR) {
            const { characters = [] } = parsedValue;
            handles = characters.map((char: any, i: number) => ({ handleId: `character-${i}`, type: 'text', title: char.name || `Character ${i + 1}` }));
        } else if (node.type === NodeType.CHARACTER_CARD) {
             const dataHandles = [
                 { handleId: 'all_data', type: 'character_data' as const, title: 'All Characters Data' },
                 { handleId: 'primary_data', type: 'character_data' as const, title: 'Primary Character Data' }
             ];
             const propHandles = [
                 { handleId: 'image', type: 'image' as const, title: 'Image (primary)' },
                 { handleId: 'prompt', type: 'text' as const, title: 'Prompt (primary)' },
                 { handleId: 'appearance', type: 'text' as const, title: `${t('node.content.appearance')} (primary)` },
                 { handleId: 'personality', type: 'text' as const, title: `${t('node.content.personality')} (primary)` },
                 { handleId: 'clothing', type: 'text' as const, title: `${t('node.content.clothing')} (primary)` }
             ];
             
             if (node.collapsedHandles) {
                 handles = dataHandles as any;
             } else {
                 handles = [...dataHandles, ...propHandles] as any;
             }
        } else if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
            handles = [
                { handleId: 'all_images', type: 'image', title: 'All Images' }
            ];
        } else if (node.type === NodeType.NOTE) {
             try {
                 const parsed = JSON.parse(node.value || '{}');
                 if (parsed.activeTab === 'note') return null;
             } catch {}
             handles = [
                { handleId: 'all_images', type: 'image', title: 'All Images' },
                { handleId: 'all_captions', type: 'text', title: 'All Captions' },
            ];
        }
        else {
            const outputType = getOutputHandleType(node, undefined);
            if (outputType !== null || node.type === NodeType.REROUTE_DOT) {
                const title = node.type === NodeType.REROUTE_DOT ? "Any Output" : 
                              outputType === 'image' ? "Image Output" : 
                              outputType === 'character_data' ? "Character Data Output" :
                              outputType === 'video' ? "Video Output" :
                              outputType === 'audio' ? "Audio Output" :
                              "Text Output";
                handles = [{ handleId: undefined, type: outputType, title }];
            }
        }
        if (handles.length === 0) return null;
        return (<> {handles.map((handle, index) => renderHandle(handle, `${(index + 1) * (COLLAPSED_NODE_HEIGHT / (handles.length + 1))}px`, handle.handleId || `output-${index}`))} </>);
    }

    // --- Expanded Mode Outputs (Specific Layouts) ---
    if (node.type === NodeType.NOTE) {
        try {
            const parsed = JSON.parse(node.value || '{}');
            if (parsed.activeTab === 'note') return null;
        } catch {}

        const availableHeight = node.height - 80;
        const y1 = 80 + availableHeight * 0.33;
        const y2 = 80 + availableHeight * 0.66;

        return (
            <>
                {renderHandle({ type: 'image', handleId: 'all_images', title: 'All Images' }, `${y1}px`, 'all_images')}
                {renderHandle({ type: 'text', handleId: 'all_captions', title: 'All Captions' }, `${y2}px`, 'all_captions')}
            </>
        );
    }

    if (node.type === NodeType.PROMPT_ANALYZER) {
        return null;
    }

    if (node.type === NodeType.SCRIPT_VIEWER) {
        const type = parsedValue.type;
        const handles = [{ handleId: 'full-json', type: 'text', title: 'Full Data JSON' }];
        if (type === 'script-analyzer-data') {
            handles.push(
                { handleId: 'all-image-prompts', type: 'text', title: 'All Image Prompts' },
                { handleId: 'all-video-prompts', type: 'text', title: 'All Video Prompts' }
            );
        }
        
        // Evenly distribute
        const step = node.height / (handles.length + 1);
        return (<> {handles.map((h, i) => renderHandle(h as any, `${(i+1)*step}px`, h.handleId))} </>);
    }

    if (node.type === NodeType.PROMPT_SEQUENCE_EDITOR) {
        return renderHandle({ type: 'text', handleId: 'all_data', title: t('node.output.allPromptData') }, '50%', 'all_data');
    }

    if (node.type === NodeType.IMAGE_SEQUENCE_GENERATOR) {
         return renderHandle({ type: 'image', handleId: 'all_images', title: 'All Images' }, '50%', 'all_images');
    }
    
    if (node.type === NodeType.CHARACTER_GENERATOR) {
        const { characters = [] } = parsedValue;
        if (characters.length === 0) return null;
        
        const contentHeight = node.height - HEADER_HEIGHT - (2 * CONTENT_PADDING);
        const startYOffset = 180; 
        const availableHeight = contentHeight - startYOffset;
        
        return (<> {characters.map((char: any, index: number) => {
            const step = availableHeight / (characters.length + 1);
            const handleY = HEADER_HEIGHT + CONTENT_PADDING + startYOffset + (step * (index + 1));
            
            return renderHandle({ type: 'character_data', handleId: `character-${index}`, title: char.name || `Character ${index + 1}` }, `${handleY}px`, `character-${index}`);
        })} </>);
    }

    if (node.type === NodeType.SCRIPT_GENERATOR) {
        const { summary, detailedCharacters = [], scenes = [] } = parsedValue;
        const handles: { id: string, title: string }[] = [];
        if (summary) handles.push({ id: 'summary', title: 'Summary' });
        detailedCharacters.forEach((_: any, i: number) => handles.push({ id: `character-${i}`, title: `Character ${i + 1}` }));
        scenes.forEach((_: any, i: number) => handles.push({ id: `scene-${i}`, title: `Scene ${i + 1}` }));
        
        const contentHeight = node.height - HEADER_HEIGHT - (2 * CONTENT_PADDING);
        
        return (<> {handles.map((handle, index) => {
            const handleY = HEADER_HEIGHT + CONTENT_PADDING + (contentHeight / (handles.length + 1)) * (index + 1);
            return renderHandle({ type: 'text', handleId: handle.id, title: handle.title }, `${handleY}px`, handle.id);
        })} </>);
    }
    
    if (node.type === NodeType.CHARACTER_ANALYZER) {
        const handleIds = ['character', 'clothing'];
        const totalPanes = 2;
        const BUTTON_HEIGHT = 40;
        const BUTTON_MARGIN_TOP = 8;
        const contentAreaTop = HEADER_HEIGHT + CONTENT_PADDING;
        const contentAreaBottom = node.height - CONTENT_PADDING - BUTTON_HEIGHT - BUTTON_MARGIN_TOP;
        const textAreasContainerHeight = contentAreaBottom - contentAreaTop;

        return (<> {handleIds.map((handleId, index) => {
            const handleY = contentAreaTop + (textAreasContainerHeight / totalPanes) * (index + 0.5);
            const title = t(`node.content.${handleId}` as any);
            return renderHandle({ type: 'text', handleId: handleId, title: title }, `${handleY}px`, handleId);
        })} </>);
    }
    if (node.type === NodeType.IMAGE_INPUT) {
        const contentHeight = node.height - HEADER_HEIGHT - 2 * CONTENT_PADDING;
        const availableContentHeight = Math.max(0, contentHeight);
        const imageHandleY = HEADER_HEIGHT + CONTENT_PADDING + (availableContentHeight / 4);
        const textHandleY = node.height - 80;
        
        return (
            <>
                {renderHandle({ type: 'image', handleId: 'image', title: 'Image Output' }, `${imageHandleY}px`, 'image')}
                {renderHandle({ type: 'text', handleId: 'text', title: 'Text Output' }, `${textHandleY}px`, 'text')}
            </>
        );
    }
    if (node.type === NodeType.IMAGE_ANALYZER) {
         const contentHeight = node.height - HEADER_HEIGHT - 2 * CONTENT_PADDING;
         const spacing = 8;
         const paneHeight = (contentHeight - spacing) / 2;
         const imagePaneTop = HEADER_HEIGHT + CONTENT_PADDING;
         const imageY = imagePaneTop + paneHeight / 2;
         const textY = imagePaneTop + paneHeight + spacing + paneHeight / 2;

         return (
            <>
                {renderHandle({ type: 'image', handleId: 'image', title: 'Image Output' }, `${imageY}px`, 'image')}
                {renderHandle({ type: 'text', handleId: 'text', title: 'Text Output' }, `${textY}px`, 'text')}
            </>
        );
    }
    
    if (node.type === NodeType.CHARACTER_CARD) {
        try {
            const dataHandles = [
                { handleId: 'all_data', type: 'character_data' as const, title: 'All Characters Data' },
                { handleId: 'primary_data', type: 'character_data' as const, title: 'Primary Character Data' }
            ];

            // --- FILTER LOGIC FOR COLLAPSED HANDLES ---
            if (node.collapsedHandles) {
                 const contentHeight = node.height - HEADER_HEIGHT - 20;
                 const step = contentHeight / (dataHandles.length + 1);
                 return (
                    <>
                        {dataHandles.map((handle, index) => (
                            renderHandle(handle, `${HEADER_HEIGHT + (step * (index + 1))}px`, handle.handleId || `output-${index}`)
                        ))}
                    </>
                 );
            }
            // ------------------------------------------

            // Property handles (linked to primary output character)
            const propHandles = [
                { handleId: 'image', type: 'image' as const, title: 'Image (primary)' },
                { handleId: 'prompt', type: 'text' as const, title: 'Prompt (primary)' },
                { handleId: 'appearance', type: 'text' as const, title: `${t('node.content.appearance')} (primary)` },
                { handleId: 'personality', type: 'text' as const, title: `${t('node.content.personality')} (primary)` },
                { handleId: 'clothing', type: 'text' as const, title: `${t('node.content.clothing')} (primary)` }
            ];

            const allOutputHandles = [...dataHandles, ...propHandles];
            const contentHeight = node.height - HEADER_HEIGHT - 20;
            const step = contentHeight / (allOutputHandles.length + 1);

            return (
                <>
                    {allOutputHandles.map((handle, index) => (
                        renderHandle(handle, `${HEADER_HEIGHT + (step * (index + 1))}px`, handle.handleId || `output-${index}`)
                    ))}
                </>
            );
        } catch {
             return null;
        }
    }
    
    // Default fallback for expanded outputs
    const outputType = getOutputHandleType(node, undefined);
    if (outputType !== null || node.type === NodeType.REROUTE_DOT) {
        const title = node.type === NodeType.REROUTE_DOT ? "Any Output" : 
                      outputType === 'image' ? "Image Output" : 
                      outputType === 'character_data' ? "Character Data Output" :
                      outputType === 'video' ? "Video Output" :
                      outputType === 'audio' ? "Audio Output" :
                      "Text Output";
                      
        return renderHandle({ type: outputType, handleId: undefined, title }, '50%', 'default');
    }
    
    return null;
};
