'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Clock, 
  Laptop, ShieldAlert, Search, RefreshCw, 
  X, History as HistoryIcon, FilterX, Settings2,
  Send, AlertTriangle, List, ZoomIn, ChevronLeft, ChevronRight, Archive,
  ShieldCheck, Cpu, User, Monitor, Keyboard, RectangleHorizontal, Mouse, Headphones, Sparkles, Package, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helper Functions ---

function getCategoryIcon(category: string, size = 18) {
  const cat = String(category || '').toLowerCase();
  if (cat.includes('laptop')) return <Laptop size={size} />;
  if (cat.includes('stand')) return <Monitor size={size} />;
  if (cat.includes('keyboard') || cat.includes('combo')) return <Keyboard size={size} />;
  if (cat.includes('mouse pad') || cat.includes('pad')) return <RectangleHorizontal size={size} />;
  if (cat.includes('mouse')) return <Mouse size={size} />;
  if (cat.includes('headphone')) return <Headphones size={size} />;
  if (cat.includes('cleaning')) return <Sparkles size={size} />;
  return <Package size={size} />;
}

function safeString(val: any) {
  if (val === null || val === undefined) return '';
  return String(val);
}

function safeDate(dateStr: any) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

const getNextDueDate = (baseDateStr: string | null, cat: string) => {
  if (!baseDateStr) return null;
  const baseDate = new Date(baseDateStr);
  const monthsToAdd = (cat || '').toLowerCase().includes('laptop') ? 1 : 3; 
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToAdd + 1, 0);
  const lastSat = new Date(lastDay);
  while (lastSat.getDay() !== 6) lastSat.setDate(lastSat.getDate() - 1);
  return lastSat;
};

const formatDate = (dateString: string | Date | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\//g, ' ');
};

function AdminInspectionReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const targetAssetId = searchParams.get('asset_id'); 

  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<string>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  
  // MODAL STATES
  const [gallery, setGallery] = useState({ isOpen: false, images: [] as string[], index: 0, scale: 1 });
  const [assetDetailModal, setAssetDetailModal] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    fetchVerificationLedger();
    return () => observer.disconnect();
  }, []);

  // REALTIME DATABASE SYNC
  useEffect(() => {
    const realtimeChannel = supabase.channel('admin_inspections_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => fetchVerificationLedger(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => fetchVerificationLedger(false))
      .subscribe();
    return () => { supabase.removeChannel(realtimeChannel); };
  }, []);

  useEffect(() => {
    if (targetAssetId) {
      setAssetFilter(targetAssetId);
      setFilterTab('All Logs'); 
    }
  }, [targetAssetId]);

  // Keyboard navigation for Gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gallery.isOpen) return;
      if (e.key === 'Escape') setGallery(g => ({ ...g, isOpen: false, scale: 1 }));
      if (e.key === 'ArrowRight' && gallery.index < gallery.images.length - 1) setGallery(g => ({ ...g, index: g.index + 1, scale: 1 }));
      if (e.key === 'ArrowLeft' && gallery.index > 0) setGallery(g => ({ ...g, index: g.index - 1, scale: 1 }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gallery]);

  const openGallery = (images: string[], startIndex: number) => {
    setGallery({ isOpen: true, images, index: startIndex, scale: 1 });
  };

  const loadAssetHistory = async (assetId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data: historyData } = await supabase.from('inspections').select('*').eq('asset_id', assetId).order('created_at', { ascending: false });
      
      const compiled = (historyData || []).map(log => {
         const staff = staffList.find(s => String(s.id).toLowerCase() === String(log.inspected_by || '').toLowerCase() || String(s.email).toLowerCase() === String(log.user_email || '').toLowerCase());
         
         let sName = log.user_name || log.staff_name || log.full_name || (staff ? (staff.full_name || staff.name) : 'Unknown Staff');
         let sCode = log.emp_code || log.employee_code || (staff ? (staff.emp_code || staff.email) : 'N/A');

         const statusLow = String(log.status || '').toLowerCase();
         if (statusLow === 'stock intake' || statusLow === 'assigned' || String(log.notes || '').toLowerCase().includes('asset configuration')) {
             sName = 'Administrator / System';
             sCode = 'ADMIN RECORD';
         }

         return { 
           ...log, 
           historical_staff_name: sName || 'Unknown Staff', 
           historical_emp_code: sCode || 'N/A' 
         };
      });
      setAssetHistory(compiled);
    } catch (e) {
      console.error(e);
    } finally { 
      setIsLoadingHistory(false); 
    }
  };

  const fetchVerificationLedger = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [inspRes, assetsRes, profilesRes] = await Promise.all([
        supabase.from('inspections').select('*').order('created_at', { ascending: false }),
        supabase.from('assets').select('*'),
        supabase.from('profiles').select('*')
      ]);

      const rawInspections = inspRes.data || [];
      const assetsData = assetsRes.data || [];
      const profilesData = profilesRes.data || [];
      setStaffList(profilesData);

      const masterLedger: any[] = [];
      const now = new Date();
      now.setHours(0,0,0,0);

      rawInspections.forEach((insp, idx) => {
        const inspStatusLower = String(insp.status || '').toLowerCase();
        const inspNotesLower = String(insp.notes || '').toLowerCase();

        // Strict Lifecycle Filter: Returns/Replacements go to their own modules
        if (
          inspStatusLower.includes('return') || inspNotesLower.includes('return') ||
          inspStatusLower.includes('replace') || inspNotesLower.includes('replace')
        ) {
          return; 
        }

        const inspAssetIdStr = String(insp.asset_id || '').toLowerCase().trim();
        const inspTagStr = String(insp.asset_tag || '').toLowerCase().trim();
        const inspSerialStr = String(insp.serial_number || '').toLowerCase().trim();

        // Cross-match asset across ID, Asset Tag, and Serial Number
        const matchedAsset = assetsData.find(a => {
          const aId = String(a.id || '').toLowerCase().trim();
          const aTag = String(a.asset_tag || '').toLowerCase().trim();
          const aSerial = String(a.serial_number || a.serial || '').toLowerCase().trim();

          if (inspAssetIdStr && (aId === inspAssetIdStr || aTag === inspAssetIdStr || aSerial === inspAssetIdStr)) return true;
          if (inspTagStr && aTag === inspTagStr) return true;
          if (inspSerialStr && aSerial === inspSerialStr) return true;
          return false;
        }) || {};

        const ib = String(insp.inspected_by || '').toLowerCase().trim();
        const ue = String(insp.user_email || '').toLowerCase().trim();
        const uid = String(insp.user_id || '').toLowerCase().trim();
        const rawEmp = String(insp.emp_code || insp.employee_code || '').toLowerCase().trim();

        let extractedName = insp.user_name || insp.staff_name || insp.full_name || insp.employee_name;
        if (!extractedName && insp.notes && insp.notes.includes('Digitally Signed')) {
          const match = insp.notes.match(/by\s+(.*?)\s+(?:on|at|$)/i);
          if (match) extractedName = match[1].trim();
        }

        // 🌟 STRICT TIERED MATCHING (Fix for the Lakhwinder Identity Collision)
        let matchedProfile = null;

        // Tier 1: Absolute Hard ID Matches
        if (uid || ib) {
          matchedProfile = profilesData.find(p => {
            const pId = String(p.id).toLowerCase().trim();
            return (uid && pId === uid) || (ib && pId === ib);
          });
        }

        // Tier 2: Email Match
        if (!matchedProfile && ue) {
          matchedProfile = profilesData.find(p => String(p.email).toLowerCase().trim() === ue);
        }

        // Tier 3: EMP Code Match
        if (!matchedProfile && rawEmp) {
          matchedProfile = profilesData.find(p => {
            const e1 = String(p.emp_code).toLowerCase().trim();
            const e2 = String(p.employee_code).toLowerCase().trim();
            const e3 = String(p.emp_id).toLowerCase().trim();
            return rawEmp === e1 || rawEmp === e2 || rawEmp === e3;
          });
        }

        // Tier 4: Assigned To Match + Extracted Name Cross-Check
        if (!matchedProfile && extractedName) {
          const assigneeProfile = profilesData.find(p => String(p.id).toLowerCase() === String(matchedAsset.assigned_to).toLowerCase());
          if (assigneeProfile) {
            const n1 = String(assigneeProfile.full_name).toLowerCase().trim();
            const n2 = String(assigneeProfile.name).toLowerCase().trim();
            const en = extractedName.toLowerCase().trim();
            if (n1 === en || n2 === en || n1.includes(en) || en.includes(n1)) {
              matchedProfile = assigneeProfile;
            }
          }
        }

        // Tier 5: Pure Name Fallback (Risky, but last resort)
        if (!matchedProfile && extractedName) {
          matchedProfile = profilesData.find(p => {
            const n1 = String(p.full_name).toLowerCase().trim();
            const n2 = String(p.name).toLowerCase().trim();
            const en = extractedName.toLowerCase().trim();
            return n1 === en || n2 === en;
          });
        }

        // Tier 6: Absolute Assignee Fallback
        if (!matchedProfile && matchedAsset.assigned_to && !inspStatusLower.includes('stock intake')) {
          matchedProfile = profilesData.find(p => String(p.id).toLowerCase() === String(matchedAsset.assigned_to).toLowerCase());
        }

        const currentAssigneeRaw = String(matchedAsset.assigned_to || '').toLowerCase().trim();
        const currentAssigneeProfile = profilesData.find(p => String(p.id).toLowerCase().trim() === currentAssigneeRaw);

        const itemIdentifier = insp.id || `insp-${matchedAsset.id || idx}-${Date.now()}`;
        
        const isProfileAdmin = matchedProfile && (
          String(matchedProfile.role || '').toLowerCase() === 'admin' || 
          String(matchedProfile.user_type || '').toLowerCase() === 'admin' || 
          matchedProfile.is_admin === true ||
          String(matchedProfile.emp_code || '').toUpperCase() === 'ADMIN' ||
          String(matchedProfile.emp_code || '').toUpperCase() === 'SYS' ||
          String(matchedProfile.emp_code || '').toUpperCase().startsWith('ADM')
        );

        const isSystemOrAdminKeyword = 
          ib === 'admin' || ib === 'system' || ib === 'administrator' ||
          inspNotesLower.includes('asset configuration updated') || 
          inspNotesLower.includes('asset initially registered') ||
          inspNotesLower.includes('asset forcefully unassigned') ||
          inspNotesLower.includes('asset re-assigned') ||
          inspStatusLower === 'stock intake';

        const photosArray = Array.isArray(insp.photos) ? insp.photos : Object.values(insp.photos || {});
        const isUnmappedAdminAction = !matchedProfile && (!!insp.user_email || !!insp.inspected_by) && 
          (isSystemOrAdminKeyword || photosArray.length === 0);

        const isAdminAction = isProfileAdmin || isSystemOrAdminKeyword || isUnmappedAdminAction || insp.is_admin === true || String(insp.type || '').toLowerCase() === 'admin';
        
        if (isAdminAction && filterTab !== 'All Logs' && filterTab !== 'Admin Edits') return;

        let historicalName = matchedProfile?.full_name || matchedProfile?.name || extractedName;
        let historicalEmpCode = matchedProfile?.emp_code || matchedProfile?.emp_id || insp.emp_code || insp.employee_code;
        
        if (!historicalEmpCode && ib) {
          const upperIb = ib.toUpperCase();
          if (upperIb.startsWith('EMP')) historicalEmpCode = upperIb; 
          else if (upperIb.includes('@')) historicalEmpCode = 'EMAIL-LOG';
          else historicalEmpCode = `ID-${upperIb.substring(0, 8)}`;
        }

        let isDeletedUser = false;
        
        // Comprehensive Pending Normalization
        const isPendingStatus = 
          !insp.status || 
          inspStatusLower.includes('pending') || 
          inspStatusLower.includes('review') || 
          inspStatusLower.includes('awaiting') || 
          inspStatusLower.includes('submit');

        let normalizedStatus = insp.status;
        if (isAdminAction) {
          historicalName = 'Administrator / System';
          historicalEmpCode = 'ADMIN RECORD';
          isDeletedUser = false;
          normalizedStatus = insp.status || 'Admin Update';
        } else {
          if (isPendingStatus) {
            normalizedStatus = 'Pending';
          }
          if (!historicalName) {
            isDeletedUser = true;
            historicalName = ue ? ue.split('@')[0] : 'Unknown Staff Member';
          }
          if (!historicalEmpCode) {
            historicalEmpCode = 'OLD-RECORD';
          }
        }

        let currName = currentAssigneeProfile?.full_name || currentAssigneeProfile?.name || 'In Stock (Unassigned)';
        let currCode = currentAssigneeProfile?.emp_code || currentAssigneeProfile?.emp_id || 'N/A';

        if (String(matchedAsset.assigned_to || '').toLowerCase().includes('admin')) {
          currName = 'IT Administrator';
          currCode = 'ADMIN';
        }

        const baseDate = insp.created_at || matchedAsset.last_inspection_date || matchedAsset.created_at;
        const nextDue = getNextDueDate(baseDate, matchedAsset.category || insp.category || 'Laptop');
        let daysUntilDue = 999;
        if (nextDue) {
          const diffTime = nextDue.getTime() - now.getTime();
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const isHistorical = ['approved', 'pass', 'resolved'].some(k => inspStatusLower.includes(k)) || isAdminAction;

        masterLedger.push({
          ...insp,
          id: itemIdentifier,
          asset_id: matchedAsset.id || insp.asset_id,
          is_synthetic: false,
          is_submission: !isAdminAction,
          is_admin_action: isAdminAction,
          staff_id: matchedProfile?.id || insp.inspected_by || 'UnknownID', 
          
          asset_name: matchedAsset.name || matchedAsset.asset_name || insp.asset_name || 'Unmapped Device',
          category: matchedAsset.category || insp.category || 'Laptop', 
          serial_number: matchedAsset.serial_number || matchedAsset.serial || insp.serial_number || 'S/N UNKNOWN',
          asset_tag: matchedAsset.asset_tag || insp.asset_tag || 'NO-TAG',
          
          current_assignee_name: currName,
          current_assignee_code: currCode,
          
          historical_staff_name: historicalName || 'Unknown Staff',
          historical_emp_code: historicalEmpCode || 'N/A',
          
          is_deleted_user: isDeletedUser,
          status: normalizedStatus,
          photos: photosArray,
          next_due: nextDue,
          days_until_due: daysUntilDue,
          is_due_soon: daysUntilDue <= 5 && daysUntilDue >= 0 && !isHistorical,
          full_asset_object: matchedAsset.id ? matchedAsset : {
            id: insp.asset_id,
            name: insp.asset_name,
            asset_tag: insp.asset_tag,
            serial_number: insp.serial_number,
            category: insp.category,
            status: insp.status
          }
        });
      });

      // Synthetic Overdue Cards (ONLY generated if NO pending review exists for the asset)
      assetsData.forEach(asset => {
        if (!asset.assigned_to || String(asset.assigned_to).trim() === '') return;
        if (String(asset.status || '').toLowerCase().includes('return')) return;

        const currentStaff = profilesData.find(p => p.id === asset.assigned_to || String(p.email || '').toLowerCase() === String(asset.assigned_to).toLowerCase());
        
        const isStaffAdmin = currentStaff && (
          String(currentStaff.role || '').toLowerCase() === 'admin' || 
          String(currentStaff.user_type || '').toLowerCase() === 'admin' || 
          currentStaff.is_admin === true ||
          String(currentStaff.emp_code || '').toUpperCase() === 'ADMIN' ||
          String(currentStaff.emp_code || '').toUpperCase() === 'SYS'
        );
        const isAssignedToAdminText = String(asset.assigned_to).toLowerCase().includes('admin');
        
        if (isStaffAdmin || isAssignedToAdminText) return; 

        const assetLogs = masterLedger.filter(i => 
          String(i.asset_id) === String(asset.id) || 
          String(i.asset_tag).toLowerCase() === String(asset.asset_tag).toLowerCase() ||
          (i.serial_number && String(i.serial_number).toLowerCase() === String(asset.serial_number || asset.serial).toLowerCase())
        );
        
        // Check if there is ANY pending inspection submission awaiting review
        const activePendingLog = assetLogs.find(i => {
          const st = String(i.status || '').toLowerCase();
          return !i.is_admin_action && i.is_submission && (st.includes('pending') || st.includes('review') || st.includes('awaiting') || st.includes('submit'));
        });

        // Suppress synthetic overdue cards if a real submission is pending review or recently completed!
        if (activePendingLog) return;

        const latestInspectionLog = assetLogs.find(i => i.is_submission && (i.status === 'Approved' || i.status === 'Pass' || i.status === 'Pending'));
        const lastInspectionDate = latestInspectionLog?.created_at || asset.last_inspection_date || asset.created_at;

        let nextDue = null;
        if (asset.next_inspection_date) {
          nextDue = new Date(asset.next_inspection_date);
        } else {
          nextDue = getNextDueDate(lastInspectionDate, asset.category || 'Laptop');
        }

        const isOverdue = nextDue ? (new Date(nextDue).setHours(0,0,0,0) < now.getTime()) : false;
        let daysUntilDue = 999;
        if (nextDue) {
          const diffTime = nextDue.getTime() - now.getTime();
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const inspStatusStr = String(asset.inspection_status || asset.status || '').toLowerCase();
        const needsAction = inspStatusStr.includes('action required') || inspStatusStr.includes('re-inspection');
        const isDueSoon = daysUntilDue <= 5 && daysUntilDue >= 0;

        if (isOverdue || needsAction || isDueSoon) {
          let sName = currentStaff?.full_name || currentStaff?.name || 'Unknown Staff';
          let sCode = currentStaff?.emp_code || currentStaff?.emp_id || 'STAFF';

          let finalStatus = 'Awaiting Staff Action';
          if (isOverdue) finalStatus = 'Overdue';
          else if (isDueSoon) finalStatus = 'Due Soon';

          masterLedger.push({
            id: `synthetic-${asset.id}-${Date.now()}`,
            asset_id: asset.id,
            is_synthetic: true,
            is_submission: false,
            is_admin_action: false,
            staff_id: currentStaff?.id || asset.assigned_to || 'UnknownID',
            created_at: new Date().toISOString(),
            asset_name: asset.name || asset.asset_name || 'Unknown Asset',
            category: asset.category || 'Hardware', 
            serial_number: asset.serial_number || asset.serial || 'N/A',
            asset_tag: asset.asset_tag || 'NO-TAG',
            
            current_assignee_name: sName,
            current_assignee_code: sCode,
            
            historical_staff_name: sName,
            historical_emp_code: sCode,
            
            is_deleted_user: !currentStaff,
            status: finalStatus,
            photos: [],
            next_due: nextDue,
            days_until_due: daysUntilDue,
            full_asset_object: asset
          });
        }
      });

      const assetGroups: Record<string, any[]> = {};
      masterLedger.forEach(item => {
        const aId = item.asset_id || `unknown-${Math.random()}`;
        if (!assetGroups[aId]) assetGroups[aId] = [];
        assetGroups[aId].push(item);
      });

      const finalLedger: any[] = [];
      Object.values(assetGroups).forEach(group => {
        group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        group.forEach((item, index) => {
          item.isLatest = index === 0;
          finalLedger.push(item);
        });
      });

      finalLedger.sort((a, b) => {
        const aActive = (a.isLatest && (String(a.status).includes('Pending') || String(a.status).includes('Action') || String(a.status).includes('Overdue'))) ? -1 : 1;
        const bActive = (b.isLatest && (String(b.status).includes('Pending') || String(b.status).includes('Action') || String(b.status).includes('Overdue'))) ? -1 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setInspections(finalLedger);
    } catch (err: any) {
      alert("Failed to fetch inspection records.");
    } finally {
      setLoading(false);
    }
  };

  const sendStaffAuditReminder = async (staffId: string, assetName: string, tagId: string, status: string) => {
    if (!staffId || staffId.includes('REMOVED-ID') || staffId.includes('NO-EMP-RECORD') || staffId.includes('ADMIN') || staffId.includes('ID-') || staffId === 'UnknownID') {
      return alert("Cannot send alert: No valid active employee profile attached to this record.");
    }
    setSendingAlertId(staffId);
    try {
      const isReInspect = status === 'Re-Inspection';
      const isOverdue = status === 'Overdue';
      const isDueSoon = status === 'Due Soon';
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
      const isTemporaryId = String(inspectionId).startsWith('synthetic-') || String(inspectionId).startsWith('missing-') || String(inspectionId).startsWith('insp-');
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

      if (staffId && !isDeletedUser && !staffId.includes('ADMIN') && !staffId.includes('ID-') && staffId !== 'UnknownID') {
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

      fetchVerificationLedger(false);
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

  const filteredList = inspections.filter(item => {
    if (assetFilter && String(item.asset_id) !== String(assetFilter)) return false;

    const s = String(item.status || '').toLowerCase().trim();
    const isAdminLog = item.is_admin_action === true;
    const isApproved = (s === 'approved' || s === 'pass') && !isAdminLog;
    const isRejected = (s === 'rejected' || s === 'fail') && !isAdminLog;
    const isReInspect = s === 're-inspection' && !isAdminLog;
    const isOverdue = s === 'overdue' && !isAdminLog;
    const isDueSoon = s === 'due soon' && !isAdminLog;
    const isPending = (s.includes('pending') || s.includes('review') || s.includes('awaiting') || s.includes('submit') || s === 'awaiting staff action') && !isAdminLog;

    const query = searchQuery.toLowerCase().trim();
    const cleanQuery = query.replace(/[^a-z0-9]/g, '');

    const matchesSearch = !query || 
      String(item.historical_staff_name || '').toLowerCase().includes(query) ||
      String(item.historical_emp_code || '').toLowerCase().includes(query) ||
      String(item.current_assignee_name || '').toLowerCase().includes(query) ||
      String(item.asset_name || '').toLowerCase().includes(query) ||
      String(item.asset_tag || '').toLowerCase().includes(query) ||
      String(item.serial_number || '').toLowerCase().includes(query) ||
      (cleanQuery !== '' && (
        String(item.asset_tag || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQuery) ||
        String(item.serial_number || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQuery)
      ));

    if (!matchesSearch) return false;

    if (!assetFilter && !item.isLatest) return false;

    if (filterTab === 'All Logs') return item.isLatest; 
    if (filterTab === 'Admin Edits') return isAdminLog;
    if (isAdminLog) return false; 

    if (filterTab === 'Overdue/Soon') return (isOverdue || isDueSoon);
    if (filterTab === 'Pending') return isPending;
    if (filterTab === 'Approved') return isApproved;
    if (filterTab === 'Re-Inspection') return isReInspect;
    if (filterTab === 'Rejected') return isRejected;

    return false;
  });

  const getCount = (type: string) => {
    return inspections.filter(item => {
      const s = String(item.status || '').toLowerCase().trim();
      const isAdminLog = item.is_admin_action === true;
      if (type === 'Pending') return (s.includes('pending') || s.includes('review') || s.includes('awaiting') || s.includes('submit') || s === 'awaiting staff action') && !isAdminLog && item.isLatest;
      if (type === 'Overdue/Soon') return (s === 'overdue' || s === 'due soon') && !isAdminLog && item.isLatest;
      if (type === 'Approved') return (s === 'approved' || s === 'pass') && !isAdminLog && item.isLatest;
      if (type === 'Re-Inspection') return s === 're-inspection' && !isAdminLog && item.isLatest;
      if (type === 'Rejected') return (s === 'rejected' || s === 'fail') && !isAdminLog && item.isLatest;
      if (type === 'Admin Edits') return isAdminLog;
      return item.isLatest; 
    }).length;
  };

  const theme = {
    bg: 'bg-transparent font-sans',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    
    glassPill: isDarkMode
      ? 'bg-black/40 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]'
      : 'bg-slate-200/50 backdrop-blur-xl border border-white/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]',
      
    glassInner: isDarkMode
      ? 'bg-black/20 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
      : 'bg-white/50 backdrop-blur-lg border border-white/70 shadow-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',

    glassCard: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)]',
      
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/20 text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 placeholder-zinc-500' 
      : 'bg-white/40 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] text-slate-800 focus:bg-white/60 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder-slate-400',
  };

  const TABS = [
    { id: 'Overdue/Soon', label: 'Overdue', icon: AlertTriangle, count: getCount('Overdue/Soon'), iconColor: 'text-amber-500', activeClass: isDarkMode ? 'bg-zinc-800 text-amber-400 shadow-sm border-white/10' : 'bg-white text-slate-900 shadow-sm border-slate-200', activeBadge: 'bg-transparent text-amber-500' },
    { id: 'Pending', label: 'Pending', icon: Clock, count: getCount('Pending'), iconColor: 'text-purple-500', activeClass: isDarkMode ? 'bg-zinc-800 text-purple-400 shadow-sm border-white/10' : 'bg-white text-slate-900 shadow-sm border-slate-200', activeBadge: 'bg-transparent text-purple-500' },
    { id: 'Approved', label: 'Approved', icon: CheckCircle2, count: getCount('Approved'), iconColor: 'text-emerald-500', activeClass: isDarkMode ? 'bg-zinc-800 text-emerald-400 shadow-sm border-white/10' : 'bg-white text-slate-900 shadow-sm border-slate-200', activeBadge: 'bg-transparent text-emerald-500' },
    { id: 'Re-Inspection', label: 'Re-Inspection', icon: RefreshCw, count: getCount('Re-Inspection'), iconColor: 'text-orange-500', activeClass: isDarkMode ? 'bg-zinc-800 text-orange-400 shadow-sm border-white/10' : 'bg-white text-slate-900 shadow-sm border-slate-200', activeBadge: 'bg-transparent text-orange-500' },
    { id: 'Rejected', label: 'Rejected', icon: XCircle, count: getCount('Rejected'), iconColor: 'text-rose-500', activeClass: isDarkMode ? 'bg-zinc-800 text-rose-400 shadow-sm border-white/10' : 'bg-white text-slate-900 shadow-sm border-slate-200', activeBadge: 'bg-transparent text-rose-500' },
    { id: 'Admin Edits', label: 'Admin Edits', icon: Settings2, count: getCount('Admin Edits'), iconColor: 'text-indigo-500', activeClass: isDarkMode ? 'bg-zinc-800 text-indigo-400 shadow-sm border-white/10' : 'bg-white text-slate-900 shadow-sm border-slate-200', activeBadge: 'bg-transparent text-indigo-500' },
    { id: 'All Logs', label: 'All Logs', icon: List, count: getCount('All Logs'), iconColor: 'text-slate-500', activeClass: isDarkMode ? 'bg-zinc-800 text-zinc-100 shadow-sm border-white/10' : 'bg-white text-slate-900 shadow-sm border-slate-200', activeBadge: 'bg-transparent text-slate-500' },
  ];

  return (
    <div className={`min-h-[calc(100vh-6rem)] ${theme.bg} p-4 sm:p-6 lg:p-8 relative z-10 transition-colors duration-1000`}>
      
      {/* 🌟 FULL SCREEN GLASS GALLERY MODAL */}
      {gallery.isOpen && (
        <div style={{ zIndex: 100 }} className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setGallery({ ...gallery, isOpen: false, scale: 1 })}></div>
          <button onClick={() => setGallery({ ...gallery, isOpen: false, scale: 1 })} className="absolute top-6 right-6 text-white hover:text-orange-400 bg-white/10 shadow-sm border border-white/20 p-3 rounded-full transition-all hover:scale-110 cursor-pointer z-50">
             <X size={24} />
          </button>
          
          <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-between px-4 z-40 pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index - 1, scale: 1 }); }} 
                disabled={gallery.index === 0}
                className={`pointer-events-auto p-4 rounded-full backdrop-blur-xl border transition-all ${gallery.index === 0 ? 'opacity-30 cursor-not-allowed bg-black/20 text-white/30 border-white/10' : 'bg-white/20 hover:bg-white/30 text-white shadow-sm cursor-pointer hover:scale-110 border-white/40'}`}
              >
                 <ChevronLeft size={32} />
              </button>
              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto relative px-8 overflow-hidden">
                <img 
                   src={gallery.images[gallery.index]} 
                   style={{ transform: `scale(${gallery.scale})` }}
                   onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, scale: gallery.scale === 1 ? 2 : 1 }); }}
                   className={`max-w-full max-h-full object-contain transition-transform duration-300 rounded-3xl shadow-2xl bg-black/40 ${gallery.scale === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'}`} 
                   alt="Gallery View"
                />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index + 1, scale: 1 }); }} 
                disabled={gallery.index === gallery.images.length - 1}
                className={`pointer-events-auto p-4 rounded-full backdrop-blur-xl border transition-all ${gallery.index === gallery.images.length - 1 ? 'opacity-30 cursor-not-allowed bg-black/20 text-white/30 border-white/10' : 'bg-white/20 hover:bg-white/30 text-white shadow-sm cursor-pointer hover:scale-110 border-white/40'}`}
              >
                 <ChevronRight size={32} />
              </button>
          </div>
        </div>
      )}

      {/* 🌟 ASSET DETAILS MODAL WITH HISTORY */}
      {mounted && assetDetailModal && createPortal(
        <div style={{ zIndex: 100 }} className={`fixed inset-0 flex flex-col items-center justify-start pt-24 sm:pt-28 pb-6 px-4 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto ${isDarkMode ? 'bg-slate-950/60' : 'bg-slate-900/40'}`}>
          <div className="absolute inset-0" onClick={() => setAssetDetailModal(null)}></div>
          <div className={`relative max-w-3xl w-full flex flex-col overflow-hidden flex-1 max-h-full ${theme.glassCard} rounded-4xl border-2 shadow-[0_32px_80px_rgba(0,0,0,0.4)] ${isDarkMode ? 'border-orange-500/30' : 'border-white/80'}`}>
            
            <div className={`w-full p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/50 border-slate-200/60'} shrink-0 relative z-30`}>
              <button onClick={() => setAssetDetailModal(null)} className={`absolute top-4 right-4 p-2 rounded-full ${theme.glassInner} ${theme.textMain} hover:bg-rose-500 hover:text-white hover:border-rose-400 transition-all cursor-pointer shadow-sm active:scale-90 z-40`}><X size={16}/></button>

              <div className="flex items-center gap-3 w-full md:w-auto min-w-0 pr-12">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${theme.glassInner} text-orange-500 shadow-sm border border-orange-500/20`}>
                  {getCategoryIcon(assetDetailModal.category, 24)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm sm:text-base font-bold font-mono ${theme.textMain} tracking-wider truncate`}>{assetDetailModal.asset_tag}</h3>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider cursor-default shrink-0 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm`}>{assetDetailModal.status || 'In Stock'}</span>
                  </div>
                  <p className={`text-[11px] font-semibold mt-0.5 truncate ${theme.textSub}`}>
                    S/N: <span className="font-mono font-bold">{assetDetailModal.serial_number || 'N/A'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none p-4 sm:p-6 space-y-5 pb-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 sm:p-5 ${theme.glassInner} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Category</p><p className={`text-sm font-bold mt-1 text-orange-500`}>{assetDetailModal.category || 'Hardware'}</p></div>
                <div className={`p-4 sm:p-5 ${theme.glassInner} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Brand</p><p className={`text-sm font-bold mt-1 ${theme.textMain}`}>{assetDetailModal.brand || 'Standard'}</p></div>
                <div className={`p-4 sm:p-5 ${theme.glassInner} rounded-3xl`}><p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Assets Name</p><p className={`text-sm font-bold mt-1 truncate ${theme.textMain}`} title={assetDetailModal.name}>{assetDetailModal.name}</p></div>
              </div>

              <div className={`p-4 sm:p-5 flex items-center justify-between ${theme.glassInner} rounded-3xl`}>
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>Current Employee Holder:</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.glassCard} text-orange-500`}><User size={18}/></div>
                    <span className={`text-base font-bold ${theme.textMain}`}>{assetDetailModal.current_assignee_name || 'In Stock / Unassigned'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                   <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${theme.textSub}`}>EMP CODE</span>
                   <span className={`font-mono font-bold px-3 py-1.5 rounded-xl text-[11px] border shadow-xs ${isDarkMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-800 border-purple-200'} shrink-0`}>
                     {assetDetailModal.current_assignee_code || 'N/A'}
                   </span>
                </div>
              </div>

              {/* HISTORICAL TIMELINE FOR THIS ASSET */}
              <div className={`p-5 ${theme.glassInner} rounded-3xl`}>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200/50 pb-3">
                  <div className="flex items-center gap-2">
                    <HistoryIcon size={18} className="text-orange-500" />
                    <h4 className={`text-sm font-black uppercase tracking-widest ${theme.textMain}`}>Complete Lifecycle History</h4>
                  </div>
                </div>
                
                {isLoadingHistory ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin text-orange-500 size-6"/></div>
                ) : assetHistory.length === 0 ? (
                  <p className={`text-[12px] font-medium italic ${theme.textSub}`}>No history logs found for this asset.</p>
                ) : (
                  <div className="space-y-4">
                    {assetHistory.map((log, idx) => {
                      let photosArray: string[] = [];
                      try {
                        if (Array.isArray(log.photos)) photosArray = log.photos;
                        else if (typeof log.photos === 'string') {
                          const parsed = JSON.parse(log.photos);
                          if (Array.isArray(parsed)) photosArray = parsed;
                        }
                      } catch(e){}

                      const statusLower = String(log.status || '').toLowerCase();
                      const isAppr = statusLower.includes('approved') || statusLower.includes('pass');
                      const isRe = statusLower.includes('re-inspection');
                      const isRej = statusLower.includes('rejected') || statusLower.includes('fail');
                      
                      let badge = 'bg-slate-100 text-slate-600 border-slate-200';
                      if (isAppr) badge = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                      if (isRe) badge = 'bg-orange-100 text-orange-700 border-orange-200';
                      if (isRej) badge = 'bg-rose-100 text-rose-700 border-rose-200';
                      if (statusLower === 'stock intake' || statusLower === 'assigned') badge = 'bg-purple-100 text-purple-700 border-purple-200';

                      return (
                        <div key={idx} className={`p-4 sm:p-5 ${theme.glassCard} rounded-3xl shadow-sm border ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-white shadow-sm border border-slate-200 text-slate-700`}>
                                {String(log.historical_staff_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className={`text-sm font-bold ${theme.textMain}`}>{log.historical_staff_name}</p>
                                <p className="text-[10px] font-mono font-semibold text-purple-500">{log.historical_emp_code}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${badge}`}>{log.status}</span>
                              <span className={`text-[10px] font-semibold ${theme.textSub}`}>{safeDate(log.created_at)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3 mt-3 pt-3 border-t border-slate-200/50">
                            {log.notes && (
                              <div>
                                <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${theme.textSub}`}>Staff Note</span>
                                <p className={`text-xs italic font-medium leading-relaxed ${theme.textMain}`}>"{log.notes}"</p>
                              </div>
                            )}
                            {log.admin_remarks && (
                              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-800">
                                <span className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-70">Admin Note</span>
                                <p className="text-xs font-bold leading-relaxed">"{log.admin_remarks}"</p>
                              </div>
                            )}
                          </div>

                          {photosArray.length > 0 && (
                            <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-none pb-1">
                              {photosArray.map((url, i) => (
                                <button
                                  key={`hist-photo-${i}`}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openGallery(photosArray, i); }}
                                  className="relative group w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:border-orange-500 cursor-zoom-in shrink-0 bg-white"
                                >
                                  <img src={url} alt="Log" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-orange-600 transition-opacity">
                                    <ZoomIn size={14} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={`p-4 sm:p-5 shrink-0 border-t ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-white/50'} z-30`}>
              <button type="button" onClick={() => setAssetDetailModal(null)} className={`w-full py-3.5 rounded-2xl ${theme.glassCard} ${theme.textMain} hover:opacity-80 transition-all text-xs font-black uppercase tracking-widest cursor-pointer shadow-sm active:scale-95 border border-slate-200`}>Close History</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-screen-2xl mx-auto space-y-6">
        
        {/* 🌟 LIQUID GLASS HEADER PILL */}
        <div className={`${theme.glassCard} rounded-full p-3 sm:p-4 flex flex-col md:flex-row justify-between items-center gap-4`}>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => router.push('/admin')} className={`w-12 h-12 rounded-full ${theme.glassInner} flex items-center justify-center ${theme.textMain} hover:scale-105 transition-all shadow-sm cursor-pointer`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-orange-500" size={24} />
                <h1 className={`text-lg sm:text-xl font-black tracking-tight ${theme.textMain}`}>Inspection Command Center</h1>
              </div>
              <p className={`text-[11px] font-semibold mt-0.5 ${theme.textSub}`}>Adjudicate smartphone captures, issue reminders, and monitor compliance.</p>
            </div>
          </div>
          <button 
            onClick={() => fetchVerificationLedger(true)} 
            disabled={loading}
            className="w-full md:w-auto bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Feeds
          </button>
        </div>

        {/* 🌟 ASSET FILTER ACTIVE INDICATOR */}
        {assetFilter && (
          <div className={`${theme.glassCard} p-5 rounded-4xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-white/80 shadow-sm`}>
            <div className="flex items-center gap-4 text-orange-600">
              <div className="p-3 rounded-full bg-orange-50 text-orange-500"><HistoryIcon size={24} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-orange-500">Asset Timeline Filter Active</p>
                <p className="text-sm font-bold text-slate-900">Showing complete historical track record for selected hardware.</p>
              </div>
            </div>
            <button onClick={clearAssetFilter} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm">
              <FilterX size={16}/> Clear Filter
            </button>
          </div>
        )}

        {/* 🌟 LIQUID PILL TABS */}
        <div className={`w-full flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1.5 rounded-full shadow-sm bg-slate-200/50 border border-slate-300`}>
          {TABS.map(tab => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer border shrink-0 ${
                  isActive ? tab.activeClass : 'bg-slate-100/50 text-slate-600 hover:bg-white hover:text-slate-900 border-transparent'
                }`}
              >
                <tab.icon size={15} className={isActive ? (tab.id === 'All Logs' ? 'text-slate-800' : '') : tab.iconColor} />
                <span>{tab.label}</span>
                
                {/* Status Count Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all ${
                  isActive ? tab.activeBadge : `bg-black/5 dark:bg-white/5 ${theme.textSub}`
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 🌟 SEARCH BAR */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className={`relative flex-1 rounded-full p-1.5 ${theme.glassInner} flex items-center`}>
            <Search size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
            <input 
              type="text" 
              placeholder="Search staff name, asset tag, or serial S/N..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-2 rounded-full outline-none font-semibold text-sm bg-transparent ${theme.textMain} placeholder:text-slate-400 dark:placeholder:text-zinc-500`}
            />
          </div>
        </div>

        {/* 🌟 COMPACT ULTRA-DENSE MULTI-CARD GRID */}
        {loading ? (
          <div className={`w-full py-32 flex flex-col items-center justify-center gap-4 ${theme.glassCard} rounded-4xl`}>
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <span className={`text-[11px] font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Database Records...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-20 rounded-4xl text-center flex flex-col items-center justify-center gap-3 ${theme.glassCard}`}>
            <ClipboardCheck size={48} className="text-orange-500 opacity-60" />
            <h3 className={`text-base font-black uppercase tracking-widest ${theme.textMain}`}>No Records Found</h3>
            <p className={`text-[11px] font-medium max-w-sm ${theme.textSub}`}>No inspection entries match the active criteria.</p>
          </div>
        ) : (
          <div className="pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              <AnimatePresence mode="popLayout">
                {filteredList.map((insp: any, index: number) => {
                  const isApproved = insp.status === 'Approved' || insp.status === 'Pass';
                  const isPending = insp.status === 'Pending' || insp.status === 'Awaiting Staff Action';
                  const isOverdue = insp.status === 'Overdue';
                  const isDueSoon = insp.status === 'Due Soon';
                  const isReInspect = insp.status === 'Re-Inspection';
                  const isRejected = insp.status === 'Rejected' || insp.status === 'Fail';
                  const photosArray = insp.photos || [];
                  const canSendReminder = !insp.is_admin_action && insp.staff_id && !insp.is_deleted_user;

                  // 🌟 DYNAMIC BADGES (Light theme colors)
                  let statusBadgeStyle = isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200';
                  if (isApproved) statusBadgeStyle = isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
                  else if (isOverdue) statusBadgeStyle = isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' : 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse';
                  else if (isDueSoon) statusBadgeStyle = isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
                  else if (isReInspect) statusBadgeStyle = isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200';
                  else if (isRejected) statusBadgeStyle = isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200';

                  return (
                    <motion.div 
                      key={`${insp.id}-${index}`} 
                      id={`inspection-${insp.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`relative flex flex-col p-6 rounded-4xl ${theme.glassCard} transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)] hover:border-orange-500/50 ${isPending || isOverdue || isDueSoon ? 'ring-2 ring-purple-500/20' : ''}`}
                    >
                      
                      {/* 🌟 HISTORICAL LOG INDICATOR */}
                      {assetFilter && !insp.isLatest && (
                        <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-md shadow-sm text-[8px] font-black uppercase tracking-widest z-10 flex items-center gap-1.5 border bg-slate-100 text-slate-500 border-slate-200 backdrop-blur-md">
                          <Archive size={10} /> Historical Log
                        </div>
                      )}

                      {/* Header: Historical Submitter */}
                      <div className={`flex justify-between items-start gap-2 mb-5 ${!insp.isLatest ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 bg-white shadow-sm border border-slate-100 text-slate-600`}>
                            {insp.is_admin_action ? <Settings2 size={16} className="text-purple-500"/> : String(insp.historical_staff_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold leading-tight text-slate-900 wrap-break-word">{insp.historical_staff_name || 'Unknown Staff'}</h3>
                            <p className="text-[10px] font-semibold flex items-center gap-1 mt-0.5 text-slate-500">
                              <span className="font-mono text-purple-600">{insp.historical_emp_code}</span>
                            </p>
                          </div>
                        </div>
                        
                        <span className={`px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest shrink-0 shadow-sm ${statusBadgeStyle}`}>
                          {isPending ? 'Pending Review' : insp.status}
                        </span>
                      </div>

                      {/* Compact Asset Metadata Grid with Same-Page Popup Trigger */}
                      <div className={`p-1 rounded-3xl mb-4 bg-slate-50/80 border border-slate-100 ${!insp.isLatest ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200/60">
                          <div className="flex items-center gap-2 shrink-0">
                            <Laptop size={14} className="text-orange-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Asset</span>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadAssetHistory(insp.asset_id);
                              setAssetDetailModal(insp.full_asset_object || { name: insp.asset_name, asset_tag: insp.asset_tag, serial_number: insp.serial_number, category: insp.category, status: insp.status });
                            }}
                            className="flex-1 min-w-0 text-xs font-bold wrap-break-word text-right transition-colors text-slate-900 hover:text-orange-600 hover:underline cursor-pointer pl-2"
                            title={insp.asset_name}
                          >
                            {insp.asset_name}
                          </button>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2.5 border-b border-slate-200/60">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Tag ID</span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadAssetHistory(insp.asset_id);
                              setAssetDetailModal(insp.full_asset_object || { name: insp.asset_name, asset_tag: insp.asset_tag, serial_number: insp.serial_number, category: insp.category, status: insp.status });
                            }}
                            className="text-xs font-mono font-bold text-purple-600 hover:underline cursor-pointer wrap-break-word text-right pl-2"
                          >
                            {insp.asset_tag}
                          </button>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2.5 border-b border-slate-200/60">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Log Date</span>
                          <span className={`text-xs font-bold text-right text-slate-900`}>
                            {formatDate(insp.created_at)}
                          </span>
                        </div>
                        
                        {/* 🌟 DYNAMIC CURRENT HOLDER DISPLAY */}
                        {insp.current_assignee_code !== insp.historical_emp_code && !insp.is_admin_action && (
                          <div className="flex justify-between items-center px-3 py-2.5 bg-rose-50/50 rounded-b-3xl">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500/70 shrink-0">Now Assigned To</span>
                            <span className="text-[10px] font-bold text-right text-rose-600">
                              {insp.current_assignee_name} <span className="font-mono">({insp.current_assignee_code})</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Photos Preview Row */}
                      <div className={`mb-4 ${!insp.isLatest ? 'opacity-60' : ''}`}>
                        {insp.is_admin_action ? (
                          <div className="p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 text-indigo-700 bg-indigo-50 border border-indigo-100">
                            <Settings2 size={14} className="shrink-0 text-indigo-500" />
                            <span className="truncate">Admin Log (No photos required)</span>
                          </div>
                        ) : !insp.is_submission ? (
                          <div className={`p-2.5 rounded-xl border border-dashed text-[10px] font-bold flex items-center gap-2 ${isOverdue ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                            <AlertTriangle size={14} className="shrink-0" />
                            <span className="truncate">{isOverdue ? 'Overdue - No photos' : 'Awaiting staff submission'}</span>
                          </div>
                        ) : insp.is_synthetic ? (
                          <div className={`p-2.5 rounded-xl border border-dashed text-[10px] font-bold flex items-center gap-2 ${isOverdue ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                            <AlertTriangle size={14} className="shrink-0" />
                            <span className="truncate">{isOverdue ? 'Overdue - No photos' : 'Awaiting staff submission'}</span>
                          </div>
                        ) : photosArray.length === 0 ? (
                          <div className="p-3 rounded-xl text-[10px] font-bold flex items-center gap-2 text-slate-500 bg-slate-100/50 border border-slate-200">
                            <ShieldAlert size={14} /> No photos attached
                          </div>
                        ) : (
                          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 pt-1">
                            {photosArray.map((url: string, i: number) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => openGallery(photosArray, i)}
                                className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-white/80 bg-white/50 backdrop-blur-md p-1 shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:border-orange-400 transition-all cursor-zoom-in shrink-0"
                              >
                                <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-110" />
                                <div className="absolute inset-1 bg-white/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-orange-600 transition-opacity">
                                  <ZoomIn size={14} />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 🌟 PERMANENTLY VISIBLE NOTES SECTION */}
                      <div className={`flex-1 flex flex-col gap-2.5 mb-4 ${!insp.isLatest ? 'opacity-60' : ''}`}>
                        {insp.notes && !insp.is_admin_action && !insp.is_synthetic && (
                          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 text-slate-700">
                            <span className="text-[9px] font-black uppercase tracking-widest block mb-1 text-slate-400">Staff Note</span>
                            <p className="text-[11px] font-medium italic line-clamp-3 leading-relaxed">"{insp.notes}"</p>
                          </div>
                        )}
                        
                        {insp.admin_remarks && (
                          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-100 text-purple-700 shadow-sm">
                            <span className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-70">Admin Note</span>
                            <p className="text-[11px] font-bold line-clamp-3 leading-relaxed">"{insp.admin_remarks}"</p>
                          </div>
                        )}
                      </div>

                      {/* Action Controls */}
                      <div className={`mt-auto pt-4 border-t border-slate-200/60 ${!insp.isLatest ? 'opacity-60' : ''}`}>
                        {isPending && insp.is_submission && insp.isLatest ? (
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              disabled={updatingId === insp.id}
                              onClick={() => executeVerdict(insp.id, insp.asset_id, 'Approved', insp.staff_id, insp.is_deleted_user)}
                              className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 border-0"
                            >
                              {updatingId === insp.id ? '...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === insp.id}
                              onClick={() => executeVerdict(insp.id, insp.asset_id, 'Re-Inspection', insp.staff_id, insp.is_deleted_user)}
                              className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 border-0"
                            >
                              Retry
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === insp.id}
                              onClick={() => executeVerdict(insp.id, insp.asset_id, 'Rejected', insp.staff_id, insp.is_deleted_user)}
                              className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 border-0"
                            >
                              Reject
                            </button>
                          </div>
                        ) : canSendReminder && (isOverdue || isDueSoon || isReInspect) && insp.isLatest ? (
                          <button
                            type="button"
                            disabled={sendingAlertId === insp.staff_id}
                            onClick={() => sendStaffAuditReminder(insp.staff_id, insp.asset_name, insp.asset_tag, insp.status)}
                            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border-0 shadow-sm ${
                              isReInspect || isOverdue || isDueSoon
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                          >
                            <Send size={14} className={sendingAlertId === insp.staff_id ? 'animate-bounce' : ''} />
                            {sendingAlertId === insp.staff_id ? 'Sending...' : 'Ping Reminder'}
                          </button>
                        ) : (
                          <div className="text-center py-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Log Recorded</span>
                          </div>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
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
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
      </div>
    }>
      <AdminInspectionReviewContent />
    </Suspense>
  );
}