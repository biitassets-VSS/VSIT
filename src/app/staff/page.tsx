'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, CheckCircle, CheckCircle2, AlertTriangle, 
  Loader2, Lock, Monitor, LogOut, Star, Camera, ArrowRight,
  ChevronDown, PackageOpen, ImagePlus, UploadCloud, Sun, Moon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const calculateNextDueDate = (baseDateStr: string | null, cat: string) => {
  if (!baseDateStr) return null;
  const baseDate = new Date(baseDateStr);
  const monthsToAdd = (cat || '').toLowerCase().includes('laptop') ? 1 : 3; 
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToAdd + 1, 0);
  const lastSat = new Date(lastDay);
  while (lastSat.getDay() !== 6) lastSat.setDate(lastSat.getDate() - 1);
  return lastSat;
};

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

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceAssetId, setReplaceAssetId] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

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

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vsit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vsit_theme', 'light');
    }
  };

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
        
        let nextDue = null;
        if (asset.next_inspection_date) {
           nextDue = new Date(asset.next_inspection_date);
        } else if (latestInsp?.created_at || asset.last_inspection_date) {
           nextDue = calculateNextDueDate(latestInsp?.created_at || asset.last_inspection_date, asset.category);
        } else {
           nextDue = calculateNextDueDate(asset.created_at, asset.category); 
        }
        
        const isOverdue = nextDue ? (new Date(nextDue).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) : false;

        return {
          ...asset,
          live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null,
          live_admin_remarks: latestInsp?.admin_remarks || null,
          nextDue,
          isOverdue
        };
      });

      setAssignedAssets(compiledAssets);
      
      const needsInspCount = compiledAssets.filter(a => {
        const s = (a.live_inspection_status || '').toLowerCase();
        if (s === 'pending review' || s === 'pending') return false; 
        return ['re-inspection', 'not approved', 'reject', 'action required'].some(status => s.includes(status)) || a.isOverdue;
      }).length;

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

  const handleReplacementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceAssetId || !replaceReason.trim()) return;

    const asset = assignedAssets.find(a => String(a.id) === replaceAssetId);
    if (!asset) return;

    const confirmed = window.confirm(
      `RECONFIRM REPLACEMENT:\n\nAre you sure you want to request a replacement for:\nAsset: ${asset.name || asset.asset_name}\nTag ID: ${asset.asset_tag}\nSerial: ${asset.serial_number || 'N/A'}\n\nThis will immediately alert IT logistics to prepare a replacement.`
    );

    if (!confirmed) return;

    setIsSubmittingReplace(true);
    try {
      const description = `Tag ID: ${asset.asset_tag} | S/N: ${asset.serial_number || 'N/A'}\n\nReason: ${replaceReason}`;
      const title = `Replacement Request: ${asset.name || asset.asset_name || asset.category}`;

      const cleanEmail = currentUser.email.toLowerCase().trim();
      const finalEmp = currentUser.emp_id || 'STAFF';
      let humanName = currentUser.name || cleanEmail.split('@')[0];
      humanName = humanName.split('.')[0].replace(/[_-]/g, ' ');
      humanName = humanName.charAt(0).toUpperCase() + humanName.slice(1);

      const { error } = await supabase.from('tickets').insert([{
        title,
        description,
        category: 'Asset Replacement',
        priority: 'High',
        status: 'Pending',
        created_by: cleanEmail,
        emp_code: finalEmp,
        staff_name: humanName,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;
      
      await supabase.from('assets').update({ status: 'Replacement Requested' }).eq('id', asset.id);

      setShowReplaceModal(false);
      setReplaceReason('');
      setReplaceAssetId('');
      
      loadRealDatabase(false);

      toast.success("Replacement request submitted successfully.");
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmittingReplace(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-orange-500/15 backdrop-blur-md text-orange-600 font-extrabold border border-orange-400/40 shadow-sm';
    if (s === 'in progress') return 'bg-purple-500/15 backdrop-blur-md text-purple-600 font-extrabold border border-purple-400/40 shadow-sm';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-500/15 backdrop-blur-md text-emerald-600 font-extrabold border border-emerald-400/40 shadow-sm';
    return 'bg-slate-500/15 backdrop-blur-md text-slate-600 font-extrabold border border-slate-400/40 shadow-sm';
  };

  const getAssetAuditState = (asset: any) => {
    const status = (asset.live_inspection_status || '').toLowerCase();
    const auditWindow = getAuditWindowInfo(asset.category);
    
    if (asset.status?.toLowerCase().includes('return') || status.includes('return pending')) {
      return { disabled: true, text: "Return Pending", classes: "bg-slate-500/10 backdrop-blur-md text-slate-500 font-bold cursor-not-allowed border border-slate-400/30 shadow-sm" };
    }

    if (status.includes('reject') || status.includes('fail')) {
      return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-500/90 backdrop-blur-md hover:bg-rose-600 text-white font-bold cursor-pointer shadow-lg hover:shadow-rose-500/50 animate-pulse border-none" };
    }
    if (status.includes('re-inspection') || status.includes('action required')) {
      return { disabled: false, text: "Start Inspection", classes: "bg-amber-500/90 backdrop-blur-md hover:bg-amber-600 text-white font-bold cursor-pointer shadow-lg hover:shadow-amber-500/50 animate-pulse border-none" };
    }

    if (asset.isOverdue) {
      return { disabled: false, text: "Overdue: Audit Now", classes: "bg-rose-500/90 backdrop-blur-md hover:bg-rose-600 text-white font-bold cursor-pointer shadow-lg hover:shadow-rose-500/50 animate-pulse border-none" };
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

    if (hasAudited) return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-500/15 backdrop-blur-md text-emerald-600 border border-emerald-400/40 font-bold cursor-not-allowed shadow-sm" };
    
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens ${auditWindow.windowStart.toLocaleDateString()}`, classes: "bg-slate-500/10 backdrop-blur-md text-slate-500 font-bold border border-slate-400/30 shadow-sm cursor-not-allowed" };
    
    return { disabled: false, text: "Audit Device", classes: "bg-linear-to-r from-orange-500 to-purple-600 shadow-lg hover:shadow-orange-500/50 font-bold text-white cursor-pointer border-transparent" };
  };

  const requiresGlobalReinspection = assignedAssets.some(a => {
    const s = (a.live_inspection_status || '').toLowerCase();
    if (s.includes('return')) return false;
    return ['re-inspection', 'not approved', 'reject', 'action required'].some(val => s.includes(val)) || a.isOverdue;
  });
  const isGlobalAuditOpen = assignedAssets.some(a => getAuditWindowInfo(a.category).isOpen) || requiresGlobalReinspection;

  // 🎨 PURE MAC OS 2026 TRANSPARENT LIQUID GLASS THEME (CLEAN EDGES, NO PURPLE LINES)
  const theme = {
    bg: 'bg-transparent', 
    
    // Core structure panels (Clean, static glass. NO colored hover lines or neon dropshadows)
    glassCard: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-3xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-500' 
      : 'bg-white/40 backdrop-blur-3xl backdrop-saturate-[1.8] border border-white/60 shadow-[0_12px_40px_rgba(31,38,135,0.04),inset_0_1px_2px_rgba(255,255,255,0.7)] transition-all duration-500', 
    
    glassPanel: isDarkMode
      ? 'bg-zinc-900/30 backdrop-blur-3xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-500'
      : 'bg-white/40 backdrop-blur-3xl backdrop-saturate-[1.8] border border-white/60 shadow-[0_12px_40px_rgba(31,38,135,0.04),inset_0_1px_2px_rgba(255,255,255,0.7)] transition-all duration-500',
      
    // Action Buttons (Header, Modals)
    glassButton: isDarkMode
      ? 'bg-zinc-800/50 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all text-white'
      : 'bg-white/60 backdrop-blur-2xl border border-white/90 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-white hover:shadow-[0_4px_20px_rgba(255,255,255,0.6)] transition-all text-slate-800',
    
    // Internal Cards / Thumbnails (Clean glass pop on hover)
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-white/20 hover:bg-black/30 transition-all duration-300'
      : 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_20px_rgba(31,38,135,0.05),inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-white/80 hover:bg-white/60 transition-all duration-300',
      
    // Small Data Containers
    glassInner: isDarkMode
      ? 'bg-black/40 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition-colors'
      : 'bg-white/50 backdrop-blur-xl border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] transition-colors',
    
    glassInnerCard: isDarkMode 
      ? 'bg-black/40 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all' 
      : 'bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.02)] transition-all',
      
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  if (loading) return null; 
  if (!isAuthorized) return null; 

  return (
    <div className={`flex-1 flex flex-col w-full h-full p-4 lg:p-6 gap-5 overflow-hidden lg:min-h-0 z-10 font-sans ${theme.bg} transition-colors duration-1000`}>
      
      {/* 🌟 HEADER WITH SYNC BUTTON */}
      <div className={`${theme.glassCard} rounded-4xl p-5 md:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 transition-all`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${theme.text}`}>Welcome back, {formatDisplayName(currentUser.name)} 👋</h1>
          <div className={`flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs sm:text-sm font-semibold ${theme.subText}`}>
            <span className="text-white font-extrabold uppercase tracking-wider px-3 py-1 bg-purple-500/80 backdrop-blur-md rounded-md shadow-sm border border-purple-400/50">ID: {currentUser.emp_id}</span>
            <span className="font-bold">{currentUser.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => loadRealDatabase(true)} 
            disabled={isRefreshing}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${theme.glassButton}`}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Sync Feeds
          </button>
        </div>
      </div>

      {/* 🌟 ACTION THUMBNAILS & STATS */}
      <div className="flex flex-col xl:flex-row gap-5 shrink-0">
        
        {/* Quick Actions */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'IT failure', icon: Ticket, color: 'text-purple-600', type: 'TICKET', isActionDisabled: false, path: null },
            { name: 'Device Audit', desc: requiresGlobalReinspection ? 'Action Required' : (isGlobalAuditOpen ? 'Submit inspection' : 'Window Closed'), icon: ClipboardCheck, color: requiresGlobalReinspection ? 'text-rose-600 animate-pulse' : (isGlobalAuditOpen ? 'text-amber-600' : 'text-slate-500'), type: 'INSPECTION', isActionDisabled: !isGlobalAuditOpen, path: null },
            { name: 'Request Gear', desc: 'New equipment', icon: PlusCircle, color: 'text-emerald-600', type: 'REQUEST', isActionDisabled: false, path: null },
            { name: 'Team Screen', desc: 'Remote access', icon: Monitor, color: 'text-orange-600', type: 'ROUTE', isActionDisabled: false, path: '/staff/dashboard/remote' },
          ].map((item) => (
            <button 
              key={item.name} 
              onClick={() => { if (item.isActionDisabled) return; if (item.path) { router.push(item.path); } else { setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] }); } }} 
              disabled={item.isActionDisabled}
              className={`relative ${theme.glassItem} min-h-24 p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 ease-out group ${item.isActionDisabled ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : 'hover:-translate-y-1'}`}
            >
              <div className="flex items-start justify-between w-full">
                <div className={`p-3 rounded-2xl transition-all duration-300 ${item.isActionDisabled ? '' : 'group-hover:scale-110'} ${theme.glassInnerCard} ${item.color}`}>
                  {item.isActionDisabled ? <Lock size={18} /> : <item.icon size={18} strokeWidth={2.5} />}
                </div>
                {!item.isActionDisabled && (
                  <div className={`p-1.5 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-white/5 text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-200' : 'bg-white/50 border border-white/60 text-slate-500 group-hover:bg-purple-500/10 group-hover:text-purple-600 group-hover:border-purple-300'}`}>
                    <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </div>
              <div className="text-left w-full mt-2">
                <h3 className={`font-bold text-[13px] tracking-tight leading-tight transition-colors ${item.isActionDisabled ? theme.subText : theme.text}`}>{item.name}</h3>
                <p className={`text-[10px] font-bold mt-0.5 leading-snug line-clamp-1 ${theme.subText}`}>{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Key Stats */}
        <div className="xl:w-1/3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t xl:border-t-0 xl:border-l pt-4 xl:pt-0 xl:pl-5 border-white/50 dark:border-white/10">
          <div className={`${theme.glassCard} min-h-24 p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 group`}>
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl text-purple-600 shadow-sm group-hover:scale-110 transition-transform ${theme.glassInnerCard}`}><Laptop size={18} strokeWidth={2.5} /></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Assigned</span>
            </div>
            <div>
              <h2 className={`text-3xl font-black leading-none mb-1 ${theme.text}`}>{stats.totalAssets}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Hardware Units</p>
            </div>
          </div>
          
          <div className={`${theme.glassCard} min-h-24 p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 group`}>
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl text-amber-600 shadow-sm group-hover:scale-110 transition-transform ${theme.glassInnerCard}`}><AlertCircle size={18} strokeWidth={2.5} /></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Action Req.</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-amber-600 dark:text-amber-500 leading-none mb-1">{stats.needsInspection}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Pending Tasks</p>
            </div>
          </div>

          <div className={`${theme.glassCard} min-h-24 p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 group`}>
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl text-orange-600 shadow-sm group-hover:scale-110 transition-transform ${theme.glassInnerCard}`}><Ticket size={18} strokeWidth={2.5} /></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Open Tix</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-orange-600 dark:text-orange-500 leading-none mb-1">{stats.openTickets}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Active Tickets</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 MAIN SPLIT VIEW (Hardware Units vs Tickets) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:min-h-0 pt-1">
        
        {/* LEFT: MY HARDWARE UNITS */}
        <div className="w-full lg:w-2/3 flex flex-col lg:min-h-0">
          <div className={`${theme.glassPanel} rounded-4xl p-5 md:p-6 flex-1 flex flex-col lg:min-h-0`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <div className={`flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider ${theme.text}`}>
                <Laptop className="text-purple-500 shrink-0" size={18}/> My Hardware Units
              </div>
              <span className={`text-xs font-bold ${theme.subText}`}>{assignedAssets.length} Total</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {assignedAssets.length === 0 ? (
                <div className={`py-10 text-center font-bold text-xs ${theme.subText}`}>No active assets linked to your account.</div>
              ) : (
                assignedAssets.map(asset => {
                  const btnState = getAssetAuditState(asset);
                  const isReInspect = (asset.computed_status || '').toLowerCase().includes('re-inspection');
                  const isRejected = (asset.computed_status || '').toLowerCase().includes('reject');
                  
                  const currentStatus = (asset.status || '').toLowerCase();
                  const inspStatus = (asset.live_inspection_status || '').toLowerCase();
                  
                  const isReturnPending = currentStatus.includes('return') || inspStatus.includes('return pending');
                  const isReturnRejected = currentStatus.includes('reject') || inspStatus.includes('reject');

                  return (
                    <div key={asset.id} className={`${theme.glassItem} p-5 rounded-4xl`}>
                      
                      <div className="flex justify-between items-start gap-3">
                        <h4 className={`font-extrabold text-base tracking-tight leading-tight ${theme.text}`}>
                          {asset.name || asset.asset_name || asset.model || 'Generic Device'}
                        </h4>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 shadow-sm ${
                          isReturnRejected ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                          isReturnPending ? 'bg-orange-500/10 text-orange-600 border-orange-500/30' :
                          isRejected ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' :
                          isReInspect ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse' :
                          asset.isOverdue ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse' :
                          (asset.computed_status || '').toLowerCase() === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
                          'bg-slate-500/10 text-slate-600 border-slate-500/30'
                        }`}>
                          {isReturnRejected ? 'Return Rejected' : isReturnPending ? 'Pending Return' : isRejected ? 'Rejected' : isReInspect ? 'Re-Inspection' : asset.isOverdue ? 'Overdue' : (asset.computed_status || 'Pending')}
                        </span>
                      </div>

                      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl mt-4 ${theme.glassInnerCard}`}>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Tag ID</span><span className={`font-mono text-xs font-bold wrap-break-word ${theme.text}`}>{asset.asset_tag || 'N/A'}</span></div>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Category</span><span className={`text-xs font-bold wrap-break-word ${theme.text}`}>{asset.category || 'N/A'}</span></div>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Updated</span><span className={`text-xs font-bold ${theme.text}`}>{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'N/A'}</span></div>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Next Due</span><span className={`text-xs font-bold ${asset.isOverdue ? 'text-rose-500 animate-pulse' : theme.text}`}>{asset.nextDue ? asset.nextDue.toLocaleDateString('en-IN') : 'N/A'}</span></div>
                      </div>
                      
                      { (isRejected || isReInspect) && asset.live_admin_remarks && (
                        <div className={`p-4 mt-4 rounded-2xl border text-xs font-bold flex gap-3 ${isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-700'}`}>
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] uppercase tracking-widest opacity-80 mb-0.5">Admin Request Reason:</span>
                            {asset.live_admin_remarks}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-4 justify-end">
                        
                        {isReturnPending && !isReturnRejected ? (
                          <div className="flex flex-col items-center gap-1">
                            <button disabled className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all cursor-not-allowed opacity-60 ${theme.glassButton}`}>
                              Pending Admin
                            </button>
                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest text-center leading-tight animate-pulse mt-1">
                              Already Submitted<br/>Wait for Response
                            </span>
                          </div>
                        ) : isReturnRejected ? (
                          <button 
                            onClick={async () => {
                              await supabase.from('assets').update({ status: 'Assigned', inspection_status: null }).eq('id', asset.id);
                              loadRealDatabase();
                              setModal({ isOpen: true, type: 'RETURN', targetAsset: asset });
                            }}
                            className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer ${theme.glassButton} text-rose-600!`}
                          >
                            <AlertTriangle size={14} /> Rejected (Retry)
                          </button>
                        ) : (
                          <button 
                            onClick={() => setModal({ isOpen: true, type: 'RETURN', targetAsset: asset })}
                            className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all cursor-pointer ${theme.glassButton} text-orange-600!`}
                          >
                            Return
                          </button>
                        )}

                        <button 
                          disabled={isReturnPending && !isReturnRejected}
                          onClick={() => {
                            setReplaceAssetId(asset.id);
                            setShowReplaceModal(true);
                          }}
                          className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all ${
                            (isReturnPending && !isReturnRejected)
                              ? 'opacity-60 cursor-not-allowed ' + theme.glassButton
                              : `${theme.glassButton} text-purple-600! cursor-pointer`
                          }`}
                        >
                          Replace
                        </button>

                        <button 
                          disabled={btnState.disabled}
                          onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                          className={`px-6 py-2.5 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] ${btnState.classes}`}
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
        <div className="w-full lg:w-1/3 flex flex-col lg:min-h-0 pb-4 lg:pb-0">
          <div className={`${theme.glassPanel} rounded-4xl p-5 md:p-6 flex-1 flex flex-col lg:min-h-0`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 transition-colors duration-500 ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
              <div className={`flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider ${theme.text}`}><Ticket className="text-orange-500 shrink-0" size={18}/> My Tickets</div>
              <span className={`text-xs font-bold ${theme.subText}`}>{myTickets.length} Raised</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {myTickets.length === 0 ? (
                <div className={`py-10 text-center font-bold text-xs ${theme.subText}`}>No service requests submitted yet.</div>
              ) : (
                myTickets.map(tix => {
                  const isResolved = ['resolved', 'closed'].includes((tix.status || '').toLowerCase());
                  return (
                    <div key={tix.id} className={`p-5 rounded-3xl transition-colors space-y-4 ${theme.glassItem}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className={`font-extrabold text-sm leading-snug wrap-break-word ${theme.text}`}>{tix.title || tix.subject}</span>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border shrink-0 shadow-sm ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                      </div>
                      
                      <p className={`text-xs font-semibold line-clamp-3 wrap-break-word ${theme.subText}`}>{tix.description || tix.note}</p>

                      {(tix.admin_remarks || tix.admin_notes || tix.resolution_notes) && (
                        <div className={`p-4 rounded-2xl border text-xs ${theme.glassInner}`}>
                          <strong className={`block mb-1.5 ${theme.text}`}>Admin Response:</strong>
                          <span className="font-medium text-slate-800 dark:text-slate-300 wrap-break-word">{tix.admin_remarks || tix.admin_notes || tix.resolution_notes}</span>
                        </div>
                      )}

                      {isResolved && (
                        <div className={`flex flex-col gap-2 pt-3 border-t ${isDarkMode ? 'border-white/10' : 'border-white/30'}`}>
                          {tix.updated_at && (
                              <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme.subText}`}>
                                <Clock size={12}/> Resolved in: {formatDuration(tix.created_at, tix.updated_at)}
                              </div>
                          )}

                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest mr-2 ${theme.subText}`}>Rate Support:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                disabled={!!tix.rating}
                                onClick={() => handleRateTicket(tix.id, star)}
                                className={`transition-all ${tix.rating ? 'cursor-default' : 'cursor-pointer hover:scale-125 hover:drop-shadow-lg'}`}
                              >
                                <Star size={16} className={star <= (tix.rating || 0) ? "fill-amber-400 text-amber-400" : "text-white drop-shadow-md dark:text-zinc-600"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={`flex items-center justify-between text-[10px] uppercase tracking-widest pt-3 font-bold border-t ${isDarkMode ? 'border-white/10 text-zinc-500' : 'border-white/30 text-slate-500'}`}>
                        <span className="wrap-break-word">Category: <strong className={theme.text}>{tix.category || 'General'}</strong></span>
                        <span className="shrink-0">{tix.created_at ? new Date(tix.created_at).toLocaleDateString() : 'Just now'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
      
      {/* 🌟 UPGRADED COMPACT PURE LIQUID GLASS DATABASE MODAL */}
      <AnimatePresence>
        {modal.isOpen && (
          <LiveDatabaseModal 
            type={modal.type} 
            asset={modal.targetAsset} 
            user={currentUser} 
            isDarkMode={isDarkMode}
            assignedAssets={assignedAssets}
            setAssignedAssets={setAssignedAssets} 
            onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(false); }} 
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* 🌟 COMPACT PURE LIQUID GLASS REPLACEMENT MODAL FOR STAFF DASHBOARD */}
      <AnimatePresence>
        {showReplaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReplaceModal(false)}
              className={`absolute inset-0 ${isDarkMode ? 'bg-black/40' : 'bg-slate-900/20'} backdrop-blur-md`}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-120 max-h-[80vh] sm:max-h-[85vh] rounded-4xl flex flex-col overflow-hidden ${theme.glassCard}`}
            >
              <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-3xl flex items-center justify-center ${
                    isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-inner text-purple-500'
                  }`}>
                     <PackageOpen size={24} strokeWidth={2} />
                  </div>
                  <h2 className={`text-[14px] sm:text-[16px] font-black uppercase tracking-widest ${theme.textMain}`}>
                    Assets Replacement
                  </h2>
                </div>
                <button 
                  onClick={() => setShowReplaceModal(false)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className={`h-px w-full shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-white/40'}`} />

              <form id="replacementForm" onSubmit={handleReplacementSubmit} className="px-6 py-4 sm:px-8 sm:py-5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 custom-scrollbar">
                
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                    Select Assigned Asset
                  </label>
                  <div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all ${theme.glassInnerCard}`}>
                    <select
                      value={replaceAssetId}
                      onChange={(e) => setReplaceAssetId(e.target.value)}
                      required
                      className={`w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}
                    >
                      <option value="" disabled className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Choose Hardware...</option>
                      {assignedAssets.map(asset => (
                        <option key={asset.id} value={asset.id} className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">
                          {asset.name || asset.asset_name} ({asset.asset_tag})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} className={`absolute right-4 pointer-events-none ${theme.textSub}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {replaceAssetId && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: -5 }} 
                      animate={{ opacity: 1, height: 'auto', marginTop: 0 }} 
                      exit={{ opacity: 0, height: 0, marginTop: -5 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl flex gap-4 ${theme.glassInnerCard}`}>
                        <div className="flex-1 space-y-1">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest block ${theme.textSub}`}>Tag ID</span>
                          <span className={`text-[11px] sm:text-[13px] font-bold wrap-break-word ${theme.textMain}`}>
                            {assignedAssets.find(a => String(a.id) === replaceAssetId)?.asset_tag}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest block ${theme.textSub}`}>Serial Number</span>
                          <span className={`text-[11px] sm:text-[13px] font-bold wrap-break-word ${theme.textMain}`}>
                            {assignedAssets.find(a => String(a.id) === replaceAssetId)?.serial_number || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                    Detailed Explanation
                  </label>
                  <textarea
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value)}
                    required
                    placeholder="Describe what happened..."
                    className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-2xl text-[12px] sm:text-[14px] font-semibold transition-all outline-none min-h-17.5 sm:min-h-20 resize-none ${theme.glassInnerCard} ${
                      isDarkMode ? 'placeholder-zinc-500 text-white' : 'placeholder-[#818b9c] text-[#0f172a]'
                    }`}
                  />
                </div>

              </form>

              <div className={`h-px w-full shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-white/40'}`} />

              <div className="px-6 py-4 sm:px-8 sm:py-5 flex justify-center items-center gap-3 sm:gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowReplaceModal(false)}
                  className={`flex-1 py-3.5 rounded-3xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="replacementForm"
                  disabled={isSubmittingReplace || !replaceAssetId || !replaceReason.trim()}
                  className="flex-1 py-3.5 bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-3xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 border-0"
                >
                  {isSubmittingReplace ? <Loader2 size={16} className="animate-spin" /> : 'Transmit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 🌟 UPGRADED COMPACT PURE LIQUID GLASS MODAL (Reused for Ticket, Return, Inspect, Request)
function LiveDatabaseModal({ type, asset, user, isDarkMode, assignedAssets, setAssignedAssets, onClose, theme }: any) {
  const needsLock = type === 'INSPECTION';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [selectedReturnId, setSelectedReturnId] = useState(asset?.id || (assignedAssets?.[0]?.id || ''));

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [screenshot, setScreenshot] = useState<File | null>(null); 
  
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  const handleAttemptUnlock = () => {
    if (!asset) { alert("No hardware assigned to test against!"); return; }
    if (user.id === 'guest-mock-uuid') { setLockError(false); setIsUnlocked(true); return; }
    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number||'').toLowerCase() || typed === (asset.asset_tag||'').toLowerCase()) { setLockError(false); setIsUnlocked(true); } else setLockError(true);
  };

  const generateMobileHandoff = () => {
    const baseUrl = window.location.origin;
    const cat = asset?.category || formCategory;
    const url = `${baseUrl}/mobile-audit?assetId=${asset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(formText)}&auditType=${type}`;
    setQrUrl(url); setShowQR(true);
  };

  const handleLivePostgresSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (type === 'RETURN') {
      const targetAsset = assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId));
      if (!targetAsset) return;

      const confirmed = window.confirm(
        `WARNING: VERIFY SERIAL NUMBER\n\nAre you sure your physical asset's Serial Number matches this serial number?\n\nAsset: ${targetAsset.name || targetAsset.asset_name}\nTag ID: ${targetAsset.asset_tag}\nSerial Number: ${targetAsset.serial_number || 'N/A'}\n\nClick OK if it matches exactly.`
      );

      if (!confirmed) {
        toast.error("Return aborted. Serial numbers must match.");
        return; 
      }

      try {
        await supabase.from('assets').update({ status: 'Pending Return' }).eq('id', targetAsset.id);
        if (setAssignedAssets) setAssignedAssets((prev: any[]) => prev.map((a: any) => a.id === targetAsset.id ? { ...a, status: 'Pending Return' } : a));
        
        const baseUrl = window.location.origin;
        const cat = targetAsset.category;
        const finalNotes = `[RETURN REQUEST] ${formText}`;
        const url = `${baseUrl}/mobile-audit?assetId=${targetAsset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(finalNotes)}&auditType=${type}`;
        setQrUrl(url); setShowQR(true);
      } catch(e) {
        toast.error("Error submitting return request.");
      }
      return;
    }

    if (type === 'INSPECTION') {
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
        const { error } = await supabase.from('tickets').insert({ 
          title: formTitle || 'IT Support Ticket', 
          category: formCategory, 
          description: formText || 'No details given', 
          status: 'Open', 
          created_by: cleanEmail, 
          emp_code: finalEmp, 
          staff_name: humanName 
        });
        submitError = error;
      } else if (type === 'REQUEST') {
        const { error } = await supabase.from('tickets').insert({ 
          title: `Asset Request: ${formCategory}`, 
          category: `Request: ${formCategory}`, 
          description: formText || `Staff requested ${formCategory}`, 
          status: 'Pending', 
          created_by: cleanEmail, 
          emp_code: finalEmp, 
          staff_name: humanName 
        });
        submitError = error;
      }
      if (submitError) throw submitError;
      setSuccessDone(true); setTimeout(() => onClose(), 1200);
    } catch (e: any) { alert(`Database Error: ${e.message || JSON.stringify(e)}`); } finally { setIsTransmitting(false); }
  };

  const getHeaderIcon = () => {
    if (type === 'RETURN') return <LogOut size={24} strokeWidth={2} />;
    if (type === 'REQUEST') return <PlusCircle size={24} strokeWidth={2} />;
    if (type === 'INSPECTION') return <ClipboardCheck size={24} strokeWidth={2} />;
    return <Ticket size={24} strokeWidth={2} />;
  };

  const getHeaderColors = () => {
    if (type === 'RETURN') return isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-white/80 border border-white text-orange-500 shadow-inner';
    if (type === 'REQUEST') return isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/80 border border-white text-emerald-500 shadow-inner';
    if (type === 'INSPECTION') return isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/80 border border-white text-amber-500 shadow-inner';
    return isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-white/80 border border-white text-purple-500 shadow-inner';
  };

  const getTitle = () => {
    if (type === 'RETURN') return 'Asset Return Request';
    if (type === 'REQUEST') return 'Request New Gear';
    if (type === 'INSPECTION') return 'Device Compliance Audit';
    return 'Raise Support Ticket';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className={`absolute inset-0 ${isDarkMode ? 'bg-black/40' : 'bg-slate-900/20'} backdrop-blur-md`}
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className={`relative w-full max-w-120 max-h-[80vh] sm:max-h-[85vh] rounded-4xl flex flex-col overflow-hidden ${theme.glassCard}`}
      >
        <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] sm:rounded-3xl flex items-center justify-center ${getHeaderColors()}`}>
               {getHeaderIcon()}
            </div>
            <div>
              <h2 className={`text-[14px] sm:text-[16px] font-black uppercase tracking-widest ${theme.textMain}`}>{getTitle()}</h2>
              {type !== 'RETURN' && <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 ${theme.subText}`}>{type === 'INSPECTION' ? 'Visual verification' : 'Portal Submission'}</p>}
              {type === 'RETURN' && <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 ${theme.subText}`}>Initiate IT Handover</p>}
            </div>
          </div>
          <button onClick={onClose} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}>
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className={`h-px w-full shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-white/40'}`} />

        <div className="px-6 py-4 sm:px-8 sm:py-5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 custom-scrollbar">
          {successDone ? (
            <div className="py-10 text-center space-y-4">
              <CheckCircle2 size={72} className="text-emerald-500 mx-auto animate-bounce"/>
              <h4 className={`text-xl sm:text-2xl font-black ${theme.textMain}`}>Database Updated!</h4>
            </div>
          ) : showQR ? (
            <div className="py-4 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div>
                <h4 className={`text-base sm:text-lg font-black uppercase tracking-widest ${theme.textMain}`}>Mobile Device Handoff</h4>
                <p className={`text-[11px] sm:text-xs font-bold mt-1.5 ${theme.subText}`}>Scan this code with your phone camera to take certified watermark photos of the asset.</p>
              </div>
              <div className={`p-4 sm:p-5 rounded-4xl inline-block shadow-[0_16px_40px_rgba(0,0,0,0.1)] mx-auto border ${isDarkMode ? 'bg-white/90 border-white/20' : 'bg-white border-white'}`}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Scan to Audit" className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl" />
              </div>
              <div className={`p-4 sm:p-5 rounded-[1.25rem] text-left transition-all ${theme.glassInnerCard}`}>
                <h5 className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`}><Camera size={16}/> Photo Requirements</h5>
                <ul className={`text-[11px] sm:text-xs font-bold space-y-2 ml-1 ${theme.textMain}`}>
                  {(asset?.category || '').toLowerCase().includes('laptop') ? (
                    <><li>✅ Screen & Keypad view</li><li>✅ Top and Bottom (with Tag)</li><li>✅ Left and Right Side Ports</li></>
                  ) : (
                    <><li>✅ Clear Front / Top View</li><li>✅ Bottom View (showing Asset Tag)</li></>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <form id="genericModalForm" onSubmit={handleLivePostgresSubmit} className="space-y-3 sm:space-y-4">
              
              {needsLock && (
                <div className={`p-4 sm:p-5 rounded-3xl space-y-3 transition-all ${theme.glassInnerCard}`}>
                  <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-500'}`}>🔒 Security Verification Required</p>
                  <div className="flex gap-2 sm:gap-3">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder={user.id === 'guest-mock-uuid' ? 'Type anything for Guest...' : 'Type exact Tag ID or S/N...'} className={`flex-1 px-4 sm:px-5 py-3.5 rounded-2xl text-[12px] sm:text-[13px] font-bold outline-none transition-all ${isDarkMode ? 'bg-zinc-900/60 text-white placeholder-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]' : 'bg-white/40 text-[#0f172a] placeholder-[#818b9c] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-white/60'}`}/>
                    {!isUnlocked && <button type="button" onClick={handleAttemptUnlock} className="px-5 sm:px-6 bg-linear-to-r from-rose-500 to-rose-600 hover:opacity-90 text-white font-black uppercase tracking-widest text-[10px] sm:text-[11px] rounded-2xl cursor-pointer transition-all shadow-[0_4px_15px_rgba(244,63,94,0.4)] hover:shadow-[0_0_20px_rgba(244,63,94,0.6)] border-0">Verify</button>}
                  </div>
                  {lockError && <p className="text-[10px] sm:text-[11px] text-rose-500 font-bold px-1">Incorrect device code.</p>}
                </div>
              )}

              {type === 'RETURN' && (
                <>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                      Select Assigned Asset
                    </label>
                    <div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all ${theme.glassInnerCard}`}>
                      <select
                        value={selectedReturnId}
                        onChange={(e) => setSelectedReturnId(e.target.value)}
                        required
                        className={`w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}
                      >
                        <option value="" disabled className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Choose Hardware...</option>
                        {assignedAssets?.map((a: any) => (
                          <option key={a.id} value={a.id} className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">
                            {a.name || a.asset_name} ({a.asset_tag})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className={`absolute right-4 pointer-events-none ${theme.textSub}`} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedReturnId && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: -5 }} 
                        animate={{ opacity: 1, height: 'auto', marginTop: 0 }} 
                        exit={{ opacity: 0, height: 0, marginTop: -5 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-4 sm:px-5 py-3 sm:py-4 rounded-2xl flex gap-4 ${theme.glassInnerCard}`}>
                          <div className="flex-1 space-y-1">
                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest block ${theme.textSub}`}>Tag ID</span>
                            <span className={`text-[11px] sm:text-[13px] font-bold wrap-break-word ${theme.textMain}`}>
                              {assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId))?.asset_tag}
                            </span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest block ${theme.textSub}`}>Serial Number</span>
                            <span className={`text-[11px] sm:text-[13px] font-bold wrap-break-word ${theme.textMain}`}>
                              {assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId))?.serial_number || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {type === 'TICKET' && (
                <>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Issue Subject</label>
                    <input value={formTitle} onChange={e=>setFormTitle(e.target.value)} required placeholder="E.g. Monitor display flickering" className={`w-full px-4 sm:px-5 py-3.5 rounded-2xl outline-none text-[12px] sm:text-[14px] font-semibold transition-all ${theme.glassInnerCard} ${isDarkMode ? 'placeholder-zinc-500 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' : 'placeholder-[#818b9c] text-[#0f172a] shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border border-white/60'}`}/>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Category</label>
                    <div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all ${theme.glassInnerCard}`}>
                      <select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className={`w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}>
                        <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Hardware</option>
                        <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Software</option>
                        <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Network</option>
                      </select>
                      <ChevronDown size={18} className={`absolute right-4 pointer-events-none ${theme.textSub}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Attach Screenshot (Optional)</label>
                    <label className={`w-full p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 border-2 border-dashed transition-all cursor-pointer ${theme.glassInnerCard} ${isDarkMode ? 'border-zinc-700 hover:border-purple-500' : 'border-white/80 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]'}`}>
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                       <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-zinc-800' : 'bg-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] border border-white'}`}>
                         {screenshot ? <ImagePlus size={16} className="text-purple-500" /> : <UploadCloud size={16} className={theme.textSub} />}
                       </div>
                       <span className={`text-[11px] sm:text-[12px] font-bold text-center ${screenshot ? 'text-purple-500' : theme.textMain}`}>
                         {screenshot ? screenshot.name : "Click to upload"}
                       </span>
                    </label>
                  </div>
                </>
              )}

              {type === 'REQUEST' && (
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Equipment Category</label>
                  <div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all ${theme.glassInnerCard}`}>
                    <select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className={`w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Laptop / PC</option>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Monitor</option>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Keyboard / Mouse</option>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Headset / Audio</option>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Other Accessory</option>
                    </select>
                    <ChevronDown size={18} className={`absolute right-4 pointer-events-none ${theme.textSub}`} />
                  </div>
                </div>
              )}

              {(type === 'INSPECTION' || type === 'RETURN') && isUnlocked && (
                <div className="flex flex-col gap-1.5 sm:gap-2 animate-in slide-in-from-top-4 duration-300">
                  <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Current Asset Condition</label>
                  <div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all ${theme.glassInnerCard}`}>
                    <select value={formCondition} onChange={e=>setFormCondition(e.target.value)} className={`w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Pristine / Flawless</option>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Good / Minor Scratches</option>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Poor / Damaged (Requires Fix)</option>
                      <option className="bg-white text-slate-900 font-bold dark:bg-zinc-900 dark:text-zinc-100">Non-Functional / Dead</option>
                    </select>
                    <ChevronDown size={18} className={`absolute right-4 pointer-events-none ${theme.textSub}`} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                  {type === 'INSPECTION' ? 'Audit Notes' : type === 'RETURN' ? 'Return Reason & Notes' : type === 'REQUEST' ? 'Business Justification' : 'Detailed Explanation'}
                </label>
                <textarea rows={3} value={formText} onChange={e=>setFormText(e.target.value)} required placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : type === 'RETURN' ? "Provide reason for returning..." : "Describe what happened..."} className={`w-full px-4 sm:px-5 py-3.5 rounded-2xl text-[12px] sm:text-[14px] font-semibold transition-all outline-none resize-none min-h-17.5 sm:min-h-20 ${theme.glassInnerCard} ${isDarkMode ? 'placeholder-zinc-500 text-white shadow-inner' : 'placeholder-[#818b9c] text-[#0f172a] shadow-inner border border-white/60'}`}/>
              </div>
            </form>
          )}
        </div>

        {!successDone && (
          <>
            <div className={`h-px w-full shrink-0 ${isDarkMode ? 'bg-white/10' : 'bg-white/40'}`} />

            <div className="px-6 py-4 sm:px-8 sm:py-5 flex justify-center items-center gap-3 sm:gap-4 shrink-0 relative z-10">
              {showQR ? (
                <button onClick={onClose} className={`w-full py-3.5 rounded-3xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>
                  Close Portal
                </button>
              ) : (
                <>
                  <button onClick={onClose} className={`flex-1 py-3.5 rounded-3xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    form="genericModalForm"
                    disabled={isTransmitting || (needsLock && !isUnlocked)} 
                    className={`flex-1 py-3.5 text-white rounded-3xl text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 border-0 ${
                      type === 'RETURN' 
                        ? 'bg-linear-to-r from-orange-400 to-orange-500 shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]' 
                        : type === 'REQUEST'
                        ? 'bg-linear-to-r from-emerald-400 to-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]'
                        : 'bg-linear-to-r from-purple-500 to-purple-600 shadow-[0_4px_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]'
                    }`}
                  >
                    {isTransmitting ? <Loader2 size={16} className="animate-spin" /> : (type === 'INSPECTION' || type === 'RETURN' ? 'Generate QR' : 'Transmit')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}