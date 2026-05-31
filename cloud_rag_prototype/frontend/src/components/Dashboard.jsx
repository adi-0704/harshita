import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Dashboard({ session, totalCorrect, totalQuestions, savedNotesCount, onClose }) {
  const [stats, setStats] = useState({ totalChats: 0, totalMessages: 0, flashcardsCount: 0 });
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session) return;
      
      const { count: chatsCount } = await supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: msgsCount } = await supabase.from('chat_history').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      const { count: flashCount } = await supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
      
      setStats({
        totalChats: chatsCount || 0,
        totalMessages: msgsCount || 0,
        flashcardsCount: flashCount || 0
      });

      // Mock Activity Data for Chart
      setActivityData([
        { name: 'Mon', queries: Math.floor(Math.random() * 10) },
        { name: 'Tue', queries: Math.floor(Math.random() * 15) },
        { name: 'Wed', queries: Math.floor(Math.random() * 8) },
        { name: 'Thu', queries: Math.floor(Math.random() * 20) },
        { name: 'Fri', queries: Math.floor(Math.random() * 12) },
        { name: 'Sat', queries: Math.floor(Math.random() * 25) },
        { name: 'Sun', queries: Math.floor(Math.random() * 5) },
      ]);
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
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track your study progress and metrics</p>
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
            <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.totalMessages}</span>
          </div>
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Saved Notes</p>
            <span className="text-4xl font-black text-purple-600 dark:text-purple-400">{savedNotesCount}</span>
          </div>
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Flashcards</p>
            <span className="text-4xl font-black text-green-600 dark:text-green-400">{stats.flashcardsCount}</span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm h-80 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Study Activity (Queries)</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{backgroundColor: '#222', borderColor: '#444', color: '#fff', borderRadius: '8px'}} />
                  <Line type="monotone" dataKey="queries" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm h-80 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Weekly Performance</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                  <YAxis stroke="#888" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{backgroundColor: '#222', borderColor: '#444', color: '#fff', borderRadius: '8px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                  <Bar dataKey="queries" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
