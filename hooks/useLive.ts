import { useState, useRef, useCallback, useEffect } from 'react';
import { getLiveClient, performTargetedResearch } from '../services/geminiService';
import { LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { AppSettings, DataUpdateHandler } from '../types';
import { VERITY_PERSONA } from '../constants';

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const uint8 = new Uint8Array(int16.buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let j = 0; j < len; j++) {
    binary += String.fromCharCode(uint8[j]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Tool Definition ---
const verificationTool: FunctionDeclaration = {
  name: 'verify_new_claim',
  description: 'Conducts real-time research to verify a specific claim or finding that is not in the current context. Use this when the user asks a question you do not know the answer to.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The specific question or claim to verify (e.g., "What is the battery life of the device?" or "Did the bill pass in 2024?")',
      },
    },
    required: ['query'],
  },
};

export const useLive = (
  settings: AppSettings, 
  contextText: string, 
  onDataUpdate?: DataUpdateHandler
) => {
  const [connected, setConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<Promise<any> | null>(null);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then(s => {
        try { s.close(); } catch(e) {}
      });
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
        sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
        sourcesRef.current.clear();
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setConnected(false);
    setIsTalking(false);
    setIsProcessingTool(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const ai = getLiveClient();

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceName || 'Zephyr' } },
          },
          tools: [{ functionDeclarations: [verificationTool] }],
          systemInstruction: `
          ${VERITY_PERSONA}
          
          You are now in LIVE VOICE MODE.
          
          INITIAL RESEARCH CONTEXT:
          ${contextText.slice(0, 15000)}
          
          INSTRUCTIONS:
          1. Discuss the research findings naturally.
          2. **CRITICAL**: If the user asks a question that is NOT answered by the context above, do not say "I don't know." Instead, call the 'verify_new_claim' tool with the specific question.
          3. When you call the tool, tell the user "One moment, I'm checking that for you..." while you wait.
          4. Once the tool returns data, incorporate it into your answer and inform the user that you've added it to their report.
        `,
        },
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            setConnected(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Tool Calls (The model wants to research something)
            if (msg.toolCall) {
              setIsProcessingTool(true);
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'verify_new_claim') {
                   const query = (fc.args as any).query;
                   console.log("Tool Triggered: verify_new_claim", query);
                   
                   // Execute the research on client/service side
                   const result = await performTargetedResearch(query);
                   
                   // Update the UI state via callback
                   if (onDataUpdate && result) {
                     onDataUpdate(result);
                   }

                   // Send response back to model
                   const toolResponse = {
                     result: `Verification Complete. Found ${result.claims?.length} new claims and ${result.sources?.length} sources. 
                              Summary of findings: ${result.summary?.executive_summary}. 
                              Top Fact: ${result.claims?.[0]?.claim_text}`
                   };

                   sessionPromise.then((session) => {
                     session.sendToolResponse({
                       functionResponses: {
                         id: fc.id,
                         name: fc.name,
                         response: toolResponse
                       }
                     });
                   });
                }
              }
              setIsProcessingTool(false);
            }

            // Handle Audio Response
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsTalking(true);
              const ctx = audioContextRef.current;
              if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) setIsTalking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsTalking(false);
            }
          },
          onclose: () => {
            disconnect();
          },
          onerror: (err) => {
            console.error("Live Session Error", err);
            setError("Connection failed");
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error("Connection failed", err);
      setError(err.message || "Failed to start live session");
      disconnect();
    }
  }, [contextText, settings.voiceName, disconnect, onDataUpdate]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    connected,
    isTalking,
    isProcessingTool,
    error
  };
};
