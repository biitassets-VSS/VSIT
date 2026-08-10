'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Clock, 
  Eye, Laptop, User, Calendar, ShieldAlert, Search, RefreshCw, 
  X, Image as ImageIcon, History as HistoryIcon, FilterX, ExternalLink, Settings, Settings2,
  Send, ShieldCheck, Check, AlertTriangle, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getNextDueDate = (baseDateStr: string | null, cat: string) => {
  if (!baseDateStr) return null;
  const baseDate = new Date(baseDateStr);
  const monthsToAdd = (cat || '').toLowerCase().includes('laptop') ? 1 : 3; 
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToAdd + 1, 0);
  const lastSat = new Date(lastDay);
  while (lastSat.getDay() !== 6) lastSat.setDate(lastSat.getDate() - 1);
  return lastSat;
};

function AdminInspectionReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const highlightedId = searchParams.get('id'); 
  const targetAssetId = searchParams.get('asset_id'); 

  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<string>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

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
    
    fetchVerificationLedger();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (targetAssetId) {
      setAssetFilter(targetAssetId);
      setFilterTab('All Logs'); 
    }
  }, [targetAssetId]);

  useEffect(() => {
    if (highlightedId && !loading && inspections.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`inspection-${highlightedId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100); 
    }
  }, [highlightedId, loading, inspections]);

  // 🌟 LIVE DATA FETCHING
  const fetchVerificationLedger = async () => {
    setLoading(true);
    try {
      const [inspRes, assetsRes, profilesRes] = await Promise.all([
        supabase.from('inspections').select('*')
          .not('notes', 'ilike', '%[RETURN REQUEST]%')
          .not('status', 'ilike', '%Return%')
          .not('notes', 'ilike', '%[REPLACEMENT REQUEST]%') 
          .not('status', 'ilike', '%Replace%')              
          .order('created_at', { ascending: false }),
        supabase.from('assets').select('*'),
        supabase.from('profiles').select('*')
      ]);

      const rawInspections = inspRes.data || [];
      const assetsData = assetsRes.data || [];
      const profilesData = profilesRes.data || [];

      const masterLedger: any[] = [];
      const activeAssetIds = new Set<string>();

      rawInspections.forEach((insp, idx) => {
        const matchedAsset = assetsData.find(a => String(a.id) === String(insp.asset_id)) || {};
        
        const matchedProfile = profilesData.find(p => 
          (insp.user_email && p.email?.toLowerCase() === insp.user_email.toLowerCase()) || 
          (insp.inspected_by && String(p.id) === String(insp.inspected_by)) ||
          (insp.inspected_by && p.emp_code?.toLowerCase() === String(insp.inspected_by).toLowerCase())
        );

        const itemIdentifier = insp.id || `insp-${insp.asset_id}-${idx}-${Date.now()}`;
        
        const isProfileAdmin = matchedProfile && (
          matchedProfile.role?.toLowerCase() === 'admin' || 
          matchedProfile.user_type?.toLowerCase() === 'admin' || 
          matchedProfile.is_admin === true ||
          String(matchedProfile.emp_code || '').toUpperCase() === 'ADMIN' ||
          String(matchedProfile.emp_code || '').toUpperCase() === 'SYS' ||
          String(matchedProfile.emp_code || '').toUpperCase().startsWith('ADM')
        );

        const inspByLower = String(insp.inspected_by || '').toLowerCase().trim();
        const notesLower = String(insp.notes || '').toLowerCase();
        const statusLower = String(insp.status || '').toLowerCase();

        const isSystemOrAdminKeyword = 
          inspByLower === 'admin' || inspByLower === 'system' || inspByLower === 'administrator' ||
          notesLower.includes('asset configuration updated') || 
          notesLower.includes('asset initially registered') ||
          notesLower.includes('asset forcefully unassigned') ||
          notesLower.includes('asset re-assigned') ||
          statusLower === 'stock intake';

        const photosArray = Array.isArray(insp.photos) ? insp.photos : Object.values(insp.photos || {});
        const isUnmappedAdminAction = !matchedProfile && (!!insp.user_email || !!insp.inspected_by) && 
          (isSystemOrAdminKeyword || photosArray.length === 0);

        const isAdminAction = isProfileAdmin || isSystemOrAdminKeyword || isUnmappedAdminAction || insp.is_admin === true || insp.type?.toLowerCase() === 'admin';

        const isHistorical = ['approved', 'pass', 'resolved'].some(k => statusLower.includes(k)) || isAdminAction;
        if (!isHistorical) {
          activeAssetIds.add(String(matchedAsset.id));
        }

        let recoveredName = insp.user_name || insp.staff_name || insp.full_name || insp.employee_name;
        if (!recoveredName && insp.notes && insp.notes.includes('Digitally Signed')) {
          const match = insp.notes.match(/by\s+(.*?)\s+(?:on|at|$)/i);
          if (match) recoveredName = match[1].trim();
        }
        if (!recoveredName && (insp.user_email || insp.inspected_by)) {
          const historicalSignature = rawInspections.find(r => 
            ((insp.user_email && r.user_email?.toLowerCase() === insp.user_email.toLowerCase()) || 
             (insp.inspected_by && String(r.inspected_by) === String(insp.inspected_by))) &&
            r.notes && r.notes.includes('Digitally Signed Handover Agreement by')
          );
          if (historicalSignature && historicalSignature.notes) {
            const match = historicalSignature.notes.match(/by\s+(.*?)\s+(?:on|at|$)/i);
            if (match) recoveredName = match[1].trim();
          }
        }
        if (!recoveredName && insp.user_email && insp.user_email.includes('@')) {
          recoveredName = insp.user_email.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        
        let finalName = '';
        let finalEmpCode = '';
        let isDeletedUser = false;
        let normalizedStatus = insp.status === 'Pending Review' || !insp.status ? 'Pending' : insp.status;

        if (isAdminAction) {
          finalName = 'Administrator / System';
          finalEmpCode = 'ADMIN USER';
          isDeletedUser = false;
          if (normalizedStatus === 'Pending' || !insp.status) normalizedStatus = 'Admin Update';
        } else if (matchedProfile) {
          finalName = matchedProfile.full_name || matchedProfile.name;
          finalEmpCode = matchedProfile.emp_code || insp.emp_code;
        } else {
          if (insp.inspected_by || insp.user_email) {
            isDeletedUser = true;
            finalName = recoveredName || (insp.user_email ? insp.user_email : 'Unknown Past User');
            finalEmpCode = insp.emp_code || insp.employee_code || (insp.inspected_by ? `ID-${String(insp.inspected_by).substring(0, 5).toUpperCase()}` : 'OLD-RECORD');
          } else {
            finalName = 'Unassigned Asset';
            finalEmpCode = 'NO-EMP-RECORD';
          }
        }

        masterLedger.push({
          ...insp,
          id: itemIdentifier,
          is_submission: !isAdminAction,
          is_admin_action: isAdminAction,
          staff_id: matchedProfile?.id || insp.inspected_by, 
          asset_name: matchedAsset.name || matchedAsset.asset_name || 'Unmapped Device',
          category: matchedAsset.category || 'Laptop', 
          serial_number: matchedAsset.serial_number || matchedAsset.serial || 'S/N UNKNOWN',
          asset_tag: matchedAsset.asset_tag || 'NO-TAG',
          staff_name: finalName,
          emp_code: finalEmpCode,
          is_deleted_user: isDeletedUser,
          status: normalizedStatus,
          photos: photosArray,
          next_due: getNextDueDate(insp.created_at, matchedAsset.category || 'Laptop')
        });
      });

      assetsData.forEach(asset => {
        if (!asset.assigned_to || String(asset.assigned_to).trim() === '') return;
        if (asset.status?.toLowerCase().includes('return')) return;
        if (activeAssetIds.has(String(asset.id))) return;

        const latestInsp = rawInspections.find(i => String(i.asset_id) === String(asset.id));
        let nextDue = null;
        if (asset.next_inspection_date) {
          nextDue = new Date(asset.next_inspection_date);
        } else if (latestInsp?.created_at || asset.last_inspection_date) {
          nextDue = getNextDueDate(latestInsp?.created_at || asset.last_inspection_date, asset.category);
        } else {
          nextDue = getNextDueDate(asset.created_at, asset.category);
        }

        const now = new Date();
        now.setHours(0,0,0,0);
        const isOverdue = nextDue ? (new Date(nextDue).setHours(0,0,0,0) < now.getTime()) : false;

        const s = (asset.inspection_status || '').toLowerCase();
        const needsAction = s.includes('pending') || s.includes('action required');

        if (isOverdue || needsAction) {
          const matchedStaff = profilesData.find(p => p.id === asset.assigned_to);
          let sName = matchedStaff?.full_name || matchedStaff?.name;
          let sCode = matchedStaff?.emp_code || matchedStaff?.emp_id;

          if (!sName) {
            const historicalRecord = rawInspections.find(i => String(i.asset_id) === String(asset.id));
            let fallbackName = historicalRecord?.user_name || historicalRecord?.staff_name || historicalRecord?.full_name;
            if (!fallbackName && historicalRecord?.user_email) {
              fallbackName = historicalRecord.user_email.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
            sName = fallbackName || 'Unregistered User';
            sCode = historicalRecord?.emp_code || `ID-${String(asset.assigned_to).substring(0,5).toUpperCase()}`;
          }

          masterLedger.push({
            id: `missing-${asset.id}-${Date.now()}`,
            asset_id: asset.id,
            is_submission: false,
            is_admin_action: false,
            staff_id: matchedStaff?.id || asset.assigned_to,
            created_at: asset.created_at || new Date().toISOString(),
            asset_name: asset.name || asset.asset_name,
            category: asset.category || 'Hardware', 
            serial_number: asset.serial_number || asset.serial,
            asset_tag: asset.asset_tag || 'NO-TAG',
            staff_name: sName,
            emp_code: sCode || 'N/A',
            is_deleted_user: !matchedStaff,
            status: isOverdue ? 'Overdue' : 'Awaiting Staff Action',
            notes: isOverdue ? 'CRITICAL: Staff member missed the required deadline to submit this inspection.' : 'Staff member has not submitted the visual inspection yet.',
            photos: [],
            next_due: nextDue
          });
        }
      });

      masterLedger.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setInspections(masterLedger);
    } catch (err: any) {
      alert("Failed to fetch inspection records.");
    } finally {
      setLoading(false);
    }
  };

  const sendStaffAuditReminder = async (staffId: string, assetName: string, tagId: string, status: string) => {
    if (!staffId || staffId.includes('REMOVED-ID') || staffId.includes('NO-EMP-RECORD') || staffId.includes('ADMIN') || staffId.includes('ID-')) {
      return alert("Cannot send alert: No valid active employee profile ID attached to this record.");
    }
    setSendingAlertId(staffId);
    try {
      const isReInspect = status === 'Re-Inspection';
      const isOverdue = status === 'Overdue';
      const title = isReInspect ? `⚠️ Mandatory Re-Inspection Required` : isOverdue ? `🚨 OVERDUE: Hardware Audit Required` : `🔔 Hardware Audit Reminder Due`;
      const message = isReInspect
        ? `Your previous visual audit for ${assetName} (${tagId}) requires immediate re-inspection. Please open your staff dashboard and upload fresh device captures.`
        : isOverdue
        ? `Your hardware inspection for ${assetName} (${tagId}) is OVERDUE. Please submit your visual verification immediately to avoid compliance strikes.`
        : `Please submit your scheduled visual inspection photos for ${assetName} (${tagId}) via your staff portal dashboard.`;

      const { error } = await supabase.from('notifications').insert([{
        target_user: staffId,
        title: title,
        message: message,
        is_read: false,
        type: isReInspect || isOverdue ? 'warning' : 'info'
      }]);

      if (error) throw error;
      alert(`✔ Success: Immediate notification push sent directly to employee dashboard!`);
    } catch (err: any) {
      alert(`Error sending notification push: ${err.message}`);
    } finally {
      setSendingAlertId(null);
    }
  };

  const executeVerdict = async (inspectionId: string, assetId: string, verdict: 'Approved' | 'Re-Inspection' | 'Rejected', staffId: string, isDeletedUser: boolean) => {
    if (!inspectionId || !assetId) return alert("System Error: Missing unique record identifier.");

    let remarks = '';
    if (verdict === 'Re-Inspection' || verdict === 'Rejected') {
      remarks = prompt(`Provide administrative remarks/reason for marking this device as ${verdict}:`) || '';
      if (!remarks.trim()) return alert("Remarks are required to issue returned actions.");
    }

    if (!confirm(`Are you sure you want to mark this submission as "${verdict}"?`)) return;

    setUpdatingId(inspectionId);
    try {
      const isTemporaryId = String(inspectionId).startsWith('insp-') || String(inspectionId).startsWith('missing-');
      let query = supabase.from('inspections').update({ status: verdict, admin_remarks: remarks || null });
      
      if (isTemporaryId) {
        query = query.eq('asset_id', assetId).eq('status', 'Pending');
      } else {
        query = query.eq('id', inspectionId).eq('asset_id', assetId);
      }

      const { error: inspErr } = await query;
      if (inspErr) throw inspErr;

      const assetUpdatePayload: any = { inspection_status: verdict };
      if (verdict === 'Approved') {
        assetUpdatePayload.last_inspection_date = new Date().toISOString();
        assetUpdatePayload.status = 'Assigned'; 
      } else if (verdict === 'Re-Inspection') {
        assetUpdatePayload.status = 'Re-Inspection';
      } else {
        assetUpdatePayload.status = 'Action Required';
      }

      const { error: assetErr } = await supabase.from('assets').update(assetUpdatePayload).eq('id', assetId);
      if (assetErr) throw assetErr;

      if (staffId && !isDeletedUser && !staffId.includes('ADMIN') && !staffId.includes('ID-')) {
        try {
          await supabase.from('notifications').insert([{
            target_user: staffId,
            title: verdict === 'Approved' ? '✔ Inspection Approved' : `⚠ Action Required: ${verdict}`,
            message: verdict === 'Approved' ? `Your recent hardware audit has been successfully approved by the IT Admin.` : `Your asset inspection was marked as ${verdict}. Reason: ${remarks}`,
            is_read: false,
            type: verdict === 'Approved' ? 'success' : 'warning'
          }]);
        } catch (notifError) {}
      }

      setInspections(prev => prev.map(item => 
        (item.id === inspectionId && item.asset_id === assetId) 
          ? { ...item, status: verdict, admin_remarks: remarks || item.admin_remarks } 
          : item
      ));

      alert(`Success: Review locked in as ${verdict}. Live alert pushed to staff dashboard.`);
    } catch (err: any) {
      alert(`Error transmitting verdict: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const clearAssetFilter = () => {
    setAssetFilter(null);
    router.replace('/admin/inspections'); 
  };

  // 🌟 THEME & FILTERING (LIQUID GLASS WITH INNER-RIM REFLECTION)
  const theme = {
    bg: 'bg-transparent',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    
    // 🌟 GLASS CARD WITH LIQUID REFLECTION RIM & NEON HOVER
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.15)] hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.25)] transition-all duration-500' 
      : 'bg-white/40 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 shadow-[0_16px_40px_rgba(31,38,135,0.05)] shadow-[inset_0_0_4px_2px_rgba(255,255,255,0.8)] hover:border-orange-400/80 hover:shadow-[0_0_25px_rgba(249,115,22,0.25)] transition-all duration-500',
    
    glassInnerCard: isDarkMode 
      ? 'bg-black/20 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/50 backdrop-blur-xl border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)]',
    
    // 🌟 GLASS BUTTON & TAB ELEMENT WITH INNER REFLECTION
    glassElement: isDarkMode
      ? 'bg-zinc-900/50 backdrop-blur-2xl border border-white/15 shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.1)] hover:border-purple-400/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300'
      : 'bg-white/40 backdrop-blur-2xl border border-white/70 shadow-[inset_0_0_4px_2px_rgba(255,255,255,0.8)] shadow-sm hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300',
    
    // 🌟 SEARCH BAR GLASS CONTAINER
    searchGlass: isDarkMode
      ? 'bg-zinc-900/50 backdrop-blur-2xl border border-white/15 shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.1)] hover:border-orange-500/50 focus-within:border-orange-500 focus-within:shadow-[0_0_25px_rgba(249,115,22,0.4)] transition-all duration-300'
      : 'bg-white/40 backdrop-blur-2xl border border-white/70 shadow-[inset_0_0_4px_2px_rgba(255,255,255,0.8)] shadow-sm hover:border-orange-400/80 focus-within:border-orange-500 focus-within:shadow-[0_0_25px_rgba(249,115,22,0.3)] transition-all duration-300',

    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/10 text-white focus:border-orange-500/50 placeholder-zinc-500' 
      : 'bg-white/50 border border-white/60 text-slate-900 focus:bg-white/70 focus:ring-4 focus:ring-orange-500/10 placeholder-slate-400',
    
    tabActive: 'bg-linear-to-r from-purple-500 to-purple-600 text-white shadow-md border border-purple-400/50 scale-[1.02] shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-transform',
    tabInactive: isDarkMode 
      ? 'text-zinc-400 hover:bg-white/5 border-white/10 bg-black/20' 
      : 'text-slate-600 hover:bg-white/60 border-white/60 bg-white/40',
  };

  const filteredList = inspections.filter(item => {
    if (assetFilter && item.asset_id !== assetFilter) return false;

    const s = (item.status || '').toLowerCase().trim();
    const isApproved = s === 'approved' || s === 'pass';
    const isRejected = s === 'rejected' || s === 'fail';
    const isReInspect = s === 're-inspection';
    const isOverdue = s === 'overdue';
    const isPending = s === 'pending' || s === 'awaiting staff action';
    const isAdminLog = item.is_admin_action === true;

    const matchesTab = 
      filterTab === 'All Logs' ? true :
      filterTab === 'Overdue' ? isOverdue :
      filterTab === 'Pending' ? (isPending && !isAdminLog) :
      filterTab === 'Approved' ? isApproved :
      filterTab === 'Re-Inspection' ? isReInspect :
      filterTab === 'Rejected' ? isRejected :
      filterTab === 'Admin Edits' ? isAdminLog : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.staff_name || '').toLowerCase().includes(query) ||
      (item.emp_code || '').toLowerCase().includes(query) ||
      (item.asset_name || '').toLowerCase().includes(query) ||
      (item.serial_number || '').toLowerCase().includes(query) ||
      (item.asset_tag || '').toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const getCount = (type: string) => {
    return inspections.filter(item => {
      const s = (item.status || '').toLowerCase().trim();
      const isAdminLog = item.is_admin_action === true;
      if (type === 'Pending') return (s === 'pending' || s === 'awaiting staff action') && !isAdminLog;
      if (type === 'Overdue') return s === 'overdue';
      if (type === 'Approved') return s === 'approved' || s === 'pass';
      if (type === 'Re-Inspection') return s === 're-inspection';
      if (type === 'Rejected') return s === 'rejected' || s === 'fail';
      if (type === 'Admin Edits') return isAdminLog;
      return true; // All Logs
    }).length;
  };

  const TABS = [
    { id: 'Overdue', label: 'Overdue', icon: AlertTriangle, count: getCount('Overdue'), color: 'text-amber-500' },
    { id: 'Pending', label: 'Pending', icon: Clock, count: getCount('Pending'), color: 'text-blue-500' },
    { id: 'Approved', label: 'Approved', icon: CheckCircle2, count: getCount('Approved'), color: 'text-emerald-500' },
    { id: 'Re-Inspection', label: 'Re-Inspection', icon: RefreshCw, count: getCount('Re-Inspection'), color: 'text-purple-500' },
    { id: 'Rejected', label: 'Rejected', icon: XCircle, count: getCount('Rejected'), color: 'text-rose-500' },
    { id: 'Admin Edits', label: 'Admin Edits', icon: Settings2, count: getCount('Admin Edits'), color: 'text-indigo-500' },
    { id: 'All Logs', label: 'All Logs', icon: List, count: inspections.length, color: 'text-slate-500' },
  ];

  return (
    <div className={`min-h-screen ${theme.bg} p-4 sm:p-6 lg:p-8 font-sans relative z-10 transition-colors duration-1000`}>
      <div className="max-w-400 mx-auto space-y-6">
        
        {/* 🌟 HEADER: LIQUID GLASS */}
        <div className={`${theme.glassCard} rounded-4xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:scale-105 ${theme.glassInnerCard} ${theme.textMain}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-orange-500" size={24} />
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${theme.textMain}`}>Inspection Command Center</h1>
                {getCount('Pending') > 0 && !assetFilter && (
                  <span className="px-2.5 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md shadow-sm">
                    {getCount('Pending')} Action Required
                  </span>
                )}
                {getCount('Overdue') > 0 && !assetFilter && (
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-600 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest rounded-md">
                    {getCount('Overdue')} Overdue
                  </span>
                )}
              </div>
              <p className={`text-xs font-semibold mt-1.5 ${theme.textSub}`}>Adjudicate smartphone hardware captures, issue audit pings, and enforce compliance.</p>
            </div>
          </div>
          
          <button 
            onClick={fetchVerificationLedger} 
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${theme.glassElement} ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} disabled:opacity-50 cursor-pointer`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Database
          </button>
        </div>

        {/* 🌟 ASSET FILTER ACTIVE INDICATOR */}
        {assetFilter && (
          <div className={`${theme.glassCard} p-5 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4`}>
            <div className={`flex items-center gap-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
              <div className={`p-3 rounded-xl ${theme.glassInnerCard} text-orange-500`}><HistoryIcon size={24} /></div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-orange-500' : 'text-orange-600'}`}>Asset Timeline Filter Active</p>
                <p className="text-sm font-bold">Showing complete historical track record for selected hardware.</p>
              </div>
            </div>
            <button onClick={clearAssetFilter} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.4)] cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 border border-orange-400">
              <FilterX size={16}/> Clear Filter
            </button>
          </div>
        )}

        {/* 🌟 TABS SCROLLABLE WITH LIQUID GLASS INNER REFLECTION RIM */}
        <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
          {TABS.map(tab => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap border cursor-pointer transition-all ${
                  isActive 
                    ? (tab.id === 'Overdue' 
                        ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                        : theme.tabActive) 
                    : theme.glassElement
                }`}
              >
                <tab.icon size={16} className={isActive ? 'text-white' : tab.color} />
                <span>{tab.label}</span>
                
                {/* 🌟 2026 Liquid Glass Translucent Badge */}
                <span className={`ml-1.5 flex items-center justify-center min-w-5.5 h-5.5 px-1.5 rounded-full text-[10px] font-black shadow-[0_4px_10px_rgba(249,115,22,0.3),inset_0_1px_3px_rgba(255,255,255,0.8)] drop-shadow-sm transition-transform hover:scale-110 ${
                  isActive 
                    ? 'bg-white/20 text-white border border-white/40' 
                    : tab.count > 0 
                      ? 'bg-linear-to-tr from-orange-500/80 to-purple-600/80 backdrop-blur-xl backdrop-saturate-150 text-white border border-white/50 dark:border-white/20'
                      : 'bg-white/10 text-slate-500 dark:text-zinc-400 border border-white/20 dark:border-white/5 shadow-none'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 🌟 SEARCH BAR WITH LIQUID GLASS BORDER & INNER RIM */}
        <div className={`relative rounded-3xl p-1.5 ${theme.searchGlass}`}>
          <Search size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
          <input 
            type="text" 
            placeholder="Search by Employee Name, S/N, Asset Name, or Tag ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-14 pr-6 py-3 rounded-2xl outline-none font-semibold text-sm bg-transparent ${theme.textMain} placeholder:text-slate-400 dark:placeholder:text-zinc-500`}
          />
        </div>

        {/* 🌟 INSPECTION CARDS */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Submissions...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl text-center space-y-3 ${theme.glassCard}`}>
            <ClipboardCheck size={48} className={`mx-auto opacity-60 ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Logs Found</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The tracking timeline is clear for these parameters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredList.map((insp, index) => {
                const isApproved = insp.status === 'Approved' || insp.status === 'Pass';
                const isPending = insp.status === 'Pending' || insp.status === 'Awaiting Staff Action';
                const isOverdue = insp.status === 'Overdue';
                const isReInspect = insp.status === 'Re-Inspection';
                const isRejected = insp.status === 'Rejected' || insp.status === 'Fail';
                const photosArray = insp.photos || [];
                const isHighlighted = highlightedId === String(insp.id);
                const canSendReminder = !insp.is_admin_action && insp.staff_id && !insp.is_deleted_user;

                // Dynamic outer border colors & neon glowing highlights
                let baseBorder = isDarkMode ? 'border-white/10' : 'border-white/60';
                let baseShadow = isDarkMode 
                  ? 'shadow-[0_16px_40px_rgba(0,0,0,0.5)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.15)]' 
                  : 'shadow-[0_16px_40px_rgba(31,38,135,0.05)] shadow-[inset_0_0_4px_2px_rgba(255,255,255,0.8)]';

                let hoverGlow = 'hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]';
                let selectedGlow = 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] ring-1 ring-purple-500/50';

                if (isApproved) { 
                  hoverGlow = 'hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]'; 
                  selectedGlow = 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] ring-1 ring-emerald-500/50';
                }
                else if (isOverdue) { 
                  hoverGlow = 'hover:border-amber-500 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]'; 
                  selectedGlow = 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)] ring-1 ring-amber-500/50';
                }
                else if (isReInspect) { 
                  hoverGlow = 'hover:border-orange-500 hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]'; 
                  selectedGlow = 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] ring-1 ring-orange-500/50';
                }
                else if (isRejected) { 
                  hoverGlow = 'hover:border-rose-500 hover:shadow-[0_0_25px_rgba(244,63,94,0.4)]'; 
                  selectedGlow = 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)] ring-1 ring-rose-500/50';
                }

                return (
                  <motion.div 
                    key={`${insp.id}-${index}`} 
                    id={`inspection-${insp.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`flex flex-col xl:flex-row gap-6 p-6 sm:p-8 rounded-4xl border-[1.5px] transition-all duration-500 cursor-default ${
                      isDarkMode ? 'bg-zinc-900/40 backdrop-blur-2xl' : 'bg-white/40 backdrop-blur-2xl backdrop-saturate-150'
                    } ${isHighlighted ? selectedGlow : `${baseBorder} ${baseShadow} ${hoverGlow}`}`}
                  >
                    
                    {/* LEFT: ASSET & STAFF DETAILS */}
                    <div className="w-full xl:w-[35%] flex flex-col gap-6">
                      {/* Staff Info */}
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${theme.glassInnerCard} ${insp.is_admin_action ? 'text-purple-500' : 'text-orange-500'}`}>
                          {insp.is_admin_action ? <Settings size={20} /> : <User size={20} />}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-lg font-black truncate ${theme.textMain}`} title={insp.staff_name}>{insp.staff_name}</h3>
                            {insp.is_deleted_user && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shadow-sm ${isDarkMode ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'bg-rose-100 border border-rose-200 text-rose-700'}`}>Removed</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${theme.glassInnerCard} ${theme.textSub}`}>
                              {insp.emp_code}
                            </span>
                            {insp.is_admin_action && (
                              <span className="text-[9px] bg-purple-500 text-white px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">Admin Action</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Asset Info */}
                      <div className={`p-5 rounded-3xl space-y-4 ${theme.glassInnerCard}`}>
                        <div className="flex items-center gap-2.5 pb-3 border-b border-white/20 dark:border-white/10">
                          <Laptop size={16} className="text-orange-500" />
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/assets?view=${insp.asset_tag !== 'NO-TAG' ? insp.asset_tag : insp.asset_id}`);
                            }}
                            className={`text-sm font-black truncate cursor-pointer text-left transition-colors hover:text-orange-500 dark:hover:text-orange-400 hover:underline ${theme.textMain}`}
                            title="View Asset Details"
                          >
                            {insp.asset_name}
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>S/N:</span>
                          <span className={`text-xs font-mono font-bold ${theme.textMain}`}>{insp.serial_number}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>TAG:</span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/assets?view=${insp.asset_tag !== 'NO-TAG' ? insp.asset_tag : insp.asset_id}`);
                            }}
                            className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 cursor-pointer hover:underline"
                            title="View Asset Details"
                          >
                            {insp.asset_tag} <ExternalLink size={10} className="mb-0.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="space-y-3 px-1">
                        <div className="flex justify-between items-center">
                          <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
                            <Clock size={14} className="text-purple-500"/> {insp.is_submission ? 'Recorded Date' : 'Last Inspection'}
                          </span>
                          <span className={`text-xs font-bold ${theme.textMain}`}>{new Date(insp.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
                            <Calendar size={14} className="text-orange-500"/> Upcoming Due
                          </span>
                          <span className={`text-xs font-bold ${isOverdue ? 'text-orange-500 dark:text-orange-400 animate-pulse' : theme.textMain}`}>
                            {insp.next_due ? new Date(insp.next_due).toLocaleDateString('en-GB') : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Action Button (Ping Staff) */}
                      {canSendReminder && (isPending || isOverdue || isReInspect) && (
                        <div className="mt-auto pt-4">
                          <button
                            type="button"
                            disabled={sendingAlertId === insp.staff_id}
                            onClick={() => sendStaffAuditReminder(insp.staff_id, insp.asset_name, insp.asset_tag, insp.status)}
                            className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border-0 ${
                              isReInspect || isOverdue
                                ? 'bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white shadow-[0_4px_20px_rgba(249,115,22,0.4)]'
                                : 'bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white shadow-[0_4px_20px_rgba(168,85,247,0.4)]'
                            }`}
                          >
                            <Send size={16} className={sendingAlertId === insp.staff_id ? 'animate-bounce' : ''} />
                            {sendingAlertId === insp.staff_id ? 'Transmitting Alert...' : isReInspect ? 'Request Re-Inspection' : isOverdue ? 'Ping Overdue Staff' : 'Remind Staff via Ping'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: WORKSPACE */}
                    <div className="w-full xl:w-[65%] flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Compliance Evaluation Workspace</h3>
                        
                        <span className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${
                          isApproved ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' :
                          isOverdue ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                          isReInspect ? 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10' :
                          isRejected ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10' :
                          'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10'
                        }`}>
                          {isPending ? 'Ready For Review' : insp.status}
                        </span>
                      </div>

                      <div className="flex-1 space-y-6">
                        {/* Photos */}
                        <div>
                          <h4 className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-3 ${theme.textSub}`}>
                            <ImageIcon size={14} className="text-orange-500" /> Photographic Evidence ({photosArray.length})
                          </h4>
                          
                          {!insp.is_submission ? (
                            <div className={`p-4 rounded-xl border border-dashed text-xs font-bold flex items-center gap-2 ${isOverdue ? (isDarkMode ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' : 'border-orange-300 bg-orange-50/50 text-orange-800') : (isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-amber-300 bg-amber-50/50 text-amber-800')}`}>
                              {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />} 
                              {isOverdue ? 'CRITICAL: Staff missed deadline. No photos uploaded.' : 'Awaiting staff member to upload visual verification photos.'}
                            </div>
                          ) : photosArray.length === 0 ? (
                            <div className={`w-full p-4 rounded-2xl flex items-center gap-3 ${theme.glassInnerCard}`}>
                              <ShieldAlert size={16} className={theme.textSub} />
                              <p className={`text-xs font-semibold ${theme.textSub}`}>No graphical assets required or attached to this registry record log.</p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-3 overflow-x-auto custom-scrollbar pb-2">
                              {photosArray.map((url: string, i: number) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setPreviewPhotoModal(url)}
                                  className={`relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-sm hover:scale-105 shrink-0 ${isDarkMode ? 'border-white/10 hover:border-orange-500 bg-black/40' : 'border-white/80 hover:border-orange-400 bg-white/40'}`}
                                >
                                  <img src={url} alt={`Evidence ${i+1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                    <Eye size={20} className="mb-1 text-orange-400" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1 text-center leading-tight">Shot {i + 1}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Declaration */}
                        <div>
                          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${theme.textSub}`}>
                            {insp.is_admin_action ? 'System Log Notes' : insp.is_submission ? 'Staff Condition Declaration' : 'System Note'}
                          </h4>
                          <div className={`w-full p-5 rounded-2xl ${theme.glassInnerCard}`}>
                            <p className={`text-sm font-bold italic leading-relaxed ${theme.textMain}`}>"{insp.notes || 'No comments or written declaration provided.'}"</p>
                          </div>
                        </div>

                        {insp.admin_remarks && (
                          <div>
                            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Administrative Action Remarks</h4>
                            <div className={`w-full p-5 rounded-2xl ${theme.glassInnerCard}`}>
                              <p className={`text-sm font-bold ${theme.textMain}`}>"{insp.admin_remarks}"</p>
                            </div>
                          </div>
                        )}

                        {/* Verdict / Action Buttons */}
                        <div className="mt-auto pt-6">
                          {insp.is_admin_action ? (
                            <div className={`flex items-center justify-between px-5 py-4 rounded-2xl ${theme.glassInnerCard}`}>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>System Registry Asset Audit</span>
                              <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-400' : 'text-orange-500'}`}>
                                <CheckCircle2 size={14} /> Log Sealed Automatically
                              </div>
                            </div>
                          ) : !insp.is_submission ? (
                             <div className={`flex items-center justify-between px-5 py-4 rounded-2xl ${theme.glassInnerCard}`}>
                               <span className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? (isDarkMode ? 'text-orange-300' : 'text-orange-800') : (isDarkMode ? 'text-amber-300' : 'text-amber-800')}`}>{isOverdue ? 'DEADLINE MISSED' : 'Pending Staff Action'}</span>
                               <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${isOverdue ? (isDarkMode ? 'text-orange-400 animate-pulse' : 'text-orange-600 animate-pulse') : (isDarkMode ? 'text-amber-400' : 'text-amber-700')}`}>
                                 {isOverdue ? <AlertTriangle size={14} /> : <Clock size={14} />} 
                                 {isOverdue ? 'Overdue' : 'Waiting on Employee'}
                               </div>
                             </div>
                          ) : isPending ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <button
                                type="button"
                                disabled={updatingId === insp.id}
                                onClick={() => executeVerdict(insp.id, insp.asset_id, 'Approved', insp.staff_id, insp.is_deleted_user)}
                                className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50 transition-all hover:scale-105 active:scale-95 border-0"
                              >
                                <CheckCircle2 size={16} /> {updatingId === insp.id ? 'Syncing...' : 'Approve'}
                              </button>
                              
                              <button
                                type="button"
                                disabled={updatingId === insp.id}
                                onClick={() => executeVerdict(insp.id, insp.asset_id, 'Re-Inspection', insp.staff_id, insp.is_deleted_user)}
                                className="flex items-center justify-center gap-2 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.4)] cursor-pointer disabled:opacity-50 transition-all hover:scale-105 active:scale-95 border-0"
                              >
                                <RefreshCw size={16} /> Re-Inspect
                              </button>

                              <button
                                type="button"
                                disabled={updatingId === insp.id}
                                onClick={() => executeVerdict(insp.id, insp.asset_id, 'Rejected', insp.staff_id, insp.is_deleted_user)}
                                className="flex items-center justify-center gap-2 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(244,63,94,0.3)] cursor-pointer disabled:opacity-50 transition-all hover:scale-105 active:scale-95 border-0"
                              >
                                <XCircle size={16} /> Reject
                              </button>
                            </div>
                          ) : (
                            <div className={`w-full p-5 rounded-2xl flex items-center justify-between border transition-colors duration-700 ${
                              isApproved 
                                ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50/80 border-emerald-200')
                                : isReInspect 
                                ? (isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50/50 border-orange-200')
                                : (isDarkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50/50 border-rose-200')
                            }`}>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Admin Verdict Recorded</span>
                              
                              <span className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${
                                isApproved ? 'text-emerald-600 dark:text-emerald-400' : 
                                isReInspect ? 'text-orange-600 dark:text-orange-400' :
                                'text-rose-600 dark:text-rose-400'
                              }`}>
                                {isApproved ? <CheckCircle2 size={16} /> : isReInspect ? <RefreshCw size={14} /> : <XCircle size={14} />} {insp.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 🌟 FULL SCREEN PHOTO PREVIEW MODAL */}
        {previewPhotoModal && (
          <div 
            onClick={() => setPreviewPhotoModal(null)}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-9999 flex flex-col items-center justify-center p-4 md:p-12 animate-in fade-in duration-200 cursor-pointer"
          >
            <button 
              onClick={() => setPreviewPhotoModal(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg border border-white/20 hover:scale-110 active:scale-95"
            >
              <X size={20} />
            </button>
            
            <div className="max-w-7xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <img 
                src={previewPhotoModal} 
                alt="Hardware High-Res Verification" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20 bg-white/5" 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AdminInspectionReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-orange-500 dark:border-t-orange-500"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-zinc-500">Loading Core Engine...</span>
      </div>
    }>
      <AdminInspectionReviewContent />
    </Suspense>
  );
}