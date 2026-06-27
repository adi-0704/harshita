import React from 'react';

export default function QuizModal({
  mcqLoading,
  mcqModal,
  quizFinished,
  currentQuestionIndex,
  selectedOption,
  quizScore,
  onClose,
  onSelectOption,
  onNextQuestion,
}) {
  if (mcqLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-[#212121] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-16 flex flex-col items-center justify-center text-center gap-4 text-gray-900 dark:text-white">
          <svg className="animate-spin h-8 w-8 text-purple-500 dark:text-purple-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="font-medium text-gray-600 dark:text-gray-300">Generating 5-Question Quiz...</p>
        </div>
      </div>
    );
  }

  if (!mcqModal) return null;

  const currentQuestion = mcqModal[currentQuestionIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-[#212121] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {!quizFinished ? (
          <>
            <div className="bg-gray-50 dark:bg-[#171717] px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="font-medium text-lg text-gray-900 dark:text-white">Knowledge Check</h3>
                <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">
                  Question {currentQuestionIndex + 1} of {mcqModal.length}
                </span>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto">
              <p className="text-lg font-medium mb-8 text-black dark:text-white leading-relaxed">{currentQuestion.question}</p>

              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => {
                  let btnClass = "w-full text-left p-4 rounded-xl border transition-all text-[15px] ";
                  if (selectedOption === null) {
                    btnClass += "border-gray-200 dark:border-white/10 bg-white dark:bg-[#2f2f2f] hover:bg-gray-50 dark:hover:bg-[#3f3f3f] text-gray-800 dark:text-gray-200";
                  } else {
                    if (idx === currentQuestion.correct_index) {
                      btnClass += "border-green-500 bg-green-50 dark:border-green-500/50 dark:bg-green-500/10 text-green-700 dark:text-green-400";
                    } else if (idx === selectedOption) {
                      btnClass += "border-red-500 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10 text-red-700 dark:text-red-400";
                    } else {
                      btnClass += "border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#212121] text-gray-400 dark:text-gray-500 opacity-50";
                    }
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectOption(idx, idx === currentQuestion.correct_index)}
                      disabled={selectedOption !== null}
                      className={btnClass}
                    >
                      <span className="inline-block w-8 font-medium opacity-50">{['A','B','C','D'][idx]}.</span> {opt}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="mt-8 p-5 bg-gray-50 dark:bg-[#2f2f2f] rounded-xl border border-gray-200 dark:border-white/5 animate-in fade-in slide-in-from-top-4 text-[15px]">
                  <p className={`font-semibold mb-2 ${selectedOption === currentQuestion.correct_index ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {selectedOption === currentQuestion.correct_index ? '✅ Correct' : '❌ Incorrect'}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{currentQuestion.explanation}</p>

                  <button
                    onClick={onNextQuestion}
                    className="w-full bg-black text-white dark:bg-white dark:hover:bg-gray-200 hover:bg-gray-800 dark:text-black font-medium py-3 rounded-lg transition-colors"
                  >
                    {currentQuestionIndex < mcqModal.length - 1 ? 'Next Question' : 'View Final Score'}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-[#212121]">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🏆</span>
            </div>
            <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Quiz Complete!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">You just reviewed this topic.</p>

            <div className="bg-gray-50 dark:bg-[#2f2f2f] border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-8 inline-block min-w-[200px]">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest font-semibold">Your Score</p>
              <p className="text-5xl font-black text-black dark:text-white">
                {quizScore} <span className="text-2xl text-gray-400 dark:text-gray-500">/ {mcqModal.length}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-black text-white dark:bg-white dark:hover:bg-gray-200 hover:bg-gray-800 dark:text-black font-medium py-3.5 rounded-xl transition-colors"
            >
              Close and Continue Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
