import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2pdf from 'html2pdf.js';

export default function SavedNotesPanel({
  savedNotes,
  showSavedSidebar,
  setShowSavedSidebar,
  onDeleteNote,
  onExportPDF,
}) {
  const [expandedNoteId, setExpandedNoteId] = useState(null);

  if (!showSavedSidebar) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowSavedSidebar(false)}></div>
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#171717] border-l border-gray-200 dark:border-white/5 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-5 border-b border-gray-200 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-transparent">
          <h2 className="text-lg font-medium text-black dark:text-white">Your Notebook</h2>
          <button
            onClick={() => setShowSavedSidebar(false)}
            className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {savedNotes.length === 0 ? (
            <div className="text-center text-gray-500 mt-10 text-sm">
              <p>No notes saved yet.</p>
            </div>
          ) : (
            savedNotes.map((note) => (
              <div
                key={note.id}
                className="bg-gray-50 dark:bg-[#212121] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col group shadow-sm dark:shadow-none"
              >
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
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => onExportPDF(`pdf-export-${note.id}`, `MedAI_Note_${note.id}`)}
                      className="flex items-center gap-1 bg-black text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black hover:bg-gray-800 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
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
  );
}
