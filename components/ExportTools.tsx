import React from 'react';
import { VerityResponse } from '../types';
import { DownloadIcon, FileTextIcon } from './Icons';

interface ExportToolsProps {
  data: VerityResponse;
}

export const ExportTools: React.FC<ExportToolsProps> = ({ data }) => {

  const downloadJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `verity-research-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateMarkdown = () => {
    const d = data;
    let md = `# Verity Research Report: ${d.query}\n\n`;
    md += `**Date:** ${new Date(d.metadata.research_timestamp).toLocaleDateString()}\n`;
    md += `**Overall Confidence:** ${Math.round(d.summary.confidence_overall * 100)}%\n\n`;
    
    md += `## Executive Summary\n${d.summary.executive_summary}\n\n`;
    
    md += `### Key Findings\n`;
    d.summary.key_findings.forEach(f => md += `- ${f}\n`);
    md += `\n`;

    md += `## Verified Claims\n\n`;
    d.claims.forEach(c => {
      const statusIcon = c.verification_status === 'verified' ? '✅' : c.verification_status === 'partial' ? '⚠️' : '❌';
      md += `### ${statusIcon} ${c.claim_text}\n`;
      md += `**Status:** ${c.verification_status.toUpperCase()} | **Confidence:** ${Math.round(c.confidence * 100)}%\n\n`;
      md += `> "${c.sources[0]?.verbatim_quote || 'No quote available'}"\n\n`;
      md += `*Source: [${d.sources.find(s => s.source_id === c.sources[0]?.source_id)?.title || 'Unknown'}](${d.sources.find(s => s.source_id === c.sources[0]?.source_id)?.url})*\n\n`;
      md += `---\n\n`;
    });

    md += `## Sources\n`;
    d.sources.forEach(s => {
      md += `- [${s.title}](${s.url}) (${s.source_type})\n`;
    });

    return md;
  };

  const downloadMarkdown = () => {
    const mdString = generateMarkdown();
    const blob = new Blob([mdString], { type: "text/markdown" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `verity-report-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={downloadJSON}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <DownloadIcon className="w-4 h-4" /> JSON
      </button>
      <button 
        onClick={downloadMarkdown}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 transition-colors"
      >
        <FileTextIcon className="w-4 h-4" /> Markdown
      </button>
    </div>
  );
};
