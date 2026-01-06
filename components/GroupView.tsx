
import React from 'react';
import type { Group } from '../types';
import { useLanguage } from '../localization';
import { ActionButton } from './ActionButton';

interface GroupViewProps {
  group: Group;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onClose: (groupId: string, e: React.MouseEvent) => void;
  onRename: (groupId: string, currentTitle: string) => void;
  onSaveToCatalog: (groupId: string) => void;
  onSaveToDisk: (groupId: string) => void;
  onCopy?: (groupId: string) => void;
  onDuplicate?: (groupId: string) => void;
  isHoveredForDrop: boolean;
  isDragging: boolean;
}

const GroupView: React.FC<GroupViewProps> = ({ group, onMouseDown, onTouchStart, onClose, onRename, onSaveToCatalog, onSaveToDisk, onCopy, onDuplicate, isHoveredForDrop, isDragging }) => {
  const { t } = useLanguage();
  
  const isActive = isHoveredForDrop || isDragging;

  const borderStyle = isActive
    ? 'border-solid border-node-selected shadow-[0_0_15px_rgba(34,211,238,0.15)]'
    : 'border-dashed border-gray-500';
  
  // Modified to remove background highlight and glow, keeping only the border highlight active during interaction
  const bgStyle = 'bg-white/5';

  return (
    <div
      className={`group-view absolute ${bgStyle} border-2 ${borderStyle} rounded-lg transition-colors duration-200 pointer-events-none`}
      style={{
        left: group.position.x,
        top: group.position.y,
        width: group.width,
        height: group.height,
        // Z-Index hierarchy: 
        // 5: Default (Below nodes)
        // 490: Dragging (Above resting nodes, slightly below dragged nodes)
        zIndex: isDragging ? 490 : 5,
      }}
    >
      <div 
        className="bg-gray-700/50 text-white font-bold p-2 rounded-t-md flex justify-between items-center cursor-move pointer-events-auto"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onDoubleClick={() => onRename(group.id, group.title)}
      >
        <span className="truncate pr-2">{group.title}</span>
        <div 
            className="flex items-center space-x-1"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            <ActionButton title={t('group.rename')} onClick={() => onRename(group.id, group.title)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </ActionButton>
            <ActionButton title={t('node.action.copy')} onClick={() => onCopy && onCopy(group.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </ActionButton>
            <ActionButton title={t('group.duplicate')} onClick={() => onDuplicate && onDuplicate(group.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m-3-3h6" />
                </svg>
            </ActionButton>
            <ActionButton title={t('group.saveToCatalog')} onClick={() => onSaveToCatalog(group.id)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3 3-3-3m3 3V3" />
              </svg>
            </ActionButton>
            <ActionButton title={t('group.saveToDisk')} onClick={() => onSaveToDisk(group.id)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </ActionButton>
            <ActionButton title={t('group.ungroup')} onClick={(e) => onClose(group.id, e)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GroupView);
