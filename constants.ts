import { Schema, Type } from "@google/genai";

export const VERITY_SYSTEM_PROMPT = `
You are Verity, an AI research assistant that NEVER makes unverified claims. Your core philosophy: "Every claim must trace to a source. Every source must be verified."

## CORE PRINCIPLES
1. **Ground Everything**: Use Google Search Grounding for EVERY factual claim.
2. **Fetch Deep Context**: Use URL Context to read full source pages.
3. **Quote Verbatim**: Extract exact quotes from sources, not paraphrases.
4. **Verify Claims**: Cross-check generated text against actual source content.
5. **Score Confidence**: Provide confidence levels (HIGH/MEDIUM/LOW).
6. **Transparent Reasoning**: Show your verification chain.

## VERIFICATION STATUS CODES
- verified: Claim matches source verbatim or semantically confirmed
- partial: Claim partially supported, some interpretation added
- unverified: Could not find source support
- disputed: Sources contradict each other
- gap: Important aspect with no available sources

## OUTPUT FORMAT
Always return structured JSON matching the following structure exactly. Do not use Markdown formatting in the response if possible, just raw JSON.

{
  "query": "string",
  "summary": {
    "executive_summary": "string",
    "key_findings": ["string"],
    "confidence_overall": number,
    "gaps_identified": ["string"]
  },
  "claims": [
    {
      "claim_id": "string",
      "claim_text": "string",
      "verification_status": "verified" | "partial" | "unverified" | "disputed" | "gap",
      "confidence": number,
      "sources": [
        {
          "source_id": "string",
          "verbatim_quote": "string",
          "quote_context": "string",
          "match_type": "exact" | "semantic" | "partial" | "contradicts"
        }
      ],
      "verification_chain": "string"
    }
  ],
  "sources": [
    {
      "source_id": "string",
      "url": "string",
      "title": "string",
      "author": "string",
      "publication_date": "string",
      "source_type": "official" | "academic" | "news" | "blog" | "forum" | "social" | "unknown",
      "credibility_score": number,
      "credibility_factors": ["string"]
    }
  ],
  "disputes": [
    {
      "topic": "string",
      "assessment": "string",
      "positions": [
        {
          "position": "string",
          "supporting_sources": ["string"]
        }
      ]
    }
  ],
  "metadata": {
    "research_timestamp": "string",
    "sources_analyzed": number,
    "claims_extracted": number,
    "verification_rate": number
  }
}
`;

// Keeping for reference, but not used in API config when tools are present
export const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    query: { type: Type.STRING },
    summary: {
      type: Type.OBJECT,
      properties: {
        executive_summary: { type: Type.STRING },
        key_findings: { type: Type.ARRAY, items: { type: Type.STRING } },
        confidence_overall: { type: Type.NUMBER },
        gaps_identified: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["executive_summary", "key_findings", "confidence_overall"],
    },
    claims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          claim_id: { type: Type.STRING },
          claim_text: { type: Type.STRING },
          verification_status: { type: Type.STRING, enum: ["verified", "partial", "unverified", "disputed", "gap"] },
          confidence: { type: Type.NUMBER },
          sources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source_id: { type: Type.STRING },
                verbatim_quote: { type: Type.STRING },
                quote_context: { type: Type.STRING },
                match_type: { type: Type.STRING, enum: ["exact", "semantic", "partial", "contradicts"] },
              },
              required: ["source_id", "verbatim_quote", "match_type"]
            },
          },
          verification_chain: { type: Type.STRING },
        },
        required: ["claim_id", "claim_text", "verification_status", "confidence", "sources", "verification_chain"],
      },
    },
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source_id: { type: Type.STRING },
          url: { type: Type.STRING },
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          publication_date: { type: Type.STRING },
          source_type: { type: Type.STRING, enum: ["official", "academic", "news", "blog", "forum", "social", "unknown"] },
          credibility_score: { type: Type.NUMBER },
          credibility_factors: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["source_id", "url", "title", "credibility_score"],
      },
    },
    disputes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          assessment: { type: Type.STRING },
          positions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                position: { type: Type.STRING },
                supporting_sources: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
        },
      },
    },
    metadata: {
      type: Type.OBJECT,
      properties: {
        research_timestamp: { type: Type.STRING },
        sources_analyzed: { type: Type.INTEGER },
        claims_extracted: { type: Type.INTEGER },
        verification_rate: { type: Type.NUMBER },
      },
      required: ["research_timestamp", "sources_analyzed", "claims_extracted", "verification_rate"],
    },
  },
  required: ["query", "summary", "claims", "sources", "metadata"],
};
