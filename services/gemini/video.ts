import { getConfiguredVideoModel, isOmniModel } from '../modelConfig';
import { createAIClient, callWithRetry, getApiKey } from './client';
import { GenerateVideoOptions } from './types';

export const generateVideo = async (
    prompt: string,
    optionsOrAspectRatio: GenerateVideoOptions | '16:9' | '9:16' | '1:1' = '16:9',
    legacyResolution: '720p' | '1080p' = '720p'
): Promise<string> => {
    const options: GenerateVideoOptions = typeof optionsOrAspectRatio === 'object'
        ? optionsOrAspectRatio
        : { aspectRatio: optionsOrAspectRatio, resolution: legacyResolution };

    const selectedModel = options.model || getConfiguredVideoModel() || 'gemini-omni-1.1-flash';
    const aspectRatio = options.aspectRatio || '16:9';
    const resolution = options.resolution || '720p';
    const duration = options.duration || '5s';
    const videoMode = options.videoMode || 'text_to_video';

    // Video generation logic handles long polling or synchronous interaction
    return callWithRetry(async () => {
        const ai = createAIClient();
        if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
            await window.aistudio.openSelectKey();
        }
        if (!prompt || prompt.trim() === '') throw new Error("Prompt required.");

        // Branch 1: Gemini Omni Flash Model via ai.interactions.create
        if (isOmniModel(selectedModel) || selectedModel.includes('omni')) {
            try {
                let interactionInput: any;

                if (videoMode === 'video_edit' && options.videoSource) {
                    // Video-to-video editing mode
                    const videoItem: any = {
                        type: 'video',
                        mime_type: options.videoSource.mimeType || 'video/mp4'
                    };
                    if (options.videoSource.uri) {
                        videoItem.uri = options.videoSource.uri;
                    } else if (options.videoSource.data) {
                        videoItem.data = options.videoSource.data.replace(/^data:[^;]+;base64,/, '');
                    }
                    interactionInput = [
                        videoItem,
                        { type: 'text', text: prompt }
                    ];
                } else if ((videoMode === 'image_to_video' || (options.images && options.images.length > 0)) && options.images && options.images.length > 0) {
                    // Image-to-video / Storyboard mode (multiple images supported)
                    const imageParts = options.images.map(img => ({
                        type: 'image',
                        mime_type: img.mimeType || 'image/png',
                        data: img.data.replace(/^data:[^;]+;base64,/, '')
                    }));
                    interactionInput = [
                        ...imageParts,
                        { type: 'text', text: prompt }
                    ];
                } else {
                    // Text-to-video mode
                    interactionInput = prompt;
                }

                const responseFormat: any = {
                    type: 'video',
                    aspect_ratio: aspectRatio,
                    duration: duration
                };

                const interactionPayload: any = {
                    model: selectedModel,
                    input: interactionInput,
                    background: false,
                    store: true,
                    stream: false,
                    response_format: responseFormat
                };

                if (options.previousInteractionId) {
                    interactionPayload.previous_interaction_id = options.previousInteractionId;
                }

                const interaction = await (ai as any).interactions.create(interactionPayload, { timeout: 300000 });

                // Check output_video on interaction
                const outputVideo = (interaction as any).output_video;
                if (outputVideo && outputVideo.data) {
                    const mime = outputVideo.mime_type || 'video/mp4';
                    return `data:${mime};base64,${outputVideo.data}`;
                }

                // Check interaction.steps for model output video
                if (Array.isArray((interaction as any).steps)) {
                    for (const step of (interaction as any).steps) {
                        if (step.type === 'model_output' && Array.isArray(step.content)) {
                            const videoContent = step.content.find((c: any) => c.type === 'video');
                            if (videoContent && videoContent.data) {
                                const mime = videoContent.mime_type || 'video/mp4';
                                return `data:${mime};base64,${videoContent.data}`;
                            }
                        }
                    }
                }

                if ((interaction as any).output_text) {
                    throw new Error(`Model response: ${(interaction as any).output_text}`);
                }

                throw new Error("No video data returned by Gemini Omni Flash.");
            } catch (error: any) {
                console.error("Error generating video with Omni Flash:", error);
                let message = error.message || '';
                if (error.status) message += ` Status: ${error.status}`;
                if (error.code) message += ` Code: ${error.code}`;
                throw new Error(`Failed to generate video with Omni Flash: ${message}`);
            }
        }

        // Branch 2: Veo and standard video generation models (ai.models.generateVideos)
        try {
            const config: any = {
                numberOfVideos: 1,
                resolution: resolution === '1080p' ? '1080p' : '720p',
                aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9'
            };

            const videoGenPayload: any = {
                model: selectedModel,
                prompt: prompt,
                config
            };

            if (options.images && options.images.length > 0) {
                const firstImg = options.images[0];
                videoGenPayload.image = {
                    imageBytes: firstImg.data.replace(/^data:[^;]+;base64,/, ''),
                    mimeType: firstImg.mimeType || 'image/png'
                };
            }

            let operation = await ai.models.generateVideos(videoGenPayload);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("No video URI returned.");

            const response = await fetch(`${downloadLink}&key=${getApiKey()}`);
            if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

            const videoBlob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(videoBlob);
            });

        } catch (error: any) {
            console.error("Error generating video:", error);
            let message = error.message || '';
            if (error.status) message += ` Status: ${error.status}`;
            if (error.code) message += ` Code: ${error.code}`;
            throw new Error(`Failed to generate video: ${message}`);
        }
    }, 1);
};
