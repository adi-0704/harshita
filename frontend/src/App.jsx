import { useState, useEffect, useRef } from 'react'

const BACKEND_URL = 'http://localhost:8000'

function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle, uploading, processing, completed, error
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [isQuerying, setIsQuerying] = useState(false)
  const fileInputRef = useRef(null)

  // Polling for processing status
  useEffect(() => {
    let interval;
    if (status === 'processing') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/status`)
          const data = await res.json()
          
          setProgress(data.progress)
          setMessage(data.message)
          
          if (data.status === 'completed' || data.status === 'error') {
            setStatus(data.status)
            clearInterval(interval)
          }
        } catch (err) {
          console.error('Error fetching status:', err)
        }
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [status])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return;
    
    setStatus('uploading')
    setMessage('Uploading massive PDF...')
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      
      setStatus('processing')
    } catch (err) {
      console.error(err)
      setStatus('error')
      setMessage(err.message || 'Failed to upload file.')
    }
  }

  const handleQuery = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    setIsQuerying(true)
    setAnswer('')
    
    try {
      const res = await fetch(`${BACKEND_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Query failed')
      
      setAnswer(data.summary)
    } catch (err) {
      console.error(err)
      setAnswer(`Error: ${err.message}`)
    } finally {
      setIsQuerying(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Nexus Medical Scholar
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Upload massive medical textbooks and instantly summarize topics of interest using Gemini 1.5 Flash.
          </p>
        </div>

        {/* Upload Section */}
        <div className="glass-panel rounded-2xl p-8 space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/50 rounded-xl p-12 transition-colors hover:border-indigo-500/50 hover:bg-slate-800/30">
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            <div className="text-center space-y-4">
              <div className="p-4 bg-indigo-500/10 rounded-full inline-block">
                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Browse for a PDF
                </button>
                <span className="text-slate-500 ml-2">or drag and drop</span>
              </div>
              {file && (
                <div className="text-sm font-medium text-emerald-400 bg-emerald-400/10 py-2 px-4 rounded-full inline-block">
                  Selected: {file.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || status === 'uploading' || status === 'processing'}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
            >
              Initialize Embedding Sequence
            </button>
          </div>

          {/* Progress Indicator */}
          {(status === 'processing' || status === 'uploading' || status === 'completed') && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex justify-between text-sm font-medium">
                <span className={status === 'completed' ? 'text-emerald-400' : 'text-indigo-400'}>
                  {status === 'completed' ? 'Ready for queries!' : 'Processing...'}
                </span>
                <span className="text-slate-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 text-center animate-pulse">{message}</p>
            </div>
          )}
          {status === 'error' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              Error: {message}
            </div>
          )}
        </div>

        {/* Query Section */}
        <div className={`transition-all duration-700 ${status === 'completed' ? 'opacity-100 translate-y-0' : 'opacity-50 pointer-events-none translate-y-4'}`}>
          <div className="glass-panel rounded-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Topic Query
            </h2>
            
            <form onSubmit={handleQuery} className="flex gap-4">
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E.g., Summarize the mechanism of action of ACE inhibitors..."
                className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-5 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button 
                type="submit"
                disabled={isQuerying || !query.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95 flex items-center gap-2"
              >
                {isQuerying ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Summarize'}
              </button>
            </form>

            {answer && (
              <div className="mt-6 p-6 bg-slate-950/50 rounded-xl border border-slate-700/50 prose prose-invert max-w-none">
                <div className="text-sm font-semibold text-cyan-400 mb-2 tracking-wider uppercase">Generated Summary</div>
                <p className="text-slate-300 leading-relaxed">{answer}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
