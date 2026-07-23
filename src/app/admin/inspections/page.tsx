'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Clock, 
  Eye, Laptop, User, Calendar, ShieldAlert, Search, RefreshCw, 
  X, Image as ImageIcon, History, FilterX, ExternalLink, Settings
} from 'lucide-react';

function AdminInspectionReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const highlightedId = searchParams.get('id'); 
  const targetAssetId = searchParams.get('asset_id'); 

  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 're-inspection' | 'rejected' | 'admin' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    fetchVerificationLedger();
  }, []);

  useEffect(() => {
    if (targetAssetId) {
      setAssetFilter(targetAssetId);
      setFilterTab('all'); 
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
      const processedAssetIds = new Set();

      rawInspections.forEach((insp, idx) => {
        const matchedAsset = assetsData.find(a => String(a.id) === String(insp.asset_id)) || {};
        
        const matchedProfile = profilesData.find(p => 
          (insp.user_email && p.email?.toLowerCase() === insp.user_email.toLowerCase()) || 
          (insp.inspected_by && String(p.id) === String(insp.inspected_by)) ||
          (insp.inspected_by && p.emp_code?.toLowerCase() === String(insp.inspected_by).toLowerCase()) ||
          (matchedAsset.assigned_to && String(p.id) === String(matchedAsset.assigned_to))
        ) || {};

        processedAssetIds.add(String(matchedAsset.id));
        const itemIdentifier = insp.id || `insp-${insp.asset_id}-${idx}-${Date.now()}`;
        
        const isProfileAdmin = 
          matchedProfile.role?.toLowerCase() === 'admin' || 
          matchedProfile.user_type?.toLowerCase() === 'admin' || 
          matchedProfile.is_admin === true ||
          String(matchedProfile.emp_code || '').toUpperCase() === 'ADMIN' ||
          String(matchedProfile.emp_code || '').toUpperCase() === 'SYS' ||
          String(matchedProfile.emp_code || '').toUpperCase().startsWith('ADM');

        const inspByLower = String(insp.inspected_by || '').toLowerCase().trim();
        const emailLower = String(insp.user_email || '').toLowerCase().trim();
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
        const isUnmappedAdminAction = !matchedProfile.id && (!!insp.user_email || !!insp.inspected_by) && 
          (isSystemOrAdminKeyword || photosArray.length === 0);

        const isAdminAction = isProfileAdmin || isSystemOrAdminKeyword || isUnmappedAdminAction || insp.is_admin === true || insp.type?.toLowerCase() === 'admin';

        let recoveredName = insp.user_name || insp.staff_name || insp.full_name || insp.employee_name;
        if (!recoveredName && insp.notes) {
          const match = insp.notes.match(/by\s+(.*?)\s+on/i);
          if (match) recoveredName = match[1].trim();
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
          if (normalizedStatus === 'Pending' || !insp.status) {
            normalizedStatus = 'Admin Update';
          }
        } else {
          isDeletedUser = !matchedProfile.id && (!!insp.user_email || !!insp.inspected_by);
          finalName = matchedProfile.full_name || matchedProfile.name || recoveredName || (isDeletedUser ? 'Former Staff' : 'Unassigned Staff');
          
          const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(insp.inspected_by || '');
          finalEmpCode = (!isUuid && insp.inspected_by && insp.inspected_by !== 'ARCHIVED') ? insp.inspected_by : (matchedProfile.emp_code || insp.emp_code || (isDeletedUser ? 'ARCHIVED' : 'NO-EMP-RECORD'));
        }

        masterLedger.push({
          ...insp,
          id: itemIdentifier,
          is_submission: !isAdminAction,
          is_admin_action: isAdminAction,
          staff_id: matchedProfile.id || insp.inspected_by,
          asset_name: matchedAsset.name || matchedAsset.asset_name || 'Unmapped Device',
          category: matchedAsset.category || 'Laptop', 
          serial_number: matchedAsset.serial_number || matchedAsset.serial || 'S/N UNKNOWN',
          asset_tag: matchedAsset.asset_tag || 'NO-TAG',
          staff_name: finalName,
          emp_code: finalEmpCode,
          is_deleted_user: isDeletedUser,
          status: normalizedStatus,
          photos: photosArray
        });
      });

      assetsData.forEach(asset => {
        const s = (asset.inspection_status || '').toLowerCase();
        if ((s.includes('pending') || s.includes('overdue') || s.includes('re-inspection')) && !asset.status?.toLowerCase().includes('return')) {
          if (!processedAssetIds.has(String(asset.id))) {
            const matchedStaff = profilesData.find(p => p.id === asset.assigned_to) || {};
            masterLedger.push({
              id: `missing-${asset.id}`,
              asset_id: asset.id,
              is_submission: false,
              is_admin_action: false,
              staff_id: matchedStaff.id,
              created_at: asset.created_at || new Date().toISOString(),
              asset_name: asset.name || asset.asset_name,
              category: asset.category || 'Laptop', 
              serial_number: asset.serial_number || asset.serial,
              asset_tag: asset.asset_tag || 'NO-TAG',
              staff_name: matchedStaff.full_name || matchedStaff.name || 'Unassigned',
              emp_code: matchedStaff.emp_code || matchedStaff.emp_id || 'N/A',
              is_deleted_user: false,
              status: 'Awaiting Staff Action',
              notes: 'Staff member has not submitted the smartphone visual inspection yet.',
              photos: []
            });
          }
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

  const executeVerdict = async (inspectionId: string, assetId: string, verdict: 'Approved' | 'Re-Inspection' | 'Rejected', staffId: string) => {
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

      if (staffId && !staffId.includes('ARCHIVED') && !staffId.includes('NO-EMP-RECORD') && !staffId.includes('ADMIN')) {
        await supabase.from('notifications').insert({
          target_user: staffId,
          title: verdict === 'Approved' ? '✔ Inspection Approved' : `⚠ ${verdict} Action Required`,
          message: verdict === 'Approved' ? `Your recent hardware audit has been approved.` : `Audit returned: ${remarks}`,
          is_read: false,
        });
      }

      setInspections(prev => prev.map(item => 
        (item.id === inspectionId && item.asset_id === assetId) 
          ? { ...item, status: verdict, admin_remarks: remarks || item.admin_remarks } 
          : item
      ));

      alert(`Success: Review locked in as ${verdict}.`);
    } catch (err: any) {
      alert(`Error transmitting verdict: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredList = inspections.filter(item => {
    if (assetFilter && item.asset_id !== assetFilter) return false;

    const s = (item.status || '').toLowerCase().trim();
    const isApproved = s === 'approved' || s === 'pass';
    const isRejected = s === 'rejected' || s === 'fail';
    const isReInspect = s === 're-inspection';
    const isPending = s === 'pending';
    const isAdminLog = item.is_admin_action === true;

    const matchesTab = 
      filterTab === 'all' ? true :
      filterTab === 'pending' ? (isPending && !isAdminLog) :
      filterTab === 'approved' ? isApproved :
      filterTab === 're-inspection' ? isReInspect :
      filterTab === 'rejected' ? isRejected :
      filterTab === 'admin' ? isAdminLog : true;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.staff_name || '').toLowerCase().includes(query) ||
      (item.emp_code || '').toLowerCase().includes(query) ||
      (item.asset_name || '').toLowerCase().includes(query) ||
      (item.serial_number || '').toLowerCase().includes(query) ||
      (item.asset_tag || '').toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const pendingCount = inspections.filter(item => (item.status || '').toLowerCase().trim() === 'pending' && !item.is_admin_action).length;

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#F8FAFC]',
    card: isDarkMode ? 'bg-[#121212] border-[#27272a]' : 'bg-white border-slate-200/60',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-800',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500', 
    inputBg: isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] focus:border-purple-500 focus:ring-purple-500/20 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 focus:border-purple-500 focus:ring-purple-500/20 text-slate-900 placeholder-slate-400',
    cardHover: isDarkMode ? 'hover:border-purple-500/50 hover:bg-[#18181b]' : 'hover:border-purple-300 hover:shadow-lg hover:-translate-y-1',
    iconBgPrimary: isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
    iconBgOrange: isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600',
  };

  const getSemanticColor = (status: string, isSubmission: boolean, isAdminAction?: boolean) => {
    if (isAdminAction) return isDarkMode ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-orange-700 bg-orange-50 border-orange-200';
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved') return isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 're-inspection') return isDarkMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-amber-700 bg-amber-50 border-amber-200';
    if (s === 'rejected') return isDarkMode ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-50 border-rose-200';
    if (!isSubmission) return isDarkMode ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-purple-700 bg-purple-50 border-purple-200'; 
    return isDarkMode ? 'text-zinc-300 bg-[#18181b] border-[#27272a]' : 'text-slate-700 bg-slate-50 border-slate-200'; 
  };

  const calculateNextDueDate = (lastInspectionDate: string, category: string = 'Laptop') => {
    if (!lastInspectionDate) return 'N/A';
    const baseDate = new Date(lastInspectionDate);
    const monthsToAdd = (category || '').toLowerCase().includes('laptop') ? 1 : 3; 
    const lastDayOfTargetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToAdd + 1, 0);
    const lastSaturday = new Date(lastDayOfTargetMonth);
    while (lastSaturday.getDay() !== 6) lastSaturday.setDate(lastSaturday.getDate() - 1);
    return lastSaturday.toLocaleDateString('en-IN'); 
  };

  const clearAssetFilter = () => {
    setAssetFilter(null);
    router.replace('/admin/inspections'); 
  };

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-10`}>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Dynamic Header */}
        <div className={`${theme.card} rounded-3xl p-6 md:p-8 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-md`}>
          <div className="flex items-center gap-5">
            <button onClick={() => router.push('/admin')} className={`p-3 rounded-xl border transition-all duration-300 hover:scale-105 active:scale-95 ${theme.card} hover:border-orange-300 hover:text-orange-600 ${theme.textSub}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${theme.textMain}`}>Inspection Command Center</h1>
                {pendingCount > 0 && !assetFilter && (
                  <span className="px-3 py-1 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-md shadow-orange-600/20">
                    {pendingCount} Pending Reviews
                  </span>
                )}
              </div>
              <p className={`text-sm font-semibold ${theme.textSub}`}>Adjudicate smartphone hardware captures and enforce compliance</p>
            </div>
          </div>

          <button 
            onClick={fetchVerificationLedger} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-sm disabled:opacity-50 hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-[#18181b] border-orange-500/50 text-orange-400 hover:bg-orange-500/10' : 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50'}`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Sync Database</span>
          </button>
        </div>

        {assetFilter && (
          <div className={`border p-5 rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-sm animate-in slide-in-from-top-4 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50/60 border-orange-200/60'}`}>
             <div className={`flex items-center gap-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-900'}`}>
                <div className={`p-3 border rounded-xl shadow-sm ${isDarkMode ? 'bg-[#18181b] border-orange-500/30 text-orange-400' : 'bg-white border-orange-200/80 text-orange-600'}`}>
                  <History size={24} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-orange-500' : 'text-orange-700'}`}>Asset Timeline Filter Active</p>
                  <p className="text-sm font-bold">Showing complete historical track record for selected hardware.</p>
                </div>
             </div>
             <button onClick={clearAssetFilter} className="px-5 py-2.5 bg-white text-orange-600 hover:bg-orange-600 hover:text-white border border-orange-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
               <FilterX size={16}/> Clear Filter
             </button>
          </div>
        )}

        {/* Navigation Filter Tabs & Search Bar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { id: 'pending', label: `Pending (${pendingCount})` },
              { id: 'approved', label: 'Approved' },
              { id: 're-inspection', label: 'Re-Inspection' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'admin', label: `Admin Edits (${inspections.filter(i => i.is_admin_action).length})` },
              { id: 'all', label: `All Logs (${inspections.length})` },
            ].map(tab => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setFilterTab(tab.id as any)}
                  className={`px-5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest shrink-0 cursor-pointer transition-all duration-300 ${
                    isActive 
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 scale-[1.02]' 
                      : `${theme.card} ${theme.textSub} hover:text-purple-600 hover:bg-purple-50/50 hover:border-purple-300 border`
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className={`${theme.card} p-2 rounded-3xl border shadow-sm flex items-center transition-all focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/10`}>
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
              <input 
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee name, S/N, Asset Name, or Tag ID..." 
                className={`w-full pl-12 pr-4 py-3 rounded-2xl text-sm font-semibold outline-none transition-all ${theme.inputBg}`}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center gap-4">
            <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${isDarkMode ? 'border-orange-500' : 'border-purple-600'}`}></div>
            <span className={`text-[11px] font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Submissions...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`w-full py-24 rounded-3xl border text-center space-y-3 shadow-sm ${theme.card}`}>
            <ClipboardCheck size={48} className={`mx-auto ${isDarkMode ? 'text-zinc-700' : 'text-purple-200'}`} />
            <h3 className={`text-sm font-black uppercase tracking-widest ${theme.textMain}`}>No Logs Found</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>The tracking timeline is clear for these parameters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((item, index) => {
              const isPending = item.status === 'Pending';
              const photosArray = item.photos || [];
              const isHighlighted = highlightedId === String(item.id);

              return (
                <div 
                  key={`${item.id}-${index}`} 
                  id={`inspection-${item.id}`}
                  className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all flex flex-col xl:flex-row gap-8 duration-300 hover:shadow-md ${theme.card} ${
                    isHighlighted 
                      ? (isDarkMode ? 'border-orange-500 ring-4 ring-orange-500/10 scale-[1.01]' : 'border-purple-500 ring-4 ring-purple-500/10 scale-[1.01]') 
                      : (isPending && item.is_submission && !item.is_admin_action) 
                        ? (isDarkMode ? 'border-orange-500/40 shadow-orange-600/10' : 'border-purple-200/80 shadow-purple-600/5') 
                        : theme.cardHover
                  }`}
                >
                  {/* Information Workspace Pane */}
                  <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r pb-6 xl:pb-0 xl:pr-8 ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-sm ${
                        item.is_admin_action ? theme.iconBgOrange : 
                        item.is_submission ? theme.iconBgPrimary : (isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500')
                      }`}>
                        {item.is_admin_action ? <Settings size={20} /> : <User size={20} />}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className={`text-lg font-extrabold leading-tight truncate ${theme.textMain}`} title={item.staff_name}>{item.staff_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-sm ${
                            item.is_admin_action ? (isDarkMode ? 'bg-[#18181b] border border-orange-500/30 text-orange-400' : 'bg-orange-50 text-orange-700 border border-orange-200/50') : (isDarkMode ? 'bg-[#18181b] text-zinc-400' : 'bg-slate-100 text-slate-600')
                          }`}>
                            {item.emp_code}
                          </span>
                          {item.is_admin_action && (
                            <span className="text-[9px] bg-orange-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-widest ml-1 shadow-sm shadow-orange-600/20">
                              Admin Action
                            </span>
                          )}
                          {!item.is_admin_action && item.is_deleted_user && (
                            <span className={`text-[9px] border px-2 py-0.5 rounded font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'bg-[#18181b] text-zinc-500 border-zinc-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              Former Staff
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border space-y-3 shadow-sm ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a]' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${theme.textMain}`}>
                        <Laptop size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/assets?view=${item.asset_tag !== 'NO-TAG' ? item.asset_tag : item.asset_id}`);
                          }}
                          className={`truncate cursor-pointer text-left font-black transition-colors ${isDarkMode ? 'hover:text-purple-400 hover:underline' : 'hover:text-purple-600 hover:underline'}`}
                          title="View Asset Details"
                        >
                          {item.asset_name}
                        </button>
                      </div>
                      <div className={`flex justify-between items-center text-[11px] border-t pt-2 mt-2 ${isDarkMode ? 'border-zinc-800' : 'border-slate-200/60'}`}>
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>S/N:</span>
                        <span className={`font-mono font-black ${theme.textMain}`}>{item.serial_number}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>TAG:</span>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/assets?view=${item.asset_tag !== 'NO-TAG' ? item.asset_tag : item.asset_id}`);
                          }}
                          className={`font-mono font-black cursor-pointer flex items-center gap-1 transition-colors ${isDarkMode ? 'text-purple-400 hover:text-purple-300 hover:underline' : 'text-purple-600 hover:text-purple-700 hover:underline'}`}
                          title="View Asset Details"
                        >
                          {item.asset_tag} <ExternalLink size={10} className="mb-0.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 text-[12px]">
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 ${theme.textSub}`}>
                          <Clock size={14} /> 
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {item.is_submission ? 'Recorded Date' : 'Last Inspection'}
                          </span>
                        </div>
                        <span className={`font-bold ${theme.textMain}`}>{new Date(item.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 ${theme.textSub}`}>
                          <Calendar size={14} /> 
                          <span className="text-[10px] font-black uppercase tracking-widest">Upcoming Due</span>
                        </div>
                        <span className={`font-bold ${theme.textMain}`}>
                          {calculateNextDueDate(item.created_at, item.category)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Condition & Action Evidence Workspace Pane */}
                  <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Compliance Evaluation Workspace</h4>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${getSemanticColor(item.status, item.is_submission, item.is_admin_action)}`}>
                        {item.status === 'Pending' ? 'Ready For Review' : item.status}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${theme.textSub}`}><ImageIcon size={12}/> Photographic Evidence ({photosArray.length})</span>
                      {!item.is_submission ? (
                        <div className={`p-4 rounded-xl border border-dashed text-xs font-bold flex items-center gap-2 ${isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-amber-200 bg-amber-50/50 text-amber-700'}`}>
                          <Clock size={14} /> Awaiting staff to upload smartphone verification photos.
                        </div>
                      ) : photosArray.length === 0 ? (
                        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${isDarkMode ? 'border-[#3f3f46] bg-[#18181b] text-zinc-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          <ShieldAlert size={14} /> No graphical assets required or attached to this registry record log.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {photosArray.map((url: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewPhotoModal(url)}
                              className={`relative group w-24 h-24 rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-sm hover:scale-105 ${isDarkMode ? 'border-[#3f3f46] hover:border-purple-500' : 'border-slate-200 hover:border-purple-500 bg-slate-50'}`}
                            >
                              <img src={url} alt={`Evidence Shot ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                <Eye size={20} className="mb-1 text-orange-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest px-1 text-center leading-tight">View Shot {idx + 1}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{item.is_admin_action ? 'System Log Notes' : item.is_submission ? 'Staff Condition Declaration' : 'System Note'}</span>
                      <div className={`p-4 border rounded-2xl text-xs font-medium italic leading-relaxed shadow-inner ${isDarkMode ? 'bg-[#0a0a0a] border-[#27272a] text-zinc-300' : 'bg-slate-50 border-slate-200/80 text-slate-700'}`}>
                        "{item.notes || 'No comments or written declaration provided.'}"
                      </div>
                    </div>

                    {item.admin_remarks && (
                      <div className={`p-4 border rounded-2xl text-xs font-semibold shadow-sm ${isDarkMode ? 'bg-purple-500/5 border-purple-500/20' : 'bg-purple-50/50 border-purple-100'}`}>
                        <span className={`font-bold uppercase text-[9px] tracking-wider block mb-1.5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Administrative Action Remarks:</span>
                        <p className={theme.textMain}>"{item.admin_remarks}"</p>
                      </div>
                    )}

                    <div className={`pt-4 border-t mt-auto ${isDarkMode ? 'border-[#27272a]' : 'border-slate-100'}`}>
                      {item.is_admin_action ? (
                        <div className={`flex items-center justify-between px-5 py-4 border rounded-2xl shadow-sm ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50/50 border-orange-200/60'}`}>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-500' : 'text-orange-800'}`}>System Registry Asset Audit</span>
                          <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                            <CheckCircle2 size={14} /> Log Sealed Automatically
                          </div>
                        </div>
                      ) : !item.is_submission ? (
                         <div className={`flex items-center justify-between px-5 py-4 border rounded-2xl shadow-sm ${isDarkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50/40 border-amber-200/60'}`}>
                           <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-500' : 'text-amber-700'}`}>Pending Staff Action</span>
                           <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                             <Clock size={14} /> Waiting on Employee
                           </div>
                         </div>
                      ) : isPending ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => executeVerdict(item.id, item.asset_id, 'Approved', item.staff_id)}
                            className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                          >
                            <CheckCircle2 size={16} /> {updatingId === item.id ? 'Syncing...' : 'Approve'}
                          </button>
                          
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => executeVerdict(item.id, item.asset_id, 'Re-Inspection', item.staff_id)}
                            className="flex items-center justify-center gap-2 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                          >
                            <RefreshCw size={16} /> Re-Inspect
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => executeVerdict(item.id, item.asset_id, 'Rejected', item.staff_id)}
                            className="flex items-center justify-center gap-2 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                          >
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      ) : (
                        <div className={`flex items-center justify-between px-5 py-4 border rounded-xl shadow-sm ${isDarkMode ? 'bg-[#18181b] border-[#3f3f46]' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Adjudication Complete</span>
                          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest">
                            {item.status === 'Approved' && <CheckCircle2 size={14} className={isDarkMode ? "text-emerald-400" : "text-emerald-600"}/>}
                            {item.status === 'Re-Inspection' && <RefreshCw size={14} className={isDarkMode ? "text-orange-400" : "text-amber-600"}/>}
                            {item.status === 'Rejected' && <XCircle size={14} className={isDarkMode ? "text-rose-400" : "text-rose-600"}/>}
                            <span className={
                              item.status === 'Approved' ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-700') : 
                              item.status === 'Re-Inspection' ? (isDarkMode ? 'text-orange-400' : 'text-amber-700') : 
                              (isDarkMode ? 'text-rose-400' : 'text-rose-700')
                            }>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* High-Res Photo Lightbox Modal */}
        {previewPhotoModal && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 md:p-12 animate-in fade-in duration-200">
            <button 
              onClick={() => setPreviewPhotoModal(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition-all cursor-pointer border border-white/20 hover:scale-110 active:scale-95"
            >
              <X size={20} />
            </button>
            
            <div className="max-w-6xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <img 
                src={previewPhotoModal} 
                alt="Hardware High-Res Verification" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 flex flex-col items-center justify-center gap-4 text-slate-400 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-zinc-800 border-t-orange-600 dark:border-t-orange-500"></div>
        <span className="text-[11px] font-black tracking-widest uppercase text-slate-500 dark:text-zinc-500">Loading Core Engine...</span>
      </div>
    }>
      <AdminInspectionReviewContent />
    </Suspense>
  );
}