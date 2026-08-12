'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, CheckCircle2, AlertTriangle, 
  Loader2, CheckCircle, Lock, Monitor, LogOut, Star, Camera, ArrowRight,
  ChevronDown, PackageOpen, ImagePlus, UploadCloud, FileSignature, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, openTickets: 0 });

  // 🌟 Dashboard Unified Modal State
  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({
    isOpen: false,
    type: '',
  });

  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceAssetId, setReplaceAssetId] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

  const [handoverAsset, setHandoverAsset] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);

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

        return {
          ...asset,
          live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null,
          live_admin_remarks: asset.admin_remarks || latestReturnInsp?.admin_remarks || latestInsp?.admin_remarks || null,
          nextDue,
          isOverdue,
          isReturnPending,
          isReturnRejected,
          isReturnApproved,
          isReplacePending,
          isReplaceRejected,
          isInspectionRejected
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
      
      const needsInspCount = displayAssets.filter(a => a.isInspectionRejected || a.isOverdue || a.isReturnRejected || a.isReplaceRejected).length;
      
      const tix = ticketsRes.data || [];
      setMyTickets(tix);
      const openTixCount = tix.filter(t => !['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;

      setStats({ totalAssets: displayAssets.length, needsInspection: needsInspCount, openTickets: openTixCount });

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

  const handleDigitalSign = async () => {
    if (!handoverAsset) return;
    setIsSigning(true);

    try {
      const timestamp = new Date().toLocaleString('en-IN');
      const staffName = currentUser.full_name || currentUser.name;
      const empCode = currentUser.emp_code || currentUser.emp_id;
      const officialNote = `Digitally Signed Handover Agreement by ${staffName} on ${timestamp}`;

      await supabase
        .from('assets')
        .update({ 
          status: 'Assigned', 
          inspection_status: 'Approved',
          last_inspection_date: new Date().toISOString()
        })
        .eq('id', handoverAsset.id);

      await supabase
        .from('inspections')
        .insert({
          asset_id: handoverAsset.id,
          inspected_by: currentUser.id,
          status: 'Approved',
          notes: officialNote
        });

      await supabase
        .from('notifications')
        .insert({
          target_user: 'ADMIN_SYSTEM',
          title: '📝 Agreement Signed',
          message: `${staffName} (${empCode}) has digitally signed the handover agreement for ${handoverAsset.name || handoverAsset.asset_name} (${handoverAsset.asset_tag}).`,
          type: 'success',
          is_read: false
        });

      toast.success("Handover Agreement Successfully Signed!");
      setHandoverAsset(null);
      loadRealDatabase(false); 
    } catch (error: any) {
      toast.error(`Error signing agreement: ${error.message}`);
    } finally {
      setIsSigning(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-orange-100/80 text-orange-600 font-bold border border-orange-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    if (s === 'in progress') return 'bg-purple-100/80 text-purple-600 font-bold border border-purple-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-100/80 text-emerald-600 font-bold border border-emerald-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    return 'bg-slate-100/80 text-slate-600 font-bold border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
  };

  const getAssetAuditState = (asset: any) => {
    const auditWindow = getAuditWindowInfo(asset.category);
    
    if (asset.isReturnPending || asset.isReplacePending) {
      return { disabled: true, text: "Locked", classes: "bg-white/30 backdrop-blur-md text-slate-400 font-bold border border-white/40 cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]" };
    }

    if (asset.isInspectionRejected) {
      return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
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
              (insp.status === 'Approved' || insp.status === 'Pending Review' || insp.status === 'Pending');
    });

    if (hasAudited) return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-50/80 backdrop-blur-md text-emerald-600 font-bold border border-emerald-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-not-allowed" };
    
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens ${auditWindow.windowStart.toLocaleDateString()}`, classes: "bg-white/40 backdrop-blur-md text-slate-500 font-bold border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-not-allowed" };
    
    return { disabled: false, text: "Audit Device", classes: "bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] font-bold text-white cursor-pointer border border-orange-400" };
  };

  const requiresGlobalReinspection = assignedAssets.some(a => a.isInspectionRejected || a.isOverdue);
  const isGlobalAuditOpen = assignedAssets.some(a => getAuditWindowInfo(a.category).isOpen) || requiresGlobalReinspection;
  const pendingHandovers = assignedAssets.filter(a => a.status === 'Pending Handover');

  // 🌟 MAC OS 2026 ULTRA PREMIUM LIQUID GLASS THEME (PURE LIGHT)
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

  return (
    <div className="flex-1 flex flex-col w-full h-full p-4 lg:p-6 gap-5 overflow-hidden lg:min-h-0 z-10 font-sans bg-transparent transition-colors duration-1000">
      
      {/* 🌟 WELCOME BANNER */}
      <div className={`${theme.glassCard} rounded-4xl p-5 md:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 transition-all`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back, {formatDisplayName(currentUser.name)} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm font-semibold text-slate-600">
            <span className="px-3 py-1 bg-white/40 backdrop-blur-xl border border-white/80 rounded-lg text-[10px] sm:text-xs font-bold tracking-widest text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)]">
              ID: {currentUser.emp_id}
            </span>
            <span className="font-bold text-slate-600">{currentUser.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => loadRealDatabase(true)} 
            disabled={isRefreshing}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-orange-400 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Sync Feeds
          </button>
        </div>
      </div>

      {/* 🌟 PENDING HANDOVER ALERT BANNER */}
      <AnimatePresence>
        {pendingHandovers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${theme.glassCard} bg-orange-50/50 border-orange-200/50 rounded-4xl p-5 shadow-[0_8px_30px_rgba(249,115,22,0.1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden`}
          >
            <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 bg-white/80 backdrop-blur-md border border-orange-100 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] text-orange-600 rounded-2xl shrink-0">
                <FileSignature size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  Action Required <span className="px-2 py-0.5 bg-orange-500 text-white rounded-md text-[10px] animate-pulse shadow-sm">1 Pending</span>
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  You have new hardware assigned to you. Please review and sign the Handover Agreement.
                </p>
              </div>
            </div>
            <button
              onClick={() => setHandoverAsset(pendingHandovers[0])}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.3)] transition-all cursor-pointer hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] active:scale-95 whitespace-nowrap border border-orange-400 shrink-0 relative z-10"
            >
              Review & Sign
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col xl:flex-row gap-5 shrink-0">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'IT failure', icon: Ticket, color: 'text-purple-600', type: 'TICKET', isActionDisabled: false, path: null },
            { name: 'Device Audit', desc: requiresGlobalReinspection ? 'Action Required' : (isGlobalAuditOpen ? 'Submit inspection' : 'Window Closed'), icon: ClipboardCheck, color: requiresGlobalReinspection ? 'text-rose-600 animate-pulse' : (isGlobalAuditOpen ? 'text-amber-600' : 'text-slate-400'), type: 'INSPECTION', isActionDisabled: !isGlobalAuditOpen, path: null },
            { name: 'Request Gear', desc: 'New equipment', icon: PlusCircle, color: 'text-emerald-600', type: 'REQUEST', isActionDisabled: false, path: null },
            { name: 'Team Screen', desc: 'Remote access', icon: Monitor, color: 'text-orange-600', type: 'ROUTE', isActionDisabled: false, path: '/staff/dashboard/remote' },
          ].map((item) => (
            <button 
              key={item.name} 
              onClick={() => { if (item.isActionDisabled) return; if (item.path) { router.push(item.path); } else { setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] }); } }} 
              disabled={item.isActionDisabled}
              className={`relative ${theme.glassItem} min-h-24 p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 ease-out group ${item.isActionDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]'}`}
            >
              <div className="flex items-start justify-between w-full">
                <div className={`p-3 rounded-2xl bg-white/40 border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all duration-300 ${item.isActionDisabled ? '' : 'group-hover:scale-110 group-hover:bg-white/60'} ${item.color}`}>
                  {item.isActionDisabled ? <Lock size={18} /> : <item.icon size={18} strokeWidth={2.5} />}
                </div>
                {!item.isActionDisabled && (
                  <div className="p-1.5 rounded-full bg-white/40 border border-white/60 text-slate-400 group-hover:bg-white/80 group-hover:text-purple-600 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                    <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </div>
              <div className="text-left w-full mt-2">
                <h3 className={`font-bold text-[13px] tracking-tight leading-tight transition-colors ${item.isActionDisabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-purple-600'}`}>{item.name}</h3>
                <p className="text-[10px] font-bold mt-0.5 leading-snug line-clamp-1 text-slate-500">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="xl:w-1/3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t xl:border-t-0 xl:border-l pt-4 xl:pt-0 xl:pl-5 border-white/50">
          <div className={`${theme.glassCard} min-h-24 p-4 rounded-3xl flex flex-col justify-between hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]`}>
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-white/60 border border-white/80 text-purple-600 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"><Laptop size={18} strokeWidth={2.5} /></div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Assigned</span>
            </div>
            <div>
              <h2 className="text-3xl font-black leading-none mb-1 text-slate-900">{stats.totalAssets}</h2>
              <p className="text-[10px] font-bold text-slate-500">Hardware Units</p>
            </div>
          </div>
          
          <div className={`${theme.glassCard} min-h-24 p-4 rounded-3xl flex flex-col justify-between hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]`}>
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-white/60 border border-white/80 text-amber-600 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"><AlertCircle size={18} strokeWidth={2.5} /></div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Action Req.</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-amber-600 leading-none mb-1">{stats.needsInspection}</h2>
              <p className="text-[10px] font-bold text-slate-500">Pending Tasks</p>
            </div>
          </div>

          <div className={`${theme.glassCard} min-h-24 p-4 rounded-3xl flex flex-col justify-between hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]`}>
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-2xl bg-white/60 border border-white/80 text-orange-600 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"><Ticket size={18} strokeWidth={2.5} /></div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Open Tix</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-orange-600 leading-none mb-1">{stats.openTickets}</h2>
              <p className="text-[10px] font-bold text-slate-500">Active Tickets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:min-h-0 pt-1">
        
        {/* MY HARDWARE LIST */}
        <div className="w-full lg:w-2/3 flex flex-col lg:min-h-0">
          <div className={`${theme.glassPanel} rounded-4xl p-5 md:p-6 flex-1 flex flex-col lg:min-h-0`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-white/40">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-900">
                <Laptop className="text-purple-500 shrink-0" size={18}/> My Hardware Units
              </div>
              <span className="text-xs font-bold text-slate-500">{assignedAssets.length} Total</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {assignedAssets.length === 0 ? (
                <div className="py-10 text-center font-medium text-xs text-slate-500">No active assets linked to your account.</div>
              ) : (
                assignedAssets.map(asset => {
                  const btnState = getAssetAuditState(asset);

                  return (
                    <div key={asset.id} className={`${theme.glassItem} p-5 sm:p-6 rounded-3xl hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:border-orange-300`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                        <h4 className="font-semibold text-base tracking-tight leading-tight text-slate-800 truncate">
                          {asset.name || asset.asset_name || asset.model || 'Generic Device'}
                        </h4>
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] ${
                          asset.isReturnRejected ? 'bg-rose-100/80 text-rose-700 border-rose-200' :
                          asset.isReturnPending ? 'bg-orange-100/80 text-orange-700 border-orange-200' :
                          asset.isReplaceRejected ? 'bg-rose-100/80 text-rose-700 border-rose-200' :
                          asset.isReplacePending ? 'bg-purple-100/80 text-purple-700 border-purple-200' :
                          asset.isInspectionRejected ? 'bg-amber-100/80 text-amber-700 border-amber-200 animate-pulse' :
                          asset.isOverdue ? 'bg-rose-100/80 text-rose-700 border-rose-200 animate-pulse' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {
                            asset.isReturnRejected ? 'Return Declined' : 
                            asset.isReturnPending ? 'Pending Return' : 
                            asset.isReplaceRejected ? 'Replacement Declined' : 
                            asset.isReplacePending ? 'Replacement Pending' : 
                            asset.isInspectionRejected ? 'Re-Inspection Req' : 
                            asset.isOverdue ? 'Overdue' : 'Assigned & Active'
                          }
                        </span>
                      </div>

                      {/* 🌟 INNER GLASS GRID */}
                      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl ${theme.glassInner}`}>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest block mb-1 text-slate-500">Tag ID</span>
                          <span className="font-mono text-xs font-medium text-slate-800 truncate block">{asset.asset_tag || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest block mb-1 text-slate-500">Category</span>
                          <span className="text-xs font-medium text-slate-800 truncate block">{asset.category || 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest block mb-1 text-slate-500">Updated</span>
                          <span className="text-xs font-medium text-slate-800 block">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-widest block mb-1 text-slate-500">Next Due</span>
                          <span className={`text-xs font-medium block ${asset.isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>{asset.nextDue ? asset.nextDue.toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                      </div>
                      
                      { (asset.isReturnRejected || asset.isReplaceRejected || asset.isInspectionRejected) && (
                        <div className="p-4 mt-4 rounded-2xl border border-rose-200/50 bg-rose-50/50 backdrop-blur-md text-rose-700 text-xs font-medium flex gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.5)]">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Admin Response:</span>
                            {extractAdminReason(asset.live_admin_remarks, asset.notes)}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-3 pt-5 mt-4 border-t border-white/40">
                        {asset.isReturnPending ? (
                          <button disabled className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${theme.glassButton} opacity-60 cursor-not-allowed`}>
                            Waiting on Admin
                          </button>
                        ) : asset.isReturnRejected ? (
                          <button 
                            onClick={async () => { 
                              await supabase.from('assets').update({ status: 'Assigned', inspection_status: null, admin_remarks: null }).eq('id', asset.id);
                              loadRealDatabase(false);
                              setModal({ isOpen: true, type: 'RETURN', targetAsset: asset });
                            }} 
                            className="px-5 py-2.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                          >
                            Return (Retry)
                          </button>
                        ) : (
                          <button 
                            disabled={asset.isReplacePending || asset.isReplaceRejected}
                            onClick={() => { setModal({ isOpen: true, type: 'RETURN', targetAsset: asset }); }} 
                            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] ${
                              (asset.isReplacePending || asset.isReplaceRejected)
                                ? 'bg-white/30 border border-white/40 text-slate-400 cursor-not-allowed opacity-60'
                                : 'bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100/80 hover:border-orange-300 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] cursor-pointer'
                            }`}
                          >
                            Return
                          </button>
                        )}
                        
                        {asset.isReplacePending ? (
                          <button disabled className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${theme.glassButton} opacity-60 cursor-not-allowed`}>
                            Waiting on Admin
                          </button>
                        ) : asset.isReplaceRejected ? (
                          <button 
                            onClick={async () => {
                              await supabase.from('assets').update({ status: 'Assigned', admin_remarks: null }).eq('id', asset.id);
                              loadRealDatabase(false);
                              setReplaceAssetId(asset.id); 
                              setShowReplaceModal(true); 
                            }} 
                            className="px-5 py-2.5 rounded-2xl border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                          >
                            Replace (Retry)
                          </button>
                        ) : (
                          <button 
                            disabled={asset.isReturnPending || asset.isReturnRejected}
                            onClick={() => { setReplaceAssetId(asset.id); setShowReplaceModal(true); }} 
                            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] ${
                              (asset.isReturnPending || asset.isReturnRejected)
                                ? 'bg-white/30 border border-white/40 text-slate-400 cursor-not-allowed opacity-60'
                                : 'bg-purple-50 border border-purple-200 text-purple-600 hover:bg-purple-100/80 hover:border-purple-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer'
                            }`}
                          >
                            Replace
                          </button>
                        )}

                        <button 
                          disabled={btnState.disabled}
                          onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                          className={`px-6 py-2.5 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.4)] ${btnState.classes}`}
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

        {/* MY TICKETS */}
        <div className="w-full lg:w-1/3 flex flex-col lg:min-h-0 pb-4 lg:pb-0">
          <div className={`${theme.glassPanel} rounded-4xl p-5 md:p-6 flex-1 flex flex-col lg:min-h-0 group/panel`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-white/40 group-hover/panel:border-purple-300 transition-colors duration-500">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800"><Ticket className="text-purple-500 shrink-0" size={18}/> My Tickets</div>
              <span className="text-xs font-bold text-slate-500">{myTickets.length} Raised</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {myTickets.length === 0 ? (
                <div className="py-10 text-center font-medium text-xs text-slate-500">No service requests submitted yet.</div>
              ) : (
                myTickets.map(tix => {
                  const isResolved = ['resolved', 'closed'].includes((tix.status || '').toLowerCase());
                  return (
                    <div key={tix.id} className={`p-5 rounded-3xl transition-all duration-300 space-y-4 ${theme.glassItem} hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:border-purple-300`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-sm leading-snug wrap-break-word text-slate-800">{tix.title || tix.subject}</span>
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-bold tracking-widest uppercase border shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                      </div>
                      
                      <p className="text-xs font-medium line-clamp-3 wrap-break-word text-slate-600">{tix.description || tix.note}</p>

                      {(tix.admin_remarks || tix.admin_notes || tix.resolution_notes) && (
                        <div className="p-4 rounded-2xl border border-purple-500/10 bg-purple-500/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                          <strong className="block mb-1.5 text-[10px] uppercase tracking-widest font-bold text-purple-600">Admin Response:</strong>
                          <span className="font-medium text-slate-700 text-xs wrap-break-word">{tix.admin_remarks || tix.admin_notes || tix.resolution_notes}</span>
                        </div>
                      )}

                      {isResolved && (
                        <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/40">
                          {tix.updated_at && (
                              <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-slate-500">
                                <Clock size={12}/> Resolved in: {formatDuration(tix.created_at, tix.updated_at)}
                              </div>
                          )}
                          <div className="flex items-center gap-1 mt-1">
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

                      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest pt-4 font-bold border-t border-white/40 text-slate-500">
                        <span className="wrap-break-word">Category: <strong className="text-slate-800">{tix.category || 'General'}</strong></span>
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

      <AnimatePresence>
        {showReplaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReplaceModal(false)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-2xl max-h-[80vh] sm:max-h-[85vh] rounded-4xl flex flex-col overflow-hidden bg-white/80 backdrop-blur-3xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.15)]`}
            >
              <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 flex justify-between items-center shrink-0 border-b border-slate-200/60">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-3xl flex items-center justify-center bg-white border border-white text-purple-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
                     <PackageOpen size={24} strokeWidth={2} />
                  </div>
                  <h2 className="text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-slate-900">
                    Assets Replacement
                  </h2>
                </div>
                <button onClick={() => setShowReplaceModal(false)} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}>
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <form id="replacementForm" onSubmit={handleReplacementSubmit} className="px-6 py-4 sm:px-8 sm:py-5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 custom-scrollbar">
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Select Assigned Asset</label>
                  <div className="relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                    <select
                      value={replaceAssetId}
                      onChange={(e) => setReplaceAssetId(e.target.value)}
                      required
                      className="w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900"
                    >
                      <option value="" disabled>Choose Hardware...</option>
                      {assignedAssets.map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name || asset.asset_name} ({asset.asset_tag})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" />
                  </div>
                </div>

                <AnimatePresence>
                  {replaceAssetId && (
                    <motion.div initial={{ opacity: 0, height: 0, marginTop: -5 }} animate={{ opacity: 1, height: 'auto', marginTop: 0 }} exit={{ opacity: 0, height: 0, marginTop: -5 }} className="overflow-hidden">
                      <div className="px-4 sm:px-5 py-3 sm:py-4 rounded-2xl flex gap-4 bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]">
                        <div className="flex-1 space-y-1">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest block text-slate-500">Tag ID</span>
                          <span className="text-[11px] sm:text-[13px] font-semibold wrap-break-word text-slate-900">
                            {assignedAssets.find(a => String(a.id) === replaceAssetId)?.asset_tag}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest block text-slate-500">Serial Number</span>
                          <span className="text-[11px] sm:text-[13px] font-semibold wrap-break-word text-slate-900">
                            {assignedAssets.find(a => String(a.id) === replaceAssetId)?.serial_number || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Detailed Explanation</label>
                  <textarea
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value)}
                    required
                    placeholder="Describe what happened..."
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-2xl text-[12px] sm:text-[14px] font-semibold transition-all outline-none min-h-20 resize-none bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] placeholder-slate-400 text-slate-900 focus:bg-white/60 focus:border-purple-300 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </form>

              <div className="px-6 py-4 sm:px-8 sm:py-5 flex justify-center items-center gap-3 sm:gap-4 shrink-0 border-t border-slate-200/60">
                <button type="button" onClick={() => setShowReplaceModal(false)} className={`flex-1 py-3.5 rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>Cancel</button>
                <button type="submit" form="replacementForm" disabled={isSubmittingReplace || !replaceAssetId || !replaceReason.trim()} className="flex-1 py-3.5 bg-purple-500 text-white rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 border border-purple-400">
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
        if (setAssignedAssets) setAssignedAssets((prev: any[]) => prev.map(a => a.id === targetAsset.id ? { ...a, status: 'Pending Return' } : a));
        
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
    if (type === 'RETURN') return 'bg-white border border-slate-200 text-orange-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    if (type === 'REQUEST') return 'bg-white border border-slate-200 text-emerald-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    if (type === 'INSPECTION') return 'bg-white border border-slate-200 text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    return 'bg-white border border-slate-200 text-purple-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
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
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl max-h-[80vh] sm:max-h-[85vh] rounded-4xl flex flex-col overflow-hidden bg-white/80 backdrop-blur-3xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.15)]"
      >
        <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7 sm:pb-5 flex justify-between items-center shrink-0 border-b border-slate-200/60">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-3xl flex items-center justify-center ${getHeaderColors()}`}>
               {getHeaderIcon()}
            </div>
            <div>
              <h2 className="text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-slate-900">{getTitle()}</h2>
              {type !== 'RETURN' && <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-500">{type === 'INSPECTION' ? 'Visual verification' : 'Portal Submission'}</p>}
              {type === 'RETURN' && <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-500">Initiate IT Handover</p>}
            </div>
          </div>
          <button onClick={onClose} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}>
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-6 py-4 sm:px-8 sm:py-5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 custom-scrollbar">
          {successDone ? (
            <div className="py-10 text-center space-y-4">
              <CheckCircle2 size={72} className="text-emerald-500 mx-auto animate-bounce"/>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-900">Database Updated!</h4>
            </div>
          ) : showQR ? (
            <div className="py-4 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div>
                <h4 className="text-base sm:text-lg font-bold uppercase tracking-widest text-slate-900">Mobile Device Handoff</h4>
                <p className="text-[11px] sm:text-xs font-medium mt-1.5 text-slate-500">Scan this code with your phone camera to take certified watermark photos of the asset.</p>
              </div>
              <div className="p-4 sm:p-5 rounded-4xl inline-block shadow-2xl mx-auto border bg-white border-slate-200">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Scan to Audit" className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl" />
              </div>
              <div className="p-4 sm:p-5 rounded-2xl text-left transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-purple-300">
                <h5 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-purple-600"><Camera size={16}/> Photo Requirements</h5>
                <ul className="text-[11px] sm:text-xs font-semibold space-y-2 ml-1 text-slate-900">
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
                <div className="p-4 sm:p-5 rounded-3xl space-y-3 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 text-rose-600">🔒 Security Verification Required</p>
                  <div className="flex gap-2 sm:gap-3">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder={user.id === 'guest-mock-uuid' ? 'Type anything for Guest...' : 'Type exact Tag ID or S/N...'} className="flex-1 px-4 sm:px-5 py-3.5 rounded-2xl text-[12px] sm:text-[13px] font-semibold outline-none transition-all bg-white/60 border border-slate-200 text-[#0f172a] placeholder-[#818b9c] focus:ring-2 focus:ring-orange-500/20"/>
                    {!isUnlocked && <button type="button" onClick={handleAttemptUnlock} className="px-5 sm:px-6 bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest text-[10px] sm:text-[11px] rounded-2xl cursor-pointer transition-all shadow-[0_4px_15px_rgba(244,63,94,0.4)] border border-rose-400">Verify</button>}
                  </div>
                  {lockError && <p className="text-[10px] sm:text-[11px] text-rose-500 font-bold px-1">Incorrect device code.</p>}
                </div>
              )}

              {type === 'RETURN' && (
                <>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Select Assigned Asset
                    </label>
                    <div className="relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-orange-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                      <select
                        value={selectedReturnId}
                        onChange={(e) => setSelectedReturnId(e.target.value)}
                        required
                        className="w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900"
                      >
                        <option value="" disabled>Choose Hardware...</option>
                        {assignedAssets?.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.name || a.asset_name} ({a.asset_tag})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" />
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
                        <div className="px-4 sm:px-5 py-3 sm:py-4 rounded-2xl flex gap-4 bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm">
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest block text-slate-500">Tag ID</span>
                            <span className="text-[11px] sm:text-[13px] font-semibold wrap-break-word text-slate-900">
                              {assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId))?.asset_tag}
                            </span>
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest block text-slate-500">Serial Number</span>
                            <span className="text-[11px] sm:text-[13px] font-semibold wrap-break-word text-slate-900">
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
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Issue Subject</label>
                    <input value={formTitle} onChange={e=>setFormTitle(e.target.value)} required placeholder="E.g. Monitor display flickering" className="w-full px-4 sm:px-5 py-3.5 rounded-2xl outline-none text-[12px] sm:text-[14px] font-semibold transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] placeholder-[#818b9c] text-[#0f172a] focus:bg-white/60 hover:border-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"/>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Category</label>
                    <div className="relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className="w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900">
                        <option>Hardware</option>
                        <option>Software</option>
                        <option>Network</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Attach Screenshot (Optional)</label>
                    <label className="w-full p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 border-2 border-dashed transition-all cursor-pointer bg-white/40 backdrop-blur-xl border-white/80 hover:border-purple-400 hover:bg-white/60 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                       <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-100">
                         {screenshot ? <ImagePlus size={16} className="text-purple-500" /> : <UploadCloud size={16} className="text-slate-400" />}
                       </div>
                       <span className={`text-[11px] sm:text-[12px] font-semibold text-center ${screenshot ? 'text-purple-600' : 'text-slate-900'}`}>
                         {screenshot ? screenshot.name : "Click to upload"}
                       </span>
                    </label>
                  </div>
                </>
              )}

              {type === 'REQUEST' && (
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Equipment Category</label>
                  <div className="relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-emerald-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className="w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900">
                      <option>Laptop / PC</option>
                      <option>Monitor</option>
                      <option>Keyboard / Mouse</option>
                      <option>Headset / Audio</option>
                      <option>Other Accessory</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" />
                  </div>
                </div>
              )}

              {(type === 'INSPECTION' || type === 'RETURN') && isUnlocked && (
                <div className="flex flex-col gap-1.5 sm:gap-2 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Current Asset Condition</label>
                  <div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] ${type === 'RETURN' ? 'hover:border-orange-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'}`}>
                    <select value={formCondition} onChange={e=>setFormCondition(e.target.value)} className="w-full pl-4 sm:pl-5 pr-10 py-3.5 text-[12px] sm:text-[14px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900">
                      <option>Pristine / Flawless</option>
                      <option>Good / Minor Scratches</option>
                      <option>Poor / Damaged (Requires Fix)</option>
                      <option>Non-Functional / Dead</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {type === 'INSPECTION' ? 'Audit Notes' : type === 'RETURN' ? 'Return Reason & Notes' : type === 'REQUEST' ? 'Business Justification' : 'Detailed Explanation'}
                </label>
                <textarea rows={3} value={formText} onChange={e=>setFormText(e.target.value)} required placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : type === 'RETURN' ? "Provide reason for returning..." : "Describe what happened..."} className={`w-full px-4 sm:px-5 py-3.5 rounded-2xl text-[12px] sm:text-[14px] font-semibold transition-all outline-none resize-none min-h-20 bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] placeholder-[#818b9c] text-[#0f172a] focus:bg-white/60 ${type === 'RETURN' ? 'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300' : type === 'REQUEST' ? 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300' : 'focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300'}`}/>
              </div>
            </form>
          )}
        </div>

        {!successDone && (
          <div className="px-6 py-4 sm:px-8 sm:py-5 flex justify-center items-center gap-3 sm:gap-4 shrink-0 relative z-10 border-t border-slate-200/60">
            {showQR ? (
              <button onClick={onClose} className={`w-full py-3.5 rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>
                Close Portal
              </button>
            ) : (
              <>
                <button onClick={onClose} className={`flex-1 py-3.5 rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="genericModalForm"
                  disabled={isTransmitting || (needsLock && !isUnlocked)} 
                  className={`flex-1 py-3.5 text-white rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                    type === 'RETURN' 
                      ? 'bg-orange-500 shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)]' 
                      : type === 'REQUEST'
                      ? 'bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)] border border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      : 'bg-purple-500 shadow-[0_4px_15px_rgba(168,85,247,0.4)] border border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                  }`}
                >
                  {isTransmitting ? <Loader2 size={16} className="animate-spin" /> : (type === 'INSPECTION' || type === 'RETURN' ? 'Generate QR' : 'Transmit')}
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}