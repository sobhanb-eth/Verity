import React, { useState } from 'react';
import { Claim, Source, VerificationStatus } from '../types';
import { CheckCircleIcon, AlertTriangleIcon, XCircleIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from './Icons';

interface ClaimCardProps {
  claim: Claim;
  sources: Source[];
}

const StatusBadge = ({ status }: { status: VerificationStatus }) => {
  switch (status) {
    case 'verified':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-verity-success border border-green-200">
          <CheckCircleIcon className="w-4 h-4" /> VERIFIED
        </span>
      );
    case 'partial':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-verity-warning border border-yellow-200">
          <AlertTriangleIcon className="w-4 h-4" /> PARTIAL
        </span>
      );
    case 'unverified':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-verity-error border border-red-200">
          <XCircleIcon className="w-4 h-4" /> UNVERIFIED
        </span>
      );
    case 'disputed':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-verity-disputed border border-orange-200">
          <RefreshCwIcon className="w-4 h-4" /> DISPUTED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
           GAP
        </span>
      );
  }
};

const getBorderColor = (status: VerificationStatus) => {
  switch (status) {
    case 'verified': return 'border-l-verity-success';
    case 'partial': return 'border-l-verity-warning';
    case 'unverified': return 'border-l-verity-error';
    case 'disputed': return 'border-l-verity-disputed';
    default: return 'border-l-gray-300';
  }
};

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, sources }) => {
  const [expanded, setExpanded] = useState(false);

  const primarySourceId = claim.sources?.[0]?.source_id;
  const primarySource = sources.find(s => s.source_id === primarySourceId);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${getBorderColor(claim.verification_status)} p-5 mb-4 transition-all duration-200 hover:shadow-md`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={claim.verification_status} />
            <div className="flex items-center text-xs text-gray-500 font-medium">
              <span>Confidence: {Math.round(claim.confidence * 100)}%</span>
              <div className="ml-2 w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${claim.confidence > 0.8 ? 'bg-verity-success' : claim.confidence > 0.5 ? 'bg-verity-warning' : 'bg-verity-error'}`}
                  style={{ width: `${claim.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 leading-snug">
            {claim.claim_text}
          </h3>
        </div>
      </div>

      <div className="mt-4">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-verity-primary font-medium hover:text-blue-800 flex items-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUpIcon className="w-4 h-4" /> Hide Evidence
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-4 h-4" /> View Evidence ({claim.sources.length} sources)
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
               <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verification Chain</h4>
               <p className="text-sm text-gray-700">{claim.verification_chain}</p>
            </div>

            <div className="space-y-3">
              {claim.sources.map((sourceRef, idx) => {
                 const fullSource = sources.find(s => s.source_id === sourceRef.source_id);
                 return (
                   <div key={idx} className="border-l-2 border-gray-300 pl-4 py-1">
                      <p className="text-sm italic text-gray-800 font-serif mb-2">
                        "{sourceRef.verbatim_quote}"
                      </p>
                      {fullSource && (
                        <a 
                          href={fullSource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-verity-primary hover:underline"
                        >
                          <ExternalLinkIcon className="w-3 h-3" />
                          {fullSource.title}
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 capitalize">{fullSource.source_type}</span>
                        </a>
                      )}
                   </div>
                 );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
