import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import jsPDF from 'jspdf'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Dashboard from './components/Dashboard'
import Flashcards from './components/Flashcards'

const API_BASE = 'https://medical-ai-backend.vercel.app';
// Use local backend for testing if needed: const API_BASE = 'http://127.0.0.1:8001';

function App() {
  const [session, setSession] = useState(null)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const [savedNotes, setSavedNotes] = useState(() => {
    const saved = localStorage.getItem('mbbs_saved_notes')
    return saved ? JSON.parse(saved) : []
  })
  const [showSavedSidebar, setShowSavedSidebar] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [showDownloads, setShowDownloads] = useState(false)
  const [downloadingSessionId, setDownloadingSessionId] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return true; // Default to dark mode
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  // Quiz State
  const [mcqModal, setMcqModal] = useState(null) // Array of questions
  const [mcqLoading, setMcqLoading] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  
  // Cumulative Score
  const [totalCorrect, setTotalCorrect] = useState(() => {
    return parseInt(localStorage.getItem('mbbs_total_correct')) || 0
  })
  const [totalQuestions, setTotalQuestions] = useState(() => {
    return parseInt(localStorage.getItem('mbbs_total_questions')) || 0
  })
  
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

  // Fetch sessions on mount
  useEffect(() => {
    if (session) {
      const fetchSessions = async () => {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setSessions(data);
          if (data.length > 0 && !currentSessionId) {
            setCurrentSessionId(data[0].id);
          }
        }
      }
      fetchSessions();
    } else {
      setSessions([]);
      setCurrentSessionId(null);
    }
  }, [session])

  // Fetch history when currentSessionId changes
  useEffect(() => {
    if (session && currentSessionId) {
      const fetchHistory = async () => {
        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('session_id', currentSessionId)
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
  }, [session, currentSessionId])

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  }

  useEffect(() => {
    localStorage.setItem('mbbs_saved_notes', JSON.stringify(savedNotes))
  }, [savedNotes])

  useEffect(() => {
    localStorage.setItem('mbbs_total_correct', totalCorrect)
    localStorage.setItem('mbbs_total_questions', totalQuestions)
  }, [totalCorrect, totalQuestions])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', session.user.id);
    
    try {
      const response = await fetch(`${API_BASE}/upload_pdf`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
      } else {
        alert(data.detail || "Upload failed");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploadingPdf(false);
      e.target.value = null;
    }
  }

  const toggleListening = () => {
    if (isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Input. Please use Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setQuery(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };
    recognition.onerror = (e) => { console.error(e); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  const generateFlashcards = async (content) => {
    if (!session) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/generate_flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });
      const data = await response.json();
      if (data.success && data.flashcards) {
        for (const card of data.flashcards) {
          await supabase.from('flashcards').insert({
            user_id: session.user.id,
            question: card.question,
            answer: card.answer,
            topic: currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title : 'General'
          });
        }
        alert(`Successfully generated and saved ${data.flashcards.length} flashcards!`);
        setShowFlashcards(true);
      } else {
        alert("Failed to generate flashcards.");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleQuery = async (overrideQuery = null) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;
    
    const userMsg = { id: Date.now().toString(), role: 'user', content: q }
    const currentHistory = [...messages]
    setMessages([...currentHistory, userMsg])
    setQuery('')
    setLoading(true)
    setError(null)

    let activeSessionId = currentSessionId;
    if (!activeSessionId && session) {
      const title = query.split(' ').slice(0, 4).join(' ') + (query.split(' ').length > 4 ? '...' : '');
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: session.user.id, title })
        .select()
        .single();
      
      if (data) {
        activeSessionId = data.id;
        setCurrentSessionId(data.id);
        setSessions(prev => [data, ...prev]);
      }
    }

    if (session && activeSessionId) {
      supabase.from('chat_history').insert({
        user_id: session.user.id,
        session_id: activeSessionId,
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
        body: JSON.stringify({ query: userMsg.content, history: apiHistory, user_id: session ? session.user.id : null }),
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
        suggestions: data.suggestions || [],
        showSources: false
      }
      setMessages(prev => [...prev, aiMsg])

      if (session && activeSessionId) {
        supabase.from('chat_history').insert({
          user_id: session.user.id,
          session_id: activeSessionId,
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

  const downloadChatAsPDF = async (sessionId, sessionTitle) => {
    setDownloadingSessionId(sessionId);
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error || !data) throw new Error('Failed to load chat history');
      if (data.length === 0) throw new Error('No messages found in this chat');

      const safeTitle = (sessionTitle || 'MedAI Chat').substring(0, 80);
      const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

      // ── jsPDF setup ──────────────────────────────────────────────────────────
      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const PW  = doc.internal.pageSize.getWidth();   // 595.28
      const PH  = doc.internal.pageSize.getHeight();  // 841.89
      const ML  = 54, MR = 54, MT = 56, MB = 52;
      const UW  = PW - ML - MR;   // usable text width ~487 pt
      let   y   = MT;

      // Palette
      const C = {
        blue:      [29, 78, 216],
        blueSoft:  [239, 246, 255],
        teal:      [5, 150, 105],
        tealSoft:  [236, 253, 245],
        indigo:    [67, 56, 202],
        amber:     [180, 83, 9],
        ink:       [15, 23, 42],
        inkMid:    [51, 65, 85],
        inkLight:  [100, 116, 139],
        border:    [203, 213, 225],
        divider:   [226, 232, 240],
        white:     [255, 255, 255],
        pageBar:   [15, 23, 42],
      };

      // ── Core helpers ─────────────────────────────────────────────────────────
      const needsPage = (space) => {
        if (y + space > PH - MB) { doc.addPage(); y = MT; return true; }
        return false;
      };
      const gap = (pts) => { y += pts; needsPage(0); };

      // Print wrapped text with auto page-break; returns nothing, mutates y
      const printWrapped = (text, fontSize, colorArr, fontStyle, indent = 0, lineH = null) => {
        if (!text || !text.trim()) return;
        doc.setFontSize(fontSize);
        doc.setTextColor(...colorArr);
        doc.setFont('helvetica', fontStyle);
        const maxW = UW - indent;
        const lines = doc.splitTextToSize(String(text), maxW);
        const lh = lineH || fontSize * 1.5;
        lines.forEach(line => {
          needsPage(lh + 4);
          doc.text(line, ML + indent, y);
          y += lh;
        });
      };

      // Draw filled rect (safe – no page split needed for decorative rects)
      const fillRect = (rx, ry, rw, rh, colorArr) => {
        doc.setFillColor(...colorArr);
        doc.rect(rx, ry, rw, rh, 'F');
      };

      // ── Inline-bold strip: keep structure, remove ** markers ─────────────────
      const stripInline = (s) => (s || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');

      // ── Determine if a line is bold (has **..** wrapping most of content) ─────
      const hasBold = (s) => /\*\*/.test(s);

      // ── Markdown-aware line renderer for AI answers ──────────────────────────
      const renderMarkdownContent = (content) => {
        const rawLines = content.split('\n');
        let i = 0;
        while (i < rawLines.length) {
          const raw = rawLines[i];
          const trimmed = raw.trim();
          i++;

          // Blank line → small gap
          if (!trimmed) { gap(5); continue; }

          // Horizontal rule
          if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
            gap(8);
            doc.setDrawColor(...C.border);
            doc.setLineWidth(0.5);
            needsPage(12);
            doc.line(ML, y, PW - MR, y);
            gap(10);
            continue;
          }

          // H1  →  Large section title with blue background pill
          if (/^# /.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^# /, ''));
            gap(14);
            needsPage(34);
            fillRect(ML, y - 14, UW, 22, C.blueSoft);
            doc.setDrawColor(...C.blue);
            doc.setLineWidth(0.6);
            doc.rect(ML, y - 14, UW, 22, 'S');
            // left accent
            fillRect(ML, y - 14, 4, 22, C.blue);
            doc.setFontSize(13);
            doc.setTextColor(...C.blue);
            doc.setFont('helvetica', 'bold');
            doc.text(text, ML + 10, y + 3);
            y += 14;
            gap(6);
            continue;
          }

          // H2  →  Section header with colored left bar + bottom underline
          if (/^## /.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^## /, ''));
            gap(12);
            needsPage(28);
            fillRect(ML, y - 11, 3.5, 18, C.teal);
            doc.setFontSize(11.5);
            doc.setTextColor(...C.teal);
            doc.setFont('helvetica', 'bold');
            doc.text(text.toUpperCase(), ML + 9, y + 3);
            y += 10;
            doc.setDrawColor(...C.teal);
            doc.setLineWidth(0.4);
            doc.line(ML + 9, y, ML + 9 + doc.getStringUnitWidth(text.toUpperCase()) * 11.5 / doc.internal.scaleFactor + 4, y);
            gap(8);
            continue;
          }

          // H3  →  Bold amber subsection label
          if (/^### /.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^### /, ''));
            gap(8);
            needsPage(20);
            doc.setFontSize(10.5);
            doc.setTextColor(...C.amber);
            doc.setFont('helvetica', 'bold');
            doc.text('▸ ' + text, ML + 4, y);
            y += 14;
            gap(2);
            continue;
          }

          // H4 / ####
          if (/^#### /.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^#### /, ''));
            gap(6);
            needsPage(18);
            doc.setFontSize(10);
            doc.setTextColor(...C.indigo);
            doc.setFont('helvetica', 'bold');
            doc.text(text, ML + 4, y);
            y += 13;
            continue;
          }

          // Sub-bullet (indented):  "   - text" or "    * text"
          if (/^\s{2,}[-*•]\s/.test(raw)) {
            const text = stripInline(trimmed.replace(/^[-*•]\s+/, ''));
            needsPage(14);
            doc.setFontSize(9.5);
            doc.setTextColor(...C.inkMid);
            doc.setFont('helvetica', 'normal');
            // Small filled circle bullet
            doc.setFillColor(...C.inkLight);
            doc.circle(ML + 22, y - 3, 1.5, 'F');
            const subLines = doc.splitTextToSize(text, UW - 32);
            subLines.forEach((line, li) => {
              needsPage(13);
              doc.text(line, ML + 28, y);
              y += 13;
            });
            continue;
          }

          // Top-level bullet:  "- text" or "* text" or "• text"
          if (/^[-*•]\s/.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^[-*•]\s+/, ''));
            needsPage(14);
            // Filled square bullet in teal
            doc.setFillColor(...C.teal);
            doc.rect(ML + 8, y - 5.5, 3.5, 3.5, 'F');
            const bLines = doc.splitTextToSize(text, UW - 20);
            doc.setFontSize(10);
            doc.setTextColor(...C.ink);
            doc.setFont('helvetica', hasBold(trimmed) ? 'bold' : 'normal');
            bLines.forEach((line, li) => {
              needsPage(14);
              doc.text(line, ML + 16, y);
              y += 14;
            });
            continue;
          }

          // Numbered list:  "1. text"
          if (/^\d+\.\s/.test(trimmed)) {
            const num   = trimmed.match(/^(\d+)\./)[1];
            const text  = stripInline(trimmed.replace(/^\d+\.\s+/, ''));
            needsPage(14);
            // Number badge
            doc.setFillColor(...C.blue);
            doc.roundedRect(ML + 6, y - 8, 12, 10, 2, 2, 'F');
            doc.setFontSize(7);
            doc.setTextColor(...C.white);
            doc.setFont('helvetica', 'bold');
            doc.text(num, ML + 12, y - 1, { align: 'center' });
            // Text
            const nLines = doc.splitTextToSize(text, UW - 24);
            doc.setFontSize(10);
            doc.setTextColor(...C.ink);
            doc.setFont('helvetica', hasBold(trimmed) ? 'bold' : 'normal');
            nLines.forEach(line => {
              needsPage(14);
              doc.text(line, ML + 22, y);
              y += 14;
            });
            continue;
          }

          // Plain paragraph — check if line is bold (acts as an inline heading)
          const isBoldLine = hasBold(trimmed) && trimmed.startsWith('**');
          const cleanText  = stripInline(trimmed);
          if (isBoldLine) {
            gap(4);
            printWrapped(cleanText, 10.5, C.inkMid, 'bold', 0, 14);
          } else {
            printWrapped(cleanText, 10, C.ink, 'normal', 0, 14);
          }
        }
      };

      // ════════════════════════════════════════════════════════════════════════
      // HEADER — Cover-style header
      // ════════════════════════════════════════════════════════════════════════
      fillRect(0, 0, PW, 52, C.pageBar);      // dark banner
      fillRect(0, 52, PW, 4, C.blue);          // blue accent stripe

      // Logo circle
      doc.setFillColor(...C.blue);
      doc.circle(ML + 16, 26, 14, 'F');
      doc.setFontSize(11);
      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.text('M', ML + 16, 30, { align: 'center' });

      // Title + subtitle in banner
      doc.setFontSize(16);
      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.text('MedAI RAG', ML + 36, 23);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('AI-Powered Medical Study Notes', ML + 36, 36);

      // Date + count (right-aligned)
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${dateStr}  •  ${data.length} messages`, PW - MR, 30, { align: 'right' });

      y = 70;

      // Session title block
      needsPage(50);
      fillRect(ML, y, UW, 38, C.blueSoft);
      fillRect(ML, y, 5, 38, C.blue);
      doc.setFontSize(14);
      doc.setTextColor(...C.blue);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(safeTitle, UW - 20);
      titleLines.forEach((tl, ti) => {
        doc.text(tl, ML + 12, y + 15 + ti * 16);
      });
      y += 38 + titleLines.length * (titleLines.length > 1 ? 6 : 0) + 6;

      doc.setFontSize(8);
      doc.setTextColor(...C.inkLight);
      doc.setFont('helvetica', 'italic');
      doc.text('For educational purposes only — verify all clinical information with authoritative sources.', ML, y);
      y += 18;

      doc.setDrawColor(...C.divider);
      doc.setLineWidth(0.5);
      doc.line(ML, y, PW - MR, y);
      y += 18;

      // ════════════════════════════════════════════════════════════════════════
      // MESSAGES — Render each Q&A pair
      // ════════════════════════════════════════════════════════════════════════
      let qNum = 0;

      data.forEach((msg, idx) => {
        const isUser = msg.role === 'user';

        if (isUser) {
          // ── User question: numbered, styled box ─────────────────────────────
          qNum++;
          const qText = stripInline(msg.content || '');
          needsPage(46);

          const qLines = doc.splitTextToSize(qText, UW - 28);
          const qBoxH  = Math.max(36, 14 + qLines.length * 14 + 10);
          needsPage(qBoxH + 8);

          fillRect(ML, y, UW, qBoxH, C.blueSoft);
          doc.setDrawColor(...C.blue);
          doc.setLineWidth(0.5);
          doc.rect(ML, y, UW, qBoxH, 'S');
          fillRect(ML, y, 5, qBoxH, C.blue);

          // Q label
          doc.setFillColor(...C.blue);
          doc.roundedRect(ML + 10, y + 6, 22, 12, 2, 2, 'F');
          doc.setFontSize(7.5);
          doc.setTextColor(...C.white);
          doc.setFont('helvetica', 'bold');
          doc.text(`Q${qNum}`, ML + 21, y + 14, { align: 'center' });

          // Question text
          doc.setFontSize(10.5);
          doc.setTextColor(...C.blue);
          doc.setFont('helvetica', 'bold');
          qLines.forEach((ql, qi) => {
            doc.text(ql, ML + 36, y + 14 + qi * 14);
          });
          y += qBoxH + 10;

        } else {
          // ── AI Answer: markdown rendered as professional notes ──────────────
          needsPage(30);
          // "Answer" label row
          fillRect(ML, y, UW, 18, [248, 250, 252]);
          doc.setDrawColor(...C.divider);
          doc.setLineWidth(0.4);
          doc.rect(ML, y, UW, 18, 'S');
          fillRect(ML, y, 4, 18, C.teal);

          doc.setFontSize(7.5);
          doc.setTextColor(...C.teal);
          doc.setFont('helvetica', 'bold');
          doc.text('MEDAI RAG  —  ANSWER', ML + 10, y + 11);

          // Right-side small note
          doc.setFontSize(7);
          doc.setTextColor(...C.inkLight);
          doc.setFont('helvetica', 'normal');
          doc.text('AI-generated. Verify independently.', PW - MR, y + 11, { align: 'right' });
          y += 24;

          // Render the markdown content
          renderMarkdownContent(msg.content || '');

          y += 8;
          // Separator after answer (not after last)
          if (idx < data.length - 1) {
            needsPage(24);
            doc.setDrawColor(...C.divider);
            doc.setLineWidth(1);
            doc.line(ML, y, PW - MR, y);
            y += 20;
          }
        }
      });

      // ── Footer ───────────────────────────────────────────────────────────────
      gap(12);
      needsPage(28);
      fillRect(0, PH - 36, PW, 36, C.pageBar);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Generated by MedAI RAG  •  For educational purposes only.', ML, PH - 20);

      // Page numbers on every page
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Top bar on non-first pages
        if (i > 1) {
          fillRect(0, 0, PW, 6, C.blue);
          doc.setFontSize(7);
          doc.setTextColor(...C.inkLight);
          doc.setFont('helvetica', 'normal');
          doc.text(`MedAI RAG  •  ${safeTitle}`, ML, 17);
        }
        // Bottom page number
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${totalPages}`, PW - MR, PH - 20, { align: 'right' });
      }

      const filename = `MedAI_${safeTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.pdf`;
      doc.save(filename);
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setDownloadingSessionId(null);
    }
  }

  const startQuiz = async (aiMsgId, aiMsgContent) => {
    setMcqLoading(true)
    setMcqModal(null)
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setQuizScore(0)
    setQuizFinished(false)
    
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
      // Backend returns { success: true, questions: [...] }
      const questions = Array.isArray(data) ? data : (data.questions || []);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid format received from server.")
      }
      setMcqModal(questions)
    } catch (err) {
      alert("Failed to generate MCQ: " + err.message)
    } finally {
      setMcqLoading(false)
    }
  }

  const handleOptionSelect = (idx, isCorrect) => {
    setSelectedOption(idx)
    if (isCorrect) {
      setQuizScore(prev => prev + 1)
      setTotalCorrect(prev => prev + 1)
    }
    setTotalQuestions(prev => prev + 1)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < mcqModal.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOption(null)
    } else {
      setQuizFinished(true)
    }
  }

  const closeQuiz = () => {
    setMcqModal(null)
    setQuizFinished(false)
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
  }

  if (!session) {
    return <Auth />
  }

  const currentQuestion = mcqModal ? mcqModal[currentQuestionIndex] : null

  return (
    <div className="h-screen bg-white dark:bg-black text-gray-900 dark:text-[#ececec] font-sans selection:bg-blue-500/30 dark:selection:bg-white/20 transition-colors duration-300 flex overflow-hidden">
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* ChatGPT Sidebar */}
      <aside className={`fixed md:relative z-50 w-64 h-full bg-gray-50 dark:bg-[#171717] border-r border-gray-200 dark:border-white/10 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm">M</div>
            <span className="font-semibold text-lg tracking-tight">MedAI RAG</span>
          </div>
          <button className="md:hidden p-2 text-gray-500 hover:text-black dark:hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="px-3 pb-3 shrink-0 space-y-2">
          <button onClick={() => { setShowDashboard(false); setShowFlashcards(false); setShowDownloads(false); startNewChat(); }} className="w-full flex items-center gap-3 bg-white dark:bg-[#212121] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-black dark:text-white shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            New Chat
          </button>
          
          <div className="flex gap-2">
            <button onClick={() => { setShowDashboard(true); setShowFlashcards(false); setShowDownloads(false); setIsSidebarOpen(false); }} className="flex-1 flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              Dashboard
            </button>
            <button onClick={() => { setShowFlashcards(true); setShowDashboard(false); setShowDownloads(false); setIsSidebarOpen(false); }} className="flex-1 flex items-center justify-center gap-2 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
              <span className="text-sm">📇</span>
              Flashcards
            </button>
          </div>

          {/* Downloads Tab */}
          <button onClick={() => { setShowDownloads(true); setShowDashboard(false); setShowFlashcards(false); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${ showDownloads ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-300' }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download Chats as PDF
          </button>
          
          <label className={`w-full flex items-center justify-center gap-2 cursor-pointer ${uploadingPdf ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-300'} px-3 py-2 rounded-lg text-xs font-medium transition-colors`}>
            {uploadingPdf ? (
              <><svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Uploading...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> Upload PDF</>
            )}
            <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} />
          </label>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3 px-2 uppercase tracking-wider">Recent Chats</div>
          {sessions.map(s => (
            <button 
              key={s.id} 
              onClick={() => { setCurrentSessionId(s.id); setShowDashboard(false); setShowFlashcards(false); setShowDownloads(false); setIsSidebarOpen(false); }}
              className={`w-full text-left truncate px-3 py-2.5 rounded-lg text-sm transition-colors ${currentSessionId === s.id && !showDashboard && !showFlashcards && !showDownloads ? 'bg-gray-200 dark:bg-[#2a2a2a] font-medium text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#212121] hover:text-black dark:hover:text-white'}`}
            >
              {s.title}
            </button>
          ))}
        </div>
        
        {/* User Actions Bottom */}
        <div className="p-3 border-t border-gray-200 dark:border-white/10 space-y-1 shrink-0">
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)} 
             className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#212121] rounded-lg transition-colors"
           >
             {isDarkMode ? (
               <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Light Mode</>
             ) : (
               <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg> Dark Mode</>
             )}
           </button>
           <button 
             onClick={() => supabase.auth.signOut()}
             className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg> Log Out
           </button>
        </div>
      </aside>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-white dark:bg-black">
        
        {/* Header bar (Mobile hamburger + Score/Notes) */}
        <header className="shrink-0 w-full bg-white/90 dark:bg-black/80 border-b border-gray-200 dark:border-white/10 px-4 py-3 flex justify-between items-center transition-all duration-300">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-black dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <span className="font-medium truncate max-w-[200px] text-black dark:text-white md:hidden">
               {currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title : 'New Chat'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-[#171717] rounded-full px-4 py-1.5 border border-gray-200 dark:border-white/5 mr-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold mr-2">Score:</span>
              <span className="text-sm font-bold text-black dark:text-white">{totalCorrect} <span className="text-gray-400">/ {totalQuestions}</span></span>
            </div>

            <button onClick={() => setShowSavedSidebar(true)} className="flex items-center gap-2 text-sm font-medium hover:text-black dark:hover:text-white transition-colors text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
              Notes ({savedNotes.length})
            </button>
          </div>
        </header>

        {/* Dynamic Views */}
        {showDashboard ? (
          <Dashboard session={session} totalCorrect={totalCorrect} totalQuestions={totalQuestions} savedNotesCount={savedNotes.length} onClose={() => setShowDashboard(false)} />
        ) : showFlashcards ? (
          <Flashcards session={session} onClose={() => setShowFlashcards(false)} />
        ) : showDownloads ? (
          /* ── Downloads Panel ─────────────────────────────── */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-black dark:text-white flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </span>
                    Download Chats
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">Download any chat conversation as a formatted PDF</p>
                </div>
                <button onClick={() => setShowDownloads(false)} className="p-2 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Sessions List */}
              {sessions.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No chats yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start a conversation to download it as a PDF</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s, idx) => (
                    <div key={s.id} className="group bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-sm transition-all">
                      {/* Index bubble */}
                      <div className="w-9 h-9 shrink-0 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {idx + 1}
                      </div>

                      {/* Chat info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black dark:text-white truncate text-sm">{s.title || 'Untitled Chat'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Download button */}
                      <button
                        id={`download-btn-${s.id}`}
                        onClick={() => downloadChatAsPDF(s.id, s.title)}
                        disabled={downloadingSessionId === s.id}
                        className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
                      >
                        {downloadingSessionId === s.id ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download PDF
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Info note */}
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
                Each PDF contains the full conversation history with formatted AI responses.
              </p>
            </div>
          </div>
        ) : (
        <>
        {/* Main Chat Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto scroll-smooth">
        
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 mt-20">
            <div className="w-16 h-16 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-lg">M</div>
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-black dark:text-white">How can I help you today?</h2>
            <p className="max-w-md text-gray-500 dark:text-gray-400 font-light">Ask a medical question to generate exam notes or interactive MCQs directly from your textbooks.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300 w-full`}>
            {msg.role === 'user' ? (
              <div className="bg-blue-600 dark:bg-[#2f2f2f] text-white px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] text-[15px] leading-relaxed shadow-sm dark:shadow-none">
                {msg.content}
              </div>
            ) : (
              <div className="w-full flex gap-4 max-w-[95%] text-[15px]">
                <div className="w-8 h-8 rounded-full bg-black dark:bg-white shrink-0 flex items-center justify-center text-white dark:text-black font-bold text-sm mt-1">M</div>
                <div className="flex-1 min-w-0">
                  <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-[#111] prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-white/10 prose-headings:font-semibold text-gray-900 dark:text-gray-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                  
                  {/* AI Message Action Bar */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button onClick={() => saveNote(msg)} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                      Save Note
                    </button>
                    <button onClick={() => startQuiz(msg.id, msg.content)} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      Test Me (5-Q Quiz)
                    </button>
                    <button onClick={() => generateFlashcards(msg.content)} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg">
                      <span className="text-sm">📇</span> Generate Flashcards
                    </button>
                    {msg.sources && msg.sources.length > 0 && (
                      <button onClick={() => toggleSources(msg.id)} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        {msg.showSources ? 'Hide Citations' : 'View Citations'}
                      </button>
                    )}
                  </div>

                  {/* Citations Accordion */}
                  {msg.showSources && msg.sources && (
                    <div className="mt-4 p-5 bg-gray-100 dark:bg-[#2f2f2f] rounded-xl border border-gray-200 dark:border-white/5 max-h-96 overflow-y-auto">
                      <h4 className="text-gray-800 dark:text-gray-200 font-medium mb-4 text-sm flex items-center gap-2">
                        Raw Textbook Excerpts Used:
                      </h4>
                      <div className="space-y-4">
                        {msg.sources.map((src, idx) => (
                          <div key={idx} className="bg-white dark:bg-[#212121] p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 shadow-sm dark:shadow-none">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-wider">{src.source_book}</div>
                            <p className="italic border-l-2 border-gray-300 dark:border-gray-600 pl-3 leading-relaxed">{src.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestions Pills */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.suggestions.map((sug, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => handleQuery(sug)}
                          className="text-left text-sm bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-500/30 transition-colors shadow-sm"
                        >
                          ✨ {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="w-full flex gap-4 max-w-[95%] animate-in fade-in">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white shrink-0 flex items-center justify-center text-white dark:text-black font-bold text-sm mt-1">M</div>
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <svg className="animate-spin h-4 w-4 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Thinking...
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-transparent px-5 py-4 rounded-xl flex items-center gap-3 text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p>{error}</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <div className="shrink-0 w-full bg-white dark:bg-black pt-4 pb-6 px-4 border-t border-transparent dark:border-white/5 transition-colors duration-300">
        <div className="max-w-3xl mx-auto relative">
          <div className="bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-white/10 rounded-2xl flex items-end p-2 shadow-lg focus-within:border-blue-400 dark:focus-within:border-white/30 transition-colors">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Message MedAI RAG..."
              className="flex-1 bg-transparent border-none py-3 px-4 text-black dark:text-[#ececec] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0 resize-none min-h-[52px] max-h-48 overflow-y-auto"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleQuery()
                }
              }}
            />
              <button
                onClick={toggleListening}
                className={`p-3 m-1 rounded-xl transition-colors shrink-0 ${isListening ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse' : 'bg-transparent text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'}`}
                title="Voice Input"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </button>
              <button
                onClick={() => handleQuery()}
              disabled={loading || !query.trim()}
              className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 p-3 m-1 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
          <div className="text-center mt-3 text-xs text-gray-500">
            MedAI can make mistakes. Consider verifying important clinical information.
          </div>
        </div>
      </div>
      </>
      )}

      {/* MCQ Multi-Question Quiz Modal */}
      {(mcqLoading || mcqModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !mcqLoading && closeQuiz()}></div>
          <div className="relative bg-white dark:bg-[#212121] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {mcqLoading ? (
              <div className="p-16 flex flex-col items-center justify-center text-center gap-4 text-gray-900 dark:text-white">
                <svg className="animate-spin h-8 w-8 text-purple-500 dark:text-purple-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="font-medium text-gray-600 dark:text-gray-300">Generating 5-Question Quiz...</p>
              </div>
            ) : mcqModal && !quizFinished ? (
              <>
                <div className="bg-gray-50 dark:bg-[#171717] px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-4">
                    <h3 className="font-medium text-lg text-gray-900 dark:text-white">Knowledge Check</h3>
                    <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">
                      Question {currentQuestionIndex + 1} of {mcqModal.length}
                    </span>
                  </div>
                  <button onClick={closeQuiz} className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                
                <div className="p-6 md:p-8 overflow-y-auto">
                  <p className="text-lg font-medium mb-8 text-black dark:text-white leading-relaxed">{currentQuestion.question}</p>
                  
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, idx) => {
                      let btnClass = "w-full text-left p-4 rounded-xl border transition-all text-[15px] "
                      if (selectedOption === null) {
                        btnClass += "border-gray-200 dark:border-white/10 bg-white dark:bg-[#2f2f2f] hover:bg-gray-50 dark:hover:bg-[#3f3f3f] text-gray-800 dark:text-gray-200"
                      } else {
                        if (idx === currentQuestion.correct_index) {
                          btnClass += "border-green-500 bg-green-50 dark:border-green-500/50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                        } else if (idx === selectedOption) {
                          btnClass += "border-red-500 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                        } else {
                          btnClass += "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#212121] text-gray-400 dark:text-gray-500 opacity-50"
                        }
                      }
                      return (
                        <button key={idx} onClick={() => handleOptionSelect(idx, idx === currentQuestion.correct_index)} disabled={selectedOption !== null} className={btnClass}>
                          <span className="inline-block w-8 font-medium opacity-50">{['A','B','C','D'][idx]}.</span> {opt}
                        </button>
                      )
                    })}
                  </div>
                  
                  {selectedOption !== null && (
                    <div className="mt-8 p-5 bg-gray-50 dark:bg-[#2f2f2f] rounded-xl border border-gray-200 dark:border-white/5 animate-in fade-in slide-in-from-top-4 text-[15px]">
                      <p className={`font-semibold mb-2 ${selectedOption === currentQuestion.correct_index ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {selectedOption === currentQuestion.correct_index ? '✅ Correct' : '❌ Incorrect'}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{currentQuestion.explanation}</p>
                      
                      <button onClick={nextQuestion} className="w-full bg-black text-white dark:bg-white dark:hover:bg-gray-200 hover:bg-gray-800 dark:text-black font-medium py-3 rounded-lg transition-colors">
                        {currentQuestionIndex < mcqModal.length - 1 ? 'Next Question' : 'View Final Score'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Quiz Results Screen
              <div className="p-12 text-center bg-white dark:bg-[#212121]">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🏆</span>
                </div>
                <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Quiz Complete!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">You just reviewed this topic.</p>
                
                <div className="bg-gray-50 dark:bg-[#2f2f2f] border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-8 inline-block min-w-[200px]">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest font-semibold">Your Score</p>
                  <p className="text-5xl font-black text-black dark:text-white">{quizScore} <span className="text-2xl text-gray-400 dark:text-gray-500">/ {mcqModal.length}</span></p>
                </div>
                
                <button onClick={closeQuiz} className="w-full bg-black text-white dark:bg-white dark:hover:bg-gray-200 hover:bg-gray-800 dark:text-black font-medium py-3.5 rounded-xl transition-colors">
                  Close and Continue Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Notes Sidebar Overlay */}
      {showSavedSidebar && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowSavedSidebar(false)}></div>
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#171717] border-l border-gray-200 dark:border-white/5 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-transparent">
              <h2 className="text-lg font-medium text-black dark:text-white">Your Notebook</h2>
              <button onClick={() => setShowSavedSidebar(false)} className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors">
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
                  <div key={note.id} className="bg-gray-50 dark:bg-[#212121] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col group shadow-sm dark:shadow-none">
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
                      <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed text-gray-800 dark:text-gray-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                      </div>
                      {expandedNoteId !== note.id && (
                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-gray-50 dark:from-[#212121] to-transparent flex items-end justify-center pb-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Click to expand</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-white dark:bg-[#171717] p-3 border-t border-gray-200 dark:border-white/5 flex justify-between items-center gap-2">
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{note.savedAt}</span>
                      <div className="flex gap-2">
                        <button onClick={() => deleteSavedNote(note.id)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onClick={() => exportToPDF(`pdf-export-${note.id}`, `MedAI_Note_${note.id}`)} className="flex items-center gap-1 bg-black text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black hover:bg-gray-800 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors">
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
    </div>
  )
}

export default App
