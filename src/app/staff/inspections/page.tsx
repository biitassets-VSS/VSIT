'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  ClipboardCheck, Loader2, AlertTriangle, Eye, X, 
  CameraOff, CheckCircle2, RefreshCw, Calendar, 
  Clock, XOctagon, Search, ShieldCheck, Laptop, FileSignature
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
  return lastSaturday.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); 
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Pending / N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
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
    if (s.includes('approved')) return { bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-700', icon: <CheckCircle2 size={14} />, label: 'Approved' };
    if (s.includes('reject') || s.includes('not approved') || s.includes('refuse')) return { bg: 'bg-rose-50/80 border-rose-200 text-rose-700', icon: <XOctagon size={14} />, label: 'Refused / Rejected' };
    if (s.includes('re-inspection')) return { bg: 'bg-orange-50/80 border-orange-200 text-orange-700', icon: <AlertTriangle size={14} />, label: 'Re-Audit Required' };
    return { bg: 'bg-purple-50/80 border-purple-200 text-purple-700', icon: <Clock size={14} />, label: 'Pending Review' };
  };

  const filteredInspections = inspections.filter(insp => {
    const searchString = `${insp.assets?.name} ${insp.assets?.asset_tag} ${insp.status}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none relative" onContextMenu={(e) => e.preventDefault()}>
      
      {/* 🌟 ADVANCED HEADER WITH ORANGE/PURPLE GLASS THEME */}
      <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-orange-400/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-linear-to-tr from-purple-400/10 to-orange-500/10 blur-3xl -z-10 rounded-full" />
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="text-orange-500" /> Audit Ledger
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Review the complete historical log of your device compliance and admin feedback.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 z-10">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Tag ID or Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-xl text-sm font-semibold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 transition-all shadow-inner"
            />
          </div>
          <button 
            onClick={fetchRealtimeData} 
            disabled={isRefreshing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-orange-500 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 shrink-0 border border-white/20"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 🌟 ADVANCED GRID VIEW (Cards) */}
      <div className="relative min-h-100">
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-100 overflow-hidden z-10 rounded-t-3xl">
            <div className="w-1/3 h-full bg-linear-to-r from-orange-400 to-purple-500 animate-[pulse_1s_ease-in-out_infinite] translate-x-full" />
          </div>
        )}
        
        {filteredInspections.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/60 py-20 text-center flex flex-col items-center shadow-sm">
            <ShieldCheck size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No inspection records found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredInspections.map((insp, index) => {
              const asset = insp.assets || {};
              const statusConfig = getStatusConfig(insp.status);
              const isApproved = statusConfig.label === 'Approved';
              const isRejected = statusConfig.label === 'Refused / Rejected' || statusConfig.label === 'Re-Audit Required';
              
              // Resolve Dates
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
                <div key={`${insp.id}-${index}`} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col hover:border-purple-300/60 hover:shadow-lg transition-all group relative">
                  
                  {/* Subtle Background Glow */}
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity group-hover:opacity-40 ${isApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-purple-400'}`} />

                  {/* TOP HEADER: Identity & Tag */}
                  <div className="p-5 border-b border-slate-100/50 flex justify-between items-start bg-slate-50/30">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1 flex items-center gap-2">
                        <Laptop size={16} className="text-orange-500" /> {asset.name || asset.asset_name || 'Hardware Device'}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[10px] font-black bg-white text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/80 shadow-sm">
                          TAG: {asset.asset_tag || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm backdrop-blur-sm ${statusConfig.bg}`}>
                      {statusConfig.icon} {statusConfig.label}
                    </span>
                  </div>

                  {/* MIDDLE: Timestamps & Details */}
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    
                    {/* Key Dates Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/60 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Calendar size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned On</span>
                          <span className="font-bold text-xs text-slate-800">{formatDate(assignedDate)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/60 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><FileSignature size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Agreement Signed</span>
                          <span className="font-bold text-xs text-slate-800">{formatDate(agreementDate)}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200/50 text-slate-600 flex items-center justify-center shrink-0"><ShieldCheck size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inspected On</span>
                          <span className="font-bold text-xs text-slate-800">{formatDate(insp.created_at)}</span>
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl border shadow-xs flex items-center gap-3 ${isApproved ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isApproved ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/50 text-slate-500'}`}><Clock size={14}/></div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Next Due Date</span>
                          <span className={`font-bold text-xs ${isApproved ? 'text-purple-700' : 'text-slate-500'}`}>
                            {isApproved ? calculateNextDueDate(insp.created_at, asset.category) : 'Pending Apprvl'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Feedback Block */}
                    <div className={`p-4 rounded-2xl border flex-1 backdrop-blur-sm shadow-inner ${isRejected ? 'bg-rose-50/50 border-rose-200' : isApproved ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2 opacity-60">
                        {isRejected ? <XOctagon size={12}/> : isApproved ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                        {isRejected ? 'Admin Rejection Reason' : isApproved ? 'Admin Approval Note' : 'Submitted Notes'}
                      </span>
                      <p className={`text-sm font-semibold whitespace-pre-wrap ${isRejected ? 'text-rose-900' : isApproved ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {insp.notes || 'No specific notes recorded for this transaction.'}
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM: Evidence Button */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100/50 shrink-0">
                    {safePhotos.length > 0 ? (
                      <button 
                        onClick={() => setPhotoViewer({ isOpen: true, photos: safePhotos, title: asset.name || 'Inspection' })}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-linear-to-r from-slate-800 to-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer shadow-md"
                      >
                        <Eye size={16} /> View Encrypted Evidence ({safePhotos.length})
                      </button>
                    ) : (
                      <div className="w-full p-3 rounded-xl border border-dashed border-slate-300 bg-white/50 text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <CameraOff size={14} /> No Photos Attached
                      </div>
                    )}
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 SECURE LIGHTBOX (Anti-Screenshot/Download Engine) */}
      {photoViewer.isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-9999 flex flex-col items-center justify-center p-4 select-none"
          onContextMenu={(e) => e.preventDefault()} 
        >
          <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-300 ${!isWindowFocused ? 'blur-3xl opacity-0 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
            <button onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer z-10000 border border-white/20 shadow-xl"><X size={24}/></button>
            
            {!isWindowFocused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-slate-950">
                <CameraOff size={64} className="text-orange-500 mb-4 animate-pulse"/>
                <h2 className="font-black text-2xl tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-purple-500">Capture Blocked</h2>
                <p className="text-slate-400 mt-2 font-medium">Please return focus to this window to view secure evidence.</p>
              </div>
            )}
            
            <div className="flex gap-6 overflow-x-auto max-w-full w-full h-[80vh] items-center px-4 md:px-12 snap-x custom-scrollbar">
              {photoViewer.photos.map((url, i) => (
                <div key={i} className="relative shrink-0 snap-center h-full flex items-center justify-center pointer-events-none">
                  <img 
                    src={url} 
                    alt="Secure Evidence" 
                    draggable={false} 
                    className="max-h-full max-w-full rounded-2xl pointer-events-none select-none border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
                    style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                  />
                  <div className="absolute inset-0 z-10 bg-transparent"></div>
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 text-white text-[10px] font-black tracking-widest uppercase shadow-2xl">
              {photoViewer.photos.length} Secure Images • Do Not Distribute
            </div>
          </div>
        </div>
      )}
    </div>
  );
}