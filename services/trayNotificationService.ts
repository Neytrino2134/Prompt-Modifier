// Elegant, compact Tray Notification Subsystem
// Handles in-app floating tray notifications, OS desktop tray notifications, and sound feedback

import { 
    playBatchSuccessSound, 
    playTaskSuccessSound, 
    playInfoSound, 
    playNotificationSound 
} from './soundNotificationService';

export type TrayNotificationCategory = 
    | 'batch_start' 
    | 'batch_success' 
    | 'image_output' 
    | 'image_editor' 
    | 'threed_batch_start' 
    | 'threed_batch_success'
    | 'general';

export interface TrayNotificationItem {
    id: string;
    category: TrayNotificationCategory;
    title: string;
    message: string;
    thumbnail?: string;
    badge?: string;
    badgeColor?: 'cyan' | 'emerald' | 'amber' | 'purple' | 'sky';
    timestamp: number;
    duration?: number; // ms, default 5500
    action?: {
        label: string;
        onClick: () => void;
    };
    nodeId?: string;
    meta?: {
        model?: string;
        aspectRatio?: string;
        count?: number;
    };
}

export interface TrayNotificationSettings {
    enabled: boolean;
    enableBatchStart: boolean;
    enableBatchSuccess: boolean;
    enableImageOutput: boolean;
    enableImageEditor: boolean;
    enableThreeDBatch: boolean;
    enableSound: boolean;
    enableNativeDesktop: boolean;
}

export const DEFAULT_TRAY_NOTIFICATION_SETTINGS: TrayNotificationSettings = {
    enabled: true,
    enableBatchStart: true,
    enableBatchSuccess: true,
    enableImageOutput: true,
    enableImageEditor: true,
    enableThreeDBatch: true,
    enableSound: true,
    enableNativeDesktop: true,
};

const STORAGE_KEY_TRAY_NOTIFICATIONS = 'settings_tray_notifications_v2';
export const TRAY_NOTIFICATIONS_CHANGED_EVENT = 'tray-notifications-changed';
export const TRAY_SETTINGS_CHANGED_EVENT = 'tray-notification-settings-changed';

let activeNotifications: TrayNotificationItem[] = [];
const subscribers = new Set<(items: TrayNotificationItem[]) => void>();

/**
 * Load settings from localStorage
 */
export const getTrayNotificationSettings = (): TrayNotificationSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_TRAY_NOTIFICATIONS);
        if (stored) {
            return {
                ...DEFAULT_TRAY_NOTIFICATION_SETTINGS,
                ...JSON.parse(stored)
            };
        }
    } catch (e) {
        console.warn('Failed to load tray notification settings:', e);
    }
    return { ...DEFAULT_TRAY_NOTIFICATION_SETTINGS };
};

/**
 * Save settings to localStorage
 */
export const saveTrayNotificationSettings = (partial: Partial<TrayNotificationSettings>): TrayNotificationSettings => {
    try {
        const current = getTrayNotificationSettings();
        const updated = { ...current, ...partial };
        localStorage.setItem(STORAGE_KEY_TRAY_NOTIFICATIONS, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(TRAY_SETTINGS_CHANGED_EVENT, { detail: updated }));
        }
        return updated;
    } catch (e) {
        console.error('Failed to save tray notification settings:', e);
        return { ...DEFAULT_TRAY_NOTIFICATION_SETTINGS, ...partial };
    }
};

/**
 * Subscribe to notification stack changes
 */
export const subscribeTrayNotifications = (listener: (items: TrayNotificationItem[]) => void) => {
    subscribers.add(listener);
    listener([...activeNotifications]);
    return () => {
        subscribers.delete(listener);
    };
};

const notifySubscribers = () => {
    const copy = [...activeNotifications];
    subscribers.forEach(cb => {
        try { cb(copy); } catch (err) { console.error('Tray notification subscriber error:', err); }
    });
};

/**
 * Request browser desktop notification permissions if supported
 */
export const requestDesktopNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch {
        return false;
    }
};

/**
 * Dispatch desktop OS notification (via Electron or Web Notification API)
 */
const dispatchDesktopNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', icon?: string) => {
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    if (isElectron) {
        const api = (window as any).electronAPI;
        if (api?.showTrayNotification) {
            api.showTrayNotification({
                title,
                message,
                type,
                icon
            });
        }
        return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: message,
                icon: icon || '/favicon.svg'
            });
        } catch {}
    }
};

/**
 * Dismiss a notification by ID
 */
export const dismissTrayNotification = (id: string) => {
    activeNotifications = activeNotifications.filter(item => item.id !== id);
    notifySubscribers();
};

/**
 * Clear all notifications
 */
export const clearAllTrayNotifications = () => {
    activeNotifications = [];
    notifySubscribers();
};

/**
 * Core notification dispatch function
 */
export const showTrayNotification = (options: {
    category: TrayNotificationCategory;
    title: string;
    message: string;
    thumbnail?: string;
    badge?: string;
    badgeColor?: 'cyan' | 'emerald' | 'amber' | 'purple' | 'sky';
    duration?: number;
    action?: { label: string; onClick: () => void };
    nodeId?: string;
    meta?: { model?: string; aspectRatio?: string; count?: number };
}) => {
    const settings = getTrayNotificationSettings();
    if (!settings.enabled) return;

    // Filter by specific toggle
    if (options.category === 'batch_start' && !settings.enableBatchStart) return;
    if (options.category === 'batch_success' && !settings.enableBatchSuccess) return;
    if (options.category === 'image_output' && !settings.enableImageOutput) return;
    if (options.category === 'image_editor' && !settings.enableImageEditor) return;
    if ((options.category === 'threed_batch_start' || options.category === 'threed_batch_success') && !settings.enableThreeDBatch) return;

    const id = `tray-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = options.duration ?? (options.action ? 7000 : 5200);

    const item: TrayNotificationItem = {
        id,
        category: options.category,
        title: options.title,
        message: options.message,
        thumbnail: options.thumbnail,
        badge: options.badge,
        badgeColor: options.badgeColor,
        timestamp: Date.now(),
        duration,
        action: options.action,
        nodeId: options.nodeId,
        meta: options.meta
    };

    // Keep max 4 visible notifications stacked
    activeNotifications = [item, ...activeNotifications.slice(0, 3)];
    notifySubscribers();

    // 1. Audio feedback
    if (settings.enableSound) {
        switch (options.category) {
            case 'batch_start':
            case 'threed_batch_start':
                playInfoSound();
                break;
            case 'batch_success':
            case 'threed_batch_success':
                playBatchSuccessSound();
                break;
            case 'image_output':
            case 'image_editor':
                playTaskSuccessSound();
                break;
            default:
                playInfoSound();
                break;
        }
    }

    // 2. OS Desktop / System Tray notification
    if (settings.enableNativeDesktop) {
        const notifType = options.category.includes('start') ? 'info' : 'success';
        dispatchDesktopNotification(options.title, options.message, notifType, options.thumbnail);
    }
};

// -------------------------------------------------------------
// Specialized convenience notification triggers:
// -------------------------------------------------------------

/**
 * 1. Batch Operation Start Notification
 */
export const notifyBatchStart = (options: {
    nodeTitle?: string;
    itemsCount: number;
    model?: string;
    nodeId?: string;
    onClick?: () => void;
}) => {
    const count = options.itemsCount || 1;
    const countText = count === 1 ? '1 кадр' : `${count} кадров`;
    const title = '📦 Батч операция запущена';
    const message = options.nodeTitle 
        ? `«${options.nodeTitle}»: ${countText} отправлено в фоновую обработку`
        : `Отправлено ${countText} в фоновую обработку Batch API`;

    showTrayNotification({
        category: 'batch_start',
        title,
        message,
        badge: 'BATCH START',
        badgeColor: 'cyan',
        nodeId: options.nodeId,
        meta: { count, model: options.model },
        action: options.onClick ? {
            label: 'В очередь',
            onClick: options.onClick
        } : undefined
    });
};

/**
 * 2. Batch Operation Successful Completion Notification
 */
export const notifyBatchSuccess = (options: {
    nodeTitle?: string;
    itemsCount: number;
    thumbnail?: string;
    nodeId?: string;
    onClick?: () => void;
}) => {
    const count = options.itemsCount || 1;
    const countText = count === 1 ? '1 изображение готово' : `${count} изображений готово`;
    const title = '✨ Батч операция завершена!';
    const message = options.nodeTitle
        ? `«${options.nodeTitle}»: ${countText} к загрузке`
        : `Успешно обработано: ${countText}`;

    showTrayNotification({
        category: 'batch_success',
        title,
        message,
        thumbnail: options.thumbnail,
        badge: 'BATCH READY',
        badgeColor: 'emerald',
        nodeId: options.nodeId,
        meta: { count },
        action: options.onClick ? {
            label: 'Смотреть',
            onClick: options.onClick
        } : undefined
    });
};

/**
 * 3. Image Output Node Generation Success Notification
 */
export const notifyImageOutputSuccess = (options: {
    nodeTitle?: string;
    prompt?: string;
    thumbnail?: string;
    model?: string;
    aspectRatio?: string;
    nodeId?: string;
    onClick?: () => void;
}) => {
    const title = '🖼️ Изображение готово';
    const subInfo = [options.aspectRatio, options.model].filter(Boolean).join(' • ');
    const snippet = options.prompt ? (options.prompt.length > 55 ? `${options.prompt.slice(0, 55)}…` : options.prompt) : '';
    const message = snippet 
        ? `${snippet} ${subInfo ? `(${subInfo})` : ''}`
        : `${options.nodeTitle || 'Image Output'}: Генерация успешно завершена!`;

    showTrayNotification({
        category: 'image_output',
        title,
        message,
        thumbnail: options.thumbnail,
        badge: 'IMAGE OUTPUT',
        badgeColor: 'sky',
        nodeId: options.nodeId,
        meta: { model: options.model, aspectRatio: options.aspectRatio },
        action: options.onClick ? {
            label: 'Просмотр',
            onClick: options.onClick
        } : undefined
    });
};

/**
 * 4. AI Image Editor Node Success Notification
 */
export const notifyImageEditorSuccess = (options: {
    nodeTitle?: string;
    prompt?: string;
    thumbnail?: string;
    frameIndex?: number;
    nodeId?: string;
    onClick?: () => void;
}) => {
    const frameLabel = options.frameIndex !== undefined ? ` (Кадр ${options.frameIndex + 1})` : '';
    const title = `🎨 AI Редактор завершил работу${frameLabel}`;
    const snippet = options.prompt ? (options.prompt.length > 55 ? `${options.prompt.slice(0, 55)}…` : options.prompt) : '';
    const message = snippet 
        ? snippet 
        : `${options.nodeTitle || 'AI Image Editor'}: Изменение изображения выполнено`;

    showTrayNotification({
        category: 'image_editor',
        title,
        message,
        thumbnail: options.thumbnail,
        badge: 'AI EDITOR',
        badgeColor: 'purple',
        nodeId: options.nodeId,
        action: options.onClick ? {
            label: 'Просмотр',
            onClick: options.onClick
        } : undefined
    });
};

/**
 * 5. Batch 3D Generation Start Notification
 */
export const notifyThreeDBatchStart = (options: {
    name?: string;
    packsCount: number;
    nodeId?: string;
    onClick?: () => void;
}) => {
    const count = options.packsCount || 1;
    const title = '🧊 3D Батч запущен';
    const message = options.name
        ? `«${options.name}»: ${count} паков моделей отправлено в Tripo 3D`
        : `${count} паков моделей отправлено на 3D генерацию`;

    showTrayNotification({
        category: 'threed_batch_start',
        title,
        message,
        badge: '3D BATCH',
        badgeColor: 'amber',
        nodeId: options.nodeId,
        meta: { count },
        action: options.onClick ? {
            label: 'Дашборд',
            onClick: options.onClick
        } : undefined
    });
};

/**
 * 6. Batch 3D Generation Successful Completion Notification
 */
export const notifyThreeDBatchSuccess = (options: {
    name?: string;
    completedCount: number;
    totalCount: number;
    thumbnail?: string;
    nodeId?: string;
    onClick?: () => void;
}) => {
    const title = '🏆 3D Батч успешно завершён!';
    const message = options.name
        ? `«${options.name}»: ${options.completedCount}/${options.totalCount} 3D моделей готовы к скачиванию`
        : `Готово ${options.completedCount}/${options.totalCount} 3D моделей`;

    showTrayNotification({
        category: 'threed_batch_success',
        title,
        message,
        thumbnail: options.thumbnail,
        badge: '3D READY',
        badgeColor: 'emerald',
        nodeId: options.nodeId,
        action: options.onClick ? {
            label: '3D Модели',
            onClick: options.onClick
        } : undefined
    });
};

/**
 * Interactive preview test for settings dialog
 */
export const testTrayNotification = (category: TrayNotificationCategory = 'batch_success') => {
    switch (category) {
        case 'batch_start':
            notifyBatchStart({
                nodeTitle: 'Cyberpunk Characters',
                itemsCount: 8,
                model: 'gemini-3-pro-image-preview'
            });
            break;
        case 'image_output':
            notifyImageOutputSuccess({
                nodeTitle: 'Hero Concept',
                prompt: 'Futuristic armored warrior standing in neon rain, raytracing cinematic 8k',
                aspectRatio: '16:9',
                model: 'gemini-3.1-flash-image'
            });
            break;
        case 'image_editor':
            notifyImageEditorSuccess({
                nodeTitle: 'Style Morph',
                prompt: 'Add volumetric lighting and holographic visor reflections',
                frameIndex: 0
            });
            break;
        case 'threed_batch_start':
            notifyThreeDBatchStart({
                name: 'Sci-Fi Props Pack',
                packsCount: 4
            });
            break;
        case 'threed_batch_success':
            notifyThreeDBatchSuccess({
                name: 'Sci-Fi Props Pack',
                completedCount: 4,
                totalCount: 4
            });
            break;
        case 'batch_success':
        default:
            notifyBatchSuccess({
                nodeTitle: 'Cyberpunk Characters',
                itemsCount: 8
            });
            break;
    }
};
