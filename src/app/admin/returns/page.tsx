'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, LogOut, CheckCircle2, XCircle, Clock, 
  Laptop, User, Search, RefreshCw, X, ShieldAlert,
  AlertTriangle, FilterX, ExternalLink, Send
} from 'lucide-react';

function AdminReturnsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
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
    
    fetchReturns();
    return () => observer.disconnect();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      // 🌟 STRICT FILTER: Only fetch records that are explicitly Returns!
      const { data: returnsData, error } = await supabase
        .from('inspections')
        .select('*, assets(*)')
        .or('notes.ilike.%[RETURN REQUEST]%,status.ilike.%Return%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturnRequests(returnsData || []);
    } catch (err: any) {
      alert("Failed to fetch return requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processReturn = async (recordId: string, assetId: string, action: 'Approved' | 'Rejected', staffId: string) => {
    let remarks = prompt(`Provide remarks for marking this return as ${action}:`);
    if (remarks === null) return; // User cancelled

    if (!confirm(`Are you sure you want to ${action} this return request?`)) return;

    setUpdatingId(recordId);
    try {
      // 1. Update the inspection log
      await supabase.from('inspections').update({ 
        status: action === 'Approved' ? 'Return Approved' : 'Return Rejected', 
        admin_remarks: remarks 
      }).eq('id', recordId);

      // 2. Update the actual asset inventory
      if (action === 'Approved') {
        await supabase.from('assets').update({ 
          status: 'In Stock (Unassigned)', 
          assigned_to: null, // Wipe the owner since it's returned
          inspection_status: 'Approved' // Clean state for the next user
        }).eq('id', assetId);
      } else {
        await supabase.from('assets').update({ 
          status: 'Assigned', // Give it back to them
          inspection_status: 'Return Rejected'
        }).eq('id', assetId);
      }

      // 3. Notify the Staff Member
      if (staffId && !staffId.includes('ADMIN')) {
        await supabase.from('notifications').insert([{
          target_user: staffId,
          title: action === 'Approved' ? '✔ Return Approved' : `⚠ Return Rejected`,
          message: action === 'Approved' ? `Your hardware return was approved. The device has been securely detached from your profile.` : `Return denied: ${remarks}`,
          is_read: false,
          type: action === 'Approved' ? 'success' : 'error'
        }]);
      }

      fetchReturns(); // Reload UI
      alert(`Return request successfully ${action.toLowerCase()}.`);
    } catch (err: any) {
      alert(`Error processing return: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredList = returnRequests.filter(item => {
    const query = searchQuery.toLowerCase();
    const assetName = (item.assets?.name || item.assets?.asset_name || '').toLowerCase();
    const assetTag = (item.assets?.asset_tag || '').toLowerCase();
    const userName = (item.user_name || item.user_email || '').toLowerCase();
    return assetName.includes(query) || assetTag.includes(query) || userName.includes(query);
  });

  const pendingCount = returnRequests.filter(r => (r.status || '').toLowerCase().includes('pending')).length;

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
                  <LogOut className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Hardware Returns</span>
                </h1>
                {pendingCount > 0 && (
                  <span className="px-3 py-1 bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full shadow-[0_4px_15px_rgba(249,115,22,0.4)] animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Process employee offboarding and hardware recovery requests</p>
            </div>
          </div>

          <button 
            onClick={fetchReturns} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 ${theme.glassItem} text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : 'text-purple-500 dark:text-purple-400'} />
            <span>Sync Returns</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className={`p-2.5 rounded-2xl transition-all shadow-sm flex items-center focus-within:ring-4 focus-within:ring-orange-500/20 ${theme.inputBg}`}>
          <div className="relative w-full">
            <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search returns by employee name, asset tag, or S/N..." 
              className={`w-full pl-12 pr-4 py-1.5 text-sm font-semibold outline-none bg-transparent ${isDarkMode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'}`}
            />
          </div>
        </div>

        {/* RETURNS FEED */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Return Logs...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.glassCard}`}>
            <LogOut size={48} className={`mx-auto opacity-60 ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Return Requests</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The hardware tracking timeline is clear.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((item) => {
              const isPending = (item.status || '').toLowerCase().includes('pending');
              const asset = item.assets || {};

              return (
                <div key={item.id} className={`p-6 md:p-8 rounded-3xl flex flex-col xl:flex-row gap-8 ${theme.glassItem} transition-all hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 dark:hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] ${isPending ? isDarkMode ? 'border-orange-500! ring-4 ring-orange-500/20 bg-orange-500/10!' : 'border-orange-400! ring-4 ring-orange-400/20 bg-orange-50/50!' : ''}`}>
                  
                  <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-8 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-sm ${theme.glassInner} ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`}><User size={20} /></div>
                      <div className="overflow-hidden">
                        <h3 className={`text-lg font-bold leading-tight truncate ${theme.textMain}`}>{item.user_name || item.user_email || 'Staff Member'}</h3>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border mt-1 inline-block ${isDarkMode ? 'bg-black/50 text-zinc-300 border-white/20' : 'bg-white/60 text-slate-700 border-white/80'}`}>
                          ID: {item.user_id ? String(item.user_id).substring(0,6).toUpperCase() : 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl space-y-3 ${theme.glassInner}`}>
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${theme.textMain}`}>
                        <Laptop size={14} className="text-orange-500 shrink-0" />
                        <span className="truncate text-left font-bold">{asset.name || asset.asset_name || 'Hardware Asset'}</span>
                      </div>
                      <div className={`flex justify-between items-center text-[11px] border-t pt-2.5 mt-2.5 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>S/N:</span>
                        <span className={`font-mono font-bold ${theme.textMain}`}>{asset.serial_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>TAG:</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{asset.asset_tag || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[12px]">
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <Clock size={14} className={isDarkMode ? "text-purple-400" : "text-purple-600"} /> 
                        <span className="text-[10px] font-bold uppercase tracking-widest">Submitted Date</span>
                      </div>
                      <span className={`font-bold ${theme.textMain}`}>{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Return Request Details</h4>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 shadow-sm cursor-default ${
                        isPending 
                          ? isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse' : 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse' 
                          : item.status.includes('Approved') 
                            ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Employee Reason for Return</span>
                      <div className={`p-4 rounded-2xl text-xs font-semibold italic leading-relaxed ${theme.glassInner}`}>
                        "{item.notes ? item.notes.replace('[RETURN REQUEST]', '').trim() : 'No reason provided.'}"
                      </div>
                    </div>

                    {item.admin_remarks && (
                      <div className={`p-4 rounded-2xl text-xs font-semibold ${theme.glassInner}`}>
                        <span className={`font-bold uppercase text-[9px] tracking-wider block mb-1.5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Admin Remarks:</span>
                        <p className={theme.textMain}>"{item.admin_remarks}"</p>
                      </div>
                    )}

                    {isPending && (
                      <div className={`pt-4 border-t mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3 ${isDarkMode ? 'border-white/10' : 'border-white/50'}`}>
                        <button disabled={updatingId === item.id} onClick={() => processReturn(item.id, asset.id, 'Approved', item.user_id)} className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(16,185,129,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          <CheckCircle2 size={16} /> Approve & Move to Stock
                        </button>
                        <button disabled={updatingId === item.id} onClick={() => processReturn(item.id, asset.id, 'Rejected', item.user_id)} className="flex items-center justify-center gap-2 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(244,63,94,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                          <XCircle size={16} /> Reject Return
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

export default function AdminReturnsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-transparent dark:bg-[#0a0a0a]" />}><AdminReturnsContent /></Suspense>;
}