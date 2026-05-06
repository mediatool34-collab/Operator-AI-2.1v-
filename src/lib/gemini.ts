import { GoogleGenAI } from "@google/genai";

/**
 * Frontend-side Gemini AI service.
 * Follows AI Studio guidelines by calling Gemini API directly from the client.
 */
export async function analyzeWithGemini(prompt: string, isJson: boolean = false): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  
  if (!apiKey || apiKey === 'TODO') {
    throw new Error('Gemini API Key is missing. Please add it to the Secrets panel in AI Studio.');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const generate = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: isJson ? "application/json" : "text/plain"
      }
    });
  };

  try {
    const targetModel = isJson ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
    let response;
    
    try {
      response = await generate(targetModel);
    } catch (modelError: any) {
      if (isJson && (modelError.message?.includes('429') || modelError.message?.includes('RESOURCE_EXHAUSTED') || modelError.message?.includes('404'))) {
        // Fallback to flash if pro hits quota or is not found
        console.warn('Falling back to flash model due to error:', modelError.message);
        response = await generate('gemini-3-flash-preview');
      } else {
        throw modelError;
      }
    }

    return response.text || '';
  } catch (error: any) {
    if (error.message?.includes('API key not valid') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Gemini API Key. Please check the Secrets panel and ensure your key (starting with AIza...) is correctly copied.');
    }
    if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('Rate limit exceeded (Quota Exhausted). Please wait a few moments and try again, or check your API key billing details.');
    }
    throw error;
  }
}
