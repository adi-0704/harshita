import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard({ session, totalCorrect, totalQuestions, savedNotesCount, onClose }) {
  const [stats, setStats] = useState({ totalChats: 0, totalMessages: 0, flashcardsCount: 0 });
  const [activityData, setActivityData] = useState([]);
  const [quizData, setQuizData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session) return;
      setLoading(true);

      // --- Fetch counts ---
      const { count: chatsCount } = await supabase
        .from('chat_sessions').select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const { count: msgsCount } = await supabase
        .from('chat_history').select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const { count: flashCount } = await supabase
        .from('flashcards').select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      setStats({
        totalChats: chatsCount || 0,
        totalMessages: msgsCount || 0,
        flashcardsCount: flashCount || 0
      });

      // --- Fetch real daily activity from past 7 days ---
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayData = {};

      // Build last 7 days structure
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = days[d.getDay()];
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        dayData[dateStr] = { name: label, queries: 0, quizAttempts: 0 };
      }

      // Fetch all user messages in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: msgs } = await supabase
        .from('chat_history')
        .select('created_at, role')
        .eq('user_id', session.user.id)
        .eq('role', 'user')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (msgs) {
        msgs.forEach(msg => {
          const dateStr = msg.created_at.split('T')[0];
          if (dayData[dateStr]) {
            dayData[dateStr].queries += 1;
          }
        });
      }

      setActivityData(Object.values(dayData));

      // Quiz accuracy per day (approximate from quiz score stored in session)
      // We'll show sessions created per day as a proxy for study sessions
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      const sessionDayData = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = days[d.getDay()];
        const dateStr = d.toISOString().split('T')[0];
        sessionDayData[dateStr] = { name: label, sessions: 0 };
      }

      if (sessions) {
        sessions.forEach(s => {
          const dateStr = s.created_at.split('T')[0];
          if (sessionDayData[dateStr]) {
            sessionDayData[dateStr].sessions += 1;
          }
        });
      }

      setQuizData(Object.values(sessionDayData));
      setLoading(false);
    };

    fetchStats();
  }, [session]);

  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-screen w-full bg-gray-50 dark:bg-[#121212] p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Dashboard</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Your real study progress and metrics</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-[#2f2f2f] hover:bg-gray-100 dark:hover:bg-[#3f3f3f] text-gray-800 dark:text-gray-200 rounded-lg transition-colors shadow-sm font-medium border border-gray-200 dark:border-white/10">
            Back to Chat
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Quiz Accuracy</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-gray-900 dark:text-white">{accuracy}%</span>
              <span className="text-sm text-gray-400 mb-1">({totalCorrect}/{totalQuestions})</span>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Total Queries</p>
            <span className="text-4xl font-black text-blue-600 dark:text-blue-400">
              {loading ? '...' : stats.totalMessages}
            </span>
          </div>
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Saved Notes</p>
            <span className="text-4xl font-black text-purple-600 dark:text-purple-400">{savedNotesCount}</span>
          </div>
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Flashcards</p>
            <span className="text-4xl font-black text-green-600 dark:text-green-400">
              {loading ? '...' : stats.flashcardsCount}
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Line Chart - Real daily queries */}
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm h-80 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Daily Queries (Last 7 Days)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Messages you sent to MedAI</p>
            </div>
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading...</div>
              ) : activityData.every(d => d.queries === 0) ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No queries yet this week</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{backgroundColor: '#222', borderColor: '#444', color: '#fff', borderRadius: '8px'}} />
                    <Line type="monotone" dataKey="queries" name="Queries" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          
          {/* Bar Chart - Real daily study sessions */}
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm h-80 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Study Sessions (Last 7 Days)</h3>
              <p className="text-xs text-gray-400 mt-0.5">New chat sessions started per day</p>
            </div>
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading...</div>
              ) : quizData.every(d => d.sessions === 0) ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sessions yet this week</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quizData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{backgroundColor: '#222', borderColor: '#444', color: '#fff', borderRadius: '8px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Bar dataKey="sessions" name="Sessions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#1e1e1e] p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Chat Sessions</p>
            <span className="text-3xl font-black text-gray-900 dark:text-white">{loading ? '...' : stats.totalChats}</span>
          </div>
          <div className="bg-white dark:bg-[#1e1e1e] p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Queries Today</p>
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : (activityData[activityData.length - 1]?.queries ?? 0)}
            </span>
          </div>
          <div className="bg-white dark:bg-[#1e1e1e] p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Weekly Queries</p>
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {loading ? '...' : activityData.reduce((sum, d) => sum + d.queries, 0)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
