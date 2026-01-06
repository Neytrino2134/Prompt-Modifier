
import React, { useState, useCallback } from 'react';
import { Node } from '../types';

interface NodePositionSnapshot {
    id: string;
    position: { x: number; y: number };
}

export const useNodePositionHistory = (
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>
): {
    takeSnapshot: (nodes: Node[]) => void;
    undoPosition: (currentNodes: Node[]) => void;
    redoPosition: (currentNodes: Node[]) => void;
    canUndo: boolean;
    canRedo: boolean;
} => {
    const [past, setPast] = useState<NodePositionSnapshot[][]>([]);
    const [future, setFuture] = useState<NodePositionSnapshot[][]>([]);
    const LIMIT = 5;

    const takeSnapshot = useCallback((nodes: Node[]) => {
        const snapshot = nodes.map(n => ({
            id: n.id,
            position: { ...n.position }
        }));

        setPast(prev => {
            const newPast = [...prev, snapshot];
            if (newPast.length > LIMIT) {
                return newPast.slice(newPast.length - LIMIT);
            }
            return newPast;
        });
        setFuture([]);
    }, []);

    const undoPosition = useCallback((currentNodes: Node[]) => {
        setPast(prevPast => {
            if (prevPast.length === 0) return prevPast;

            const newPast = [...prevPast];
            const previousSnapshot = newPast.pop();
            
            if (previousSnapshot) {
                // Save current state to future before restoring
                const currentSnapshot = currentNodes.map(n => ({
                    id: n.id,
                    position: { ...n.position }
                }));
                setFuture(prevFuture => [currentSnapshot, ...prevFuture]);

                // Apply previous positions
                setNodes(nodes => nodes.map(n => {
                    const saved = previousSnapshot.find(s => s.id === n.id);
                    if (saved) {
                        return { ...n, position: { ...saved.position } };
                    }
                    return n;
                }));
            }

            return newPast;
        });
    }, [setNodes]);

    const redoPosition = useCallback((currentNodes: Node[]) => {
        setFuture(prevFuture => {
            if (prevFuture.length === 0) return prevFuture;

            const newFuture = [...prevFuture];
            const nextSnapshot = newFuture.shift();

            if (nextSnapshot) {
                // Save current state to past before restoring
                const currentSnapshot = currentNodes.map(n => ({
                    id: n.id,
                    position: { ...n.position }
                }));
                
                setPast(prevPast => {
                     const newPast = [...prevPast, currentSnapshot];
                     if (newPast.length > LIMIT) return newPast.slice(newPast.length - LIMIT);
                     return newPast;
                });

                // Apply future positions
                setNodes(nodes => nodes.map(n => {
                    const saved = nextSnapshot.find(s => s.id === n.id);
                    if (saved) {
                        return { ...n, position: { ...saved.position } };
                    }
                    return n;
                }));
            }

            return newFuture;
        });
    }, [setNodes]);

    return {
        takeSnapshot,
        undoPosition,
        redoPosition,
        canUndo: past.length > 0,
        canRedo: future.length > 0
    };
};
