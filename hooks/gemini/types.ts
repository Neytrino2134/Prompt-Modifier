

import React from 'react';
import { Node, ActiveOperation, Tab, ToastType } from '../../types';

export interface GeminiGenerationCommonProps {
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    getUpstreamNodeValues: (nodeId: string, handleId?: string, currentNodes?: Node[], optimizedForUI?: boolean) => (string | { base64ImageData: string, mimeType: string })[];
    setError: (error: string | null) => void;
    t: (key: string) => string;
    setFullSizeImage: (nodeId: string, frameNumber: number, dataUrl: string) => void;
    getFullSizeImage: (nodeId: string, frameNumber: number) => string | undefined;
    activeTabId: string;
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    activeTabName: string;
    registerOperation: (op: ActiveOperation) => void;
    unregisterOperation: (id: string) => void;
    updateNodeInStorage: (targetTabId: string, nodeId: string, valueUpdater: (prevVal: any) => any, imageCacheUpdate?: { frame: number, url: string }) => void;
    activeTabIdRef: React.MutableRefObject<string>;
    addToast: (message: string, type?: ToastType) => void;
}