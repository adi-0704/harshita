import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Flashcards({ session, onClose }) {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchFlashcards = async () => {
      if (!session) return;
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setFlashcards(data);
      }
      setLoading(false);
    };
    fetchFlashcards();
  }, [session]);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  return (
    <div className="flex-1 flex flex-col h-screen w-full bg-gray-50 dark:bg-[#121212] p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Flashcards</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Review your AI-generated study decks</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-[#2f2f2f] hover:bg-gray-100 dark:hover:bg-[#3f3f3f] text-gray-800 dark:text-gray-200 rounded-lg transition-colors shadow-sm font-medium border border-gray-200 dark:border-white/10">
            Back to Chat
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        ) : flashcards.length === 0 ? (
          <div className="text-center p-20 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <div className="text-5xl mb-4">📇</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No flashcards yet!</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Ask the AI a question, and click the "Generate Flashcards" button below its response to build your deck.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center max-w-2xl mx-auto">
            <div className="w-full mb-6 flex justify-between items-center text-sm font-medium text-gray-500 dark:text-gray-400">
              <span>Card {currentIndex + 1} of {flashcards.length}</span>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full">{flashcards[currentIndex].topic || 'General'}</span>
            </div>
            
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full aspect-[4/3] sm:aspect-[16/9] perspective-1000 cursor-pointer group"
            >
              <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-white dark:bg-[#212121] rounded-2xl p-8 sm:p-12 shadow-lg border border-gray-200 dark:border-white/5 flex flex-col justify-center items-center text-center">
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest absolute top-6">Question</span>
                  <p className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">{flashcards[currentIndex].question}</p>
                  <p className="text-xs text-gray-400 absolute bottom-6 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</p>
                </div>
                
                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 sm:p-12 shadow-lg border border-blue-200 dark:border-blue-500/20 flex flex-col justify-center items-center text-center overflow-y-auto">
                  <span className="text-sm font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest absolute top-6">Answer</span>
                  <p className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 leading-relaxed">{flashcards[currentIndex].answer}</p>
                </div>

              </div>
            </div>

            <div className="flex gap-4 mt-8 w-full">
              <button onClick={handlePrev} className="flex-1 py-4 bg-white dark:bg-[#2f2f2f] hover:bg-gray-50 dark:hover:bg-[#3f3f3f] text-gray-800 dark:text-white rounded-xl shadow-sm border border-gray-200 dark:border-white/5 font-medium transition-colors">
                Previous
              </button>
              <button onClick={handleNext} className="flex-1 py-4 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl shadow-md font-medium transition-colors">
                Next Card
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
