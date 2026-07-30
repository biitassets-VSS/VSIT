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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [inspections, setInspections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 🌟 SECURE LIGHTBOX STATE
  const [photoViewer, setPhotoViewer] = useState<{ isOpen: boolean; photos: string[]; title: string }>({
    isOpen: false, photos: [], title: ''
  });
  const [isWindowFocused, setIsWindowFocused] = useState(true);

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
    return () => observer.disconnect();
  }, []);

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

  // 🌟 HIGH CONTRAST STATUS BADGES (Solid White Backgrounds, Colored Borders/Text)
  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved')) return { bg: 'bg-white text-emerald-600 border-2 border-emerald-400 shadow-sm dark:bg-zinc-800 dark:text-emerald-400 dark:border-emerald-500/50', icon: <CheckCircle2 size={14} />, label: 'Approved' };
    if (s.includes('reject') || s.includes('not approved') || s.includes('refuse')) return { bg: 'bg-white text-rose-600 border-2 border-rose-400 shadow-sm dark:bg-zinc-800 dark:text-rose-400 dark:border-rose-500/50', icon: <AlertOctagon size={14} />, label: 'Refused / Rejected' };
    if (s.includes('re-inspection')) return { bg: 'bg-white text-amber-600 border-2 border-amber-400 shadow-sm dark:bg-zinc-800 dark:text-amber-400 dark:border-amber-500/50', icon: <AlertTriangle size={14} />, label: 'Re-Audit Required' };
    return { bg: 'bg-white text-purple-600 border-2 border-purple-400 shadow-sm dark:bg-zinc-800 dark:text-purple-400 dark:border-purple-500/50', icon: <Clock size={14} />, label: 'Pending Review' };
  };

  const filteredInspections = inspections.filter(insp => {
    const searchString = `${insp.assets?.name} ${insp.assets?.asset_tag} ${insp.status}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  // 🎨 PURE MAC OS 2026 TRANSPARENT GLASS THEME
  const theme = {
    // 🌟 PERFECT TRANSPARENT GLASS: Low white opacity, high blur, crisp white stroke
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
      : 'bg-white/20 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.8)]',
    
    // 🌟 Inner Items (List rows)
    glassItem: isDarkMode
      ? 'bg-black/20 border border-white/10 hover:border-white/20'
      : 'bg-white/40 border border-white/80 shadow-sm backdrop-blur-[40px] transition-all duration-300',
    
    // 🌟 Deep Inner Detail Boxes (More solid for reading fine text)
    glassInner: isDarkMode
      ? 'bg-black/40 border border-white/10'
      : 'bg-white/60 border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)] backdrop-blur-md',
      
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-600',
  };

  if (loading) return (
    <div className="flex flex-1 h-full items-center justify-center flex-col gap-3">
      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      <p className={`text-xs font-bold ${theme.subText} tracking-widest uppercase`}>Syncing Records...</p>
    </div>
  );

  return (
    <>
      {/* 🌟 SCROLLING FIX: Added flex-1, h-full, and overflow-y-auto so the page content scrolls natively! */}
      <div className="flex-1 w-full h-full overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-6 animate-in fade-in duration-500 select-none" onContextMenu={(e) => e.preventDefault()}>
        
        {/* 🌟 ADVANCED HEADER WITH GLASS THEME */}
        <div className={`${theme.glassCard} rounded-[2rem] p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden`}>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-black ${theme.text} tracking-tight flex items-center gap-3`}>
              <ClipboardCheck className="text-purple-600 dark:text-purple-400" /> Audit Ledger
            </h1>
            <p className={`text-xs sm:text-sm font-bold ${theme.subText} mt-1 max-w-xl`}>
              Review the complete historical log of your device compliance and admin feedback.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 z-10 shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" size={16} />
              <input 
                type="text" 
                placeholder="Search Tag ID or Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 ${isDarkMode ? 'bg-black/50 border-white/20 text-white' : 'bg-white/60 border-white text-slate-900'} backdrop-blur-md border rounded-2xl text-xs font-bold outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/10 transition-all shadow-inner placeholder:text-slate-400`}
              />
            </div>
            <button 
              onClick={fetchRealtimeData} 
              disabled={isRefreshing}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 shrink-0 ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' : 'bg-linear-to-r from-orange-500 to-purple-600 hover:opacity-90 text-white shadow-purple-500/20 border-transparent'}`}
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* 🌟 GLASS INSPECTIONS CONTAINER */}
        <div className={`${theme.glassCard} rounded-[2rem] p-5 sm:p-7 relative min-h-[400px]`}>
          
          {isRefreshing && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-100/50 overflow-hidden z-10 rounded-t-[2rem]">
              <div className="w-1/3 h-full bg-linear-to-r from-orange-400 to-purple-500 animate-[pulse_1s_ease-in-out_infinite] translate-x-full" />
            </div>
          )}

          {/* Container Header */}
          <div className="flex items-center justify-between mb-6 px-1 border-b pb-4 border-white/40 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <History size={20} className={theme.text} />
              <h2 className={`text-sm sm:text-base font-black ${theme.text} tracking-widest uppercase`}>Inspection History</h2>
            </div>
            <span className={`text-xs sm:text-sm font-black ${theme.subText}`}>{filteredInspections.length} Records</span>
          </div>

          {filteredInspections.length === 0 ? (
            <div className={`py-16 text-center border-2 border-dashed rounded-3xl flex flex-col items-center ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-300/50 bg-white/40'}`}>
              <ShieldCheck size={44} className="text-slate-400 mb-3" />
              <h3 className={`text-base font-black ${theme.text}`}>No Inspection Records</h3>
              <p className={`text-xs font-bold ${theme.subText} mt-1 max-w-sm`}>There are no historical audit logs found matching your search.</p>
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
                    // 🌟 NEON HOVER GLOW 
                    className={`group ${theme.glassItem} rounded-3xl p-5 sm:p-6 flex flex-col relative overflow-hidden hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]`}
                  >
                    {/* Subtle Status Glow inside the card */}
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 rounded-full opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none ${isApproved ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : 'bg-purple-400'}`} />

                    {/* Header & Status Badge */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                      <h3 className={`text-base sm:text-lg font-black ${theme.text} tracking-tight flex items-center gap-2.5`}>
                        <div className="w-8 h-8 rounded-xl bg-white border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm shrink-0 dark:bg-zinc-800 dark:border-purple-500/50 dark:text-purple-400">
                          <Laptop size={16} strokeWidth={2.5}/>
                        </div>
                        <span className="line-clamp-1">{asset.name || asset.asset_name || 'Hardware Device'}</span>
                      </h3>
                      
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0 ${statusConfig.bg}`}>
                        {statusConfig.icon} {statusConfig.label}
                      </span>
                    </div>

                    {/* 🌟 OPTIMIZED COMPACT GRID */}
                    <div className={`grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4 p-4 rounded-xl ${theme.glassInner}`}>
                      <div className="min-w-0 col-span-2 sm:col-span-1">
                        <span className={`block text-[9px] font-black uppercase tracking-widest ${theme.subText} mb-0.5`}>Tag ID</span>
                        <span className={`font-bold text-xs sm:text-sm ${theme.text} break-words whitespace-normal block`}>{asset.asset_tag || 'N/A'}</span>
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-[9px] font-black uppercase tracking-widest ${theme.subText} mb-0.5`}>Assigned</span>
                        <span className={`font-bold text-xs sm:text-sm ${theme.text} block`}>{formatDate(assignedDate)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-[9px] font-black uppercase tracking-widest ${theme.subText} mb-0.5`}>Agreement</span>
                        <span className={`font-bold text-xs sm:text-sm ${theme.text} block`}>{formatDate(agreementDate)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-[9px] font-black uppercase tracking-widest ${theme.subText} mb-0.5`}>Inspected</span>
                        <span className={`font-bold text-xs sm:text-sm ${theme.text} block`}>{formatDate(insp.created_at)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-[9px] font-black uppercase tracking-widest ${theme.subText} mb-0.5`}>Next Due</span>
                        <span className={`font-black text-xs sm:text-sm block ${isApproved ? 'text-purple-600 dark:text-purple-400' : theme.subText}`}>
                          {isApproved ? calculateNextDueDate(insp.created_at, asset.category) : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Feedback Note */}
                    <div className={`p-4 rounded-xl border flex-1 backdrop-blur-md shadow-inner mb-4 ${isRejected ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30' : isApproved ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30' : 'bg-slate-50/80 border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ${isRejected ? 'text-rose-700 dark:text-rose-400' : isApproved ? 'text-emerald-700 dark:text-emerald-400' : theme.subText}`}>
                        {isRejected ? <AlertOctagon size={14}/> : isApproved ? <CheckCircle2 size={14}/> : <Clock size={14}/>}
                        {isRejected ? 'Admin Rejection Reason' : isApproved ? 'Admin Approval Note' : 'Submitted Notes'}
                      </span>
                      <p className={`text-xs sm:text-sm font-bold whitespace-pre-wrap break-words ${isRejected ? 'text-rose-900 dark:text-rose-300' : isApproved ? 'text-emerald-900 dark:text-emerald-300' : theme.text}`}>
                        {insp.notes || 'No specific notes recorded for this transaction.'}
                      </p>
                    </div>

                    {/* Evidence Button */}
                    <div className={`pt-4 border-t shrink-0 mt-auto flex justify-end ${isDarkMode ? 'border-white/10' : 'border-white/60'}`}>
                      {safePhotos.length > 0 ? (
                        <button 
                          onClick={() => setPhotoViewer({ isOpen: true, photos: safePhotos, title: asset.name || 'Inspection' })}
                          className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center ${isDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-900 hover:bg-black text-white'}`}
                        >
                          <Eye size={16} /> View Encrypted Evidence ({safePhotos.length})
                        </button>
                      ) : (
                        <div className={`px-5 py-2.5 rounded-xl border border-dashed text-[11px] font-black uppercase tracking-widest flex items-center gap-2 w-full sm:w-auto justify-center ${isDarkMode ? 'border-white/20 bg-black/30 text-zinc-500' : 'border-slate-300 bg-white/60 text-slate-400'}`}>
                          <CameraOff size={16} /> No Photos Attached
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

      {/* 🌟 SECURE LIGHTBOX (Fixed Z-Index to break out of layout stacking contexts) */}
      {photoViewer.isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-0 m-0 select-none overflow-hidden"
          style={{ zIndex: 2147483647, top: 0, left: 0, right: 0, bottom: 0 }} // Maximum possible z-index to force it over sidebar
          onContextMenu={(e) => e.preventDefault()} 
        >
          <div className={`w-full h-full flex flex-col items-center justify-center transition-all duration-300 relative ${!isWindowFocused ? 'blur-3xl opacity-0 scale-95' : 'blur-0 opacity-100 scale-100'}`}>
            
            <button 
              onClick={() => setPhotoViewer({ isOpen: false, photos: [], title: '' })} 
              className="absolute top-4 right-4 sm:top-8 sm:right-8 p-4 bg-white/10 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer z-50 border border-white/20 shadow-2xl"
            >
              <X size={24}/>
            </button>
            
            {!isWindowFocused && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-slate-950">
                <CameraOff size={60} className="text-orange-500 mb-3 animate-pulse"/>
                <h2 className="font-black text-2xl tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-purple-500">Capture Blocked</h2>
                <p className="text-slate-400 mt-2 text-sm font-medium">Please return focus to this window to view secure evidence.</p>
              </div>
            )}
            
            {/* 🌟 GALLERY FIX: Forced strict viewport units to prevent portrait images from blowing up! */}
            <div className="flex w-full h-[100dvh] overflow-x-auto snap-x snap-mandatory items-center custom-scrollbar">
              {photoViewer.photos.map((url, i) => (
                <div key={i} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center p-4 sm:p-12 relative">
                  <img 
                    src={url} 
                    alt="Secure Evidence" 
                    draggable={false} 
                    className="w-auto h-auto max-w-full max-h-full object-contain rounded-2xl drop-shadow-[0_0_35px_rgba(0,0,0,0.4)] pointer-events-none select-none" 
                    style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
                  />
                  {/* Invisible shield block over image */}
                  <div className="absolute inset-0 z-10 bg-transparent w-full h-full" />
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-white text-xs font-black tracking-widest uppercase shadow-2xl flex items-center gap-2 whitespace-nowrap">
              <ShieldCheck size={16} className="text-purple-400" />
              {photoViewer.photos.length} Secure Images • Do Not Distribute
            </div>

          </div>
        </div>
      )}
    </>
  );
}