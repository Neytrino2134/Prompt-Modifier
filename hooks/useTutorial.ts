
import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, NodeType, TutorialStep } from '../types';

interface UseTutorialProps {
    nodes: Node[];
}

export const useTutorial = ({ nodes }: UseTutorialProps) => {
    const [step, setStep] = useState<TutorialStep>('idle');
    const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
    const hasCheckedStorage = useRef(false);

    // Initial check for tutorial status
    useEffect(() => {
        if (hasCheckedStorage.current) return;
        const completed = localStorage.getItem('tutorial_completed');
        
        // If not completed, we wait for start signal (usually from AppContext or WelcomeScreen closing)
        if (!completed) {
            // We set it to 'text_input_0' once started, but for now idle
        } else {
             setStep('completed');
        }
        hasCheckedStorage.current = true;
    }, []);

    const startTutorial = useCallback(() => {
        if (localStorage.getItem('tutorial_completed')) {
            setStep('completed');
            return;
        }
        setStep('text_input_0');
    }, []);

    const skipTutorial = useCallback(() => {
        localStorage.setItem('tutorial_completed', 'true');
        setStep('completed');
    }, []);

    const advanceTutorial = useCallback(() => {
        setStep(current => {
            switch (current) {
                case 'text_input_0': return 'text_input_1';
                case 'text_input_1': return 'text_input_2';
                case 'text_input_2': return 'prompt_processor_enhance';
                case 'prompt_processor_enhance': return 'prompt_processor_waiting';
                case 'prompt_processor_waiting': return 'image_output_generate';
                case 'image_output_generate': return 'image_output_generating';
                case 'image_output_generating': return 'toolbar_group_catalog';
                
                // Detailed Toolbar Walkthrough
                case 'toolbar_group_catalog': return 'toolbar_group_general';
                case 'toolbar_group_general': return 'toolbar_group_input';
                case 'toolbar_group_input': return 'toolbar_group_processing';
                case 'toolbar_group_processing': return 'toolbar_group_character';
                case 'toolbar_group_character': return 'toolbar_group_output';
                case 'toolbar_group_output': return 'toolbar_group_ai';
                case 'toolbar_group_ai': return 'toolbar_group_video';
                case 'toolbar_group_video': return 'toolbar_group_scripts';
                case 'toolbar_group_scripts': return 'toolbar_group_file';
                case 'toolbar_group_file': return 'tutorial_success_message';
                
                case 'tutorial_success_message':
                    localStorage.setItem('tutorial_completed', 'true');
                    return 'completed';
                default: return 'completed';
            }
        });
    }, []);
    
    // Explicit skipper for async wait
    const setTutorialStep = useCallback((newStep: TutorialStep) => {
        setStep(newStep);
        if (newStep === 'completed') {
             localStorage.setItem('tutorial_completed', 'true');
        }
    }, []);

    // Determine target node based on step and sorted nodes
    useEffect(() => {
        if (step === 'completed' || step === 'idle' || step === 'tutorial_success_message') {
            setCurrentTargetId(null);
            return;
        }

        const textInputs = nodes
            .filter(n => n.type === NodeType.TEXT_INPUT)
            .sort((a, b) => a.position.y - b.position.y);
        
        const processors = nodes.filter(n => n.type === NodeType.PROMPT_PROCESSOR);
        const outputs = nodes.filter(n => n.type === NodeType.IMAGE_OUTPUT);

        let target: string | null = null;

        switch (step) {
            case 'text_input_0': 
                if (textInputs.length > 0) target = textInputs[0].id;
                break;
            case 'text_input_1': 
                if (textInputs.length > 1) target = textInputs[1].id;
                else if (processors.length > 0) {
                     setStep('prompt_processor_enhance'); 
                }
                break;
            case 'text_input_2': 
                if (textInputs.length > 2) target = textInputs[2].id;
                else if (processors.length > 0) {
                     setStep('prompt_processor_enhance');
                }
                break;
            case 'prompt_processor_enhance':
            case 'prompt_processor_waiting':
                if (processors.length > 0) target = processors[0].id;
                break;
            case 'image_output_generate':
                if (outputs.length > 0) target = outputs[0].id;
                break;
        }
        
        setCurrentTargetId(target);
    }, [step, nodes]);

    return {
        tutorialStep: step,
        tutorialTargetId: currentTargetId,
        advanceTutorial,
        startTutorial,
        setTutorialStep,
        skipTutorial
    };
};
