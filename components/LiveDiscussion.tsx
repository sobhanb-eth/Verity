import React, { useEffect, useState } from 'react';
import { useLive } from '../hooks/useLive';
import { AppSettings, VerityResponse, DataUpdateHandler } from '../types';
import { MicIcon, XCircleIcon, SearchIcon } from './Icons';

interface LiveDiscussionProps {
  data: VerityResponse;
  settings: AppSettings;
  onClose: () => void;
  onUpdateData: DataUpdateHandler;
}

export const LiveDiscussion: React.FC<LiveDiscussionProps> = ({ data, settings, onClose, onUpdateData }) => {
  // Construct context string for the model
  const context = `
    TOPIC: ${data.query}
    
    EXECUTIVE SUMMARY: 
    ${data.summary.executive_summary}
    
    KEY FINDINGS:
    ${data.summary.key_findings.map(f => `- ${f}`).join('\n')}
    
    DETAILED CLAIMS & VERIFICATION:
    ${data.claims.map(c => `
      CLAIM: "${c.claim_text}"
      STATUS: ${c.verification_status} (Confidence: ${Math.round(c.confidence * 100)}%)
      EVIDENCE CHAIN: ${c.verification_chain}
      SOURCE QUOTE: "${c.sources[0]?.verbatim_quote || 'N/A'}"
    `).join('\n')}
    
    DISPUTES:
    ${data.disputes?.map(d => `${d.topic}: ${d.assessment}`).join('\n') || 'None'}
  `;

  const { connect, disconnect, connected, isTalking, isProcessingTool, error } = useLive(settings, context, onUpdateData);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []); // Connect on mount

  useEffect(() => {
    let interval: any;
    if (connected) {
      interval = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [connected]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-black text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-10"
        >
          <XCircleIcon className="w-8 h-8" />
        </button>

        <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-8">
          
          {/* Status Indicator */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-serif">Live Discussion</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-white/60">
               <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
               {connected ? 'Connected' : 'Connecting...'}
               {connected && <span>• {formatTime(elapsed)}</span>}
            </div>
          </div>

          {/* Visualizer */}
          <div className="relative w-48 h-48 flex items-center justify-center">
             {/* Base Circle */}
             <div className={`absolute inset-0 rounded-full border-2 border-white/10 transition-all duration-500 ${isTalking ? 'scale-110 border-blue-500/50' : 'scale-100'}`}></div>
             
             {/* Pulsing Core */}
             <div className={`w-32 h-32 bg-gradient-to-tr transition-all duration-300 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)] 
               ${isTalking ? 'scale-110 shadow-[0_0_60px_rgba(37,99,235,0.8)] from-verity-primary to-purple-600' : ''}
               ${isProcessingTool ? 'animate-spin from-yellow-500 to-orange-500' : 'from-verity-primary to-purple-600'}
             `}>
                {isProcessingTool ? (
                  <SearchIcon className="w-12 h-12 text-white animate-pulse" />
                ) : (
                  <MicIcon className="w-12 h-12 text-white" />
                )}
             </div>

             {/* Ripple Effects (CSS Animation) */}
             {isTalking && !isProcessingTool && (
               <>
                 <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-[ping_2s_linear_infinite]"></div>
                 <div className="absolute inset-0 rounded-full border border-purple-400/30 animate-[ping_2s_linear_infinite_0.5s]"></div>
               </>
             )}
          </div>

          {/* Info Text */}
          <div className="max-w-xs mx-auto">
             <p className="text-lg font-medium text-white/90">
               {isProcessingTool ? "Verifying new information..." : isTalking ? "Verity is speaking..." : "Listening to you..."}
             </p>
             <p className="text-sm text-white/40 mt-2">
               {isProcessingTool ? "Adding findings to your report." : "Ask follow-up questions to dig deeper."}
             </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded-lg text-sm border border-red-500/30">
              {error}
            </div>
          )}

        </div>

        {/* Footer Controls */}
        <div className="bg-white/5 border-t border-white/10 p-4 flex justify-center">
          <button 
             onClick={onClose}
             className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-red-500/20"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};
