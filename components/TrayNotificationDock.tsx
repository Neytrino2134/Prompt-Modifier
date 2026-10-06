import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    TrayNotificationItem, 
    subscribeTrayNotifications, 
    dismissTrayNotification 
} from '../services/trayNotificationService';
import { Sparkles, Layers, Box, Image, Palette, X, ExternalLink, Bell } from 'lucide-react';

interface TrayNotificationCardProps {
    item: TrayNotificationItem;
    onDismiss: (id: string) => void;
}

const TrayNotificationCard: React.FC<TrayNotificationCardProps> = ({ item, onDismiss }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<number>(Date.now());
    const remainingTimeRef = useRef<number>(item.duration || 5500);
    const timerIdRef = useRef<NodeJS.Timeout | null>(null);

    const handleDismiss = useCallback(() => {
        if (isExiting) return;
        setIsExiting(true);
        setTimeout(() => {
            onDismiss(item.id);
        }, 280);
    }, [isExiting, item.id, onDismiss]);

    // Timer management with hover-pause
    useEffect(() => {
        if (isHovered) {
            if (timerIdRef.current) {
                clearTimeout(timerIdRef.current);
                timerIdRef.current = null;
            }
            const elapsed = Date.now() - startTimeRef.current;
            remainingTimeRef.current = Math.max(800, remainingTimeRef.current - elapsed);
            return;
        }

        startTimeRef.current = Date.now();
        timerIdRef.current = setTimeout(() => {
            handleDismiss();
        }, remainingTimeRef.current);

        return () => {
            if (timerIdRef.current) {
                clearTimeout(timerIdRef.current);
            }
        };
    }, [isHovered, handleDismiss]);

    // Color theme configuration based on notification type
    const getThemeConfig = () => {
        switch (item.category) {
            case 'batch_start':
                return {
                    border: 'border-cyan-500/40 hover:border-cyan-400/60',
                    shadow: 'shadow-[0_8px_28px_rgba(6,182,212,0.18)]',
                    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                    glow: 'bg-cyan-400',
                    progressBar: 'from-cyan-500 to-blue-500',
                    icon: <Layers className="w-4 h-4 text-cyan-300 animate-pulse" />
                };
            case 'batch_success':
                return {
                    border: 'border-emerald-500/45 hover:border-emerald-400/65',
                    shadow: 'shadow-[0_8px_28px_rgba(16,185,129,0.22)]',
                    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                    glow: 'bg-emerald-400',
                    progressBar: 'from-emerald-400 to-teal-500',
                    icon: <Sparkles className="w-4 h-4 text-emerald-300" />
                };
            case 'image_output':
                return {
                    border: 'border-sky-400/40 hover:border-sky-300/60',
                    shadow: 'shadow-[0_8px_28px_rgba(56,189,248,0.2)]',
                    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                    glow: 'bg-sky-400',
                    progressBar: 'from-sky-400 to-cyan-400',
                    icon: <Image className="w-4 h-4 text-sky-300" />
                };
            case 'image_editor':
                return {
                    border: 'border-purple-500/45 hover:border-purple-400/65',
                    shadow: 'shadow-[0_8px_28px_rgba(168,85,247,0.2)]',
                    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                    glow: 'bg-purple-400',
                    progressBar: 'from-purple-500 to-pink-500',
                    icon: <Palette className="w-4 h-4 text-purple-300" />
                };
            case 'threed_batch_start':
                return {
                    border: 'border-amber-500/40 hover:border-amber-400/60',
                    shadow: 'shadow-[0_8px_28px_rgba(245,158,11,0.2)]',
                    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    glow: 'bg-amber-400',
                    progressBar: 'from-amber-400 to-orange-500',
                    icon: <Box className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                };
            case 'threed_batch_success':
                return {
                    border: 'border-emerald-400/50 hover:border-emerald-300/70',
                    shadow: 'shadow-[0_8px_28px_rgba(52,211,153,0.25)]',
                    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
                    glow: 'bg-emerald-400',
                    progressBar: 'from-amber-400 to-emerald-400',
                    icon: <Box className="w-4 h-4 text-emerald-300" />
                };
            default:
                return {
                    border: 'border-gray-700 hover:border-gray-600',
                    shadow: 'shadow-[0_8px_28px_rgba(0,0,0,0.4)]',
                    badgeBg: 'bg-gray-800 text-gray-300 border-gray-700',
                    glow: 'bg-gray-400',
                    progressBar: 'from-gray-500 to-gray-400',
                    icon: <Bell className="w-4 h-4 text-gray-300" />
                };
        }
    };

    const theme = getThemeConfig();

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`pointer-events-auto relative group overflow-hidden flex items-start gap-3 p-3 rounded-xl bg-gray-950/92 backdrop-blur-xl border transition-all duration-300 select-none ${theme.border} ${theme.shadow} ${
                isExiting 
                    ? 'opacity-0 translate-x-8 scale-95' 
                    : 'opacity-100 translate-x-0 scale-100 animate-in fade-in slide-in-from-bottom-2 duration-300'
            }`}
            style={{ width: '360px', maxWidth: 'calc(100vw - 32px)' }}
        >
            {/* Ambient Background Gradient Glow */}
            <div 
                className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none ${theme.glow}`}
            />

            {/* Visual Icon / Thumbnail Area */}
            <div className="shrink-0 relative">
                {item.thumbnail ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/20 bg-gray-900 shadow-md">
                        <img 
                            src={item.thumbnail} 
                            alt="" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] leading-none text-white">
                            {item.category.includes('3d') ? '3D' : 'AI'}
                        </span>
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-900/80 border border-white/10 shadow-inner">
                        {theme.icon}
                    </div>
                )}
            </div>

            {/* Notification Content Body */}
            <div className="flex-1 min-w-0 pr-1">
                {/* Header Row: Badge, Tray Origin, Close */}
                <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {item.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border whitespace-nowrap ${theme.badgeBg}`}>
                                {item.badge}
                            </span>
                        )}
                        <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                            <span>📡 Трей</span>
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss();
                        }}
                        className="p-1 -mr-1 -mt-1 text-gray-500 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                        title="Закрыть уведомление"
                        aria-label="Close"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Title */}
                <h4 className="text-xs font-semibold text-white tracking-wide truncate" title={item.title}>
                    {item.title}
                </h4>

                {/* Message Text */}
                <p className="text-[11px] text-gray-300 leading-snug line-clamp-2 mt-0.5" title={item.message}>
                    {item.message}
                </p>

                {/* Optional Action Button */}
                {item.action && (
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                item.action?.onClick();
                                handleDismiss();
                            }}
                            className="px-2.5 py-1 rounded text-[10px] font-semibold tracking-wide bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                            <span>{item.action.label}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </button>
                    </div>
                )}
            </div>

            {/* Micro Timer Bar (Bottom progress) */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 overflow-hidden">
                <div
                    ref={progressRef}
                    className={`h-full bg-gradient-to-r ${theme.progressBar} transition-all`}
                    style={{
                        animation: isHovered 
                            ? 'none' 
                            : `tray-progress-decay ${item.duration || 5500}ms linear forwards`
                    }}
                />
            </div>
        </div>
    );
};

export const TrayNotificationDock: React.FC = () => {
    const [notifications, setNotifications] = useState<TrayNotificationItem[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeTrayNotifications((items) => {
            setNotifications(items);
        });
        return unsubscribe;
    }, []);

    const handleDismiss = useCallback((id: string) => {
        dismissTrayNotification(id);
    }, []);

    if (notifications.length === 0) {
        return null;
    }

    return (
        <aside 
            aria-label="Всплывающие уведомления в трее"
            className="fixed bottom-6 right-6 z-[9990] flex flex-col-reverse gap-2.5 pointer-events-none select-none"
        >
            {notifications.map((item) => (
                <TrayNotificationCard
                    key={item.id}
                    item={item}
                    onDismiss={handleDismiss}
                />
            ))}
        </aside>
    );
};

export default TrayNotificationDock;
