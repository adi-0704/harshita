import React, { useState } from 'react';

export default function Sidebar({
  session,
  sessions,
  currentSessionId,
  isSidebarOpen,
  setIsSidebarOpen,
  isDarkMode,
  setIsDarkMode,
  onNewChat,
  onSelectSession,
  onShowDashboard,
  onShowFlashcards,
  onShowDownloads,
  uploadingPdf,
  onPdfUpload,
  showDashboard,
  showFlashcards,
  showDownloads,
  onSignOut,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = searchTerm
    ? sessions.filter((s) =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sessions;

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 w-64 h-full bg-gray-50 dark:bg-[#171717] border-r border-gray-200 dark:border-white/10 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm">
              M
            </div>
            <span className="font-semibold text-lg tracking-tight">MedAI RAG</span>
          </div>
          <button
            className="md:hidden p-2 text-gray-500 hover:text-black dark:hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="px-3 pb-3 shrink-0 space-y-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 bg-white dark:bg-[#212121] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-black dark:text-white shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            New Chat
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => {
                onShowDashboard();
                setIsSidebarOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => {
                onShowFlashcards();
                setIsSidebarOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              <span className="text-sm">📇</span>
              Flashcards
            </button>
          </div>

          <button
            onClick={() => {
              onShowDownloads();
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              showDownloads
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Chats as PDF
          </button>

          <label
            className={`w-full flex items-center justify-center gap-2 cursor-pointer ${
              uploadingPdf
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                : 'bg-gray-100 dark:bg-[#2f2f2f] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] text-gray-700 dark:text-gray-300'
            } px-3 py-2 rounded-lg text-xs font-medium transition-colors`}
          >
            {uploadingPdf ? (
              <>
                <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                </svg>
                Upload PDF
              </>
            )}
            <input type="file" accept=".pdf" className="hidden" onChange={onPdfUpload} disabled={uploadingPdf} />
          </label>
        </div>

        {/* Search & Sessions */}
        <div className="px-3 pb-2 shrink-0">
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 px-2 uppercase tracking-wider">
            Recent Chats
          </div>
          {sessions.length > 5 && (
            <div className="relative mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-white dark:bg-[#212121] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 dark:focus:border-white/30"
              />
              <svg className="w-3.5 h-3.5 absolute right-3 top-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-xs text-gray-400 dark:text-gray-500 px-2 py-2">
              {searchTerm ? 'No matching chats' : 'No chats yet'}
            </div>
          ) : (
            filteredSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full text-left truncate px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  currentSessionId === s.id && !showDashboard && !showFlashcards && !showDownloads
                    ? 'bg-gray-200 dark:bg-[#2a2a2a] font-medium text-black dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#212121] hover:text-black dark:hover:text-white'
                }`}
              >
                {s.title}
              </button>
            ))
          )}
        </div>

        {/* User Actions */}
        <div className="p-3 border-t border-gray-200 dark:border-white/10 space-y-1 shrink-0">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#212121] rounded-lg transition-colors"
          >
            {isDarkMode ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                Light Mode
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
                Dark Mode
              </>
            )}
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
