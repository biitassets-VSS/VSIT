'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle, Loader2, Package, ShieldCheck } from 'lucide-react';

export default function StaffRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) return;
    
    let email = sessionStr;
    try { email = JSON.parse(sessionStr).email; } catch(e) {}

    // Fetch tickets that specifically contain "Request" in the title
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .ilike('created_by', email?.toLowerCase().trim())
      .ilike('title', '%Asset Request%')
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const sub = supabase.channel('staff_reqs_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    if (s === 'approved' || s === 'allocated') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    if (s === 'rejected') return 'bg-rose-500/10 text-rose-700 border-rose-500/30';
    return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
  };

  if (loading) return (
    <div className="flex min-h-[70vh] items-center justify-center flex-col gap-3">
      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Syncing Requests...</p>
    </div>
  );

  return (
    /* 🌟 SCROLL FIX & SPACING: Added max-w-7xl, mx-auto, and padding to detach from sidebar */
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 animate-in fade-in duration-500 w-full min-h-screen pb-32 select-none relative" onContextMenu={(e) => e.preventDefault()}>
      
      {/* 🌟 ADVANCED HEADER WITH PREMIUM GLASS THEME */}
      <div className="relative bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        {/* Subtle background glow blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="text-purple-600" /> Asset Requests
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-xl">
            Track the status of your requested equipment and gear.
          </p>
        </div>
        
        <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 border border-white/20">
          <PlusCircle size={18} /> New Request
        </button>
      </div>

      {/* 🌟 PREMIUM GLASS REQUESTS CONTAINER */}
      <div className="bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden min-h-[50vh]">
        
        {/* Container Header */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="text-slate-800" />
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-widest uppercase">Request History</h2>
          </div>
          <span className="text-xs sm:text-sm font-black text-slate-500">{requests.length} Records</span>
        </div>

        {requests.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-200/50 rounded-4xl bg-white/30 backdrop-blur-md flex flex-col items-center">
            <Package size={48} className="text-slate-300 mb-4" />
            <h3 className="text-base font-bold text-slate-700">No Asset Requests</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">You have no pending or historical asset requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {requests.map(req => {
              const statusStr = (req.status || '').toLowerCase();
              const isPending = statusStr === 'pending';
              const isRejected = statusStr === 'rejected';

              return (
                <div key={req.id} className="group bg-white/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/60 shadow-[0_8px_25px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] relative overflow-hidden flex flex-col">
                  
                  {/* Subtle Background Glow per Card Status */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${isRejected ? 'bg-rose-400' : isPending ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                  {/* Card Header & Status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-600 flex items-center justify-center shadow-xs shrink-0">
                        <Package size={16} />
                      </div>
                      <span className="line-clamp-1">{req.title}</span>
                    </h3>
                    
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shrink-0 backdrop-blur-md shadow-sm ${getBadge(req.status)}`}>
                      {req.status || 'Pending'}
                    </span>
                  </div>

                  {/* Request Details */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="bg-white/30 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-inner flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Reason for Request:</p>
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed wrap-break-word">{req.description || req.note || 'No description provided.'}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/50 flex justify-between items-center mt-auto">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request ID</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-white/50 px-2 py-1 rounded-md border border-white/60">
                        {req.id.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested On</span>
                      <span className="text-xs font-bold text-slate-800">
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