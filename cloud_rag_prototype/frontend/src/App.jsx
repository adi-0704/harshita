import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
function App() {
  const [query, setQuery] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleQuery = async () => {
    if (!query) return;
    
    setLoading(true);
    setError(null);
    setSummary('');
    
    try {
      // Connect to the new Cloud RAG Backend (Port 8001 to avoid conflict with the old app)
      const response = await fetch('https://medical-ai-backend.vercel.app/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'An error occurred during query.');
      }
      
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 overflow-hidden relative selection:bg-teal-500/30">
      {/* Animated Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[150px] mix-blend-screen pointer-events-none"></div>

      <div className="relative z-10 min-h-screen p-4 sm:p-6 md:p-12 max-w-6xl mx-auto flex flex-col gap-8 sm:gap-10">
        <header className="text-center space-y-4 sm:space-y-6 pt-10 sm:pt-16 pb-2 sm:pb-4">
          <div className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs sm:text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(20,184,166,0.2)] mb-2">
            MBBS Exam Knowledge Base
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-teal-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent drop-shadow-sm">
              Study Smarter
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-2">
            Instantly query across multiple textbooks. Powered by Gemini Flash and Local Embeddings for flawless exam notes.
          </p>
        </header>

        <main className="w-full max-w-4xl mx-auto px-2 sm:px-0">
          {/* Glassmorphic Search Bar */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-700/50 p-2 sm:p-3 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col sm:flex-row gap-2 sm:gap-3 relative z-20 group hover:border-slate-600/50 transition-all duration-500">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <svg className="w-6 h-6 text-teal-400/70 group-focus-within:text-teal-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E.g., Create a short note on Jaundice..."
                className="w-full bg-transparent border-none py-4 sm:py-5 pl-12 sm:pl-14 pr-4 sm:pr-6 text-slate-100 placeholder-slate-500 text-base sm:text-lg focus:outline-none focus:ring-0"
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              />
            </div>
            
            <button
              onClick={handleQuery}
              disabled={loading || !query}
              className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold py-4 sm:py-5 px-6 sm:px-10 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-base sm:text-lg active:scale-95 flex items-center justify-center gap-2 sm:gap-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Generate Notes'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-8 bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-200 px-6 py-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
              <svg className="w-6 h-6 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-lg">{error}</p>
            </div>
          )}

          {summary && (
            <div className="mt-8 sm:mt-12 bg-slate-900/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
              {/* Subtle top highlight */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500 opacity-50"></div>
              
              <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-700/50">
                <div className="bg-teal-500/20 p-1.5 sm:p-2 rounded-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-slate-200 text-lg sm:text-xl font-semibold tracking-wide">Exam Note Generated</h3>
              </div>

              <div className="prose prose-sm sm:prose-base md:prose-lg prose-invert prose-teal max-w-none prose-headings:text-teal-300 prose-a:text-indigo-400 prose-strong:text-white prose-strong:font-bold prose-ul:text-slate-300 prose-p:text-slate-300 marker:text-teal-500">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
