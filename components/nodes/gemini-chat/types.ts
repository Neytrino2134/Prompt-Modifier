
export interface ChatMessage {
    role: string;
    content: string;
    images?: string[];
}

export interface ChatAttachment {
    name: string;
    type: string;
    data: string;
}

export interface ChatNodeState {
    messages: ChatMessage[];
    currentInput: string;
    style: string;
    attachments: ChatAttachment[];
    model: string;
    lastPrompt?: string;
}
