import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import jsPDF from 'jspdf'
import html2pdf from 'html2pdf.js'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Sidebar from './components/Sidebar'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import QuizModal from './components/QuizModal'
import SavedNotesPanel from './components/SavedNotesPanel'
import ToastContainer from './components/ToastContainer'
import { useToast } from './hooks/useToast'
import { useSubscription } from './hooks/useSubscription'

const Dashboard = lazy(() => import('./components/Dashboard'))
const Flashcards = lazy(() => import('./components/Flashcards'))

const API_BASE = 'https://medical-ai-backend.vercel.app';
// Use local backend for testing if needed: const API_BASE = 'http://127.0.0.1:8001';

const SuspenseFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
    <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

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
      return true;
    }
    return true;
  });

  // Toast
  const { toasts, addToast, removeToast } = useToast();

  // Subscription
  const { subscription, isLifetimeFree, plan, status, usage, limits, canUseAction, initRazorpayCheckout, refresh: refreshSubscription } = useSubscription(session);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
  const [mcqModal, setMcqModal] = useState(null)
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

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load Razorpay script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, []);

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
    
    // Quota check
    const check = canUseAction('pdf_upload');
    if (!check.allowed) {
      addToast(check.reason, 'error', 5000);
      setShowUpgradeModal(true);
      e.target.value = null;
      return;
    }
    
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
        addToast(data.message || 'PDF uploaded successfully', 'success');
        refreshSubscription();
      } else {
        addToast(data.detail || 'Upload failed', 'error');
      }
    } catch (err) {
      addToast('Error: ' + err.message, 'error');
    } finally {
      setUploadingPdf(false);
      e.target.value = null;
    }
  }

  const toggleListening = () => {
    if (isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast('Your browser does not support Voice Input. Please use Chrome or Edge.', 'warning');
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
    
    // Quota check
    const check = canUseAction('flashcard');
    if (!check.allowed) {
      addToast(check.reason, 'error', 5000);
      setShowUpgradeModal(true);
      return;
    }
    
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
        addToast(`Successfully generated and saved ${data.flashcards.length} flashcards!`, 'success');
        setShowFlashcards(true);
        refreshSubscription();
      } else {
        addToast('Failed to generate flashcards.', 'error');
      }
    } catch (err) {
      addToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleQuery = async (overrideQuery = null) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;

    // Quota check
    const check = canUseAction('query');
    if (!check.allowed) {
      addToast(check.reason, 'error', 5000);
      setShowUpgradeModal(true);
      return;
    }

    const userMsg = { id: Date.now().toString(), role: 'user', content: q }
    const currentHistory = [...messages]
    setMessages([...currentHistory, userMsg])
    setQuery('')
    setLoading(true)
    setError(null)

    try {
      let activeSessionId = currentSessionId;

      if (!activeSessionId && session) {
        const title = q.split(' ').slice(0, 4).join(' ') + (q.split(' ').length > 4 ? '...' : '');
        const { data, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({ user_id: session.user.id, title })
          .select()
          .single();

        if (sessionError) {
          throw new Error(`Could not create chat session: ${sessionError.message}`);
        }

        if (!data?.id) {
          throw new Error('Could not create chat session: Supabase returned no session id');
        }

        activeSessionId = data.id;
        setCurrentSessionId(data.id);
        setSessions(prev => [data, ...prev]);
      }

      if (session && activeSessionId) {
        const { error: userSaveError } = await supabase.from('chat_history').insert({
          user_id: session.user.id,
          session_id: activeSessionId,
          role: 'user',
          content: userMsg.content,
          sources: null
        });

        if (userSaveError) {
          throw new Error(`Could not save your message: ${userSaveError.message}`);
        }
      }

      const apiHistory = currentHistory.map(m => ({ role: m.role, content: m.content }))

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
        const { error: aiSaveError } = await supabase.from('chat_history').insert({
          user_id: session.user.id,
          session_id: activeSessionId,
          role: 'ai',
          content: aiMsg.content,
          sources: aiMsg.sources
        });

        if (aiSaveError) {
          throw new Error(`Could not save AI response: ${aiSaveError.message}`);
        }
      }
      
      // Refresh subscription after successful query
      refreshSubscription();

    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error', 5000);
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
      addToast('Note saved to your notebook!', 'success');
    } else {
      addToast('Note already saved.', 'info');
    }
  }

  const deleteSavedNote = (id) => {
    setSavedNotes(savedNotes.filter(n => n.id !== id))
    addToast('Note deleted.', 'info');
  }

  const exportToPDF = (elementId, title) => {
    const element = document.getElementById(elementId);
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    const opt = {
      margin: 0.5,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      html2pdf().set(opt).from(element).output('blob').then(async (blob) => {
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: title,
              text: 'Exported Medical Note'
            });
            return;
          } catch (e) {
            console.log("Share failed:", e);
          }
        }
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) window.location.href = url;
      });
    } else {
      html2pdf().set(opt).from(element).save();
    }
  }

  // ───────────────────────────────────────────────────────────────
  // PDF CHAT EXPORT (using jsPDF)
  // ───────────────────────────────────────────────────────────────
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

      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const ML = 54, MR = 54, MT = 56, MB = 52;
      const UW = PW - ML - MR;
      let y = MT;

      const C = {
        blue: [29, 78, 216],
        blueSoft: [239, 246, 255],
        teal: [5, 150, 105],
        tealSoft: [236, 253, 245],
        indigo: [67, 56, 202],
        amber: [180, 83, 9],
        ink: [15, 23, 42],
        inkMid: [51, 65, 85],
        inkLight: [100, 116, 139],
        border: [203, 213, 225],
        divider: [226, 232, 240],
        white: [255, 255, 255],
        pageBar: [15, 23, 42],
      };

      const needsPage = (space) => {
        if (y + space > PH - MB) { doc.addPage(); y = MT; return true; }
        return false;
      };
      const gap = (pts) => { y += pts; needsPage(0); };

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

      const fillRect = (rx, ry, rw, rh, colorArr) => {
        doc.setFillColor(...colorArr);
        doc.rect(rx, ry, rw, rh, 'F');
      };

      const stripInline = (s) => (s || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
      const hasBold = (s) => /\*\*/.test(s);

      const renderMarkdownContent = (content) => {
        const rawLines = content.split('\n');
        let i = 0;
        while (i < rawLines.length) {
          const raw = rawLines[i];
          const trimmed = raw.trim();
          i++;

          if (!trimmed) { gap(5); continue; }

          if (trimmed.startsWith('```')) {
            const label = trimmed.replace(/^```/, '').trim().toUpperCase() || 'CODE';
            const codeLines = [];
            while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
              codeLines.push(rawLines[i]);
              i++;
            }
            if (i < rawLines.length) i++;
            const displayLabel = label === 'MERMAID' ? 'FLOWCHART' : (label || 'CODE BLOCK');
            renderCodeBlock(codeLines, displayLabel);
            continue;
          }

          if (/[├└│─┌┐┘┤┬┴┼▼▲→←]/.test(trimmed) || /[|+\-]{3,}/.test(trimmed)) {
            const fcLines = [raw];
            while (i < rawLines.length) {
              const nextTrimmed = rawLines[i].trim();
              if (!nextTrimmed || /[├└│─┌┐┘┤┬┴┼▼▲→←]/.test(nextTrimmed) || /^\s*[|+].+[|+]/.test(nextTrimmed)) {
                fcLines.push(rawLines[i]);
                i++;
              } else break;
            }
            renderCodeBlock(fcLines, 'FLOWCHART');
            continue;
          }

          if (trimmed.startsWith('|')) {
            const tableLines = [raw];
            while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
              tableLines.push(rawLines[i]);
              i++;
            }
            renderTable(tableLines);
            continue;
          }

          if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
            gap(8);
            doc.setDrawColor(...C.border);
            doc.setLineWidth(0.5);
            needsPage(12);
            doc.line(ML, y, PW - MR, y);
            gap(10);
            continue;
          }

          if (/^# /.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^# /, ''));
            gap(14);
            needsPage(34);
            fillRect(ML, y - 14, UW, 22, C.blueSoft);
            doc.setDrawColor(...C.blue);
            doc.setLineWidth(0.6);
            doc.rect(ML, y - 14, UW, 22, 'S');
            fillRect(ML, y - 14, 4, 22, C.blue);
            doc.setFontSize(13);
            doc.setTextColor(...C.blue);
            doc.setFont('helvetica', 'bold');
            doc.text(text, ML + 10, y + 3);
            y += 14;
            gap(6);
            continue;
          }

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

          if (/^### /.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^### /, ''));
            gap(8);
            needsPage(20);
            doc.setFillColor(...C.amber);
            doc.rect(ML + 4, y - 6.5, 3.5, 3.5, 'F');
            doc.setFontSize(10.5);
            doc.setTextColor(...C.amber);
            doc.setFont('helvetica', 'bold');
            doc.text(text, ML + 12, y);
            y += 14;
            gap(2);
            continue;
          }

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

          if (/^\s{2,}[-*•]\s/.test(raw)) {
            const text = stripInline(trimmed.replace(/^[-*•]\s+/, ''));
            needsPage(14);
            doc.setFontSize(9.5);
            doc.setTextColor(...C.inkMid);
            doc.setFont('helvetica', 'normal');
            doc.setFillColor(...C.inkLight);
            doc.circle(ML + 22, y - 3, 1.5, 'F');
            const subLines = doc.splitTextToSize(text, UW - 32);
            subLines.forEach((line) => {
              needsPage(13);
              doc.text(line, ML + 28, y);
              y += 13;
            });
            continue;
          }

          if (/^[-*•]\s/.test(trimmed)) {
            const text = stripInline(trimmed.replace(/^[-*•]\s+/, ''));
            needsPage(14);
            doc.setFillColor(...C.teal);
            doc.rect(ML + 8, y - 5.5, 3.5, 3.5, 'F');
            const bLines = doc.splitTextToSize(text, UW - 20);
            doc.setFontSize(10);
            doc.setTextColor(...C.ink);
            doc.setFont('helvetica', hasBold(trimmed) ? 'bold' : 'normal');
            bLines.forEach((line) => {
              needsPage(14);
              doc.text(line, ML + 16, y);
              y += 14;
            });
            continue;
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const num = trimmed.match(/^(\d+)\./)[1];
            const text = stripInline(trimmed.replace(/^\d+\.\s+/, ''));
            needsPage(14);
            doc.setFillColor(...C.blue);
            doc.roundedRect(ML + 6, y - 8, 12, 10, 2, 2, 'F');
            doc.setFontSize(7);
            doc.setTextColor(...C.white);
            doc.setFont('helvetica', 'bold');
            doc.text(num, ML + 12, y - 1, { align: 'center' });
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

          const isBoldLine = hasBold(trimmed) && trimmed.startsWith('**');
          const cleanText = stripInline(trimmed);
          if (isBoldLine) {
            gap(4);
            printWrapped(cleanText, 10.5, C.inkMid, 'bold', 0, 14);
          } else {
            printWrapped(cleanText, 10, C.ink, 'normal', 0, 14);
          }
        }
      };

      const renderTable = (tableLines) => {
        if (!tableLines || tableLines.length < 2) return;
        const parseRow = (line) =>
          line.split('|').map(c => stripInline(c.trim())).filter((c, i, arr) => i > 0 && i < arr.length - 1);
        const rows = tableLines
          .filter(l => !/^[\s|:-]+$/.test(l.trim()))
          .map(l => parseRow(l));
        if (!rows.length) return;
        const colCount = Math.max(...rows.map(r => r.length));
        const colW = UW / colCount;
        const rowH = 16;
        const headerH = 18;
        gap(10);
        rows.forEach((row, ri) => {
          const isHeader = ri === 0;
          const thisH = isHeader ? headerH : rowH;
          needsPage(thisH + 4);
          if (isHeader) {
            fillRect(ML, y - thisH + 4, UW, thisH, C.blue);
          } else {
            fillRect(ML, y - rowH + 4, UW, rowH, ri % 2 === 0 ? [248, 250, 252] : C.white);
          }
          row.forEach((cell, ci) => {
            const cellX = ML + ci * colW;
            if (ci > 0) {
              doc.setDrawColor(...C.border);
              doc.setLineWidth(0.3);
              doc.line(cellX, y - thisH + 4, cellX, y + 4);
            }
            doc.setFontSize(isHeader ? 8 : 9);
            doc.setTextColor(...(isHeader ? C.white : C.ink));
            doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
            const maxCellW = colW - 8;
            const cellText = doc.splitTextToSize(cell, maxCellW)[0] || '';
            doc.text(cellText, cellX + 4, y + (isHeader ? 1 : 0));
          });
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.3);
          doc.line(ML, y + 4, ML + UW, y + 4);
          y += thisH;
        });
        const tableStartY = y - rows.length * rowH - headerH + rowH;
        doc.setDrawColor(...C.blue);
        doc.setLineWidth(0.5);
        doc.rect(ML, tableStartY - 14, UW, rows.length * rowH + headerH, 'S');
        gap(14);
      };

      const renderCodeBlock = (codeLines, label = 'FLOWCHART') => {
        if (!codeLines.length) return;
        gap(10);
        const fontSize = 8.5;
        const lineHeight = 12;
        const padding = 10;
        const blockH = padding + codeLines.length * lineHeight + padding;
        needsPage(blockH + 16);
        fillRect(ML, y - 10, 60, 12, C.indigo);
        doc.setFontSize(7);
        doc.setTextColor(...C.white);
        doc.setFont('helvetica', 'bold');
        doc.text(label, ML + 4, y - 1);
        y += 4;
        fillRect(ML, y, UW, blockH, [30, 30, 46]);
        doc.setDrawColor(...C.indigo);
        doc.setLineWidth(0.5);
        doc.rect(ML, y, UW, blockH, 'S');
        y += padding + lineHeight;
        codeLines.forEach(line => {
          needsPage(lineHeight + 2);
          doc.setFontSize(fontSize);
          doc.setTextColor(180, 220, 180);
          doc.setFont('courier', 'normal');
          const maxW = UW - padding * 2;
          const parts = doc.splitTextToSize(line || ' ', maxW);
          doc.text(parts[0] || ' ', ML + padding, y);
          y += lineHeight;
        });
        y += padding - lineHeight;
        gap(12);
      };

      // HEADER
      fillRect(0, 0, PW, 52, C.pageBar);
      fillRect(0, 52, PW, 4, C.blue);
      doc.setFillColor(...C.blue);
      doc.circle(ML + 16, 26, 14, 'F');
      doc.setFontSize(11);
      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.text('M', ML + 16, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.text('MedAI RAG', ML + 36, 23);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('AI-Powered Medical Study Notes', ML + 36, 36);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${dateStr}  |  ${data.length} messages`, PW - MR, 30, { align: 'right' });
      y = 70;

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
      doc.text('For educational purposes only - verify all clinical information with authoritative sources.', ML, y);
      y += 18;
      doc.setDrawColor(...C.divider);
      doc.setLineWidth(0.5);
      doc.line(ML, y, PW - MR, y);
      y += 18;

      let qNum = 0;
      data.forEach((msg, idx) => {
        const isUser = msg.role === 'user';
        if (isUser) {
          qNum++;
          const qText = stripInline(msg.content || '');
          needsPage(46);
          const qLines = doc.splitTextToSize(qText, UW - 28);
          const qBoxH = Math.max(36, 14 + qLines.length * 14 + 10);
          needsPage(qBoxH + 8);
          fillRect(ML, y, UW, qBoxH, C.blueSoft);
          doc.setDrawColor(...C.blue);
          doc.setLineWidth(0.5);
          doc.rect(ML, y, UW, qBoxH, 'S');
          fillRect(ML, y, 5, qBoxH, C.blue);
          doc.setFillColor(...C.blue);
          doc.roundedRect(ML + 10, y + 6, 22, 12, 2, 2, 'F');
          doc.setFontSize(7.5);
          doc.setTextColor(...C.white);
          doc.setFont('helvetica', 'bold');
          doc.text(`Q${qNum}`, ML + 21, y + 14, { align: 'center' });
          doc.setFontSize(10.5);
          doc.setTextColor(...C.blue);
          doc.setFont('helvetica', 'bold');
          qLines.forEach((ql, qi) => {
            doc.text(ql, ML + 36, y + 14 + qi * 14);
          });
          y += qBoxH + 10;
        } else {
          needsPage(30);
          fillRect(ML, y, UW, 18, [248, 250, 252]);
          doc.setDrawColor(...C.divider);
          doc.setLineWidth(0.4);
          doc.rect(ML, y, UW, 18, 'S');
          fillRect(ML, y, 4, 18, C.teal);
          doc.setFontSize(7.5);
          doc.setTextColor(...C.teal);
          doc.setFont('helvetica', 'bold');
          doc.text('MEDAI RAG  |  ANSWER', ML + 10, y + 11);
          doc.setFontSize(7);
          doc.setTextColor(...C.inkLight);
          doc.setFont('helvetica', 'normal');
          doc.text('AI-generated. Verify independently.', PW - MR, y + 11, { align: 'right' });
          y += 24;
          renderMarkdownContent(msg.content || '');
          y += 8;
          if (idx < data.length - 1) {
            needsPage(24);
            doc.setDrawColor(...C.divider);
            doc.setLineWidth(1);
            doc.line(ML, y, PW - MR, y);
            y += 20;
          }
        }
      });

      gap(12);
      needsPage(28);
      fillRect(0, PH - 36, PW, 36, C.pageBar);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('Generated by MedAI RAG  |  For educational purposes only.', ML, PH - 20);

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) {
          fillRect(0, 0, PW, 6, C.blue);
          doc.setFontSize(7.5);
          doc.setTextColor(...C.inkLight);
          doc.setFont('helvetica', 'normal');
          doc.text(`MedAI RAG  |  ${safeTitle}`, ML, 17);
        }
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${i} of ${totalPages}`, PW - MR, PH - 20, { align: 'right' });
      }

      const filename = `MedAI_${safeTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.pdf`;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        const blob = doc.output('blob');
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: sessionTitle || 'MedAI Chat Notes',
              text: 'Download your MedAI chat notes'
            });
            return;
          } catch (shareErr) {
            console.log("Share failed or cancelled:", shareErr);
          }
        }
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) window.location.href = url;
      } else {
        doc.save(filename);
      }
    } catch (err) {
      addToast('Failed to download PDF: ' + err.message, 'error');
    } finally {
      setDownloadingSessionId(null);
    }
  }

  // ───────────────────────────────────────────────────────────────
  // QUIZ
  // ───────────────────────────────────────────────────────────────
  const startQuiz = async (aiMsgId, aiMsgContent) => {
    // Quota check
    const check = canUseAction('mcq');
    if (!check.allowed) {
      addToast(check.reason, 'error', 5000);
      setShowUpgradeModal(true);
      return;
    }

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
      const questions = Array.isArray(data) ? data : (data.questions || []);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid format received from server.")
      }
      setMcqModal(questions)
      refreshSubscription();
    } catch (err) {
      addToast("Failed to generate MCQ: " + err.message, 'error');
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
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <Sidebar
        session={session}
        sessions={sessions}
        currentSessionId={currentSessionId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onNewChat={startNewChat}
        onSelectSession={(id) => { setCurrentSessionId(id); setShowDashboard(false); setShowFlashcards(false); setShowDownloads(false); }}
        onShowDashboard={() => setShowDashboard(true)}
        onShowFlashcards={() => setShowFlashcards(true)}
        onShowDownloads={() => setShowDownloads(true)}
        onSignOut={() => supabase.auth.signOut()}
        uploadingPdf={uploadingPdf}
        onPdfUpload={handlePdfUpload}
        showDashboard={showDashboard}
        showFlashcards={showFlashcards}
        showDownloads={showDownloads}
      />

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-white dark:bg-black">

        {/* Subscription Banner */}
        {subscription && !isLifetimeFree && plan === 'free' && (
          <div className="shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-center text-sm font-medium">
            <span className="hidden sm:inline">🎓 Free trial active — </span>
            <span>{usage.query || 0}/{limits.query_daily || 15} queries used today.</span>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="ml-3 underline hover:text-white/80 transition-colors"
            >
              Upgrade to Pro →
            </button>
          </div>
        )}
        {isLifetimeFree && (
          <div className="shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 text-center text-sm font-medium">
            💎 Lifetime Free Access — Enjoy unlimited everything, always.
          </div>
        )}

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl p-8 text-center">
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4 text-white text-xl">🚀</div>
              <h3 className="text-2xl font-bold text-black dark:text-white mb-2">Upgrade to Pro</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">You&apos;ve reached your free limit. Unlock unlimited queries, PDFs, flashcards, and MCQs.</p>
              <div className="space-y-3 mb-6 text-left">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                  Unlimited AI queries
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                  Unlimited PDF uploads
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                  Unlimited flashcards & MCQs
                </div>
              </div>
              <button
                onClick={() => { initRazorpayCheckout('pro', 49900); setShowUpgradeModal(false); }}
                className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 py-3 rounded-full font-semibold text-lg transition-colors"
              >
                Upgrade Now — ₹499/month
              </button>
              <p className="text-xs text-gray-400 mt-3">or ₹4,799/year (save ₹1,189)</p>
            </div>
          </div>
        )}

        {/* Header bar */}
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
          <Suspense fallback={<SuspenseFallback />}>
            <Dashboard session={session} totalCorrect={totalCorrect} totalQuestions={totalQuestions} savedNotesCount={savedNotes.length} onClose={() => setShowDashboard(false)} />
          </Suspense>
        ) : showFlashcards ? (
          <Suspense fallback={<SuspenseFallback />}>
            <Flashcards session={session} onClose={() => setShowFlashcards(false)} />
          </Suspense>
        ) : showDownloads ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
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
                      <div className="w-9 h-9 shrink-0 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black dark:text-white truncate text-sm">{s.title || 'Untitled Chat'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
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
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">Each PDF contains the full conversation history with formatted AI responses.</p>
            </div>
          </div>
        ) : (
          <>
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
                  <ChatMessage
                    msg={msg}
                    onToggleSources={toggleSources}
                    onSaveNote={saveNote}
                    onStartQuiz={startQuiz}
                    onGenerateFlashcards={generateFlashcards}
                    onSuggestionClick={handleQuery}
                  />
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

            <ChatInput
              query={query}
              setQuery={setQuery}
              loading={loading}
              onSend={handleQuery}
              isListening={isListening}
              onToggleListening={toggleListening}
            />
          </>
        )}

        <QuizModal
          mcqLoading={mcqLoading}
          mcqModal={mcqModal}
          quizFinished={quizFinished}
          currentQuestionIndex={currentQuestionIndex}
          selectedOption={selectedOption}
          quizScore={quizScore}
          onClose={closeQuiz}
          onSelectOption={handleOptionSelect}
          onNextQuestion={nextQuestion}
        />

        <SavedNotesPanel
          savedNotes={savedNotes}
          showSavedSidebar={showSavedSidebar}
          setShowSavedSidebar={setShowSavedSidebar}
          onDeleteNote={deleteSavedNote}
          onExportPDF={exportToPDF}
        />
      </div>
    </div>
  )
}

export default App
