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
  const [legalModal, setLegalModal] = useState(null) // 'privacy', 'terms', 'disclaimer', or null
  const [demoFlipped, setDemoFlipped] = useState(false)

  const openModal = (signup = false) => {
    setIsSignUp(signup)
    setShowModal(true)
    setErrorMsg(null)
    setSuccessMsg(null)
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

  const renderLegalModal = () => {
    if (!legalModal) return null;
    
    let title = "";
    let content = null;
    
    if (legalModal === 'privacy') {
      title = "Privacy Policy";
      content = (
        <div className="space-y-4">
          <p>Last updated: November 30, 2026</p>
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
          <p>Last updated: November 30, 2026</p>
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
          <p>MedAI RAG was founded in 2026 with a simple mission: to empower the next generation of healthcare professionals with advanced Artificial Intelligence.</p>
          <p>We believe that quick, accurate access to medical information saves lives and improves patient outcomes.</p>
        </div>
      );
    } else if (legalModal === 'careers') {
      title = "Careers";
      content = (
        <div className="space-y-4">
          <p>Join our mission to revolutionize medical education!</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Senior Full Stack Engineer (Remote)</li>
            <li>AI Researcher - Medical Domain (San Francisco)</li>
            <li>Clinical Content Reviewer (Part-time)</li>
          </ul>
          <p className="mt-4 font-medium">Email your resume to aditya.tyagi1207@gmail.com</p>
        </div>
      );
    } else if (legalModal === 'news') {
      title = "Company News";
      content = (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">November 2026: MedAI RAG Launches 5-Question Quizzes!</h3>
          <p>We are thrilled to announce our latest feature: dynamic, auto-generated 5-question quizzes based on your textbook chats.</p>
          <h3 className="font-bold text-lg mt-4">October 2026: V1 Launch</h3>
          <p>MedAI RAG is now live for all medical professionals!</p>
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
          <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm">M</div>
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
          <button onClick={() => openModal(false)} className="text-sm font-medium hover:text-black dark:hover:text-white transition-colors text-gray-600 dark:text-gray-300">Log in</button>
          <button onClick={() => openModal(true)} className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-medium transition-colors">Sign up</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="px-6 max-w-5xl mx-auto text-center mb-32 flex flex-col items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium tracking-widest uppercase">November 30, 2026 &nbsp;&bull;&nbsp; Product</p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8 leading-tight text-black dark:text-white">
            The Medical Study <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Super-Platform</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mb-12 font-light">
            Upload your PDFs, generate instant Anki flashcards, dictate your medical questions, and track your performance with our powerful AI Copilot.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto justify-center">
            <button onClick={() => openModal(true)} className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-4 rounded-full font-medium transition-colors text-lg flex items-center justify-center gap-2">
              Try MedAI RAG 
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </button>
            <button onClick={() => window.scrollTo({top: document.getElementById('pricing').offsetTop, behavior: 'smooth'})} className="bg-transparent border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 px-8 py-4 rounded-full font-medium transition-colors text-lg">
              View Pricing
            </button>
          </div>

          <div className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl relative bg-gray-100 dark:bg-[#0a0a0a]">
            <img src="/images/hero.png" alt="Medical AI Interface" className="w-full opacity-90 hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-black/80 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="bg-gray-50 dark:bg-[#0f0f0f] py-32 border-y border-gray-200 dark:border-white/5 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-4xl font-semibold mb-16 text-center text-black dark:text-white">Everything you need to crush your exams.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Feature 1 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm flex flex-col justify-between md:col-span-2">
                <div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Voice Dictation</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">Medical terminology is hard to type. Just tap the microphone and speak. We'll transcribe complex terms perfectly.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Upload Custom PDFs</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Upload your professor's lecture slides. The AI will instantly search and summarize them.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="text-4xl mb-6">📇</div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Instant Flashcards</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Click one button to instantly generate high-yield Anki-style flashcards from any AI response.</p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div className="text-4xl mb-6">✨</div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">AI Suggestions</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Keep the conversation flowing with smart, clickable follow-up questions at the end of every answer.</p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm md:col-span-2 lg:col-span-1">
                <div className="text-4xl mb-6">📊</div>
                <h3 className="text-2xl font-bold text-black dark:text-white mb-3">Student Dashboard</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Track your accuracy and study patterns with beautiful interactive charts.</p>
              </div>

            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="py-32 px-6 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-semibold mb-6 text-black dark:text-white">Try the Flashcard Engine</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">Tap the card below to flip it.</p>
          
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
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 px-6 max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold mb-16 text-center text-black dark:text-white">Loved by medical professionals.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-[#111] p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none flex flex-col justify-between">
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-8 leading-relaxed">"MedAI RAG completely changed how I study for my exams. Finding exact pathogen treatments used to take 20 minutes of page flipping. Now it takes 5 seconds."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                <div>
                  <div className="font-medium text-black dark:text-white">Dr. Sarah Jenkins</div>
                  <div className="text-sm text-gray-500">Resident, Internal Medicine</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none flex flex-col justify-between">
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-8 leading-relaxed">"The auto-generated MCQs are incredible. It perfectly targets the high-yield concepts from the chapter I'm currently chatting about. A game changer."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                <div>
                  <div className="font-medium text-black dark:text-white">Mark T.</div>
                  <div className="text-sm text-gray-500">3rd Year Med Student</div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] p-8 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none flex flex-col justify-between">
              <p className="text-gray-700 dark:text-gray-300 text-lg mb-8 leading-relaxed">"Being able to see exactly which textbook page the AI pulled the answer from gives me the confidence I need to trust it clinically."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                <div>
                  <div className="font-medium text-black dark:text-white">Dr. Rajesh Patel</div>
                  <div className="text-sm text-gray-500">Attending Physician</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-gray-50 dark:bg-[#0f0f0f] py-32 border-y border-gray-200 dark:border-white/5 text-center transition-colors duration-300">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-4xl font-semibold mb-6 text-black dark:text-white">Simple, transparent pricing.</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-16">Start with a 14-day free trial. Cancel anytime.</p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Basic Tier */}
              <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-3xl p-10 text-left shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-medium mb-2 text-black dark:text-white">Basic</h3>
                  <div className="flex items-end gap-2 mb-8">
                    <span className="text-5xl font-semibold text-black dark:text-white">₹599</span>
                    <span className="text-gray-500 dark:text-gray-400 mb-1">/ month</span>
                  </div>
                  <ul className="space-y-4 mb-10 text-gray-700 dark:text-gray-300">
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> 100 RAG Queries / month</li>
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Flashcard Generator</li>
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Voice Dictation</li>
                  </ul>
                </div>
                <button onClick={() => openModal(true)} className="w-full bg-gray-100 dark:bg-[#2f2f2f] text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#3f3f3f] font-medium py-3 rounded-xl transition-colors border border-gray-200 dark:border-white/10">
                  Start 14-Day Free Trial
                </button>
              </div>

              {/* Pro Tier */}
              <div className="bg-black dark:bg-[#1e1e1e] border border-gray-800 dark:border-white/20 rounded-3xl p-10 text-left shadow-2xl relative overflow-hidden transform md:-translate-y-4 flex flex-col justify-between">
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                <div>
                  <h3 className="text-2xl font-medium mb-2 text-white">Pro</h3>
                  <div className="flex items-end gap-2 mb-8">
                    <span className="text-5xl font-semibold text-white">₹999</span>
                    <span className="text-gray-400 mb-1">/ month</span>
                  </div>
                  <ul className="space-y-4 mb-10 text-gray-300">
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> 1000 RAG Queries / month</li>
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Custom PDF Uploads</li>
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Student Analytics Dashboard</li>
                    <li className="flex items-center gap-3"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Priority Support</li>
                  </ul>
                </div>
                <button onClick={() => openModal(true)} className="w-full bg-white text-black hover:bg-gray-200 font-medium py-3 rounded-xl transition-colors">
                  Start 14-Day Free Trial
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-semibold mb-8 text-black dark:text-white">Ready to study smarter?</h2>
          <button onClick={() => openModal(true)} className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-10 py-5 rounded-full font-bold transition-colors text-xl shadow-lg">
            Create your account
          </button>
        </section>
        
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-black py-16 border-t border-gray-200 dark:border-white/10 px-6 transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-[10px]">M</div>
              <span className="font-semibold text-lg tracking-tight text-black dark:text-white">MedAI RAG</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">Empowering the next generation of healthcare professionals with advanced Artificial Intelligence.</p>
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
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  <span>8178022572</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  <span>Sharda Hospital</span>
                </li>
              </ul>
            </div>
          </div>
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
                <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-lg">M</div>
                <span className="font-semibold text-2xl tracking-tight text-black dark:text-white">MedAI RAG</span>
              </div>
              
              <h2 className="text-2xl font-medium text-center mb-8 text-black dark:text-white">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
              
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
                  {loading ? 'Continuing...' : 'Continue'}
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
