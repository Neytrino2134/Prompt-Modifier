
import { useState, useCallback, useRef } from 'react';
import { Group, Node } from '../types';
import { calculateGroupBounds } from '../utils/nodeUtils';

export const useGroups = (initialGroups: Group[]) => {
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const groupIdCounter = useRef<number>(0);

    const addGroup = useCallback((nodesToGroup: Node[], title?: string) => {
        if (nodesToGroup.length === 0) return;

        const bounds = calculateGroupBounds(nodesToGroup);
        if (!bounds) return;
        
        groupIdCounter.current++;

        const newGroup: Group = {
            id: `group-${groupIdCounter.current}-${Date.now()}`,
            title: title || `Group ${groupIdCounter.current}`,
            ...bounds,
            nodeIds: nodesToGroup.map(n => n.id)
        };
        
        setGroups(current => [...current, newGroup]);
    }, []);
    
    const removeGroup = useCallback((groupId: string) => {
        setGroups(current => current.filter(g => g.id !== groupId));
    }, []);

    const updateGroupBounds = useCallback((groupId: string, allNodes: Node[]) => {
        setGroups(prevGroups => {
            return prevGroups.map(group => {
                if (group.id === groupId) {
                    const groupNodes = allNodes.filter(n => group.nodeIds.includes(n.id));
                    const newBounds = calculateGroupBounds(groupNodes);
                    if (newBounds) {
                        return { ...group, ...newBounds };
                    }
                }
                return group;
            });
        });
    }, []);

    return {
        groups,
        setGroups,
        addGroup,
        removeGroup,
        updateGroupBounds
    };
};
