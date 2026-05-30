import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

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
        const { error } = await supabase.auth.signUp({ email, password })
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

  return (
    <div className="min-h-screen bg-black text-[#ececec] font-sans selection:bg-white/20">
      
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md z-40 border-b border-white/10 px-6 py-4 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-sm">M</div>
          <span className="font-semibold text-lg tracking-tight">MedAI RAG</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => openModal(false)} className="text-sm font-medium hover:text-white transition-colors text-gray-300">Log in</button>
          <button onClick={() => openModal(true)} className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-medium transition-colors">Sign up</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="px-6 max-w-5xl mx-auto text-center mb-32 flex flex-col items-center">
          <p className="text-sm text-gray-400 mb-6 font-medium tracking-widest uppercase">November 30, 2026 &nbsp;&bull;&nbsp; Product</p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8 leading-tight">
            Introducing MedAI RAG
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mb-12 font-light">
            The ultimate AI Copilot for medical students and professionals. Stop searching through thousands of textbook pages. Chat directly with your medical library.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto justify-center">
            <button onClick={() => openModal(true)} className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-full font-medium transition-colors text-lg flex items-center justify-center gap-2">
              Try MedAI RAG 
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </button>
            <button onClick={() => window.scrollTo({top: document.getElementById('pricing').offsetTop, behavior: 'smooth'})} className="bg-transparent border border-white/20 text-white hover:bg-white/5 px-8 py-4 rounded-full font-medium transition-colors text-lg">
              View Pricing
            </button>
          </div>

          <div className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#0a0a0a]">
            <img src="/images/hero.png" alt="Medical AI Interface" className="w-full opacity-90 hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </section>

        {/* Features / About Section */}
        <section className="bg-[#0f0f0f] py-32 border-y border-white/5">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-16">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              </div>
              <h3 className="text-2xl font-medium">Direct Citations</h3>
              <p className="text-gray-400 leading-relaxed text-lg">Every answer the AI generates is backed by exact textbook paragraphs to guarantee absolute clinical accuracy.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              </div>
              <h3 className="text-2xl font-medium">Instant MCQs</h3>
              <p className="text-gray-400 leading-relaxed text-lg">Test your knowledge instantly. The AI dynamically generates high-yield board-style questions based on your current chat topic.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
              </div>
              <h3 className="text-2xl font-medium">Cloud Synced Notes</h3>
              <p className="text-gray-400 leading-relaxed text-lg">Your entire chat history and saved PDF study notes are persistently synced to the cloud across all your devices.</p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 px-6 max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold mb-16 text-center">Loved by medical professionals.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#111] p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">"MedAI RAG completely changed how I study for my exams. Finding exact pathogen treatments used to take 20 minutes of page flipping. Now it takes 5 seconds."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800"></div>
                <div>
                  <div className="font-medium">Dr. Sarah Jenkins</div>
                  <div className="text-sm text-gray-500">Resident, Internal Medicine</div>
                </div>
              </div>
            </div>
            <div className="bg-[#111] p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">"The auto-generated MCQs are incredible. It perfectly targets the high-yield concepts from the chapter I'm currently chatting about. A game changer."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800"></div>
                <div>
                  <div className="font-medium">Mark T.</div>
                  <div className="text-sm text-gray-500">3rd Year Med Student</div>
                </div>
              </div>
            </div>
            <div className="bg-[#111] p-8 rounded-2xl border border-white/5 flex flex-col justify-between">
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">"Being able to see exactly which textbook page the AI pulled the answer from gives me the confidence I need to trust it clinically."</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-800"></div>
                <div>
                  <div className="font-medium">Dr. Rajesh Patel</div>
                  <div className="text-sm text-gray-500">Attending Physician</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-[#0f0f0f] py-32 border-y border-white/5 text-center">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-4xl font-semibold mb-6">Simple, transparent pricing.</h2>
            <p className="text-xl text-gray-400 mb-12">Unlock the full power of your medical library.</p>
            
            <div className="bg-black border border-white/10 rounded-3xl p-10 max-w-md mx-auto text-left shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-white text-black text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
              <h3 className="text-2xl font-medium mb-2">Pro Subscription</h3>
              <div className="flex items-end gap-2 mb-8">
                <span className="text-5xl font-semibold">₹1,000</span>
                <span className="text-gray-400 mb-1">/ month</span>
              </div>
              <ul className="space-y-4 mb-10 text-gray-300">
                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Unlimited RAG Queries</li>
                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Unlimited MCQ Generation</li>
                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Persistent Cloud History</li>
                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Priority Access to Gemini 1.5 Flash</li>
              </ul>
              <button onClick={() => openModal(true)} className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </section>
        
      </main>

      {/* Footer */}
      <footer className="bg-black py-16 border-t border-white/10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black font-bold text-[10px]">M</div>
              <span className="font-semibold text-lg tracking-tight">MedAI RAG</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">Empowering the next generation of healthcare professionals with advanced Artificial Intelligence.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24 text-sm">
            <div>
              <h4 className="font-semibold mb-4 text-white">Company</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">News</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Legal</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Medical Disclaimer</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-4 text-white">Contact</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  <a href="mailto:aditya.tyagi1207@gmail.com" className="hover:text-white transition-colors break-all">aditya.tyagi1207@gmail.com</a>
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          <div className="relative w-full max-w-md bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="p-8">
              <div className="flex items-center gap-3 justify-center mb-8">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-bold text-lg">M</div>
                <span className="font-semibold text-2xl tracking-tight">MedAI RAG</span>
              </div>
              
              <h2 className="text-2xl font-medium text-center mb-8">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
              
              {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                  {errorMsg}
                </div>
              )}
              
              {successMsg && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border border-gray-700 rounded-lg px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                    placeholder="Email address"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border border-gray-700 rounded-lg px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                    placeholder="Password"
                    required
                    minLength="6"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-200 text-black font-medium py-3.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
                >
                  {loading ? 'Continuing...' : 'Continue'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-white hover:underline transition-all"
                  >
                    {isSignUp ? 'Log in' : 'Sign up'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}
