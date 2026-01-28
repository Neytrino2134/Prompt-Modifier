

import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

export const getApiKey = () => {
  const useDevKey = localStorage.getItem('settings_useDevKey') === 'true';
  const userKey = localStorage.getItem('settings_userApiKey');
  
  if (useDevKey) {
      return process.env.API_KEY;
  }
  return userKey || process.env.API_KEY;
};

const createAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your settings or environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper function to retry API calls on 503 (Overloaded) or 429 (Too Many Requests) errors
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error.status || error.code;
      const isOverloaded = status === 503 || status === 429 || (error.message && error.message.toLowerCase().includes('overloaded'));
      
      if (!isOverloaded || i === retries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i); // Exponential backoff: 1s, 2s, 4s...
      console.warn(`Gemini API overloaded (503). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
};

export const enhancePrompt = async (texts: string[], safePrompt: boolean, technicalPrompt: boolean): Promise<string> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const validTexts = texts.filter(text => text && text.trim() !== '');
    if (validTexts.length === 0) {
      return "High-quality masterpiece, 8k, detailed textures, cinematic lighting.";
    }

    const combinedDescription = validTexts.join(', ');

    const commercialSafetyInstruction = safePrompt
      ? `STRICT REQUIREMENT: Zero trademarked terms, brand names, or specific artist identities. Use generic descriptive artistic terminology only.`
      : '';

    let systemInstruction = '';
    
    if (technicalPrompt) {
      systemInstruction = `
        You are a technical prompt architect for generative AI imaging systems. 
        Your task is to aggregate the provided concepts into a singular, high-precision technical specification string.

        GUIDELINES:
        - Use structured technical language.
        - Specify precise attributes: [Subject topology], [Material properties/textures], [Physical lighting parameters], [Optical camera settings], [Render engine characteristics].
        - ABSOLUTELY NO flowery, poetic, or evocative adjectives (e.g., avoid "beautiful", "mysterious").
        - Combine all concepts into a cohesive, high-density technical instruction set.
        - ${commercialSafetyInstruction}
        - Output ONLY the final technical string. No introductions, no markdown blocks.
      `;
    } else {
      systemInstruction = `
        You are an expert prompt engineer for high-end AI image generation.
        Your goal is to transform the user's basic concepts into a rich, descriptive, and highly aesthetic image prompt.
        
        GUIDELINES:
        - Use evocative language and sensory details.
        - Describe lighting, mood, atmosphere, and artistic style in detail.
        - Ensure the output is a single, cohesive paragraph optimized for high-quality results.
        - ${commercialSafetyInstruction}
        - Output ONLY the enhanced prompt. No introductions, no markdown.
      `;
    }

    const prompt = `Concepts to process: ${combinedDescription}`;

    try {
      // Fix: Use 'gemini-3-flash-preview' for basic text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction }
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Error processing prompt:", error);
      throw error; 
    }
  });
};

export const sanitizePrompt = async (promptToSanitize: string): Promise<string> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    if (!promptToSanitize || promptToSanitize.trim() === '') return "";

    const systemInstruction = `You are a prompt safety expert. Rewrite the user's prompt to be safer for image generation policies while preserving artistic intent. Replace age-specific terms (teenager, child) with neutral terms (young person, figure). Output only the sanitized prompt.`;

    try {
      // Fix: Use 'gemini-3-flash-preview' for basic text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sanitize: "${promptToSanitize}"`,
        config: { systemInstruction },
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Error sanitizing prompt:", error);
      throw error;
    }
  });
};

export const enhanceVideoPrompt = async (texts: string[]): Promise<string> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const validTexts = texts.filter(text => text && text.trim() !== '');
    if (validTexts.length === 0) return "A cinematic video, 4k, high resolution.";

    const combinedDescription = validTexts.join(', ');
    const prompt = `
      You are an expert video prompt engineer. Combine these concepts into a single, cohesive, detailed video prompt.
      Describe the scene, subjects, actions, camera movements, and lighting.
      Output only the prompt.
      
      Concepts: ${combinedDescription}
    `;

    try {
      // Fix: Use 'gemini-3-flash-preview' for basic text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Error enhancing video prompt:", error);
      throw error;
    }
  });
};

export const analyzePrompt = async (text: string, softPrompt: boolean | undefined): Promise<{ environment: string; characters: string[]; action: string; emotion: string; style: string; }> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    if (!text || text.trim() === '') {
      throw new Error("Input prompt for analysis cannot be empty.");
    }

    const softPromptInstruction = softPrompt
      ? `Important: When analyzing, formulate descriptions to be as neutral and safe as possible. Avoid potentially sensitive, intimate, or age-specific terms (like 'teenager', 'boy', 'girl'). Instead, use more general, age-ambiguous descriptions (like 'young person', 'figure', 'youthful character') while preserving the core artistic details and intent.`
      : '';

    const prompt = `
      ${softPromptInstruction}
      You are a meticulous and detailed prompt analyzer. Your task is to analyze the following text and deconstruct it into five distinct, comprehensive components. Do not summarize or shorten the information; instead, extract and organize all relevant details for each component.

      1.  **Environment/Setting**: Extract a complete and detailed description of the environment, setting, or background. Include all mentioned elements, atmosphere, lighting, time of day, and any contextual details. Crucially, also include descriptions of any secondary, background, or non-focal characters here (e.g., 'a crowd of people in the distance', 'birds flying in the sky').
      
      2.  **Characters/Subjects**: Identify and list ONLY the key, main, or foreground characters/subjects. Do NOT include background, secondary, or minor characters in this list. 
          For each main character, extract a detailed **physical description only**. 
          CRITICAL: **Exclude** all descriptions of actions (e.g., running, fighting, sitting), poses, and the surrounding environment/background. 
          Focus strictly on physical appearance, facial features, body type, hair, clothing, armor, and equipment/held items. The goal is to describe the character purely as they look, as if they were a 3D model or concept art asset in isolation.
          IMPORTANT: Append ", grey background, character concept" to the end of each character description. For example, if the text says "a hero fighting a dragon in a cave", the character entry for the hero should be "a hero in shining armor, detailed face, muscular build, grey background, character concept" (removing 'fighting' and 'cave').

      3.  **Action**: Describe the action being performed by the main characters in full detail. Generalize the subjects by replacing specific character names or descriptions with neutral terms such as "the character(s)" or "the subject(s)". The description of the action itself must be comprehensive and include all associated details.
      
      4.  **Emotion**: Describe the emotion being expressed by the main character(s) in general terms, detached from the specific subjects. For example, 'The character(s) are experiencing joy,' 'The subject(s) show signs of fear,' or 'A sense of wonder is being conveyed.' If no emotion is explicitly mentioned, infer a plausible one from the context of the action and environment. Focus on the feeling itself.
      
      5.  **Style**: CRITICAL: Your description for this category MUST be completely detached from the specific subjects and environment of the prompt. Analyze and describe ONLY the artistic essence. Focus on abstract elements like: art medium (e.g., photorealistic, oil painting, 3D render, anime, watercolor), mood (e.g., mysterious, cheerful, epic, melancholic), color palette (e.g., vibrant warm tones, monochromatic cool colors, pastel), lighting style (e.g., dramatic, soft, neon, chiaroscuro), composition (e.g., close-up, wide shot, rule of thirds), and artistic techniques (e.g., impressionistic brush strokes, sharp focus, cel shading). Under NO circumstances should you mention any objects, people, or places from the scene in this section. For example, instead of "cinematic shot of a knight", say "cinematic, dramatic lighting, sharp focus".

      If any component is missing from the input text, you should infer and create a plausible and complementary description for it based on the available context. The goal is to produce a complete set of components that could be used to reconstruct a detailed image prompt.

      Provide the output strictly as a JSON object with the keys "environment", "characters", "action", "emotion", and "style".

      Text to analyze: ${text}
    `;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        environment: {
          type: Type.STRING,
          description: 'A detailed description of the background, setting, or environment.'
        },
        characters: {
          type: Type.ARRAY,
          description: 'A list of all distinct characters or subjects in the prompt.',
          items: {
              type: Type.STRING
          }
        },
        action: {
          type: Type.STRING,
          description: 'A generalized description of the action the characters/subjects are performing, with specific subjects replaced by neutral terms.'
        },
        emotion: {
          type: Type.STRING,
          description: 'A generalized description of the emotion expressed by the character(s), such as joy, fear, or wonder.'
        },
        style: {
          type: Type.STRING,
          description: 'A detailed description of the art style, mood, and color palette.'
        }
      },
      required: ['environment', 'characters', 'action', 'emotion', 'style']
    };

    try {
      // Fix: Use 'gemini-3-pro-preview' for complex analysis tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema },
      });
      
      const responseText = response.text;
      if (!responseText) {
          throw new Error("Received an empty response from the model. The prompt may have been blocked due to safety settings.");
      }

      const parsed = JSON.parse(responseText);
      if (!Array.isArray(parsed.characters)) parsed.characters = [String(parsed.characters || '')];
      return parsed;
    } catch (error: any) {
      console.error("Error analyzing prompt:", error);
      throw error;
    }
  });
};

export const analyzeCharacter = async (text: string): Promise<{ character: string; clothing: string; }> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    if (!text || text.trim() === '') throw new Error("Input cannot be empty.");

    const prompt = `
      Analyze the character description. Split it into:
      1. character (physical features only)
      2. clothing (outfit only)
      Output JSON.
      Text: ${text}
    `;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        character: { type: Type.STRING },
        clothing: { type: Type.STRING }
      },
      required: ['character', 'clothing']
    };

    try {
      // Fix: Use 'gemini-3-flash-preview' for basic text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema },
      });
      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      console.error("Error analyzing character:", error);
      throw error;
    }
  });
};

export const updateCharacterDescription = async (imagePrompt: string, currentFullDescription: string, targetLanguageName: string): Promise<string> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    if (!imagePrompt || !imagePrompt.trim()) throw new Error("Image prompt is required.");

    const systemInstruction = `You are a character design expert. Your task is to update an existing character description based on a specific image generation prompt.
    
    INPUTS:
    1. Image Prompt: A description of a specific visual instance of the character.
    2. Current Description: A full markdown-formatted description of the character.

    GOAL:
    1. Rewrite the "Appearance" and "Clothing" sections of the description to match the details found in the Image Prompt.
    2. The "Personality" section must be preserved in meaning but TRANSLATED to ${targetLanguageName}.
    
    CRITICAL REQUIREMENT:
    The entire output (headers AND content) MUST be in the target language: ${targetLanguageName}.
    If the current description is in a different language, translate everything to ${targetLanguageName}.
    
    OUTPUT FORMAT:
    The output must be a single string in Markdown format, using the following headers in ${targetLanguageName}:
    - #### Appearance (translated header)
    - #### Personality (translated header)
    - #### Clothing (translated header)

    Output ONLY the updated description text.`;

    const contents = `Update this character description:
    
    IMAGE PROMPT:
    ${imagePrompt}
    
    CURRENT DESCRIPTION:
    ${currentFullDescription}`;

    try {
      // Fix: Use 'gemini-3-flash-preview' for basic text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: { systemInstruction },
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Error updating character description:", error);
      throw error;
    }
  });
};

export const updateCharacterSection = async (sectionName: string, imagePrompt: string, currentText: string, targetLanguageName: string): Promise<string> => {
    return callWithRetry(async () => {
        const ai = createAIClient();
        
        const systemInstruction = `You are a creative writer and character designer. 
        Your task is to generate or rewrite the "${sectionName}" section of a character description based on an image generation prompt.
        
        INPUTS:
        1. Image Prompt: Visual details of the character.
        2. Current Section Text: The existing text for this section (if any).
        
        GOAL:
        - Analyze the Image Prompt to extract details relevant to "${sectionName}" (e.g. physical features for Appearance, outfit for Clothing).
        - Rewrite the section text to be descriptive, cohesive, and aligned with the visual prompt.
        - Output strictly in the target language: ${targetLanguageName}.
        
        Output ONLY the new text for the section. Do not include headers.`;

        const contents = `IMAGE PROMPT:
        ${imagePrompt}
        
        CURRENT SECTION TEXT:
        ${currentText}`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents,
                config: { systemInstruction },
            });
            return response.text || "";
        } catch (error: any) {
            console.error(`Error updating character ${sectionName}:`, error);
            throw error;
        }
    });
};

export const updateCharacterPersonality = async (currentPersonality: string, targetLanguageName: string): Promise<string> => {
    return callWithRetry(async () => {
        const ai = createAIClient();
        
        const systemInstruction = `You are a creative writer and character designer. 
        Your task is to rewrite or improve the provided character personality description.
        The input may contain the current personality text AND a user request for changes mixed together.
        
        GOAL:
        1. Extract the core personality traits and the user's modification request (if any).
        2. Rewrite the personality description to incorporate the requested changes or simply improve the writing style if no specific change is requested.
        3. The output should be a cohesive, well-written paragraph describing the character's personality.
        4. Output strictly in the target language: ${targetLanguageName}.
        
        Output ONLY the new personality text. Do not include headers.`;

        const contents = `Current Personality / Request:
        ${currentPersonality}`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents,
                config: { systemInstruction },
            });
            return response.text || "";
        } catch (error: any) {
            console.error("Error updating character personality:", error);
            throw error;
        }
    });
};

export const modifyCharacter = async (instruction: string, currentPrompt: string, currentDescription: string, targetLanguageName: string): Promise<{ newPrompt: string, newDescription: string }> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    
    const systemInstruction = `You are a professional character concept artist.
    Your goal is to modify an existing character based on a user instruction.
    
    INPUTS:
    1. Instruction: What to change (e.g., "Change her clothes to a space suit").
    2. Current Image Prompt: The current short prompt used for image generation.
    3. Current Full Description: The detailed markdown description.

    TASK:
    - Update the Image Prompt to reflect the changes.
    - Update the Full Description (sections Appearance, Personality and Clothing) in ${targetLanguageName}.
    - Ensure all sections are consistent with the new instruction.
    - Output only a JSON object with keys 'newPrompt' and 'newDescription'.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        newPrompt: { type: Type.STRING },
        newDescription: { type: Type.STRING }
      },
      required: ['newPrompt', 'newDescription']
    };

    const contents = `INSTRUCTION: ${instruction}\nCURRENT PROMPT: ${currentPrompt}\nCURRENT DESCRIPTION: ${currentDescription}`;

    try {
      // Fix: Use 'gemini-3-pro-preview' for complex text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents,
        config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema },
      });
      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      console.error("Error modifying character:", error);
      throw error;
    }
  });
};

export const generateImage = async (
    prompt: string, 
    aspectRatio: string = '1:1',
    images: { base64ImageData: string, mimeType: string }[] | undefined,
    model: string = 'gemini-2.5-flash-image', // Default to nano banana for image gen
    resolution: string = '1K'
): Promise<string> => {
  // Wrapping generateImage with retry as well, although usually less prone to 503s on Imagen
  return callWithRetry(async () => {
    const ai = createAIClient();
    
    try {
      if (model === 'gemini-3-pro-image-preview') {
           const imageParts = (images || []).map(image => ({
               inlineData: { data: image.base64ImageData, mimeType: image.mimeType },
          }));
          const parts: any[] = [...imageParts];
          if (prompt && prompt.trim() !== '') parts.push({ text: prompt });

          const response = await ai.models.generateContent({
              model: 'gemini-3-pro-image-preview',
              contents: { parts },
              config: {
                  imageConfig: {
                      aspectRatio: aspectRatio,
                      imageSize: resolution // '1K', '2K', '4K'
                  }
              }
          });
          
          const candidate = response.candidates?.[0];
          const part = candidate?.content?.parts?.find(p => p.inlineData);
          if (part?.inlineData) {
               return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
          throw new Error("No image returned. The prompt may have been blocked or the model encountered an error.");
      }

      // Editing Mode (Input Images present)
      if (images && images.length > 0) {
          const imageParts = images.map(image => ({
               inlineData: { data: image.base64ImageData, mimeType: image.mimeType },
          }));
          const parts: any[] = [...imageParts];
          if (prompt && prompt.trim() !== '') {
              parts.push({ text: prompt });
          } else {
              // Ensure we send at least an empty text part if prompt is missing, as 2.5 editing expects text
              parts.push({ text: " " });
          }

          // Use the passed model if available, otherwise default logic
          const editingModel = model || 'gemini-2.5-flash-image';

          const response = await ai.models.generateContent({
            model: editingModel,
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
          });

          const candidate = response.candidates?.[0];
          const part = candidate?.content?.parts?.find(p => p.inlineData);
          if (part?.inlineData) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
          throw new Error("No image returned. The prompt may have been blocked.");

      } 
      // Generation Mode
      else {
          if (!prompt || prompt.trim() === '') throw new Error("Prompt required.");

          if (model.startsWith('imagen-4.0')) {
              const response = await ai.models.generateImages({
                  model: model,
                  prompt: prompt,
                  config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: aspectRatio },
              });
              if (response.generatedImages?.[0]?.image?.imageBytes) {
                  return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
              }
              throw new Error("No image returned.");
          } else {
              // Ensure we use the correct model for image gen. 
              // If user passed a text model by mistake, fallback to 2.5 flash image.
              const modelToUse = (model === 'gemini-3-flash-preview' || !model) ? 'gemini-2.5-flash-image' : model;
              
              const response = await ai.models.generateContent({
                model: modelToUse,
                contents: { parts: [{ text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
              });
              const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
              if (part?.inlineData) {
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
              throw new Error("No image returned.");
          }
      }
    } catch (error: any) {
      let message = error.message || '';
      if (error.status) message += ` Status: ${error.status}`;
      if (error.code) message += ` Code: ${error.code}`;
      if (error.details) message += ` Details: ${JSON.stringify(error.details)}`;
      
      if (!message && typeof error === 'object') {
          message = JSON.stringify(error);
      }
      
      throw new Error(`Failed to generate image. ${message}`);
    }
  }, 2, 2000); // Fewer retries for image gen as it is more expensive/slow
};

export const generateVideo = async (
    prompt: string,
    aspectRatio: '16:9' | '9:16' = '16:9',
    resolution: '720p' | '1080p' = '720p'
): Promise<string> => {
  // Video generation logic handles long polling, so we use fewer retries on the initial request
  return callWithRetry(async () => {
    const ai = createAIClient();
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
    }
    if (!prompt || prompt.trim() === '') throw new Error("Prompt required.");

    try {
      let operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          config: { numberOfVideos: 1, resolution, aspectRatio }
      });

      while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video URI returned.");
      
      const response = await fetch(`${downloadLink}&key=${getApiKey()}`);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      
      const videoBlob = await response.blob();
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(videoBlob);
      });

    } catch (error: any) {
      console.error("Error generating video:", error);
      let message = error.message || '';
      if (error.status) message += ` Status: ${error.status}`;
      if (error.code) message += ` Code: ${error.code}`;
      throw new Error(`Failed to video video. ${message}`);
    }
  }, 1); // Only 1 retry for video to avoid spamming expensive ops
};

export const describeImage = async (base64ImageData: string, mimeType: string, softPrompt: boolean | undefined): Promise<string> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const softInstruction = softPrompt ? `Important: Use neutral, safe terms.` : '';
    const prompt = `${softInstruction} Describe this image in detail (subject, setting, colors, mood).`;

    try {
      // Fix: Use 'gemini-3-flash-preview' for image description per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Error describing image:", error);
      throw error;
    }
  });
};

export const generatePromptFromImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    return callWithRetry(async () => {
        const ai = createAIClient();
        const prompt = `Analyze the visual appearance of the character in this image to create a text-to-image prompt.

        **REQUIREMENTS:**
        1. **SUBJECT ONLY**: Describe ONLY the character's physical features (face, hair, body type) and clothing/accessories in detail.
        2. **STYLE**: Describe the artistic style and render quality using general descriptive terms (e.g., '3D stylized render', 'soft lighting', 'detailed textures').

        **NEGATIVE CONSTRAINTS (DO NOT INCLUDE):**
        - DO NOT describe the pose, action, or gesture.
        - DO NOT describe the background or environment.
        - DO NOT use trademarked studio names (e.g., avoid 'Pixar', 'Disney'). Use generic style descriptions instead.

        Return ONLY the raw prompt text.`;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            });
            return response.text || "";
        } catch (error: any) {
            console.error("Error generating prompt from image:", error);
            throw error;
        }
    });
};


export const extractTextFromImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const prompt = `Extract all text from this image. Return only the text found, without any description. If no text is found, say "No text found".`;

    try {
      // Fix: Use 'gemini-3-flash-preview' for OCR per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Error extracting text from image:", error);
      throw error;
    }
  });
};

export const translateText = async (text: string, targetLanguageName: string): Promise<string> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    if (!text || text.trim() === '') throw new Error("Input empty.");

    try {
      // Fix: Use 'gemini-3-flash-preview' for basic text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: { systemInstruction: `Translate to ${targetLanguageName}. Return only translated text.` },
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Error translating:", error);
      throw error;
    }
  });
};

export const generateScript = async (prompt: string, targetLanguageName: string): Promise<any> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const schema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        detailedCharacters: { 
            type: Type.ARRAY, 
            items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, fullDescription: { type: Type.STRING } } } 
        },
        scenes: { 
            type: Type.ARRAY, 
            items: { type: Type.OBJECT, properties: { sceneNumber: { type: Type.INTEGER }, description: { type: Type.STRING }, narratorText: { type: Type.STRING } } } 
        }
      },
      required: ['summary', 'detailedCharacters', 'scenes']
    };

    try {
      // Fix: Use 'gemini-3-pro-preview' for complex script generation per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
            systemInstruction: `Generate a script structure in ${targetLanguageName}. Use markdown in fullDescription.`,
            responseMimeType: "application/json", 
            responseSchema: schema 
        },
      });
      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      console.error("Error generating script:", error);
      throw error;
    }
  });
};

export const generateCharacters = async (prompt: string): Promise<any[]> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          index: { type: Type.STRING },
          imagePrompt: { type: Type.STRING },
          fullDescription: { type: Type.STRING }
        },
        required: ['name', 'fullDescription', 'index', 'imagePrompt']
      }
    };

    try {
      // Fix: Use 'gemini-3-flash-preview' for basic text tasks per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
            systemInstruction: "Generate detailed characters. Use markdown headings in fullDescription. Ensure 'index' is provided (e.g. 'Entity-1', 'Entity-2').",
            responseMimeType: "application/json", 
            responseSchema: schema 
        },
      });
      return JSON.parse(response.text || "[]");
    } catch (error: any) {
      console.error("Error generating characters:", error);
      throw error;
    }
  });
};

export const translateScript = async (script: any, targetLanguageName: string): Promise<any> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const systemInstruction = `Translate user-facing fields to ${targetLanguageName}. Preserve structure and markdown.`;
    
    try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: `Translate:\n${JSON.stringify(script)}`,
          config: { systemInstruction, responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "{}");
    } catch(error: any) {
        throw new Error(error.message);
    }
  });
};

export const modifyPromptSequence = async (
    prompts: any[], 
    instruction: string, 
    targetLanguage: string = 'en', 
    modelName: string = 'gemini-3-flash-preview',
    includeVideoPrompts: boolean = false,
    sceneContexts: Record<string, string> = {}
): Promise<{ modifiedFrames: any[], modifiedSceneContexts: { sceneNumber: number, context: string }[] }> => {
  return callWithRetry(async () => {
    const ai = createAIClient();
    const schema = {
      type: Type.OBJECT,
      properties: {
        modifiedFrames: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              frameNumber: { type: Type.INTEGER },
              sceneNumber: { type: Type.INTEGER },
              prompt: { type: Type.STRING },
              videoPrompt: { type: Type.STRING },
              shotType: { type: Type.STRING, description: 'The type of shot (e.g., WS, CU, ECU, LS, MS).' },
              characters: { type: Type.ARRAY, items: { type: Type.STRING } },
              duration: { type: Type.INTEGER }
            },
            required: ['frameNumber', 'sceneNumber', 'prompt', 'characters', 'duration', 'shotType', ...(includeVideoPrompts ? ['videoPrompt'] : [])]
          }
        },
        modifiedSceneContexts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              context: { type: Type.STRING, description: 'The updated scene context description.' }
            },
            required: ['sceneNumber', 'context']
          }
        }
      },
      required: ['modifiedFrames']
    };

    const languageInstruction = targetLanguage === 'ru' 
        ? 'Ensure the response fields (like prompts and context) are in Russian.' 
        : 'Ensure the response fields (like prompts and context) are in English.';

    let videoInstruction = "";
    if (includeVideoPrompts) {
        videoInstruction = `
        CRITICAL: You MUST also generate or modify the 'videoPrompt' field for every frame.
        - If 'videoPrompt' is empty or missing in the source: Generate a NEW video prompt based on the image 'prompt'. It MUST describe specific actions happening in the frame and camera movements (e.g., "Camera pans left", "Zoom in").
        - If 'videoPrompt' exists: Modify it according to the user's instruction, while maintaining consistency with the image 'prompt'.
        `;
    }
    
    let contextInstruction = "";
    if (Object.keys(sceneContexts).length > 0) {
        contextInstruction = `
        **SCENE CONTEXT**:
        The input data includes "sceneContexts". This dictionary maps scene numbers to context descriptions.
        
        TASK:
        1. Apply the user's instruction to the frames.
        2. IF the instruction implies changing the overall setting, mood, or context of a scene (e.g., "Change the weather to snow", "Make it night time"), YOU MUST ALSO MODIFY the Scene Context text for that scene.
        3. Return the updated scene contexts in the 'modifiedSceneContexts' array. Only include contexts that have changed or are relevant to the modified frames.
        
        Context Data: ${JSON.stringify(sceneContexts)}
        `;
    }

    try {
      const response = await ai.models.generateContent({
        model: modelName, 
        contents: `Instruction: ${instruction}\n${contextInstruction}\nData: ${JSON.stringify(prompts)}`,
        config: { 
            systemInstruction: `Modify prompts based on instruction. Return a structured object with modified frames and modified scene contexts. ${languageInstruction} ${videoInstruction} For every frame, you MUST either preserve or generate a logical 'shotType' value (e.g., WS, MS, CU, etc.) representing the camera angle. Also, always ensure to return the correct 'sceneNumber' for each frame corresponding to the source.`,
            responseMimeType: "application/json", 
            responseSchema: schema 
        },
      });
      
      const parsed = JSON.parse(response.text || "{}");
      return {
          modifiedFrames: parsed.modifiedFrames || [],
          modifiedSceneContexts: parsed.modifiedSceneContexts || []
      };

    } catch (error: any) {
      console.error("Error modifying sequence:", error);
      throw error;
    }
  });
};