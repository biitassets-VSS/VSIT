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

// --- Legacy Data Recovery Dictionaries ---
const LEGACY_STAFF_MAP: Record<string, {name: string, empCode: string}> = {
  'EMP-3812': { name: 'Ansh Sharma', empCode: 'EMP-3812' }, 
  'EMP-9857': { name: 'Lakhwinder 408', empCode: 'EMP-9857' },
  'EMP-5410': { name: 'Parminder Singh', empCode: 'EMP-5410' },
  'EMP-8230': { name: 'Mohit Bahuguna', empCode: 'EMP-8230' },
  'EMP-3624': { name: 'Jaspreet Singh Brar', empCode: 'EMP-3624' },
  'EMP-2035': { name: 'Lakhwinder Singh', empCode: 'EMP-2035' },
  'EMP-1986': { name: 'Damanpreet Singh', empCode: 'EMP-1986' }
};

const ASSET_LEGACY_MAP: Record<string, {name: string, empCode: string}> = {
  'vss-lap-3073': { name: 'Ansh Sharma', empCode: 'EMP-3812' },
  'vss-lap-7494': { name: 'Meenakshi', empCode: 'EMP-3812' },
  'vss-ckm-3198': { name: 'Meenakshi', empCode: 'EMP-3812' },
  'vss-wkm-5335': { name: 'Lakhwinder 408', empCode: 'EMP-9857' },
  'vss-kmu-9828': { name: 'Parminder Singh', empCode: 'EMP-5410' },
  'vss-hdp-5822': { name: 'Parminder Singh', empCode: 'EMP-5410' },
  'vss-lap-9900': { name: 'Parminder Singh', empCode: 'EMP-5410' },
  'vss-mou-6256': { name: 'Parminder Singh', empCode: 'EMP-5410' },
  'vss-mou-3844': { name: 'Parminder Singh', empCode: 'EMP-5410' },
  'vss-hdp-4201': { name: 'Mohit Bahuguna', empCode: 'EMP-8230' },
  'vss-kmu-8987': { name: 'Jaspreet Singh Brar', empCode: 'EMP-3624' },
  'vss-mou-9747': { name: 'Jaspreet Singh Brar', empCode: 'EMP-3624' },
  'vss-kmu-3564': { name: 'Damanpreet Singh', empCode: 'EMP-1986' }
};

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

function parseHistoricalDetailsFromNotes(notes: string) {
  if (!notes) return { name: null, empCode: null };
  let name = null;
  let empCode = null;

  const histMatch = notes.match(/Historical User:\s*([^|]+)\|\s*ID:\s*([^\s\]]+)/i);
  if (histMatch) {
    name = histMatch[1].trim();
    empCode = histMatch[2].trim();
  }

  if (!name) {
    const signMatch = notes.match(/by\s+([A-Za-z\s]+?)\s+(?:on|at|\d{1,2}\/|$)/i);
    if (signMatch) name = signMatch[1].trim();
  }

  return { name, empCode };
}

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

  const loadAssetHistory = async (assetId: string, currentAssigneeId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data: historyData } = await supabase
        .from('inspections')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });
      
      const compiled = (historyData || []).map(log => {
        let staffId = log.inspected_by || log.user_id || log.staff_id || log.profile_id || log.created_by;
        let historicalName = log.user_name || log.staff_name || log.full_name || log.employee_name || log.name || log.submitted_by;
        let historicalEmpCode = log.emp_code || log.employee_code || log.emp_id || log.staff_code || log.employee_id;

        let matchedProfile = staffList.find(p => 
          (staffId && String(p.id).toLowerCase() === String(staffId).toLowerCase()) || 
          (log.user_email && String(p.email).toLowerCase() === String(log.user_email).toLowerCase()) ||
          (historicalEmpCode && (String(p.emp_code).toLowerCase() === String(historicalEmpCode).toLowerCase() || String(p.emp_id).toLowerCase() === String(historicalEmpCode).toLowerCase()))
        );
         
        if (matchedProfile) {
          if (!historicalName) historicalName = matchedProfile.full_name || matchedProfile.name || matchedProfile.user_name;
          if (!historicalEmpCode) historicalEmpCode = matchedProfile.emp_code || matchedProfile.emp_id || matchedProfile.employee_code;
          if (!staffId) staffId = matchedProfile.id;
        }

        const tagLower = String(log.asset_tag || '').toLowerCase();
        const empUpper = String(historicalEmpCode || '').toUpperCase();

        if (ASSET_LEGACY_MAP[tagLower]) {
            historicalName = ASSET_LEGACY_MAP[tagLower].name;
            historicalEmpCode = ASSET_LEGACY_MAP[tagLower].empCode;
        } else if (LEGACY_STAFF_MAP[empUpper]) {
            if (!historicalName || historicalName === 'Unknown Staff Member') {
                historicalName = LEGACY_STAFF_MAP[empUpper].name;
                historicalEmpCode = LEGACY_STAFF_MAP[empUpper].empCode;
            }
        }

        if (!historicalName || historicalName === 'Unknown Staff Member' || String(historicalName).trim() === '') {
          const parsed = parseHistoricalDetailsFromNotes(log.notes || '');
          if (parsed.name) historicalName = parsed.name;
          if (parsed.empCode && (!historicalEmpCode || historicalEmpCode === 'N/A')) historicalEmpCode = parsed.empCode;
        }

        if ((!historicalName || historicalName === 'Unknown Staff Member') && log.user_email) {
           historicalName = log.user_email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        }

        if (!historicalName || String(historicalName).trim() === '') historicalName = 'Unknown Staff Member';
        if (!historicalEmpCode || String(historicalEmpCode).trim() === '') historicalEmpCode = 'N/A';

        const isCurrentHolder = staffId && String(staffId).toLowerCase() === String(currentAssigneeId || '').toLowerCase();
        const userTag = isCurrentHolder ? 'Current Holder' : 'Old User';

        return { 
          ...log, 
          historical_staff_name: historicalName, 
          historical_emp_code: historicalEmpCode,
          user_sequence_tag: userTag
        };
      });

      setAssetHistory(compiled);
    } catch (e) {
      console.error("Error fetching asset history:", e);
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
        const inspTypeLower = String(insp.type || insp.inspection_type || '').toLowerCase();

        // 🟢 STRICT EXCLUSION GATE
        if (
          inspStatusLower.includes('replace') || inspNotesLower.includes('replace') || inspTypeLower.includes('replace') ||
          inspStatusLower.includes('return') || inspNotesLower.includes('return') || inspTypeLower.includes('return') ||
          inspNotesLower.includes('digitally signed') || inspNotesLower.includes('handover agreement') ||
          inspStatusLower.includes('handover') || inspNotesLower.includes('initially registered') ||
          inspNotesLower.includes('asset assigned to a new staff holder') ||
          inspNotesLower.includes('awaiting custodian verification') ||
          inspNotesLower.includes('awaiting agreement') || inspNotesLower.includes('sign-off') ||
          inspStatusLower === 'assigned' || inspStatusLower === 'stock intake' || inspStatusLower === 'demo use' ||
          inspNotesLower.includes('demo use') || inspNotesLower.includes('asset configuration updated')
        ) {
          return; 
        }

        const inspAssetIdStr = String(insp.asset_id || '').toLowerCase().trim();
        const inspTagStr = String(insp.asset_tag || '').toLowerCase().trim();
        const inspSerialStr = String(insp.serial_number || '').toLowerCase().trim();

        const matchedAsset = assetsData.find(a => {
          const aId = String(a.id || '').toLowerCase().trim();
          const aTag = String(a.asset_tag || '').toLowerCase().trim();
          const aSerial = String(a.serial_number || a.serial || '').toLowerCase().trim();

          if (inspAssetIdStr && (aId === inspAssetIdStr || aTag === inspAssetIdStr || aSerial === inspAssetIdStr)) return true;
          if (inspTagStr && aTag === inspTagStr) return true;
          if (inspSerialStr && aSerial === inspSerialStr) return true;
          return false;
        }) || {};

        let staffId = insp.inspected_by || insp.user_id || insp.staff_id || insp.profile_id || insp.created_by;
        let historicalName = insp.user_name || insp.staff_name || insp.full_name || insp.employee_name || insp.name || insp.submitted_by;
        let historicalEmpCode = insp.emp_code || insp.employee_code || insp.emp_id || insp.staff_code || insp.employee_id;

        let matchedProfile = profilesData.find(p => 
          (staffId && String(p.id).toLowerCase() === String(staffId).toLowerCase()) ||
          (insp.user_email && String(p.email).toLowerCase() === String(insp.user_email).toLowerCase())
        );

        if (!matchedProfile && historicalEmpCode) {
          matchedProfile = profilesData.find(p => 
            String(p.emp_code).toLowerCase() === String(historicalEmpCode).toLowerCase() ||
            String(p.emp_id).toLowerCase() === String(historicalEmpCode).toLowerCase()
          );
        }

        if (!matchedProfile && !staffId && matchedAsset.assigned_to) {
          matchedProfile = profilesData.find(p => String(p.id).toLowerCase() === String(matchedAsset.assigned_to).toLowerCase());
          if (matchedProfile) staffId = matchedProfile.id; 
        }

        if (matchedProfile) {
          if (!historicalName) historicalName = matchedProfile.full_name || matchedProfile.name || matchedProfile.user_name;
          if (!historicalEmpCode) historicalEmpCode = matchedProfile.emp_code || matchedProfile.emp_id || matchedProfile.employee_code;
          if (!staffId) staffId = matchedProfile.id;
        }

        const tagLower = String(matchedAsset.asset_tag || insp.asset_tag || '').toLowerCase();
        const empUpper = String(historicalEmpCode || '').toUpperCase();

        if (ASSET_LEGACY_MAP[tagLower]) {
            historicalName = ASSET_LEGACY_MAP[tagLower].name;
            historicalEmpCode = ASSET_LEGACY_MAP[tagLower].empCode;
        } else if (LEGACY_STAFF_MAP[empUpper]) {
            if (!historicalName || historicalName === 'Unknown Staff Member') {
                historicalName = LEGACY_STAFF_MAP[empUpper].name;
                historicalEmpCode = LEGACY_STAFF_MAP[empUpper].empCode;
            }
        }

        if (!historicalName || historicalName === 'Unknown Staff Member' || String(historicalName).trim() === '') {
          const parsed = parseHistoricalDetailsFromNotes(insp.notes || '');
          if (parsed.name) historicalName = parsed.name;
          if (parsed.empCode && (!historicalEmpCode || historicalEmpCode === 'N/A')) historicalEmpCode = parsed.empCode;
        }

        if ((!historicalName || historicalName === 'Unknown Staff Member') && insp.user_email) {
           historicalName = insp.user_email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        }

        if (!historicalName || String(historicalName).trim() === '') historicalName = 'Unknown Staff Member';
        if (!historicalEmpCode || String(historicalEmpCode).trim() === '') historicalEmpCode = 'N/A';
        
        const currentAssigneeRaw = String(matchedAsset.assigned_to || '').toLowerCase().trim();
        const currentAssigneeProfile = profilesData.find(p => String(p.id).toLowerCase().trim() === currentAssigneeRaw);

        let currName = currentAssigneeProfile?.full_name || currentAssigneeProfile?.name || 'In Stock (Unassigned)';
        let currCode = currentAssigneeProfile?.emp_code || currentAssigneeProfile?.emp_id || 'N/A';

        if (String(matchedAsset.assigned_to || '').toLowerCase().includes('admin')) {
          currName = 'IT Administrator';
          currCode = 'ADMIN';
        }

        const itemIdentifier = insp.id || `insp-${matchedAsset.id || idx}-${Date.now()}`;
        const isProfileAdmin = matchedProfile && (
          String(matchedProfile.role || '').toLowerCase() === 'admin' || 
          String(matchedProfile.user_type || '').toLowerCase() === 'admin' || 
          matchedProfile.is_admin === true ||
          String(matchedProfile.emp_code || '').toUpperCase() === 'ADMIN'
        );

        let normalizedStatus = insp.status || 'Pending';
        if (isProfileAdmin) {
          historicalName = 'Administrator / System';
          historicalEmpCode = 'ADMIN RECORD';
          normalizedStatus = insp.status || 'Admin Update';
        } else {
          if (inspStatusLower.includes('pending') || inspStatusLower.includes('review') || inspStatusLower.includes('awaiting') || inspStatusLower.includes('submit')) {
            normalizedStatus = 'Pending';
          }
        }

        const baseDate = insp.created_at || matchedAsset.last_inspection_date || matchedAsset.created_at;
        const nextDue = getNextDueDate(baseDate, matchedAsset.category || insp.category || 'Laptop');
        let daysUntilDue = 999;
        if (nextDue) {
          const diffTime = nextDue.getTime() - now.getTime();
          daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const isHistorical = ['approved', 'pass', 'resolved'].some(k => inspStatusLower.includes(k)) || isProfileAdmin;
        const photosArray = Array.isArray(insp.photos) ? insp.photos : Object.values(insp.photos || {});

        let currentAssignee = matchedAsset.assigned_to;
        let isOldUser = false;
        
        const lowerHistName = String(historicalName || '').toLowerCase().trim();
        const lowerCurrName = String(currName || '').toLowerCase().trim();

        if (lowerHistName === 'ansh sharma' || lowerHistName === 'meenakshi') {
          isOldUser = false;
        } else if (lowerHistName && lowerCurrName && lowerHistName === lowerCurrName) {
          isOldUser = false;
        } else if (staffId && currentAssignee) {
          isOldUser = String(staffId).toLowerCase() !== String(currentAssignee).toLowerCase();
        } else if (staffId && !currentAssignee) {
          isOldUser = true; 
        } else if (!staffId && historicalName !== 'Unknown Staff Member' && historicalName !== 'Administrator / System') {
          isOldUser = true; 
        }

        masterLedger.push({
          ...insp,
          id: itemIdentifier,
          asset_id: matchedAsset.id || insp.asset_id,
          is_synthetic: false,
          is_submission: !isProfileAdmin,
          is_admin_action: isProfileAdmin,
          staff_id: matchedProfile?.id || staffId || 'UnknownID', 
          
          asset_name: matchedAsset.name || matchedAsset.asset_name || insp.asset_name || 'Unmapped Device',
          category: matchedAsset.category || insp.category || 'Laptop', 
          serial_number: matchedAsset.serial_number || matchedAsset.serial || insp.serial_number || 'S/N UNKNOWN',
          asset_tag: matchedAsset.asset_tag || insp.asset_tag || 'NO-TAG',
          
          current_assignee_name: currName,
          current_assignee_code: currCode,
          
          historical_staff_name: historicalName,
          historical_emp_code: historicalEmpCode,
          is_old_user: isOldUser,
          
          is_deleted_user: false,
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

      // Synthetic Overdue Cards
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
        const isAssignedToDemo = String(asset.assigned_to).toLowerCase().includes('demo');
        
        if (isStaffAdmin || isAssignedToAdminText || isAssignedToDemo) return; 

        const assetLogs = masterLedger.filter(i => 
          String(i.asset_id) === String(asset.id) || 
          String(i.asset_tag).toLowerCase() === String(asset.asset_tag).toLowerCase() ||
          (i.serial_number && String(i.serial_number).toLowerCase() === String(asset.serial_number || asset.serial).toLowerCase())
        );
        
        const activePendingLog = assetLogs.find(i => {
          const st = String(i.status || '').toLowerCase();
          return !i.is_admin_action && i.is_submission && (st.includes('pending') || st.includes('review') || st.includes('awaiting') || st.includes('submit'));
        });

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
            is_old_user: false,
            
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

  const executeVerdict = async (
    inspectionId: string, 
    assetId: string, 
    verdict: 'Approved' | 'Re-Inspection' | 'Rejected', 
    staffId?: string, 
    isDeletedUser?: boolean
  ) => {
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
        // Fallback for missing UUID mappings
        query = query.eq('asset_id', assetId).ilike('status', '%Pending%');
      } else {
        // FIX: Target exclusively by Primary Key to prevent silent 0-row updates
        query = query.eq('id', inspectionId);
      }

      const { error: inspErr } = await query;
      if (inspErr && !isTemporaryId) throw inspErr;

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

  // 🌟 TRUE LIQUID GLASS THEME TOKENS 
  const liquidGlass = {
    card: "bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[2rem]",
    pill: "bg-white/50 backdrop-blur-xl border border-white/80 shadow-sm rounded-full",
    inner: "bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl",
  };

  const TABS = [
    { id: 'Pending', label: 'Pending', icon: Clock, count: getCount('Pending'), color: 'text-purple-600' },
    { id: 'Approved', label: 'Approved', icon: CheckCircle2, count: getCount('Approved'), color: 'text-emerald-600' },
    { id: 'Re-Inspection', label: 'Re-Inspection', icon: RefreshCw, count: getCount('Re-Inspection'), color: 'text-orange-600' },
    { id: 'Rejected', label: 'Rejected', icon: XCircle, count: getCount('Rejected'), color: 'text-rose-600' },
    { id: 'All Logs', label: 'All Logs', icon: List, count: getCount('All Logs'), color: 'text-slate-600' },
  ];

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-linear-to-br from-rose-50/40 via-orange-50/30 to-indigo-50/30 p-4 sm:p-6 lg:p-8 relative z-10 font-sans text-slate-900">
      
      {/* GALLERY MODAL */}
      {gallery.isOpen && (
        <div style={{ zIndex: 100 }} className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-3xl">
          <button onClick={() => setGallery({ ...gallery, isOpen: false, scale: 1 })} className="absolute top-6 right-6 text-white bg-white/10 p-3 rounded-full cursor-pointer z-50 hover:bg-white/20 transition-all">
             <X size={24} />
          </button>
          <div className="relative w-full max-w-6xl h-[85vh] flex items-center justify-between px-4 z-40">
              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index - 1, scale: 1 }); }} 
                disabled={gallery.index === 0}
                className="p-4 rounded-full bg-white/20 text-white cursor-pointer disabled:opacity-30 backdrop-blur-xl"
              >
                 <ChevronLeft size={32} />
              </button>
              <div className="flex-1 h-full flex items-center justify-center relative px-8 overflow-hidden">
                <img 
                   src={gallery.images[gallery.index]} 
                   style={{ transform: `scale(${gallery.scale})` }}
                   onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, scale: gallery.scale === 1 ? 2 : 1 }); }}
                   className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl" 
                   alt="Inspection Capture"
                />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, index: gallery.index + 1, scale: 1 }); }} 
                disabled={gallery.index === gallery.images.length - 1}
                className="p-4 rounded-full bg-white/20 text-white cursor-pointer disabled:opacity-30 backdrop-blur-xl"
              >
                 <ChevronRight size={32} />
              </button>
          </div>
        </div>
      )}

      {/* ASSET LIFECYCLE MODAL */}
      {mounted && assetDetailModal && createPortal(
        <div style={{ zIndex: 100 }} className="fixed inset-0 flex flex-col items-center justify-start pt-20 pb-6 px-4 backdrop-blur-2xl bg-slate-900/30">
          <div className="absolute inset-0" onClick={() => setAssetDetailModal(null)}></div>
          <div className={`relative max-w-2xl w-full flex flex-col overflow-hidden flex-1 ${liquidGlass.card} border-white shadow-2xl bg-white/70`}>
            
            <div className="w-full p-6 border-b border-white/60 flex justify-between items-center bg-white/40">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white border border-orange-100 text-orange-500 rounded-2xl shadow-sm">
                  {getCategoryIcon(assetDetailModal.category, 22)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-mono tracking-wide text-slate-900">{assetDetailModal.asset_tag}</h3>
                  <p className="text-xs text-slate-500 font-medium">{assetDetailModal.asset_name}</p>
                </div>
              </div>
              <button onClick={() => setAssetDetailModal(null)} className="p-2.5 rounded-full bg-white border border-slate-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-sm transition-all"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className={`p-4 ${liquidGlass.inner} flex justify-between items-center`}>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Active Assignee</p>
                  <p className="text-sm font-bold mt-0.5 text-slate-900">{assetDetailModal.historical_staff_name || 'Unassigned (In Stock)'}</p>
                </div>
                <span className="font-mono text-xs px-3 py-1 bg-white border border-purple-100 text-purple-700 shadow-sm rounded-xl font-bold">
                  {assetDetailModal.historical_emp_code || 'N/A'}
                </span>
              </div>

              {/* TIMELINE LOGS WITH PREVIOUS / CURRENT HOLDER LABELS */}
              <div className={`p-5 ${liquidGlass.inner}`}>
                <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-slate-700">
                  <HistoryIcon size={16} className="text-orange-500"/> Activity Lifecycle & Holder History
                </h4>

                {isLoadingHistory ? (
                  <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-orange-500 size-6"/></div>
                ) : assetHistory.length === 0 ? (
                  <p className="text-xs italic text-slate-500">No previous logs for this asset.</p>
                ) : (
                  <div className="space-y-3">
                    {assetHistory.map((log, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white/80 border border-white shadow-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{log.historical_staff_name}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                log.user_sequence_tag === 'Current Holder' 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {log.user_sequence_tag}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-purple-600 font-semibold">{log.historical_emp_code}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              log.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                              log.status === 'Re-Inspection' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {log.status}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">{safeDate(log.created_at)}</p>
                          </div>
                        </div>

                        {log.notes && (
                          <p className="text-xs italic text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/60 bg-white/40">
              <button type="button" onClick={() => setAssetDetailModal(null)} className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer shadow-sm">
                Close Modal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-screen-2xl mx-auto space-y-6">
        
        {/* iOS LIGHT LIQUID GLASS HEADER */}
        <div className={`${liquidGlass.pill} p-4 flex justify-between items-center`}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-3 rounded-full bg-white hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900"><ShieldCheck className="text-orange-500"/> Inspection Review Center</h1>
              <p className="text-xs text-slate-500 font-medium">Verify visual audits or request re-inspections from staff.</p>
            </div>
          </div>
          <button onClick={() => fetchVerificationLedger(true)} className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm border border-slate-200 transition-all cursor-pointer active:scale-95">
            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : 'text-orange-500'} /> Sync Feeds
          </button>
        </div>

        {/* ASSET TIMELINE FILTER BANNER */}
        {assetFilter && (
          <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 flex justify-between items-center text-orange-700 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold">
              <HistoryIcon size={16}/> Filter Active for Asset ID: {assetFilter}
            </div>
            <button onClick={() => { setAssetFilter(null); router.replace('/admin/inspections'); }} className="text-xs font-black uppercase underline">
              Clear Filter
            </button>
          </div>
        )}

        {/* TABS (LIQUID GLASS PILL BAR) */}
        <div className={`p-1.5 flex items-center gap-2 overflow-x-auto ${liquidGlass.pill}`}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterTab === tab.id 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <tab.icon size={16} className={tab.color} />
              <span>{tab.label}</span>
              <span className="bg-white border border-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div className={`${liquidGlass.pill} p-2 flex items-center relative`}>
          <Search size={18} className="absolute left-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search staff name, EMP code, asset tag, or asset name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2 outline-none font-semibold text-sm bg-transparent text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* CARDS GRID */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-2 text-slate-500 font-medium"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /> Fetching Staff Records...</div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-20 text-center flex flex-col items-center justify-center gap-2 ${liquidGlass.card}`}>
            <ClipboardCheck size={40} className="text-slate-300" />
            <h3 className="text-base font-bold uppercase text-slate-800">No Inspection Logs Found</h3>
            <p className="text-xs text-slate-500">There are no matching periodic inspection entries under "{filterTab}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredList.map((insp: any) => {
                const isPending = String(insp.status).toLowerCase().includes('pending');
                const isReInspect = String(insp.status).toLowerCase().includes('re-inspection');
                const photosArray = insp.photos || [];

                return (
                  <motion.div 
                    key={insp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${liquidGlass.card} p-6 flex flex-col justify-between hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300`}
                  >
                    <div>
                      {/* STAFF HEADER */}
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center font-extrabold text-slate-800 shadow-sm">
                            {String(insp.historical_staff_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{insp.historical_staff_name}</h3>
                              {/* 🟢 OLD USER BADGE */}
                              {insp.is_old_user && (
                                <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-xs">
                                  Old User
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                              EMP: <span className="text-purple-600">{insp.historical_emp_code}</span>
                            </p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-xs border ${
                          isPending ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                          isReInspect ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          insp.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {insp.status}
                        </span>
                      </div>

                      {/* ASSET DATA PILL */}
                      <div className={`${liquidGlass.inner} p-4 mb-4 space-y-2.5 text-xs bg-slate-50/50`}>
                        <div className="flex items-center gap-2 mb-2 pb-2.5 border-b border-white/60">
                          <Laptop size={14} className="text-slate-500" />
                          <button 
                            onClick={() => {
                              loadAssetHistory(insp.asset_id, insp.current_assigned_to);
                              setAssetDetailModal(insp);
                            }}
                            className="font-bold text-slate-900 hover:text-orange-500 hover:underline cursor-pointer transition-colors uppercase tracking-wide"
                          >
                            INSPECTION REQUEST: {insp.asset_name}
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Tag ID: <span className="font-mono text-slate-800 font-bold ml-1">{insp.asset_tag}</span></span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span className="flex items-center gap-1.5"><Clock size={12}/> Submitted:</span>
                          <span className="text-slate-700 font-semibold">{formatDate(insp.created_at)}</span>
                        </div>
                        
                        {/* 🌟 NOW ASSIGNED TO (FOR OLD USERS) */}
                        {insp.is_old_user && (
                          <div className="flex justify-between items-center pt-2.5 mt-2.5 border-t border-white/60 text-rose-500">
                            <span className="font-bold uppercase tracking-wider text-[10px]">Now Assigned To</span>
                            <span className="font-bold">
                              {insp.current_assignee_name} <span className="font-mono">({insp.current_assignee_code})</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* PHOTOS PREVIEW */}
                      {photosArray.length > 0 ? (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                          {photosArray.map((url: string, i: number) => (
                            <button key={i} type="button" onClick={() => openGallery(photosArray, i)} className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:border-orange-400 hover:shadow-md transition-all cursor-zoom-in shrink-0 bg-white">
                              <img src={url} alt="Capture" className="w-full h-full object-cover"/>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-700 text-xs font-semibold mb-4 flex items-center gap-2 shadow-xs">
                          <AlertTriangle size={14}/> Missing inspection photos
                        </div>
                      )}

                      {/* NOTES */}
                      {insp.notes && (
                        <div className="p-3.5 rounded-2xl bg-white/80 text-slate-600 text-xs italic mb-4 border border-white shadow-xs">
                          "{insp.notes}"
                        </div>
                      )}
                      
                      {/* ADMIN REMARKS IF RETURNED */}
                      {insp.admin_remarks && (
                        <div className="p-3.5 rounded-2xl bg-orange-50 text-orange-800 text-xs font-bold mb-4 border border-orange-100 shadow-xs">
                          Admin Note: "{insp.admin_remarks}"
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    {isPending ? (
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/60 mt-2">
                        <button 
                          disabled={updatingId === insp.id}
                          onClick={() => executeVerdict(insp.id, insp.asset_id, 'Approved', insp.staff_id, insp.is_deleted_user)} 
                          className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          Approve
                        </button>
                        <button 
                          disabled={updatingId === insp.id}
                          onClick={() => executeVerdict(insp.id, insp.asset_id, 'Re-Inspection', insp.staff_id, insp.is_deleted_user)} 
                          className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-orange-500/20"
                        >
                          Retry
                        </button>
                        <button 
                          disabled={updatingId === insp.id}
                          onClick={() => executeVerdict(insp.id, insp.asset_id, 'Rejected', insp.staff_id, insp.is_deleted_user)} 
                          className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-500/20"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-center pt-4 text-xs font-bold text-slate-400 border-t border-white/60 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 size={12}/> Saved in Record
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminInspectionReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-transparent"><Loader2 className="animate-spin text-orange-600 w-10 h-10" /></div>}>
      <AdminInspectionReviewContent />
    </Suspense>
  );
}