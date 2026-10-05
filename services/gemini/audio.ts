import { getConfiguredTranscribeModel } from '../modelConfig';
import { createAIClient, callWithRetry } from './client';

/**
 * Transcribes audio into text using multimodal audio models (gemini-3.8-flash, gemini-3.6-flash, gemini-3.5-transcribe).
 * @param base64Audio Base64-encoded audio data (data URL or raw base64 string)
 * @param mimeType The audio MIME type (e.g., 'audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg')
 * @param model Model identifier (defaults to configured transcribe model)
 */
export const transcribeAudio = async (
    base64Audio: string,
    mimeType: string = 'audio/webm',
    model: string = getConfiguredTranscribeModel()
): Promise<string> => {
    return callWithRetry(async () => {
        const ai = createAIClient();

        // Strip out data URI prefix completely (e.g. data:audio/webm;codecs=opus;base64,...)
        const rawBase64 = base64Audio.includes(',')
            ? base64Audio.split(',')[1]
            : base64Audio.replace(/^data:[^,]+,/, '');
        const cleanBase64 = rawBase64.replace(/\s+/g, '').trim();

        if (!cleanBase64) {
            return "";
        }

        // Standardize pure audio MIME
        let pureMime = (mimeType.split(';')[0] || 'audio/webm').trim();
        if (base64Audio.startsWith('data:')) {
            const dataPrefix = base64Audio.substring(5, base64Audio.indexOf(';'));
            if (dataPrefix && dataPrefix.includes('/')) {
                pureMime = dataPrefix.trim();
            }
        }

        const audioPart = {
            inlineData: {
                mimeType: pureMime,
                data: cleanBase64,
            },
        };

        const promptText = "Transcribe the spoken audio verbatim into clean text in the language spoken (e.g. Russian, English). Output ONLY the exact transcribed text without quotes, introductory text, explanations, or timestamps. If you cannot detect any speech or it is only background noise, reply with [EMPTY].";

        // Order of models to try
        const requestedModel = model || getConfiguredTranscribeModel() || 'gemini-3.8-flash';
        const candidateModels = [
            requestedModel,
            'gemini-3.8-flash',
            'gemini-3.6-flash',
            'gemini-3.5-transcribe'
        ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

        let lastError: any = null;

        for (const targetModel of candidateModels) {
            try {
                const response = await ai.models.generateContent({
                    model: targetModel,
                    contents: [
                        audioPart,
                        { text: promptText }
                    ]
                });

                let text = (response.text || '').trim();
                // Check candidates if text property is empty
                if (!text && response.candidates?.[0]?.content?.parts) {
                    for (const p of response.candidates[0].content.parts) {
                        if (p.text && p.text.trim()) {
                            text = p.text.trim();
                            break;
                        }
                    }
                }

                if (text) {
                    // Strip codeblocks or quotes if added by model
                    text = text.replace(/^```[a-z]*\s*|\s*```$/gi, '').trim();
                    text = text.replace(/^["'«»“”„]+|["'«»“”„]+$/g, '').trim();

                    // If model says [EMPTY] or [NO_SPEECH], treat as empty
                    if (text === '[EMPTY]' || text === '[NO_SPEECH]' || text === 'EMPTY') {
                        continue;
                    }

                    if (text.length > 0) {
                        return text;
                    }
                }
            } catch (error: any) {
                lastError = error;
                console.warn(`Transcription attempt with model ${targetModel} failed:`, error?.message || error);
                // Continue to try next candidate model
            }
        }

        if (lastError && candidateModels.length === 1) {
            console.error("Transcription error:", lastError);
            throw lastError;
        }

        return "";
    });
};
