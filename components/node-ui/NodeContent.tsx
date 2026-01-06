
import React from 'react';
import { Node, NodeType, NodeContentProps } from '../../types';

// Import all node components
import { NoteNode } from '../nodes/NoteNode';
import { RerouteDotNode } from '../nodes/RerouteDotNode';
import { TextInputNode } from '../nodes/TextInputNode';
import { ImageInputNode } from '../nodes/ImageInputNode';
import { TranslatorNode } from '../nodes/TranslatorNode';
import { GeminiChatNode } from '../nodes/GeminiChatNode';
import { ImageEditorNode } from '../nodes/ImageEditorNode';
import { ImageAnalyzerNode } from '../nodes/ImageAnalyzerNode';
import { PromptAnalyzerNode } from '../nodes/PromptAnalyzerNode';
import { CharacterAnalyzerNode } from '../nodes/CharacterAnalyzerNode';
import { PromptProcessorNode } from '../nodes/PromptProcessorNode';
import { ImageOutputNode } from '../nodes/ImageOutputNode';
import { VideoOutputNode } from '../nodes/VideoOutputNode';
import { VideoPromptProcessorNode } from '../nodes/VideoPromptProcessorNode';
import { ScriptGeneratorNode } from '../nodes/ScriptGeneratorNode';
import { ScriptViewerNode } from '../nodes/ScriptViewerNode';
import { CharacterGeneratorNode } from '../nodes/CharacterGeneratorNode';
import { CharacterCardNode } from '../nodes/CharacterCardNode';
import { PromptSanitizerNode } from '../nodes/PromptSanitizerNode';
import { DataReaderNode } from '../nodes/DataReaderNode';
import { VideoEditorNode } from '../nodes/VideoEditorNode';
import { MediaViewerNode } from '../nodes/MediaViewerNode';
import { DataProtectionNode } from '../nodes/DataProtectionNode';
import { PoseCreatorNode } from '../nodes/PoseCreatorNode';
import { ImageSequenceGeneratorNode } from '../nodes/ImageSequenceGeneratorNode';
import { PromptSequenceEditorNode } from '../nodes/PromptSequenceEditorNode';

interface NodeContentWrapperProps {
    node: Node;
    contentProps: NodeContentProps;
}

export const NodeContent: React.FC<NodeContentWrapperProps> = React.memo(({ node, contentProps }) => {
    switch (node.type) {
        case NodeType.REROUTE_DOT: return <RerouteDotNode {...contentProps} />;
        case NodeType.NOTE: return <NoteNode {...contentProps} />;
        case NodeType.TRANSLATOR: return <TranslatorNode {...contentProps} />;
        case NodeType.GEMINI_CHAT: return <GeminiChatNode {...contentProps} />;
        case NodeType.SCRIPT_GENERATOR: return <ScriptGeneratorNode {...contentProps} />;
        case NodeType.SCRIPT_VIEWER: return <ScriptViewerNode {...contentProps} />;
        case NodeType.CHARACTER_GENERATOR: return <CharacterGeneratorNode {...contentProps} />;
        case NodeType.CHARACTER_CARD: return <CharacterCardNode {...contentProps} />;
        case NodeType.TEXT_INPUT: return <TextInputNode {...contentProps} />;
        case NodeType.IMAGE_INPUT: return <ImageInputNode {...contentProps} />;
        case NodeType.IMAGE_EDITOR: return <ImageEditorNode {...contentProps} />;
        case NodeType.IMAGE_ANALYZER: return <ImageAnalyzerNode {...contentProps} />;
        case NodeType.PROMPT_ANALYZER: return <PromptAnalyzerNode {...contentProps} />;
        case NodeType.CHARACTER_ANALYZER: return <CharacterAnalyzerNode {...contentProps} />;
        case NodeType.PROMPT_PROCESSOR: return <PromptProcessorNode {...contentProps} />;
        case NodeType.PROMPT_SANITIZER: return <PromptSanitizerNode {...contentProps} />;
        case NodeType.VIDEO_PROMPT_PROCESSOR: return <VideoPromptProcessorNode {...contentProps} />;
        case NodeType.IMAGE_OUTPUT: return <ImageOutputNode {...contentProps} />;
        case NodeType.VIDEO_OUTPUT: return <VideoOutputNode {...contentProps} />;
        case NodeType.IMAGE_SEQUENCE_GENERATOR: return <ImageSequenceGeneratorNode {...contentProps} />;
        case NodeType.PROMPT_SEQUENCE_EDITOR: return <PromptSequenceEditorNode {...contentProps} />;
        case NodeType.DATA_READER: return <DataReaderNode {...contentProps} />;
        case NodeType.VIDEO_EDITOR: return <VideoEditorNode {...contentProps} />;
        case NodeType.MEDIA_VIEWER: return <MediaViewerNode {...contentProps} />;
        case NodeType.DATA_PROTECTION: return <DataProtectionNode {...contentProps} />;
        case NodeType.POSE_CREATOR: return <PoseCreatorNode {...contentProps} />;
        default: return null;
    }
});
