import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

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
        // App.jsx will automatically detect the session change and render the Chat UI
      }
    } catch (error) {
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex selection:bg-teal-500/30 font-sans">
      
      {/* Left Marketing Side */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-12 relative overflow-hidden bg-slate-900 border-r border-slate-800">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-gradient-to-br from-teal-400 to-indigo-500 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-teal-500/20">M</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">MedAI RAG</h1>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">The Ultimate AI Copilot for Medical Students.</h2>
          <p className="text-lg text-slate-400 mb-10 leading-relaxed">
            Stop searching through thousands of textbook pages. Chat directly with your medical library, instantly generate high-yield MCQs, and save print-ready exam notes to the cloud.
          </p>
          
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 mb-10 transform hover:scale-[1.02] transition-transform duration-500">
            <img src="/images/hero.png" alt="Medical AI Dashboard" className="w-full h-auto" />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
              <h3 className="text-teal-400 font-bold mb-2">Cloud Synced</h3>
              <p className="text-sm text-slate-400">Your chat history is persistently saved to the cloud across all your devices.</p>
            </div>
            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
              <h3 className="text-indigo-400 font-bold mb-2">Direct Citations</h3>
              <p className="text-sm text-slate-400">Every answer is backed by exact textbook paragraphs to guarantee accuracy.</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-teal-500/30 col-span-2 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold mb-1 text-lg">Pro Subscription</h3>
                <p className="text-sm text-slate-400">Unlock unlimited medical textbook queries.</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-teal-400">₹1,000</span>
                <span className="text-sm text-slate-400 block">/ month</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Auth Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
        <div className="w-full max-w-md">
          
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
            <div className="bg-gradient-to-br from-teal-400 to-indigo-500 w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">M</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">MedAI RAG</h1>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
            <p className="text-slate-400 mb-8">{isSignUp ? 'Sign up to start chatting with your textbooks.' : 'Log in to access your medical copilot and saved notes.'}</p>
            
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="doctor@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="••••••••"
                  required
                  minLength="6"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none mt-4"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-700 pt-6">
              <p className="text-slate-400 text-sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); setSuccessMsg(null); }}
                  className="text-teal-400 font-bold hover:text-teal-300 transition-colors"
                >
                  {isSignUp ? 'Log In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}
