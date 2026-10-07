import { getOpenAiApiKey } from './config';

export interface OpenAiChatMessage {
    role: 'system' | 'user' | 'assistant' | 'developer';
    content: string | Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
    }>;
}

export interface OpenAiTextGenerationOptions {
    model?: string;
    messages?: OpenAiChatMessage[];
    prompt?: string;
    systemInstruction?: string;
    temperature?: number;
    responseFormat?: 'json_object' | 'text' | { type: string; json_schema?: any };
    images?: Array<{ base64ImageData: string; mimeType: string }>;
    maxTokens?: number;
}

/**
 * Check if a model identifier belongs to OpenAI text/reasoning models
 */
export const isOpenAiTextModel = (modelId?: string): boolean => {
    if (!modelId) return false;
    const lower = modelId.toLowerCase().trim();
    // Exclude image generation models
    if (lower.startsWith('gpt-image') || lower.startsWith('dall-e') || lower.includes('gpt-image')) {
        return false;
    }
    return (
        lower.startsWith('gpt-') ||
        lower.startsWith('o1') ||
        lower.startsWith('o3') ||
        lower.startsWith('chatgpt-')
    );
};

/**
 * Check if the model is an OpenAI reasoning model (o1, o3 series)
 * Reasoning models have special constraints (e.g. no custom temperature, use developer message or developer role)
 */
export const isReasoningModel = (modelId?: string): boolean => {
    if (!modelId) return false;
    const lower = modelId.toLowerCase().trim();
    return lower.startsWith('o1') || lower.startsWith('o3') || lower.includes('o1-') || lower.includes('o3-');
};

/**
 * Map user-facing model identifiers or aliases to valid OpenAI API model names
 */
export const mapToOpenAiApiTextModel = (modelName?: string): string => {
    if (!modelName) return 'gpt-6.1-sol';
    const m = modelName.trim().toLowerCase();

    // GPT-6 Flagship Generation (October 2026)
    if (m === 'gpt-6-astra' || m.includes('astra')) return 'gpt-6-astra';
    if (m === 'gpt-6.1-sol' || m === 'gpt-6-sol' || m.includes('sol')) return 'gpt-6.1-sol';
    if (m === 'gpt-6-luna' || m.includes('luna')) return 'gpt-6-luna';

    // Specialized Reasoning Models
    if (m === 'o3-mini' || m.includes('o3-mini')) return 'o3-mini';
    if (m === 'o3' || m.includes('o3')) return 'o3';
    if (m === 'o1-mini' || m.includes('o1-mini')) return 'o1-mini';
    if (m === 'o1' || m.includes('o1')) return 'o1';

    // Fallbacks & Previous Generation
    if (m === 'gpt-4o-mini' || m.includes('gpt-4o-mini')) return 'gpt-4o-mini';
    if (m === 'gpt-4o' || m.includes('gpt-4o')) return 'gpt-4o';

    return modelName.trim();
};

/**
 * Core OpenAI Chat & Text Completion runner
 */
export const callOpenAiChatCompletion = async (
    options: OpenAiTextGenerationOptions
): Promise<string> => {
    const apiKey = getOpenAiApiKey();
    if (!apiKey) {
        throw new Error("OpenAI API Key is missing. Please enter your OpenAI API key in Settings -> API.");
    }

    const requestedModel = options.model || 'gpt-6.1-sol';
    const targetModel = mapToOpenAiApiTextModel(requestedModel);
    const reasoning = isReasoningModel(targetModel);

    // Build messages list
    const messages: OpenAiChatMessage[] = [];

    // System instruction: reasoning models prefer 'developer' role or system
    if (options.systemInstruction && options.systemInstruction.trim()) {
        messages.push({
            role: reasoning ? 'developer' : 'system',
            content: options.systemInstruction.trim()
        });
    }

    if (options.messages && options.messages.length > 0) {
        messages.push(...options.messages);
    } else if (options.prompt) {
        if (options.images && options.images.length > 0) {
            const parts: any[] = [{ type: 'text', text: options.prompt }];
            for (const img of options.images) {
                if (img.base64ImageData) {
                    const mime = img.mimeType || 'image/png';
                    parts.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${mime};base64,${img.base64ImageData}`
                        }
                    });
                }
            }
            messages.push({ role: 'user', content: parts });
        } else {
            messages.push({ role: 'user', content: options.prompt });
        }
    }

    // Prepare JSON object format if requested
    const isJsonMode = options.responseFormat === 'json_object' || 
        (typeof options.responseFormat === 'object' && options.responseFormat?.type === 'json_object');

    if (isJsonMode) {
        const hasJsonWord = messages.some(m => {
            if (typeof m.content === 'string') return m.content.toLowerCase().includes('json');
            if (Array.isArray(m.content)) return m.content.some((p: any) => p.text?.toLowerCase().includes('json'));
            return false;
        });
        if (!hasJsonWord) {
            messages.push({ role: 'user', content: 'Output strictly in JSON format.' });
        }
    }

    const requestBody: Record<string, any> = {
        model: targetModel,
        messages: messages
    };

    // Temperature is not supported on reasoning models (o1, o3)
    if (!reasoning) {
        requestBody.temperature = options.temperature !== undefined ? options.temperature : 0.7;
    }

    if (isJsonMode) {
        requestBody.response_format = { type: 'json_object' };
    } else if (options.responseFormat && typeof options.responseFormat === 'object') {
        requestBody.response_format = options.responseFormat;
    }

    if (options.maxTokens) {
        if (reasoning) {
            requestBody.max_completion_tokens = options.maxTokens;
        } else {
            requestBody.max_tokens = options.maxTokens;
        }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    const data = await response.json().catch(() => null);

    // If requested model is not yet provisioned on this API key tier, fallback gracefully
    if (!response.ok || !data || data.error) {
        const errorMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : `OpenAI API returned HTTP ${response.status}`);
        
        if (
            (data?.error?.code === 'model_not_found' || errorMsg.includes('does not exist') || errorMsg.includes('not found') || response.status === 404) &&
            targetModel !== 'gpt-4o' && targetModel !== 'gpt-4o-mini'
        ) {
            let fallback = 'gpt-4o';
            if (targetModel === 'gpt-6-astra') {
                fallback = 'gpt-6.1-sol';
            } else if (targetModel === 'gpt-6-luna' || targetModel.includes('mini')) {
                fallback = 'gpt-4o-mini';
            } else {
                fallback = 'gpt-4o';
            }
            console.warn(`OpenAI model '${targetModel}' not available, retrying with '${fallback}'...`);
            return callOpenAiChatCompletion({
                ...options,
                model: fallback
            });
        }
        throw new Error(errorMsg);
    }

    const content = data.choices?.[0]?.message?.content || "";
    return content;
};

// ==========================================
// Specialized Task Wrappers for Canvas Nodes
// ==========================================

export const openAiEnhancePrompt = async (
    texts: string[],
    safePrompt: boolean,
    technicalPrompt: boolean,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const validTexts = texts.filter(text => text && text.trim() !== '');
    if (validTexts.length === 0) {
        return "High-quality masterpiece, 8k, detailed textures, cinematic lighting.";
    }

    const combinedDescription = validTexts.join(', ');
    const commercialSafetyInstruction = safePrompt
        ? `STRICT REQUIREMENT: Zero trademarked terms, brand names, or specific artist identities. Use generic descriptive artistic terminology only.`
        : '';

    const systemInstruction = technicalPrompt
        ? `You are a technical prompt architect for generative AI imaging systems.
Your task is to aggregate the provided concepts into a singular, high-precision technical specification string.
GUIDELINES:
- Use structured technical language.
- Specify precise attributes: [Subject topology], [Material properties/textures], [Physical lighting parameters], [Optical camera settings], [Render engine characteristics].
- ABSOLUTELY NO flowery adjectives.
- ${commercialSafetyInstruction}
- Output ONLY the final technical string. No introductions, no markdown blocks.`
        : `You are an expert prompt engineer for high-end AI image generation.
Your goal is to transform the user's basic concepts into a rich, descriptive, and highly aesthetic image prompt.
GUIDELINES:
- Use evocative language and sensory details.
- Describe lighting, mood, atmosphere, and artistic style in detail.
- Ensure the output is a single, cohesive paragraph optimized for high-quality results.
- ${commercialSafetyInstruction}
- Output ONLY the enhanced prompt. No introductions, no markdown.`;

    return callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `Concepts to process: ${combinedDescription}`
    });
};

export const openAiSanitizePrompt = async (
    promptToSanitize: string,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    if (!promptToSanitize || promptToSanitize.trim() === '') return "";
    const systemInstruction = `You are a prompt safety expert. Rewrite the user's prompt to be safer for image generation policies while preserving artistic intent. Replace age-specific terms (teenager, child) with neutral terms (young person, figure). Output only the sanitized prompt.`;
    return callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `Sanitize: "${promptToSanitize}"`
    });
};

export const openAiEnhanceVideoPrompt = async (
    texts: string[],
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const validTexts = texts.filter(text => text && text.trim() !== '');
    if (validTexts.length === 0) return "A cinematic video, 4k, high resolution.";

    const combinedDescription = validTexts.join(', ');
    const systemInstruction = `You are an expert video prompt engineer. Combine the provided concepts into a single, cohesive, detailed video prompt. Describe the scene, subjects, actions, camera movements, and lighting. Output only the prompt without conversational filler.`;

    return callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `Concepts: ${combinedDescription}`
    });
};

export const openAiAnalyzePrompt = async (
    text: string,
    softPrompt?: boolean,
    model: string = 'gpt-4o'
): Promise<{ environment: string; characters: string[]; action: string; emotion: string; style: string; }> => {
    if (!text || text.trim() === '') {
        throw new Error("Input prompt for analysis cannot be empty.");
    }

    const softPromptInstruction = softPrompt
        ? `Important: When analyzing, formulate descriptions to be as neutral and safe as possible. Avoid potentially sensitive, intimate, or age-specific terms.`
        : '';

    const systemInstruction = `You are a meticulous and detailed prompt analyzer. Your task is to analyze the text and deconstruct it into five distinct components. Return valid JSON with the exact keys: "environment", "characters" (array of strings), "action", "emotion", "style".
${softPromptInstruction}
1. environment: Complete description of environment, setting, atmosphere, lighting.
2. characters: Array of physical descriptions only of main subjects. Append ", grey background, character concept" to each item.
3. action: Generalized description of action being performed.
4. emotion: Description of emotion expressed.
5. style: Artistic medium, lighting, color palette, camera mood without subject references.`;

    const raw = await callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `Text to analyze: ${text}`,
        responseFormat: 'json_object'
    });

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.characters)) {
            parsed.characters = [String(parsed.characters || '')];
        }
        return {
            environment: parsed.environment || '',
            characters: parsed.characters || [],
            action: parsed.action || '',
            emotion: parsed.emotion || '',
            style: parsed.style || ''
        };
    } catch {
        return {
            environment: raw,
            characters: [],
            action: '',
            emotion: '',
            style: ''
        };
    }
};

export const openAiAnalyzeCharacter = async (
    text: string,
    model: string = 'gpt-4o-mini'
): Promise<{ character: string; clothing: string; }> => {
    if (!text || text.trim() === '') throw new Error("Input cannot be empty.");

    const systemInstruction = `Analyze the character description. Split it into:
1. character (physical features only)
2. clothing (outfit only)
Output JSON object with keys "character" and "clothing".`;

    const raw = await callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `Text: ${text}`,
        responseFormat: 'json_object'
    });

    try {
        return JSON.parse(raw);
    } catch {
        return { character: text, clothing: '' };
    }
};

export const openAiUpdateCharacterDescription = async (
    imagePrompt: string,
    currentFullDescription: string,
    targetLanguageName: string,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const systemInstruction = `You are a character design expert. Update an existing character description based on a specific image generation prompt.
Rewrite "Appearance" and "Clothing" sections to match the Image Prompt.
Preserve "Personality" section meaning translated to ${targetLanguageName}.
Entire output must be in ${targetLanguageName} with markdown headers:
- #### Appearance
- #### Personality
- #### Clothing
Output ONLY the updated description text.`;

    return callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `IMAGE PROMPT:\n${imagePrompt}\n\nCURRENT DESCRIPTION:\n${currentFullDescription}`
    });
};

export const openAiUpdateCharacterSection = async (
    sectionName: string,
    imagePrompt: string,
    currentText: string,
    targetLanguageName: string,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const systemInstruction = `You are a character designer. Rewrite the "${sectionName}" section based on the visual prompt. Output strictly in ${targetLanguageName}. Return only the new text without headers.`;
    return callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `IMAGE PROMPT:\n${imagePrompt}\n\nCURRENT SECTION TEXT:\n${currentText}`
    });
};

export const openAiUpdateCharacterPersonality = async (
    currentPersonality: string,
    targetLanguageName: string,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const systemInstruction = `You are a creative writer. Rewrite the personality description incorporating user requests. Output strictly in ${targetLanguageName}. Return only the new personality text without headers.`;
    return callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `Current Personality / Request:\n${currentPersonality}`
    });
};

export const openAiModifyCharacter = async (
    instruction: string,
    currentPrompt: string,
    currentDescription: string,
    targetLanguageName: string,
    model: string = 'gpt-4o'
): Promise<{ newPrompt: string; newDescription: string }> => {
    const systemInstruction = `You are a character concept artist. Modify an existing character based on instruction.
Return JSON with keys "newPrompt" (string) and "newDescription" (markdown string in ${targetLanguageName}).`;

    const raw = await callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `INSTRUCTION: ${instruction}\nCURRENT PROMPT: ${currentPrompt}\nCURRENT DESCRIPTION: ${currentDescription}`,
        responseFormat: 'json_object'
    });

    try {
        return JSON.parse(raw);
    } catch {
        return { newPrompt: currentPrompt, newDescription: currentDescription };
    }
};

export const openAiTranslateText = async (
    text: string,
    targetLanguageName: string,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    if (!text || text.trim() === '') throw new Error("Input empty.");
    return callOpenAiChatCompletion({
        model,
        systemInstruction: `Translate to ${targetLanguageName}. Return only translated text without any commentary.`,
        prompt: text
    });
};

export const openAiGenerateScript = async (
    prompt: string,
    targetLanguageName: string,
    model: string = 'gpt-4o'
): Promise<any> => {
    const systemInstruction = `Generate a script structure in ${targetLanguageName}. Output valid JSON with keys:
- "summary" (string)
- "detailedCharacters" (array of { name: string, fullDescription: string })
- "scenes" (array of { sceneNumber: number, description: string, narratorText: string })`;

    const raw = await callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt,
        responseFormat: 'json_object'
    });

    try {
        return JSON.parse(raw);
    } catch {
        return { summary: '', detailedCharacters: [], scenes: [] };
    }
};

export const openAiGenerateCharacters = async (
    prompt: string,
    model: string = 'gpt-4o-mini'
): Promise<any[]> => {
    const systemInstruction = `Generate detailed characters from prompt. Output JSON with a "characters" array where each object has: "name", "index" (e.g. "Entity-1"), "imagePrompt", and "fullDescription" with markdown.`;

    const raw = await callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt,
        responseFormat: 'json_object'
    });

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed.characters)) return parsed.characters;
        return [];
    } catch {
        return [];
    }
};

export const openAiTranslateScript = async (
    script: any,
    targetLanguageName: string,
    model: string = 'gpt-4o'
): Promise<any> => {
    const systemInstruction = `Translate user-facing fields in the provided script to ${targetLanguageName}. Preserve JSON structure and keys. Output strictly valid JSON.`;

    const raw = await callOpenAiChatCompletion({
        model,
        systemInstruction,
        prompt: `Translate:\n${JSON.stringify(script)}`,
        responseFormat: 'json_object'
    });

    try {
        return JSON.parse(raw);
    } catch {
        return script;
    }
};

export const openAiModifyPromptSequence = async (
    prompts: any[],
    instruction: string,
    targetLanguage: string = 'en',
    modelName: string = 'gpt-4o-mini',
    includeVideoPrompts: boolean = false,
    sceneContexts: Record<string, string> = {}
): Promise<{ modifiedFrames: any[]; modifiedSceneContexts: { sceneNumber: number; context: string }[] }> => {
    const languageInstruction = targetLanguage === 'ru'
        ? 'Ensure response prompt fields are in Russian.'
        : 'Ensure response prompt fields are in English.';

    let videoInstruction = "";
    if (includeVideoPrompts) {
        videoInstruction = `Generate or modify the 'videoPrompt' field for each frame describing actions and camera movement.`;
    }

    const systemInstruction = `Modify prompts based on instruction. ${languageInstruction} ${videoInstruction}
Output JSON with:
- "modifiedFrames": array of objects with frameNumber, sceneNumber, prompt, shotType, characters (array), duration, and optionally videoPrompt.
- "modifiedSceneContexts": array of objects with sceneNumber, context.`;

    const raw = await callOpenAiChatCompletion({
        model: modelName,
        systemInstruction,
        prompt: `Instruction: ${instruction}\nContexts: ${JSON.stringify(sceneContexts)}\nData: ${JSON.stringify(prompts)}`,
        responseFormat: 'json_object'
    });

    try {
        const parsed = JSON.parse(raw);
        return {
            modifiedFrames: parsed.modifiedFrames || [],
            modifiedSceneContexts: parsed.modifiedSceneContexts || []
        };
    } catch {
        return { modifiedFrames: [], modifiedSceneContexts: [] };
    }
};

export const openAiDescribeImage = async (
    base64ImageData: string,
    mimeType: string,
    softPrompt?: boolean,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const softInstruction = softPrompt ? `Use neutral, safe terms.` : '';
    const prompt = `${softInstruction} Describe this image in detail (subject, setting, colors, mood).`;

    return callOpenAiChatCompletion({
        model,
        prompt,
        images: [{ base64ImageData, mimeType }]
    });
};

export const openAiGeneratePromptFromImage = async (
    base64ImageData: string,
    mimeType: string,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const prompt = `Analyze the visual appearance of the character in this image to create a text-to-image prompt.
REQUIREMENTS:
1. SUBJECT ONLY: Describe physical features and clothing/accessories in detail.
2. STYLE: Describe artistic style and render quality using general descriptive terms.
Do not describe background or trademarked studio names.
Return ONLY the raw prompt text.`;

    return callOpenAiChatCompletion({
        model,
        prompt,
        images: [{ base64ImageData, mimeType }]
    });
};

export const openAiExtractTextFromImage = async (
    base64ImageData: string,
    mimeType: string,
    model: string = 'gpt-4o-mini'
): Promise<string> => {
    const prompt = `Extract all text from this image. Return only the text found without any description. If no text is found, return "No text found".`;

    return callOpenAiChatCompletion({
        model,
        prompt,
        images: [{ base64ImageData, mimeType }]
    });
};

export const openAiGenerateMultiviewPrompt = async (
    image: { base64ImageData: string; mimeType: string } | null,
    prompt: string,
    model: string = 'gpt-4o'
): Promise<string> => {
    return callOpenAiChatCompletion({
        model,
        prompt,
        images: image ? [image] : undefined
    });
};
