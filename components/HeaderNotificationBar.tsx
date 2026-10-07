import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Toast, ToastType } from '../types';
import { 
    getTrayNotificationSettings, 
    TRAY_SETTINGS_CHANGED_EVENT, 
    TrayNotificationSettings 
} from '../services/trayNotificationService';

interface HeaderToastItemProps {
    toast: Toast;
    onDismiss: (id: number) => void;
}

const EXIT_ANIMATION_DURATION_MS = 350;

const HeaderToastItem: React.FC<HeaderToastItemProps> = ({ toast, onDismiss }) => {
    const isAction = Boolean(toast.action);
    const duration = isAction ? 7500 : 3800;
    const [isExiting, setIsExiting] = useState(false);

    const onDismissRef = useRef(onDismiss);
    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    // Trigger sliding exit animation and dismiss callback
    const handleDismiss = useCallback(() => {
        if (isExiting) return;
        setIsExiting(true);
        setTimeout(() => {
            onDismissRef.current(toast.id);
        }, EXIT_ANIMATION_DURATION_MS);
    }, [isExiting, toast.id]);

    // Auto-dismiss with smooth slide-out animation to the right into the system panel
    useEffect(() => {
        const exitTriggerTime = Math.max(0, duration - EXIT_ANIMATION_DURATION_MS);

        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, exitTriggerTime);

        const dismissTimer = setTimeout(() => {
            onDismissRef.current(toast.id);
        }, duration);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(dismissTimer);
        };
    }, [toast.id, duration]);

    const getTypeStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.2)]',
                    badge: 'bg-emerald-500 text-black',
                    icon: (
                        <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ),
                    progressBar: 'bg-emerald-400/70',
                    dotColor: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                };
            case 'error':
                return {
                    container: 'bg-rose-950/85 border-rose-500/50 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.2)]',
                    badge: 'bg-rose-500 text-white',
                    icon: (
                        <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <circle cx="12" cy="12" r="9" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                        </svg>
                    ),
                    progressBar: 'bg-rose-400/70',
                    dotColor: 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]'
                };
            case 'warning':
                return {
                    container: 'bg-amber-950/80 border-amber-500/50 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.2)]',
                    badge: 'bg-amber-500 text-black',
                    icon: (
                        <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    progressBar: 'bg-amber-400/70',
                    dotColor: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                };
            case 'info':
            default:
                return {
                    container: 'bg-gray-900/85 border-cyan-500/40 text-cyan-100 shadow-[0_0_14px_rgba(6,182,212,0.15)]',
                    badge: 'bg-cyan-500 text-black',
                    icon: (
                        <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    progressBar: 'bg-cyan-400/70',
                    dotColor: 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                };
        }
    };

    const style = getTypeStyles(toast.type);

    return (
        <div
            className={`relative group overflow-hidden flex items-center gap-2 px-2.5 py-1 min-h-[32px] rounded-md border backdrop-blur-md select-none app-region-no-drag ${style.container} ${
                isExiting 
                    ? 'animate-header-toast-out' 
                    : 'animate-header-toast-in'
            }`}
            style={{
                maxWidth: '420px',
            }}
            title={toast.message}
        >
            {/* Pulsing Status Dot & Icon */}
            <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor} animate-pulse`} />
                {style.icon}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0 flex items-center pr-1">
                <span className="text-[11px] font-medium tracking-wide truncate">
                    {toast.message}
                </span>
            </div>

            {/* Optional Action Button */}
            {toast.action && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toast.action?.onClick();
                        handleDismiss();
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold tracking-wide bg-white/20 hover:bg-white/35 active:scale-95 text-white transition-all cursor-pointer shadow-sm border border-white/25 hover:border-white/50"
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                    <span>{toast.action.label}</span>
                </button>
            )}

            {/* Close Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
                className="shrink-0 p-0.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Dismiss notification"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Micro Timer Bar */}
            <div
                className={`absolute bottom-0 left-0 h-[2px] ${style.progressBar}`}
                style={{
                    animation: `header-toast-progress ${duration}ms linear forwards`,
                }}
            />
        </div>
    );
};

export const HeaderNotificationBar: React.FC = () => {
    const context = useAppContext();
    const toasts = context?.toasts;
    const removeToast = context?.removeToast;
    const [isNotificationsEnabled, setIsNotificationsEnabled] = useState<boolean>(() => {
        return getTrayNotificationSettings().enabled;
    });

    useEffect(() => {
        const handleTraySettingsChange = (e: CustomEvent<TrayNotificationSettings>) => {
            if (e.detail && typeof e.detail.enabled === 'boolean') {
                setIsNotificationsEnabled(e.detail.enabled);
            } else {
                setIsNotificationsEnabled(getTrayNotificationSettings().enabled);
            }
        };
        window.addEventListener(TRAY_SETTINGS_CHANGED_EVENT as any, handleTraySettingsChange as EventListener);
        return () => {
            window.removeEventListener(TRAY_SETTINGS_CHANGED_EVENT as any, handleTraySettingsChange as EventListener);
        };
    }, []);

    const handleDismiss = useCallback((id: number) => {
        if (removeToast) {
            removeToast(id);
        }
    }, [removeToast]);

    if (!context || !toasts || toasts.length === 0 || !isNotificationsEnabled) {
        return null;
    }

    // Show up to 3 most recent toasts side by side or compact
    const visibleToasts = toasts.slice(-3);

    return (
        <div className="flex items-center gap-2 shrink-0 z-20 overflow-visible">
            {visibleToasts.map((toast) => (
                <HeaderToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={handleDismiss}
                />
            ))}
        </div>
    );
};

export default HeaderNotificationBar;
