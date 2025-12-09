import { useState, useRef, useCallback, useEffect } from 'react';
import { getLiveClient } from '../services/geminiService';
import { LiveServerMessage, Modality, Blob } from '@google/genai';
import { AppSettings } from '../types';
import { VERITY_PERSONA } from '../constants';

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  // Simplified encoding for browser usage
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

export const useLive = (settings: AppSettings, contextText: string) => {
  const [connected, setConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false); // Model is talking
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<Promise<any> | null>(null);

  const disconnect = useCallback(() => {
    // 1. Close session
    if (sessionRef.current) {
      sessionRef.current.then(s => {
        try {
           s.close();
        } catch(e) {}
      });
      sessionRef.current = null;
    }

    // 2. Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // 3. Close Audio Contexts
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
        // Stop all playing sources
        sourcesRef.current.forEach(s => {
            try { s.stop(); } catch(e){}
        });
        sourcesRef.current.clear();
        audioContextRef.current.close();
        audioContextRef.current = null;
    }

    setConnected(false);
    setIsTalking(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const ai = getLiveClient();

      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceName || 'Zephyr' } },
          },
          // System instruction MUST be inside the config object
          systemInstruction: `
          ${VERITY_PERSONA}
          
          You are now in LIVE VOICE MODE.
          
          CONTEXT (Research Results):
          ${contextText.slice(0, 20000)}
          
          INSTRUCTIONS:
          1. Answer questions about the research findings concisely.
          2. Use natural, conversational language (avoid reading bullet points like a robot).
          3. If asked about something not in the context, clearly state that it wasn't part of the research.
          4. Be helpful and ready to clarify the claims.
        `,
        },
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            setConnected(true);

            // Setup Input Processing
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
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              setIsTalking(true);
              const ctx = audioContextRef.current;
              if (!ctx) return;

              // Ensure we schedule after current time
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                      setIsTalking(false);
                  }
              };

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
                // Clear queue
                sourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e){}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsTalking(false);
            }
          },
          onclose: () => {
            console.log("Live Session Closed");
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
  }, [contextText, settings.voiceName, disconnect]);

  // Clean up on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    connect,
    disconnect,
    connected,
    isTalking,
    error
  };
};