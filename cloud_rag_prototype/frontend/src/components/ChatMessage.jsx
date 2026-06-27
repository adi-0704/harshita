import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatMessage({
  msg,
  onToggleSources,
  onSaveNote,
  onStartQuiz,
  onGenerateFlashcards,
  onSuggestionClick,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignore
    }
  };

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end w-full">
        <div className="bg-blue-600 dark:bg-[#2f2f2f] text-white px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] text-[15px] leading-relaxed shadow-sm dark:shadow-none">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex gap-4 max-w-[95%] text-[15px]">
      <div className="w-8 h-8 rounded-full bg-black dark:bg-white shrink-0 flex items-center justify-center text-white dark:text-black font-bold text-sm mt-1">
        M
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 dark:prose-pre:bg-[#111] prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-white/10 prose-headings:font-semibold text-gray-900 dark:text-gray-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.content}
          </ReactMarkdown>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                Copy
              </>
            )}
          </button>

          <button
            onClick={() => onSaveNote(msg)}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
            Save Note
          </button>

          <button
            onClick={() => onStartQuiz(msg.id, msg.content)}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Test Me (5-Q Quiz)
          </button>

          <button
            onClick={() => onGenerateFlashcards(msg.content)}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg"
          >
            <span className="text-sm">📇</span> Generate Flashcards
          </button>

          {msg.sources && msg.sources.length > 0 && (
            <button
              onClick={() => onToggleSources(msg.id)}
              className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              {msg.showSources ? 'Hide Citations' : 'View Citations'}
            </button>
          )}
        </div>

        {/* Citations */}
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

        {/* Suggestions */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {msg.suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick(sug)}
                className="text-left text-sm bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-500/30 transition-colors shadow-sm"
              >
                ✨ {sug}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
