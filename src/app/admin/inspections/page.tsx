'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Clock, 
  Laptop, ShieldAlert, Search, RefreshCw, 
  X, History as HistoryIcon, FilterX, Settings2,
  Send, AlertTriangle, List, ZoomIn, ChevronLeft, ChevronRight, Layers, Archive,
  ShieldCheck
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

const formatDate = (dateString: string | Date | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
};

function AdminInspectionReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const targetAssetId = searchParams.get('asset_id'); 

  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<string>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'None' | 'Staff' | 'Asset'>('None');
  const [mounted, setMounted] = useState(false);
  
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  
  // MODAL STATES
  const [gallery, setGallery] = useState({ isOpen: false, images: [] as string[], index: 0, scale: 1 });
  const [assetDetailModal, setAssetDetailModal] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchVerificationLedger();
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

      const masterLedger: any[] = [];
      const activeAssetIds = new Set<string>();
      const now = new Date();
      now.setHours(0,0,0,0);

      rawInspections.forEach((insp, idx) => {
        // 🌟 STRICT LIFECYCLE FILTER: Return/Replace logs go exclusively to their own module pages
        const inspStatusLower = String(insp.status || '').toLowerCase();
        const inspNotesLower = String(insp.notes || '').toLowerCase();
        const inspRemarksLower = String(insp.admin_remarks || '').toLowerCase();

        if (
          inspStatusLower.includes('return') || inspNotesLower.includes('return') || inspRemarksLower.includes('return') ||
          inspStatusLower.includes('replace') || inspNotesLower.includes('replace') || inspRemarksLower.includes('replace')
        ) {
          return; 
        }

        const matchedAsset = assetsData.find(a => String(a.id) === String(insp.asset_id)) || {};
        
        const ib = String(insp.inspected_by || '').toLowerCase().trim();
        const ue = String(insp.user_email || '').toLowerCase().trim();
        const uid = String(insp.user_id || '').toLowerCase().trim();
        const rawEmp = String(insp.emp_code || insp.employee_code || '').toLowerCase().trim();

        // 🌟 STEP 1: EXTRACT NAME FROM LOG
        let extractedName = insp.user_name || insp.staff_name || insp.full_name || insp.employee_name;
        if (!extractedName && insp.notes && insp.notes.includes('Digitally Signed')) {
          const match = insp.notes.match(/by\s+(.*?)\s+(?:on|at|$)/i);
          if (match) extractedName = match[1].trim();
        }

        // 🌟 STEP 2: HIGH-PRECISION MULTI-IDENTIFIER PROFILE RESOLUTION
        const matchedProfile = profilesData.find(p => {
          const pId = String(p.id || '').toLowerCase().trim();
          const pEmail = String(p.email || '').toLowerCase().trim();
          const pEmp1 = String(p.emp_code || '').toLowerCase().trim();
          const pEmp2 = String(p.employee_code || '').toLowerCase().trim();
          const pEmp3 = String(p.emp_id || '').toLowerCase().trim();
          const pName1 = String(p.full_name || '').toLowerCase().trim();
          const pName2 = String(p.name || '').toLowerCase().trim();
          
          if (uid && pId && uid === pId) return true;
          if (ib && (ib === pId || ib === pEmp1 || ib === pEmp2 || ib === pEmp3 || ib === pEmail)) return true;
          if (ue && pEmail && ue === pEmail) return true;
          if (rawEmp && (rawEmp === pEmp1 || rawEmp === pEmp2 || rawEmp === pEmp3)) return true;
          if (extractedName && (pName1 === extractedName.toLowerCase() || pName2 === extractedName.toLowerCase())) return true;
          return false;
        });

        // 🌟 STEP 3: FIND CURRENT ASSIGNEE PROFILE
        const currentAssigneeRaw = String(matchedAsset.assigned_to || '').toLowerCase().trim();
        const currentAssigneeProfile = profilesData.find(p => {
          const pId = String(p.id || '').toLowerCase().trim();
          const pEmail = String(p.email || '').toLowerCase().trim();
          const pEmp1 = String(p.emp_code || '').toLowerCase().trim();
          const pName1 = String(p.full_name || '').toLowerCase().trim();
          const pName2 = String(p.name || '').toLowerCase().trim();
          
          return currentAssigneeRaw && (
             currentAssigneeRaw === pId || 
             currentAssigneeRaw === pEmail || 
             currentAssigneeRaw === pEmp1 ||
             currentAssigneeRaw === pName1 ||
             currentAssigneeRaw === pName2
          );
        });

        const itemIdentifier = insp.id || `insp-${insp.asset_id}-${idx}-${Date.now()}`;
        
        const isProfileAdmin = matchedProfile && (
          matchedProfile.role?.toLowerCase() === 'admin' || 
          matchedProfile.user_type?.toLowerCase() === 'admin' || 
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

        const isAdminAction = isProfileAdmin || isSystemOrAdminKeyword || isUnmappedAdminAction || insp.is_admin === true || insp.type?.toLowerCase() === 'admin';
        
        if (isAdminAction && filterTab !== 'All Logs' && filterTab !== 'Admin Edits') return;

        const isHistorical = ['approved', 'pass', 'resolved'].some(k => inspStatusLower.includes(k)) || isAdminAction;
        if (!isHistorical) activeAssetIds.add(String(matchedAsset.id));

        // 🌟 SET FINAL NAME & EMP CODE (With strict fallback to match Profile EMP Code)
        let finalName = matchedProfile?.full_name || matchedProfile?.name || extractedName;
        let finalEmpCode = matchedProfile?.emp_code || matchedProfile?.emp_id || insp.emp_code || insp.employee_code;
        
        if (!finalEmpCode && ib) {
          const upperIb = ib.toUpperCase();
          if (upperIb.startsWith('EMP')) {
             finalEmpCode = upperIb; 
          } else if (upperIb.includes('@')) {
             finalEmpCode = 'EMAIL-LOG';
          } else {
             finalEmpCode = `ID-${upperIb.substring(0, 8)}`;
          }
        }

        let isDeletedUser = false;
        let normalizedStatus = insp.status === 'Pending Review' || !insp.status ? 'Pending' : insp.status;

        if (isAdminAction) {
          finalName = 'Administrator / System';
          finalEmpCode = 'ADMIN USER';
          isDeletedUser = false;
          if (normalizedStatus === 'Pending' || !insp.status) normalizedStatus = 'Admin Update';
        } else {
          if (!finalName) {
            isDeletedUser = true;
            finalName = ue ? ue.split('@')[0] : 'Former Staff Member';
          }
          if (!finalEmpCode) {
            finalEmpCode = 'OLD-RECORD';
          }

          // 🌟 PRECISE "(OLD USER)" DETERMINATION LOGIC
          let isOldUser = false;
          if (currentAssigneeRaw && currentAssigneeRaw !== 'null' && currentAssigneeRaw !== 'undefined') {
            let isSamePerson = false;
            
            if (currentAssigneeProfile && matchedProfile && currentAssigneeProfile.id === matchedProfile.id) {
              isSamePerson = true;
            } else {
              const caStr = currentAssigneeRaw;
              if (caStr === String(matchedProfile?.id || '').toLowerCase()) isSamePerson = true;
              if (caStr === String(matchedProfile?.email || '').toLowerCase()) isSamePerson = true;
              if (caStr === String(matchedProfile?.emp_code || '').toLowerCase()) isSamePerson = true;
              if (caStr === String(insp.user_id || '').toLowerCase()) isSamePerson = true;
              if (caStr === String(insp.inspected_by || '').toLowerCase()) isSamePerson = true;
              if (caStr === String(insp.user_email || '').toLowerCase()) isSamePerson = true;
              if (caStr === String(finalName || '').toLowerCase()) isSamePerson = true;
            }

            if (!isSamePerson) {
              isOldUser = true;
            }
          }

          if (isOldUser && !isAdminAction) {
            finalName = `${finalName} (Old User)`;
          }
        }

        const nextDue = getNextDueDate(insp.created_at, matchedAsset.category || 'Laptop');
        let daysUntilDue = 999;
        if (nextDue) {
            const diffTime = nextDue.getTime() - now.getTime();
            daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        masterLedger.push({
          ...insp,
          id: itemIdentifier,
          is_synthetic: false,
          is_submission: !isAdminAction,
          is_admin_action: isAdminAction,
          staff_id: matchedProfile?.id || insp.inspected_by, 
          asset_name: matchedAsset.name || matchedAsset.asset_name || 'Unmapped Device',
          category: matchedAsset.category || 'Laptop', 
          serial_number: matchedAsset.serial_number || matchedAsset.serial || 'S/N UNKNOWN',
          asset_tag: matchedAsset.asset_tag || 'NO-TAG',
          current_assignee_name: currentAssigneeProfile?.full_name || currentAssigneeProfile?.name || 'Unassigned',
          current_assignee_code: currentAssigneeProfile?.emp_code || currentAssigneeProfile?.emp_id || 'N/A',
          staff_name: finalName,
          emp_code: finalEmpCode,
          is_deleted_user: isDeletedUser,
          status: normalizedStatus,
          photos: photosArray,
          next_due: nextDue,
          days_until_due: daysUntilDue,
          is_due_soon: daysUntilDue <= 5 && daysUntilDue >= 0 && !isHistorical,
          full_asset_object: matchedAsset
        });
      });

      // 🌟 SYNTHETIC CARDS FOR OVERDUE / MISSING ACTION
      assetsData.forEach(asset => {
        if (!asset.assigned_to || String(asset.assigned_to).trim() === '') return;
        if (asset.status?.toLowerCase().includes('return')) return;

        const matchedStaff = profilesData.find(p => {
          const rawAssignee = String(asset.assigned_to).toLowerCase().trim();
          return p.id === asset.assigned_to || String(p.email || '').toLowerCase().trim() === rawAssignee || String(p.emp_code || '').toLowerCase().trim() === rawAssignee || String(p.full_name || '').toLowerCase().trim() === rawAssignee;
        });
        
        const isStaffAdmin = matchedStaff && (
          matchedStaff.role?.toLowerCase() === 'admin' || 
          matchedStaff.user_type?.toLowerCase() === 'admin' || 
          matchedStaff.is_admin === true ||
          String(matchedStaff.emp_code || '').toUpperCase() === 'ADMIN' ||
          String(matchedStaff.emp_code || '').toUpperCase() === 'SYS'
        );
        const isAssignedToAdminText = String(asset.assigned_to).toLowerCase().includes('admin');
        
        if (isStaffAdmin || isAssignedToAdminText) return; 

        const activeLogExists = masterLedger.find(i => String(i.asset_id) === String(asset.id) && !i.is_historical && i.is_submission);
        if (activeLogExists) return;

        let nextDue = null;
        if (asset.next_inspection_date) {
          nextDue = new Date(asset.next_inspection_date);
        } else if (asset.last_inspection_date) {
          nextDue = getNextDueDate(asset.last_inspection_date, asset.category);
        } else {
          nextDue = getNextDueDate(asset.created_at, asset.category);
        }

        const isOverdue = nextDue ? (new Date(nextDue).setHours(0,0,0,0) < now.getTime()) : false;
        let daysUntilDue = 999;
        if (nextDue) {
            const diffTime = nextDue.getTime() - now.getTime();
            daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const s = (asset.inspection_status || '').toLowerCase();
        const needsAction = s.includes('action required') || s.includes('re-inspection');
        const isDueSoon = daysUntilDue <= 5 && daysUntilDue >= 0;

        if (isOverdue || needsAction || isDueSoon) {
          let sName = matchedStaff?.full_name || matchedStaff?.name || 'Staff Member';
          let sCode = matchedStaff?.emp_code || matchedStaff?.emp_id || 'STAFF';

          let finalStatus = 'Awaiting Staff Action';
          if (isOverdue) finalStatus = 'Overdue';
          else if (isDueSoon) finalStatus = 'Due Soon';

          masterLedger.push({
            id: `synthetic-${asset.id}-${Date.now()}`,
            asset_id: asset.id,
            is_synthetic: true,
            is_submission: false,
            is_admin_action: false,
            staff_id: matchedStaff?.id || asset.assigned_to,
            created_at: new Date().toISOString(),
            asset_name: asset.name || asset.asset_name,
            category: asset.category || 'Hardware', 
            serial_number: asset.serial_number || asset.serial,
            asset_tag: asset.asset_tag || 'NO-TAG',
            current_assignee_name: sName,
            current_assignee_code: sCode,
            staff_name: sName,
            emp_code: sCode || 'N/A',
            is_deleted_user: !matchedStaff,
            status: finalStatus,
            photos: [],
            next_due: nextDue,
            days_until_due: daysUntilDue,
            full_asset_object: asset
          });
        }
      });

      // GROUPING TO IDENTIFY 'isLatest' STATUS
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
        const aActive = (a.isLatest && (a.status || '').toLowerCase().includes('pending')) ? -1 : 1;
        const bActive = (b.isLatest && (b.status || '').toLowerCase().includes('pending')) ? -1 : 1;
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
    if (!staffId || staffId.includes('REMOVED-ID') || staffId.includes('NO-EMP-RECORD') || staffId.includes('ADMIN') || staffId.includes('ID-')) {
      return alert("Cannot send alert: No valid active employee profile ID attached to this record.");
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
    if (assetFilter && item.asset_id !== assetFilter) return false;

    const s = (item.status || '').toLowerCase().trim();
    const isAdminLog = item.is_admin_action === true;
    const isApproved = (s === 'approved' || s === 'pass') && !isAdminLog;
    const isRejected = (s === 'rejected' || s === 'fail') && !isAdminLog;
    const isReInspect = s === 're-inspection' && !isAdminLog;
    const isOverdue = s === 'overdue' && !isAdminLog;
    const isDueSoon = s === 'due soon' && !isAdminLog;
    const isPending = (s.includes('pending') || s === 'awaiting staff action') && !isAdminLog;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.staff_name || '').toLowerCase().includes(query) ||
      (item.emp_code || '').toLowerCase().includes(query) ||
      (item.asset_name || '').toLowerCase().includes(query) ||
      (item.serial_number || '').toLowerCase().includes(query) ||
      (item.asset_tag || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // 🌟 ENFORCE NO DUPLICATES UNLESS EXPLICITLY VIEWING TIMELINE
    if (!assetFilter && !item.isLatest) return false;

    if (filterTab === 'All Logs') return item.isLatest; // Only latest log shown to prevent duplicates
    if (filterTab === 'Admin Edits') return isAdminLog;
    if (isAdminLog) return false; 

    if (filterTab === 'Overdue/Soon') return (isOverdue || isDueSoon);
    if (filterTab === 'Pending') return isPending;
    if (filterTab === 'Approved') return isApproved;
    if (filterTab === 'Re-Inspection') return isReInspect;
    if (filterTab === 'Rejected') return isRejected;

    return false;
  });

  const groupedData: Record<string, any[]> = useMemo(() => {
    if (groupBy === 'None') return { 'All Records': filteredList };
    return filteredList.reduce((acc: Record<string, any[]>, item: any) => {
      let groupKey = 'Unknown';
      if (groupBy === 'Staff') groupKey = item.staff_name || 'Unassigned';
      if (groupBy === 'Asset') groupKey = item.asset_name || item.category || 'Unknown Asset';
      
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredList, groupBy]);

  const getCount = (type: string) => {
    return inspections.filter(item => {
      const s = (item.status || '').toLowerCase().trim();
      const isAdminLog = item.is_admin_action === true;
      if (type === 'Pending') return (s.includes('pending') || s === 'awaiting staff action') && !isAdminLog && item.isLatest;
      if (type === 'Overdue/Soon') return (s === 'overdue' || s === 'due soon') && !isAdminLog && item.isLatest;
      if (type === 'Approved') return (s === 'approved' || s === 'pass') && !isAdminLog && item.isLatest;
      if (type === 'Re-Inspection') return s === 're-inspection' && !isAdminLog && item.isLatest;
      if (type === 'Rejected') return (s === 'rejected' || s === 'fail') && !isAdminLog && item.isLatest;
      if (type === 'Admin Edits') return isAdminLog;
      return item.isLatest; // Default for 'All Logs'
    }).length;
  };

  // 🌟 PURE LIGHT THEME SOLID TABS
  const TABS = [
    { id: 'Overdue/Soon', label: 'Overdue', icon: AlertTriangle, count: getCount('Overdue/Soon'), iconColor: 'text-amber-500', activeClass: 'bg-amber-100 text-amber-700 shadow-sm border-amber-200', activeBadge: 'bg-white text-amber-700 border-amber-200' },
    { id: 'Pending', label: 'Pending', icon: Clock, count: getCount('Pending'), iconColor: 'text-purple-500', activeClass: 'bg-purple-100 text-purple-700 shadow-sm border-purple-200', activeBadge: 'bg-white text-purple-700 border-purple-200' },
    { id: 'Approved', label: 'Approved', icon: CheckCircle2, count: getCount('Approved'), iconColor: 'text-emerald-500', activeClass: 'bg-emerald-100 text-emerald-800 shadow-sm border-emerald-200', activeBadge: 'bg-white text-emerald-800 border-emerald-200' },
    { id: 'Re-Inspection', label: 'Re-Inspection', icon: RefreshCw, count: getCount('Re-Inspection'), iconColor: 'text-orange-500', activeClass: 'bg-orange-100 text-orange-800 shadow-sm border-orange-200', activeBadge: 'bg-white text-orange-800 border-orange-200' },
    { id: 'Rejected', label: 'Rejected', icon: XCircle, count: getCount('Rejected'), iconColor: 'text-rose-500', activeClass: 'bg-rose-100 text-rose-800 shadow-sm border-rose-200', activeBadge: 'bg-white text-rose-800 border-rose-200' },
    { id: 'Admin Edits', label: 'Admin Edits', icon: Settings2, count: getCount('Admin Edits'), iconColor: 'text-indigo-500', activeClass: 'bg-indigo-100 text-indigo-800 shadow-sm border-indigo-200', activeBadge: 'bg-white text-indigo-800 border-indigo-200' },
    { id: 'All Logs', label: 'All Logs', icon: List, count: getCount('All Logs'), iconColor: 'text-slate-500', activeClass: 'bg-white text-slate-800 shadow-sm border-slate-300', activeBadge: 'bg-slate-100 text-slate-800 border-slate-200 shadow-sm' },
  ];

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 font-sans relative z-10 transition-colors duration-1000">
      
      {/* 🌟 FULL SCREEN GLASS GALLERY MODAL */}
      {gallery.isOpen && (
        <div style={{ zIndex: 50 }} className="fixed inset-0 flex items-center justify-center bg-white/90 backdrop-blur-3xl animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setGallery({ ...gallery, isOpen: false, scale: 1 })}></div>
          <button onClick={() => setGallery({ ...gallery, isOpen: false, scale: 1 })} className="absolute top-6 right-6 text-slate-500 hover:text-slate-800 bg-white shadow-sm border border-slate-200 p-3 rounded-full transition-all hover:scale-110 cursor-pointer z-50">
             <X size={24} />
          </button>
          
          <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-between px-4 z-40 pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index - 1, scale: 1 }); }} 
                disabled={gallery.index === 0}
                className={`pointer-events-auto p-4 rounded-full backdrop-blur-xl border border-slate-200 transition-all ${gallery.index === 0 ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm cursor-pointer hover:scale-110'}`}
              >
                 <ChevronLeft size={32} />
              </button>
              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto relative px-8 overflow-hidden">
                <img 
                   src={gallery.images[gallery.index]} 
                   style={{ transform: `scale(${gallery.scale})` }}
                   onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, scale: gallery.scale === 1 ? 2 : 1 }); }}
                   className={`max-w-full max-h-full object-contain transition-transform duration-300 rounded-lg shadow-2xl bg-white ${gallery.scale === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'}`} 
                   alt="Gallery View"
                />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index + 1, scale: 1 }); }} 
                disabled={gallery.index === gallery.images.length - 1}
                className={`pointer-events-auto p-4 rounded-full backdrop-blur-xl border border-slate-200 transition-all ${gallery.index === gallery.images.length - 1 ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm cursor-pointer hover:scale-110'}`}
              >
                 <ChevronRight size={32} />
              </button>
          </div>
        </div>
      )}

      {/* 🌟 ASSET DETAILS POPUP MODAL */}
      {mounted && assetDetailModal && createPortal(
        <div style={{ zIndex: 50 }} className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md animate-in fade-in">
          <div className="absolute inset-0" onClick={() => setAssetDetailModal(null)}></div>
          <div className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white z-10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center border border-orange-200 shadow-sm">
                  <Laptop size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">{assetDetailModal.name || assetDetailModal.asset_name || 'Hardware Unit'}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Specifications & Status</p>
                </div>
              </div>
              <button onClick={() => setAssetDetailModal(null)} className="w-9 h-9 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-white/60 p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Tag ID</span><span className="font-mono font-bold text-purple-600">{assetDetailModal.asset_tag || 'N/A'}</span></div>
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Serial S/N</span><span className="font-mono font-bold text-slate-900">{assetDetailModal.serial_number || 'N/A'}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-white/60 p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Category</span><span className="font-bold text-slate-900">{assetDetailModal.category || 'Hardware'}</span></div>
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Current Status</span><span className="font-bold text-emerald-600">{assetDetailModal.status || 'Assigned'}</span></div>
              </div>
            </div>

            <button onClick={() => setAssetDetailModal(null)} className="w-full py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-black uppercase tracking-widest text-xs rounded-2xl cursor-pointer transition-colors border border-slate-200 shadow-sm">
              Close Details
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-screen-2xl mx-auto space-y-6">
        
        {/* 🌟 BRAND HEADER */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-full p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm border border-white/80">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer hover:scale-105">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-orange-500" size={24} />
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Inspection Command Center</h1>
              </div>
              <p className="text-xs font-semibold mt-1 text-slate-500">Adjudicate smartphone captures, issue reminders, and monitor compliance.</p>
            </div>
          </div>
          <button 
            onClick={() => fetchVerificationLedger(true)} 
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Feeds
          </button>
        </div>

        {/* 🌟 ASSET FILTER ACTIVE INDICATOR */}
        {assetFilter && (
          <div className="bg-white/60 backdrop-blur-2xl p-5 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-white/80 shadow-sm">
            <div className="flex items-center gap-4 text-orange-600">
              <div className="p-3 rounded-full bg-orange-50 text-orange-500"><HistoryIcon size={24} /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-orange-600">Asset Timeline Filter Active</p>
                <p className="text-sm font-bold text-slate-900">Showing complete historical track record for selected hardware.</p>
              </div>
            </div>
            <button onClick={clearAssetFilter} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm">
              <FilterX size={16}/> Clear Filter
            </button>
          </div>
        )}

        {/* 🌟 PURE LIGHT HIGH-CONTRAST TABS */}
        <div className="w-full flex items-center gap-2 overflow-x-auto custom-scrollbar p-1.5 rounded-full shadow-sm bg-slate-200/50 border border-slate-300">
          {TABS.map(tab => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer border shrink-0 ${
                  isActive ? tab.activeClass : 'bg-slate-100/50 text-slate-600 hover:bg-white hover:text-slate-900 border-transparent'
                }`}
              >
                <tab.icon size={15} className={isActive ? (tab.id === 'All Logs' ? 'text-slate-800' : '') : tab.iconColor} />
                <span>{tab.label}</span>
                
                {/* Status Count Badge */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border transition-all ${
                  isActive ? tab.activeBadge : 'bg-white text-slate-500 border-slate-200 shadow-sm'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 🌟 SEARCH BAR & GROUPING CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 rounded-full p-1.5 bg-white/60 backdrop-blur-2xl border border-white/80 shadow-sm">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search staff name, asset tag, or serial S/N..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2 rounded-full outline-none font-semibold text-sm bg-transparent text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/60 backdrop-blur-2xl border border-white/80 shadow-sm">
            <Layers size={18} className="text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Group By:</span>
            <select 
              value={groupBy} 
              onChange={e => setGroupBy(e.target.value as any)} 
              className="bg-transparent border-none outline-none font-bold text-sm cursor-pointer text-slate-900"
            >
              <option value="None">No Grouping (Feed)</option>
              <option value="Staff">Staff Member</option>
              <option value="Asset">Asset Model</option>
            </select>
          </div>
        </div>

        {/* 🌟 COMPACT ULTRA-DENSE MULTI-CARD GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            <span className="text-xs font-bold tracking-widest uppercase text-slate-500">Loading Database Records...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="w-full py-20 rounded-3xl text-center space-y-3 bg-white/80 backdrop-blur-xl shadow-sm border border-white">
            <ClipboardCheck size={40} className="mx-auto text-orange-500 opacity-60" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">No Records Found</h3>
            <p className="text-xs font-semibold text-slate-500">No inspection entries match the active criteria.</p>
          </div>
        ) : (
          <div className="pb-20">
            {(Object.entries(groupedData) as [string, any[]][]).map(([groupName, items]) => (
              <div key={groupName} className="mb-10">
                
                {/* Render Group Header if Grouping is Active */}
                {groupBy !== 'None' && (
                  <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-300">
                    <h2 className="text-lg font-black tracking-tight text-slate-900">{groupName}</h2>
                    <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-white text-slate-500 shadow-sm border border-slate-200">
                      {items.length} Records
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  <AnimatePresence mode="popLayout">
                    {items.map((insp: any, index: number) => {
                      const isApproved = insp.status === 'Approved' || insp.status === 'Pass';
                      const isPending = insp.status === 'Pending' || insp.status === 'Awaiting Staff Action';
                      const isOverdue = insp.status === 'Overdue';
                      const isDueSoon = insp.status === 'Due Soon';
                      const isReInspect = insp.status === 'Re-Inspection';
                      const isRejected = insp.status === 'Rejected' || insp.status === 'Fail';
                      const photosArray = insp.photos || [];
                      const canSendReminder = !insp.is_admin_action && insp.staff_id && !insp.is_deleted_user;

                      // 🌟 DYNAMIC BADGES (Light theme colors)
                      let statusBadgeStyle = 'bg-purple-50 text-purple-600 border-purple-200';
                      if (isApproved) statusBadgeStyle = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                      else if (isOverdue) statusBadgeStyle = 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse';
                      else if (isDueSoon) statusBadgeStyle = 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
                      else if (isReInspect) statusBadgeStyle = 'bg-orange-50 text-orange-600 border-orange-200';
                      else if (isRejected) statusBadgeStyle = 'bg-rose-50 text-rose-600 border-rose-200';

                      return (
                        <motion.div 
                          key={`${insp.id}-${index}`} 
                          id={`inspection-${insp.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`relative flex flex-col p-5 rounded-3xl bg-white/80 backdrop-blur-2xl border border-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)] hover:border-orange-300 ${isPending || isOverdue || isDueSoon ? 'ring-2 ring-purple-500/20' : ''}`}
                        >
                          
                          {/* 🌟 ONLY RENDER HISTORICAL LOG IF TIMELINE IS EXPLICITLY OPENED VIA ASSET FILTER */}
                          {assetFilter && !insp.isLatest && (
                            <div className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-md shadow-sm text-[8px] font-black uppercase tracking-widest z-10 flex items-center gap-1.5 border bg-slate-100 text-slate-500 border-slate-200 backdrop-blur-md">
                              <Archive size={10} /> Historical Log
                            </div>
                          )}

                          {/* Header: User & Status Badge */}
                          <div className={`flex justify-between items-start gap-2 mb-4 ${!insp.isLatest ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 bg-white shadow-sm border border-slate-100 text-slate-600">
                                {insp.is_admin_action ? <Settings2 size={16} className="text-purple-500"/> : insp.staff_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold leading-tight text-slate-900 wrap-break-word">{insp.staff_name}</h3>
                                <p className="text-[10px] font-semibold flex items-center gap-1 mt-0.5 text-slate-500">
                                  <span className="font-mono">{insp.emp_code}</span>
                                </p>
                              </div>
                            </div>
                            
                            <span className={`px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest shrink-0 shadow-sm ${statusBadgeStyle}`}>
                              {isPending ? 'Pending Review' : insp.status}
                            </span>
                          </div>

                          {/* Compact Asset Metadata Grid with Same-Page Popup Trigger */}
                          <div className={`p-1 rounded-2xl mb-4 bg-slate-50/80 border border-slate-100 ${!insp.isLatest ? 'opacity-60' : ''}`}>
                            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200/60">
                              <div className="flex items-center gap-2 shrink-0">
                                <Laptop size={14} className="text-orange-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Asset</span>
                              </div>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssetDetailModal(insp.full_asset_object || { name: insp.asset_name, asset_tag: insp.asset_tag, serial_number: insp.serial_number, category: insp.category, status: insp.status });
                                }}
                                className="flex-1 min-w-0 text-xs font-bold wrap-break-word text-right transition-colors text-slate-900 hover:text-orange-600 hover:underline cursor-pointer"
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
                                  setAssetDetailModal(insp.full_asset_object || { name: insp.asset_name, asset_tag: insp.asset_tag, serial_number: insp.serial_number, category: insp.category, status: insp.status });
                                }}
                                className="text-xs font-mono font-bold text-purple-600 hover:underline cursor-pointer wrap-break-word text-right"
                              >
                                {insp.asset_tag}
                              </button>
                            </div>
                            <div className="flex justify-between items-center px-3 py-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Next Due</span>
                              <span className={`text-xs font-bold text-right ${isOverdue || isDueSoon ? 'text-orange-500 animate-pulse' : 'text-slate-900'}`}>
                                {formatDate(insp.next_due)}
                              </span>
                            </div>
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
                              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 pt-1">
                                {photosArray.map((url: string, i: number) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => openGallery(photosArray, i)}
                                    className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-white/80 bg-white/50 backdrop-blur-md p-1 shadow-sm hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:border-orange-400 transition-all cursor-zoom-in shrink-0"
                                  >
                                    <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-110" />
                                    <div className="absolute inset-1 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-orange-600 rounded-xl">
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
            ))}
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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent"></div>
      </div>
    }>
      <AdminInspectionReviewContent />
    </Suspense>
  );
}