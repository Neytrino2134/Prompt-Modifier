import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../localization';
import { 
    getSelectedAudioDeviceId, 
    setSelectedAudioDeviceId, 
    getAudioMediaConstraints,
    AudioInputDevice 
} from '../services/audioConfig';
import CustomSelect from './CustomSelect';

interface MicrophoneSettingsTabProps {
    className?: string;
}

export const MicrophoneSettingsTab: React.FC<MicrophoneSettingsTabProps> = ({ className = '' }) => {
    const { t, language } = useLanguage();
    const [devices, setDevices] = useState<AudioInputDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceIdState] = useState<string>(getSelectedAudioDeviceId());
    const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Live testing state
    const [isTesting, setIsTesting] = useState<boolean>(false);
    const [volumeLevel, setVolumeLevel] = useState<number>(0);
    const [peakLevel, setPeakLevel] = useState<number>(0);
    const [isVoiceDetected, setIsVoiceDetected] = useState<boolean>(false);

    // Test recording sample state
    const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
    const [sampleCountdown, setSampleCountdown] = useState<number>(4);
    const [sampleAudioUrl, setSampleAudioUrl] = useState<string | null>(null);

    // Refs
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const peakDecayRef = useRef<number>(0);
    const sampleRecorderRef = useRef<MediaRecorder | null>(null);
    const sampleChunksRef = useRef<Blob[]>([]);
    const countdownTimerRef = useRef<number | null>(null);

    // Enumerate audio input devices
    const loadAudioDevices = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            setPermissionError(
                language === 'ru'
                    ? 'Аудиоустройства не поддерживаются браузером'
                    : 'Audio devices not supported in this browser'
            );
            return;
        }

        try {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = allDevices.filter(d => d.kind === 'audioinput');

            // Check if we have labels (meaning permission has been granted)
            const hasLabels = audioInputs.some(d => Boolean(d.label && d.label.trim()));
            setPermissionGranted(hasLabels);

            const mapped: AudioInputDevice[] = audioInputs.map((d, index) => ({
                deviceId: d.deviceId,
                label: d.label || `${language === 'ru' ? 'Микрофон' : 'Microphone'} ${index + 1}`,
                groupId: d.groupId,
            }));

            setDevices(mapped);
            setPermissionError(null);
        } catch (err: any) {
            console.error('Failed to enumerate audio devices:', err);
            setPermissionError(err?.message || 'Error listing devices');
        }
    };

    // Request permission explicitly to reveal device labels
    const handleRequestPermission = async () => {
        try {
            setPermissionError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Immediately stop temporary stream
            stream.getTracks().forEach(t => t.stop());
            setPermissionGranted(true);
            await loadAudioDevices();
        } catch (err: any) {
            console.error('Microphone permission request failed:', err);
            setPermissionError(
                language === 'ru'
                    ? 'Доступ к микрофону заблокирован или отклонен пользователем'
                    : 'Microphone access denied or blocked by user'
            );
        }
    };

    // Initial load and devicechange listener
    useEffect(() => {
        loadAudioDevices();

        const handleDeviceChange = () => {
            loadAudioDevices();
        };

        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        }

        return () => {
            if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
                navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
            }
            stopTesting();
            if (sampleAudioUrl) {
                URL.revokeObjectURL(sampleAudioUrl);
            }
        };
    }, []);

    // Stop live test and clean up Web Audio resources
    const stopTesting = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        if (sampleRecorderRef.current && sampleRecorderRef.current.state !== 'inactive') {
            try {
                sampleRecorderRef.current.stop();
            } catch {}
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
                audioContextRef.current.close();
            } catch {}
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        setIsTesting(false);
        setIsRecordingSample(false);
        setVolumeLevel(0);
        setPeakLevel(0);
        setIsVoiceDetected(false);
    };

    // Start live microphone test
    const startTesting = async (deviceIdToUse = selectedDeviceId) => {
        stopTesting();
        setPermissionError(null);

        try {
            const constraints = getAudioMediaConstraints(deviceIdToUse);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
            streamRef.current = stream;

            // Mark permission granted
            setPermissionGranted(true);
            // Refresh device list to ensure labels are populated
            loadAudioDevices();

            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.6;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            setIsTesting(true);

            // Analysis loop
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const timeData = new Uint8Array(analyser.fftSize);

            const renderLoop = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteTimeDomainData(timeData);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate RMS Volume
                let sumSquares = 0;
                for (let i = 0; i < timeData.length; i++) {
                    const norm = (timeData[i] - 128) / 128;
                    sumSquares += norm * norm;
                }
                const rms = Math.sqrt(sumSquares / timeData.length);
                // Non-linear scale for human voice perception (0 to 100)
                const currentVol = Math.min(100, Math.round(Math.pow(rms * 2.8, 0.8) * 100));

                setVolumeLevel(currentVol);
                setIsVoiceDetected(currentVol > 12);

                // Peak with smooth decay
                if (currentVol > peakDecayRef.current) {
                    peakDecayRef.current = currentVol;
                } else {
                    peakDecayRef.current = Math.max(0, peakDecayRef.current - 1.2);
                }
                setPeakLevel(Math.round(peakDecayRef.current));

                // Draw on canvas visualizer
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const width = canvas.width;
                        const height = canvas.height;
                        ctx.clearRect(0, 0, width, height);

                        // Dark background
                        ctx.fillStyle = '#0f172a';
                        ctx.fillRect(0, 0, width, height);

                        // Subtle grid lines
                        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(0, height / 2);
                        ctx.lineTo(width, height / 2);
                        ctx.stroke();

                        // Frequency Bars
                        const barCount = 32;
                        const barWidth = Math.max(2, (width / barCount) - 2);
                        const step = Math.floor(dataArray.length / barCount);

                        for (let i = 0; i < barCount; i++) {
                            const val = dataArray[i * step] / 255;
                            const barHeight = Math.max(3, val * (height - 6));
                            const x = i * (barWidth + 2);
                            const y = height - barHeight;

                            // Dynamic color based on volume and frequency
                            if (val > 0.8) {
                                ctx.fillStyle = '#ef4444'; // Red
                            } else if (val > 0.45) {
                                ctx.fillStyle = '#06b6d4'; // Cyan
                            } else {
                                ctx.fillStyle = '#3b82f6'; // Blue
                            }

                            ctx.beginPath();
                            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
                            ctx.fill();
                        }
                    }
                }

                animFrameRef.current = requestAnimationFrame(renderLoop);
            };

            animFrameRef.current = requestAnimationFrame(renderLoop);

        } catch (err: any) {
            console.error('Failed to start microphone test:', err);
            setPermissionError(
                `${language === 'ru' ? 'Не удалось запустить микрофон: ' : 'Failed to start microphone: '}${err?.message || err}`
            );
            setIsTesting(false);
        }
    };

    // Handle device change from select
    const handleDeviceSelect = (newDeviceId: string) => {
        setSelectedDeviceIdState(newDeviceId);
        setSelectedAudioDeviceId(newDeviceId);

        if (isTesting) {
            // Restart test on new device immediately
            startTesting(newDeviceId);
        }
    };

    // Record a 4-second audio sample and preview it
    const handleRecordSample = async () => {
        if (isRecordingSample) return;

        try {
            if (!streamRef.current || !isTesting) {
                await startTesting(selectedDeviceId);
            }

            if (!streamRef.current) return;

            sampleChunksRef.current = [];
            const recorder = new MediaRecorder(streamRef.current);
            sampleRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    sampleChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(sampleChunksRef.current, { type: 'audio/webm' });
                if (sampleAudioUrl) {
                    URL.revokeObjectURL(sampleAudioUrl);
                }
                const url = URL.createObjectURL(blob);
                setSampleAudioUrl(url);
                setIsRecordingSample(false);
            };

            recorder.start(100);
            setIsRecordingSample(true);
            setSampleCountdown(4);

            let remaining = 4;
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = window.setInterval(() => {
                remaining -= 1;
                setSampleCountdown(remaining);
                if (remaining <= 0) {
                    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                    if (recorder.state !== 'inactive') {
                        recorder.stop();
                    }
                }
            }, 1000);

        } catch (err: any) {
            console.error('Sample recording failed:', err);
        }
    };

    // Build options for CustomSelect
    const selectOptions = [
        {
            value: '',
            label: `⚙️ ${t('settings.mic.defaultDevice')}`
        },
        ...devices.map(d => ({
            value: d.deviceId,
            label: `🎙️ ${d.label}`
        }))
    ];

    return (
        <div className={`space-y-4 text-gray-200 ${className}`}>
            {/* Header / Intro */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                        <span className="text-cyan-400 text-base">🎙️</span>
                        {t('settings.group.microphone')}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                        {t('settings.mic.deviceDesc')}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadAudioDevices}
                    title={t('settings.mic.refreshDevices')}
                    className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Permission Warning / Request button if names are hidden */}
            {!permissionGranted && (
                <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-200">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-amber-400 flex-shrink-0">⚠️</span>
                        <span className="leading-tight text-[11px]">{t('settings.mic.permissionNeeded')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleRequestPermission}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                    >
                        {t('settings.mic.requestPermission')}
                    </button>
                </div>
            )}

            {/* Error banner if any */}
            {permissionError && (
                <div className="p-2.5 bg-red-950/50 border border-red-500/50 rounded-lg text-xs text-red-300 flex items-center gap-2">
                    <span className="text-red-400">✕</span>
                    <span className="text-[11px] leading-tight">{permissionError}</span>
                </div>
            )}

            {/* Device Selector */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                    {t('settings.mic.deviceLabel')}
                </label>
                <CustomSelect
                    value={selectedDeviceId}
                    onChange={handleDeviceSelect}
                    options={selectOptions}
                />
            </div>

            {/* Microphone Test Section */}
            <div className="p-3.5 bg-gray-950/70 border border-gray-800 rounded-xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                            <span className={isTesting ? "w-2 h-2 rounded-full bg-emerald-400 animate-ping" : "w-2 h-2 rounded-full bg-gray-500"} />
                            {t('settings.mic.testTitle')}
                        </h4>
                        <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                            {t('settings.mic.testDesc')}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => isTesting ? stopTesting() : startTesting(selectedDeviceId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
                            isTesting 
                                ? 'bg-red-600/90 hover:bg-red-500 text-white border border-red-500/50' 
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400/30'
                        }`}
                    >
                        {isTesting ? (
                            <>
                                <span className="w-2 h-2 bg-white rounded-sm" />
                                {t('settings.mic.stopTest')}
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                </svg>
                                {t('settings.mic.startTest')}
                            </>
                        )}
                    </button>
                </div>

                {/* Status Indicator Badge */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs">
                    <span className="text-[11px] text-gray-400 font-medium">
                        {t('settings.mic.level')}: <span className="font-mono text-cyan-300 font-bold">{volumeLevel}%</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                        {isTesting ? (
                            isVoiceDetected ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                    🟢 {t('settings.mic.statusVoiceDetected')}
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                    🎙️ {t('settings.mic.statusListening')}
                                </span>
                            )
                        ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
                                ⚪ {t('settings.mic.statusStopped')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Visual Level Progress Bar */}
                <div className="space-y-1">
                    <div className="relative h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700/60 p-0.5">
                        {/* Fill bar */}
                        <div
                            className="h-full rounded-full transition-all duration-75"
                            style={{
                                width: `${Math.min(100, Math.max(0, volumeLevel))}%`,
                                background: volumeLevel > 80 
                                    ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%)' 
                                    : volumeLevel > 40 
                                        ? 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)' 
                                        : '#10b981'
                            }}
                        />
                        {/* Peak hold notch */}
                        {peakLevel > 0 && (
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-sm"
                                style={{ left: `calc(${peakLevel}% - 2px)` }}
                            />
                        )}
                    </div>
                    {/* Scale labels */}
                    <div className="flex justify-between text-[9px] text-gray-500 font-mono px-0.5">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                </div>

                {/* Animated Spectrum Canvas */}
                <div className="rounded-lg overflow-hidden border border-gray-800 bg-slate-950">
                    <canvas
                        ref={canvasRef}
                        width={560}
                        height={46}
                        className="w-full h-[46px] block"
                    />
                </div>

                {/* Test Sample Recording and Playback */}
                <div className="pt-2 border-t border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-[11px] text-gray-400">
                        {t('settings.mic.sampleDesc')}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleRecordSample}
                            disabled={isRecordingSample}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                                isRecordingSample
                                    ? 'bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${isRecordingSample ? 'bg-red-500 animate-ping' : 'bg-red-400'}`} />
                            {isRecordingSample 
                                ? `${t('settings.mic.recordingSample')} (${sampleCountdown}s)`
                                : t('settings.mic.recordSample')
                            }
                        </button>

                        {sampleAudioUrl && (
                            <audio
                                src={sampleAudioUrl}
                                controls
                                className="h-7 max-w-[150px] sm:max-w-[180px] rounded"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Information card */}
            <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-[11px] text-cyan-300/80 leading-relaxed flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">ℹ️</span>
                <div>
                    {language === 'ru' ? (
                        <>Выбранный микрофон используется в ноде <b>Text Input</b> при нажатии на иконку микрофона. Записанный голос отправляется на транскрибацию в модель <b>gemini-3.5-transcribe</b> и автоматически вставляется как текст.</>
                    ) : (
                        <>The selected microphone is used in the <b>Text Input</b> node when clicking the microphone icon. Voice audio is sent for transcription via <b>gemini-3.5-transcribe</b> and inserted as text.</>
                    )}
                </div>
            </div>
        </div>
    );
};
