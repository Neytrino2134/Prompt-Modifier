export interface GenerateVideoOptions {
    model?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    resolution?: '720p' | '1080p';
    duration?: '5s' | '10s';
    videoMode?: 'text_to_video' | 'image_to_video' | 'video_edit';
    images?: Array<{ data: string; mimeType: string }>;
    videoSource?: { data?: string; uri?: string; mimeType: string };
    previousInteractionId?: string;
}

export interface BatchRequestItemInput {
    id: string;
    prompt: string;
    aspectRatio?: string;
    resolution?: string;
    size?: string;
    quality?: string;
    outputFormat?: string;
    thinkingLevel?: string;
    searchGrounding?: string;
    images?: { base64ImageData: string; mimeType: string }[];
}
