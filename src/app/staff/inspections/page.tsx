'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  ClipboardCheck, Loader2, AlertTriangle, Eye, X, 
  CameraOff, CheckCircle2, RefreshCw, Calendar, 
  Clock, AlertOctagon, Search, ShieldCheck, Laptop, FileSignature, History
} from 'lucide-react';

// 🌟 DYNAMIC DUE DATE CALCULATOR
const calculateNextDueDate = (lastInspectionDate: string, category: string = 'Laptop') => {
  if (!lastInspectionDate) return 'N/A';
  const baseDate = new Date(lastInspectionDate);
  const isLaptop = (category || '').toLowerCase().includes('laptop');
  const monthsToAdd = isLaptop ? 1 : 3; 
  const targetYear = baseDate.getFullYear();
  const targetMonth = baseDate.getMonth() + monthsToAdd;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0);
  const lastSaturday = new Date(lastDayOfTargetMonth);
  while (lastSaturday.getDay() !== 6) { lastSaturday.setDate(lastSaturday.getDate() - 1); }
  return lastSaturday.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Pending';
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
};

export default function StaffInspectionsPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [inspections, setInspections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 🌟 SECURE LIGHTBOX STATE
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: string[]; title: string }>({
    isOpen: false, photos: [], title: ''
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  const fetchRealtimeData = async () => {
    setIsRefreshing(true);
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) {
      setIsRefreshing(false); setLoading(false); return;
    }
    
    let email = '';
    let sessionEmpCode = '';
    
    try { 
      const parsed = JSON.parse(sessionStr);
      if (parsed) { email = parsed.email || ''; sessionEmpCode = parsed.emp_id || parsed.emp_code || ''; }
    } catch(e) { email = sessionStr; }
    
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail) {
      setLoading(false); setIsRefreshing(false); return;
    }

    try {
      const { data: profile } = await supabase.from('profiles').select('id, emp_code').ilike('email', cleanEmail).maybeSingle();
      const currentUserId = profile?.id;
      const dbEmpCode = profile?.emp_code;
      const finalEmpCode = dbEmpCode || sessionEmpCode;

      const queryFilters = [`user_email.ilike.${cleanEmail}`];
      if (currentUserId) queryFilters.push(`inspected_by.eq.${currentUserId}`);
      if (finalEmpCode) queryFilters.push(`inspected_by.eq.${finalEmpCode}`);

      const { data: inspData, error: inspError } = await supabase
        .from('inspections')
        .select('*, assets(*)') 
        .or(queryFilters.join(','))
        .order('created_at', { ascending: false });

      if (inspError) throw inspError;
      if (inspData) setInspections(inspData);
      
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to sync inspections:", err);
    } finally {
      setLoading(false); setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealtimeData();
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    const subInsp = supabase.channel('staff_insp_page_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, fetchRealtimeData)
      .subscribe();
      
    return () => { 
      supabase.removeChannel(subInsp);
      window.removeEventListener('focus', handleFocus); window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved')) return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle2 size={14} />, label: 'Approved' };
    if (s.includes('reject') || s.includes('not approved') || s.includes('refuse')) return { bg: 'bg-rose-50 text-rose-600 border-rose-200', icon: <AlertOctagon size={14} />, label: 'Refused / Rejected' };
    if (s.includes('re-inspection')) return { bg: 'bg-amber-50 text-amber-600 border-amber-200', icon: <AlertTriangle size={14} />, label: 'Re-Audit Required' };
    return { bg: 'bg-purple-50 text-purple-600 border-purple-200', icon: <Clock size={14} />, label: 'Pending Review' };
  };

  const filteredInspections = inspections.filter(insp => {
    const searchString = `${insp.assets?.name} ${insp.assets?.asset_tag} ${insp.status}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  if (loading) return (
    <div className="flex min-h-[70vh] items-center justify-center flex-col gap-3">
      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Syncing Records...</p>
    </div>
  );

  return (
    /* 🌟 SCROLL & FREEZE FIX: Removed `h-full overflow-y-auto`. Let the parent layout scroll naturally! */
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-24 space-y-6 animate-in fade-in duration-500 w-full select-none relative" onContextMenu={(e) => e.preventDefault()}>
      
      {/* 🌟 ADVANCED HEADER WITH GLASS THEME */}
      <div className="relative bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="text-purple-600" /> Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 max-w-xl">
            Review the complete historical log of your device compliance and admin feedback.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 z-10 shrink-0">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Tag ID or Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl text-xs font-semibold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/10 transition-all shadow-inner placeholder:text-slate-400"
            />
          </div>
          <button 
            onClick={fetchRealtimeData} 
            disabled={isRefreshing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-600/20 disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 🌟 GLASS INSPECTIONS CONTAINER */}
      <div className="bg-white/50 backdrop-blur-2xl rounded-4xl p-5 sm:p-7 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative">
        
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-100 overflow-hidden z-10 rounded-t-4xl">
            <div className="w-1/3 h-full bg-linear-to-r from-orange-400 to-purple-500 animate-[pulse_1s_ease-in-out_infinite] translate-x-full" />
          </div>
        )}

        {/* Container Header */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2.5">
            <History size={20} className="text-slate-800" />
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-widest uppercase">Inspection History</h2>
          </div>
          <span className="text-xs sm:text-sm font-black text-slate-500">{filteredInspections.length} Records</span>
        </div>

        {filteredInspections.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200/50 rounded-3xl bg-white/30 backdrop-blur-md flex flex-col items-center">
            <ShieldCheck size={44} className="text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Inspection Records</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">There are no historical audit logs found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filteredInspections.map((insp, index) => {
              const asset = insp.assets || {};
              const statusConfig = getStatusConfig(insp.status);
              const isApproved = statusConfig.label === 'Approved';
              const isRejected = statusConfig.label === 'Refused / Rejected' || statusConfig.label === 'Re-Audit Required';
              
              const assignedDate = asset.assigned_date || asset.assignment_date || asset.created_at;
              const agreementDate = asset.handover_signed_date || asset.agreement_date || asset.handover_date;

              let safePhotos: string[] = [];
              try {
                if (Array.isArray(insp.photos)) safePhotos = insp.photos;
                else if (typeof insp.photos === 'string') {
                  const parsed = JSON.parse(insp.photos);
                  if (Array.isArray(parsed)) safePhotos = parsed;
                }
              } catch (e) {}

              return (
                <div 
                  key={`${insp.id}-${index}`} 
                  className="group bg-white/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-white/60 shadow-[0_8px_25px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] relative overflow-hidden flex flex-col"
                >
                  {/* Status Glow */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${isApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-purple-400'}`} />

                  {/* Header & Status Badge */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-600 flex items-center justify-center shadow-xs shrink-0">
                        <Laptop size={16} />
                      </div>
                      <span className="line-clamp-1">{asset.name || asset.asset_name || 'Hardware Device'}</span>
                    </h3>
                    
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 shrink-0 ${statusConfig.bg}`}>
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  </div>

                  {/* 🌟 OPTIMIZED COMPACT GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                    <div className="min-w-0">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Tag ID</span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 wrap-break-word block">{asset.asset_tag || 'N/A'}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Assigned</span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 wrap-break-word block">{formatDate(assignedDate)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Agreement</span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 wrap-break-word block">{formatDate(agreementDate)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Inspected</span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 wrap-break-word block">{formatDate(insp.created_at)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Next Due</span>
                      <span className={`font-bold text-xs sm:text-sm wrap-break-word block ${isApproved ? 'text-purple-700' : 'text-slate-500'}`}>
                        {isApproved ? calculateNextDueDate(insp.created_at, asset.category) : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Feedback Note */}
                  <div className={`p-3.5 rounded-xl border flex-1 backdrop-blur-xs shadow-inner mb-4 ${isRejected ? 'bg-rose-50/50 border-rose-200/50' : isApproved ? 'bg-emerald-50/50 border-emerald-200/50' : 'bg-slate-50/50 border-slate-200/50'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1 ${isRejected ? 'text-rose-600' : isApproved ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {isRejected ? <AlertOctagon size={12}/> : isApproved ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                      {isRejected ? 'Admin Rejection Reason' : isApproved ? 'Admin Approval Note' : 'Submitted Notes'}
                    </span>
                    <p className={`text-xs sm:text-sm font-semibold whitespace-pre-wrap wrap-break-word ${isRejected ? 'text-rose-900' : isApproved ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {insp.notes || 'No specific notes recorded for this transaction.'}
                    </p>
                  </div>

                  {/* Evidence Button */}
                  <div className="pt-3 border-t border-slate-200/50 shrink-0 mt-auto flex justify-end">
                    {safePhotos.length > 0 ? (
                      <button 
                        onClick={() => setPhotoViewer({ isOpen: true, photos: safePhotos, title: asset.name || 'Inspection' })}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-md shadow-slate-900/20 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                      >
                        <Eye size={15} /> View Encrypted Evidence ({safePhotos.length})
                      </button>
                    ) : (
                      <div className="px-5 py-2 rounded-xl border border-dashed border-slate-300 bg-white/50 text-slate-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 w-full sm:w-auto justify-center">
                        <CameraOff size={15} /> No Photos Attached
                      </div>
                    )}
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 SECURE LIGHTBOX (IMAGE SIZE & OVERFLOW FIX) */}
      {photoViewer.isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-4 select-none"
          style={{ zIndex: 99999 }}
          onContextMenu={(e) => e.preventDefault()} 
        >
          <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-300 relative ${!isWindowFocused ? 'blur-3xl opacity-0 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
            <button 
              onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })} 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer z-50 border border-white/20 shadow-2xl"
            >
              <X size={22}/>
            </button>
            
            {!isWindowFocused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-slate-950">
                <CameraOff size={60} className="text-orange-500 mb-3 animate-pulse"/>
                <h2 className="font-black text-xl tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-purple-500">Capture Blocked</h2>
                <p className="text-slate-400 mt-2 text-xs font-medium">Please return focus to this window to view secure evidence.</p>
              </div>
            )}
            
            {/* Gallery Container - Constrained to 75% height max */}
            <div className="flex gap-4 overflow-x-auto w-full max-w-7xl h-[75vh] items-center px-4 snap-x custom-scrollbar">
              {photoViewer.photos.map((url, i) => (
                <div key={i} className="relative shrink-0 snap-center w-full max-w-3xl h-full flex items-center justify-center mx-auto">
                  <img 
                    src={url} 
                    alt="Secure Evidence" 
                    draggable={false} 
                    className="w-full h-full object-contain rounded-3xl pointer-events-none select-none drop-shadow-[0_0_25px_rgba(0,0,0,0.5)]" 
                    style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                  />
                  {/* Transparent overlay to block drag/saving */}
                  <div className="absolute inset-0 z-10 bg-transparent w-full h-full" />
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/10 text-white text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-2xl flex items-center gap-2 whitespace-nowrap">
              <ShieldCheck size={16} className="text-purple-400" />
              {photoViewer.photos.length} Secure Images • Do Not Distribute
            </div>
          </div>
        </div>
      )}
    </div>
  );
}