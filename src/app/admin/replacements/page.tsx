'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, Clock, 
  Laptop, User, Search, XCircle, AlertCircle, Wrench, X, Image as ImageIcon, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AdminReplacementsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    
    fetchReplacements(true);

    // 🌟 REALTIME SYNC (Targeting the replacements table)
    const realtimeChannel = supabase
      .channel('admin_replacements_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacements' }, () => fetchReplacements(false))
      .subscribe();

    return () => { 
      observer.disconnect();
      supabase.removeChannel(realtimeChannel); 
    };
  }, []);

  const fetchReplacements = async (showSpin = true) => {
    if (showSpin) setLoading(true);
    else setIsRefreshing(true);

    try {
      // Fetch directly from the dedicated replacements table
      const { data: replData, error } = await supabase
        .from('replacements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReplacementRequests(replData || []);
    } catch (err: any) {
      alert("Failed to fetch replacements: " + err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const processReplacement = async (item: any, action: 'In Progress' | 'Resolved' | 'Rejected') => {
    let remarks = prompt(`Provide status update remarks for ${action}:`);
    if (remarks === null) return; 

    setUpdatingId(item.id);
    try {
      // 1. Update the replacement record
      await supabase.from('replacements').update({ 
        status: action, 
        admin_remarks: remarks 
      }).eq('id', item.id);

      // 2. If Resolved or Rejected, update the original asset to remove the "Replacement Requested" block
      if (action === 'Resolved' || action === 'Rejected') {
        await supabase.from('assets').update({
          status: 'Assigned',
          admin_remarks: `Replacement Request ${action}: ${remarks}`
        }).eq('id', item.old_asset_id);

        // 3. Send Notification back to the staff member
        await supabase.from('notifications').insert({
          target_user: item.user_id || item.user_email,
          title: action === 'Resolved' ? '✅ Replacement Approved' : '❌ Replacement Denied',
          message: `Your replacement request for ${item.asset_tag} was marked as ${action}. Notes: ${remarks}`,
          type: action === 'Resolved' ? 'success' : 'error',
          is_read: false
        });
      }

      fetchReplacements(false);
    } catch (err: any) {
      alert(`Error updating replacement: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredList = replacementRequests.filter(item => {
    const query = searchQuery.toLowerCase();
    const tag = (item.asset_tag || '').toLowerCase();
    const staff = (item.staff_name || item.user_email || '').toLowerCase();
    return tag.includes(query) || staff.includes(query);
  });

  const pendingCount = replacementRequests.filter(r => (r.status || '').toLowerCase().includes('pending')).length;

  // 🎨 PURE MAC OS 2026 FROSTED GLASS THEME (Matched exactly to admin dashboard)
  const theme = {
    bg: 'bg-transparent',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    
    glassCard: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/20 backdrop-blur-3xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]',
    
    glassInnerCard: isDarkMode 
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    
    glassItem: isDarkMode
      ? 'bg-white/5 backdrop-blur-2xl border border-white/10 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
      : 'bg-white/30 backdrop-blur-2xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300',
    
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/20 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 placeholder-zinc-500' 
      : 'bg-white/30 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] text-slate-800 focus:bg-white/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder-slate-500',
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-x-hidden font-sans antialiased pb-12 transition-colors duration-1000`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 mx-auto space-y-5 sm:space-y-6 pt-4 relative z-10">
        
        {/* BRAND HEADER */}
        <div className={`${theme.glassCard} rounded-[1.5rem] p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 sm:p-3 ${theme.glassItem} rounded-2xl ${theme.textSub} transition-all cursor-pointer hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-lg sm:text-xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <RefreshCw className="text-orange-500 w-5 h-5 shrink-0" />
                  <span>Asset Replacements</span>
                </h1>
                {pendingCount > 0 && (
                  <span className="px-3 py-1 bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-full shadow-[0_4px_15px_rgba(249,115,22,0.4)] animate-pulse">
                    {pendingCount} Queued
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-medium ${theme.textSub}`}>Process hardware swap requests and verify broken equipment</p>
            </div>
          </div>

          <button 
            onClick={() => fetchReplacements(false)} 
            disabled={loading || isRefreshing}
            className={`flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 ${theme.glassItem} ${theme.textMain} rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}
          >
            <RefreshCw size={14} className={loading || isRefreshing ? 'animate-spin text-orange-500' : 'text-purple-500'} />
            <span>Sync Swaps</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className={`p-2 rounded-2xl transition-all shadow-sm flex items-center focus-within:ring-4 focus-within:ring-orange-500/20 ${theme.inputBg}`}>
          <div className="relative w-full flex items-center">
            <Search size={18} className={`absolute left-4 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="Search replacement requests by tag or staff name..." 
              className={`w-full pl-12 pr-4 py-2.5 text-[13px] font-semibold outline-none bg-transparent ${isDarkMode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'}`} 
            />
          </div>
        </div>

        {/* REPLACEMENTS FEED */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            <span className={`text-[11px] font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Swap Logs...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-24 rounded-[2rem] border text-center space-y-3 shadow-sm ${theme.glassCard}`}>
            <RefreshCw size={48} className={`mx-auto opacity-60 ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <h3 className={`text-[15px] font-bold uppercase tracking-widest ${theme.textMain}`}>No Replacement Requests</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The hardware replacement timeline is clear.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((item) => {
              const status = (item.status || '').toLowerCase().trim();
              const isPending = status.includes('pending');
              const isResolved = status === 'approved' || status === 'replaced' || status === 'resolved' || status === 'closed';
              const isRejected = status === 'rejected' || status === 'declined';

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id} 
                  className={`${theme.glassCard} rounded-[2rem] p-5 sm:p-7 relative overflow-hidden flex flex-col`}
                >
                  <div className={`absolute top-0 right-0 w-48 h-48 blur-[60px] -z-10 rounded-full opacity-10 transition-opacity duration-500 pointer-events-none ${isResolved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'}`} />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 ${theme.glassInnerCard} ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        <User size={20} strokeWidth={2.5} />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className={`text-[16px] font-bold leading-tight truncate ${theme.textMain}`}>{item.staff_name || item.user_email || 'Staff Member'}</h3>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md shadow-sm border mt-1 inline-block uppercase tracking-widest ${theme.glassInnerCard} ${theme.textSub}`}>
                          EMP: {item.emp_code || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 ${theme.glassInnerCard} ${theme.textSub}`}>
                        <Clock size={14} /> {new Date(item.created_at).toLocaleDateString('en-GB')}
                      </span>
                      <span className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border shrink-0 ${
                        isResolved ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#e0faee]/80 backdrop-blur-md text-[#0f824d] border-[#b0ebd1]') : 
                        isRejected ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-[#ffe4e6]/80 backdrop-blur-md text-[#e11d48] border-[#fecdd3]') : 
                        (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-[#fff5eb]/80 backdrop-blur-md text-[#c96c14] border-[#ffe0c2]')
                      }`}>
                        {item.status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    
                    {/* LEFT: FAULTY ASSET DETAILS */}
                    <div className={`flex-1 rounded-3xl p-5 relative overflow-hidden ${theme.glassInnerCard}`}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#fb7185]"></div>
                      <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-[#e11d48]'}`}>
                        <AlertCircle size={16}/> Reported Faulty Hardware
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-4 rounded-[1rem] ${theme.glassItem}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>Tag ID</span>
                            <span className={`text-[13px] font-bold ${theme.textMain} wrap-break-word`}>{item.asset_tag}</span>
                          </div>
                          <div className={`p-4 rounded-[1rem] ${theme.glassItem}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>Serial (S/N)</span>
                            <span className={`text-[13px] font-mono font-bold ${theme.textMain} wrap-break-word`}>{item.serial_number || 'N/A'}</span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-[1rem] ${theme.glassItem}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>Stated Condition</span>
                            <span className={`text-[13px] font-bold ${theme.textMain} wrap-break-word`}>{item.condition || 'Not specified'}</span>
                        </div>
                        <div className={`p-4 rounded-[1rem] flex flex-col gap-1.5 ${theme.glassItem}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>Reason / Description</span>
                          <p className={`text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${theme.textMain}`}>{item.reason || 'No description provided.'}</p>
                        </div>

                        {/* PHOTO EVIDENCE */}
                        {item.photos && item.photos.length > 0 && (
                          <div className={`p-4 rounded-[1rem] flex flex-col gap-2 ${theme.glassItem}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme.textSub}`}><ImageIcon size={14}/> Photo Evidence Provided</span>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                              {item.photos.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:scale-105 transition-transform border border-white/20 rounded-xl overflow-hidden shadow-sm block">
                                  <img src={url} alt={`Evidence ${i}`} className="h-20 w-20 object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`hidden lg:flex flex-col justify-center items-center px-1 ${theme.textSub}`}>
                      <ArrowRight size={28} />
                    </div>

                    {/* RIGHT: ADMIN RESOLUTION ACTIONS */}
                    <div className={`flex-1 rounded-3xl p-5 relative overflow-hidden transition-all ${theme.glassInnerCard}`}>
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${isResolved ? 'bg-[#34d399]' : isRejected ? 'bg-[#fb7185]' : 'bg-[#fb923c]'}`}></div>
                      
                      <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${
                        isResolved ? (isDarkMode ? 'text-emerald-400' : 'text-[#059669]') : 
                        isRejected ? (isDarkMode ? 'text-rose-400' : 'text-[#e11d48]') : 
                        (isDarkMode ? 'text-amber-400' : 'text-[#ea580c]')
                      }`}>
                        {isResolved ? <CheckCircle2 size={16}/> : isRejected ? <XCircle size={16}/> : <RefreshCw size={16} className="animate-spin"/>} 
                        {isResolved ? 'Admin Resolution Completed' : isRejected ? 'Request Denied' : 'Pending IT Logistics Approval'}
                      </h4>
                      
                      {(isResolved || isRejected || item.admin_remarks) ? (
                        <div className="space-y-3 h-full">
                          <div className={`p-5 rounded-[1.25rem] h-full flex flex-col ${theme.glassItem}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${
                              isResolved ? (isDarkMode ? 'text-emerald-500' : 'text-[#059669]') : 
                              isRejected ? (isDarkMode ? 'text-rose-500' : 'text-[#e11d48]') : theme.textSub
                            }`}>
                              Official IT Admin Remarks:
                            </span>
                            <p className={`text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${theme.textMain}`}>
                              {item.admin_remarks || (isResolved ? 'Request approved. Processed replacement.' : 'Request rejected.')}
                            </p>
                            
                            {isResolved && (
                              <div className={`mt-auto pt-4 border-t flex items-start gap-3 ${isDarkMode ? 'border-emerald-900/50' : 'border-[#b0ebd1]/40'}`}>
                                <div className={`p-2 rounded-lg shrink-0 ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#e0faee]/80 text-[#0f824d]'}`}>
                                  <Laptop size={16} />
                                </div>
                                <p className={`text-xs font-semibold leading-snug ${theme.textSub}`}>
                                  Staff dashboard has been updated. If swapping, ensure the old device is recovered.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className={`p-4 rounded-full mb-3 ${theme.glassItem}`}>
                              <Wrench size={24} className={theme.textSub}/>
                            </div>
                            <p className={`text-[12px] font-medium max-w-[200px] leading-relaxed ${theme.textSub}`}>
                              Review the provided evidence and determine if a hardware replacement is warranted.
                            </p>
                          </div>

                          <div className={`pt-4 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                            <button 
                              disabled={updatingId === item.id} 
                              onClick={() => processReplacement(item, 'In Progress')} 
                              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 border ${isDarkMode ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/40' : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'}`}
                            >
                              <Clock size={14} /> Mark In-Progress
                            </button>
                            <button 
                              disabled={updatingId === item.id} 
                              onClick={() => processReplacement(item, 'Resolved')} 
                              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 border ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'}`}
                            >
                              <CheckCircle2 size={14} /> Approve & Resolve
                            </button>
                            <button 
                              disabled={updatingId === item.id} 
                              onClick={() => processReplacement(item, 'Rejected')} 
                              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 border sm:col-span-2 ${isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'}`}
                            >
                              <XCircle size={14} /> Reject Request
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
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