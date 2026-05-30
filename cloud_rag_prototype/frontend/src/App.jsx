import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import html2pdf from 'html2pdf.js'

const API_BASE = 'https://medical-ai-backend.vercel.app';
// Use local backend for testing if needed: const API_BASE = 'http://127.0.0.1:8001';

function App() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [savedNotes, setSavedNotes] = useState(() => {
    const saved = localStorage.getItem('mbbs_saved_notes')
    return saved ? JSON.parse(saved) : []
  })
  const [showSavedSidebar, setShowSavedSidebar] = useState(false)
  
  const [mcqModal, setMcqModal] = useState(null)
  const [mcqLoading, setMcqLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  
  const chatEndRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('mbbs_saved_notes', JSON.stringify(savedNotes))
  }, [savedNotes])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    const userMsg = { id: Date.now(), role: 'user', content: query }
    const currentHistory = [...messages]
    setMessages([...currentHistory, userMsg])
    setQuery('')
    setLoading(true)
    setError(null)
    
    // Format history for backend (only send text content to save tokens)
    const apiHistory = currentHistory.map(m => ({ role: m.role, content: m.content }))
    
    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.content, history: apiHistory }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'An error occurred during query.');
      }
      
      const aiMsg = { 
        id: Date.now() + 1, 
        role: 'ai', 
        content: data.summary, 
        sources: data.sources || [],
        showSources: false
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleSources = (id) => {
    setMessages(messages.map(m => m.id === id ? { ...m, showSources: !m.showSources } : m))
  }

  const saveNote = (msg) => {
    if (!savedNotes.find(n => n.id === msg.id)) {
      setSavedNotes([...savedNotes, { ...msg, savedAt: new Date().toLocaleString() }])
    }
  }

  const deleteSavedNote = (id) => {
    setSavedNotes(savedNotes.filter(n => n.id !== id))
  }

  const exportToPDF = (elementId, title) => {
    const element = document.getElementById(elementId);
    const opt = {
      margin:       0.5,
      filename:     `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  const generateMCQ = async (aiMsgId, aiMsgContent) => {
    setMcqLoading(true)
    setMcqModal(null)
    setSelectedOption(null)
    
    // Find the user's original query right before this AI message to use as the search topic
    const aiIdx = messages.findIndex(m => m.id === aiMsgId);
    let topicQuery = "Medical high-yield concepts";
    if (aiIdx > 0 && messages[aiIdx - 1].role === 'user') {
      topicQuery = messages[aiIdx - 1].content;
    }
    
    try {
      const response = await fetch(`${API_BASE}/generate_mcq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: topicQuery, context_summary: aiMsgContent.substring(0, 1000) }),
      });
      const data = await response.json();
      setMcqModal(data)
    } catch (err) {
      alert("Failed to generate MCQ: " + err.message)
    } finally {
      setMcqLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col relative selection:bg-teal-500/30 font-sans">
      
      {/* Navbar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-teal-400 to-indigo-500 w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">M</div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">MedAI RAG</h1>
        </div>
        <button 
          onClick={() => setShowSavedSidebar(!showSavedSidebar)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
          Saved Notes ({savedNotes.length})
        </button>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto pb-32">
        
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 mt-20">
            <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to your MBBS Copilot</h2>
            <p className="max-w-md text-slate-400">Ask a medical question to generate high-yield exam notes, explore textbook citations, and generate interactive MCQs.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
            {msg.role === 'user' ? (
              <div className="bg-indigo-600 text-white px-6 py-4 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md">
                <p className="text-lg">{msg.content}</p>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm w-full max-w-[95%] shadow-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="prose prose-sm sm:prose-base prose-invert prose-teal max-w-none prose-headings:text-teal-300 prose-a:text-indigo-400 marker:text-teal-500">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                
                {/* AI Message Action Bar */}
                <div className="bg-slate-900/50 border-t border-slate-700/50 p-3 sm:px-6 flex flex-wrap items-center gap-2 sm:gap-4">
                  <button onClick={() => saveNote(msg)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-teal-400 transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    Save Note
                  </button>
                  <button onClick={() => generateMCQ(msg.id, msg.content)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-purple-400 transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Test Me (MCQ)
                  </button>
                  {msg.sources && msg.sources.length > 0 && (
                    <button onClick={() => toggleSources(msg.id)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 ml-auto">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                      {msg.showSources ? 'Hide Citations' : 'View Citations'}
                    </button>
                  )}
                </div>

                {/* Citations Accordion */}
                {msg.showSources && msg.sources && (
                  <div className="bg-slate-900 p-6 border-t border-slate-700/50 max-h-96 overflow-y-auto">
                    <h4 className="text-teal-400 font-semibold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      Raw Textbook Excerpts Used:
                    </h4>
                    <div className="space-y-4">
                      {msg.sources.map((src, idx) => (
                        <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300">
                          <div className="text-xs text-indigo-400 font-bold mb-2 uppercase tracking-wider">{src.source_book}</div>
                          <p className="italic border-l-2 border-slate-600 pl-3">{src.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-6 py-5 shadow-md flex items-center gap-3 text-teal-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Reviewing textbooks...
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-4 rounded-2xl flex items-center gap-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p>{error}</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 p-4 z-30">
        <div className="max-w-4xl mx-auto flex gap-3 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a follow-up question or new topic..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-4 pl-6 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 shadow-inner"
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          />
          <button
            onClick={handleQuery}
            disabled={loading || !query}
            className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(20,184,166,0.2)]"
          >
            <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
      </div>

      {/* MCQ Modal Overlay */}
      {(mcqLoading || mcqModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {mcqLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-center gap-4 text-purple-400">
                <svg className="animate-spin h-10 w-10" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="text-lg font-medium">Generating High-Yield Question...</p>
              </div>
            ) : mcqModal && (
              <>
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
                  <h3 className="font-bold text-lg text-purple-400 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    Knowledge Check
                  </h3>
                  <button onClick={() => setMcqModal(null)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div className="p-6 md:p-8">
                  <p className="text-xl font-medium mb-8 text-white">{mcqModal.question}</p>
                  <div className="space-y-3">
                    {mcqModal.options.map((opt, idx) => {
                      let btnClass = "w-full text-left p-4 rounded-xl border transition-all "
                      if (selectedOption === null) {
                        btnClass += "border-slate-600 bg-slate-700/30 hover:bg-slate-700 hover:border-purple-500/50"
                      } else {
                        if (idx === mcqModal.correct_index) {
                          btnClass += "border-green-500 bg-green-500/10 text-green-300 font-medium"
                        } else if (idx === selectedOption) {
                          btnClass += "border-red-500 bg-red-500/10 text-red-300 line-through opacity-70"
                        } else {
                          btnClass += "border-slate-700 bg-slate-800 opacity-50"
                        }
                      }
                      return (
                        <button key={idx} onClick={() => setSelectedOption(idx)} disabled={selectedOption !== null} className={btnClass}>
                          <span className="inline-block w-8 font-bold opacity-50">{['A','B','C','D'][idx]}.</span> {opt}
                        </button>
                      )
                    })}
                  </div>
                  
                  {selectedOption !== null && (
                    <div className="mt-8 p-5 bg-slate-900 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
                      <p className={`font-bold mb-2 ${selectedOption === mcqModal.correct_index ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedOption === mcqModal.correct_index ? '✅ Correct!' : '❌ Incorrect'}
                      </p>
                      <p className="text-slate-300 leading-relaxed">{mcqModal.explanation}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Saved Notes Sidebar Overlay */}
      {showSavedSidebar && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowSavedSidebar(false)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                Your Notebook
              </h2>
              <button onClick={() => setShowSavedSidebar(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {savedNotes.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">
                  <p>No notes saved yet.</p>
                </div>
              ) : (
                savedNotes.map((note) => (
                  <div key={note.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col group">
                    {/* Hidden container specifically formatted for PDF Export */}
                    <div className="hidden">
                      <div id={`pdf-export-${note.id}`} className="bg-white text-black p-10 font-serif">
                        <h1 style={{ fontSize: '24px', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>MBBS MedAI Exam Note</h1>
                        <p style={{ color: '#666', fontSize: '12px', marginBottom: '20px' }}>Generated on: {note.savedAt}</p>
                        <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 max-h-48 overflow-hidden relative">
                      <div className="prose prose-sm prose-invert prose-teal">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-slate-800 to-transparent"></div>
                    </div>
                    
                    <div className="bg-slate-900/50 p-3 border-t border-slate-700 flex justify-between items-center gap-2">
                      <span className="text-xs text-slate-500 truncate">{note.savedAt}</span>
                      <div className="flex gap-2">
                        <button onClick={() => deleteSavedNote(note.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onClick={() => exportToPDF(`pdf-export-${note.id}`, `MedAI_Note_${note.id}`)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default App
