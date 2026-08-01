'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, Loader2, History, PackageOpen, CheckCircle2, AlertCircle, ArrowRight, Laptop, Wrench, ArrowLeft, Clock, X } from 'lucide-react';

export default function ReplacementsHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const activeSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    const isGuest = localStorage.getItem('isGuestSession') === 'true';

    if (!activeSession && !isGuest) {
      window.location.replace('/');
      return;
    }
    
    fetchReplacements();

    // 🌟 REAL-TIME SYNC FOR ADMIN COMMENTS & STATUS CHANGES
    const realtimeChannel = supabase
      .channel('staff_replacements_sync')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'tickets', filter: `category=eq.Asset Replacement` }, 
        () => {
          fetchReplacements(false); // Silently sync without full loading screen
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(realtimeChannel); };
  }, []);

  const fetchReplacements = async (showLoadingScreen = true) => {
    if (showLoadingScreen) setLoading(true);
    else setIsRefreshing(true);

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setReplacements([
          { 
            id: 'demo-replace-1', 
            title: 'Replacement Request: Dell Monitor', 
            status: 'Replaced', 
            description: 'Tag ID: VSS-MON-102 | S/N: DELL-9982-X\n\nReason: Dead pixels covering the left side of the screen.', 
            admin_remarks: 'Verified hardware fault. Replaced with new LG 27" 4K Monitor. New S/N: LG-4K-554433. Check your dashboard to sign the new agreement.',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: 'demo-replace-2', 
            title: 'Replacement Request: Magic Mouse', 
            status: 'Pending', 
            description: 'Tag ID: VSS-MOU-88 | S/N: MAC-MOU-001\n\nReason: Scroll wheel is completely jammed and laser drops connection.', 
            admin_remarks: null,
            created_at: new Date().toISOString() 
          }
        ]);
        setIsAuthorized(true);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user') || '';
      let email = '';
      try { email = JSON.parse(sessionStr).email; } catch (e) { email = sessionStr; }

      const cleanEmail = email.toLowerCase().trim();
      
      // Fetch tickets specifically categorized as "Asset Replacement"
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
      setIsRefreshing(false);
    }
  };

  // 🌟 PARSER: Extracts the old hardware details from the automated ticket description
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 animate-in fade-in duration-500 w-full min-h-screen pb-32 select-none relative font-sans" onContextMenu={(e) => e.preventDefault()}>
      
      {/* 🌟 ADVANCED HEADER WITH PREMIUM GLASS THEME */}
      <div className="relative bg-white/50 backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row justify-between sm:items-center gap-6 overflow-hidden">
        
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
              Track your faulty hardware reports and review Admin replacement notes.
            </p>
          </div>
        </div>

        <button 
          onClick={() => fetchReplacements(false)} 
          disabled={loading || isRefreshing}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 shrink-0 border border-white/20 disabled:opacity-50 z-10"
        >
          <RefreshCw size={16} className={(loading || isRefreshing) ? 'animate-spin' : ''} /> 
          <span>Sync Database</span>
        </button>
      </div>

      {/* 🌟 GLASS CONTENT CONTAINER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/20 backdrop-blur-2xl rounded-[2.5rem] border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Fetching replacement records...</p>
        </div>
      ) : replacements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-white/20 backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-center">
          <PackageOpen size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Replacements Requested</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">Your hardware replacement history will appear here once requested from the Asset Dashboard.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {replacements.map(record => {
            const details = parseFaultyDetails(record.description || '');
            const status = (record.status || '').toLowerCase().trim();
            const adminNote = record.admin_remarks || record.admin_notes || record.resolution_notes || null;
            
            const isResolved = status === 'approved' || status === 'replaced' || status === 'resolved' || status === 'closed';
            const isRejected = status === 'rejected' || status === 'declined';
            const isPending = !isResolved && !isRejected;
            
            return (
              <div key={record.id} className="group bg-white/30 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-purple-300/80 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden flex flex-col">
                
                {/* Glowing Ambient Status Blob */}
                <div className={`absolute top-0 right-0 w-48 h-48 blur-[60px] -z-10 rounded-full opacity-10 transition-opacity duration-500 group-hover:opacity-20 pointer-events-none ${isResolved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'}`} />

                {/* Card Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-purple-100 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
                      <Wrench size={18} />
                    </div>
                    <span className="line-clamp-1">{record.title}</span>
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/80 shadow-sm shrink-0 flex items-center gap-1.5">
                      <Clock size={12} /> {new Date(record.created_at).toLocaleDateString('en-GB')}
                    </span>
                    <span className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shrink-0 backdrop-blur-md shadow-sm ${
                      isResolved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {record.status || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* SPLIT CONTENT: Faulty vs New Asset */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                  
                  {/* LEFT: FAULTY ASSET (Red Tinted Glass) */}
                  <div className="flex-1 bg-white/40 backdrop-blur-md border border-rose-200/50 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-400"></div>
                    <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-rose-600 mb-5 flex items-center gap-2">
                      <AlertCircle size={16}/> Original Faulty Hardware
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white/60 rounded-2xl border border-rose-100 shadow-sm">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Tag ID</span>
                          <span className="text-xs font-bold text-slate-900 wrap-break-word">{details.tag}</span>
                        </div>
                        <div className="p-4 bg-white/60 rounded-2xl border border-rose-100 shadow-sm">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Serial (S/N)</span>
                          <span className="text-xs font-mono font-bold text-slate-900 wrap-break-word">{details.sn}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-white/60 rounded-2xl border border-rose-100 shadow-sm flex flex-col gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reason for Request</span>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 wrap-break-word leading-relaxed">{details.reason}</p>
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE: ARROW (Hidden on mobile) */}
                  <div className="hidden lg:flex flex-col justify-center items-center px-2 text-slate-300 group-hover:text-purple-400 transition-colors">
                    <ArrowRight size={28} />
                  </div>

                  {/* RIGHT: ADMIN RESOLUTION & NEW ASSET */}
                  <div className={`flex-1 rounded-3xl p-5 sm:p-6 relative overflow-hidden transition-all shadow-sm border backdrop-blur-md ${
                    isResolved ? 'bg-emerald-50/50 border-emerald-200/50' : 
                    isRejected ? 'bg-rose-50/50 border-rose-200/50' : 
                    'bg-white/40 border-slate-200/50'
                  }`}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${isResolved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-amber-400'}`}></div>
                    
                    <h4 className={`text-[10px] sm:text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2 ${
                      isResolved ? 'text-emerald-700' : isRejected ? 'text-rose-700' : 'text-slate-500'
                    }`}>
                      {isResolved ? <CheckCircle2 size={16}/> : isRejected ? <X size={16}/> : <RefreshCw size={16} className="animate-spin text-amber-500"/>} 
                      {isResolved ? 'Admin Resolution & New Asset' : isRejected ? 'Request Denied' : 'Pending IT Logistics Approval'}
                    </h4>
                    
                    {(isResolved || isRejected || adminNote) ? (
                      <div className="space-y-3 h-full">
                        <div className={`p-5 bg-white/80 rounded-2xl border shadow-sm h-full ${
                          isResolved ? 'border-emerald-100' : isRejected ? 'border-rose-100' : 'border-slate-100'
                        }`}>
                          <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${
                            isResolved ? 'text-emerald-600' : isRejected ? 'text-rose-600' : 'text-slate-400'
                          }`}>
                            Official IT Admin Remarks:
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 wrap-break-word leading-relaxed whitespace-pre-wrap">
                            {adminNote || (isResolved ? 'Request approved. New asset details should be available in your dashboard.' : 'Request rejected. No additional notes provided.')}
                          </p>
                          
                          {/* Instructions if resolved */}
                          {isResolved && (
                            <div className="mt-4 pt-4 border-t border-emerald-100 flex items-start gap-3">
                              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                                <Laptop size={16} />
                              </div>
                              <p className="text-xs font-bold text-slate-600 leading-snug">
                                Your new hardware has been linked to your profile. Please navigate back to the <strong className="text-emerald-700">Assets Dashboard</strong> to sign the digital handover agreement for the new device.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full min-h-37.5 flex flex-col items-center justify-center text-center">
                        <div className="p-4 bg-white rounded-full border border-slate-100 mb-3 shadow-sm">
                          <PackageOpen size={24} className="text-slate-300"/>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-62.5 leading-relaxed">
                          IT Admin is currently reviewing your request to process a hardware replacement.
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