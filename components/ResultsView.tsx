import React from 'react';
import { VerityResponse } from '../types';
import { ClaimCard } from './ClaimCard';
import { CheckCircleIcon, AlertTriangleIcon, ExternalLinkIcon } from './Icons';
import { ExportTools } from './ExportTools';

interface ResultsViewProps {
  data: VerityResponse;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ data }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Research Results</h2>
        <ExportTools data={data} />
      </div>

      {/* Executive Summary */}
      <section className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-verity-primary to-blue-900 px-6 py-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            Executive Summary
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-normal">
              Confidence: {Math.round(data.summary.confidence_overall * 100)}%
            </span>
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-800 text-lg leading-relaxed mb-6 font-serif">
            {data.summary.executive_summary}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-verity-success mb-3 uppercase tracking-wide">
                <CheckCircleIcon className="w-4 h-4" /> Key Findings
              </h4>
              <ul className="space-y-2">
                {data.summary.key_findings.map((finding, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-verity-success">•</span> {finding}
                  </li>
                ))}
              </ul>
            </div>
            
            {data.summary.gaps_identified.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-bold text-verity-error mb-3 uppercase tracking-wide">
                  <AlertTriangleIcon className="w-4 h-4" /> Identified Gaps
                </h4>
                <ul className="space-y-2">
                  {data.summary.gaps_identified.map((gap, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-verity-error">•</span> {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Disputes Section - Only show if disputes exist */}
      {data.disputes && data.disputes.length > 0 && (
         <section className="bg-orange-50 rounded-xl border border-orange-200 p-6">
            <h3 className="text-orange-800 font-bold mb-4 flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5" /> Active Disputes Found
            </h3>
            <div className="space-y-4">
              {data.disputes.map((dispute, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                  <h4 className="font-bold text-gray-900 mb-2">{dispute.topic}</h4>
                  <p className="text-sm text-gray-600 mb-3 italic">{dispute.assessment}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dispute.positions.map((pos, pIdx) => (
                      <div key={pIdx} className="bg-orange-50/50 p-3 rounded text-sm">
                        <span className="font-semibold block mb-1">Position: {pos.position}</span>
                        <span className="text-xs text-gray-500">Supported by {pos.supporting_sources.length} sources</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
         </section>
      )}

      {/* Claims List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Verified Claims</h3>
          <span className="text-sm text-gray-500">{data.metadata.claims_extracted} claims analyzed</span>
        </div>
        <div>
          {data.claims.map((claim) => (
            <ClaimCard key={claim.claim_id} claim={claim} sources={data.sources} />
          ))}
        </div>
      </section>

      {/* Sources & Grounding Data */}
      <section className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Sources & Citations</h3>
        
        {/* Search Queries Used */}
        {data.groundingMetadata?.searchQueries && data.groundingMetadata.searchQueries.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search Queries Executed</p>
            <div className="flex flex-wrap gap-2">
              {data.groundingMetadata.searchQueries.map((q, i) => (
                <span key={i} className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-600 font-mono">
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {data.sources.map((source) => (
            <a 
              key={source.source_id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col p-4 bg-white rounded-lg border border-gray-200 hover:border-verity-primary transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  source.credibility_score > 0.8 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {source.source_type}
                </span>
                <ExternalLinkIcon className="w-3 h-3 text-gray-400 group-hover:text-verity-primary" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-verity-primary">
                {source.title}
              </h4>
              <div className="mt-auto pt-2 flex items-center gap-2">
                 <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${source.credibility_score * 100}%` }} 
                    />
                 </div>
                 <span className="text-[10px] text-gray-500">Credibility</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
