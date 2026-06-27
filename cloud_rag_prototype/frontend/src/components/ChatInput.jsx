import React, { useRef, useEffect } from 'react';

export default function ChatInput({
  query,
  setQuery,
  loading,
  onSend,
  isListening,
  onToggleListening,
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 192) + 'px'; // max-h-48 = 192px
  }, [query]);

  // Keyboard shortcut: / to focus (when not typing)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="shrink-0 w-full bg-white dark:bg-black pt-4 pb-6 px-4 border-t border-transparent dark:border-white/5 transition-colors duration-300">
      <div className="max-w-3xl mx-auto relative">
        <div className="bg-white dark:bg-[#2f2f2f] border border-gray-300 dark:border-white/10 rounded-2xl flex items-end p-2 shadow-lg focus-within:border-blue-400 dark:focus-within:border-white/30 transition-colors">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Message MedAI RAG... (Press / to focus)"
            className="flex-1 bg-transparent border-none py-3 px-4 text-black dark:text-[#ececec] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0 resize-none min-h-[52px] max-h-48 overflow-y-auto"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <button
            onClick={onToggleListening}
            className={`p-3 m-1 rounded-xl transition-colors shrink-0 ${
              isListening
                ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 animate-pulse'
                : 'bg-transparent text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
            title="Voice Input"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
          </button>
          <button
            onClick={onSend}
            disabled={loading || !query.trim()}
            className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 p-3 m-1 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
        <div className="text-center mt-3 text-xs text-gray-500">
          MedAI can make mistakes. Consider verifying important clinical information.
        </div>
      </div>
    </div>
  );
}
