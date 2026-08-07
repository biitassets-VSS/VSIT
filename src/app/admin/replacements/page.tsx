'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, Clock, 
  Laptop, User, Search, XCircle
} from 'lucide-react';

function AdminReplacementsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [replacementRequests, setReplacementRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🌟 THEME SYNC
  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    fetchReplacements();
    return () => observer.disconnect();
  }, []);

  const fetchReplacements = async () => {
    setLoading(true);
    try {
      const { data: replData, error } = await supabase
        .from('tickets')
        .select('*')
        .ilike('category', '%Asset Replacement%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReplacementRequests(replData || []);
    } catch (err: any) {
      alert("Failed to fetch replacements: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processReplacement = async (ticketId: string, action: 'In Progress' | 'Resolved' | 'Closed') => {
    let remarks = prompt(`Provide status update remarks for ${action}:`);
    if (remarks === null) return; 

    setUpdatingId(ticketId);
    try {
      await supabase.from('tickets').update({ 
        status: action, 
        admin_remarks: remarks 
      }).eq('id', ticketId);

      fetchReplacements();
      alert(`Replacement ticket marked as ${action}.`);
    } catch (err: any) {
      alert(`Error updating replacement: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredList = replacementRequests.filter(item => {
    const query = searchQuery.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const staff = (item.staff_name || item.created_by || '').toLowerCase();
    return title.includes(query) || staff.includes(query);
  });

  const pendingCount = replacementRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length;

  // 🎨 PURE MAC OS 2026 FROSTED GLASS THEME
  const theme = {
    bg: 'bg-transparent',
    glassCard: isDarkMode 
      ? 'bg-[#18181b]/40 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300'
      : 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300',
    glassInner: isDarkMode
      ? 'bg-black/40 backdrop-blur-md border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
      : 'bg-white/50 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]',
    inputBg: isDarkMode 
      ? 'bg-black/50 border border-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20' 
      : 'bg-white/50 border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-x-hidden font-sans antialiased pb-12 transition-colors duration-1000`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 mx-auto space-y-5 sm:space-y-6 pt-4 relative z-10">
        
        {/* BRAND HEADER */}
        <div className={`${theme.glassCard} rounded-4xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 sm:p-3 ${theme.glassItem} rounded-2xl ${theme.textSub} transition-all cursor-pointer hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <RefreshCw className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Asset Replacements</span>
                </h1>
                {pendingCount > 0 && (
                  <span className="px-3 py-1 bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full shadow-[0_4px_15px_rgba(249,115,22,0.4)] animate-pulse">
                    {pendingCount} Queued
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Process hardware swap requests and broken equipment exchanges</p>
            </div>
          </div>

          <button 
            onClick={fetchReplacements} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 ${theme.glassItem} text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : 'text-purple-500 dark:text-purple-400'} />
            <span>Sync Swaps</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className={`p-2.5 rounded-2xl transition-all shadow-sm flex items-center focus-within:ring-4 focus-within:ring-orange-500/20 ${theme.inputBg}`}>
          <div className="relative w-full flex items-center">
            <Search size={18} className={`absolute left-4 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="Search replacement requests by name or title..." 
              className={`w-full pl-12 pr-4 py-2 text-sm font-semibold outline-none bg-transparent ${isDarkMode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'}`} 
            />
          </div>
        </div>

        {/* REPLACEMENTS FEED */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Swap Logs...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.glassCard}`}>
            <RefreshCw size={48} className={`mx-auto opacity-60 ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Replacement Requests</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The hardware replacement timeline is clear.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((item) => {
              const isPending = (item.status || '').toLowerCase() === 'pending';

              return (
                <div key={item.id} className={`p-6 md:p-8 rounded-3xl flex flex-col xl:flex-row gap-8 ${theme.glassItem} transition-all hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] ${isPending ? isDarkMode ? 'border-orange-500! ring-4 ring-orange-500/20 bg-orange-500/10!' : 'border-orange-400! ring-4 ring-orange-400/20 bg-orange-50/50!' : ''}`}>
                  
                  <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-8 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-sm ${theme.glassInner} ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`}><User size={20} /></div>
                      <div className="overflow-hidden">
                        <h3 className={`text-lg font-bold leading-tight truncate ${theme.textMain}`}>{item.staff_name || item.created_by || 'Staff Member'}</h3>
                        <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-md shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border mt-1 inline-block ${isDarkMode ? 'bg-black/50 text-zinc-300 border-white/20' : 'bg-white/60 text-slate-700 border-white/80'}`}>
                          EMP: {item.emp_code || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl space-y-3 ${theme.glassInner}`}>
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${theme.textMain}`}>
                        <Laptop size={14} className="text-orange-500 shrink-0" />
                        <span className="truncate text-left font-black">{item.title}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[12px]">
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <Clock size={14} className={isDarkMode ? "text-purple-400" : "text-purple-600"} /> 
                        <span className="text-[10px] font-black uppercase tracking-widest">Submitted Date</span>
                      </div>
                      <span className={`font-bold ${theme.textMain}`}>{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Replacement Reason</h4>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 shadow-sm cursor-default ${
                        isPending 
                          ? isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse' : 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse' 
                          : item.status.includes('Progress') 
                            ? isDarkMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-600'
                            : isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className={`p-4 rounded-2xl text-xs font-semibold italic leading-relaxed whitespace-pre-wrap ${theme.glassInner} ${theme.textMain}`}>
                        {item.description}
                      </div>
                    </div>

                    {item.admin_remarks && (
                      <div className={`p-4 rounded-2xl text-xs font-semibold ${theme.glassInner}`}>
                        <span className={`font-black uppercase text-[9px] tracking-wider block mb-1.5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Admin Update:</span>
                        <p className={theme.textMain}>"{item.admin_remarks}"</p>
                      </div>
                    )}

                    {!item.status.includes('Closed') && !item.status.includes('Resolved') && (
                      <div className={`pt-4 border-t mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                        {isPending && (
                          <button disabled={updatingId === item.id} onClick={() => processReplacement(item.id, 'In Progress')} className="flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(168,85,247,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 border border-purple-500">
                            <Clock size={16} /> Mark In-Progress
                          </button>
                        )}
                        <button disabled={updatingId === item.id} onClick={() => processReplacement(item.id, 'Resolved')} className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(16,185,129,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 border border-emerald-400">
                          <CheckCircle2 size={16} /> Resolve & Close
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReplacementsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-transparent dark:bg-[#0a0a0a]" />}><AdminReplacementsContent /></Suspense>;
}