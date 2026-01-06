
import { Node, NodeType } from '../../types';

export interface ProcessingContext {
  node: Node;
  upstreamData: (string | { base64ImageData: string, mimeType: string })[];
  // Callbacks for side effects
  saveImageToCache: (frameNumber: number, dataUrl: string) => void;
}

export interface ProcessResult {
  value: string | { [key: string]: any } | null;
  downloadData?: { url: string; prompt: string; type: NodeType };
}

export type NodeProcessor = (context: ProcessingContext) => Promise<ProcessResult>;
