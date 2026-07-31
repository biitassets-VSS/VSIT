'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, RotateCcw, CheckCircle2, XCircle, Clock, 
  Eye, Laptop, User, Calendar, ShieldAlert, Search, RefreshCw, 
  X, Image as ImageIcon, History as HistoryIcon, FilterX, ExternalLink, Settings,
  Send, ShieldCheck, Check, AlertTriangle, Package, CornerDownLeft
} from 'lucide-react';

function AdminAssetReturnsContent() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark'); // Enforce light glass theme
    fetchReturnRecords();
  }, []);

  const fetchReturnRecords = async () => {
    setLoading(true);
    try {
      const [inspRes, assetsRes, profilesRes] = await Promise.all([
        supabase.from('inspections').select('*')
          .or('notes.ilike.%return%,status.ilike.%return%,notes.ilike.%replace%,status.ilike.%replace%')
          .order('created_at', { ascending: false }),
        supabase.from('assets').select('*'),
        supabase.from('profiles').select('*')
      ]);

      const rawReturns = inspRes.data || [];
      const assetsData = assetsRes.data || [];
      const profilesData = profilesRes.data || [];

      const masterLedger: any[] = [];

      rawReturns.forEach((insp, idx) => {
        const matchedAsset = assetsData.find(a => String(a.id) === String(insp.asset_id)) || {};
        const matchedProfile = profilesData.find(p => 
          (insp.user_email && p.email?.toLowerCase() === insp.user_email.toLowerCase()) || 
          (insp.inspected_by && String(p.id) === String(insp.inspected_by)) ||
          (insp.inspected_by && p.emp_code?.toLowerCase() === String(insp.inspected_by).toLowerCase()) ||
          (matchedAsset.assigned_to && String(p.id) === String(matchedAsset.assigned_to))
        ) || {};

        const itemIdentifier = insp.inspection_id || insp.uuid || insp.id || `return-${insp.asset_id}-${idx}-${Date.now()}`;
        const photosArray = Array.isArray(insp.photos) ? insp.photos : Object.values(insp.photos || {});

        let recoveredName = insp.user_name || insp.staff_name || insp.full_name;
        if (!recoveredName && insp.notes) {
          const match = insp.notes.match(/by\s+(.*?)\s+on/i);
          if (match) recoveredName = match[1].trim();
        }
        if (!recoveredName && insp.user_email && insp.user_email.includes('@')) {
          recoveredName = insp.user_email.split('@')[0].split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        const finalName = matchedProfile.full_name || matchedProfile.name || recoveredName || 'Unassigned Staff';
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(insp.inspected_by || '');
        const finalEmpCode = (!isUuid && insp.inspected_by) ? insp.inspected_by : (matchedProfile.emp_code || insp.emp_code || 'EMP-UNKNOWN');

        const sLower = (insp.status || '').toLowerCase();
        let isProcessed = sLower.includes('approved') || sLower.includes('rejected') || sLower.includes('restocked') || sLower.includes('completed');

        masterLedger.push({
          ...insp,
          id: itemIdentifier,
          staff_id: matchedProfile.id || insp.inspected_by,
          asset_name: matchedAsset.name || matchedAsset.asset_name || 'Unmapped Hardware',
          category: matchedAsset.category || 'Laptop', 
          serial_number: matchedAsset.serial_number || matchedAsset.serial || 'S/N UNKNOWN',
          asset_tag: matchedAsset.asset_tag || 'NO-TAG',
          staff_name: finalName,
          emp_code: finalEmpCode,
          is_processed: isProcessed,
          status: insp.status || 'Pending Return Review',
          photos: photosArray
        });
      });

      setReturns(masterLedger);
    } catch (err: any) {
      alert("Failed to sync return records.");
    } finally {
      setLoading(false);
    }
  };

  const sendStaffAlert = async (staffId: string, assetName: string, tagId: string, customMessage?: string) => {
    if (!staffId || staffId.includes('EMP-UNKNOWN') || staffId.includes('ADMIN')) {
      return alert("Cannot send alert: No valid employee profile ID attached to this record.");
    }

    setSendingAlertId(staffId);
    try {
      const message = customMessage || `Please check with IT management regarding your hardware return status for ${assetName} (${tagId}).`;
      
      const { error } = await supabase.from('notifications').insert([{
        target_user: staffId,
        title: '🔔 Hardware Return Update',
        message: message,
        is_read: false,
        type: 'info'
      }]);

      if (error) throw error;
      alert(`✔ Success: Active notification pushed directly to employee dashboard!`);
    } catch (err: any) {
      alert(`Error sending notification push: ${err.message}`);
    } finally {
      setSendingAlertId(null);
    }
  };

  const processReturnVerdict = async (item: any, action: 'Approve Return' | 'Reject Return' | 'Approve Replacement') => {
    const assetId = item.asset_id;
    const staffId = item.staff_id;
    const returnId = item.id;

    if (!assetId) return alert("System Error: Missing Asset ID for this record.");

    let remarks = '';
    if (action === 'Reject Return') {
      remarks = prompt(`Provide administrative reason for rejecting this return request:`) || '';
      if (!remarks.trim()) return alert("Remarks are required when rejecting return requests.");
    } else if (action === 'Approve Return') {
      remarks = prompt(`Optional inspection notes upon receiving asset into stock:`) || 'Returned to warehouse stock in good condition.';
    }

    if (!confirm(`Are you sure you want to execute "${action}"?`)) return;

    setUpdatingId(returnId);
    try {
      let targetStatus = 'Return Approved';
      let assetStatus = 'In Stock (Unassigned)';
      let notifTitle = '✔ Hardware Return Approved';
      let notifMsg = `Your return request has been processed and accepted by IT management. The asset is now unassigned from your custody.`;
      let notifType = 'success';

      if (action === 'Reject Return') {
        targetStatus = 'Return Rejected';
        assetStatus = 'Assigned';
        notifTitle = '⚠️ Hardware Return Rejected';
        notifMsg = `Your return request was not accepted by IT management: ${remarks}`;
        notifType = 'warning';
      } else if (action === 'Approve Replacement') {
        targetStatus = 'Replacement Approved';
        assetStatus = 'In Repair';
        notifTitle = '🔄 Hardware Replacement Approved';
        notifMsg = `Your replacement request has been authorized. Please submit your current unit to IT management to receive your replacement.`;
        notifType = 'success';
      }

      let query = supabase.from('inspections')
        .update({ status: targetStatus, admin_remarks: remarks || null });

      if (item.inspection_id) {
        query = query.eq('inspection_id', item.inspection_id);
      } else if (item.uuid) {
        query = query.eq('uuid', item.uuid);
      } else {
        query = query.eq('asset_id', assetId);
        if (item.created_at) query = query.eq('created_at', item.created_at);
        else if (item.status) query = query.eq('status', item.status);
      }

      const { error: inspErr } = await query;
      if (inspErr) throw inspErr;

      const assetUpdatePayload: any = { status: assetStatus, inspection_status: 'Approved' };
      if (action === 'Approve Return') {
        assetUpdatePayload.assigned_to = null;
        assetUpdatePayload.last_inspection_date = new Date().toISOString();
      }

      const { error: assetErr } = await supabase.from('assets').update(assetUpdatePayload).eq('id', assetId);
      if (assetErr) throw assetErr;

      if (staffId && !staffId.includes('EMP-UNKNOWN') && !staffId.includes('ADMIN')) {
        try {
          await supabase.from('notifications').insert([{
            target_user: staffId,
            title: notifTitle,
            message: notifMsg,
            is_read: false,
            type: notifType
          }]);
        } catch (notifErr) {
          console.warn("Non-fatal notification error:", notifErr);
        }
      }

      setReturns(prev => prev.map(r => 
        (r.id === returnId) ? { ...r, status: targetStatus, admin_remarks: remarks || r.admin_remarks, is_processed: true } : r
      ));

      alert(`Success: ${action} executed. Notification sent to employee dashboard.`);
    } catch (err: any) {
      alert(`Error processing return: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = returns.filter(r => !r.is_processed).length;

  const filteredList = returns.filter(item => {
    const matchesTab = activeTab === 'pending' ? !item.is_processed : item.is_processed;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.staff_name || '').toLowerCase().includes(query) ||
      (item.emp_code || '').toLowerCase().includes(query) ||
      (item.asset_name || '').toLowerCase().includes(query) ||
      (item.serial_number || '').toLowerCase().includes(query) ||
      (item.asset_tag || '').toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  // 🌟 EXACT TRANSPARENT MAC OS MATTE GLASS THEME
  const theme = {
    card: 'bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]',
    cardHover: 'hover:bg-white/60 hover:border-orange-400 hover:shadow-[0_8px_32px_rgba(249,115,22,0.15)] hover:-translate-y-1 transition-all duration-300',
    textMain: 'text-slate-900',
    textSub: 'text-slate-700',
  };

  const getSemanticBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s.includes('restocked')) return 'bg-transparent border border-emerald-400 text-emerald-600 shadow-[0_0_8px_rgba(52,211,153,0.4)] group-hover:shadow-[0_0_12px_rgba(52,211,153,0.7)]';
    if (s.includes('rejected')) return 'bg-transparent border border-rose-400 text-rose-600 shadow-[0_0_8px_rgba(243,64,84,0.4)] group-hover:shadow-[0_0_12px_rgba(243,64,84,0.7)]';
    if (s.includes('replace')) return 'bg-transparent border border-purple-400 text-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_12px_rgba(168,85,247,0.7)]';
    return 'bg-transparent border border-orange-400 text-orange-600 shadow-[0_0_8px_rgba(251,146,60,0.4)] group-hover:shadow-[0_0_12px_rgba(251,146,60,0.7)] animate-pulse';
  };

  return (
    <div className={`min-h-screen bg-[#FCF9F8] relative overflow-hidden font-sans antialiased pb-12`}>
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-225 h-125 pointer-events-none z-0 flex justify-between items-center opacity-50">
        <div className="w-112.5 h-112.5 bg-[#FFD1B3] rounded-full blur-[120px]"></div>
        <div className="w-112.5 h-112.5 bg-[#D8B4FE] rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-400 px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4 relative z-10">
        
        {/* BRAND HEADER */}
        <div className={`${theme.card} p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6`}>
          <div className="flex items-center gap-3.5 sm:gap-5">
            <button 
              onClick={() => router.push('/admin')} 
              className={`p-2.5 sm:p-3 bg-white/60 border border-white/80 hover:bg-white/90 shadow-sm rounded-2xl text-slate-800 transition-all cursor-pointer`}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${theme.textMain} flex items-center gap-2`}>
                  <RotateCcw className="text-orange-600 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <span>Asset Returns</span>
                </h1>
                {pendingCount > 0 && (
                  <span className="px-3 py-0.5 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-full animate-pulse shadow-md shadow-orange-600/30">
                    {pendingCount} Pending Requests
                  </span>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-semibold ${theme.textSub}`}>Manage physical hardware handovers, restock approvals, and active dashboard notifications</p>
            </div>
          </div>

          <button 
            onClick={fetchReturnRecords} 
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-5 py-3 bg-white/60 border border-white/80 hover:bg-white/90 shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 text-slate-800 shrink-0`}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-orange-600' : 'text-purple-600'} />
            <span>Sync Records</span>
          </button>
        </div>

        {/* TABS & SEARCH */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'pending', label: `Pending Actions (${pendingCount})`, icon: <Clock size={14} /> },
              { id: 'processed', label: `Processed History (${returns.filter(r => r.is_processed).length})`, icon: <HistoryIcon size={14} /> }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`group flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shrink-0 cursor-pointer transition-all duration-200 border ${
                    isActive 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] border-orange-500 scale-[1.02]' 
                      : `bg-white/60 border border-white/80 text-slate-700 hover:bg-white/90 shadow-sm`
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-purple-600 group-hover:text-purple-700 transition-colors'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SEARCH BAR */}
          <div className="p-3 bg-white/80 border border-white/80 text-slate-900 focus-within:bg-white focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-500/10 rounded-2xl transition-all shadow-sm flex items-center">
            <div className="relative w-full">
              <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400`} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, S/N, Asset Name, or Tag ID..." 
                className="w-full pl-12 pr-4 py-1.5 text-sm font-semibold outline-none bg-transparent placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* 🌟 RETURNS LISTING GRID */}
        {loading ? (
          <div className={`${theme.card} w-full py-32 flex flex-col items-center justify-center gap-4`}>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
            <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Hardware Handovers...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className={`${theme.card} w-full py-24 text-center flex flex-col items-center justify-center space-y-3`}>
            <Package size={48} className="mx-auto text-orange-600 opacity-80" />
            <h3 className={`text-base font-black uppercase tracking-widest ${theme.textMain}`}>
              {activeTab === 'pending' ? 'No Pending Return Requests' : 'No Processed History Found'}
            </h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>
              {activeTab === 'pending' ? 'All hardware returns and replacement requests have been resolved.' : 'No historical return records match your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredList.map((item, index) => {
              const photosArray = item.photos || [];

              return (
                <div 
                  key={`${item.id}-${index}`} 
                  className={`p-6 md:p-8 flex flex-col xl:flex-row gap-8 ${theme.card} ${!item.is_processed ? 'ring-2 ring-orange-400/50 bg-white/60' : theme.cardHover}`}
                >
                  {/* Left: Employee Custody & Hardware Info */}
                  <div className={`w-full xl:w-1/3 flex flex-col gap-6 shrink-0 border-b xl:border-b-0 xl:border-r border-white/60 pb-6 xl:pb-0 xl:pr-8`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 bg-white/80 border border-white/80 text-orange-600 shadow-sm`}>
                        <User size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className={`text-lg font-black leading-tight truncate ${theme.textMain}`} title={item.staff_name}>{item.staff_name}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-white/80 text-slate-700 shadow-sm`}>
                            {item.emp_code}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-widest transition-all duration-300 cursor-default ${getSemanticBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`p-5 bg-white/40 border border-white/60 rounded-2xl space-y-3 shadow-sm`}>
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${theme.textMain}`}>
                        <Laptop size={14} className="text-orange-600 shrink-0" />
                        <button 
                          type="button"
                          onClick={() => router.push(`/admin/assets?view=${item.asset_tag !== 'NO-TAG' ? item.asset_tag : item.asset_id}`)}
                          className="truncate cursor-pointer text-left font-bold transition-colors hover:text-orange-600 hover:underline"
                          title="View Asset Details"
                        >
                          {item.asset_name}
                        </button>
                      </div>
                      <div className={`flex justify-between items-center text-[11px] border-t border-white/60 pt-2.5 mt-2.5`}>
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>S/N:</span>
                        <span className={`font-mono font-bold ${theme.textMain}`}>{item.serial_number}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={`font-bold uppercase tracking-widest ${theme.textSub}`}>TAG ID:</span>
                        <button 
                          type="button"
                          onClick={() => router.push(`/admin/assets?view=${item.asset_tag !== 'NO-TAG' ? item.asset_tag : item.asset_id}`)}
                          className="font-mono font-bold cursor-pointer flex items-center gap-1 transition-colors text-purple-700 hover:text-purple-800 hover:underline"
                          title="View Asset Details"
                        >
                          {item.asset_tag} <ExternalLink size={10} className="mb-0.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className={`flex items-center gap-2 ${theme.textSub}`}>
                        <Clock size={14} className="text-purple-600" /> 
                        <span className="text-[10px] font-bold uppercase tracking-widest">Requested On</span>
                      </div>
                      <span className={`font-bold ${theme.textMain}`}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    {/* Active Ping Button */}
                    {!item.is_processed && (
                      <button
                        type="button"
                        disabled={sendingAlertId === item.staff_id}
                        onClick={() => sendStaffAlert(item.staff_id, item.asset_name, item.asset_tag)}
                        className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_4px_15px_rgba(168,85,247,0.3)] bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                      >
                        <Send size={14} className={sendingAlertId === item.staff_id ? 'animate-bounce' : ''} />
                        <span>{sendingAlertId === item.staff_id ? 'Pushing Alert...' : '⚡ Send Update Ping to Staff'}</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Return Reason, Evidence & Adjudication Actions */}
                  <div className="w-full xl:w-2/3 flex flex-col justify-between gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h4 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Return Request Details & Evidence</h4>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 cursor-default shadow-sm w-fit ${getSemanticBadge(item.status)}`}>
                        {item.is_processed ? 'Resolved Action' : 'Action Required'}
                      </span>
                    </div>

                    {photosArray.length > 0 && (
                      <div className="space-y-2.5">
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${theme.textSub}`}><ImageIcon size={14} className="text-orange-600"/> Attached Hardware Condition Shots ({photosArray.length})</span>
                        <div className="flex flex-wrap gap-3">
                          {photosArray.map((url: any, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewPhotoModal(url)}
                              className={`relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-white/80 bg-white/60 transition-all cursor-pointer shadow-sm hover:scale-105 hover:border-orange-500`}
                            >
                              <img src={url} alt={`Return Shot ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                <Eye size={20} className="mb-1 text-orange-400" />
                                <span className="text-[9px] font-bold uppercase tracking-widest px-1 text-center leading-tight">Shot {idx + 1}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Employee Return Declaration / Reason</span>
                      <div className={`p-4 bg-white/70 border border-white/80 text-slate-800 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm`}>
                        "{item.notes || 'No specific return notes or reason provided by staff member.'}"
                      </div>
                    </div>

                    {item.admin_remarks && (
                      <div className={`p-4 bg-white/60 border border-white/80 rounded-2xl text-xs font-semibold shadow-sm`}>
                        <span className={`font-bold uppercase text-[9px] tracking-wider block mb-1.5 text-purple-700`}>Administrative Resolution Notes:</span>
                        <p className={theme.textMain}>"{item.admin_remarks}"</p>
                      </div>
                    )}

                    <div className={`pt-4 border-t border-white/60 mt-auto`}>
                      {!item.is_processed ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => processReturnVerdict(item, 'Approve Return')}
                            className="flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(5,150,105,0.3)] cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <CheckCircle2 size={16} /> {updatingId === item.id ? 'Processing...' : '✔ Approve Return & Restock'}
                          </button>
                          
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => processReturnVerdict(item, 'Approve Replacement')}
                            className="flex items-center justify-center gap-2 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(249,115,22,0.3)] cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <RefreshCw size={16} /> 🔄 Approve Replacement
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => processReturnVerdict(item, 'Reject Return')}
                            className="flex items-center justify-center gap-2 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-[0_4px_15px_rgba(225,29,72,0.3)] cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <XCircle size={16} /> ❌ Reject Return
                          </button>
                        </div>
                      ) : (
                        <div className={`flex items-center justify-between px-5 py-4 bg-white/70 border border-white/80 rounded-xl shadow-sm`}>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Return Action Executed</span>
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                            <CheckCircle2 size={14} className="text-emerald-600"/>
                            <span className="text-emerald-700">
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
          <div 
            onClick={() => setPreviewPhotoModal(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-9999 flex flex-col items-center justify-center p-4 md:p-12 animate-in fade-in duration-200 cursor-pointer"
          >
            <button 
              onClick={() => setPreviewPhotoModal(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-white/80 hover:bg-white text-slate-800 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg border border-white/80"
            >
              <X size={20} />
            </button>
            
            <div className="max-w-6xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <img 
                src={previewPhotoModal} 
                alt="Return High-Res Capture" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/60 bg-white/10 p-2" 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AdminAssetReturnsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FCF9F8] flex flex-col items-center justify-center gap-4 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-orange-600"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-600">Loading Return Records...</span>
      </div>
    }>
      <AdminAssetReturnsContent />
    </Suspense>
  );
}