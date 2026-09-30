// Procedural Web Audio Sound Notification System

export type SoundNotificationType = 
    | 'batch_success' 
    | 'batch_error' 
    | 'autosave' 
    | 'task_success' 
    | 'task_error' 
    | 'info' 
    | 'click';

export type SoundTheme = 'modern' | 'crystal' | 'organic' | 'minimal';

export interface SoundNotificationSettings {
    soundEnabled: boolean;
    masterVolume: number; // 0.0 to 1.0
    soundTheme: SoundTheme;
    enableBatchSuccessSound: boolean;
    enableBatchErrorSound: boolean;
    enableAutosaveSound: boolean;
    enableTaskCompleteSound: boolean;
    enableGeneralNotificationSound: boolean;
    batchSuccessVolume: number; // 0.0 to 1.0
    batchErrorVolume: number; // 0.0 to 1.0
    autosaveVolume: number; // 0.0 to 1.0 (quieter by default)
    taskCompleteVolume: number; // 0.0 to 1.0
    notificationVolume: number; // 0.0 to 1.0
}

export const DEFAULT_SOUND_SETTINGS: SoundNotificationSettings = {
    soundEnabled: true,
    masterVolume: 0.6,
    soundTheme: 'modern',
    enableBatchSuccessSound: true,
    enableBatchErrorSound: true,
    enableAutosaveSound: false,
    enableTaskCompleteSound: true,
    enableGeneralNotificationSound: true,
    batchSuccessVolume: 0.7,
    batchErrorVolume: 0.6,
    autosaveVolume: 0.25, // Noticeably quiet and gentle for background autosaves
    taskCompleteVolume: 0.6,
    notificationVolume: 0.5,
};

const STORAGE_KEY_SOUND_SETTINGS = 'settings_sound_notifications_v1';
export const SOUND_CONFIG_CHANGED_EVENT = 'sound-config-changed';

let audioContextInstance: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    try {
        if (!audioContextInstance) {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) {
                audioContextInstance = new AudioCtxClass();
            }
        }
        if (audioContextInstance && audioContextInstance.state === 'suspended') {
            audioContextInstance.resume().catch(() => {});
        }
        return audioContextInstance;
    } catch {
        return null;
    }
};

/**
 * Load sound settings from localStorage with fallback to defaults
 */
export const getSoundSettings = (): SoundNotificationSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_SOUND_SETTINGS);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_SOUND_SETTINGS,
                ...parsed,
            };
        }
    } catch (e) {
        console.warn('Failed to load sound settings from localStorage:', e);
    }
    return { ...DEFAULT_SOUND_SETTINGS };
};

/**
 * Save sound settings to localStorage and notify subscribers
 */
export const saveSoundSettings = (settings: Partial<SoundNotificationSettings>): SoundNotificationSettings => {
    try {
        const current = getSoundSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(STORAGE_KEY_SOUND_SETTINGS, JSON.stringify(updated));
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(SOUND_CONFIG_CHANGED_EVENT, { detail: updated }));
        }
        return updated;
    } catch (e) {
        console.error('Failed to save sound settings:', e);
        return { ...DEFAULT_SOUND_SETTINGS, ...settings };
    }
};

/**
 * Reset sound settings to default
 */
export const resetSoundSettings = (): SoundNotificationSettings => {
    try {
        localStorage.removeItem(STORAGE_KEY_SOUND_SETTINGS);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(SOUND_CONFIG_CHANGED_EVENT, { detail: DEFAULT_SOUND_SETTINGS }));
        }
    } catch (e) {
        console.error('Failed to reset sound settings:', e);
    }
    return { ...DEFAULT_SOUND_SETTINGS };
};

/**
 * Synthesizes smooth, peaceful, and elegant notification tones using Web Audio API
 */
export const playNotificationSound = (
    type: SoundNotificationType,
    options?: {
        force?: boolean;
        volumeOverride?: number;
        themeOverride?: SoundTheme;
    }
) => {
    const settings = getSoundSettings();

    // Check master switch (unless forced for test preview)
    if (!options?.force && !settings.soundEnabled) {
        return;
    }

    // Check specific event toggles (unless forced)
    if (!options?.force) {
        if (type === 'batch_success' && !settings.enableBatchSuccessSound) return;
        if (type === 'batch_error' && !settings.enableBatchErrorSound) return;
        if (type === 'autosave' && !settings.enableAutosaveSound) return;
        if (type === 'task_success' && !settings.enableTaskCompleteSound) return;
        if (type === 'task_error' && !settings.enableBatchErrorSound) return;
        if (type === 'info' && !settings.enableGeneralNotificationSound) return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const theme = options?.themeOverride || settings.soundTheme || 'modern';
    const masterVol = Math.max(0, Math.min(1, settings.masterVolume));
    
    // Calculate volume based on type
    let specificVol = 0.5;
    if (type === 'batch_success') specificVol = settings.batchSuccessVolume;
    else if (type === 'batch_error' || type === 'task_error') specificVol = settings.batchErrorVolume;
    else if (type === 'autosave') specificVol = settings.autosaveVolume;
    else if (type === 'task_success') specificVol = settings.taskCompleteVolume;
    else if (type === 'info') specificVol = settings.notificationVolume;
    else if (type === 'click') specificVol = 0.3;

    const finalVolume = options?.volumeOverride !== undefined 
        ? Math.max(0, Math.min(1, options.volumeOverride)) 
        : masterVol * specificVol;

    if (finalVolume <= 0.001) return;

    try {
        const now = ctx.currentTime;

        switch (type) {
            case 'batch_success':
                playBatchSuccessTone(ctx, now, finalVolume, theme);
                break;
            case 'batch_error':
            case 'task_error':
                playBatchErrorTone(ctx, now, finalVolume, theme);
                break;
            case 'autosave':
                playAutosaveTone(ctx, now, finalVolume, theme);
                break;
            case 'task_success':
                playTaskSuccessTone(ctx, now, finalVolume, theme);
                break;
            case 'info':
                playInfoTone(ctx, now, finalVolume, theme);
                break;
            case 'click':
                playSubtleClickTone(ctx, now, finalVolume);
                break;
        }
    } catch (e) {
        // Audio synthesis safely caught to prevent interruptions
        console.debug('Sound synthesis skipped:', e);
    }
};

/**
 * 1. Batch API Success Tone:
 * Warm, celestial, ascending harmonic chime with smooth envelopes.
 */
function playBatchSuccessTone(ctx: AudioContext, now: number, volume: number, theme: SoundTheme) {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(1, now);
    gainNode.connect(ctx.destination);

    if (theme === 'crystal') {
        // Shimmering crystalline chime (E5, G#5, B5, E6)
        const notes = [659.25, 830.61, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const delay = idx * 0.07;
            const startTime = now + delay;
            const duration = 0.55;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // Shimmer overtone
            const oscHarmonic = ctx.createOscillator();
            const harmGain = ctx.createGain();
            oscHarmonic.type = 'sine';
            oscHarmonic.frequency.setValueAtTime(freq * 2.01, startTime);

            harmGain.gain.setValueAtTime(0, startTime);
            harmGain.gain.linearRampToValueAtTime(volume * 0.08, startTime + 0.02);
            harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(volume * 0.22, startTime + 0.025);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(noteGain);
            oscHarmonic.connect(harmGain);
            noteGain.connect(gainNode);
            harmGain.connect(gainNode);

            osc.start(startTime);
            oscHarmonic.start(startTime);
            osc.stop(startTime + duration + 0.05);
            oscHarmonic.stop(startTime + duration + 0.05);
        });
    } else if (theme === 'organic') {
        // Warm marimba/kalimba harmonic chord (C5, E5, G5, C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const delay = idx * 0.06;
            const startTime = now + delay;
            const duration = 0.45;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            // Lowpass to make it warm and woody
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, startTime);
            filter.frequency.exponentialRampToValueAtTime(400, startTime + duration);

            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(volume * 0.24, startTime + 0.015);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(gainNode);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.05);
        });
    } else if (theme === 'minimal') {
        // Clean, subtle tech dual-blip (F#5 -> B5)
        [739.99, 987.77].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const startTime = now + idx * 0.08;
            const duration = 0.22;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.01);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(noteGain);
            noteGain.connect(gainNode);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.05);
        });
    } else {
        // Modern (Default): Silky smooth harmonic ascending triple chime (D5, G5, B5, D6)
        const notes = [587.33, 783.99, 987.77, 1174.66];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            const delay = idx * 0.065;
            const startTime = now + delay;
            const duration = 0.5;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(volume * 0.22, startTime + 0.02);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(noteGain);
            noteGain.connect(gainNode);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.05);
        });
    }
}

/**
 * 2. Batch API / Task Error Tone:
 * Mellow, soft low minor warning chime. Low frequencies, smooth attack/decay, never jarring.
 */
function playBatchErrorTone(ctx: AudioContext, now: number, volume: number, theme: SoundTheme) {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(1, now);
    gainNode.connect(ctx.destination);

    // Two soft descending minor tones (349.23 Hz -> 261.63 Hz or similar)
    const notes = [349.23, 261.63]; // F4 -> C4
    notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const startTime = now + idx * 0.12;
        const duration = 0.35;

        osc.type = theme === 'organic' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Lowpass filter for softness
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, startTime);
        filter.frequency.exponentialRampToValueAtTime(250, startTime + duration);

        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(volume * 0.22, startTime + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(gainNode);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    });
}

/**
 * 3. Autosave Whisper Tone:
 * Ultra-quiet, delicate, unobtrusive soft blip/water drop (< 0.1s).
 * Reassures user that canvas was saved without grabbing attention.
 */
function playAutosaveTone(ctx: AudioContext, now: number, volume: number, theme: SoundTheme) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const duration = 0.09;

    // Very quiet level
    const gentleVol = volume * 0.15;

    if (theme === 'organic') {
        // Subtle soft drop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + duration);
    } else if (theme === 'crystal') {
        // High airy gentle ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1320, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + duration);
    } else {
        // Modern soft gentle pulse (1046 Hz C6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now);
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + duration);
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gentleVol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.00005, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
}

/**
 * 4. Task Success Tone:
 * Crisp, pleasant dual-tone chime (G5 -> C6).
 */
function playTaskSuccessTone(ctx: AudioContext, now: number, volume: number, theme: SoundTheme) {
    const notes = [783.99, 1046.50]; // G5, C6
    notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const startTime = now + idx * 0.07;
        const duration = 0.32;

        osc.type = theme === 'organic' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(volume * 0.2, startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(noteGain);
        noteGain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    });
}

/**
 * 5. General Notification / Info Tone:
 * Light single pleasant harmonic ping.
 */
function playInfoTone(ctx: AudioContext, now: number, volume: number, theme: SoundTheme) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const duration = 0.25;

    osc.type = theme === 'organic' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(880, now); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.18, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.03);
}

/**
 * 6. Subtle Click Tone for UI interactions
 */
function playSubtleClickTone(ctx: AudioContext, now: number, volume: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const duration = 0.035;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
}

// Convenient helper functions for direct calls:
export const playBatchSuccessSound = () => playNotificationSound('batch_success');
export const playBatchErrorSound = () => playNotificationSound('batch_error');
export const playAutosaveSound = () => playNotificationSound('autosave');
export const playTaskSuccessSound = () => playNotificationSound('task_success');
export const playTaskErrorSound = () => playNotificationSound('task_error');
export const playInfoSound = () => playNotificationSound('info');
export const playSubtleClick = () => playNotificationSound('click');
