'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, 
  Laptop, User, Search, X, ShieldAlert, AlertTriangle
} from 'lucide-react';

function AdminReplacementsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [replacementRequests, setReplacementRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    fetchReplacements();
  }, []);

  const fetchReplacements = async () => {
    setLoading(true);
    try {
      // 🌟 STRICT FILTER: Only fetch tickets classified as Replacement!
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

  const processReplacement = async (ticketId: string, action: 'In Progress' | 'Resolved' | 'Closed', email: string) => {
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

  const theme = {
    bg: 'bg-[#FFF9F2]',
    glassCard: 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.8)]',
    glassItem: 'bg-white/50 border border-white/60 shadow-sm hover:shadow-md backdrop-blur-2xl transition-all duration-300',
    glassInner: 'bg-white/70 border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)] backdrop-blur-md',
    textMain: 'text-slate-900',
    textSub: 'text-slate-600',
  };

  return (
    <div className={`min-h-screen ${theme.bg} font-sans antialiased pb-12 relative z-0 overflow-hidden`}>
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-400 px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4 relative z-10">
        <div className={`${theme.glassCard} rounded-4xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button onClick={() => router.push('/admin')} className={`p-2.5 sm:p-3 bg-white/60 backdrop-blur-md border border-white/80 hover:bg-white shadow-sm rounded-2xl text-slate-600 transition-all cursor-pointer`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <RefreshCw className="text-purple-600 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Asset Replacements</span>
                </h1>
                {pendingCount > 0 && (
                  <span className="px-3 py-1 bg-purple-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-sm">
                    {pendingCount} Queued
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Process hardware swap requests and broken equipment exchanges</p>
            </div>
          </div>
          <button onClick={fetchReplacements} disabled={loading} className={`flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 bg-white/60 backdrop-blur-md border border-white/80 text-slate-700 hover:bg-white shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0`}>
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-600' : 'text-purple-600'} />
            <span>Sync Swaps</span>
          </button>
        </div>

        <div className={`p-2.5 rounded-2xl transition-all shadow-sm flex items-center focus-within:ring-4 focus-within:ring-purple-500/10 ${theme.glassInner}`}>
          <div className="relative w-full">
            <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400`} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search replacement requests by name or title..." className="w-full pl-12 pr-4 py-1.5 text-sm font-semibold outline-none bg-transparent placeholder:text-slate-400" />
          </div>
        </div>

        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.glassCard}`}>
            <RefreshCw size={48} className="mx-auto text-purple-600 opacity-60" />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Replacement Requests</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((item) => {
              const isPending = (item.status || '').toLowerCase() === 'pending';

              return (
                <div key={item.id} className={`p-6 md:p-8 rounded-3xl transition-all flex flex-col xl:flex-row gap-8 duration-300 ${theme.glassItem} ${isPending ? 'ring-2 ring-purple-400/50' : ''}`}>
                  
                  <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-8 border-white/50`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-sm bg-white/80 border border-white text-purple-600`}><User size={20} /></div>
                      <div className="overflow-hidden">
                        <h3 className={`text-lg font-bold leading-tight truncate ${theme.textMain}`}>{item.staff_name || item.created_by || 'Staff Member'}</h3>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-sm border bg-white/60 text-slate-700 border-white/80 mt-1 inline-block">EMP: {item.emp_code || 'UNKNOWN'}</span>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl space-y-3 ${theme.glassInner}`}>
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${theme.textMain}`}>
                        <Laptop size={14} className="text-purple-600 shrink-0" />
                        <span className="truncate text-left font-bold">{item.title}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[12px]">
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <Clock size={14} className="text-purple-600" /> 
                        <span className="text-[10px] font-bold uppercase tracking-widest">Submitted Date</span>
                      </div>
                      <span className={`font-bold ${theme.textMain}`}>{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Replacement Reason</h4>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 shadow-sm ${
                        isPending ? 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse' :
                        item.status.includes('Progress') ? 'bg-purple-50 border-purple-200 text-purple-600' :
                        'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className={`p-4 rounded-2xl text-xs font-semibold italic leading-relaxed whitespace-pre-wrap ${theme.glassInner}`}>
                        {item.description}
                      </div>
                    </div>

                    {item.admin_remarks && (
                      <div className={`p-4 rounded-2xl text-xs font-semibold ${theme.glassInner}`}>
                        <span className={`font-bold uppercase text-[9px] tracking-wider block mb-1.5 text-purple-700`}>Admin Update:</span>
                        <p className={theme.textMain}>"{item.admin_remarks}"</p>
                      </div>
                    )}

                    {!item.status.includes('Closed') && !item.status.includes('Resolved') && (
                      <div className={`pt-4 border-t mt-auto border-white/50 grid grid-cols-1 sm:grid-cols-2 gap-3`}>
                        {isPending && (
                          <button disabled={updatingId === item.id} onClick={() => processReplacement(item.id, 'In Progress', item.created_by)} className="flex items-center justify-center gap-2 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(168,85,247,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                            <Clock size={16} /> Mark In-Progress
                          </button>
                        )}
                        <button disabled={updatingId === item.id} onClick={() => processReplacement(item.id, 'Resolved', item.created_by)} className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(5,150,105,0.3)] cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
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
  return <Suspense fallback={<div className="min-h-screen bg-[#FFF9F2]" />}><AdminReplacementsContent /></Suspense>;
}