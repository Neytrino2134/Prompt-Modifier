
import { NodeType } from '../../types';
import { NodeProcessor } from './types';
import { 
    processPromptProcessor, 
    processPromptSanitizer, 
    processVideoPromptProcessor, 
    processTranslator 
} from './textProcessors';
import { processImageOutput } from './imageProcessors';
import { 
    processPromptAnalyzer, 
    processCharacterAnalyzer, 
    processImageAnalyzer 
} from './analysisProcessors';
import { 
    processScriptGenerator, 
    processCharacterGenerator, 
    processPromptSequenceEditor 
} from './generationProcessors';

export { processImageEditor } from './imageProcessors';
export type { NodeProcessor, ProcessingContext, ProcessResult } from './types';

export const processorRegistry: Record<string, NodeProcessor> = {
    [NodeType.PROMPT_PROCESSOR]: processPromptProcessor,
    [NodeType.PROMPT_SANITIZER]: processPromptSanitizer,
    [NodeType.VIDEO_PROMPT_PROCESSOR]: processVideoPromptProcessor,
    [NodeType.TRANSLATOR]: processTranslator,
    [NodeType.IMAGE_OUTPUT]: processImageOutput,
    [NodeType.PROMPT_ANALYZER]: processPromptAnalyzer,
    [NodeType.CHARACTER_ANALYZER]: processCharacterAnalyzer,
    [NodeType.IMAGE_ANALYZER]: processImageAnalyzer,
    [NodeType.SCRIPT_GENERATOR]: processScriptGenerator,
    [NodeType.CHARACTER_GENERATOR]: processCharacterGenerator,
    [NodeType.PROMPT_SEQUENCE_EDITOR]: processPromptSequenceEditor,
};

export const getProcessor = (type: NodeType): NodeProcessor | undefined => {
    return processorRegistry[type];
};
