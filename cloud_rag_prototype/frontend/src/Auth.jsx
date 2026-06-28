import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')

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

  // Auth Modal State
  const [showModal, setShowModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Legal Modals State
  const [legalModal, setLegalModal] = useState(null)
  const [demoFlipped, setDemoFlipped] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)

  const openModal = (signup = false) => {
    setIsSignUp(signup)
    setShowModal(true)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      })
      if (error) throw error
    } catch (error) {
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              age: age
            }
          }
        })
        if (error) throw error
        setSuccessMsg("Registration successful! You can now log in.")
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // App.jsx will detect session change automatically
      }
    } catch (error) {
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  const faqs = [
    {
      q: "How is MedAI different from ChatGPT?",
      a: "ChatGPT is a general AI that hallucinates medical facts and never cites sources. MedAI is built specifically for medical students — it searches 17+ standard Indian medical textbooks (BD Chaurasia, KDT, DC Dutta, Guyton, Ganong, etc.) and tells you exactly which book and page the answer came from."
    },
    {
      q: "Does it work for NEET PG and FMGE?",
      a: "Absolutely. MedAI is loaded with the same standard textbooks used for NEET PG, FMGE, and MBBS university exams. Ask any question from anatomy, physiology, biochemistry, pathology, pharmacology, medicine, surgery, or gynecology."
    },
    {
      q: "Can I upload my own notes and PDFs?",
      a: "Yes! Upload your professor's lecture slides, personal notes, or any PDF. The AI will index them and search them alongside the standard textbooks."
    },
    {
      q: "Is there a free trial?",
      a: "Yes. Every new user gets a 7-day free trial with full Pro access. No credit card required. After the trial, you can continue with the free tier (15 queries/day) or upgrade to Pro."
    },
    {
      q: "Is my data safe?",
      a: "100%. Your chat history and uploaded PDFs are stored in Supabase with row-level security. We never sell your data. Medical student privacy is our top priority."
    },
    {
      q: "Can I use this for clinical decision making?",
      a: "No. MedAI is for educational purposes only. Always consult a qualified medical professional for clinical decisions. AI can make mistakes."
    }
  ]

  const renderLegalModal = () => {
    if (!legalModal) return null;

    let title = "";
    let content = null;

    if (legalModal === 'privacy') {
      title = "Privacy Policy";
      content = (
        <div className="space-y-4">
          <p>Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <h3 className="font-bold text-lg mt-4">1. Information Collection</h3>
          <p>We collect information you provide directly to us, such as when you create or modify your account, contact customer support, or otherwise communicate with us.</p>
          <h3 className="font-bold text-lg mt-4">2. Use of Information</h3>
          <p>We use the information we collect to provide, maintain, and improve our services, including to process transactions and send related information.</p>
          <h3 className="font-bold text-lg mt-4">3. Data Security</h3>
          <p>Your chat history is stored securely using Supabase row-level security. We do not sell your personal data to third parties.</p>
        </div>
      );
    } else if (legalModal === 'terms') {
      title = "Terms of Service";
      content = (
        <div className="space-y-4">
          <p>Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <h3 className="font-bold text-lg mt-4">1. Acceptance of Terms</h3>
          <p>By accessing and using MedAI RAG, you accept and agree to be bound by the terms and provision of this agreement.</p>
          <h3 className="font-bold text-lg mt-4">2. Description of Service</h3>
          <p>MedAI RAG provides an AI-powered medical textbook retrieval and chat service. We reserve the right to modify or discontinue the service at any time.</p>
          <h3 className="font-bold text-lg mt-4">3. User Conduct</h3>
          <p>You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service.</p>
        </div>
      );
    } else if (legalModal === 'disclaimer') {
      title = "Medical Disclaimer";
      content = (
        <div className="space-y-4">
          <p className="font-bold text-red-600 dark:text-red-400">NOT MEDICAL ADVICE</p>
          <p>The information provided by MedAI RAG is for educational and informational purposes only and does not constitute medical advice, diagnosis, or treatment.</p>
          <p>Always seek the advice of a qualified healthcare provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this application.</p>
          <p>MedAI RAG can make mistakes. All AI-generated content must be independently verified by a medical professional before clinical application.</p>
        </div>
      );
    } else if (legalModal === 'about') {
      title = "About Us";
      content = (
        <div className="space-y-4">
          <p>MedAI RAG was built in 2026 with a simple mission: to empower the next generation of healthcare professionals with advanced Artificial Intelligence.</p>
          <p>We believe that quick, accurate access to medical information saves lives. Our platform turns dense textbooks into interactive, instantly searchable knowledge bases, ensuring you never waste time flipping pages when you could be learning.</p>
        </div>
      );
    } else if (legalModal === 'careers') {
      title = "Careers";
      content = (
        <div className="space-y-4">
          <p>Join our mission to revolutionize medical education!</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Senior Full Stack Engineer (Remote)</li>
            <li>AI Researcher - Medical Domain (Remote)</li>
            <li>Clinical Content Reviewer (Part-time)</li>
          </ul>
          <p className="mt-4 font-medium">Email your resume to aditya.tyagi1207@gmail.com</p>
        </div>
      );
    } else if (legalModal === 'news') {
      title = "Company News";
      content = (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">December 2026: MedAI RAG v2 Launch!</h3>
          <p>We are thrilled to announce our biggest update yet: subscription plans, Razorpay payments, and lifetime free access for early supporters.</p>
          <h3 className="font-bold text-lg mt-4">November 2026: Dynamic MCQ Quizzes</h3>
          <p>Auto-generated 5-question quizzes based on your textbook chats are now live.</p>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLegalModal(null)}></div>

        <div className="relative w-full max-w-2xl bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 shrink-0">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button onClick={() => setLegalModal(null)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto leading-relaxed text-gray-700 dark:text-gray-300">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-[#ececec] font-sans selection:bg-blue-500/30 dark:selection:bg-white/20 transition-colors duration-300">

      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 dark:bg-black/80 backdrop-blur-md z-40 border-b border-gray-200 dark:border-white/10 px-6 py-4 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">M</div>
          <span className="font-semibold text-lg tracking-tight">MedAI RAG</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2"
            title="Toggle Theme"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            )}
          </button>
          <button onClick={() => openModal(false)} className="hidden sm:inline text-sm font-medium hover:text-black dark:hover:text-white transition-colors text-gray-600 dark:text-gray-300">Log in</button>
          <button onClick={() => openModal(true)} className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-medium transition-colors">Sign up</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20">

        {/* Hero Section */}
        <section className="px-6 max-w-5xl mx-auto text-center mb-24 flex flex-col items-center">
          {/* Exam Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['NEET PG', 'FMGE', 'MBBS', 'NExT', 'USMLE'].map(badge => (
              <span key={badge} className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-500/20">
                {badge}
              </span>
            ))}
          </div>

          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6 leading-tight text-black dark:text-white">
            Stop Memorizing.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Start Understanding.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mb-4 font-light">
            The AI that reads your medical textbooks — and <strong className="text-black dark:text-white">cites the exact page number</strong>.
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-500 max-w-2xl mb-12">
            Ask "Why does liver cirrhosis cause ascites?" and get a textbook-cited answer from <em>Guyton & Hall</em> in 5 seconds. No more page flipping.
          </p>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-12 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              500+ Medical Students
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              17 Standard Textbooks
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              75% Cheaper than ChatGPT Plus
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto justify-center">
            <button onClick={() => openModal(true)} className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-4 rounded-full font-medium transition-colors text-lg flex items-center justify-center gap-2">
              Try MedAI Free
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="bg-transparent border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 px-8 py-4 rounded-full font-medium transition-colors text-lg">
              View Pricing
            </button>
          </div>

          {/* Hero Mockup */}
          <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0a0a0a] dark:to-[#111] p-6 md:p-10">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">U</div>
              <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-800 dark:text-gray-200 max-w-lg">
                What is the pathophysiology of ascites in liver cirrhosis?
              </div>
            </div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">M</div>
              <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-800 dark:text-gray-200 max-w-xl">
                <p className="font-semibold mb-1">Ascites in Liver Cirrhosis — Pathophysiology</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-400">
                  <li><strong>Portal Hypertension:</strong> Increased hydrostatic pressure in splanchnic circulation</li>
                  <li><strong>Hypoalbuminemia:</strong> Decreased oncotic pressure due to impaired synthesis</li>
                  <li><strong>Sodium/Water Retention:</strong> Secondary hyperaldosteronism (RAAS activation)</li>
                  <li><strong>Splanchnic Vasodilation:</strong> NO-mediated arterial vasodilation → effective hypovolemia</li>
                </ul>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">📚 Source: Guyton & Hall Textbook of Medical Physiology, 14th Ed, p. 438</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">M</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                💡 Suggested follow-ups: "What is the SAAG score?" · "How does TIPS procedure work?" · "Differential diagnosis of ascites?"
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-gray-50 dark:bg-[#0f0f0f] py-24 border-y border-gray-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-4xl font-semibold mb-4 text-center text-black dark:text-white">How MedAI Works</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 text-center mb-16 max-w-2xl mx-auto">Three simple steps to turn any medical question into a complete, cited study note.</p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400 text-2xl font-bold">1</div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-3">Ask Anything</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Type or speak your question. "Why does liver cirrhosis cause ascites?" — any topic from any subject.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-6 text-purple-600 dark:text-purple-400 text-2xl font-bold">2</div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-3">Get Cited Answers</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">MedAI searches 17+ standard textbooks and returns the answer with the exact book name and page number.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400 text-2xl font-bold">3</div>
                <h3 className="text-xl font-bold text-black dark:text-white mb-3">Remember Forever</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">One-click generate Anki-style flashcards and 5-question MCQ quizzes from any answer.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-24 px-6 max-w-5xl mx-auto">
          <h2 className="text-4xl font-semibold mb-4 text-center text-black dark:text-white">Why MedAI Beats Everything Else</h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 text-center mb-16">ChatGPT hallucinates. Marrow is expensive. MedAI is precise, affordable, and built for Indian medical students.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="pb-4 text-gray-500 dark:text-gray-400 font-medium">Feature</th>
                  <th className="pb-4 text-center">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold text-lg">MedAI RAG</span>
                  </th>
                  <th className="pb-4 text-center text-gray-500 dark:text-gray-400 font-medium">ChatGPT</th>
                  <th className="pb-4 text-center text-gray-500 dark:text-gray-400 font-medium">Marrow/PrepLadder</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-4 font-medium">Textbook Citations</td>
                  <td className="py-4 text-center text-green-600 dark:text-green-400 font-bold">✓ Exact page numbers</td>
                  <td className="py-4 text-center text-red-500">✗ No sources</td>
                  <td className="py-4 text-center text-red-500">✗ Static videos</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-4 font-medium">Upload Your Own PDFs</td>
                  <td className="py-4 text-center text-green-600 dark:text-green-400 font-bold">✓ Unlimited</td>
                  <td className="py-4 text-center text-red-500">✗ Not possible</td>
                  <td className="py-4 text-center text-red-500">✗ Not possible</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-4 font-medium">Auto Flashcards</td>
                  <td className="py-4 text-center text-green-600 dark:text-green-400 font-bold">✓ One-click Anki</td>
                  <td className="py-4 text-center text-red-500">✗ Manual only</td>
                  <td className="py-4 text-center text-red-500">✗ Not available</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-4 font-medium">Auto MCQ Quizzes</td>
                  <td className="py-4 text-center text-green-600 dark:text-green-400 font-bold">✓ 5 questions instantly</td>
                  <td className="py-4 text-center text-red-500">✗ Generic only</td>
                  <td className="py-4 text-center text-yellow-500">∼ Pre-made only</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-4 font-medium">Voice Input</td>
                  <td className="py-4 text-center text-green-600 dark:text-green-400 font-bold">✓ Built-in</td>
                  <td className="py-4 text-center text-red-500">✗ Not available</td>
                  <td className="py-4 text-center text-red-500">✗ Not available</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-white/5">
                  <td className="py-4 font-medium">Price (Monthly)</td>
                  <td className="py-4 text-center text-green-600 dark:text-green-400 font-bold">₹499</td>
                  <td className="py-4 text-center text-red-500">₹1,950</td>
                  <td className="py-4 text-center text-red-500">₹3,000+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="bg-gray-50 dark:bg-[#0f0f0f] py-24 border-y border-gray-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-4xl font-semibold mb-4 text-center text-black dark:text-white">Everything you need to crush your exams.</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 text-center mb-16 max-w-2xl mx-auto">Built by medical students, for medical students. Every feature is designed to save you study time.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Feature 1 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between md:col-span-2">
                <div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Voice Dictation</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">Medical terminology is hard to type. Just tap the microphone and speak. We transcribe complex terms perfectly — no more typos in 'pseudohypoparathyroidism'.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Upload Custom PDFs</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Upload your professor's lecture slides or any PDF. The AI indexes them instantly and searches them alongside standard textbooks.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="text-4xl mb-6">📇</div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Instant Flashcards</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Click one button to instantly generate high-yield Anki-style flashcards from any AI response. Export and import into Anki.</p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="text-4xl mb-6">✨</div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Smart Suggestions</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Keep the conversation flowing with clickable follow-up questions at the end of every answer. Never run out of things to study.</p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm md:col-span-2 lg:col-span-1">
                <div className="text-4xl mb-6">📊</div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Study Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Track your accuracy, quiz scores, and study patterns with beautiful interactive charts. Know exactly where you stand.</p>
              </div>

            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="py-24 px-6 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-semibold mb-6 text-black dark:text-white">Try the Flashcard Engine</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">Tap the card below to flip it. This is exactly how MedAI generates flashcards from your chats.</p>

          <div
            onClick={() => setDemoFlipped(!demoFlipped)}
            className="w-full max-w-lg mx-auto aspect-[16/9] perspective-1000 cursor-pointer group"
          >
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${demoFlipped ? 'rotate-y-180' : ''}`}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-white dark:bg-[#212121] rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-white/10 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest absolute top-6">Question</span>
                <p className="text-2xl font-medium text-gray-900 dark:text-white">What is the most common cause of community-acquired pneumonia?</p>
                <p className="text-sm text-blue-500 dark:text-blue-400 mt-6 font-medium group-hover:underline">Click to reveal answer</p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-600 dark:bg-blue-900 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-center items-center text-center">
                <span className="text-xs font-bold text-blue-200 uppercase tracking-widest absolute top-6">Answer</span>
                <p className="text-3xl font-bold">Streptococcus pneumoniae</p>
                <p className="text-sm text-blue-200 mt-4">📚 Source: Harrison's Principles of Internal Medicine, 21st Ed</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold mb-4 text-center text-black dark:text-white">Trusted by Medical Students Across India</h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 text-center mb-16">From AIIMS to private colleges, students are using MedAI to study smarter.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-[#111] p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none flex flex-col justify-between">
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-8 leading-relaxed">"MedAI completely changed how I prepare for NEET PG. Finding exact drug mechanisms used to take 20 minutes of flipping through KDT. Now it takes 5 seconds with the exact page number cited."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">A</div>
                <div>
                  <div className="font-medium text-black dark:text-white">Arjun Sharma</div>
                  <div className="text-sm text-gray-500">Final Year MBBS, AIIMS Delhi</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none flex flex-col justify-between">
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-8 leading-relaxed">"The auto-generated MCQs are incredible. It perfectly targets the high-yield concepts from the chapter I'm currently studying. My accuracy in surgery MCQs went from 60% to 85% in 3 weeks."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">P</div>
                <div>
                  <div className="font-medium text-black dark:text-white">Priya Malhotra</div>
                  <div className="text-sm text-gray-500">3rd Year MBBS, MAMC</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none flex flex-col justify-between">
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-8 leading-relaxed">"Being able to see exactly which textbook page the AI pulled the answer from gives me the confidence I need. For FMGE prep, this is a game changer. I trust the answers because I can verify them."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">R</div>
                <div>
                  <div className="font-medium text-black dark:text-white">Dr. Rohan Verma</div>
                  <div className="text-sm text-gray-500">FMGE Aspirant, KGMU</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 px-6 transition-colors duration-300 bg-white dark:bg-black">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-5xl md:text-6xl font-semibold mb-6 text-black dark:text-white tracking-tight">Start Free. Upgrade When<br />You&apos;re Ready.</h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-20 font-light">7-day free trial with full Pro access. No credit card required. Cancel anytime.</p>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">

              {/* Free Tier */}
              <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-10 text-left flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                <div>
                  <h3 className="text-2xl font-semibold text-black dark:text-white mb-2 tracking-tight">Free</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-light mb-8">For casual study.</p>
                  <div className="mb-10">
                    <span className="text-5xl font-bold text-black dark:text-white tracking-tighter">₹0</span>
                    <span className="text-lg text-gray-500 dark:text-gray-400 ml-2 font-medium">/mo</span>
                  </div>

                  <div className="space-y-3 mb-12 text-gray-800 dark:text-gray-200 font-medium text-sm">
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      15 queries per day
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      1 PDF upload
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      1 MCQ quiz per day
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      5 flashcards per day
                    </p>
                    <p className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      No analytics dashboard
                    </p>
                  </div>
                </div>
                <button onClick={() => openModal(true)} className="w-full bg-transparent border-2 border-black dark:border-white text-black dark:text-white py-3.5 rounded-full font-semibold text-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                  Get Started Free
                </button>
              </div>

              {/* Pro Tier */}
              <div className="bg-black dark:bg-[#111] rounded-[2rem] p-10 text-left flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 relative border border-transparent dark:border-white/10 shadow-2xl">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-[2rem]"></div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-semibold text-white tracking-tight">Pro</h3>
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">BEST VALUE</span>
                  </div>
                  <p className="text-gray-400 font-light mb-8">For serious medical students.</p>
                  <div className="mb-10">
                    <span className="text-5xl font-bold text-white tracking-tighter">₹499</span>
                    <span className="text-lg text-gray-400 ml-2 font-medium">/mo</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">or ₹4,799/year (save ₹1,189)</p>

                  <div className="space-y-3 mb-12 text-gray-200 font-medium text-sm">
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Unlimited AI queries
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Unlimited PDF uploads
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Unlimited MCQ quizzes
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Unlimited flashcards
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Voice dictation
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Analytics dashboard
                    </p>
                  </div>
                </div>
                <button onClick={() => openModal(true)} className="w-full bg-white text-black py-3.5 rounded-full font-semibold text-lg hover:bg-gray-200 transition-colors shadow-lg">
                  Start 7-Day Free Trial
                </button>
              </div>

              {/* Elite Tier */}
              <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] p-10 text-left flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
                <div>
                  <h3 className="text-2xl font-semibold text-black dark:text-white mb-2 tracking-tight">Elite</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-light mb-8">For study groups & coaching.</p>
                  <div className="mb-10">
                    <span className="text-5xl font-bold text-black dark:text-white tracking-tighter">₹999</span>
                    <span className="text-lg text-gray-500 dark:text-gray-400 ml-2 font-medium">/mo</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">or ₹9,599/year (save ₹2,389)</p>

                  <div className="space-y-3 mb-12 text-gray-800 dark:text-gray-200 font-medium text-sm">
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Everything in Pro
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Up to 10 student accounts
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Shared flashcard library
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Group analytics dashboard
                    </p>
                    <p className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                      Priority support
                    </p>
                  </div>
                </div>
                <button onClick={() => openModal(true)} className="w-full bg-black text-white dark:bg-white dark:text-black py-3.5 rounded-full font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg">
                  Start 7-Day Free Trial
                </button>
              </div>

            </div>

            <p className="text-sm text-gray-500 dark:text-gray-500 mt-12">
              🔒 Secured by Razorpay. UPI, Cards & Net Banking accepted. No credit card required for trial.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-6 max-w-3xl mx-auto">
          <h2 className="text-4xl font-semibold mb-4 text-center text-black dark:text-white">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 text-center mb-16">Everything you need to know before getting started.</p>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-black dark:text-white text-lg">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${activeFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-96' : 'max-h-0'}`}>
                  <p className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-6 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-semibold mb-6 text-black dark:text-white">Ready to study smarter?</h2>
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-10">Join 500+ medical students who stopped memorizing and started understanding.</p>
          <button onClick={() => openModal(true)} className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-10 py-5 rounded-full font-bold transition-colors text-xl shadow-lg">
            Start Your Free Trial
          </button>
          <p className="text-sm text-gray-400 mt-6">No credit card required. 7-day full access. Cancel anytime.</p>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-black py-16 border-t border-gray-200 dark:border-white/10 px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">M</div>
              <span className="font-semibold text-lg tracking-tight text-black dark:text-white">MedAI RAG</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">The AI medical tutor that cites your textbooks. Built for NEET PG, FMGE, and MBBS students across India.</p>
            <div className="flex gap-4 mt-4">
              <span className="text-xs text-gray-400">🔒 SSL Secured</span>
              <span className="text-xs text-gray-400">🇮🇳 Made in India</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24 text-sm">
            <div>
              <h4 className="font-semibold mb-4 text-black dark:text-white">Company</h4>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li><button onClick={() => setLegalModal('about')} className="hover:text-black dark:hover:text-white transition-colors">About Us</button></li>
                <li><button onClick={() => setLegalModal('careers')} className="hover:text-black dark:hover:text-white transition-colors">Careers</button></li>
                <li><button onClick={() => setLegalModal('news')} className="hover:text-black dark:hover:text-white transition-colors">News</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-black dark:text-white">Legal</h4>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li><button onClick={() => setLegalModal('privacy')} className="hover:text-black dark:hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setLegalModal('terms')} className="hover:text-black dark:hover:text-white transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setLegalModal('disclaimer')} className="hover:text-black dark:hover:text-white transition-colors">Medical Disclaimer</button></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-4 text-black dark:text-white">Contact</h4>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  <a href="mailto:aditya.tyagi1207@gmail.com" className="hover:text-black dark:hover:text-white transition-colors break-all">aditya.tyagi1207@gmail.com</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-gray-200 dark:border-white/10 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} MedAI RAG. Built with ❤️ for medical students. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>

          <div className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="p-8">
              <div className="flex items-center gap-3 justify-center mb-8">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">M</div>
                <span className="font-semibold text-2xl tracking-tight text-black dark:text-white">MedAI RAG</span>
              </div>

              <h2 className="text-2xl font-medium text-center mb-2 text-black dark:text-white">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">
                {isSignUp ? 'Start your 7-day free trial today' : 'Log in to continue studying'}
              </p>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg text-green-600 dark:text-green-400 text-sm text-center">
                  {successMsg}
                </div>
              )}

              {/* Google OAuth */}
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium py-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 mb-4 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                <span className="text-xs text-gray-400">or with email</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                {isSignUp && (
                  <>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-1/2 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        placeholder="First Name"
                        required
                      />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-1/2 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        placeholder="Last Name"
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-2/3 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        placeholder="Phone Number"
                        required
                      />
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-1/3 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                        placeholder="Age"
                        required
                        min="1"
                        max="120"
                      />
                    </div>
                  </>
                )}
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    placeholder="Email address"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    placeholder="Password"
                    required
                    minLength="6"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 dark:text-black font-medium py-3.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
                >
                  {loading ? 'Continuing...' : isSignUp ? 'Create Account' : 'Log In'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-black dark:text-white font-medium hover:underline transition-all"
                  >
                    {isSignUp ? 'Log in' : 'Sign up'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render Legal Modals */}
      {renderLegalModal()}

    </div>
  )
}
