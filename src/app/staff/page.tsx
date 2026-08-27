'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  while (lastSaturday.getDay() !== 6) { lastSaturday.setDate(lastSaturday.getDate() - 1); }
  lastSaturday.setHours(23, 59, 59, 999);
  const windowStart = new Date(lastSaturday);
  windowStart.setDate(lastSaturday.getDate() - 4);
  windowStart.setHours(0, 0, 0, 0);
  return { isOpen: today >= windowStart && today <= lastSaturday, windowStart, lastSaturday, year, month: targetMonth };
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
  if (diffHrs < 1) { return `${Math.floor(Math.max(0, (d2 - d1) / (1000 * 60)))} mins`; }
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

  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({ isOpen: false, type: '' });
  
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceAssetId, setReplaceAssetId] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceCondition, setReplaceCondition] = useState('Minor Wear');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);
  const [remotePhotos, setRemotePhotos] = useState<string[]>([]);
  const [localPhotos, setLocalPhotos] = useState<File[]>([]);

  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const [handoverAsset, setHandoverAsset] = useState<any>(null);
  const [viewAgreementAsset, setViewAgreementAsset] = useState<any>(null);
  const [viewInspectionAsset, setViewInspectionAsset] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);

  const formatDisplayName = (raw: string) => {
    if (!raw) return 'Staff Member';
    let s = raw.split('@')[0].split('.')[0].replace(/[_-]/g, ' ');  
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
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const triggerDesktopAlert = (title: string, body: string) => {
    try { const audio = new Audio('/alert.mp3'); audio.play().catch(() => {}); } catch (err) {}
    if ('Notification' in window && Notification.permission === 'granted') { new Notification(title, { body, icon: '/logo.png' }); }
    toast(<div className="flex flex-col gap-1"><strong className="text-sm font-bold text-slate-800">{title}</strong><span className="text-xs font-medium text-slate-600">{body}</span></div>, { icon: '🔔', duration: 6000 });
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    const notifChannel = supabase.channel('staff-notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const notif = payload.new;
        if (notif.target_user === currentUser.id || notif.target_user === currentUser.email || notif.target_user === currentUser.emp_id || notif.target_user === 'ALL_STAFF' || notif.type === 'broadcast') {
          triggerDesktopAlert(notif.title || 'System Alert', notif.message || 'You have a new notification.');
          loadRealDatabase(false);
        }
      }).subscribe();
    return () => { supabase.removeChannel(notifChannel); };
  }, [currentUser]);

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
        const latestReturnInsp = assetInspections.find(i => (i.status || '').toLowerCase().includes('return') || (i.notes || '').toLowerCase().includes('return'));

        let nextDue = null;
        if (asset.next_inspection_date) { nextDue = new Date(asset.next_inspection_date); } 
        else if (latestInsp?.created_at || asset.last_inspection_date) { nextDue = calculateNextDueDate(latestInsp?.created_at || asset.last_inspection_date, asset.category); } 
        else { nextDue = calculateNextDueDate(asset.created_at, asset.category); }
        const isOverdue = nextDue ? (new Date(nextDue).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) : false;

        const assetStatus = (asset.status || '').toLowerCase().trim();
        const inspStatus = (asset.inspection_status || '').toLowerCase().trim();
        const liveInspStatus = (latestInsp?.status || '').toLowerCase().trim();
        const fullNotes = ((asset.notes || '') + ' ' + (latestInsp?.notes || '')).toLowerCase();
        const allAdminRemarks = ((asset.admin_remarks || '') + ' ' + (latestReturnInsp?.admin_remarks || '') + ' ' + (latestInsp?.admin_remarks || '')).toLowerCase();

        let isReturnApproved = false; let isReturnRejected = false; let isReturnPending = false;
        let isReplacePending = false; let isReplaceRejected = false; let isInspectionRejected = false;

        const hasRejectionKeywords = ['reject', 'declin', 'missing', 'upload', 'resend', 'again'].some(kw => allAdminRemarks.includes(kw));

        if (assetStatus.includes('return approved') || assetStatus === 'in stock' || assetStatus === 'unassigned' || liveInspStatus.includes('return approved')) {
            isReturnApproved = true;
        } else if (
            assetStatus.includes('return reject') || assetStatus.includes('return decline') ||
            liveInspStatus.includes('return reject') || liveInspStatus.includes('return decline') ||
            (fullNotes.includes('return') && (liveInspStatus === 'rejected' || liveInspStatus === 'declined')) ||
            fullNotes.includes('[return declined]') || fullNotes.includes('[return rejected]') ||
            ((assetStatus.includes('return pending') || assetStatus.includes('pending return')) && hasRejectionKeywords)
        ) { isReturnRejected = true; } 
        else if (assetStatus.includes('return pending') || assetStatus.includes('pending return') || liveInspStatus.includes('return pending')) {
            isReturnPending = true;
        }

        if (!isReturnPending && !isReturnRejected && !isReturnApproved) {
            if (assetStatus.includes('replacement request') || assetStatus.includes('replace pending')) {
                if (hasRejectionKeywords) isReplaceRejected = true; else isReplacePending = true;
            } else if (assetStatus.includes('replacement reject') || assetStatus.includes('replace decline')) { isReplaceRejected = true; }
        }

        if (!isReturnRejected && !isReturnPending && !isReturnApproved && !isReplacePending && !isReplaceRejected) {
            if (inspStatus.includes('reject') || inspStatus.includes('fail') || inspStatus.includes('action required') || liveInspStatus.includes('reject') || liveInspStatus.includes('fail') || liveInspStatus.includes('re-inspection')) {
                isInspectionRejected = true;
            }
        }

        return {
          ...asset, live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null,
          live_admin_remarks: asset.admin_remarks || latestReturnInsp?.admin_remarks || latestInsp?.admin_remarks || null,
          latest_notes: latestInsp?.notes || null, latest_photos: latestInsp?.photos || null,
          nextDue, isOverdue, isReturnPending, isReturnRejected, isReturnApproved, isReplacePending, isReplaceRejected, isInspectionRejected
        };
      });

      const displayAssets = [];
      for (const asset of compiledAssets) {
        if (asset.isReturnApproved) {
          if (asset.status !== 'In Stock' || asset.assigned_to !== null) { supabase.from('assets').update({ status: 'In Stock', assigned_to: null, inspection_status: null }).eq('id', asset.id).then(); }
        } else { displayAssets.push(asset); }
      }

      setAssignedAssets(displayAssets);
      if (currentAssetIndex >= displayAssets.length) setCurrentAssetIndex(0);
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

  const replaceStateRef = useRef({ replaceAssetId, replaceCondition, replaceReason, currentUser, assignedAssets });
  useEffect(() => { replaceStateRef.current = { replaceAssetId, replaceCondition, replaceReason, currentUser, assignedAssets }; }, [replaceAssetId, replaceCondition, replaceReason, currentUser, assignedAssets]);

  useEffect(() => {
    if (!qrSessionId) return;
    const photoChannel = supabase.channel(`qr_session_${qrSessionId}`)
      .on('broadcast', { event: 'session_complete' }, async (payload) => {
         const finalPhotos = payload.payload?.photos || [];
         const state = replaceStateRef.current;
         const activeAsset = state.assignedAssets.find(a => String(a.id) === state.replaceAssetId);
         if (!activeAsset) return;

         try {
           await supabase.from('replacements').insert({
              old_asset_id: activeAsset.id, asset_tag: activeAsset.asset_tag, serial_number: activeAsset.serial_number,
              user_id: state.currentUser.id, staff_name: state.currentUser.name, user_email: state.currentUser.email, emp_code: state.currentUser.emp_id,
              condition: state.replaceCondition, reason: state.replaceReason, photos: finalPhotos, status: 'Pending Approval'
           });
           
           await supabase.from('assets').update({ status: 'Replacement Requested', photos: finalPhotos, admin_remarks: null }).eq('id', activeAsset.id);
           
           await supabase.from('inspections').insert({
              asset_id: activeAsset.id, user_id: state.currentUser.id, user_name: state.currentUser.name, status: 'Pending Review', condition: state.replaceCondition,
              notes: `[REPLACEMENT REQUEST] ${state.replaceReason}`, photos: finalPhotos, type: 'REPLACEMENT'
           });
           
           await supabase.from('notifications').insert({
              target_user: 'ADMIN_SYSTEM', target_role: 'admin', title: `New REPLACEMENT Submission`,
              message: `${state.currentUser.name} (${state.currentUser.emp_id}) requested a replacement.`, type: 'info', is_read: false
           });
           
           resetReplaceModal();
           toast.success("Request successfully sent to Admin.", { icon: '✅', duration: 4000 });
           loadRealDatabase(false);
         } catch(e: any) { console.error("Replacement Sync Error:", e); }
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

  const uploadMultiplePhotos = async (files: File[]) => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from('asset-photos').upload(`${fileName}`, file);
        if (!error) {
          const { data } = supabase.storage.from('asset-photos').getPublicUrl(`${fileName}`);
          uploadedUrls.push(data.publicUrl);
        }
      } catch (error) { console.error("Upload failed", error); }
    }
    return uploadedUrls;
  };

  const resetReplaceModal = () => {
    setShowReplaceModal(false); setReplaceAssetId(''); setReplaceReason(''); setReplaceCondition('Minor Wear'); setQrUrl(null); setQrSessionId(null); setRemotePhotos([]); setLocalPhotos([]);
  };

  const handleGenerateQR = (asset: any) => {
    if (!replaceReason.trim()) return alert("Please provide a replacement reason.");
    const sessionId = crypto.randomUUID(); setQrSessionId(sessionId);
    const uploadLink = `${window.location.origin}/mobile-audit?session=${sessionId}&assetId=${asset.id}&userId=${currentUser.id}&req=5&name=${encodeURIComponent(currentUser.name)}&empCode=${encodeURIComponent(currentUser.emp_id)}&cat=${encodeURIComponent(asset.category)}&cond=${encodeURIComponent(replaceCondition)}&notes=${encodeURIComponent(replaceReason)}&auditType=REPLACEMENT`;
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uploadLink)}&color=0f172a&bgcolor=ffffff`);
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceAssetId) return;
    setIsSubmittingReplace(true);
    const activeAsset = assignedAssets.find(a => String(a.id) === replaceAssetId);
    if (!activeAsset) return;

    try {
      const newUrls = await uploadMultiplePhotos(localPhotos);
      const allPhotos = [...remotePhotos, ...newUrls];

      await supabase.from('replacements').insert({
        old_asset_id: activeAsset.id, asset_tag: activeAsset.asset_tag, serial_number: activeAsset.serial_number,
        user_id: currentUser.id, staff_name: currentUser.name, user_email: currentUser.email, emp_code: currentUser.emp_id,
        condition: replaceCondition, reason: replaceReason, photos: allPhotos.length > 0 ? allPhotos : null, status: 'Pending Approval'
      });

      await supabase.from('assets').update({ status: 'Replacement Requested', photos: allPhotos, admin_remarks: null }).eq('id', activeAsset.id);

      await supabase.from('inspections').insert({
        asset_id: activeAsset.id, user_id: currentUser.id, user_name: currentUser.name, status: 'Pending Review', condition: replaceCondition,
        notes: `[REPLACEMENT REQUEST] ${replaceReason}`, photos: allPhotos, type: 'REPLACEMENT'
      });

      await supabase.from('notifications').insert({
        target_user: 'ADMIN_SYSTEM', target_role: 'admin', title: `New REPLACEMENT Submission`, message: `${currentUser.name} (${currentUser.emp_id}) requested a replacement.`, type: 'info', is_read: false
      });

      loadRealDatabase(false); 
      resetReplaceModal();
      toast.success(`Replacement request for ${activeAsset.asset_tag} sent successfully.`);
    } catch (err: any) { 
      console.error("Replace Submit Error:", err);
      toast.error(`Failed to submit: ${err.message || err.details || 'Unknown error occurred'}`); 
    } finally { 
      setIsSubmittingReplace(false); 
    }
  };

  const handleDigitalSign = async () => {
    if (!handoverAsset) return; setIsSigning(true);
    try {
      const timestamp = new Date().toLocaleString('en-IN');
      const staffName = currentUser.full_name || currentUser.name; const empCode = currentUser.emp_code || currentUser.emp_id;
      const officialNote = `Digitally Signed Handover Agreement by ${staffName} on ${timestamp}`;
      await supabase.from('assets').update({ status: 'Assigned', inspection_status: 'Approved', last_inspection_date: new Date().toISOString()}).eq('id', handoverAsset.id);
      await supabase.from('inspections').insert({ asset_id: handoverAsset.id, inspected_by: currentUser.id, status: 'Approved', notes: officialNote });
      await supabase.from('notifications').insert({ target_user: 'ADMIN_SYSTEM', target_role: 'admin', title: '📝 Agreement Signed', message: `${staffName} (${empCode}) has digitally signed the handover agreement for ${handoverAsset.name || handoverAsset.asset_name} (${handoverAsset.asset_tag}).`, type: 'success', is_read: false });
      toast.success("Handover Agreement Successfully Signed!"); setHandoverAsset(null); loadRealDatabase(false); 
    } catch (error: any) { toast.error(`Error signing agreement: ${error.message}`); } finally { setIsSigning(false); }
  };
  
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-orange-100/80 text-orange-600 font-bold border border-orange-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    if (s === 'in progress') return 'bg-purple-100/80 text-purple-600 font-bold border border-purple-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-100/80 text-emerald-600 font-bold border border-emerald-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
    return 'bg-slate-100/80 text-slate-600 font-bold border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
  };

  const getInspectionStatusColor = (status: string) => {
    const s = safeString(status).toLowerCase().trim();
    if (s.includes('approved') || s.includes('pass')) return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 shadow-sm';
    if (s.includes('return')) return 'bg-purple-500/10 border border-purple-500/30 text-purple-500 shadow-sm';
    if (s.includes('replace')) return 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 shadow-sm';
    if (s.includes('rejected') || s.includes('fail')) return 'bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-sm';
    if (s.includes('pending handover')) return 'bg-amber-500/10 border border-amber-500/30 text-amber-500 shadow-sm';
    return 'bg-blue-500/10 border border-blue-500/30 text-blue-500 shadow-sm';
  };

  const getAssetAuditState = (asset: any) => {
    const auditWindow = getAuditWindowInfo(asset.category);
    if (asset.isReturnPending || asset.isReplacePending) return { disabled: true, text: "Locked", classes: "bg-white/40 backdrop-blur-xl text-slate-400 font-bold border border-white/60 cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]" };
    if (asset.isInspectionRejected) return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
    if (asset.isOverdue) return { disabled: false, text: "Overdue: Audit Now", classes: "bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse border-transparent" };
    const hasAudited = allInspections.some(insp => {
       const d = new Date(insp.created_at);
       return insp.asset_id === asset.id && d.getFullYear() === auditWindow.year && d.getMonth() === auditWindow.month && !insp.notes?.toLowerCase().includes('return') && !insp.status?.toLowerCase().includes('return') && (insp.status === 'Approved' || insp.status === 'Pending Review' || insp.status === 'Pending');
    });
    if (hasAudited) return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-50/80 backdrop-blur-xl text-emerald-600 font-bold border border-emerald-200 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-not-allowed" };
    const auditDateStr = auditWindow.windowStart.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens\n${auditDateStr}`, classes: "bg-white/40 backdrop-blur-xl text-slate-500 font-bold border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] cursor-not-allowed" };
    return { disabled: false, text: "Audit Device", classes: "bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] font-bold text-white cursor-pointer border border-orange-400" };
  };

  const requiresGlobalReinspection = assignedAssets.some(a => a.isInspectionRejected || a.isOverdue);
  const isGlobalAuditOpen = assignedAssets.some(a => getAuditWindowInfo(a.category).isOpen) || requiresGlobalReinspection;
  const pendingHandovers = assignedAssets.filter(a => a.status === 'Pending Handover');

  const theme = {
    glassCard: 'bg-white/40 backdrop-blur-3xl border border-white/60 shadow-[0_8px_32px_rgba(230,210,200,0.15),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.15)] hover:border-orange-300/60', 
    glassPanel: 'bg-white/30 backdrop-blur-2xl border border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.02),inset_0_1px_2px_rgba(255,255,255,0.7)]',
    glassItem: 'bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all duration-500',
    glassButton: 'bg-white/40 backdrop-blur-xl border border-white/60 text-slate-700 hover:bg-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all cursor-pointer',
    glassInnerCard: 'bg-white/20 backdrop-blur-lg border border-white/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]',
    textMain: 'text-slate-900', textSub: 'text-slate-500',
  };

  if (loading) return null; if (!isAuthorized) return null; 

  const activeAsset = assignedAssets.find(a => String(a.id) === replaceAssetId);
  const activeIndex = assignedAssets.length > 0 ? Math.min(currentAssetIndex, Math.max(0, assignedAssets.length - 1)) : 0;
  const visibleAsset = assignedAssets[activeIndex];

  return (
    <div className="w-full h-full flex flex-col px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 gap-4 sm:gap-5 overflow-hidden relative z-10 font-sans bg-transparent transition-colors duration-1000">
      
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
          <button onClick={() => loadRealDatabase(true)} disabled={isRefreshing} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-orange-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50">
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Sync Feeds
          </button>
        </div>
      </div>

      <AnimatePresence>
        {pendingHandovers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`shrink-0 ${theme.glassCard} bg-orange-50/50 border-orange-200/50 rounded-3xl p-4 shadow-[0_8px_30px_rgba(249,115,22,0.1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden`}>
            <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="p-2.5 bg-white/80 backdrop-blur-md border border-orange-100 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] text-orange-600 rounded-xl shrink-0"><FileSignature size={20} /></div>
              <div>
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">Action Required <span className="px-2 py-0.5 bg-orange-500 text-white rounded-md text-[9px] animate-pulse shadow-sm">1 Pending</span></h3>
                <p className="text-[11px] font-semibold text-slate-600 mt-0.5">You have new hardware assigned to you. Please review and sign the Handover Agreement.</p>
              </div>
            </div>
            <button onClick={() => setHandoverAsset(pendingHandovers[0])} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.3)] transition-all cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap border border-orange-400 shrink-0 relative z-10">Review & Sign</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shrink-0 flex flex-col xl:flex-row gap-4 sm:gap-5 w-full">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'IT failure', icon: Ticket, color: 'text-purple-600', type: 'TICKET', isActionDisabled: false, path: null },
            { name: 'Device Audit', desc: requiresGlobalReinspection ? 'Action Required' : (isGlobalAuditOpen ? 'Submit inspection' : 'Window Closed'), icon: ClipboardCheck, color: requiresGlobalReinspection ? 'text-rose-600 animate-pulse' : (isGlobalAuditOpen ? 'text-amber-600' : 'text-slate-400'), type: 'INSPECTION', isActionDisabled: !isGlobalAuditOpen, path: null },
            { name: 'Request Gear', desc: 'New equipment', icon: PlusCircle, color: 'text-emerald-600', type: 'REQUEST', isActionDisabled: false, path: null },
            { name: 'Team Screen', desc: 'Remote access', icon: Monitor, color: 'text-orange-600', type: 'ROUTE', isActionDisabled: false, path: '/staff/dashboard/remote' },
          ].map((item) => (
            <button key={item.name} onClick={() => { if (item.isActionDisabled) return; if (item.path) { router.push(item.path); } else { setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] }); } }} disabled={item.isActionDisabled} className={`relative ${theme.glassItem} min-h-18 sm:min-h-20 p-3.5 rounded-3xl flex flex-col justify-between transition-all duration-300 ease-out group ${item.isActionDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)]'}`}>
              <div className="flex items-start justify-between w-full">
                <div className={`p-2.5 rounded-xl bg-white/40 border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all duration-300 ${item.isActionDisabled ? '' : 'group-hover:scale-110 group-hover:bg-white/60'} ${item.color}`}>
                  {item.isActionDisabled ? <Lock size={16} /> : <item.icon size={16} strokeWidth={2.5} />}
                </div>
                {!item.isActionDisabled && (
                  <div className="p-1.5 rounded-full bg-white/40 border border-white/60 text-slate-400 group-hover:bg-white/80 group-hover:text-purple-600 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]"><ArrowRight size={12} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" /></div>
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
        
        <div className="w-full lg:w-2/3 flex flex-col min-h-112.5 lg:min-h-0">
          <div className={`${theme.glassPanel} rounded-4xl p-4 md:p-5 flex-1 flex flex-col min-h-0`}>
            <div className="flex items-center justify-between border-b pb-3 mb-3 border-white/40 shrink-0">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-900"><Laptop className="text-purple-500 shrink-0" size={18}/> My Hardware Units</div>
              <div className="flex items-center gap-3">
                 {assignedAssets.length > 1 ? (
                    <span className="bg-white/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] flex items-center gap-2">
                      <span className="text-sm font-black tracking-widest"><span className="text-orange-500">{activeIndex + 1}</span> <span className="text-slate-400 mx-1 text-xs">/</span> <span className="text-purple-600">{assignedAssets.length}</span></span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">DEVICES</span>
                    </span>
                 ) : (
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-white/40 px-4 py-2 rounded-xl border border-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]">{assignedAssets.length} Assigned</span>
                 )}
              </div>
            </div>
            
            <div className="flex-1 relative w-full flex flex-col justify-center min-h-0">
              {assignedAssets.length > 1 && (
                <>
                  <div className="absolute inset-y-0 -left-2 sm:-left-4 flex items-center z-20 pointer-events-none"><button onClick={() => setCurrentAssetIndex(prev => (prev > 0 ? prev - 1 : assignedAssets.length - 1))} className="pointer-events-auto p-3 sm:p-4 rounded-full bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:bg-white/80 transition-all text-slate-600 hover:text-orange-600 hover:border-orange-300 hover:scale-110 active:scale-95 ml-2"><ChevronLeft size={24} strokeWidth={3} /></button></div>
                  <div className="absolute inset-y-0 -right-2 sm:-right-4 flex items-center z-20 pointer-events-none"><button onClick={() => setCurrentAssetIndex(prev => (prev < assignedAssets.length - 1 ? prev + 1 : 0))} className="pointer-events-auto p-3 sm:p-4 rounded-full bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,1)] hover:bg-white/80 transition-all text-slate-600 hover:text-orange-600 hover:border-orange-300 hover:scale-110 active:scale-95 mr-2"><ChevronRight size={24} strokeWidth={3} /></button></div>
                </>
              )}

              {assignedAssets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center font-medium text-xs text-slate-500">No active assets linked to your account.</div>
              ) : (
                <AnimatePresence mode="wait">
                  {visibleAsset && (() => {
                    const asset = visibleAsset;
                    const btnState = getAssetAuditState(asset);
                    return (
                      <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.98, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.98, x: -10 }} transition={{ duration: 0.25 }} className={`w-full h-full py-4 sm:py-5 px-10 sm:px-14 lg:px-16 rounded-3xl flex flex-col justify-between transition-all duration-500 bg-white/20 backdrop-blur-3xl border border-white/40 shadow-xl hover:shadow-[0_12px_40px_rgba(249,115,22,0.15)] hover:border-orange-300/60`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
                          <h4 className="font-semibold text-base tracking-tight leading-tight text-slate-800 truncate w-full sm:w-auto">{asset.name || asset.asset_name || asset.model || 'Generic Device'}</h4>
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] ${asset.isReturnRejected ? 'bg-rose-100/80 text-rose-700 border-rose-200' : asset.isReturnPending ? 'bg-orange-100/80 text-orange-700 border-orange-200' : asset.isReplaceRejected ? 'bg-rose-100/80 text-rose-700 border-rose-200' : asset.isReplacePending ? 'bg-purple-100/80 text-purple-700 border-purple-200' : asset.isInspectionRejected ? 'bg-amber-100/80 text-amber-700 border-amber-200 animate-pulse' : asset.isOverdue ? 'bg-rose-100/80 text-rose-700 border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {asset.isReturnRejected ? 'Return Declined' : asset.isReturnPending ? 'Pending Return' : asset.isReplaceRejected ? 'Replacement Declined' : asset.isReplacePending ? 'Replacement Pending' : asset.isInspectionRejected ? 'Re-Inspection Req' : asset.isOverdue ? 'Overdue' : 'Assigned & Active'}
                          </span>
                        </div>

                        <div className={`flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-[1.25rem] shrink-0 my-2 ${theme.glassInnerCard}`}>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Tag ID</span><span className="font-mono text-[11px] sm:text-xs font-bold text-slate-900 wrap-break-word block leading-tight">{asset.asset_tag || 'N/A'}</span></div>
                            <div className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Serial S/N</span><span className="font-mono text-[11px] sm:text-xs font-bold text-slate-900 wrap-break-word block leading-tight">{asset.serial_number || 'N/A'}</span></div>
                            <div className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Category</span><span className="text-[11px] sm:text-xs font-bold text-slate-900 wrap-break-word block leading-tight">{asset.category || 'N/A'}</span></div>
                          </div>
                          <div className="w-full border-t border-slate-300/30 dark:border-white/10 my-0"></div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-1.5 text-slate-500">Status (Inspection)</span>
                              <div className="flex items-center"><button onClick={() => setViewInspectionAsset(asset)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border shadow-sm transition-transform hover:scale-105 cursor-pointer leading-tight ${getInspectionStatusColor(asset.live_inspection_status)}`}>{asset.live_inspection_status || 'Approved'}</button></div>
                            </div>
                            <div className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Updated</span><span className="text-[11px] sm:text-xs font-bold text-slate-900 wrap-break-word block leading-tight">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-GB') : 'N/A'}</span></div>
                            <div className="min-w-0"><span className="text-[9px] font-bold uppercase tracking-widest block mb-0.5 text-slate-500">Next Due</span><span className={`text-[11px] sm:text-xs font-bold wrap-break-word block leading-tight ${asset.isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>{asset.nextDue ? asset.nextDue.toLocaleDateString('en-GB') : 'N/A'}</span></div>
                            <div className="min-w-0 flex flex-col justify-start">
                              <span className="text-[9px] font-bold uppercase tracking-widest block mb-1.5 text-slate-500">Handover</span>
                              <button onClick={() => asset.status === 'Pending Handover' ? setHandoverAsset(asset) : setViewAgreementAsset(asset)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border shadow-sm transition-all hover:scale-105 cursor-pointer w-fit leading-tight ${asset.status === 'Pending Handover' ? 'bg-amber-100/80 text-amber-700 border-amber-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}><FileSignature size={14} />{asset.status === 'Pending Handover' ? 'Pending' : 'Signed'}</button>
                            </div>
                          </div>
                        </div>
                        
                        { (asset.isReturnRejected || asset.isReplaceRejected || asset.isInspectionRejected) && (
                          <div className="p-2.5 mt-1 mb-2 rounded-xl border border-rose-200/50 bg-rose-50/50 backdrop-blur-md text-rose-700 text-[11px] font-medium flex gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.5)] shrink-0 items-start">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <div className="leading-tight"><span className="inline-block text-[9px] font-bold uppercase tracking-widest opacity-80 mr-1">Admin Response:</span>{extractAdminReason(asset.live_admin_remarks, asset.notes)}</div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 mt-auto border-t border-slate-300/40 shrink-0 w-full relative z-30">
                          
                          <div className="w-full sm:flex-1 flex justify-start">
                            {asset.isReturnPending ? (
                              <button disabled className={`px-5 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all bg-white/40 backdrop-blur-xl border border-white/60 text-slate-700 opacity-60 cursor-not-allowed`}>Waiting on Admin</button>
                            ) : asset.isReturnRejected ? (
                              <button onClick={async () => { await supabase.from('assets').update({ status: 'Assigned', inspection_status: null, admin_remarks: null }).eq('id', asset.id); loadRealDatabase(false); setModal({ isOpen: true, type: 'RETURN', targetAsset: asset }); }} className="px-5 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all shadow-sm bg-white/40 backdrop-blur-xl border border-orange-300/60 text-orange-600 hover:bg-orange-50/60 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] cursor-pointer">Return (Retry)</button>
                            ) : (
                              <button disabled={asset.isReplacePending} onClick={() => { setModal({ isOpen: true, type: 'RETURN', targetAsset: asset }); }} className={`px-5 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] ${(asset.isReplacePending) ? 'bg-white/30 backdrop-blur-xl border border-white/40 text-slate-400 cursor-not-allowed opacity-60' : 'bg-white/40 backdrop-blur-xl border border-orange-300/60 text-orange-600 hover:bg-orange-50/60 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] cursor-pointer'}`}>Return</button>
                            )}
                          </div>
                          
                          <div className="w-full sm:flex-1 flex justify-center">
                            {asset.isReplacePending ? (
                              <button disabled className={`px-5 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all bg-white/40 backdrop-blur-xl border border-white/60 text-slate-700 opacity-60 cursor-not-allowed`}>Waiting on Admin</button>
                            ) : asset.isReplaceRejected ? (
                              <button onClick={async () => { await supabase.from('assets').update({ status: 'Assigned', admin_remarks: null }).eq('id', asset.id); loadRealDatabase(false); setReplaceAssetId(asset.id); setShowReplaceModal(true); }} className="px-5 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all shadow-sm bg-white/40 backdrop-blur-xl border border-purple-300/60 text-purple-600 hover:bg-purple-50/60 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer">Replace (Retry)</button>
                            ) : (
                              <button disabled={asset.isReturnPending} onClick={() => { setReplaceAssetId(asset.id); setShowReplaceModal(true); }} className={`px-5 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] ${(asset.isReturnPending) ? 'bg-white/30 backdrop-blur-xl border border-white/40 text-slate-400 cursor-not-allowed opacity-60' : 'bg-white/40 backdrop-blur-xl border border-purple-300/60 text-purple-600 hover:bg-purple-50/60 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer'}`}>Replace</button>
                            )}
                          </div>

                          <div className="w-full sm:flex-1 flex justify-end">
                            <button disabled={btnState.disabled} onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} className={`px-5 py-1.5 sm:py-2 font-bold text-[10px] sm:text-[11px] rounded-2xl transition-all flex flex-col items-center justify-center shadow-sm ${btnState.disabled && !btnState.text.includes('Opens') ? 'bg-emerald-50/80 backdrop-blur-xl text-emerald-600 border border-emerald-200 cursor-not-allowed' : btnState.disabled && btnState.text.includes('Opens') ? 'bg-white/40 backdrop-blur-xl text-slate-500 border border-white/60 cursor-not-allowed' : 'bg-linear-to-r from-orange-500 to-orange-600 text-white cursor-pointer border border-orange-400 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]'}`}>
                              <span className="flex items-center gap-1.5 leading-tight text-center">
                                {btnState.disabled && !btnState.text.includes('Opens') && <CheckCircle size={12} className="shrink-0" />}{btnState.disabled && btnState.text.includes('Opens') && <Lock size={12} className="shrink-0" />}
                                <span>{btnState.text.includes('Opens') ? (<><span className="block text-[8px] font-bold">Opens</span><span className="block text-[10px]">{btnState.text.replace('Opens\n', '').replace('Opens ', '')}</span></>) : (btnState.text)}</span>
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

        <div className="w-full xl:w-1/3 flex flex-col min-h-100 lg:min-h-0 pb-4 lg:pb-0">
          <div className={`${theme.glassPanel} rounded-4xl p-5 md:p-6 flex-1 flex flex-col min-h-0 group/panel`}>
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
                        <span className="font-bold text-[13px] leading-snug wrap-break-word text-slate-800">{tix.title || tix.subject}</span>
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-bold tracking-widest uppercase border shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                      </div>
                      
                      <p className="text-xs font-medium line-clamp-3 wrap-break-word text-slate-600">{tix.description || tix.note}</p>

                      {(tix.admin_remarks || tix.admin_notes || tix.resolution_notes) && (
                        <div className="p-3.5 rounded-2xl border border-purple-500/10 bg-purple-500/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                          <strong className="block mb-1.5 text-[9px] uppercase tracking-widest font-bold text-purple-600">Admin Response:</strong>
                          <span className="font-semibold text-slate-700 text-xs wrap-break-word">{tix.admin_remarks || tix.admin_notes || tix.resolution_notes}</span>
                        </div>
                      )}

                      {isResolved && (
                        <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-white/40">
                          {tix.updated_at && (<div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-slate-500"><Clock size={12}/> Resolved in: {formatDuration(tix.created_at, tix.updated_at)}</div>)}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-bold uppercase tracking-widest mr-2 text-slate-500">Rate Support:</span>
                            {[1, 2, 3, 4, 5].map(star => (<button key={star} disabled={!!tix.rating} onClick={() => handleRateTicket(tix.id, star)} className={`transition-all ${tix.rating ? 'cursor-default' : 'cursor-pointer hover:scale-125 hover:drop-shadow-lg'}`}><Star size={16} className={star <= (tix.rating || 0) ? "fill-amber-400 text-amber-400" : "text-white/60 drop-shadow-sm"} /></button>))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[9px] uppercase tracking-widest pt-4 mt-2 font-bold border-t border-white/40 text-slate-500">
                        <span className="wrap-break-word">Category: <strong className="text-slate-800">{tix.category || 'General'}</strong></span><span className="shrink-0">{tix.created_at ? new Date(tix.created_at).toLocaleDateString('en-GB') : 'Just now'}</span>
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
        {viewInspectionAsset && (() => {
          const asset = viewInspectionAsset;
          let photosArray: string[] = [];
          try {
            if (Array.isArray(asset.latest_photos)) photosArray = asset.latest_photos;
            else if (typeof asset.latest_photos === 'string' && asset.latest_photos.startsWith('[')) {
              const parsed = JSON.parse(asset.latest_photos);
              if (Array.isArray(parsed)) photosArray = parsed;
            } else if (asset.latest_photos && typeof asset.latest_photos === 'object') {
              photosArray = Object.values(asset.latest_photos);
            }
          } catch(e){}

          return (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40">
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className={`w-full max-w-3xl shadow-2xl overflow-hidden font-sans flex flex-col relative transition-all duration-300 rounded-4xl bg-[#e9e9ec] border border-white max-h-[85vh]`}>
                <div className="p-5 sm:p-6 flex justify-between items-center shrink-0 border-b border-slate-200/60 bg-white/40">
                   <div className="flex items-center gap-3.5">
                     <div className={`w-12 h-12 rounded-3xl flex items-center justify-center shadow-sm bg-white border border-slate-200 ${getInspectionStatusColor(asset.live_inspection_status).split(' ')[2]}`}><ClipboardCheck size={20} strokeWidth={2.5} /></div>
                     <div><h3 className="text-[15px] font-black text-slate-900 uppercase tracking-wider leading-tight">Inspection Details</h3><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{asset.name || asset.asset_tag}</p></div>
                   </div>
                   <button onClick={() => setViewInspectionAsset(null)} className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-colors"><X size={16} strokeWidth={2.5} /></button>
                </div>
                <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 custom-scrollbar bg-white/20">
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-5 rounded-3xl bg-white shadow-sm border border-slate-100">
                      <div><span className="text-[9px] font-black uppercase tracking-widest block mb-1 text-slate-500">Status</span><span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border shadow-sm ${getInspectionStatusColor(asset.live_inspection_status)}`}>{asset.live_inspection_status || 'Approved'}</span></div>
                      <div><span className="text-[9px] font-black uppercase tracking-widest block mb-1 text-slate-500">Date</span><span className="font-bold text-slate-900 text-xs sm:text-sm">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-GB') : 'N/A'}</span></div>
                      <div><span className="text-[9px] font-black uppercase tracking-widest block mb-1 text-slate-500">Category</span><span className="font-bold text-slate-900 text-xs sm:text-sm wrap-break-word block">{asset.category}</span></div>
                      <div><span className="text-[9px] font-black uppercase tracking-widest block mb-1 text-slate-500">Tag ID</span><span className="font-mono font-bold text-purple-600 text-xs sm:text-sm">{asset.asset_tag}</span></div>
                   </div>
                   {asset.latest_notes && (<div className="space-y-2 bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100"><h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Custodian Notes</h4><p className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">{asset.latest_notes}</p></div>)}
                   {asset.live_admin_remarks && (<div className="space-y-2 bg-rose-50/80 p-4 sm:p-5 rounded-3xl shadow-sm border border-rose-100"><h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1.5">Admin Remarks</h4><p className="text-xs sm:text-sm font-semibold text-rose-700 whitespace-pre-wrap leading-relaxed">{asset.live_admin_remarks}</p></div>)}
                   {photosArray.length > 0 && (
                     <div className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Uploaded Evidence</h4>
                       <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                         {photosArray.map((url, i) => (<img key={`insp-photo-${i}`} src={url} alt="Evidence" className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0 hover:scale-105 transition-transform" />))}
                       </div>
                     </div>
                   )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {modal.isOpen && (
          <LiveDatabaseModal 
            type={modal.type} asset={modal.targetAsset} user={currentUser} assignedAssets={assignedAssets}
            setAssignedAssets={setAssignedAssets} onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(false); }} theme={theme}
          />
        )}
      </AnimatePresence>
      
      {/* 🌟 NEW REPLACEMENT MODAL */}
      <AnimatePresence>
        {showReplaceModal && activeAsset && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReplaceModal(false)}
              className={`absolute inset-0 ${isDarkMode ? 'bg-black/40' : 'bg-slate-900/20'} backdrop-blur-md`}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-[30rem] rounded-[2.5rem] flex flex-col overflow-hidden ${theme.glassCard}`}
            >
              <div className="px-8 pt-8 pb-5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${
                    isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_2px_8px_rgba(168,85,247,0.15)] text-[#a855f7]'
                  }`}>
                     <PackageOpen size={26} strokeWidth={2} />
                  </div>
                  <h2 className={`text-[16px] font-black uppercase tracking-widest ${theme.textMain}`}>
                    Assets Replacement
                  </h2>
                </div>
                <button 
                  onClick={() => setShowReplaceModal(false)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-white/60'}`} />

              <form id="replacement-form" onSubmit={handleReplaceSubmit} className="px-8 pt-6 pb-6 flex flex-col gap-6 relative z-10">
                
                <div className="flex flex-col gap-2.5">
                  <label className={`text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                    Select Assigned Asset
                  </label>
                  <div className={`relative rounded-2xl overflow-hidden flex items-center pr-5 transition-all ${theme.glassInnerCard}`}>
                    <select
                      value={replaceAssetId}
                      onChange={(e) => setReplaceAssetId(e.target.value)}
                      required
                      className={`w-full pl-5 pr-10 py-4.5 text-[15px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}
                    >
                      <option value="" disabled className={isDarkMode ? 'text-black' : ''}>Choose Hardware...</option>
                      {assignedAssets.map(asset => (
                        <option key={asset.id} value={asset.id} className={isDarkMode ? 'text-black' : ''}>
                          {asset.name || asset.asset_name} ({asset.asset_tag})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={20} className={`absolute right-5 pointer-events-none ${theme.textSub}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {replaceAssetId && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: -10 }} 
                      animate={{ opacity: 1, height: 'auto', marginTop: -5 }} 
                      exit={{ opacity: 0, height: 0, marginTop: -10 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-6 py-5 rounded-2xl flex gap-4 ${theme.glassInnerCard}`}>
                        <div className="flex-1 space-y-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-widest block ${theme.textSub}`}>Tag ID</span>
                          <span className={`text-[13px] font-bold ${theme.textMain}`}>
                            {assignedAssets.find(a => String(a.id) === replaceAssetId)?.asset_tag}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <span className={`text-[10px] font-black uppercase tracking-widest block ${theme.textSub}`}>Serial Number</span>
                          <span className={`text-[13px] font-bold ${theme.textMain}`}>
                            {assignedAssets.find(a => String(a.id) === replaceAssetId)?.serial_number || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex flex-col gap-2.5">
                  <label className={`text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                    Current Asset Condition
                  </label>
                  <div className={`relative rounded-2xl overflow-hidden flex items-center pr-5 transition-all ${theme.glassInnerCard}`}>
                    <select 
                      value={replaceCondition} 
                      onChange={(e) => setReplaceCondition(e.target.value)} 
                      className={`w-full pl-5 pr-10 py-4.5 text-[15px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}
                    >
                      <option className={isDarkMode ? 'text-black' : ''} value="Minor Wear">Minor Hardware Issue</option>
                      <option className={isDarkMode ? 'text-black' : ''} value="Minor Wear">Minor Wear (Scratches/Dents)</option>
                      <option className={isDarkMode ? 'text-black' : ''} value="Damaged">Damaged / Broken Part</option>
                      <option className={isDarkMode ? 'text-black' : ''} value="Not Working">Not Working / Won't Power On</option>
                    </select>
                    <ChevronDown size={20} className={`absolute right-5 pointer-events-none ${theme.textSub}`} />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className={`text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                    Detailed Explanation
                  </label>
                  <textarea
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value)}
                    required
                    placeholder="Describe what happened..."
                    className={`w-full px-6 py-5 rounded-2xl text-[15px] font-semibold transition-all outline-none min-h-[8.75rem] resize-none ${theme.glassInnerCard} ${
                      isDarkMode ? 'placeholder-zinc-500 text-white' : 'placeholder-[#818b9c] text-[#0f172a]'
                    }`}
                  />
                </div>

              </form>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-white/60'}`} />

              <div className="px-8 py-7 flex justify-center items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowReplaceModal(false)}
                  className={`w-[8.75rem] py-3.5 rounded-[1.25rem] text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateQR(activeAsset)}
                  disabled={!replaceAssetId || !replaceReason.trim()}
                  className="w-[8.75rem] py-3.5 bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] text-white rounded-[1.25rem] text-[12px] font-black uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(139,92,246,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
                >
                  Generate QR
                </button>
              </div>
            </motion.div>
          </div>
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
  const [screenshot, setScreenshot] = useState<File | null>(null); 
  
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);
  const [activeQrSession, setActiveQrSession] = useState('');

  const modalStateRef = useRef({ asset, type, formCondition, formText, user });
  useEffect(() => { modalStateRef.current = { asset, type, formCondition, formText, user }; }, [asset, type, formCondition, formText, user]);

  // 🌟 DESKTOP DATABASE WRITER FOR ALL 3 AUDIT TYPES (Return, Inspection, Replace)
  useEffect(() => {
    if (!activeQrSession) return;
    const channel = supabase.channel(`qr_session_${activeQrSession}`)
      .on('broadcast', { event: 'session_complete' }, async (payload) => {
          const finalPhotos = payload.payload?.photos || [];
          const auditType = payload.payload?.type || modalStateRef.current.type; 
          const state = modalStateRef.current;
          
          let targetAsset = state.asset;
          if (auditType === 'RETURN') targetAsset = assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId));
          if (!targetAsset) return;

          try {
            // 1. UPDATE ASSET TABLE (Clearing old admin remarks)
            const updatePayload: any = { photos: finalPhotos, last_inspection_date: new Date().toISOString(), admin_remarks: null };
            if (auditType === 'INSPECTION') updatePayload.inspection_status = 'Pending Review';
            if (auditType === 'RETURN') updatePayload.status = 'Pending Return';
            if (auditType === 'REPLACEMENT' || auditType === 'REPLACE') updatePayload.status = 'Replacement Requested';
            await supabase.from('assets').update(updatePayload).eq('id', targetAsset.id);
            
            // 2. CREATE INSPECTION LOG
            await supabase.from('inspections').insert({ 
              asset_id: targetAsset.id, 
              user_id: state.user.id, 
              user_name: state.user.name, 
              status: 'Pending Review', 
              condition: state.formCondition, 
              notes: auditType === 'INSPECTION' ? state.formText : `[${auditType} REQUEST] ${state.formText}`, 
              photos: finalPhotos, 
              type: auditType 
            });

            // 3. PING ADMIN DASHBOARD
            await supabase.from('notifications').insert({ 
              target_user: 'ADMIN_SYSTEM', target_role: 'admin', title: `New ${auditType} Submission`, 
              message: `${state.user.name} (${state.user.emp_id}) completed a mobile ${auditType} scan.`, type: 'info', is_read: false 
            });

            // 4. UPDATE UI
            setShowQR(false); 
            setSuccessDone(true); 
            toast.success("Database Updated Successfully!", { icon: '✅' });
            setTimeout(() => onClose(), 1500); 
          } catch(e) { console.error(e); }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeQrSession]);

  const handleAttemptUnlock = () => {
    if (!asset) { alert("No hardware assigned to test against!"); return; }
    if (user.id === 'guest-mock-uuid') { setLockError(false); setIsUnlocked(true); return; }
    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number||'').toLowerCase() || typed === (asset.asset_tag||'').toLowerCase()) { setLockError(false); setIsUnlocked(true); } else setLockError(true);
  };

  const handleLivePostgresSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (type === 'RETURN') {
      const targetAsset = assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId));
      if (!targetAsset) return;
      const confirmed = window.confirm(`WARNING: VERIFY SERIAL NUMBER\n\nAre you sure your physical asset's Serial Number matches this serial number?\n\nAsset: ${targetAsset.name || targetAsset.asset_name}\nTag ID: ${targetAsset.asset_tag}\nSerial Number: ${targetAsset.serial_number || 'N/A'}\n\nClick OK if it matches exactly.`);
      if (!confirmed) { toast.error("Return aborted."); return; }
      try {
        const baseUrl = window.location.origin; const cat = targetAsset.category; const sessionId = crypto.randomUUID(); setActiveQrSession(sessionId);
        const url = `${baseUrl}/mobile-audit?session=${sessionId}&assetId=${targetAsset.id}&userId=${user.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(formText)}&auditType=${type}&req=5&tag=${encodeURIComponent(targetAsset.asset_tag)}&sn=${encodeURIComponent(targetAsset.serial_number || '')}&email=${encodeURIComponent(user.email)}`;
        setQrUrl(url); setShowQR(true);
      } catch(e) { toast.error("Error submitting return request."); } return;
    }
    if (type === 'INSPECTION') { 
      const baseUrl = window.location.origin; const cat = asset?.category || formCategory; const sessionId = crypto.randomUUID(); setActiveQrSession(sessionId);
      const url = `${baseUrl}/mobile-audit?session=${sessionId}&assetId=${asset.id}&userId=${user.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(formText)}&auditType=${type}&req=5&tag=${encodeURIComponent(asset.asset_tag)}&sn=${encodeURIComponent(asset.serial_number || '')}&email=${encodeURIComponent(user.email)}`;
      setQrUrl(url); setShowQR(true);
      return; 
    }
    
    setIsTransmitting(true);
    let submitError = null; 
    try {
      const cleanEmail = user.email.toLowerCase().trim(); const finalEmp = user.emp_id || 'STAFF'; let humanName = user.name || cleanEmail.split('@')[0]; humanName = humanName.split('.')[0].replace(/[_-]/g, ' '); humanName = humanName.charAt(0).toUpperCase() + humanName.slice(1);
      if (type === 'TICKET') {
        const { error } = await supabase.from('tickets').insert({ title: formTitle || 'IT Support Ticket', category: formCategory, description: formText || 'No details given', status: 'Open', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName }); submitError = error;
      } else if (type === 'REQUEST') {
        const { error } = await supabase.from('tickets').insert({ title: `Asset Request: ${formCategory}`, category: `Request: ${formCategory}`, description: formText || `Staff requested ${formCategory}`, status: 'Pending', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName }); submitError = error;
      }
      if (submitError) throw submitError; setSuccessDone(true); setTimeout(() => onClose(), 1200);
    } catch (e: any) { alert(`Database Error: ${e.message || JSON.stringify(e)}`); } finally { setIsTransmitting(false); }
  };

  const getHeaderIcon = () => {
    if (type === 'RETURN') return <LogOut size={24} strokeWidth={2} />; if (type === 'REQUEST') return <PlusCircle size={24} strokeWidth={2} />; if (type === 'INSPECTION') return <ClipboardCheck size={24} strokeWidth={2} />; return <Ticket size={24} strokeWidth={2} />;
  };

  const getHeaderColors = () => {
    if (type === 'RETURN') return 'bg-white border border-slate-200 text-orange-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]'; if (type === 'REQUEST') return 'bg-white border border-slate-200 text-emerald-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]'; if (type === 'INSPECTION') return 'bg-white border border-slate-200 text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]'; return 'bg-white border border-slate-200 text-purple-500 shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]';
  };

  const getTitle = () => {
    if (type === 'RETURN') return 'Asset Return Request'; if (type === 'REQUEST') return 'Request New Gear'; if (type === 'INSPECTION') return 'Device Compliance Audit'; return 'Raise Support Ticket';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/20 backdrop-blur-md" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl max-h-[80vh] sm:max-h-[85vh] rounded-4xl flex flex-col overflow-hidden bg-white/80 backdrop-blur-3xl border border-white shadow-[0_32px_80px_rgba(0,0,0,0.15)]">
        <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-4 flex justify-between items-center shrink-0 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-3xl flex items-center justify-center ${getHeaderColors()}`}>{getHeaderIcon()}</div>
            <div>
              <h2 className="text-[14px] sm:text-[16px] font-bold uppercase tracking-widest text-slate-900">{getTitle()}</h2>
              {type !== 'RETURN' && <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-500">{type === 'INSPECTION' ? 'Visual verification' : 'Portal Submission'}</p>}
              {type === 'RETURN' && <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-500">Initiate IT Handover</p>}
            </div>
          </div>
          <button onClick={onClose} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}><X size={18} strokeWidth={2.5} /></button>
        </div>

        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1 min-h-0 flex flex-col gap-4 custom-scrollbar">
          {successDone ? (
            <div className="py-10 text-center space-y-4"><CheckCircle2 size={72} className="text-emerald-500 mx-auto animate-bounce"/><h4 className="text-xl sm:text-2xl font-bold text-slate-900">Database Updated!</h4></div>
          ) : showQR ? (
            <div className="py-4 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div><h4 className="text-base sm:text-lg font-bold uppercase tracking-widest text-slate-900">Mobile Device Handoff</h4><p className="text-[11px] sm:text-xs font-medium mt-1.5 text-slate-500">Scan this code with your phone camera to take certified watermark photos of the asset.</p></div>
              <div className="p-4 sm:p-5 rounded-4xl inline-block shadow-2xl mx-auto border bg-white border-slate-200"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Scan to Audit" className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl" /></div>
              <div className="p-4 sm:p-5 rounded-2xl text-left transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-purple-300">
                <h5 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-purple-600"><Camera size={16}/> Photo Requirements</h5>
                <ul className="text-[11px] sm:text-xs font-semibold space-y-2 ml-1 text-slate-900"><li>✅ All devices require exactly 5 photos.</li><li>✅ Mobile phone will guide you through the process.</li></ul>
              </div>
            </div>
          ) : (
            <form id="genericModalForm" onSubmit={handleLivePostgresSubmit} className="space-y-4">
              {needsLock && (
                <div className="p-4 sm:p-5 rounded-3xl space-y-3 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 text-rose-600">🔒 Security Verification Required</p>
                  <div className="flex gap-2 sm:gap-3">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder={user.id === 'guest-mock-uuid' ? 'Type anything for Guest...' : 'Type exact Tag ID or S/N...'} className="flex-1 px-4 py-3 rounded-2xl text-[12px] sm:text-[13px] font-semibold outline-none transition-all bg-white/60 border border-slate-200 text-[#0f172a] placeholder-[#818b9c] focus:ring-2 focus:ring-orange-500/20"/>
                    {!isUnlocked && <button type="button" onClick={handleAttemptUnlock} className="px-5 sm:px-6 bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest text-[10px] sm:text-[11px] rounded-2xl cursor-pointer transition-all shadow-[0_4px_15px_rgba(244,63,94,0.4)] border border-rose-400">Verify</button>}
                  </div>
                  {lockError && <p className="text-[10px] sm:text-[11px] text-rose-500 font-bold px-1">Incorrect device code.</p>}
                </div>
              )}
              {type === 'RETURN' && (
                <>
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Select Assigned Asset</label>
                    <div className="relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-orange-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                      <select value={selectedReturnId} onChange={(e) => setSelectedReturnId(e.target.value)} required className="w-full pl-4 pr-10 py-3 text-[12px] sm:text-[13px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900"><option value="" disabled>Choose Hardware...</option>{assignedAssets?.map((a: any) => (<option key={a.id} value={a.id}>{a.name || a.asset_name} ({a.asset_tag})</option>))}</select><ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" />
                    </div>
                  </div>
                  <AnimatePresence>
                    {selectedReturnId && (
                      <motion.div initial={{ opacity: 0, height: 0, marginTop: -5 }} animate={{ opacity: 1, height: 'auto', marginTop: 0 }} exit={{ opacity: 0, height: 0, marginTop: -5 }} className="overflow-hidden">
                        <div className="px-4 py-3 rounded-2xl flex gap-4 bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm">
                          <div className="flex-1 space-y-1"><span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest block text-slate-500">Tag ID</span><span className="text-[11px] sm:text-[12px] font-semibold wrap-break-word text-slate-900">{assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId))?.asset_tag}</span></div>
                          <div className="flex-1 space-y-1"><span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest block text-slate-500">Serial Number</span><span className="text-[11px] sm:text-[12px] font-semibold wrap-break-word text-slate-900">{assignedAssets?.find((a: any) => String(a.id) === String(selectedReturnId))?.serial_number || 'N/A'}</span></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              {type === 'TICKET' && (
                <>
                  <div className="flex flex-col gap-1.5 sm:gap-2"><label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Issue Subject</label><input value={formTitle} onChange={e=>setFormTitle(e.target.value)} required placeholder="E.g. Monitor display flickering" className="w-full px-4 py-3 rounded-2xl outline-none text-[12px] sm:text-[13px] font-semibold transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] placeholder-[#818b9c] text-[#0f172a] focus:bg-white/60 hover:border-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"/></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2"><label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Category</label><div className="relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-purple-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"><select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className="w-full pl-4 pr-10 py-3 text-[12px] sm:text-[13px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900"><option>Hardware</option><option>Software</option><option>Network</option></select><ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" /></div></div>
                  <div className="flex flex-col gap-1.5 sm:gap-2"><label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Attach Screenshot (Optional)</label><label className="w-full p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 border-2 border-dashed transition-all cursor-pointer bg-white/40 backdrop-blur-xl border-white/80 hover:border-purple-400 hover:bg-white/60 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]"><input type="file" className="hidden" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} /><div className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-100">{screenshot ? <ImagePlus size={16} className="text-purple-500" /> : <UploadCloud size={16} className="text-slate-400" />}</div><span className={`text-[11px] sm:text-[12px] font-semibold text-center ${screenshot ? 'text-purple-600' : 'text-slate-900'}`}>{screenshot ? screenshot.name : "Click to upload"}</span></label></div>
                </>
              )}
              {type === 'REQUEST' && (
                <div className="flex flex-col gap-1.5 sm:gap-2"><label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Equipment Category</label><div className="relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:border-emerald-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"><select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className="w-full pl-4 pr-10 py-3 text-[12px] sm:text-[13px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900"><option>Laptop / PC</option><option>Monitor</option><option>Keyboard / Mouse</option><option>Headset / Audio</option><option>Other Accessory</option></select><ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" /></div></div>
              )}
              {(type === 'INSPECTION' || type === 'RETURN') && isUnlocked && (
                <div className="flex flex-col gap-1.5 sm:gap-2 animate-in slide-in-from-top-4 duration-300"><label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">Current Asset Condition</label><div className={`relative rounded-2xl overflow-hidden flex items-center pr-4 transition-all bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] ${type === 'RETURN' ? 'hover:border-orange-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'}`}><select value={formCondition} onChange={e=>setFormCondition(e.target.value)} className="w-full pl-4 pr-10 py-3 text-[12px] sm:text-[13px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent text-slate-900"><option>Pristine / Flawless</option><option>Good / Minor Scratches</option><option>Poor / Damaged (Requires Fix)</option><option>Non-Functional / Dead</option></select><ChevronDown size={18} className="absolute right-4 pointer-events-none text-slate-500" /></div></div>
              )}
              <div className="flex flex-col gap-1.5 sm:gap-2"><label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">{type === 'INSPECTION' ? 'Audit Notes' : type === 'RETURN' ? 'Return Reason & Notes' : type === 'REQUEST' ? 'Business Justification' : 'Detailed Explanation'}</label><textarea rows={3} value={formText} onChange={e=>setFormText(e.target.value)} required placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : type === 'RETURN' ? "Provide reason for returning..." : "Describe what happened..."} className={`w-full px-4 py-3 rounded-2xl text-[12px] sm:text-[13px] font-semibold transition-all outline-none resize-none min-h-20 bg-white/40 backdrop-blur-xl border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] placeholder-[#818b9c] text-[#0f172a] focus:bg-white/60 ${type === 'RETURN' ? 'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300' : type === 'REQUEST' ? 'focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300' : 'focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300'}`}/></div>
            </form>
          )}
        </div>

        {!successDone && (
          <div className="px-5 py-4 sm:px-6 sm:py-5 flex justify-center items-center gap-3 sm:gap-4 shrink-0 relative z-10 border-t border-slate-200/60">
            {showQR ? (
              <button onClick={onClose} className={`w-full py-3 rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>Close Portal</button>
            ) : (
              <>
                <button onClick={onClose} className={`flex-1 py-3 rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>Cancel</button>
                <button type="submit" form="genericModalForm" disabled={isTransmitting || (needsLock && !isUnlocked)} className={`flex-1 py-3 text-white rounded-2xl text-[11px] sm:text-[12px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 ${type === 'RETURN' ? 'bg-orange-500 shadow-[0_4px_15px_rgba(249,115,22,0.4)] border border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)]' : type === 'REQUEST' ? 'bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)] border border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-purple-500 shadow-[0_4px_15px_rgba(168,85,247,0.4)] border border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'}`}>
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