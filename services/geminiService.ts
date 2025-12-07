import { GoogleGenAI } from "@google/genai";
import { VERITY_SYSTEM_PROMPT } from "../constants";
import { VerityResponse, ResearchDepth } from "../types";

const apiKey = process.env.API_KEY || "";

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

export const runResearch = async (
  query: string,
  depth: ResearchDepth
): Promise<VerityResponse> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  // Adjust prompt based on depth
  let depthInstruction = "";
  if (depth === "quick") depthInstruction = "Focus on the top 3 most relevant sources. Be concise.";
  if (depth === "standard") depthInstruction = "Analyze 5-7 distinct high-quality sources.";
  if (depth === "deep") depthInstruction = "Conduct an exhaustive search finding 10+ sources, cross-referencing extensively.";

  const finalPrompt = `
    Research Query: "${query}"
    
    Depth Setting: ${depth}
    Instruction: ${depthInstruction}
    
    Execute the research plan: Ground search, fetch URL contexts, verify claims, and format output as JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: finalPrompt,
      config: {
        systemInstruction: VERITY_SYSTEM_PROMPT,
        tools: [
          { googleSearch: {} },
          // Note: urlContext might not be supported on all models/env, but kept as per spec.
          // If it causes errors, it might need to be removed or replaced with just googleSearch.
          { urlContext: {} }
        ],
        // responseMimeType and responseSchema are NOT supported when using tools like googleSearch
        // We rely on the system prompt to enforce JSON structure.
      },
    });

    if (!response.text) {
      throw new Error("No text content returned from Gemini.");
    }

    // Extract JSON from potential Markdown code blocks
    let jsonString = response.text;
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    // Parse the JSON structure
    const structuredData = JSON.parse(jsonString) as VerityResponse;

    // Extract Grounding Metadata manually to attach to our response object
    // This comes from the Candidate object in the raw response
    const groundingMetadataRaw = response.candidates?.[0]?.groundingMetadata;
    
    const groundingMetadata = {
      searchQueries: groundingMetadataRaw?.webSearchQueries || [],
      webSources: groundingMetadataRaw?.groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || "Unknown Source"
      })).filter((s: any) => s.uri) || []
    };

    return {
      ...structuredData,
      groundingMetadata
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
