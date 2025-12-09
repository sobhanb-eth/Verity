import { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpeech } from '../services/geminiService';
import { AppSettings } from '../types';

// Definitions for Web Speech API (Input)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitAudioContext: {
      new (options?: AudioContextOptions): AudioContext;
    };
  }
}

// Audio Decoding Helpers for Gemini Raw PCM
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

export const useVoice = (settings: AppSettings) => {
  // Input State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Output State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize Speech Recognition (Browser Native)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          currentTranscript += transcriptPart;
        }
        setTranscript(currentTranscript);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Cleanup AudioContext on unmount
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    } else if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert("Your browser does not support voice input. Please use Chrome or Edge.");
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const stopSpeaking = useCallback(() => {
    // Stop Gemini Audio
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch(e) { /* ignore */ }
      sourceRef.current = null;
    }
    // Stop Browser TTS
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // High-Quality Gemini TTS
  const speak = useCallback(async (text: string) => {
    try {
      // 1. Singleton Check: Stop any existing playback first
      stopSpeaking();
      
      setIsSpeaking(true);

      const voiceName = settings.voiceName || 'Puck';
      const rate = settings.speechRate || 1.0;

      // Fetch audio from Gemini
      const base64Audio = await generateSpeech(text, voiceName);
      
      if (!base64Audio) {
        throw new Error("No audio data returned from Gemini");
      }

      // Initialize AudioContext if needed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }

      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const ctx = audioContextRef.current;
      
      // Decode raw PCM data
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);

      // Create and play source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      // Apply speech rate
      source.playbackRate.value = rate;

      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        sourceRef.current = null;
      };

      source.start();
      sourceRef.current = source;

    } catch (error) {
      console.error("TTS Playback Error:", error);
      setIsSpeaking(false);
      
      // Fallback to browser TTS if Gemini fails
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        utterance.rate = settings.speechRate;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [settings.voiceName, settings.speechRate, stopSpeaking]);

  const hasSpeechSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return {
    isListening,
    transcript,
    isSpeaking,
    hasSpeechSupport,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
};
