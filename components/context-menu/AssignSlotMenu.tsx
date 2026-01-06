
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NodeType } from '../../types';
import { getNodeTitle, getNodeIcon } from './ContextMenuUtils';

interface AssignSlotMenuProps {
    onClose: () => void;
    slotIndex: number;
    onSelect: (type: NodeType) => void;
    nodeGroups: Record<string, NodeType[]>;
    t: (key: string) => string;
}

export const AssignSlotMenu: React.FC<AssignSlotMenuProps> = ({ onClose, slotIndex, onSelect, nodeGroups, t }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return nodeGroups;
        const result: Record<string, NodeType[]> = {};
        const lowerTerm = searchTerm.toLowerCase();
        
        Object.keys(nodeGroups).forEach(groupKey => {
            const filtered = nodeGroups[groupKey].filter(type => {
                const title = getNodeTitle(type, t);
                return title.toLowerCase().includes(lowerTerm);
            });
            if (filtered.length > 0) {
                result[groupKey] = filtered;
            }
        });
        return result;
    }, [nodeGroups, searchTerm, t]);

    return (
        <div className="absolute top-0 left-0 w-full max-h-[340px] bg-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-node-border flex flex-col overflow-hidden z-20">
            <div className="flex flex-col p-2 border-b border-node-border flex-shrink-0 bg-input/30">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300">Assign Slot {slotIndex + 1}</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Search..." 
                    className="w-full bg-input text-xs text-gray-200 border border-node-border rounded px-2 py-1 focus:outline-none focus:border-accent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                />
            </div>
            <div className="overflow-y-auto p-2 space-y-3 custom-scrollbar flex-grow">
                 {Object.keys(filteredGroups).length > 0 ? (
                     Object.keys(filteredGroups).map((groupKey) => (
                     <div key={groupKey}>
                         <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-1 px-1">{t(`quickadd.group.${groupKey}` as any)}</h4>
                         <div className="grid grid-cols-1 gap-1">
                             {filteredGroups[groupKey].map(type => (
                                 <button 
                                    key={type} 
                                    onClick={() => onSelect(type)}
                                    className="flex items-center space-x-2 p-2 rounded hover:bg-accent/30 text-left transition-colors group"
                                 >
                                     <div className="text-gray-400 group-hover:text-accent">{getNodeIcon(type)}</div>
                                     <span className="text-xs text-gray-200 group-hover:text-white truncate">{getNodeTitle(type, t)}</span>
                                 </button>
                             ))}
                         </div>
                     </div>
                 ))
                 ) : (
                     <div className="p-2 text-xs text-gray-500 text-center">No results found</div>
                 )}
            </div>
        </div>
    );
};
