import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { VERITY_PERSONA, VERITY_JSON_SCHEMA } from "../constants";
import { VerityResponse, ResearchDepth } from "../types";

const apiKey = process.env.API_KEY || "";

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

export const runResearch = async (
  query: string,
  depth: ResearchDepth,
  isVoiceMode: boolean = false
): Promise<VerityResponse> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }

  // --- STEP 1: GATHERING (Google Search) ---
  let depthInstruction = "";
  if (depth === "quick") depthInstruction = "Find the top 3 most relevant sources. Be concise but factual.";
  if (depth === "standard") depthInstruction = "Analyze 5-7 distinct high-quality sources. Provide a balanced view.";
  if (depth === "deep") depthInstruction = "Conduct an exhaustive search (10+ sources). Cross-reference extensively and look for edge cases.";

  const researchSystemInstruction = `
    You are an expert research assistant.
    GOAL: Conduct deep research using Google Search to answer the user's query.
    REQUIREMENTS:
    1. You MUST use the 'googleSearch' tool to find information.
    2. Cite your sources in the text using [1], [2] format corresponding to the search results.
    3. If there are conflicting views, explain the dispute clearly.
    4. Provide specific data points, dates, and names where available.
    5. Output the result as a comprehensive text report.
  `;

  const researchPrompt = `
    RESEARCH QUERY: "${query}"
    INSTRUCTION: ${depthInstruction}
  `;

  try {
    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: researchPrompt,
      config: {
        systemInstruction: researchSystemInstruction,
        tools: [{ googleSearch: {} }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    const researchText = searchResponse.text;
    const finishReason = searchResponse.candidates?.[0]?.finishReason;
    
    // Check if the research step actually produced text
    if (!researchText) {
      console.warn("Step 1 (Search) returned no text. FinishReason:", finishReason);
      
      let errorMessage = "Verity could not find information on this topic.";
      if (finishReason === "SAFETY") {
        errorMessage = "The research was blocked due to safety content filters.";
      } else if (finishReason === "RECITATION") {
        errorMessage = "The research was blocked due to recitation of copyrighted content.";
      }
      
      throw new Error(errorMessage + " (Step 1 No Text)");
    }

    // Capture Grounding Metadata to pass to Step 2
    const groundingMetadataRaw = searchResponse.candidates?.[0]?.groundingMetadata;
    const sourcesJson = JSON.stringify(groundingMetadataRaw?.groundingChunks || []);
    const searchQueries = groundingMetadataRaw?.webSearchQueries || [];

    // --- STEP 2: SYNTHESIS (JSON Formatting) ---
    const synthesisPrompt = `
      ${VERITY_PERSONA}

      ${VERITY_JSON_SCHEMA}

      INPUT DATA:
      
      [RESEARCH REPORT]
      ${researchText}
      
      [RAW SOURCES DATA]
      ${sourcesJson}

      INSTRUCTIONS:
      1. Analyze the [RESEARCH REPORT] and [RAW SOURCES DATA].
      2. Construct the final JSON response matching the schema.
      3. **Crucial**: Map the citations in the report (like [1]) to the sources in the raw data. 
         - Source [1] in the text usually corresponds to the first item in the raw sources list.
         - Use the 'uri' and 'title' from the raw sources to populate the 'sources' array in your JSON.
      4. Populate 'voice_response' if the context indicates voice mode.
      5. 'verification_status' for claims should be determined by how well the [RAW SOURCES DATA] supports the claim in the [RESEARCH REPORT].

      CONTEXT:
      Original Query: "${query}"
      voice_mode_active: ${isVoiceMode}
    `;

    const formatResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: synthesisPrompt,
      config: {
        responseMimeType: "application/json",
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    if (!formatResponse.text) {
      throw new Error("Verity failed to structure the research data.");
    }

    const structuredData = JSON.parse(formatResponse.text) as VerityResponse;

    // Attach the original search queries from Step 1 so the user can see what was searched
    const finalGroundingMetadata = {
      searchQueries: searchQueries,
      webSources: groundingMetadataRaw?.groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri || "",
        title: chunk.web?.title || "Unknown Source"
      })).filter((s: any) => s.uri) || []
    };

    return {
      ...structuredData,
      groundingMetadata: finalGroundingMetadata
    };

  } catch (error) {
    console.error("Gemini API Error in runResearch:", error);
    throw error;
  }
};

/**
 * Generates speech from text using Gemini 2.5 Flash TTS
 */
export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text }],
      },
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });
    
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};

export const getLiveClient = () => {
    return ai;
}
