'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle, Loader2, Package, ShieldCheck } from 'lucide-react';

export default function StaffRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // 🌟 Sync Theme Properly
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    syncTheme();

    fetchRequests();
    const sub = supabase.channel('staff_reqs_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchRequests = async () => {
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) return;
    
    let email = sessionStr;
    try { email = JSON.parse(sessionStr).email; } catch(e) {}

    const { data } = await supabase
      .from('tickets')
      .select('*')
      .ilike('created_by', email?.toLowerCase().trim())
      .ilike('title', '%Asset Request%')
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    if (s === 'approved' || s === 'allocated') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    if (s === 'rejected') return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
    return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.1)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.8)]',
    glassInner: isDarkMode 
      ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner' 
      : 'bg-white/50 backdrop-blur-xl border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)]',
    glassItem: isDarkMode
      ? 'bg-black/20 border border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all'
      : 'bg-white/50 border border-white/60 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all',
  };

  if (loading) return (
    <div className={`flex min-h-[70vh] items-center justify-center flex-col gap-3 ${theme.bg}`}>
      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      <p className={`text-xs font-bold ${theme.textSub} tracking-widest uppercase`}>Syncing Requests...</p>
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 animate-in fade-in duration-500 w-full min-h-screen pb-32 select-none relative ${theme.bg}`} onContextMenu={(e) => e.preventDefault()}>
      
      {/* 🌟 ADVANCED HEADER WITH PREMIUM GLASS THEME */}
      <div className={`relative ${theme.glassCard} rounded-4xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden`}>
        {/* Subtle background glow blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
        
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black ${theme.textMain} tracking-tight flex items-center gap-3`}>
            <Package className="text-purple-500" /> Asset Requests
          </h1>
          <p className={`text-xs sm:text-sm font-medium ${theme.textSub} mt-1 max-w-xl`}>
            Track the status of your requested equipment and gear.
          </p>
        </div>
        
        <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 border border-purple-400/50">
          <PlusCircle size={18} /> New Request
        </button>
      </div>

      {/* 🌟 PREMIUM GLASS REQUESTS CONTAINER */}
      <div className={`${theme.glassCard} rounded-4xl p-5 sm:p-7 relative overflow-hidden min-h-[50vh]`}>
        
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className={theme.textMain} />
            <h2 className={`text-sm sm:text-base font-black ${theme.textMain} tracking-widest uppercase`}>Request History</h2>
          </div>
          <span className={`text-xs sm:text-sm font-black ${theme.textSub}`}>{requests.length} Records</span>
        </div>

        {requests.length === 0 ? (
          <div className={`py-20 text-center border-2 border-dashed ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200/50 bg-white/30'} rounded-4xl flex flex-col items-center`}>
            <Package size={48} className={`${theme.textSub} mb-4 opacity-50`} />
            <h3 className={`text-base font-black ${theme.textMain}`}>No Asset Requests</h3>
            <p className={`text-xs ${theme.textSub} mt-1 max-w-sm font-semibold`}>You have no pending or historical asset requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {requests.map(req => {
              const statusStr = (req.status || '').toLowerCase();
              const isPending = statusStr === 'pending';
              const isRejected = statusStr === 'rejected';

              return (
                <div key={req.id} className={`group ${theme.glassItem} rounded-3xl p-5 sm:p-6 relative overflow-hidden flex flex-col`}>
                  
                  {/* Subtle Background Glow per Card Status */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${isRejected ? 'bg-rose-500' : isPending ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                  {/* Card Header & Status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h3 className={`text-base sm:text-lg font-black ${theme.textMain} tracking-tight flex items-center gap-2.5`}>
                      <div className={`w-8 h-8 rounded-lg ${theme.glassInner} text-purple-500 flex items-center justify-center shadow-xs shrink-0`}>
                        <Package size={16} />
                      </div>
                      <span className="line-clamp-1">{req.title}</span>
                    </h3>
                    
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shrink-0 shadow-sm ${getBadge(req.status)}`}>
                      {req.status || 'Pending'}
                    </span>
                  </div>

                  {/* Request Details */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className={`${theme.glassInner} p-4 rounded-2xl flex-1`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${theme.subText} mb-1.5`}>Reason for Request:</p>
                      <p className={`text-sm font-semibold ${theme.textMain} leading-relaxed wrap-break-word`}>{req.description || req.note || 'No description provided.'}</p>
                    </div>

                    <div className={`pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200/50'} flex justify-between items-center mt-auto`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Request ID</span>
                      <span className={`text-[10px] font-black ${theme.textMain} ${theme.glassInner} px-2 py-1 rounded-md`}>
                        {req.id.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Requested On</span>
                      <span className={`text-xs font-black ${theme.textMain}`}>
                        {new Date(req.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')}
                      </span>
                    </div>
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