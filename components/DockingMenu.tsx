
import React from 'react';
import { DockMode } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useLanguage } from '../localization';
import { isRestrictedDockingNode } from '../utils/nodeUtils';

interface DockingMenuProps {
    isVisible: boolean;
    hoveredMode: DockMode | null;
    mousePosition: { x: number; y: number };
}

// Compact Button Component
const DockButton: React.FC<{ 
    mode: DockMode; 
    icon: React.ReactNode; 
    label: string;
    isActive: boolean;
    onHover: (mode: DockMode | null) => void;
    className?: string;
}> = ({ mode, icon, label, isActive, onHover, className }) => {
    return (
        <div 
            data-dock-mode={mode} // Add data attribute for hit testing
            className={`relative flex items-center justify-center transition-all duration-200 cursor-pointer group ${className} ${isActive ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200' : 'bg-gray-800/80 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
            onMouseEnter={() => onHover(mode)}
            onMouseLeave={() => onHover(null)}
            style={{ pointerEvents: 'auto' }}
        >
            <div className="transform scale-90 group-hover:scale-100 transition-transform pointer-events-none">
                {icon}
            </div>
            {/* Tooltip */}
            <div className={`absolute top-full mt-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none border border-gray-700 transition-opacity duration-200 ease-in-out`}>
                {label}
            </div>
        </div>
    );
};

export const DockingMenu: React.FC<DockingMenuProps> = ({ isVisible, hoveredMode }) => {
    const { setDockHoverMode, draggingInfo, nodes } = useAppContext() || {};
    const { t } = useLanguage();

    if (!isVisible || !setDockHoverMode) return null;

    let isRestricted = false;
    if (draggingInfo?.type === 'node') {
        const draggedNode = nodes?.find(n => n.id === draggingInfo.id);
        if (draggedNode) {
            isRestricted = isRestrictedDockingNode(draggedNode.type);
        }
    }

    const handleHover = (mode: DockMode | null) => {
        setDockHoverMode(mode);
    };

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-down pointer-events-none select-none">
            <div className="bg-gray-900/90 backdrop-blur-xl p-1.5 rounded-lg border border-gray-600 shadow-2xl flex items-center gap-1 pointer-events-auto">
                
                {/* Q1 (Left most quarter) - Hide if Restricted */}
                {!isRestricted && (
                    <DockButton 
                        mode="q1" 
                        label={t('toolbar.dock.q1')}
                        isActive={hoveredMode === 'q1'} 
                        onHover={handleHover}
                        className="h-16 w-8 rounded border-2"
                        icon={<svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4h5v16H2z" opacity="0.9"/><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/></svg>}
                    />
                )}

                {/* Q2 (Mid-left quarter) - Hide if Restricted */}
                {!isRestricted && (
                    <DockButton 
                        mode="q2" 
                        label={t('toolbar.dock.q2')}
                        isActive={hoveredMode === 'q2'} 
                        onHover={handleHover}
                        className="h-16 w-8 rounded border-2"
                        icon={<svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4h5v16H7z" opacity="0.9"/><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/></svg>}
                    />
                )}

                {/* Left Group (TL / BL Stack) - Hide if Restricted */}
                {!isRestricted && (
                    <div className="flex flex-col gap-1 h-16 w-12">
                        <DockButton 
                            mode="tl" 
                            label={t('toolbar.dock.tl')}
                            isActive={hoveredMode === 'tl'} 
                            onHover={handleHover}
                            className="flex-1 rounded-t border-2"
                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h6v6H2z" opacity="0.9"/><path d="M2 2h12v12H2z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/></svg>}
                        />
                        <DockButton 
                            mode="bl" 
                            label={t('toolbar.dock.bl')}
                            isActive={hoveredMode === 'bl'} 
                            onHover={handleHover}
                            className="flex-1 rounded-b border-2"
                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8h6v6H2z" opacity="0.9"/><path d="M2 2h12v12H2z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/></svg>}
                        />
                    </div>
                )}

                {/* Left Half */}
                <DockButton 
                    mode="left" 
                    label={t('toolbar.dock.left')}
                    isActive={hoveredMode === 'left'} 
                    onHover={handleHover}
                    className="h-16 w-12 rounded border-2"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h8v16H4z" opacity="0.9"/><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/></svg>}
                />

                {/* Full Screen (Center) */}
                <DockButton 
                    mode="full" 
                    label={t('toolbar.dock.full')}
                    isActive={hoveredMode === 'full'} 
                    onHover={handleHover}
                    className="h-16 w-16 rounded-lg border-2 bg-gray-800"
                    icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="1" opacity="0.9"/><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/></svg>}
                />

                {/* Right Half */}
                <DockButton 
                    mode="right" 
                    label={t('toolbar.dock.right')}
                    isActive={hoveredMode === 'right'} 
                    onHover={handleHover}
                    className="h-16 w-12 rounded border-2"
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4h8v16h-8z" opacity="0.9"/><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/></svg>}
                />

                {/* Right Group (TR / BR Stack) - Hide if Restricted */}
                {!isRestricted && (
                    <div className="flex flex-col gap-1 h-16 w-12">
                        <DockButton 
                            mode="tr" 
                            label={t('toolbar.dock.tr')}
                            isActive={hoveredMode === 'tr'} 
                            onHover={handleHover}
                            className="flex-1 rounded-t border-2"
                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2h6v6H8z" opacity="0.9"/><path d="M2 2h12v12H2z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/></svg>}
                        />
                        <DockButton 
                            mode="br" 
                            label={t('toolbar.dock.br')}
                            isActive={hoveredMode === 'br'} 
                            onHover={handleHover}
                            className="flex-1 rounded-b border-2"
                            icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8h6v6H8z" opacity="0.9"/><path d="M2 2h12v12H2z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/></svg>}
                        />
                    </div>
                )}

                {/* Q3 (Mid-right quarter) - Hide if Restricted */}
                {!isRestricted && (
                    <DockButton 
                        mode="q3" 
                        label={t('toolbar.dock.q3')}
                        isActive={hoveredMode === 'q3'} 
                        onHover={handleHover}
                        className="h-16 w-8 rounded border-2"
                        icon={<svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4h5v16h-5z" opacity="0.9"/><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/></svg>}
                    />
                )}

                {/* Q4 (Right most quarter) - Hide if Restricted */}
                {!isRestricted && (
                    <DockButton 
                        mode="q4" 
                        label={t('toolbar.dock.q4')}
                        isActive={hoveredMode === 'q4'} 
                        onHover={handleHover}
                        className="h-16 w-8 rounded border-2"
                        icon={<svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 4h5v16h-5z" opacity="0.9"/><rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none" strokeWidth="2" opacity="0.5"/></svg>}
                    />
                )}

            </div>
        </div>
    );
};
