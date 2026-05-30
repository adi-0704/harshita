import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import html2pdf from 'html2pdf.js'
import { supabase } from './supabaseClient'
import Auth from './Auth'

const API_BASE = 'https://medical-ai-backend.vercel.app';
// Use local backend for testing if needed: const API_BASE = 'http://127.0.0.1:8001';

function App() {
  const [session, setSession] = useState(null)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [savedNotes, setSavedNotes] = useState(() => {
    const saved = localStorage.getItem('mbbs_saved_notes')
    return saved ? JSON.parse(saved) : []
  })
  const [showSavedSidebar, setShowSavedSidebar] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState(null)
  
  const [mcqModal, setMcqModal] = useState(null)
  const [mcqLoading, setMcqLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  
  const chatEndRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      const fetchHistory = async () => {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          const mapped = data.map(row => ({
            id: row.id,
            role: row.role,
            content: row.content,
            sources: row.sources || [],
            showSources: false
          }))
          setMessages(mapped)
        }
      }
      fetchHistory()
    } else {
      setMessages([])
    }
  }, [session])

  useEffect(() => {
    localStorage.setItem('mbbs_saved_notes', JSON.stringify(savedNotes))
  }, [savedNotes])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    const userMsg = { id: Date.now().toString(), role: 'user', content: query }
    const currentHistory = [...messages]
    setMessages([...currentHistory, userMsg])
    setQuery('')
    setLoading(true)
    setError(null)

    if (session) {
      supabase.from('chat_history').insert({
        user_id: session.user.id,
        role: 'user',
        content: userMsg.content,
        sources: null
      }).then()
    }
    
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
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: data.summary, 
        sources: data.sources || [],
        showSources: false
      }
      setMessages(prev => [...prev, aiMsg])

      if (session) {
        supabase.from('chat_history').insert({
          user_id: session.user.id,
          role: 'ai',
          content: aiMsg.content,
          sources: aiMsg.sources
        }).then()
      }

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

  if (!session) {
    return <Auth />
  }

  return (
    <div className="h-screen bg-[#212121] text-[#ececec] flex flex-col selection:bg-white/20 font-sans overflow-hidden">
      
      {/* Navbar */}
      <header className="bg-[#171717] px-4 sm:px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm">M</div>
          <h1 className="text-xl font-semibold tracking-tight text-white">MedAI RAG</h1>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Log Out
          </button>
          <button 
            onClick={() => setShowSavedSidebar(!showSavedSidebar)}
            className="flex items-center gap-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] px-4 py-2 rounded-full text-sm font-medium transition-colors text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
            Saved Notes ({savedNotes.length})
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto pb-32">
        
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 mt-20">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-lg">M</div>
            </div>
            <h2 className="text-2xl font-semibold mb-3">How can I help you today?</h2>
            <p className="max-w-md text-gray-400 font-light">Ask a medical question to generate exam notes or interactive MCQs directly from your textbooks.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300 w-full`}>
            {msg.role === 'user' ? (
              <div className="bg-[#2f2f2f] text-white px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] text-[15px] leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div className="w-full flex gap-4 max-w-[95%] text-[15px]">
                <div className="w-8 h-8 rounded-full bg-white shrink-0 flex items-center justify-center text-black font-bold text-sm mt-1">M</div>
                <div className="flex-1 min-w-0">
                  <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#111] prose-pre:border prose-pre:border-white/10 prose-headings:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                  
                  {/* AI Message Action Bar */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button onClick={() => saveNote(msg)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-transparent hover:bg-white/10 px-3 py-1.5 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                      Save Note
                    </button>
                    <button onClick={() => generateMCQ(msg.id, msg.content)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-transparent hover:bg-white/10 px-3 py-1.5 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Test Me (MCQ)
                    </button>
                    {msg.sources && msg.sources.length > 0 && (
                      <button onClick={() => toggleSources(msg.id)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors bg-transparent hover:bg-white/10 px-3 py-1.5 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        {msg.showSources ? 'Hide Citations' : 'View Citations'}
                      </button>
                    )}
                  </div>

                  {/* Citations Accordion */}
                  {msg.showSources && msg.sources && (
                    <div className="mt-4 p-5 bg-[#2f2f2f] rounded-xl border border-white/5 max-h-96 overflow-y-auto">
                      <h4 className="text-gray-200 font-medium mb-4 text-sm flex items-center gap-2">
                        Raw Textbook Excerpts Used:
                      </h4>
                      <div className="space-y-4">
                        {msg.sources.map((src, idx) => (
                          <div key={idx} className="bg-[#212121] p-4 rounded-lg text-sm text-gray-300">
                            <div className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">{src.source_book}</div>
                            <p className="italic border-l-2 border-gray-600 pl-3 leading-relaxed">{src.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="w-full flex gap-4 max-w-[95%] animate-in fade-in">
            <div className="w-8 h-8 rounded-full bg-white shrink-0 flex items-center justify-center text-black font-bold text-sm mt-1">M</div>
            <div className="flex items-center text-gray-400">
              <svg className="animate-spin h-4 w-4 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Thinking...
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 text-red-400 px-5 py-4 rounded-xl flex items-center gap-3 text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p>{error}</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-6 px-4 z-30">
        <div className="max-w-3xl mx-auto relative">
          <div className="bg-[#2f2f2f] border border-white/10 rounded-2xl flex items-end p-2 shadow-lg focus-within:border-white/30 transition-colors">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Message MedAI RAG..."
              className="flex-1 bg-transparent border-none py-3 px-4 text-[#ececec] placeholder-gray-500 focus:outline-none focus:ring-0 resize-none min-h-[52px] max-h-48 overflow-y-auto"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleQuery()
                }
              }}
            />
            <button
              onClick={handleQuery}
              disabled={loading || !query.trim()}
              className="bg-white hover:bg-gray-200 text-black p-3 m-1 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
          <div className="text-center mt-3 text-xs text-gray-500">
            MedAI can make mistakes. Consider verifying important clinical information.
          </div>
        </div>
      </div>

      {/* MCQ Modal Overlay */}
      {(mcqLoading || mcqModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !mcqLoading && setMcqModal(null)}></div>
          <div className="relative bg-[#212121] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {mcqLoading ? (
              <div className="p-16 flex flex-col items-center justify-center text-center gap-4 text-white">
                <svg className="animate-spin h-8 w-8 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="font-medium text-gray-400">Generating Question...</p>
              </div>
            ) : mcqModal && (
              <>
                <div className="bg-[#171717] px-6 py-4 flex justify-between items-center border-b border-white/5">
                  <h3 className="font-medium text-lg text-white">Knowledge Check</h3>
                  <button onClick={() => setMcqModal(null)} className="text-gray-500 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                <div className="p-6 md:p-8">
                  <p className="text-lg font-medium mb-8 text-white leading-relaxed">{mcqModal.question}</p>
                  <div className="space-y-3">
                    {mcqModal.options.map((opt, idx) => {
                      let btnClass = "w-full text-left p-4 rounded-xl border transition-all text-[15px] "
                      if (selectedOption === null) {
                        btnClass += "border-white/10 bg-[#2f2f2f] hover:bg-[#3f3f3f]"
                      } else {
                        if (idx === mcqModal.correct_index) {
                          btnClass += "border-green-500/50 bg-green-500/10 text-green-400"
                        } else if (idx === selectedOption) {
                          btnClass += "border-red-500/50 bg-red-500/10 text-red-400"
                        } else {
                          btnClass += "border-white/5 bg-[#212121] opacity-50"
                        }
                      }
                      return (
                        <button key={idx} onClick={() => setSelectedOption(idx)} disabled={selectedOption !== null} className={btnClass}>
                          <span className="inline-block w-8 font-medium opacity-50">{['A','B','C','D'][idx]}.</span> {opt}
                        </button>
                      )
                    })}
                  </div>
                  
                  {selectedOption !== null && (
                    <div className="mt-8 p-5 bg-[#2f2f2f] rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-4 text-[15px]">
                      <p className={`font-semibold mb-2 ${selectedOption === mcqModal.correct_index ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedOption === mcqModal.correct_index ? '✅ Correct' : '❌ Incorrect'}
                      </p>
                      <p className="text-gray-300 leading-relaxed">{mcqModal.explanation}</p>
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
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#171717] border-l border-white/5 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-medium text-white">Your Notebook</h2>
              <button onClick={() => setShowSavedSidebar(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {savedNotes.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 text-sm">
                  <p>No notes saved yet.</p>
                </div>
              ) : (
                savedNotes.map((note) => (
                  <div key={note.id} className="bg-[#212121] border border-white/5 rounded-xl overflow-hidden flex flex-col group">
                    <div className="hidden">
                      <div id={`pdf-export-${note.id}`} className="bg-white text-black p-10 font-serif">
                        <h1 style={{ fontSize: '24px', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>MedAI RAG Note</h1>
                        <p style={{ color: '#666', fontSize: '12px', marginBottom: '20px' }}>Generated on: {note.savedAt}</p>
                        <div style={{ lineHeight: '1.6', fontSize: '14px' }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-5 relative cursor-pointer transition-all ${expandedNoteId === note.id ? '' : 'max-h-48 overflow-hidden'}`}
                      onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                    >
                      <div className="prose prose-sm prose-invert prose-p:leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                      </div>
                      {expandedNoteId !== note.id && (
                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#212121] to-transparent flex items-end justify-center pb-2">
                          <span className="text-xs text-gray-400 font-medium">Click to expand</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-[#171717] p-3 border-t border-white/5 flex justify-between items-center gap-2">
                      <span className="text-[11px] text-gray-500 truncate">{note.savedAt}</span>
                      <div className="flex gap-2">
                        <button onClick={() => deleteSavedNote(note.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onClick={() => exportToPDF(`pdf-export-${note.id}`, `MedAI_Note_${note.id}`)} className="flex items-center gap-1 bg-white hover:bg-gray-200 text-black px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
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
