'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, Loader2, History, PackageOpen, CheckCircle2, AlertCircle, ArrowRight, Laptop, Wrench, ArrowLeft } from 'lucide-react';

export default function ReplacementsHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const activeSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    const isGuest = localStorage.getItem('isGuestSession') === 'true';

    if (!activeSession && !isGuest) {
      window.location.replace('/');
      return;
    }
    
    fetchReplacements();
  }, []);

  const fetchReplacements = async () => {
    setLoading(true);
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setReplacements([
          { 
            id: '1', 
            title: 'Replacement Request: Demo Keyboard', 
            status: 'Replaced', 
            description: 'Tag ID: KBD-112 | S/N: FAULTY-9982\n\nReason: Keys sticking and unresponsive.', 
            admin_notes: 'Replaced with new Logitech Keyboard. New S/N: NEW-LOGI-5544',
            created_at: new Date().toISOString() 
          }
        ]);
        setIsAuthorized(true);
        setLoading(false);
        return;
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user') || '';
      let email = '';
      try { email = JSON.parse(sessionStr).email; } catch (e) { email = sessionStr; }

      const cleanEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .ilike('created_by', cleanEmail)
        .eq('category', 'Asset Replacement')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReplacements(data || []);
      setIsAuthorized(true);

    } catch (err) {
      console.error("Error fetching replacements:", err);
    } finally {
      setLoading(false);
    }
  };

  const parseFaultyDetails = (desc: string) => {
    const tagMatch = desc.match(/Tag ID:\s*([^\s|]+)/i);
    const snMatch = desc.match(/S\/N:\s*([^\n]+)/i);
    const reasonMatch = desc.match(/Reason:\s*([\s\S]+)/i);
    
    return {
      tag: tagMatch ? tagMatch[1].trim() : 'Unknown',
      sn: snMatch ? snMatch[1].trim() : 'Unknown',
      reason: reasonMatch ? reasonMatch[1].trim() : 'No reason provided'
    };
  };

  if (!isAuthorized && !loading) return null;

  return (
    /* 🌟 SCROLL FIX & SPACING: Detached from sidebar, fully transparent layout */
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 animate-in fade-in duration-500 w-full min-h-screen pb-32 select-none relative" onContextMenu={(e) => e.preventDefault()}>
      
      {/* 🌟 ADVANCED HEADER WITH PREMIUM GLASS THEME */}
      <div className="relative bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row justify-between sm:items-center gap-6 overflow-hidden">
        
        {/* Subtle background glow blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
        
        <div className="flex items-center gap-4 sm:gap-5 z-10">
          <button onClick={() => router.push('/staff')} className="p-3 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md hover:bg-white text-slate-600 transition-all cursor-pointer shrink-0 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <History className="text-purple-600" /> Replacement Log
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-xl">
              Review your faulty asset reports and newly assigned hardware.
            </p>
          </div>
        </div>

        <button 
          onClick={fetchReplacements} 
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 border border-white/20 disabled:opacity-50 z-10"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
          <span>Sync Data</span>
        </button>
      </div>

      {/* 🌟 GLASS CONTENT CONTAINER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/20 backdrop-blur-2xl rounded-4xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Fetching records...</p>
        </div>
      ) : replacements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-white/20 backdrop-blur-2xl rounded-4xl border-2 border-dashed border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-center">
          <PackageOpen size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Replacements Found</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">Your hardware replacement history will appear here once requested.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {replacements.map(record => {
            const details = parseFaultyDetails(record.description || '');
            const status = (record.status || '').toLowerCase().trim();
            const isResolved = status === 'approved' || status === 'replaced' || status === 'resolved' || status === 'closed';
            
            return (
              <div key={record.id} className="group bg-white/20 backdrop-blur-2xl rounded-4xl p-6 sm:p-8 border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-purple-300/80 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden flex flex-col">
                
                {/* Glowing Ambient Status Blob */}
                <div className={`absolute top-0 right-0 w-48 h-48 blur-[60px] -z-10 rounded-full opacity-10 transition-opacity duration-500 group-hover:opacity-20 pointer-events-none ${isResolved ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                {/* Card Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shadow-sm shrink-0 border border-purple-200/50">
                      <Wrench size={18} />
                    </div>
                    <span className="line-clamp-1">{record.title}</span>
                  </h3>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/40 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/60 shadow-sm shrink-0">
                    {new Date(record.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')}
                  </span>
                </div>

                {/* SPLIT CONTENT: Faulty vs New Asset */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                  
                  {/* LEFT: FAULTY ASSET (Red Tinted Glass) */}
                  <div className="flex-1 bg-rose-500/5 backdrop-blur-sm border border-rose-500/20 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-400"></div>
                    <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-rose-600 mb-5 flex items-center gap-2">
                      <AlertCircle size={16}/> Faulty Asset Reported
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-rose-200/50 shadow-sm">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Serial No. (S/N)</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 wrap-break-word text-right max-w-[60%]">{details.sn}</span>
                      </div>
                      <div className="p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-rose-200/50 shadow-sm flex flex-col gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Issue / Error Note</span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 wrap-break-word leading-relaxed">{details.reason}</p>
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE: ARROW (Hidden on mobile) */}
                  <div className="hidden lg:flex flex-col justify-center items-center px-2 text-slate-300 group-hover:text-purple-400 transition-colors">
                    <ArrowRight size={28} />
                  </div>

                  {/* RIGHT: NEW REPLACEMENT ASSET (Green Tinted Glass) */}
                  <div className={`flex-1 rounded-3xl p-5 sm:p-6 relative overflow-hidden transition-all shadow-inner border backdrop-blur-sm ${isResolved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/30 border-white/50 border-dashed'}`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${isResolved ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                    
                    <h4 className={`text-[10px] sm:text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2 ${isResolved ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {isResolved ? <CheckCircle2 size={16}/> : <RefreshCw size={16} className="animate-spin text-amber-500"/>} 
                      {isResolved ? 'New Asset Assigned' : 'Pending Logistics Assignment'}
                    </h4>
                    
                    {isResolved ? (
                      <div className="space-y-3 h-full">
                        <div className="p-4 sm:p-5 bg-white/60 backdrop-blur-md rounded-2xl border border-emerald-200/50 shadow-sm flex items-start gap-4 h-full">
                          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 shrink-0 border border-emerald-500/20"><Laptop size={20}/></div>
                          <div className="flex-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600/80 block mb-1.5">Replacement Details</span>
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 wrap-break-word leading-relaxed">
                              {record.admin_notes || record.resolution || 'New asset has been assigned to your inventory. Check your dashboard.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full min-h-30 flex flex-col items-center justify-center py-4 text-center">
                        <div className="p-4 bg-white/50 backdrop-blur-md rounded-full border border-white/80 mb-4 shadow-sm">
                          <PackageOpen size={24} className="text-slate-400"/>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-62.5 leading-relaxed">
                          IT Admin is currently processing a new replacement for your faulty hardware.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}