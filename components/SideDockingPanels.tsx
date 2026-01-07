
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DockMode } from '../types';
import { isRestrictedDockingNode } from '../utils/nodeUtils';

// Sub-component for individual dock buttons
const SideDockButton: React.FC<{
    mode: DockMode;
    isActive: boolean;
    icon: React.ReactNode;
    className?: string;
}> = ({ mode, isActive, icon, className }) => {
    // Remove border-b from className when active to prevent conflict with border-2
    // This ensures the button uses the full accent border when active, while keeping layout classes like h-20
    const activeClassName = className ? className.replace('border-b', '') : '';

    return (
        <div 
            data-dock-mode={mode} // Add data attribute for hit testing
            className={`
                w-12 h-16 flex items-center justify-center 
                transition-all duration-200 cursor-pointer flex-shrink-0
                ${isActive 
                    ? `bg-gray-800 border-2 border-accent text-accent shadow-[0_0_15px_var(--color-accent)] z-20 scale-110 ${activeClassName}` 
                    : `bg-gray-900/95 text-gray-500 hover:bg-gray-800 hover:text-gray-300 border-gray-600 ${className || ''}`
                }
            `}
        >
            <div className="pointer-events-none">
                {icon}
            </div>
        </div>
    );
};

export const SideDockingPanels: React.FC = () => {
    const context = useAppContext();

    if (!context) return null;

    const { draggingInfo, dockHoverMode, nodes } = context;
    
    // Only show interaction zones when dragging a node or when hovering related menu items
    const isDragging = draggingInfo?.type === 'node';
    
    // Check which specific mode is active for highlighting
    const activeMode = dockHoverMode;

    // Check if current dragged node is restricted
    let isRestricted = false;
    if (isDragging && draggingInfo) {
        const draggedNode = nodes.find(n => n.id === draggingInfo.id);
        if (draggedNode) {
            isRestricted = isRestrictedDockingNode(draggedNode.type);
        }
    }

    // Determine panel visibility based on active mode
    // We only show panels if the active mode is one of the sides or corners
    const showLeftPanel = activeMode === 'tl' || activeMode === 'q1' || activeMode === 'bl';
    const showRightPanel = activeMode === 'tr' || activeMode === 'q4' || activeMode === 'br';

    return (
        <>
            {/* Left Docking Zone Container */}
            <div 
                className="fixed top-0 left-0 bottom-0 z-[190] flex flex-col justify-center pointer-events-none"
            >
                {/* Panel Stack - Slides out */}
                <div 
                    className={`
                        absolute left-0 flex flex-col shadow-2xl rounded-r-xl overflow-hidden border-y border-r border-gray-600
                        transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-left pointer-events-auto
                        ${showLeftPanel ? 'translate-x-0' : '-translate-x-full'}
                    `}
                >
                    {/* Top Left - Hidden if Restricted */}
                    {!isRestricted && (
                        <SideDockButton 
                            mode="tl"
                            isActive={activeMode === 'tl'}
                            className="border-b"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M4 4h8v10H4z" opacity="0.9"/>
                                    <path d="M4 4h16v16H4z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                                </svg>
                            }
                        />
                    )}

                    {/* Left Strip (Q1) - Hidden if Restricted */}
                    {!isRestricted && (
                        <SideDockButton 
                            mode="q1"
                            isActive={activeMode === 'q1'}
                            className="border-b h-20"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M4 3h6v18H4z" opacity="0.9"/>
                                        <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                                </svg>
                            }
                        />
                    )}
                    
                    {/* Bottom Left - Hidden if Restricted */}
                    {!isRestricted && (
                        <SideDockButton 
                            mode="bl"
                            isActive={activeMode === 'bl'}
                            className=""
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M4 10h8v10H4z" opacity="0.9"/>
                                    <path d="M4 4h16v16H4z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                                </svg>
                            }
                        />
                    )}
                </div>
            </div>

            {/* Right Docking Zone Container */}
            <div 
                className="fixed top-0 right-0 bottom-0 z-[190] flex flex-col justify-center pointer-events-none"
            >
                {/* Panel Stack */}
                <div 
                    className={`
                        absolute right-0 flex flex-col shadow-2xl rounded-l-xl overflow-hidden border-y border-l border-gray-600
                        transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-right pointer-events-auto
                        ${showRightPanel ? 'translate-x-0' : 'translate-x-full'}
                    `}
                >
                    {/* Top Right */}
                    {!isRestricted && (
                        <SideDockButton 
                            mode="tr"
                            isActive={activeMode === 'tr'}
                            className="border-b"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 4h8v10h-8z" opacity="0.9"/>
                                    <path d="M4 4h16v16H4z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                                </svg>
                            }
                        />
                    )}

                    {/* Right Strip (Q4) */}
                    {!isRestricted && (
                        <SideDockButton 
                            mode="q4"
                            isActive={activeMode === 'q4'}
                            className="border-b h-20"
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14 3h6v18h-6z" opacity="0.9"/>
                                        <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                                </svg>
                            }
                        />
                    )}

                    {/* Bottom Right */}
                    {!isRestricted && (
                        <SideDockButton 
                            mode="br"
                            isActive={activeMode === 'br'}
                            className=""
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 10h8v10h-8z" opacity="0.9"/>
                                    <path d="M4 4h16v16H4z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                                </svg>
                            }
                        />
                    )}
                </div>
            </div>
        </>
    );
};
