
import React, { useRef, useEffect, useState } from 'react';
import { Alignment, Point, DockMode } from '../types';
import { useLanguage } from '../localization';
import { useAppContext } from '../contexts/AppContext';
import { CopyIcon, PinLeftIcon, PinRightIcon } from './icons/AppIcons';
import { isRestrictedDockingNode } from '../utils/nodeUtils';

interface NodeAlignContextMenuProps {
    isOpen: boolean;
    position: Point;
    onClose: () => void;
    onAlign: (type: Alignment) => void;
}

const AlignButton: React.FC<{ title: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = ({ title, icon, onClick, disabled }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div 
            className="relative flex items-center justify-center"
            onMouseEnter={() => !disabled && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
                disabled={disabled}
                className={`group flex items-center justify-center p-2 text-sm rounded-md transition-colors ${disabled ? 'text-gray-600 cursor-not-allowed' : 'text-gray-200 hover:bg-accent hover:text-white'}`}
            >
                <div className={`${disabled ? 'text-gray-600' : 'text-gray-400 group-hover:text-white'}`}>{icon}</div>
            </button>
             <div 
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-xs whitespace-nowrap rounded-md shadow-xl z-[70] pointer-events-none transition-opacity duration-200 ease-in-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
                {title}
            </div>
        </div>
    );
};

const NodeAlignContextMenu: React.FC<NodeAlignContextMenuProps> = ({ isOpen, position, onClose, onAlign }) => {
    const { t } = useLanguage();
    const menuRef = useRef<HTMLDivElement>(null);
    const context = useAppContext();
    
    const [style, setStyle] = useState<React.CSSProperties>({ 
        opacity: 0, 
        pointerEvents: 'none', 
        transform: 'scale(0.95)',
        transition: 'opacity 0.15s ease-out, transform 0.15s ease-out'
    });

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
             window.addEventListener('mousedown', handleMouseDown);
        }
        return () => window.removeEventListener('mousedown', handleMouseDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            let left = position.x;
            let top = position.y;
            
            const ESTIMATED_WIDTH = 240;
            const ESTIMATED_HEIGHT = 100;

            if (left + ESTIMATED_WIDTH > window.innerWidth) {
                left = left - ESTIMATED_WIDTH;
            }
            if (top + ESTIMATED_HEIGHT > window.innerHeight) {
                top = top - ESTIMATED_HEIGHT;
            }
            
            requestAnimationFrame(() => {
                setStyle({
                    left,
                    top,
                    opacity: 1,
                    pointerEvents: 'auto',
                    transform: 'scale(1)',
                    transition: 'opacity 0.15s ease-out, transform 0.15s ease-out'
                });
            });
        } else {
            setStyle(prev => ({
                ...prev,
                opacity: 0,
                pointerEvents: 'none',
                transform: 'scale(0.95)'
            }));
        }
    }, [isOpen, position]);

    if (!isOpen && (style as any).opacity === 0) return null;

    // Check if any selected node is restricted
    let isRestricted = false;
    if (context && context.selectedNodeIds.length > 0) {
        // If single select or multi-select contains ANY restricted node, restrict layout options?
        // Usually logical to restrict if ANY is restricted.
        isRestricted = context.selectedNodeIds.some(id => {
            const node = context.nodes.find(n => n.id === id);
            return node ? isRestrictedDockingNode(node.type) : false;
        });
    }

    const handleAlign = (type: Alignment) => {
        onAlign(type);
        onClose();
    };

    const handleUndo = () => {
        if (context && context.undoPosition) {
            context.undoPosition(context.nodes);
        }
    };

    const handleRedo = () => {
         if (context && context.redoPosition) {
            context.redoPosition(context.nodes);
        }
    };

    const handleCopy = () => {
        if (context && context.selectedNodeIds.length > 0) {
            context.copyNodeValue(context.selectedNodeIds[context.selectedNodeIds.length - 1]);
            onClose();
        }
    };

    const handlePaste = () => {
        if (context) {
            context.handlePaste();
            onClose();
        }
    };

    const handleCollapse = () => {
        if (context) {
            context.selectedNodeIds.forEach(id => context.handleToggleNodeCollapse(id));
            onClose();
        }
    };

    const handleDock = (mode: DockMode) => {
        if (context && context.handleDockNode) {
            context.selectedNodeIds.forEach(id => context.handleDockNode(id, mode));
            onClose();
        }
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[70] bg-gray-800 rounded-lg shadow-2xl p-1 flex flex-col space-y-1"
            style={style}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Row 1: Alignment Tools */}
            <div className="flex flex-row space-x-1">
                <div className="flex items-center space-x-1 pr-1 border-r border-gray-600 mr-1">
                    <AlignButton 
                        title={t('contextMenu.undoPosition')} 
                        onClick={handleUndo}
                        disabled={!context?.canUndo}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
                    />
                    <AlignButton 
                        title={t('contextMenu.redoPosition')} 
                        onClick={handleRedo}
                        disabled={!context?.canRedo}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>}
                    />
                </div>

                <AlignButton 
                    title={t('contextMenu.align.left')} 
                    onClick={() => handleAlign('left')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="2" height="12" fill="currentColor" rx="1"/><rect x="5" y="4" width="6" height="2" fill="currentColor" rx="1"/><rect x="5" y="8" width="8" height="2" fill="currentColor" rx="1"/><rect x="5" y="12" width="4" height="2" fill="currentColor" rx="1"/></svg>}
                />
                <AlignButton 
                    title={t('contextMenu.align.centerX')} 
                    onClick={() => handleAlign('center-x')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="2" width="2" height="12" fill="currentColor" rx="1" opacity="0.5"/><rect x="3" y="4" width="10" height="2" fill="currentColor" rx="1"/><rect x="5" y="8" width="6" height="2" fill="currentColor" rx="1"/><rect x="2" y="12" width="12" height="2" fill="currentColor" rx="1"/></svg>}
                />
                <AlignButton 
                    title={t('contextMenu.align.right')} 
                    onClick={() => handleAlign('right')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="2" width="2" height="12" fill="currentColor" rx="1"/><rect x="5" y="4" width="6" height="2" fill="currentColor" rx="1"/><rect x="3" y="8" width="8" height="2" fill="currentColor" rx="1"/><rect x="7" y="12" width="4" height="2" fill="currentColor" rx="1"/></svg>}
                />
                <div className="w-px bg-gray-600 my-1 mx-1"></div>
                <AlignButton 
                    title={t('contextMenu.align.top')} 
                    onClick={() => handleAlign('top')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="12" height="2" fill="currentColor" rx="1"/><rect x="4" y="5" width="2" height="6" fill="currentColor" rx="1"/><rect x="8" y="5" width="2" height="8" fill="currentColor" rx="1"/><rect x="12" y="5" width="2" height="4" fill="currentColor" rx="1"/></svg>}
                />
                <AlignButton 
                    title={t('contextMenu.align.centerY')} 
                    onClick={() => handleAlign('center-y')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="12" height="2" fill="currentColor" rx="1" opacity="0.5"/><rect x="4" y="3" width="2" height="10" fill="currentColor" rx="1"/><rect x="8" y="5" width="2" height="6" fill="currentColor" rx="1"/><rect x="12" y="2" width="2" height="12" fill="currentColor" rx="1"/></svg>}
                />
                 <AlignButton 
                    title={t('contextMenu.align.bottom')} 
                    onClick={() => handleAlign('bottom')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="12" width="12" height="2" fill="currentColor" rx="1"/><rect x="4" y="5" width="2" height="6" fill="currentColor" rx="1"/><rect x="8" y="3" width="2" height="8" fill="currentColor" rx="1"/><rect x="12" y="7" width="2" height="4" fill="currentColor" rx="1"/></svg>}
                />
                <div className="w-px bg-gray-600 my-1 mx-1"></div>
                <AlignButton 
                    title={t('contextMenu.distribute.horizontal')} 
                    onClick={() => handleAlign('distribute-horizontal')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="2" height="12" fill="currentColor" rx="1"/><rect x="7" y="2" width="2" height="12" fill="currentColor" rx="1"/><rect x="12" y="2" width="2" height="12" fill="currentColor" rx="1"/></svg>}
                />
                <AlignButton 
                    title={t('contextMenu.distribute.vertical')} 
                    onClick={() => handleAlign('distribute-vertical')}
                    icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="12" height="2" fill="currentColor" rx="1"/><rect x="2" y="7" width="12" height="2" fill="currentColor" rx="1"/><rect x="2" y="12" width="12" height="2" fill="currentColor" rx="1"/></svg>}
                />
            </div>

            <div className="h-px bg-gray-600 w-full my-1"></div>

            {/* Row 2: General Actions + Docking */}
            <div className="flex flex-row space-x-1 justify-center">
                <AlignButton 
                    title={t('node.action.copy')}
                    onClick={handleCopy}
                    icon={<CopyIcon className="h-4 w-4" />}
                />
                <AlignButton 
                    title={t('node.action.paste')}
                    onClick={handlePaste}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                />
                <AlignButton 
                    title="Toggle Collapse"
                    onClick={handleCollapse}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                
                <div className="w-px bg-gray-600 my-1 mx-1"></div>
                
                {/* Docking Controls */}
                {!isRestricted && (
                    <>
                        <AlignButton 
                            title={t('toolbar.dock.q1')}
                            onClick={() => handleDock('q1')}
                            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="3" height="12" fill="currentColor" opacity="0.8"/><rect x="0.5" y="1.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeOpacity="0.3"/></svg>}
                        />
                         <AlignButton 
                            title={t('toolbar.dock.q2')}
                            onClick={() => handleDock('q2')}
                            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4.5" y="2" width="3" height="12" fill="currentColor" opacity="0.8"/><rect x="0.5" y="1.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeOpacity="0.3"/></svg>}
                        />
                    </>
                )}
                
                <AlignButton 
                    title={t('toolbar.dock.left')}
                    onClick={() => handleDock('left')}
                    icon={<PinLeftIcon className="h-4 w-4" />}
                />
                <AlignButton 
                    title={t('toolbar.dock.right')}
                    onClick={() => handleDock('right')}
                    icon={<PinRightIcon className="h-4 w-4" />}
                />
                
                {!isRestricted && (
                    <>
                        <AlignButton 
                            title={t('toolbar.dock.q3')}
                            onClick={() => handleDock('q3')}
                            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8.5" y="2" width="3" height="12" fill="currentColor" opacity="0.8"/><rect x="0.5" y="1.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeOpacity="0.3"/></svg>}
                        />
                        <AlignButton 
                            title={t('toolbar.dock.q4')}
                            onClick={() => handleDock('q4')}
                            icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="2" width="3" height="12" fill="currentColor" opacity="0.8"/><rect x="0.5" y="1.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeOpacity="0.3"/></svg>}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default NodeAlignContextMenu;
