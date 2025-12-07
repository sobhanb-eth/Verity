import React, { useState } from 'react';
import { runResearch } from './services/geminiService';
import { VerityResponse, ResearchDepth } from './types';
import { ResultsView } from './components/ResultsView';
import { SearchIcon, RefreshCwIcon } from './components/Icons';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<ResearchDepth>('standard');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await runResearch(query, depth);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during research.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-verity-primary rounded-lg flex items-center justify-center text-white font-bold text-lg font-serif">
              V
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Verity</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">AI You Can Cite</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Future: Theme toggle */}
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        {!result && !loading && (
          <div className="max-w-2xl mx-auto mt-12 text-center mb-12 animate-in fade-in duration-700">
             <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 font-serif">
               Truth needs receipts.
             </h2>
             <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
               The research engine that validates claims against real sources with verbatim quotes and deep URL analysis.
             </p>
          </div>
        )}

        {/* Search Input Section */}
        <div className={`max-w-3xl mx-auto transition-all duration-500 ${result ? 'mb-8' : 'mb-20'}`}>
          <form onSubmit={handleSubmit} className="relative">
             <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-200 ring-1 ring-gray-100 focus-within:ring-4 focus-within:ring-verity-primary/20 transition-all">
               <textarea 
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Enter a research question (e.g., 'What is the efficacy of new malaria vaccines?')"
                 className="w-full p-4 text-lg text-gray-900 placeholder-gray-400 bg-transparent border-none outline-none resize-none min-h-[80px]"
                 onKeyDown={(e) => {
                   if(e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSubmit(e);
                   }
                 }}
               />
               
               <div className="flex items-center justify-between px-2 pb-2">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    {(['quick', 'standard', 'deep'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDepth(d)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                          depth === d 
                            ? 'bg-white text-verity-primary shadow-sm border border-gray-200' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <button 
                    type="submit"
                    disabled={loading || !query.trim()}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white transition-all transform active:scale-95 ${
                      loading || !query.trim() 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-verity-primary hover:bg-blue-800 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCwIcon className="w-5 h-5 animate-spin" /> Researching...
                      </>
                    ) : (
                      <>
                        <SearchIcon className="w-5 h-5" /> Verify
                      </>
                    )}
                  </button>
               </div>
             </div>
          </form>
          
          {/* Helper chips for empty state */}
          {!result && !loading && (
             <div className="mt-6 flex flex-wrap justify-center gap-3">
               {[
                 "Effectiveness of remote work on productivity",
                 "Latest developments in solid-state batteries",
                 "Historical accuracy of Napoleon movie"
               ].map((q, i) => (
                 <button 
                   key={i}
                   onClick={() => setQuery(q)}
                   className="text-sm bg-white px-4 py-2 rounded-full text-gray-600 border border-gray-200 hover:border-verity-primary hover:text-verity-primary transition-colors"
                 >
                   {q}
                 </button>
               ))}
             </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="max-w-2xl mx-auto text-center py-20 animate-in fade-in duration-500">
             <div className="w-16 h-16 border-4 border-verity-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Verifying Claims...</h3>
             <p className="text-gray-500">
               Verity is searching Google, reading source pages, and cross-referencing facts.
             </p>
             <div className="mt-8 flex justify-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
             </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-800">
             <h3 className="font-bold text-lg mb-2">Research Failed</h3>
             <p>{error}</p>
             <button 
               onClick={() => setError(null)}
               className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-md text-sm font-medium hover:bg-red-50"
             >
               Dismiss
             </button>
          </div>
        )}

        {/* Results */}
        {result && <ResultsView data={result} />}

      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
           <p className="text-sm text-gray-500">
             © {new Date().getFullYear()} Verity AI. Powered by Google Gemini.
           </p>
           <p className="text-xs text-gray-400">
             Verity may display inaccurate info, including about people, so double-check its responses.
           </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
