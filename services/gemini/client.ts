import { GoogleGenAI } from "@google/genai";

export const getApiKey = (): string => {
    const userKey = localStorage.getItem('settings_userApiKey');
    return (userKey && userKey.trim()) ? userKey.trim() : (process.env.API_KEY || (process.env as any).GEMINI_API_KEY || '');
};

export const createAIClient = (): GoogleGenAI => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key is missing. Please check your settings or environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper function to retry API calls on 503 (Overloaded) or 429 (Too Many Requests) errors
export const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> => {
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
