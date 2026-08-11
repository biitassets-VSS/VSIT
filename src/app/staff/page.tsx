'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, CheckCircle2, AlertTriangle, 
  Loader2, Lock, Monitor, LogOut, Star, Camera, ArrowRight,
  ChevronDown, PackageOpen, ImagePlus, UploadCloud, ChevronLeft, QrCode, RefreshCcw
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

// 🌟 CUSTOM LIQUID GLASS DROPDOWN COMPONENT (Replaces Native <select>)
function GlassDropdown({ value, onChange, options, isDarkMode, theme }: any) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full">
      {/* Click Away Overlay */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      
      {/* Dropdown Trigger */}
      <div 
        onClick={() => setOpen(!open)}
        className={`relative z-40 w-full px-4 sm:px-5 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all cursor-pointer rounded-2xl flex items-center justify-between select-none ${theme.glassInnerCard}`}
      >
        <span className={`truncate ${theme.textMain}`}>{value}</span>
        <ChevronDown size={18} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''} ${theme.textSub}`} />
      </div>

      {/* Dropdown Options (True Blur) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-60 w-full mt-2 rounded-2xl overflow-hidden shadow-2xl border ${isDarkMode ? 'bg-zinc-800/50 backdrop-blur-2xl border-white/10' : 'bg-white/50 backdrop-blur-2xl border-white/60 shadow-[0_16px_40px_rgba(0,0,0,0.1)]'}`}
          >
            {options.map((opt: string) => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`px-5 py-3.5 text-sm font-semibold cursor-pointer transition-colors ${isDarkMode ? 'text-zinc-200 hover:bg-white/10' : 'text-slate-800 hover:bg-white/60'}`}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StaffDashboardPage() {
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, openTickets: 0 });

  // Tickets & Inspections Modal
  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({ isOpen: false, type: '' });

  // 🌟 Unified QR & Photo Sync State
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [remotePhotos, setRemotePhotos] = useState<string[]>([]);
  const [localPhotos, setLocalPhotos] = useState<File[]>([]);
  
  // Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedReturnAsset, setSelectedReturnAsset] = useState<any>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState('Pristine / Flawless');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Replace Modal State
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedReplaceAsset, setSelectedReplaceAsset] = useState<any>(null);
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceCondition, setReplaceCondition] = useState('Minor Hardware Issue');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

  // 🌟 THEME SYNC
  useEffect(() => {
    setMounted(true);
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

  // 🌟 Realtime Photo Sync for QR
  useEffect(() => {
    if (!qrSessionId) return;
    const photoChannel = supabase.channel(`qr_session_${qrSessionId}`)
      .on('broadcast', { event: 'photo_uploaded' }, (payload) => {
        if (payload.payload?.url) {
          setRemotePhotos(prev => [...prev, payload.payload.url]);
        }
      }).subscribe();
    return () => { supabase.removeChannel(photoChannel); };
  }, [qrSessionId]);

  const handleRateTicket = async (ticketId: string, rating: number) => {
    try {
      await supabase.from('tickets').update({ rating }).eq('id', ticketId);
      setMyTickets(prev => prev.map(t => t.id === ticketId ? { ...t, rating } : t));
      toast.success("Thank you for rating our IT support!");
    } catch (e) { console.error(e); }
  };

  // 🌟 Upload Helper
  const uploadMultiplePhotos = async (files: File[]) => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from('attachments').upload(`asset-attachments/${fileName}`, file);
        if (!error) {
          const { data } = supabase.storage.from('attachments').getPublicUrl(`asset-attachments/${fileName}`);
          uploadedUrls.push(data.publicUrl);
        }
      } catch (error) { console.error("Upload failed", error); }
    }
    return uploadedUrls;
  };

  // 🌟 QR Handlers
  const handleGenerateQR = (asset: any, isReturn: boolean) => {
    if (isReturn && !returnNotes.trim()) return toast.error("Please provide a return reason.");
    if (!isReturn && !replaceReason.trim()) return toast.error("Please provide a replacement reason.");

    const requiredPhotos = (asset?.category || '').toLowerCase().includes('laptop') ? 5 : 2;
    const sessionId = crypto.randomUUID();
    setQrSessionId(sessionId);
    
    const uploadLink = `${window.location.origin}/mobile-verify?session=${sessionId}&req=${requiredPhotos}`;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uploadLink)}&color=0f172a&bgcolor=ffffff`);
  };

  const resetModals = () => {
    setReturnModalOpen(false);
    setReplaceModalOpen(false);
    setSelectedReturnAsset(null);
    setSelectedReplaceAsset(null);
    setQrUrl(null);
    setQrSessionId(null);
    setRemotePhotos([]);
    setLocalPhotos([]);
    setReturnNotes('');
    setReplaceReason('');
  };

  // 🌟 Unified Submit Handlers
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnAsset) return;
    setIsSubmittingReturn(true);

    try {
      const newUrls = await uploadMultiplePhotos(localPhotos);
      const allPhotos = [...remotePhotos, ...newUrls];
      const returnNoteStr = `[RETURN REQUEST] Condition: ${returnCondition} - ${returnNotes}`;

      await supabase.from('inspections').insert({
        asset_id: selectedReturnAsset.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_email: currentUser.email,
        emp_code: currentUser.emp_id,
        status: 'Return Pending Approval',
        condition: returnCondition,
        notes: returnNoteStr,
        photos: allPhotos.length > 0 ? allPhotos : null
      });

      await supabase.from('assets').update({ status: 'Return Pending Approval', notes: returnNoteStr }).eq('id', selectedReturnAsset.id);

      loadRealDatabase(false);
      resetModals();
      toast.success("Return request sent to Admin.");
    } catch (err: any) { toast.error(err.message); } finally { setIsSubmittingReturn(false); }
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReplaceAsset) return;
    setIsSubmittingReplace(true);

    try {
      const newUrls = await uploadMultiplePhotos(localPhotos);
      const allPhotos = [...remotePhotos, ...newUrls];

      await supabase.from('replacements').insert({
        old_asset_id: selectedReplaceAsset.id,
        asset_tag: selectedReplaceAsset.asset_tag,
        serial_number: selectedReplaceAsset.serial_number,
        user_id: currentUser.id,
        staff_name: currentUser.name,
        emp_code: currentUser.emp_id,
        condition: replaceCondition,
        reason: replaceReason,
        photos: allPhotos.length > 0 ? allPhotos : null,
        status: 'Pending Approval'
      });

      await supabase.from('assets').update({ status: 'Replacement Requested' }).eq('id', selectedReplaceAsset.id);

      loadRealDatabase(false);
      resetModals();
      toast.success("Replacement request sent to Admin.");
    } catch (err: any) { toast.error(err.message); } finally { setIsSubmittingReplace(false); }
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
      return { disabled: true, text: "Return Pending", classes: "bg-slate-500/10 text-slate-500 border border-slate-400/30 cursor-not-allowed" };
    }

    if (status.includes('reject') || status.includes('fail')) {
      return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-500/90 hover:bg-rose-600 text-white shadow-[0_4px_15px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
    }
    if (status.includes('re-inspection') || status.includes('action required')) {
      return { disabled: false, text: "Start Inspection", classes: "bg-amber-500/90 hover:bg-amber-600 text-white shadow-[0_4px_15px_rgba(245,158,11,0.4)] animate-pulse border-transparent" };
    }

    if (asset.isOverdue) {
      return { disabled: false, text: "Overdue: Audit Now", classes: "bg-rose-500/90 hover:bg-rose-600 text-white shadow-[0_4px_15px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
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

    if (hasAudited) return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-500/15 text-emerald-600 border border-emerald-400/40 cursor-not-allowed" };
    
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens ${auditWindow.windowStart.toLocaleDateString()}`, classes: "bg-slate-500/10 text-slate-500 border border-slate-400/30 cursor-not-allowed" };
    
    return { disabled: false, text: "Audit Device", classes: "bg-linear-to-r from-orange-500 to-purple-600 text-white shadow-[0_4px_15px_rgba(249,115,22,0.4)] border-transparent" };
  };

  const requiresGlobalReinspection = assignedAssets.some(a => {
    const s = (a.live_inspection_status || '').toLowerCase();
    if (s.includes('return')) return false;
    return ['re-inspection', 'not approved', 'reject', 'action required'].some(val => s.includes(val)) || a.isOverdue;
  });
  const isGlobalAuditOpen = assignedAssets.some(a => getAuditWindowInfo(a.category).isOpen) || requiresGlobalReinspection;

  // 🎨 STRICT TAILWIND V4 - HIGH-END LIQUID GLASS REFLECTIONS
  const theme = {
    bg: 'bg-transparent',
    
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all duration-500 rounded-[2rem]' 
      : 'bg-white/40 backdrop-blur-3xl backdrop-saturate-150 border border-white/60 shadow-[0_12px_40px_rgba(31,38,135,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] transition-all duration-500 rounded-[2rem]', 
    
    glassPanel: isDarkMode
      ? 'bg-zinc-900/30 backdrop-blur-3xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] transition-all duration-500 rounded-[2rem]'
      : 'bg-white/30 backdrop-blur-3xl backdrop-saturate-150 border border-white/50 shadow-[0_12px_40px_rgba(31,38,135,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:border-purple-400/80 hover:shadow-[0_0_35px_rgba(168,85,247,0.15)] transition-all duration-500 rounded-[2rem]',
      
    glassButton: isDarkMode
      ? 'bg-zinc-800/40 backdrop-blur-2xl border border-white/10 hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all text-white'
      : 'bg-white/50 backdrop-blur-2xl border border-white/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all text-slate-800',
    
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-purple-500/60 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] transition-all duration-300 rounded-[1.5rem]'
      : 'bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_8px_20px_rgba(31,38,135,0.03),inset_0_1px_1px_rgba(255,255,255,1)] hover:border-purple-400/80 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] transition-all duration-300 rounded-[1.5rem]',
      
    glassInnerCard: isDarkMode 
      ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all rounded-[1.25rem]' 
      : 'bg-white/60 backdrop-blur-2xl border border-white/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] transition-all rounded-[1.25rem]',
      
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  if (loading) return null; 
  if (!isAuthorized) return null; 

  const activeAsset = selectedReturnAsset || selectedReplaceAsset;
  const isLaptop = (activeAsset?.category || '').toLowerCase().includes('laptop');
  const REQUIRED_PHOTOS = isLaptop ? 5 : 2;
  const currentPhotoCount = remotePhotos.length + localPhotos.length;
  const hasEnoughPhotos = currentPhotoCount >= REQUIRED_PHOTOS;

  return (
    <div className={`flex-1 flex flex-col w-full h-full p-4 lg:p-6 gap-5 overflow-hidden lg:min-h-0 z-10 font-sans ${theme.bg} transition-colors duration-1000`}>
      
      {/* 🌟 HEADER */}
      <div className={`${theme.glassCard} p-5 md:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 transition-all`}>
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
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_15px_rgba(249,115,22,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] disabled:opacity-50 active:scale-95 ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/20' : 'bg-linear-to-r from-orange-500 to-purple-600 hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] text-white border-transparent'}`}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Sync Feeds
          </button>
        </div>
      </div>

      {/* 🌟 ACTION THUMBNAILS & STATS */}
      <div className="flex flex-col xl:flex-row gap-5 shrink-0">
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
              className={`relative ${theme.glassItem} min-h-24 p-4 flex flex-col justify-between transition-all duration-300 ease-out group ${item.isActionDisabled ? 'opacity-50 cursor-not-allowed hover:shadow-[0_8px_20px_rgba(31,38,135,0.03),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:border-white/50 hover:translate-y-0' : 'hover:-translate-y-1'}`}
            >
              <div className="flex items-start justify-between w-full">
                <div className={`p-3 transition-all duration-300 ${item.isActionDisabled ? '' : 'group-hover:scale-110'} ${theme.glassInnerCard} ${item.color}`}>
                  {item.isActionDisabled ? <Lock size={18} /> : <item.icon size={18} strokeWidth={2.5} />}
                </div>
                {!item.isActionDisabled && (
                  <div className={`p-1.5 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-white/5 text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-200' : 'bg-white/50 border border-white/60 text-slate-500 group-hover:bg-purple-500/10 group-hover:text-purple-600 group-hover:border-purple-300'}`}>
                    <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </div>
              <div className="text-left w-full mt-2">
                <h3 className={`font-bold text-[13px] tracking-tight leading-tight transition-colors ${item.isActionDisabled ? theme.subText : `${theme.text} group-hover:text-purple-600`}`}>{item.name}</h3>
                <p className={`text-[10px] font-bold mt-0.5 leading-snug line-clamp-1 ${theme.subText}`}>{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="xl:w-1/3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t xl:border-t-0 xl:border-l pt-4 xl:pt-0 xl:pl-5 border-white/50 dark:border-white/10">
          <div className={`${theme.glassCard} min-h-24 p-4 flex flex-col justify-between hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all duration-300 group`}>
            <div className="flex justify-between items-start">
              <div className={`p-3 text-purple-600 shadow-sm group-hover:scale-110 transition-transform ${theme.glassInnerCard}`}><Laptop size={18} strokeWidth={2.5} /></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Assigned</span>
            </div>
            <div>
              <h2 className={`text-3xl font-black leading-none mb-1 ${theme.text}`}>{stats.totalAssets}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Hardware Units</p>
            </div>
          </div>
          
          <div className={`${theme.glassCard} min-h-24 p-4 flex flex-col justify-between hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all duration-300 group`}>
            <div className="flex justify-between items-start">
              <div className={`p-3 text-amber-600 shadow-sm group-hover:scale-110 transition-transform ${theme.glassInnerCard}`}><AlertCircle size={18} strokeWidth={2.5} /></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Action Req.</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-amber-600 dark:text-amber-500 leading-none mb-1">{stats.needsInspection}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Pending Tasks</p>
            </div>
          </div>

          <div className={`${theme.glassCard} min-h-24 p-4 flex flex-col justify-between hover:border-orange-400 hover:shadow-[0_0_25px_rgba(249,115,22,0.3)] transition-all duration-300 group`}>
            <div className="flex justify-between items-start">
              <div className={`p-3 text-orange-600 shadow-sm group-hover:scale-110 transition-transform ${theme.glassInnerCard}`}><Ticket size={18} strokeWidth={2.5} /></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.subText}`}>Open Tix</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-orange-600 dark:text-orange-500 leading-none mb-1">{stats.openTickets}</h2>
              <p className={`text-[10px] font-bold ${theme.subText}`}>Active Tickets</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 MAIN SPLIT VIEW */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:min-h-0 pt-1">
        
        {/* LEFT: MY HARDWARE UNITS */}
        <div className="w-full lg:w-2/3 flex flex-col lg:min-h-0">
          <div className={`${theme.glassPanel} p-5 md:p-6 flex-1 flex flex-col lg:min-h-0 group/panel`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 transition-colors duration-500 ${isDarkMode ? 'border-white/10 group-hover/panel:border-purple-500/50' : 'border-white/40 group-hover/panel:border-purple-400/80'}`}>
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
                  const isReplacePending = currentStatus.includes('replacement requested');

                  return (
                    <div key={asset.id} className={`${theme.glassItem} p-5`}>
                      
                      <div className="flex justify-between items-start gap-3">
                        <h4 className={`font-extrabold text-base tracking-tight leading-tight ${theme.text}`}>
                          {asset.name || asset.asset_name || asset.model || 'Generic Device'}
                        </h4>
                        
                        {isReturnRejected ? <span className="px-3 py-1.5 bg-rose-500/10 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-rose-500/30">Return Rejected</span>
                        : isReturnPending ? <span className="px-3 py-1.5 bg-orange-500/10 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-orange-500/30">Pending Return</span>
                        : isReplacePending ? <span className="px-3 py-1.5 bg-purple-500/10 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-purple-500/30">Pending Replace</span>
                        : isRejected ? <span className="px-3 py-1.5 bg-rose-500/10 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-rose-500/30">Rejected</span>
                        : isReInspect ? <span className="px-3 py-1.5 bg-amber-500/10 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-amber-500/30 animate-pulse">Re-Inspection</span>
                        : asset.isOverdue ? <span className="px-3 py-1.5 bg-rose-500/10 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-rose-500/30 animate-pulse">Overdue</span>
                        : <span className="px-3 py-1.5 bg-slate-500/10 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-500/30">{asset.computed_status || 'Assigned'}</span>}
                      </div>

                      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 mt-4 ${theme.glassInnerCard}`}>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Tag ID</span><span className={`font-mono text-xs font-bold wrap-break-word ${theme.text}`}>{asset.asset_tag || 'N/A'}</span></div>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Category</span><span className={`text-xs font-bold wrap-break-word ${theme.text}`}>{asset.category || 'N/A'}</span></div>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Updated</span><span className={`text-xs font-bold ${theme.text}`}>{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'N/A'}</span></div>
                        <div><span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${theme.subText}`}>Next Due</span><span className={`text-xs font-bold ${asset.isOverdue ? 'text-rose-500 animate-pulse' : theme.text}`}>{asset.nextDue ? asset.nextDue.toLocaleDateString('en-IN') : 'N/A'}</span></div>
                      </div>
                      
                      { (isRejected || isReInspect) && asset.live_admin_remarks && (
                        <div className={`p-4 mt-4 rounded-2xl border text-xs font-bold flex gap-3 ${isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-700'}`}>
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <div><span className="block text-[10px] uppercase tracking-widest opacity-80 mb-0.5">Admin Request Reason:</span>{asset.live_admin_remarks}</div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-4 justify-end">
                        
                        {(isReturnPending || isReplacePending) && !isReturnRejected ? (
                          <div className="flex flex-col items-center gap-1">
                            <button disabled className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all cursor-not-allowed opacity-60 ${theme.glassButton}`}>Pending Admin</button>
                            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest text-center leading-tight animate-pulse mt-1">Wait for Response</span>
                          </div>
                        ) : isReturnRejected ? (
                          <button 
                            onClick={async () => {
                              await supabase.from('assets').update({ status: 'Assigned', inspection_status: null }).eq('id', asset.id);
                              loadRealDatabase();
                              resetModals(); setSelectedReturnAsset(asset); setReturnModalOpen(true);
                            }}
                            className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center gap-2 ${theme.glassButton} border-rose-400/50! text-rose-600! hover:bg-rose-500/10!`}
                          >
                            <AlertTriangle size={14} /> Rejected (Retry)
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => { resetModals(); setSelectedReturnAsset(asset); setReturnModalOpen(true); }}
                              className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all cursor-pointer ${theme.glassButton} border-orange-400/50! text-orange-600! hover:bg-orange-500/10!`}
                            >
                              Return
                            </button>
                            <button 
                              onClick={() => { resetModals(); setSelectedReplaceAsset(asset); setReplaceModalOpen(true); }}
                              className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all cursor-pointer ${theme.glassButton} border-purple-400/50! text-purple-600! hover:bg-purple-500/10!`}
                            >
                              Replace
                            </button>
                          </>
                        )}

                        <button 
                          disabled={btnState.disabled}
                          onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                          className={`px-6 py-2.5 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] ${btnState.classes}`}
                        >
                          {btnState.disabled && !btnState.text.includes('Opens') && <CheckCircle2 size={15} />}
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
          <div className={`${theme.glassPanel} p-5 md:p-6 flex-1 flex flex-col lg:min-h-0 group/panel`}>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 transition-colors duration-500 ${isDarkMode ? 'border-white/10 group-hover/panel:border-orange-500/30' : 'border-white/40 group-hover/panel:border-orange-400/80'}`}>
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
                    <div key={tix.id} className={`p-5 space-y-4 ${theme.glassItem}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className={`font-extrabold text-sm leading-snug wrap-break-word ${theme.text}`}>{tix.title || tix.subject}</span>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border shrink-0 shadow-sm ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                      </div>
                      
                      <p className={`text-xs font-semibold line-clamp-3 wrap-break-word ${theme.subText}`}>{tix.description || tix.note}</p>

                      {(tix.admin_remarks || tix.admin_notes || tix.resolution_notes) && (
                        <div className={`p-4 border text-xs ${theme.glassInnerCard}`}>
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
                              <button key={star} disabled={!!tix.rating} onClick={() => handleRateTicket(tix.id, star)} className={`transition-all ${tix.rating ? 'cursor-default' : 'cursor-pointer hover:scale-125 hover:drop-shadow-lg'}`}>
                                <Star size={16} className={star <= (tix.rating || 0) ? "fill-amber-400 text-amber-400" : "text-white drop-shadow-md dark:text-zinc-600"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 🌟 UNIFIED MODAL UI FOR RETURN & REPLACE (With QR Camera Handover) */}
      {mounted && (returnModalOpen || replaceModalOpen) && activeAsset && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-9999 flex items-center justify-center p-4">
          
          <div className="bg-[#e9e9ec] rounded-4xl w-full max-w-105 shadow-2xl overflow-hidden border border-white font-sans flex flex-col relative transition-all duration-300">
            
            {/* Header */}
            <div className="p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  {returnModalOpen ? <LogOut className="text-[#ff7300]" size={20} /> : <RefreshCcw className="text-purple-600" size={20} />}
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wider leading-tight">
                    {returnModalOpen ? 'Asset Return Request' : 'Asset Replace Request'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {returnModalOpen ? 'Initiate IT Handover' : 'Initiate Hardware Swap'}
                  </p>
                </div>
              </div>
              <button onClick={resetModals} className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-900 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-colors"><X size={16} strokeWidth={2.5} /></button>
            </div>

            {/* STEP 1: FORM VIEW */}
            {!qrUrl ? (
              <div className="px-6 pb-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-2">Select Assigned Asset</label>
                  <div className="w-full px-4 py-3.5 bg-white rounded-2xl text-sm font-semibold text-slate-800 shadow-sm opacity-90 cursor-not-allowed flex justify-between items-center">
                    <span className="truncate">{activeAsset.name} ({activeAsset.asset_tag})</span>
                    <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 transform -translate-y-1"></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 bg-white rounded-2xl p-4 shadow-sm gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tag ID</p>
                    <p className="text-sm font-black text-slate-900">{activeAsset.asset_tag}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Serial Number</p>
                    <p className="text-sm font-black text-slate-900 truncate">{activeAsset.serial_number}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-2">Current Asset Condition</label>
                  <GlassDropdown 
                    value={returnModalOpen ? returnCondition : replaceCondition}
                    onChange={(val: string) => returnModalOpen ? setReturnCondition(val) : setReplaceCondition(val)}
                    options={
                      returnModalOpen 
                        ? ["Pristine / Flawless", "Minor Wear", "Damaged", "Not Working"]
                        : ["Minor Hardware Issue", "Damaged / Broken Part", "Not Working / Won't Power On", "Performance Issues"]
                    }
                    isDarkMode={isDarkMode}
                    theme={theme}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-2">
                    {returnModalOpen ? 'Return Reason & Notes' : 'Replace Reason & Notes'}
                  </label>
                  <textarea 
                    required 
                    value={returnModalOpen ? returnNotes : replaceReason} 
                    onChange={(e) => returnModalOpen ? setReturnNotes(e.target.value) : setReplaceReason(e.target.value)} 
                    placeholder={`Provide reason for ${returnModalOpen ? 'returning' : 'this request'}...`}
                    className={`w-full px-5 py-4 bg-white/70 rounded-2xl text-sm font-semibold text-slate-700 outline-none resize-none h-24 shadow-inner placeholder:text-slate-400 focus:bg-white focus:ring-2 border border-transparent ${returnModalOpen ? 'focus:ring-[#ff7300]/20' : 'focus:ring-purple-500/20'}`} 
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={resetModals} className="flex-1 py-4 bg-white rounded-full text-[11px] font-black text-slate-900 uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="button" onClick={() => handleGenerateQR(activeAsset, returnModalOpen)} className={`flex-1 py-4 rounded-full text-[11px] font-black text-white uppercase tracking-widest shadow-md transition-all cursor-pointer ${returnModalOpen ? 'bg-[#ff7300] hover:bg-[#e66a00]' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    Generate QR
                  </button>
                </div>
              </div>
            ) : (
              
              /* STEP 2: QR CODE UPLOAD VIEW */
              <form onSubmit={returnModalOpen ? handleReturnSubmit : handleReplaceSubmit} className="px-6 pb-6 space-y-6 flex flex-col animate-in slide-in-from-right-4">
                
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Scan to Upload Photos</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                    {isLaptop ? 'Laptop: Requires 5 Photos' : 'Accessory: Requires 2 Photos'}
                  </p>
                  
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4">
                    <img src={qrUrl} alt="Upload QR Code" className="w-40 h-40 object-contain" />
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${returnModalOpen ? 'bg-[#ff7300]' : 'bg-purple-500'}`} 
                      style={{ width: `${Math.min((currentPhotoCount / REQUIRED_PHOTOS) * 100, 100)}%` }} 
                    />
                  </div>
                  
                  <p className={`text-xs font-bold ${hasEnoughPhotos ? 'text-emerald-600' : 'text-slate-500 animate-pulse'}`}>
                    {hasEnoughPhotos ? 'Uploads Complete ✓' : `Waiting for ${REQUIRED_PHOTOS - currentPhotoCount > 0 ? REQUIRED_PHOTOS - currentPhotoCount : 0} more photo(s)...`}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 w-full">
                    <label className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer uppercase tracking-widest transition-colors">
                      Or upload directly from computer
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
                        if (e.target.files) setLocalPhotos([...localPhotos, ...Array.from(e.target.files)]);
                      }} />
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setQrUrl(null)} className="w-14 h-13 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0">
                    <ChevronLeft size={20} strokeWidth={2.5} />
                  </button>
                  <button type="submit" disabled={!hasEnoughPhotos || isSubmittingReturn || isSubmittingReplace} className={`flex-1 h-13 rounded-full text-[11px] font-black text-white uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer ${returnModalOpen ? 'bg-[#ff7300]' : 'bg-purple-600'}`}>
                    {(isSubmittingReturn || isSubmittingReplace) ? <Loader2 size={16} className="animate-spin" /> : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* 🌟 ORIGINAL TICKET & INSPECTION MODAL (Now fully updated with GlassDropdowns) */}
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

    </div>
  );
}

// 🌟 ORIGINAL LIVE DATABASE MODAL FOR INSPECTION & TICKETS (Unaffected by new QR Modals)
function LiveDatabaseModal({ type, asset, user, isDarkMode, assignedAssets, setAssignedAssets, onClose, theme }: any) {
  const needsLock = type === 'INSPECTION';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop / PC' : 'Hardware');
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
    if (type === 'REQUEST') return <PlusCircle size={24} strokeWidth={2} />;
    if (type === 'INSPECTION') return <ClipboardCheck size={24} strokeWidth={2} />;
    return <Ticket size={24} strokeWidth={2} />;
  };

  const getHeaderColors = () => {
    if (type === 'REQUEST') return isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/80 border border-white text-emerald-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]';
    if (type === 'INSPECTION') return isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-white/80 border border-white text-amber-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]';
    return isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-white/80 border border-white text-purple-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]';
  };

  const getTitle = () => {
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
        className={`relative w-full max-w-120 max-h-[80vh] sm:max-h-[85vh] flex flex-col overflow-hidden ${theme.glassCard}`}
      >
        <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] sm:rounded-3xl flex items-center justify-center ${getHeaderColors()}`}>
               {getHeaderIcon()}
            </div>
            <div>
              <h2 className={`text-[14px] sm:text-[16px] font-black uppercase tracking-widest ${theme.textMain}`}>{getTitle()}</h2>
              <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 ${theme.subText}`}>{type === 'INSPECTION' ? 'Visual verification' : 'Portal Submission'}</p>
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
              <div className={`p-4 sm:p-5 text-left transition-all ${theme.glassInnerCard}`}>
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
                <div className={`p-4 sm:p-5 space-y-3 transition-all ${theme.glassInnerCard}`}>
                  <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-rose-500'}`}>🔒 Security Verification Required</p>
                  <div className="flex gap-2 sm:gap-3">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder={user.id === 'guest-mock-uuid' ? 'Type anything for Guest...' : 'Type exact Tag ID or S/N...'} className={`flex-1 px-4 sm:px-5 py-3.5 rounded-2xl text-[12px] sm:text-[13px] font-bold outline-none transition-all ${isDarkMode ? 'bg-zinc-900/60 text-white placeholder-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]' : 'bg-white/40 text-[#0f172a] placeholder-[#818b9c] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-white/60'}`}/>
                    {!isUnlocked && <button type="button" onClick={handleAttemptUnlock} className="px-5 sm:px-6 bg-linear-to-r from-rose-500 to-rose-600 hover:opacity-90 text-white font-black uppercase tracking-widest text-[10px] sm:text-[11px] rounded-2xl cursor-pointer transition-all shadow-[0_4px_15px_rgba(244,63,94,0.4)] hover:shadow-[0_0_20px_rgba(244,63,94,0.6)] border-0">Verify</button>}
                  </div>
                  {lockError && <p className="text-[10px] sm:text-[11px] text-rose-500 font-bold px-1">Incorrect device code.</p>}
                </div>
              )}

              {type === 'TICKET' && (
                <>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Issue Subject</label>
                    <input value={formTitle} onChange={e=>setFormTitle(e.target.value)} required placeholder="E.g. Monitor display flickering" className={`w-full px-4 sm:px-5 py-3.5 rounded-2xl outline-none text-[12px] sm:text-[14px] font-semibold transition-all ${theme.glassInnerCard} ${isDarkMode ? 'placeholder-zinc-500 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' : 'placeholder-[#818b9c] text-[#0f172a] shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border border-white/60'}`}/>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Category</label>
                    <GlassDropdown 
                      value={formCategory}
                      onChange={(val: string) => setFormCategory(val)}
                      options={["Hardware", "Software", "Network"]}
                      isDarkMode={isDarkMode}
                      theme={theme}
                    />
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
                  <GlassDropdown 
                    value={formCategory}
                    onChange={(val: string) => setFormCategory(val)}
                    options={["Laptop / PC", "Monitor", "Keyboard / Mouse", "Headset / Audio", "Other Accessory"]}
                    isDarkMode={isDarkMode}
                    theme={theme}
                  />
                </div>
              )}

              {type === 'INSPECTION' && isUnlocked && (
                <div className="flex flex-col gap-1.5 sm:gap-2 animate-in slide-in-from-top-4 duration-300">
                  <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>Current Asset Condition</label>
                  <GlassDropdown 
                    value={formCondition}
                    onChange={(val: string) => setFormCondition(val)}
                    options={["Pristine / Flawless", "Good / Minor Scratches", "Poor / Damaged (Requires Fix)", "Non-Functional / Dead"]}
                    isDarkMode={isDarkMode}
                    theme={theme}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                  {type === 'INSPECTION' ? 'Audit Notes' : type === 'REQUEST' ? 'Business Justification' : 'Detailed Explanation'}
                </label>
                <textarea rows={3} value={formText} onChange={e=>setFormText(e.target.value)} required placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : "Describe what happened..."} className={`w-full px-4 sm:px-5 py-3.5 rounded-2xl text-[12px] sm:text-[14px] font-semibold transition-all outline-none resize-none min-h-17.5 sm:min-h-20 ${theme.glassInnerCard} ${isDarkMode ? 'placeholder-zinc-500 text-white shadow-inner' : 'placeholder-[#818b9c] text-[#0f172a] shadow-inner border border-white/60'}`}/>
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
                      type === 'REQUEST'
                      ? 'bg-linear-to-r from-emerald-400 to-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]'
                      : 'bg-linear-to-r from-purple-500 to-purple-600 shadow-[0_4px_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]'
                    }`}
                  >
                    {isTransmitting ? <Loader2 size={16} className="animate-spin" /> : (type === 'INSPECTION' ? 'Generate QR' : 'Transmit')}
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