'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, CheckCircle2, AlertTriangle, 
  Loader2, CheckCircle, Lock, Monitor, LogOut, Star, Camera, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// 🌟 SMART AUDIT WINDOW ENGINE
function getAuditWindowInfo(category: string = 'Laptop') {
  const today = new Date();
  const year = today.getFullYear();
  const currentMonth = today.getMonth(); 
  
  let targetMonth = currentMonth;
  const isLaptop = (category || '').toLowerCase().includes('laptop');
  
  if (!isLaptop) {
    const quarter = Math.floor(currentMonth / 3);
    targetMonth = (quarter * 3) + 2; 
  }

  const lastDayOfMonth = new Date(year, targetMonth + 1, 0);
  const lastSaturday = new Date(lastDayOfMonth);
  while (lastSaturday.getDay() !== 6) {
    lastSaturday.setDate(lastSaturday.getDate() - 1);
  }
  lastSaturday.setHours(23, 59, 59, 999);

  const windowStart = new Date(lastSaturday);
  windowStart.setDate(lastSaturday.getDate() - 4);
  windowStart.setHours(0, 0, 0, 0);

  return {
    isOpen: today >= windowStart && today <= lastSaturday,
    windowStart,
    lastSaturday,
    year,
    month: targetMonth
  };
}

const formatDuration = (start: string, end: string) => {
  if (!start || !end) return '';
  const d1 = new Date(start).getTime();
  const d2 = new Date(end).getTime();
  const diffHrs = Math.max(0, (d2 - d1) / (1000 * 60 * 60));
  
  if (diffHrs < 1) {
    const mins = Math.max(0, (d2 - d1) / (1000 * 60));
    return `${Math.floor(mins)} mins`;
  }
  if (diffHrs > 24) return `${Math.floor(diffHrs / 24)} days`;
  return `${Math.floor(diffHrs)} hrs`;
};

export default function StaffDashboardPage() {
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, openTickets: 0 });

  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({
    isOpen: false,
    type: '',
  });

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

  const formatDisplayName = (raw: string) => {
    if (!raw) return 'Staff Member';
    let s = raw.split('@')[0].split('.')[0];            
    s = s.replace(/[_-]/g, ' ');  
    return s.charAt(0).toUpperCase() + s.slice(1); 
  };

  const loadRealDatabase = async (showSpin = false) => {
    if (showSpin) setIsRefreshing(true);
    const safetyTimeoutId = setTimeout(() => { setLoading(false); setIsRefreshing(false); }, 4000);

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';

      if (isGuest) {
        clearTimeout(safetyTimeoutId);
        setCurrentUser({ id: 'guest-mock-uuid', email: 'demo_user@virtualstaffing.com', emp_id: 'DEMO-001', name: 'Demo Guest User' });
        setAssignedAssets([]); setAllInspections([]); setMyTickets([]);
        setStats({ totalAssets: 0, needsInspection: 0, openTickets: 0 });
        setIsAuthorized(true); setLoading(false); setIsRefreshing(false); return; 
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }

      let user: any = {};
      try { user = JSON.parse(sessionStr); } catch (e) { user = { name: sessionStr.split('@')[0], email: sessionStr }; }

      const cleanEmail = user.email?.toLowerCase().trim();
      if (cleanEmail === 'lakhwinder.bi@outlook.com') { clearTimeout(safetyTimeoutId); window.location.replace('/admin'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      if (profile) {
        if (profile.status === 'Disabled') { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }
        user.emp_id = profile.emp_code || profile.emp_id || 'STAFF';
        user.name = profile.full_name || profile.name || user.name;
        user.id = profile.id;
      } else { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }
      
      setCurrentUser(user);
      setIsAuthorized(true); 

      const [assetsRes, inspRes, ticketsRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false })
      ]);

      if (inspRes.data) setAllInspections(inspRes.data);

      const compiledAssets = (assetsRes.data || []).map(asset => {
        const latestInsp = (inspRes.data || []).find(i => i.asset_id === asset.id);
        return {
          ...asset,
          live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null
        };
      });
      setAssignedAssets(compiledAssets);
      
      const needsInspCount = compiledAssets.filter(a => 
        ['pending', 're-inspection', 'overdue', 'not approved', 'reject'].some(status => (a.live_inspection_status || '').toLowerCase().includes(status))
      ).length;

      const tix = ticketsRes.data || [];
      setMyTickets(tix);
      const openTixCount = tix.filter(t => !['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;

      setStats({ totalAssets: compiledAssets.length, needsInspection: needsInspCount, openTickets: openTixCount });

    } catch (err) { console.error("Data sync failure:", err); } 
    finally { clearTimeout(safetyTimeoutId); setLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => {
    loadRealDatabase();

    const realtimeChannel = supabase.channel('staff-dashboard-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, () => { loadRealDatabase(false); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, () => { loadRealDatabase(false); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inspections' }, () => { loadRealDatabase(false); })
      .subscribe();

    return () => { supabase.removeChannel(realtimeChannel); };
  }, []);

  const handleRateTicket = async (ticketId: string, rating: number) => {
    try {
      await supabase.from('tickets').update({ rating }).eq('id', ticketId);
      setMyTickets(prev => prev.map(t => t.id === ticketId ? { ...t, rating } : t));
      toast.success("Thank you for rating our IT support!");
    } catch (e) { console.error(e); }
  };
  
  // 🌟 NEON GLOW BADGES FOR TICKETS
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-orange-50 text-orange-600 border border-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.25)] dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/50';
    if (s === 'in progress') return 'bg-purple-50 text-purple-600 border border-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.25)] dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/50';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/50';
    return 'bg-white text-slate-600 border border-slate-300 shadow-sm dark:bg-white/10 dark:text-slate-300 dark:border-white/20';
  };

  // 🌟 NEON BUTTONS & BADGES FOR HARDWARE
  const getAssetAuditState = (asset: any) => {
    const status = (asset.live_inspection_status || '').toLowerCase();
    const auditWindow = getAuditWindowInfo(asset.category);
    
    if (asset.status?.toLowerCase().includes('return') || status.includes('return pending')) {
      return { disabled: true, text: "Return Pending", classes: "bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-zinc-500" };
    }

    if (status === 'rejected' || status === 'fail') {
      return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-50 text-rose-600 border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer hover:bg-rose-100" };
    }
    if (status === 're-inspection') {
      return { disabled: false, text: "Re-Inspection Required", classes: "bg-amber-50 text-amber-600 border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer hover:bg-amber-100" };
    }

    const hasAudited = allInspections.some(insp => {
       const d = new Date(insp.created_at);
       return insp.asset_id === asset.id && 
              d.getFullYear() === auditWindow.year && 
              d.getMonth() === auditWindow.month &&
              !insp.notes?.includes('[RETURN REQUEST]') &&
              !insp.status?.toLowerCase().includes('return') &&
              (insp.status === 'Approved' || insp.status === 'Pending Review' || insp.status === 'Pending');
    });

    if (hasAudited) return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-50 text-emerald-600 border border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] cursor-not-allowed dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30" };
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens ${auditWindow.windowStart.toLocaleDateString()}`, classes: "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-white/5 dark:text-zinc-500 dark:border-white/10" };
    
    return { disabled: false, text: "Audit Device", classes: "bg-gradient-to-r from-orange-500 to-purple-600 hover:opacity-90 text-white cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.4)] border-none" };
  };

  // 🎨 PURE MAC OS 2026 EYE-COMFORT WARM GLASS THEME
  const theme = {
    // 🌟 Bright, clean off-white background
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFFBF7]',
    
    // 🌟 PURE WHITE FROSTED GLASS (High blur, crisp white borders)
    glassCard: isDarkMode 
      ? 'bg-zinc-900/60 backdrop-blur-3xl border border-white/10 shadow-xl' 
      : 'bg-white/70 backdrop-blur-[50px] backdrop-saturate-[1.5] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]',
    
    // 🌟 Inner Items
    glassItem: isDarkMode
      ? 'bg-zinc-800/50 border-white/5'
      : 'bg-white/90 border border-slate-100 shadow-sm',
      
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 w-full h-screen ${theme.bg}`}>
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className={`text-xs font-bold ${theme.subText} tracking-widest uppercase`}>Connecting to portal...</p>
      </div>
    );
  }

  if (!isAuthorized) return null; 

  const requiresGlobalReinspection = assignedAssets.some(a => {
    const s = (a.live_inspection_status || '').toLowerCase();
    if (s.includes('return')) return false;
    return ['re-inspection', 'not approved', 'reject'].some(val => s.includes(val));
  });

  const isGlobalAuditOpen = assignedAssets.some(a => getAuditWindowInfo(a.category).isOpen) || requiresGlobalReinspection;

  return (
    // 🌟 100% DESKTOP FREEZE (ABSOLUTE INSET-0 + OVERFLOW-HIDDEN)
    <div className={`absolute inset-0 w-full h-full lg:overflow-hidden overflow-y-auto flex flex-col ${theme.bg} font-sans antialiased z-0`}>
      
      {/* 🌟 ENHANCED WARM AMBIENT NEON ORBS */}
      <div className="fixed top-[-10%] left-[-5%] w-[60vw] h-[60vh] bg-orange-400/20 dark:bg-orange-600/10 blur-[130px] rounded-full pointer-events-none -z-10 mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[60vw] h-[60vh] bg-purple-500/15 dark:bg-purple-700/10 blur-[130px] rounded-full pointer-events-none -z-10 mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col max-w-400 mx-auto w-full p-4 lg:p-6 gap-5 h-full lg:min-h-0 z-10">
        
        {/* 🌟 HEADER WITH SYNC BUTTON */}
        <div className={`${theme.glassCard} rounded-3xl p-5 md:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 transition-all`}>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${theme.text}`}>Welcome back, {formatDisplayName(currentUser.name)} 👋</h1>
            <div className={`flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs sm:text-sm font-semibold ${theme.subText}`}>
              {/* 🌟 NEON ID BADGE */}
              <span className="text-purple-700 dark:text-purple-400 font-black uppercase tracking-wider px-3 py-1 bg-purple-50 dark:bg-purple-500/20 rounded-lg border border-purple-300 dark:border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.25)]">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => loadRealDatabase(true)} 
              disabled={isRefreshing}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 active:scale-95 ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-linear-to-r from-orange-500 to-purple-600 hover:opacity-90 text-white shadow-orange-500/30 border-transparent'}`}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Sync Feeds
            </button>
          </div>
        </div>

        {/* 🌟 ACTION THUMBNAILS & STATS (CLEARLY SEPARATED) */}
        <div className="flex flex-col xl:flex-row gap-5 shrink-0">
          
          {/* Quick Actions */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              // 🌟 SOLID, VIBRANT ICON BACKGROUNDS WITH NEON GLOWS (NO MUDDY BLUR)
              { name: 'Raise Ticket', desc: 'IT failure', icon: Ticket, color: 'text-purple-600 bg-purple-50 border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:bg-purple-500/20 dark:border-purple-500/50', type: 'TICKET', isActionDisabled: false, path: null },
              { name: 'Device Audit', desc: requiresGlobalReinspection ? 'Action Required' : (isGlobalAuditOpen ? 'Submit inspection' : 'Window Closed'), icon: ClipboardCheck, color: requiresGlobalReinspection ? 'text-rose-600 bg-rose-50 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse dark:bg-rose-500/20 dark:border-rose-500/50' : (isGlobalAuditOpen ? 'text-amber-600 bg-amber-50 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] dark:bg-amber-500/20 dark:border-amber-500/50' : 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10'), type: 'INSPECTION', isActionDisabled: !isGlobalAuditOpen, path: null },
              { name: 'Request Gear', desc: 'New equipment', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] dark:bg-emerald-500/20 dark:border-emerald-500/50', type: 'REQUEST', isActionDisabled: false, path: null },
              { name: 'Team Screen', desc: 'Remote access', icon: Monitor, color: 'text-orange-600 bg-orange-50 border-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.2)] dark:bg-orange-500/20 dark:border-orange-500/50', type: 'ROUTE', isActionDisabled: false, path: '/staff/dashboard/remote' },
            ].map((item) => (
              <button 
                key={item.name} 
                onClick={() => { if (item.isActionDisabled) return; if (item.path) { router.push(item.path); } else { setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] }); } }} 
                disabled={item.isActionDisabled}
                className={`relative ${theme.glassCard} h-30 p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 ease-out group ${item.isActionDisabled ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-xl cursor-pointer hover:border-purple-300'}`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className={`p-2.5 rounded-xl border transition-transform duration-300 ${item.isActionDisabled ? '' : 'group-hover:scale-110'} ${item.color}`}>
                    {item.isActionDisabled ? <Lock size={16} /> : <item.icon size={16} />}
                  </div>
                  {!item.isActionDisabled && (
                    <div className={`p-1.5 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-white/5 text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-200' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600'}`}>
                      <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  )}
                </div>
                <div className="text-left w-full mt-2">
                  <h3 className={`font-bold text-[13px] tracking-tight leading-tight transition-colors ${item.isActionDisabled ? theme.subText : `${theme.text} group-hover:text-purple-600 dark:group-hover:text-purple-400`}`}>{item.name}</h3>
                  <p className={`text-[10px] font-medium mt-0.5 leading-snug line-clamp-1 ${theme.subText}`}>{item.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Key Stats */}
          <div className="xl:w-[35%] grid grid-cols-1 sm:grid-cols-3 gap-4 border-t xl:border-t-0 xl:border-l pt-4 xl:pt-0 xl:pl-5 border-slate-200 dark:border-white/10">
            <div className={`${theme.glassCard} h-30 p-4 rounded-2xl flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg border shadow-[0_0_15px_rgba(168,85,247,0.2)] ${isDarkMode ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-purple-50 border-purple-300 text-purple-600'}`}><Laptop size={16} /></div>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Assigned</span>
              </div>
              <div>
                <h2 className={`text-3xl font-black leading-none mb-1 ${theme.text}`}>{stats.totalAssets}</h2>
                <p className={`text-[10px] font-bold ${theme.subText}`}>Hardware Units</p>
              </div>
            </div>
            
            <div className={`${theme.glassCard} h-30 p-4 rounded-2xl flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg border shadow-[0_0_15px_rgba(245,158,11,0.2)] ${isDarkMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-600'}`}><AlertCircle size={16} /></div>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Action Require</span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-amber-500 leading-none mb-1">{stats.needsInspection}</h2>
                <p className={`text-[10px] font-bold ${theme.subText}`}>Pending Tasks</p>
              </div>
            </div>

            <div className={`${theme.glassCard} h-30 p-4 rounded-2xl flex flex-col justify-between shadow-sm`}>
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg border shadow-[0_0_15px_rgba(249,115,22,0.2)] ${isDarkMode ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-orange-50 border-orange-300 text-orange-600'}`}><Ticket size={16} /></div>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Open TiCKET</span>
              </div>
              <div>
                <h2 className="text-3xl font-black text-orange-500 leading-none mb-1">{stats.openTickets}</h2>
                <p className={`text-[10px] font-bold ${theme.subText}`}>Active Tickets</p>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 MAIN SPLIT VIEW (Hardware Units vs Tickets) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:min-h-0 lg:overflow-hidden pt-1">
          
          {/* LEFT: MY HARDWARE UNITS */}
          <div className="w-full lg:w-[65%] flex flex-col lg:min-h-0 lg:overflow-hidden">
            <div className={`${theme.glassCard} rounded-3xl p-5 md:p-6 flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden`}>
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider ${theme.text}`}>
                  <Laptop className="text-purple-600 dark:text-purple-400 shrink-0" size={18}/> My Hardware Units
                </div>
                <span className={`text-xs font-bold ${theme.subText}`}>{assignedAssets.length} Total</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {assignedAssets.length === 0 ? (
                  <div className={`py-10 text-center font-medium text-xs ${theme.subText}`}>No active assets linked to your account.</div>
                ) : (
                  assignedAssets.map(asset => {
                    const btnState = getAssetAuditState(asset);
                    const isReInspect = (asset.live_inspection_status || '').toLowerCase().includes('re-inspection');
                    const isReturnPending = (asset.status || '').toLowerCase().includes('return');
                    const isReturnRejected = (asset.live_inspection_status || '').toLowerCase() === 'return rejected';

                    return (
                      <div key={asset.id} className={`${theme.glassItem} p-5 rounded-2xl transition-all flex flex-col gap-4 hover:shadow-md hover:border-purple-300`}>
                        
                        <div className="flex justify-between items-start gap-3">
                          <h4 className={`font-extrabold text-base tracking-tight leading-tight ${theme.text}`}>
                            {asset.name || asset.asset_name || asset.model || 'Generic Device'}
                          </h4>
                          {/* 🌟 VIBRANT HARDWARE STATUS BADGES */}
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 shadow-sm ${
                            isReturnRejected ? 'bg-rose-100 text-rose-700 border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)] dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/50' :
                            isReturnPending ? 'bg-orange-100 text-orange-700 border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)] dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/50' :
                            isReInspect ? 'bg-amber-100 text-amber-700 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)] dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/50' :
                            'bg-emerald-100 text-emerald-700 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/50'
                          }`}>
                            {isReturnRejected ? 'Return Rejected' : isReturnPending ? 'Pending Return' : (asset.live_inspection_status || 'Pending')}
                          </span>
                        </div>

                        {/* Detail Box */}
                        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200/60 shadow-inner'}`}>
                          <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Tag ID</span><span className={`font-mono text-xs font-bold ${theme.text}`}>{asset.asset_tag || 'N/A'}</span></div>
                          <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Serial S/N</span><span className={`font-mono text-xs font-bold break-all ${theme.text}`}>{asset.serial_number || asset.serial || 'N/A'}</span></div>
                          <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Updated</span><span className={`text-xs font-bold ${theme.text}`}>{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'N/A'}</span></div>
                          <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Category</span><span className={`text-xs font-bold ${theme.text}`}>{asset.category || 'N/A'}</span></div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2.5 pt-1 justify-end">
                          <button 
                            disabled={isReturnPending && !isReturnRejected}
                            onClick={() => setModal({ isOpen: true, type: 'RETURN', targetAsset: asset })}
                            // 🌟 SOLID, GLOWING BUTTONS
                            className={`px-5 py-2.5 font-bold text-xs rounded-xl transition-all border ${
                              (isReturnPending && !isReturnRejected)
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:border-white/10 dark:text-zinc-500'
                                : 'bg-white border-orange-400 text-orange-600 hover:bg-orange-50 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer dark:bg-orange-500/10 dark:border-orange-500/50 dark:text-orange-400'
                            }`}
                          >
                            Return
                          </button>

                          <button 
                            disabled={isReturnPending && !isReturnRejected}
                            onClick={() => setModal({ isOpen: true, type: 'REPLACEMENT', targetAsset: asset })}
                            className={`px-5 py-2.5 font-bold text-xs rounded-xl transition-all border ${
                              (isReturnPending && !isReturnRejected)
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:border-white/10 dark:text-zinc-500'
                                : 'bg-white border-purple-400 text-purple-600 hover:bg-purple-50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer dark:bg-purple-500/10 dark:border-purple-500/50 dark:text-purple-400'
                            }`}
                          >
                            Replace
                          </button>

                          <button 
                            disabled={btnState.disabled}
                            onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                            className={`px-6 py-2.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 ${btnState.classes}`}
                          >
                            {btnState.disabled && !btnState.text.includes('Opens') && <CheckCircle size={15} />}
                            {btnState.disabled && btnState.text.includes('Opens') && <Lock size={15} />}
                            <span>{btnState.text}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: MY SERVICE TICKETS */}
          <div className="w-full lg:w-[35%] flex flex-col lg:min-h-0 lg:overflow-hidden pb-4 lg:pb-0">
            <div className={`${theme.glassCard} rounded-3xl p-5 md:p-6 flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden`}>
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider ${theme.text}`}><Ticket className="text-orange-500 shrink-0" size={18}/> My Tickets</div>
                <span className={`text-xs font-bold ${theme.subText}`}>{myTickets.length} Raised</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {myTickets.length === 0 ? (
                  <div className={`py-10 text-center font-medium text-xs ${theme.subText}`}>No service requests submitted yet.</div>
                ) : (
                  myTickets.map(tix => {
                    const isResolved = ['resolved', 'closed'].includes((tix.status || '').toLowerCase());
                    return (
                      <div key={tix.id} className={`p-4 rounded-2xl border transition-colors space-y-3 ${theme.glassItem} hover:border-orange-400/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-bold text-sm leading-snug ${theme.text}`}>{tix.title || tix.subject}</span>
                          {/* 🌟 VIBRANT TICKET STATUS BADGES */}
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase border shrink-0 ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                        </div>
                        
                        <p className={`text-xs font-medium line-clamp-3 ${theme.subText}`}>{tix.description || tix.note}</p>

                        {(tix.admin_remarks || tix.admin_notes || tix.resolution_notes) && (
                          <div className={`p-3 rounded-xl border text-xs ${isDarkMode ? 'bg-black/20 border-white/10 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                            <strong className={`block mb-1 ${theme.text}`}>Admin Response:</strong>
                            {tix.admin_remarks || tix.admin_notes || tix.resolution_notes}
                          </div>
                        )}

                        {isResolved && (
                          <div className={`flex flex-col gap-2 pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                            {tix.updated_at && (
                                <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme.subText}`}>
                                  <Clock size={12}/> Resolved in: {formatDuration(tix.created_at, tix.updated_at)}
                                </div>
                            )}

                            <div className="flex items-center gap-1 mt-1">
                              <span className={`text-[9px] font-bold uppercase tracking-widest mr-1 ${theme.subText}`}>Rate Support:</span>
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  disabled={!!tix.rating}
                                  onClick={() => handleRateTicket(tix.id, star)}
                                  className={`transition-all ${tix.rating ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                                >
                                  <Star size={14} className={star <= (tix.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-zinc-600"} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={`flex items-center justify-between text-[10px] uppercase tracking-widest pt-2 font-bold border-t mt-2 ${isDarkMode ? 'border-white/10 text-zinc-500' : 'border-slate-200 text-slate-400'}`}>
                          <span>Category: <strong className={theme.text}>{tix.category || 'General'}</strong></span>
                          <span>{tix.created_at ? new Date(tix.created_at).toLocaleDateString() : 'Just now'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 🌟 PURE WHITE GLASS DATABASE MODAL (No Solid White Backgrounds) */}
      {modal.isOpen && (
        <LiveDatabaseModal 
          type={modal.type} 
          asset={modal.targetAsset} 
          user={currentUser} 
          isDarkMode={isDarkMode}
          setAssignedAssets={setAssignedAssets} 
          onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(); }} 
        />
      )}
    </div>
  );
}

function LiveDatabaseModal({ type, asset, user, isDarkMode, setAssignedAssets, onClose }: any) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT' || type === 'RETURN';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  // 🌟 MODAL PURE GLASS THEME (Fully Translucent White Glass, Solid White Inputs)
  const theme = {
    modalBg: isDarkMode 
      ? 'bg-zinc-900/60 backdrop-blur-[50px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/60 backdrop-blur-[50px] backdrop-saturate-200 border border-white shadow-[0_16px_40px_rgba(139,92,246,0.1)]',
    headerBg: isDarkMode ? 'border-white/10' : 'border-white/60',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-600',
    // 🌟 CRISP WHITE INPUT FIELDS FOR PERFECT READABILITY
    inputBg: isDarkMode 
      ? 'bg-black/50 border-white/20 text-zinc-100 placeholder:text-zinc-500 focus:border-purple-500' 
      : 'bg-white border-white shadow-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10'
  };

  const handleAttemptUnlock = () => {
    if (!asset) { alert("No hardware assigned to test against!"); return; }
    if (user.id === 'guest-mock-uuid') { setLockError(false); setIsUnlocked(true); return; }
    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number||'').toLowerCase() || typed === (asset.asset_tag||'').toLowerCase()) { setLockError(false); setIsUnlocked(true); } else setLockError(true);
  };

  const generateMobileHandoff = () => {
    const baseUrl = window.location.origin;
    const cat = asset?.category || formCategory;
    const finalNotes = type === 'RETURN' ? `[RETURN REQUEST] ${formText}` : formText;
    const url = `${baseUrl}/mobile-audit?assetId=${asset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(finalNotes)}&auditType=${type}`;
    setQrUrl(url); setShowQR(true);
  };

  const handleLivePostgresSubmit = async () => {
    if (type === 'INSPECTION' || type === 'RETURN') {
      if (type === 'RETURN') {
        try {
          await supabase.from('assets').update({ status: 'Pending Return' }).eq('id', asset.id);
          if (setAssignedAssets) setAssignedAssets((prev: any[]) => prev.map(a => a.id === asset.id ? { ...a, status: 'Pending Return' } : a));
        } catch(e) {}
      }
      generateMobileHandoff(); return;
    }

    setIsTransmitting(true);
    if (user.id === 'guest-mock-uuid') { setTimeout(() => { setIsTransmitting(false); setSuccessDone(true); setTimeout(() => onClose(), 1200); }, 800); return; }

    let submitError = null; 
    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const finalEmp = user.emp_id || 'STAFF';
      let humanName = user.name || cleanEmail.split('@')[0];
      humanName = humanName.split('.')[0].replace(/[_-]/g, ' ');
      humanName = humanName.charAt(0).toUpperCase() + humanName.slice(1);

      if (type === 'TICKET') {
        const { error } = await supabase.from('tickets').insert({ title: formTitle || 'IT Support Ticket', category: formCategory, description: formText || 'No details given', status: 'Open', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = error;
      } else if (type === 'REQUEST') {
        const { error } = await supabase.from('tickets').insert({ title: `Asset Request: ${formCategory}`, category: `Request: ${formCategory}`, description: formText || `Staff requested ${formCategory}`, status: 'Pending', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = error;
      } else if (type === 'REPLACEMENT') {
        const { error: ticketError } = await supabase.from('tickets').insert({ title: `Replacement Request: ${asset.name}`, category: 'Asset Replacement', description: `Tag ID: ${asset.asset_tag} | S/N: ${asset.serial_number}\n\nReason: ${formText}`, status: 'Pending', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = ticketError;
        if (!ticketError) await supabase.from('assets').update({ status: 'Replacement Requested' }).eq('id', asset.id);
      }
      if (submitError) throw submitError;
      setSuccessDone(true); setTimeout(() => onClose(), 1200);
    } catch (e: any) { alert(`Database Error: ${e.message || JSON.stringify(e)}`); } finally { setIsTransmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-9999 flex items-center justify-center p-4 animate-in fade-in">
      <div className={`rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${theme.modalBg}`}>
        
        <div className={`p-6 border-b flex items-center justify-between shrink-0 ${theme.headerBg}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl font-bold border ${type === 'RETURN' ? 'bg-orange-100 border-orange-200 text-orange-600 dark:bg-orange-500/20 dark:border-orange-500/30 dark:text-orange-400' : 'bg-purple-100 border-purple-200 text-purple-600 dark:bg-purple-500/20 dark:border-purple-500/30 dark:text-purple-400'}`}>
              {type === 'RETURN' ? <LogOut size={20} /> : <Ticket size={20}/>}
            </div>
            <div>
              <h3 className={`font-extrabold text-[15px] tracking-tight uppercase ${theme.text}`}>{type === 'REPLACEMENT' ? 'Assets Replacement' : type === 'RETURN' ? 'Asset Return Request' : 'Portal Submission'}</h3>
              {type !== 'REPLACEMENT' && type !== 'RETURN' && <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>{type}</p>}
              {type === 'RETURN' && <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.subText}`}>Initiate IT Handover</p>}
            </div>
          </div>
          <button onClick={onClose} className={`p-2.5 rounded-full cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-white/50 text-slate-500'}`}><X size={20}/></button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 custom-scrollbar">
          {successDone ? (
            <div className="py-10 text-center space-y-4">
              <CheckCircle2 size={64} className="text-emerald-500 mx-auto animate-bounce"/>
              <h4 className={`text-2xl font-black ${theme.text}`}>Database Updated!</h4>
            </div>
          ) : showQR ? (
            <div className="py-4 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div>
                <h4 className={`text-lg font-black uppercase tracking-widest ${theme.text}`}>Mobile Device Handoff</h4>
                <p className={`text-xs font-semibold mt-1.5 ${theme.subText}`}>Scan this code with your phone camera to take certified watermark photos of the asset.</p>
              </div>
              <div className={`p-5 rounded-3xl inline-block shadow-xl mx-auto border ${isDarkMode ? 'bg-white/90 border-white/20' : 'bg-white border-white shadow-xl'}`}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Scan to Audit" className="w-48 h-48 rounded-xl" />
              </div>
              <div className={`p-5 rounded-3xl text-left border ${isDarkMode ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white border-white shadow-sm'}`}>
                <h5 className={`text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}><Camera size={16}/> Photo Requirements</h5>
                <ul className={`text-xs font-semibold space-y-2 ml-1 ${isDarkMode ? 'text-purple-200' : 'text-slate-700'}`}>
                  {(asset?.category || '').toLowerCase().includes('laptop') ? (
                    <><li>✅ Screen & Keypad view</li><li>✅ Top and Bottom (with Tag)</li><li>✅ Left and Right Side Ports</li></>
                  ) : (
                    <><li>✅ Clear Front / Top View</li><li>✅ Bottom View (showing Asset Tag)</li></>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-sm font-medium">
              {needsLock && (
                <div className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/80 border-white shadow-sm'}`}>
                  <p className={`text-xs font-bold flex items-center gap-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>🔒 Security Verification Required</p>
                  <div className="flex gap-3">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder={user.id === 'guest-mock-uuid' ? 'Type anything for Guest...' : 'Type exact Tag ID or S/N...'} className={`flex-1 p-3.5 rounded-2xl text-xs font-bold outline-none transition-all ${theme.inputBg}`}/>
                    {!isUnlocked && <button onClick={handleAttemptUnlock} className="px-6 bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white font-bold text-xs rounded-2xl cursor-pointer transition-all shadow-lg shadow-purple-500/20 border border-purple-400/50">Verify</button>}
                  </div>
                  {lockError && <p className="text-[11px] text-rose-500 font-bold px-1">Incorrect device code.</p>}
                </div>
              )}

              {type === 'TICKET' && (
                <>
                  <div><label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${theme.subText}`}>Issue Subject</label><input value={formTitle} onChange={e=>setFormTitle(e.target.value)} placeholder="E.g. Monitor display flickering" className={`w-full p-4 rounded-2xl outline-none text-sm font-semibold transition-all ${theme.inputBg}`}/></div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${theme.subText}`}>Category</label>
                    <select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className={`w-full p-4 rounded-2xl font-semibold outline-none transition-all ${theme.inputBg}`}>
                      <option className={isDarkMode ? 'text-black' : ''}>Hardware</option>
                      <option className={isDarkMode ? 'text-black' : ''}>Software</option>
                      <option className={isDarkMode ? 'text-black' : ''}>Network</option>
                    </select>
                  </div>
                </>
              )}

              {(type === 'INSPECTION' || type === 'RETURN') && isUnlocked && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${theme.subText}`}>Current Asset Condition</label>
                  <select value={formCondition} onChange={e=>setFormCondition(e.target.value)} className={`w-full p-4 rounded-2xl font-semibold mb-5 outline-none transition-all ${theme.inputBg}`}>
                    <option className={isDarkMode ? 'text-black' : ''}>Pristine / Flawless</option>
                    <option className={isDarkMode ? 'text-black' : ''}>Good / Minor Scratches</option>
                    <option className={isDarkMode ? 'text-black' : ''}>Poor / Damaged (Requires Fix)</option>
                    <option className={isDarkMode ? 'text-black' : ''}>Non-Functional / Dead</option>
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-2 px-1 ${theme.subText}`}>
                  {type === 'INSPECTION' ? 'Audit Notes' : type === 'RETURN' ? 'Return Reason & Notes' : 'Detailed Explanation'}
                </label>
                <textarea rows={4} value={formText} onChange={e=>setFormText(e.target.value)} placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : type === 'RETURN' ? "Provide reason for returning..." : "Describe what happened..."} className={`w-full p-4 rounded-2xl outline-none text-sm font-medium resize-none transition-all ${theme.inputBg}`}/>
              </div>
            </div>
          )}
        </div>

        {!successDone && (
          <div className={`p-6 border-t flex justify-end gap-3 shrink-0 ${theme.headerBg}`}>
            {showQR ? (
              <button onClick={onClose} className="w-full py-4 rounded-2xl text-xs font-bold bg-slate-900 hover:bg-black text-white cursor-pointer shadow-md transition-all border border-slate-700">Close Portal (Awaiting Mobile Scan)</button>
            ) : (
              <>
                <button onClick={onClose} className={`px-6 py-3.5 rounded-2xl text-xs font-bold cursor-pointer transition-all border ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10' : 'bg-white/50 hover:bg-white text-slate-700 border-white/70 shadow-[0_4px_15px_rgba(0,0,0,0.05)]'}`}>Cancel</button>
                <button disabled={isTransmitting || (needsLock && !isUnlocked)} onClick={handleLivePostgresSubmit} className={`px-8 py-3.5 rounded-2xl text-[12px] font-extrabold text-white cursor-pointer shadow-xl disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest transition-all ${type === 'RETURN' ? 'bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 shadow-orange-500/30 border border-orange-400' : 'bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 shadow-purple-500/30 border border-purple-400'}`}>
                  {isTransmitting && <Loader2 size={16} className="animate-spin"/>} {type === 'INSPECTION' || type === 'RETURN' ? 'Generate Camera QR' : 'Transmit'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}