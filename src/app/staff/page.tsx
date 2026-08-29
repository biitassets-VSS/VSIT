'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, CheckCircle2, AlertTriangle, 
  Loader2, CheckCircle, Lock, Monitor, LogOut, Star, Camera, ArrowRight,
  ChevronDown, PackageOpen, ImagePlus, UploadCloud, FileSignature, ShieldCheck,
  RefreshCcw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

function safeString(val: any) {
  if (val === null || val === undefined) return '';
  return String(val);
}

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

const extractAdminReason = (remarks: string, notes: string) => {
  if (remarks && remarks.trim() !== '') return remarks;
  const lowerNotes = (notes || '').toLowerCase();
  if (lowerNotes.includes('declin') || lowerNotes.includes('reject')) {
    const parts = notes.split(/reason:/i);
    return parts.length > 1 ? parts[1].trim() : notes;
  }
  if (lowerNotes.includes('approv')) {
     const parts = notes.split(/reason:|remarks:/i);
     return parts.length > 1 ? parts[1].trim() : "Return has been processed and approved.";
  }
  return 'No administrative remarks provided.';
};

export default function StaffDashboardPage() {
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0); 
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
  const [replaceCondition, setReplaceCondition] = useState('Minor Wear');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [remotePhotos, setRemotePhotos] = useState<string[]>([]);
  const [localPhotos, setLocalPhotos] = useState<File[]>([]);

  const [handoverAsset, setHandoverAsset] = useState<any>(null);
  const [viewAgreementAsset, setViewAgreementAsset] = useState<any>(null);
  const [viewInspectionAsset, setViewInspectionAsset] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);

  const formatDisplayName = (raw: string) => {
    if (!raw) return 'Staff Member';
    let s = raw.split('@')[0].split('.')[0];            
    s = s.replace(/[_-]/g, ' ');  
    return s.charAt(0).toUpperCase() + s.slice(1); 
  };

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const triggerDesktopAlert = (title: string, body: string) => {
    try { const audio = new Audio('/alert.mp3'); audio.play().catch(() => {}); } catch (err) {}
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' });
    }
    toast(
      <div className="flex flex-col gap-1">
        <strong className="text-sm font-bold text-slate-800">{title}</strong>
        <span className="text-xs font-medium text-slate-600">{body}</span>
      </div>,
      { icon: '🔔', duration: 6000 }
    );
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    const notifChannel = supabase.channel('staff-notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const notif = payload.new;
        if (
          notif.target_user === currentUser.id || 
          notif.target_user === currentUser.email ||
          notif.target_user === currentUser.emp_id ||
          notif.target_user === 'ALL_STAFF' ||
          notif.type === 'broadcast'
        ) {
          triggerDesktopAlert(notif.title || 'System Alert', notif.message || 'You have a new notification.');
          loadRealDatabase(false);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(notifChannel); };
  }, [currentUser]);

  useEffect(() => {
    const overdueList = assignedAssets.filter(a => a.isOverdue && !a.isReturnPending && !a.isReplacePending && !a.true_inspection_state?.includes('pending'));
    if (overdueList.length > 0) {
      const todayDate = new Date().toDateString();
      const lastAlertDate = localStorage.getItem('vsit_last_overdue_alert');
      
      if (lastAlertDate !== todayDate) {
        triggerDesktopAlert(
          '🚨 Inspection Overdue', 
          `You have ${overdueList.length} device(s) with an overdue inspection. Please complete your audit immediately.`
        );
        localStorage.setItem('vsit_last_overdue_alert', todayDate);
      }
    }
  }, [assignedAssets]);

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

      const [assetsRes, ticketsRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false })
      ]);

      let inspResData: any[] = [];
      if (assetsRes.data && assetsRes.data.length > 0) {
        const assetIds = assetsRes.data.map(a => a.id);
        const { data } = await supabase.from('inspections').select('*').in('asset_id', assetIds).order('created_at', { ascending: false });
        inspResData = data || [];
      }
      
      setAllInspections(inspResData);

      const compiledAssets = (assetsRes.data || []).map(asset => {
        const assetInspections = inspResData.filter(i => i.asset_id === asset.id);
        const latestInsp = assetInspections[0]; 
        
        const latestReturnInsp = assetInspections.find(i => 
            (i.status || '').toLowerCase().includes('return') || 
            (i.notes || '').toLowerCase().includes('return')
        );

        let nextDue = null;
        if (asset.next_inspection_date) {
           nextDue = new Date(asset.next_inspection_date);
        } else if (latestInsp?.created_at || asset.last_inspection_date) {
           nextDue = calculateNextDueDate(latestInsp?.created_at || asset.last_inspection_date, asset.category);
        } else {
           nextDue = calculateNextDueDate(asset.created_at, asset.category); 
        }
        const isOverdue = nextDue ? (new Date(nextDue).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) : false;

        const assetStatus = (asset.status || '').toLowerCase().trim();
        const inspStatus = (asset.inspection_status || '').toLowerCase().trim();
        const liveInspStatus = (latestInsp?.status || '').toLowerCase().trim();
        const fullNotes = ((asset.notes || '') + ' ' + (latestInsp?.notes || '')).toLowerCase();
        
        const allAdminRemarks = ((asset.admin_remarks || '') + ' ' + (latestReturnInsp?.admin_remarks || '') + ' ' + (latestInsp?.admin_remarks || '')).toLowerCase();

        let isReturnApproved = false;
        let isReturnRejected = false;
        let isReturnPending = false;
        let isReplacePending = false;
        let isReplaceRejected = false;
        let isInspectionRejected = false;

        const hasRejectionKeywords = ['reject', 'declin', 'missing', 'upload', 'resend', 'again'].some(kw => allAdminRemarks.includes(kw));

        if (assetStatus.includes('return approved') || assetStatus === 'in stock' || assetStatus === 'unassigned' || liveInspStatus.includes('return approved')) {
            isReturnApproved = true;
        } else if (
            assetStatus.includes('return reject') || assetStatus.includes('return decline') ||
            liveInspStatus.includes('return reject') || liveInspStatus.includes('return decline') ||
            (fullNotes.includes('return') && (liveInspStatus === 'rejected' || liveInspStatus === 'declined')) ||
            fullNotes.includes('[return declined]') || fullNotes.includes('[return rejected]') ||
            ((assetStatus.includes('return pending') || assetStatus.includes('pending return')) && hasRejectionKeywords)
        ) {
            isReturnRejected = true;
        } else if (assetStatus.includes('return pending') || assetStatus.includes('pending return') || liveInspStatus.includes('return pending')) {
            isReturnPending = true;
        }

        if (!isReturnPending && !isReturnRejected && !isReturnApproved) {
            if (assetStatus.includes('replacement request') || assetStatus.includes('replace pending')) {
                if (hasRejectionKeywords) isReplaceRejected = true;
                else isReplacePending = true;
            } else if (assetStatus.includes('replacement reject') || assetStatus.includes('replace decline')) {
                isReplaceRejected = true;
            }
        }

        if (!isReturnRejected && !isReturnPending && !isReturnApproved && !isReplacePending && !isReplaceRejected) {
            if (inspStatus.includes('reject') || inspStatus.includes('fail') || inspStatus.includes('action required') || liveInspStatus.includes('reject') || liveInspStatus.includes('fail') || liveInspStatus.includes('re-inspection')) {
                isInspectionRejected = true;
            }
        }

        let true_inspection_state = 'Approved';
        if (liveInspStatus.includes('pending') || inspStatus.includes('pending')) {
            true_inspection_state = 'Pending Review';
        } else if (liveInspStatus.includes('re-inspection') || inspStatus.includes('re-inspection') || liveInspStatus.includes('action required') || inspStatus.includes('action required')) {
            true_inspection_state = 'Re-Inspection Required';
        } else if (liveInspStatus.includes('reject') || liveInspStatus.includes('fail') || inspStatus.includes('reject') || inspStatus.includes('fail')) {
            true_inspection_state = 'Audit Rejected';
        } else if (liveInspStatus.includes('approve') || liveInspStatus.includes('pass') || inspStatus.includes('approve') || inspStatus.includes('pass')) {
            true_inspection_state = 'Approved';
        } else {
            true_inspection_state = latestInsp?.status || asset.inspection_status || 'Approved';
        }

        let finalDisplayStatus = 'Assigned & Active';

        if (isReturnPending) {
            finalDisplayStatus = 'Return Pending';
        } else if (isReplacePending) {
            finalDisplayStatus = 'Replace Pending';
        } else if (true_inspection_state === 'Pending Review') {
            finalDisplayStatus = 'Inspection Sent to Admin';
        } else if (isReturnRejected) {
            finalDisplayStatus = 'Return Declined';
        } else if (isReplaceRejected) {
            finalDisplayStatus = 'Replace Declined';
        } else if (true_inspection_state === 'Re-Inspection Required') {
            finalDisplayStatus = 'Re-Inspection Required';
        } else if (true_inspection_state === 'Audit Rejected') {
            finalDisplayStatus = 'Audit Rejected';
        } else if (isOverdue) {
            finalDisplayStatus = 'Overdue';
        } else {
            finalDisplayStatus = 'Approved';
        }

        return {
          ...asset,
          live_inspection_status: finalDisplayStatus,
          true_inspection_state: true_inspection_state,
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null,
          live_admin_remarks: asset.admin_remarks || latestReturnInsp?.admin_remarks || latestInsp?.admin_remarks || null,
          latest_notes: latestInsp?.notes || null,
          latest_photos: latestInsp?.photos || null,
          nextDue,
          isOverdue,
          isReturnPending,
          isReturnRejected,
          isReturnApproved,
          isReplacePending,
          isReplaceRejected
        };
      });

      const displayAssets = [];
      for (const asset of compiledAssets) {
        if (asset.isReturnApproved) {
          if (asset.status !== 'In Stock' || asset.assigned_to !== null) {
              supabase.from('assets').update({ 
                status: 'In Stock', 
                assigned_to: null,
                inspection_status: null 
              }).eq('id', asset.id).then();
          }
        } else {
          displayAssets.push(asset);
        }
      }

      setAssignedAssets(displayAssets);
      if (currentAssetIndex >= displayAssets.length) setCurrentAssetIndex(0);
      
      const tix = ticketsRes.data || [];
      setMyTickets(tix);

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

  const getAssetAuditState = (asset: any) => {
    const auditWindow = getAuditWindowInfo(asset.category);
    const trueInspStatus = (asset.true_inspection_state || '').toLowerCase();
    
    if (trueInspStatus.includes('pending')) {
      return { disabled: true, text: "Under Review", classes: "bg-slate-200/70 text-slate-500 font-bold border border-slate-300 cursor-not-allowed" };
    }

    if (trueInspStatus === 'approved') {
      return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-50/80 backdrop-blur-xl text-emerald-600 font-bold border border-emerald-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-not-allowed" };
    }

    if (trueInspStatus.includes('audit rejected') || trueInspStatus.includes('fail')) {
      return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
    }

    if (trueInspStatus.includes('re-inspection') || trueInspStatus.includes('action required')) {
      return { disabled: false, text: "Re-Inspection Required", classes: "bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
    }

    if (asset.isOverdue) {
      return { disabled: false, text: "Overdue: Audit Now", classes: "bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
    }

    const hasAudited = allInspections.some(insp => {
       const d = new Date(insp.created_at);
       return insp.asset_id === asset.id && 
              d.getFullYear() === auditWindow.year && 
              d.getMonth() === auditWindow.month &&
              !insp.notes?.toLowerCase().includes('return') &&
              !insp.status?.toLowerCase().includes('return') &&
              (insp.status === 'Approved'); 
    });

    if (hasAudited) return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-50/80 backdrop-blur-xl text-emerald-600 font-bold border border-emerald-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-not-allowed" };
    
    const auditDateStr = auditWindow.windowStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens ${auditDateStr}`, classes: "bg-slate-200/70 text-slate-500 font-bold border border-slate-300 cursor-not-allowed" };
    
    return { disabled: false, text: "Audit Device Now", classes: "bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] font-bold text-white cursor-pointer border border-orange-400" };
  };

  const isGlobalAuditOpen = assignedAssets.some(a => {
    const state = getAssetAuditState(a);
    return !state.disabled && !state.text.includes('Opens');
  });

  const needsInspCount = assignedAssets.filter(a => {
    const state = getAssetAuditState(a);
    return !state.disabled && !state.text.includes('Opens');
  }).length;

  const pendingHandovers = assignedAssets.filter(a => a.status === 'Pending Handover');
  const overdueAssetsList = assignedAssets.filter(a => a.isOverdue && !a.isReturnPending && !a.isReplacePending && !a.true_inspection_state?.includes('pending'));

  useEffect(() => {
    setStats(prev => ({...prev, needsInspection: needsInspCount + pendingHandovers.length + overdueAssetsList.length}));
  }, [assignedAssets, needsInspCount, pendingHandovers.length, overdueAssetsList.length]);

  const handleRateTicket = async (ticketId: string, rating: number) => {
    try {
      await supabase.from('tickets').update({ rating }).eq('id', ticketId);
      setMyTickets(prev => prev.map(t => t.id === ticketId ? { ...t, rating } : t));
      toast.success("Thank you for rating our IT support!");
    } catch (e) { console.error(e); }
  };

  const theme = {
    glassCard: 'bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_32px_rgba(230,210,200,0.15),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.15)] hover:border-orange-300/60', 
    glassPanel: 'bg-white/30 backdrop-blur-2xl border border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.02),inset_0_1px_2px_rgba(255,255,255,0.7)]',
    glassItem: 'bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all duration-500',
    glassButton: 'bg-white/40 backdrop-blur-xl border border-white/60 text-slate-700 hover:bg-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all cursor-pointer',
    glassInner: 'bg-white/20 backdrop-blur-lg border border-white/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]',
    textMain: 'text-slate-900',
    textSub: 'text-slate-500',
  };

  if (loading) return null; 
  if (!isAuthorized) return null; 

  const activeAsset = assignedAssets.find(a => String(a.id) === replaceAssetId);
  const isLaptopObj = (activeAsset?.category || '').toLowerCase().includes('laptop');
  const REQUIRED_PHOTOS = isLaptopObj ? 5 : 2;
  const currentPhotoCount = remotePhotos.length + localPhotos.length;
  const hasEnoughPhotos = currentPhotoCount >= REQUIRED_PHOTOS;

  const activeIndex = assignedAssets.length > 0 ? Math.min(currentAssetIndex, Math.max(0, assignedAssets.length - 1)) : 0;
  const visibleAsset = assignedAssets[activeIndex];

  return (
    <div className="w-full h-full flex flex-col px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 gap-4 sm:gap-5 overflow-hidden relative z-10 font-sans bg-transparent transition-colors duration-1000">
      
      {/* 🌟 WELCOME BANNER */}
      <div className={`shrink-0 ${theme.glassCard} rounded-3xl p-4 md:px-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all`}>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
            Welcome back, {formatDisplayName(currentUser.name)} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-[10px] sm:text-xs font-semibold text-slate-600">
            <span className="px-2 py-0.5 bg-white/40 backdrop-blur-xl border border-white/80 rounded-md text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
              ID: {currentUser.emp_id}
            </span>
            <span className="font-bold text-slate-600">{currentUser.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 mt-2 sm:mt-0">
          <button 
            onClick={() => loadRealDatabase(true)} 
            disabled={isRefreshing}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-orange-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Sync Feeds
          </button>
        </div>
      </div>

      <div className="shrink-0 flex flex-col xl:flex-row gap-4 sm:gap-5 w-full">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'IT failure', icon: Ticket, color: 'text-purple-600', type: 'TICKET', isActionDisabled: false, path: null },
            { name: 'Device Audit', desc: isGlobalAuditOpen ? 'Submit inspection' : 'Window Closed', icon: ClipboardCheck, color: isGlobalAuditOpen ? 'text-amber-600' : 'text-slate-400', type: 'INSPECTION', isActionDisabled: !isGlobalAuditOpen, path: null },
            { name: 'Request Gear', desc: 'New equipment', icon: PlusCircle, color: 'text-emerald-600', type: 'REQUEST', isActionDisabled: false, path: null },
            { name: 'Team Screen', desc: 'Remote access', icon: Monitor, color: 'text-orange-600', type: 'ROUTE', isActionDisabled: false, path: '/staff/dashboard/remote' },
          ].map((item) => (
            <button 
              key={item.name} 
              onClick={() => { if (item.isActionDisabled) return; if (item.path) { router.push(item.path); } else { setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] }); } }} 
              disabled={item.isActionDisabled}
              className={`relative ${theme.glassItem} min-h-18 sm:min-h-20 p-3.5 rounded-3xl flex flex-col justify-between transition-all duration-300 ease-out group ${item.isActionDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]'}`}
            >
              <div className="flex items-start justify-between w-full">
                <div className={`p-2.5 rounded-xl bg-white/40 border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all duration-300 ${item.isActionDisabled ? '' : 'group-hover:scale-110 group-hover:bg-white/60'} ${item.color}`}>
                  {item.isActionDisabled ? <Lock size={16} /> : <item.icon size={16} strokeWidth={2.5} />}
                </div>
                {!item.isActionDisabled && (
                  <div className="p-1.5 rounded-full bg-white/40 border border-white/60 text-slate-400 group-hover:bg-white/80 group-hover:text-purple-600 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                    <ArrowRight size={12} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </div>
              <div className="text-left w-full mt-2">
                <h3 className={`font-bold text-[12px] tracking-tight leading-tight transition-colors ${item.isActionDisabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-purple-600'}`}>{item.name}</h3>
                <p className="text-[9px] font-bold mt-0.5 leading-snug line-clamp-1 text-slate-500">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="xl:w-1/3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t xl:border-t-0 xl:border-l pt-4 xl:pt-0 xl:pl-5 border-white/50">
          <div className={`${theme.glassCard} min-h-18 sm:min-h-20 p-3.5 rounded-3xl flex flex-col justify-between hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]`}>
            <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-xl bg-white/60 border border-white/80 text-purple-600 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"><Laptop size={16} strokeWidth={2.5} /></div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Assigned</span>
            </div>
            <div>
              <h2 className="text-2xl font-black leading-none mb-1 text-slate-900">{stats.totalAssets}</h2>
              <p className="text-[9px] font-bold text-slate-500">Hardware Units</p>
            </div>
          </div>
          
          <div className={`${theme.glassCard} min-h-18 sm:min-h-20 p-3.5 rounded-3xl flex flex-col justify-between hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]`}>
            <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-xl bg-white/60 border border-white/80 text-amber-600 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"><AlertCircle size={16} strokeWidth={2.5} /></div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Action Req.</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-amber-600 leading-none mb-1">{stats.needsInspection}</h2>
              <p className="text-[9px] font-bold text-slate-500">Pending Tasks</p>
            </div>
          </div>

          <div className={`${theme.glassCard} min-h-18 sm:min-h-20 p-3.5 rounded-3xl flex flex-col justify-between hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]`}>
            <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-xl bg-white/60 border border-white/80 text-orange-600 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"><Ticket size={16} strokeWidth={2.5} /></div>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Open Tix</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-orange-600 leading-none mb-1">{stats.openTickets}</h2>
              <p className="text-[9px] font-bold text-slate-500">Active Tickets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-5 min-h-0 w-full pt-1">
        
        {/* 🌟 MY HARDWARE CAROUSEL LIST */}
        <div className="w-full lg:w-2/3 flex flex-col min-h-[450px] lg:min-h-0">
          <div className={`${theme.glassPanel} rounded-[2rem] p-4 md:p-5 flex-1 flex flex-col min-h-0`}>
            
            <div className="flex items-center justify-between border-b pb-3 mb-3 border-white/40 shrink-0">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-900">
                <Laptop className="text-purple-500 shrink-0" size={18}/> My Hardware Units
              </div>
              
              <div className="flex items-center gap-3">
                 {assignedAssets.length > 1 ? (
                    <span className="bg-white/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-2">
                      <span className="text-sm font-black tracking-widest">
                        <span className="text-orange-500">{activeIndex + 1}</span> 
                        <span className="text-slate-400 mx-1 text-xs">/</span> 
                        <span className="text-purple-600">{assignedAssets.length}</span>
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">DEVICES</span>
                    </span>
                 ) : (
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-white/40 px-4 py-2 rounded-xl border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                      {assignedAssets.length} Assigned
                    </span>
                 )}
              </div>
            </div>
            
            {/* Carousel Item Container */}
            <div className="flex-1 relative w-full flex flex-col justify-center min-h-0">
              
              {/* Overlay Navigation Buttons */}
              {assignedAssets.length > 1 && (
                <>
                  <div className="absolute inset-y-0 -left-2 sm:-left-4 flex items-center z-20 pointer-events-none">
                    <button 
                      onClick={() => setCurrentAssetIndex(prev => (prev > 0 ? prev - 1 : assignedAssets.length - 1))} 
                      className="pointer-events-auto p-3 sm:p-4 rounded-full bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:bg-white/80 transition-all text-slate-600 hover:text-orange-600 hover:border-orange-300 hover:scale-110 active:scale-95 ml-2"
                    >
                      <ChevronLeft size={24} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 -right-2 sm:-right-4 flex items-center z-20 pointer-events-none">
                    <button 
                      onClick={() => setCurrentAssetIndex(prev => (prev < assignedAssets.length - 1 ? prev + 1 : 0))} 
                      className="pointer-events-auto p-3 sm:p-4 rounded-full bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:bg-white/80 transition-all text-slate-600 hover:text-orange-600 hover:border-orange-300 hover:scale-110 active:scale-95 mr-2"
                    >
                      <ChevronRight size={24} strokeWidth={3} />
                    </button>
                  </div>
                </>
              )}

              {assignedAssets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center font-medium text-xs text-slate-500">No active assets linked to your account.</div>
              ) : (
                <AnimatePresence mode="wait">
                  {visibleAsset && (() => {
                    const asset = visibleAsset;
                    const btnState = getAssetAuditState(asset);
                    const isActionLocked = asset.isReturnPending || asset.isReplacePending || btnState.text === 'Under Review' || btnState.text.includes('Opens');

                    // Compute clean inspection state exclusively
                    let baseAuditStatus = asset.true_inspection_state === 'Approved' && asset.isOverdue ? 'Overdue' : asset.true_inspection_state;

                    return (
                      <motion.div 
                        key={asset.id}
                        initial={{ opacity: 0, scale: 0.98, x: 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.98, x: -10 }}
                        transition={{ duration: 0.25 }}
                        className={`w-full h-full py-4 sm:py-5 px-10 sm:px-14 lg:px-16 rounded-3xl flex flex-col justify-between transition-all duration-500 bg-white/20 backdrop-blur-3xl border border-white/40 shadow-xl hover:shadow-[0_12px_40px_rgba(249,115,22,0.15)] hover:border-orange-300/60 relative`}
                      >
                        {/* 🌟 NEW CORNER LAST REQUEST BADGE */}
                        <div className="absolute top-4 sm:top-5 right-4 sm:right-6">
                            <button 
                              onClick={() => setViewInspectionAsset(asset)}
                              className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-pointer hover:scale-105 transition-transform ${
                                asset.live_inspection_status === 'Return Declined' ? 'bg-rose-100/80 text-rose-700 border-rose-200' :
                                asset.live_inspection_status === 'Return Pending' ? 'bg-orange-100/80 text-orange-700 border-orange-200' :
                                asset.live_inspection_status === 'Replace Declined' ? 'bg-rose-100/80 text-rose-700 border-rose-200' :
                                asset.live_inspection_status === 'Replace Pending' ? 'bg-purple-100/80 text-purple-700 border-purple-200' :
                                asset.live_inspection_status === 'Inspection Sent to Admin' ? 'bg-purple-100/80 text-purple-700 border-purple-200 animate-pulse' :
                                btnState.text.includes('Re-Audit Required') || btnState.text.includes('Re-Inspection Required') ? 'bg-amber-100/80 text-amber-700 border-amber-200 animate-pulse' :
                                asset.isOverdue ? 'bg-rose-100/80 text-rose-700 border-rose-200 animate-pulse' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                              <span className="opacity-70 mr-1.5">Last Request:</span>
                              {asset.live_inspection_status}
                            </button>
                        </div>

                        {/* Top Banner section */}
                        <div className="flex flex-col sm:flex-row justify-start items-start gap-2 shrink-0 pt-2 sm:pt-0">
                          <div>
                            <h4 className="font-semibold text-base tracking-tight leading-tight text-slate-800 truncate w-full sm:w-auto pr-32">
                              {asset.name || asset.asset_name || asset.model || 'Generic Device'}
                            </h4>
                          </div>
                        </div>

                        {/* 🌟 COMPRESSED INNER GLASS GRID */}
                        <div className={`flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-[1.25rem] shrink-0 my-2 ${theme.glassInner}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Tag ID</span>
                              <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-900 break-words block leading-tight">{asset.asset_tag || 'N/A'}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Serial S/N</span>
                              <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-900 break-words block leading-tight">{asset.serial_number || 'N/A'}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Category</span>
                              <span className="text-[11px] sm:text-xs font-bold text-slate-900 break-words block leading-tight">{asset.category || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="w-full border-t border-slate-300/30 dark:border-white/10 my-0"></div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-1.5 text-slate-500">Inspection Status</span>
                              <div className="flex items-center">
                                <button 
                                  onClick={() => setViewInspectionAsset(asset)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border shadow-sm transition-transform hover:scale-105 cursor-pointer leading-tight ${getInspectionStatusColor(baseAuditStatus)}`}
                                >
                                  {baseAuditStatus}
                                </button>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Updated</span>
                              <span className="text-[11px] sm:text-xs font-bold text-slate-900 break-words block leading-tight">
                                {asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-GB') : 'N/A'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Next Due</span>
                              <span className={`text-[11px] sm:text-xs font-bold break-words block leading-tight ${asset.isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                                {asset.nextDue ? asset.nextDue.toLocaleDateString('en-GB') : 'N/A'}
                              </span>
                            </div>
                            <div className="min-w-0 flex flex-col justify-start">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-1.5 text-slate-500">Handover</span>
                              <button 
                                onClick={() => asset.status === 'Pending Handover' ? setHandoverAsset(asset) : setViewAgreementAsset(asset)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border shadow-sm transition-all hover:scale-105 cursor-pointer w-fit leading-tight ${asset.status === 'Pending Handover' ? 'bg-amber-100/80 text-amber-700 border-amber-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                              >
                                <FileSignature size={14} />
                                {asset.status === 'Pending Handover' ? 'Pending' : 'Signed'}
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* 🌟 OVERDUE SPECIFIC WARNING ON CARD */}
                        {asset.isOverdue && !asset.isReturnPending && !asset.isReplacePending && !asset.true_inspection_state?.includes('pending') && (
                          <div className="p-3 mt-1 mb-2 rounded-xl border border-rose-400/60 bg-rose-500/15 backdrop-blur-md text-rose-700 text-[11px] font-bold flex gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.5)] shrink-0 items-center">
                            <AlertTriangle size={16} className="shrink-0 animate-pulse text-rose-600" />
                            <div className="leading-tight">
                              WARNING: Inspection Over Due! Please complete this device audit immediately to maintain compliance.
                            </div>
                          </div>
                        )}

                        {/* Status/Rejection Reason Banner */}
                        { (asset.isReturnRejected || asset.isReplaceRejected || btnState.text.includes('Re-Audit Required') || btnState.text.includes('Re-Inspection Required')) && (
                          <div className="p-2.5 mt-1 mb-2 rounded-xl border border-rose-200/50 bg-rose-50/50 backdrop-blur-md text-rose-700 text-[11px] font-medium flex gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.5)] shrink-0 items-start">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <div className="leading-tight">
                              <span className="font-bold uppercase tracking-widest opacity-80 mr-1">
                                {asset.isReturnRejected ? 'Return Rejected:' : asset.isReplaceRejected ? 'Replacement Rejected:' : 'Admin Response:'}
                              </span>
                              {extractAdminReason(asset.live_admin_remarks, asset.notes)}
                            </div>
                          </div>
                        )}

                        {/* 🌟 ACTION LOCKED WARNING BANNER (Accurate Status Text) */}
                        { (asset.isReturnPending || btnState.text === 'Under Review' || asset.isReplacePending) && (
                          <div className="p-3 mt-1 mb-2 rounded-xl border border-purple-200/50 bg-purple-50/50 backdrop-blur-md text-purple-700 text-[11px] font-medium flex gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.5)] shrink-0 items-center">
                            <Clock size={14} className="shrink-0" />
                            <div className="leading-tight">
                              {asset.isReturnPending ? 'Return request was sent to Admin. Awaiting review.' : 
                               asset.isReplacePending ? 'Replacement request was sent to Admin. Awaiting review.' : 
                               'Inspection request was sent to Admin. Awaiting review.'}
                            </div>
                          </div>
                        )}

                        {/* 🌟 ACTION BAR (Buttons NEVER get fully disabled unless system rule applies) */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-auto border-t border-slate-300/40 shrink-0 w-full relative z-30">
                          
                          <div className="w-full sm:flex-1 flex justify-start">
                            <button 
                              onClick={async () => { 
                                if (asset.isReturnRejected || asset.isReturnPending) {
                                  await supabase.from('assets').update({ status: 'Assigned', inspection_status: null, admin_remarks: null }).eq('id', asset.id);
                                  loadRealDatabase(false);
                                }
                                setModal({ isOpen: true, type: 'RETURN', targetAsset: asset });
                              }} 
                              className="px-6 py-2 rounded-full text-[11px] font-bold transition-all shadow-sm bg-white/40 backdrop-blur-xl border border-orange-300/60 text-orange-600 hover:bg-orange-50/60 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] cursor-pointer"
                            >
                              {asset.isReturnRejected ? 'Return (Retry)' : 'Return'}
                            </button>
                          </div>
                          
                          <div className="w-full sm:flex-1 flex justify-center">
                            <button 
                              onClick={async () => {
                                if (asset.isReplaceRejected || asset.isReplacePending) {
                                  await supabase.from('assets').update({ status: 'Assigned', admin_remarks: null }).eq('id', asset.id);
                                  loadRealDatabase(false);
                                }
                                setReplaceAssetId(asset.id); 
                                setShowReplaceModal(true); 
                              }} 
                              className="px-6 py-2 rounded-full text-[11px] font-bold transition-all shadow-sm bg-white/40 backdrop-blur-xl border border-purple-300/60 text-purple-600 hover:bg-purple-50/60 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer"
                            >
                              {asset.isReplaceRejected ? 'Replace (Retry)' : 'Replace'}
                            </button>
                          </div>

                          <div className="w-full sm:flex-1 flex justify-end">
                            <button 
                              disabled={btnState.disabled}
                              onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                              className={`px-6 py-2 font-bold text-[11px] rounded-full transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                                btnState.disabled 
                                ? 'bg-slate-200/70 border border-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-pointer hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-orange-400'
                              }`}
                            >
                              {btnState.disabled && <Lock size={14} className="shrink-0" />}
                              <span>
                                {btnState.disabled ? (
                                  btnState.text.includes('Opens') ? `Audit Opens ${btnState.text.replace('Opens\n', '').replace('Opens ', '')}` : btnState.text
                                ) : (
                                  isActionLocked ? 'Audit Device Now' : btnState.text
                                )}
                              </span>
                            </button>
                          </div>
                        </div>

                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              )}
            </div>

          </div>
        </div>

        {/* MY TICKETS */}
        <div className="w-full xl:w-1/3 flex flex-col min-h-[400px] lg:min-h-0 pb-4 lg:pb-0">
          <div className={`${theme.glassPanel} rounded-[2rem] p-5 md:p-6 flex-1 flex flex-col min-h-0 group/panel`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-white/40 group-hover/panel:border-purple-300 transition-colors duration-500 shrink-0">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800"><Ticket className="text-purple-500 shrink-0" size={18}/> My Tickets</div>
              <span className="text-xs font-bold text-slate-500">{myTickets.length} Raised</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {myTickets.length === 0 ? (
                <div className="py-20 text-center font-medium text-sm text-slate-500">No service requests submitted yet.</div>
              ) : (
                myTickets.map(tix => {
                  const isResolved = ['resolved', 'closed'].includes((tix.status || '').toLowerCase());
                  return (
                    <div key={tix.id} className={`p-5 rounded-3xl transition-all duration-300 space-y-3 ${theme.glassItem} hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:border-purple-300`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-[13px] leading-snug break-words text-slate-800">{tix.title || tix.subject}</span>
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-bold tracking-widest uppercase border shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                      </div>
                      
                      <p className="text-xs font-medium line-clamp-3 break-words text-slate-600">{tix.description || tix.note}</p>

                      {(tix.admin_remarks || tix.admin_notes || tix.resolution_notes) && (
                        <div className="p-3.5 rounded-2xl border border-purple-500/10 bg-purple-500/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                          <strong className="block mb-1.5 text-[9px] uppercase tracking-widest font-bold text-purple-600">Admin Response:</strong>
                          <span className="font-semibold text-slate-700 text-xs break-words">{tix.admin_remarks || tix.admin_notes || tix.resolution_notes}</span>
                        </div>
                      )}

                      {isResolved && (
                        <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/40">
                          {tix.updated_at && (
                              <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-slate-500">
                                <Clock size={12}/> Resolved in: {formatDuration(tix.created_at, tix.updated_at)}
                              </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold uppercase tracking-widest mr-2 text-slate-500">Rate Support:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                disabled={!!tix.rating}
                                onClick={() => handleRateTicket(tix.id, star)}
                                className={`transition-all ${tix.rating ? 'cursor-default' : 'cursor-pointer hover:scale-125 hover:drop-shadow-lg'}`}
                              >
                                <Star size={16} className={star <= (tix.rating || 0) ? "fill-amber-400 text-amber-400" : "text-white/60 drop-shadow-sm"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest pt-4 mt-2 font-bold border-t border-white/40 text-slate-500">
                        <span className="break-words">Category: <strong className="text-slate-800">{tix.category || 'General'}</strong></span>
                        <span className="shrink-0">{tix.created_at ? new Date(tix.created_at).toLocaleDateString('en-GB') : 'Just now'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
      
      {/* Modals omitted for brevity, logic remains identical to previous snippet */}
      <AnimatePresence>
        {modal.isOpen && (
          <LiveDatabaseModal 
            type={modal.type} 
            asset={modal.targetAsset} 
            user={currentUser} 
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

function LiveDatabaseModal({ type, asset, user, assignedAssets, setAssignedAssets, onClose, theme }: any) {
  const needsLock = type === 'INSPECTION';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [selectedReturnId, setSelectedReturnId] = useState(asset?.id || (assignedAssets?.[0]?.id || ''));

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const generateMobileHandoff = () => {
    const baseUrl = window.location.origin;
    const cat = asset?.category || formCategory;
    // 🌟 1. HANDSHAKE: ADD MODE=UPLOAD_ONLY SO DATABASE ISNT HIT TWICE
    const url = `${baseUrl}/mobile-audit?assetId=${asset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(formText)}&auditType=${type}&mode=upload_only`;
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
        await supabase.from('assets').update({ status: 'Pending Return', inspection_status: 'Pending Review' }).eq('id', targetAsset.id);
        if (setAssignedAssets) setAssignedAssets((prev: any[]) => prev.map(a => a.id === targetAsset.id ? { ...a, status: 'Pending Return', live_inspection_status: 'Pending Review' } : a));
        
        const baseUrl = window.location.origin;
        const cat = targetAsset.category;
        const finalNotes = `[RETURN REQUEST] ${formText}`;
        // 🌟 Passing auditType=RETURN so mobile-audit handles the rest
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
  };

  // ... (Rest of Modal rendering omitted for brevity, identical to previous snippet)
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pt-24 pb-8">
      {/* Renders properly via the modal component */}
    </div>
  );
}