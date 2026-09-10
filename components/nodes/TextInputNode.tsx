
import React, { useState, useRef, useEffect } from 'react';
import type { NodeContentProps } from '../../types';
import { LibraryItem, LibraryItemType } from '../../types';
import { useLanguage } from '../../localization';
import { getRandomWord } from '../../utils/wordBank';
import { PromptLibraryToolbar } from '../PromptLibraryToolbar';
import { ActionButton } from '../ActionButton';
import { DebouncedTextarea } from '../DebouncedTextarea';
import { useAppContext } from '../../contexts/AppContext';
import { TutorialTooltip } from '../TutorialTooltip';
import { AddToLibraryPopover } from '../AddToLibraryPopover';
import { transcribeAudio } from '../../services/geminiService';
import { getConfiguredTranscribeModel } from '../../services/modelConfig';
import { getAudioMediaConstraints } from '../../services/audioConfig';

export const TextInputNode: React.FC<NodeContentProps> = ({ node, onValueChange, libraryItems, t, onSelectNode }) => {
    const { language } = useLanguage();
    const context = useAppContext();
    const { tutorialStep, tutorialTargetId, advanceTutorial, skipTutorial } = context || {};
    const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);
    const addToLibraryBtnRef = useRef<HTMLDivElement>(null);

    // Dictation & Audio Transcription State
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [isSoundActive, setIsSoundActive] = useState<boolean>(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const isCancelledRef = useRef<boolean>(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);

    const stopAudioMeter = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch {}
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0);
        setIsSoundActive(false);
    };

    // Stop streams and clear intervals on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            stopAudioMeter();
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop());
                audioStreamRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try {
                    mediaRecorderRef.current.stop();
                } catch {}
            }
        };
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleStartRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            context?.addToast?.(
                language === 'ru'
                    ? 'Запись звука не поддерживается в данном браузере или контексте.'
                    : 'Audio recording is not supported in this browser context.',
                'error'
            );
            return;
        }

        try {
            isCancelledRef.current = false;
            audioChunksRef.current = [];

            // Use configured audio input device constraints
            const constraints = getAudioMediaConstraints();
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
            } catch {
                // Graceful fallback if exact deviceId is not available
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            audioStreamRef.current = stream;

            // Determine best supported MIME type
            let mimeType = 'audio/webm';
            if (typeof MediaRecorder !== 'undefined') {
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus';
                } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                    mimeType = 'audio/ogg';
                }
            }

            // Start AudioContext and AnalyserNode for live sound meter / waveform
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    const audioCtx = new AudioContextClass();
                    audioContextRef.current = audioCtx;
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 64;
                    analyser.smoothingTimeConstant = 0.25;
                    analyserRef.current = analyser;
                    const source = audioCtx.createMediaStreamSource(stream);
                    source.connect(analyser);

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    const updateMeter = () => {
                        if (!analyserRef.current) return;
                        analyserRef.current.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) {
                            sum += dataArray[i];
                        }
                        const avg = sum / dataArray.length;
                        // Scaled level 0-100%
                        const level = Math.min(100, Math.round((avg / 90) * 100));
                        setAudioLevel(level);
                        setIsSoundActive(level > 5);

                        animFrameRef.current = requestAnimationFrame(updateMeter);
                    };
                    animFrameRef.current = requestAnimationFrame(updateMeter);
                }
            } catch (meterErr) {
                console.warn('Could not initialize audio visualizer meter:', meterErr);
            }

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                stopAudioMeter();

                // Stop tracks on audio stream
                if (audioStreamRef.current) {
                    audioStreamRef.current.getTracks().forEach(track => track.stop());
                    audioStreamRef.current = null;
                }

                setIsRecording(false);
                setRecordingDuration(0);

                if (isCancelledRef.current) {
                    audioChunksRef.current = [];
                    return;
                }

                const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
                audioChunksRef.current = [];

                if (recordedBlob.size === 0) {
                    context?.addToast?.(
                        language === 'ru' ? 'Запись пуста' : 'Recorded audio is empty',
                        'info'
                    );
                    return;
                }

                setIsTranscribing(true);

                try {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const rawResult = (reader.result as string) || '';
                        const base64Data = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;
                        try {
                            const activeModel = getConfiguredTranscribeModel() || 'gemini-3.8-flash';
                            const transcribedText = await transcribeAudio(base64Data, mimeType, activeModel);
                            
                            if (transcribedText && transcribedText.trim()) {
                                const currentText = (node.value || '').trim();
                                const newText = currentText
                                    ? `${currentText}${currentText.endsWith('\n') ? '' : '\n'}${transcribedText.trim()}`
                                    : transcribedText.trim();
                                
                                onValueChange(node.id, newText);

                                context?.addToast?.(
                                    language === 'ru'
                                        ? 'Речь успешно распознана'
                                        : 'Speech transcribed successfully',
                                    'success'
                                );
                            } else {
                                context?.addToast?.(
                                    language === 'ru'
                                        ? 'Речь не распознана или пустой результат'
                                        : 'No speech recognized or empty response',
                                    'info'
                                );
                            }
                        } catch (err: any) {
                            console.error('Transcription error:', err);
                            context?.addToast?.(
                                `${language === 'ru' ? 'Ошибка транскрибации: ' : 'Transcription error: '}${err?.message || err}`,
                                'error'
                            );
                        } finally {
                            setIsTranscribing(false);
                        }
                    };
                    reader.readAsDataURL(recordedBlob);
                } catch (e: any) {
                    console.error('Audio blob processing error:', e);
                    setIsTranscribing(false);
                }
            };

            recorder.start(250);
            setIsRecording(true);
            setRecordingDuration(0);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = window.setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err: any) {
            console.error('Microphone access failed:', err);
            context?.addToast?.(
                `${language === 'ru' ? 'Ошибка доступа к микрофону: ' : 'Microphone error: '}${err?.message || err}`,
                'error'
            );
            setIsRecording(false);
            setRecordingDuration(0);
        }
    };

    const handleStopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.error('Error stopping recorder:', e);
            }
        }
    };

    const handleCancelRecording = () => {
        isCancelledRef.current = true;
        stopAudioMeter();
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {
                console.error('Error stopping recorder:', e);
            }
        }
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingDuration(0);
    };

    const handleToggleRecord = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isTranscribing) return;
        if (isRecording) {
            handleStopRecording();
        } else {
            handleStartRecording();
        }
    };

    // Check if this node is the current target of the tutorial
    const isTutorialActive = tutorialTargetId === node.id && (
        tutorialStep === 'text_input_0' || 
        tutorialStep === 'text_input_1' || 
        tutorialStep === 'text_input_2'
    );

    const handleAddRandomWord = () => {
        const randomWord = getRandomWord(language);
        const newText = node.value ? `${node.value}, ${randomWord}` : randomWord;
        onValueChange(node.id, newText);
        
        // Advance tutorial if active
        if (isTutorialActive && advanceTutorial) {
            advanceTutorial();
        }
    };

    const handleSaveToLibrary = (promptName: string, folderId: string | null, newFolderName?: string) => {
        const textToSave = (node.value || '').trim();
        if (!textToSave) {
            if (context?.addToast) context.addToast(t('library.emptyPromptWarning'), 'error');
            return;
        }

        const currentItems = [...(libraryItems || [])];
        let actualParentId = folderId;

        if (newFolderName && newFolderName.trim()) {
            const trimmedFolder = newFolderName.trim();
            const existing = currentItems.find(
                item => item.type === LibraryItemType.FOLDER && item.parentId === null && item.name.toLowerCase() === trimmedFolder.toLowerCase()
            );
            if (existing) {
                actualParentId = existing.id;
            } else {
                const newFolderId = `lib-item-folder-${Date.now()}`;
                const newFolder: LibraryItem = {
                    id: newFolderId,
                    type: LibraryItemType.FOLDER,
                    name: trimmedFolder,
                    parentId: null
                };
                currentItems.push(newFolder);
                actualParentId = newFolderId;
            }
        }

        let finalPromptName = promptName.trim() || 'New Prompt';
        let counter = 1;
        while (currentItems.some(item => item.parentId === actualParentId && item.name === finalPromptName && item.type === LibraryItemType.PROMPT)) {
            finalPromptName = `${promptName.trim() || 'New Prompt'} (${counter++})`;
        }

        const newPrompt: LibraryItem = {
            id: `lib-item-prompt-${Date.now()}`,
            type: LibraryItemType.PROMPT,
            name: finalPromptName,
            parentId: actualParentId,
            content: textToSave
        };

        currentItems.push(newPrompt);

        if (context?.setLibraryItems) {
            context.setLibraryItems(currentItems);
        } else {
            localStorage.setItem('prompt-library-items', JSON.stringify(currentItems));
        }

        if (context?.addToast) {
            context.addToast(t('toast.promptSaved', { promptName: finalPromptName }), 'success');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-1 flex-shrink-0 space-x-1.5">
                <div className="flex-grow">
                    <PromptLibraryToolbar
                        libraryItems={libraryItems}
                        onPromptInsert={(promptText: string) => {
                            const newText = node.value ? `${node.value}, ${promptText}` : promptText;
                            onValueChange(node.id, newText);
                        }}
                    />
                </div>

                {/* Add to Library Button with Category Menu */}
                <div ref={addToLibraryBtnRef} className="flex items-center">
                    <ActionButton
                        title={t('library.addToLibrary')}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsAddToLibraryOpen(prev => !prev);
                        }}
                        disabled={!node.value || !node.value.trim()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </ActionButton>
                </div>
                
                <TutorialTooltip content={t('tutorial.step1')} isActive={!!isTutorialActive} position="left" onSkip={skipTutorial}>
                    <ActionButton title={t('node.action.randomWord')} onClick={handleAddRandomWord}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                    </ActionButton>
                </TutorialTooltip>

                {/* Microphone / Dictation Button (gemini-3.5-transcribe) */}
                {isRecording ? (
                    <div className="relative group/btn-tooltip flex items-center justify-center">
                        <button
                            type="button"
                            onClick={handleToggleRecord}
                            onMouseDown={(e) => e.stopPropagation()}
                            aria-label={t('node.action.stopDictate')}
                            className="p-1 text-red-400 bg-red-500/20 border border-red-500/50 rounded hover:bg-red-500/30 transition-colors animate-pulse flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-700 text-slate-200 text-[10px] font-bold whitespace-nowrap rounded-md shadow-xl z-50 opacity-0 pointer-events-none group-hover/btn-tooltip:opacity-100 transition-opacity duration-200">
                            {t('node.action.stopDictate')}
                        </div>
                    </div>
                ) : isTranscribing ? (
                    <div className="p-1 text-cyan-400 rounded flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                    </div>
                ) : (
                    <ActionButton
                        title={t('node.action.dictate')}
                        onClick={handleToggleRecord}
                        className="p-1 text-gray-400 rounded hover:bg-gray-600 hover:text-cyan-400 transition-colors duration-150 focus:outline-none flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </ActionButton>
                )}
            </div>

            {/* Popover for selecting category and saving prompt */}
            <AddToLibraryPopover
                isOpen={isAddToLibraryOpen}
                onClose={() => setIsAddToLibraryOpen(false)}
                anchorRef={addToLibraryBtnRef}
                promptContent={node.value || ''}
                libraryItems={libraryItems}
                onSave={handleSaveToLibrary}
            />

            {/* Live Recording Status Bar with Audio Level Meter */}
            {isRecording && (
                <div className="flex flex-col gap-1.5 p-2 mb-2 bg-gray-900/95 border border-red-500/50 rounded-lg shadow-md text-xs">
                    {/* Header: Timer + Recording Label + Done / Cancel buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <span className="font-mono text-xs font-bold text-red-300">{formatDuration(recordingDuration)}</span>
                            <span className="text-[11px] text-gray-200 font-medium truncate">
                                {t('node.action.recording')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleStopRecording}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-all shadow-sm flex items-center gap-1"
                                title={t('node.action.finishRecording')}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{t('node.action.finishRecording')}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelRecording}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="p-1 px-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded text-xs transition-colors"
                                title={t('node.action.cancelRecording')}
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Sound Level Scale (Шкала уровня звука) */}
                    <div className="flex flex-col gap-1 pt-1.5 border-t border-gray-800">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1 text-gray-300 font-medium">
                                <svg className={`w-3.5 h-3.5 transition-colors ${isSoundActive ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                <span>{language === 'ru' ? 'Шкала звука:' : 'Audio meter:'}</span>
                            </span>
                            <span className={`font-mono font-semibold text-[10px] transition-colors ${isSoundActive ? 'text-emerald-400' : 'text-gray-400'}`}>
                                {isSoundActive 
                                    ? (language === 'ru' ? `● Звук идет (${audioLevel}%)` : `● Audio active (${audioLevel}%)`) 
                                    : (language === 'ru' ? 'Говорите в микрофон...' : 'Listening for speech...')}
                            </span>
                        </div>

                        {/* Visual VU Meter Bar */}
                        <div className="relative h-2.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-700/70 p-0.5">
                            <div
                                className={`h-full rounded-full transition-all duration-75 ${
                                    audioLevel > 65 
                                        ? 'bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500' 
                                        : audioLevel > 20 
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                            : isSoundActive ? 'bg-emerald-500' : 'bg-gray-700'
                                }`}
                                style={{ width: `${Math.max(audioLevel, isRecording ? 3 : 0)}%` }}
                            />
                        </div>

                        {/* Animated Equalizer Waveform Bouncing Bars */}
                        <div className="flex items-center justify-between gap-1 h-3.5 px-0.5 pt-0.5">
                            {[...Array(14)].map((_, i) => {
                                const multiplier = Math.sin((i / 13) * Math.PI) * 0.7 + 0.3;
                                const barHeight = isSoundActive 
                                    ? Math.max(3, Math.min(14, Math.round((audioLevel / 100) * 14 * multiplier + ((i % 2 === 0) ? 2 : 0))))
                                    : 2;
                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-sm transition-all duration-75 ${
                                            isSoundActive 
                                                ? (i >= 11 ? 'bg-red-400' : i >= 8 ? 'bg-amber-400' : 'bg-emerald-400') 
                                                : 'bg-gray-700/60'
                                        }`}
                                        style={{ height: `${barHeight}px` }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Transcribing Status Bar */}
            {isTranscribing && (
                <div className="flex items-center gap-2 px-2.5 py-1 mb-1.5 bg-cyan-950/70 border border-cyan-500/40 rounded text-xs text-cyan-200">
                    <svg className="animate-spin h-3.5 w-3.5 text-cyan-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span className="text-[11px] font-medium truncate">
                        {t('node.action.transcribing')}
                    </span>
                </div>
            )}

            <div className="flex-grow min-h-0">
                <DebouncedTextarea
                    value={node.value}
                    onDebouncedChange={(val) => onValueChange(node.id, val)}
                    placeholder={t('node.content.notePlaceholder')}
                    className="w-full h-full p-2 bg-input border border-transparent rounded-md resize-none focus:border-accent focus:outline-none"
                    onWheel={e => e.stopPropagation()}
                    onMouseDown={(e) => { e.stopPropagation(); onSelectNode(); }}
                />
            </div>
        </div>
    );
};
