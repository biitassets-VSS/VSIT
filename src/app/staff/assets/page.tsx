'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, Keyboard, Mouse, Headphones, Monitor, Smartphone, Cpu, HardDrive, Package, 
  Loader2, ShieldCheck, AlertTriangle, FileSignature, CheckCircle2, 
  PenTool, X, AlertCircle, Eye, Camera, Send, LogOut, Image as ImageIcon, RefreshCcw, QrCode, ChevronLeft
} from 'lucide-react';

function getNextDueDate(category: string, lastDateString: string | null, createdAtString: string | null) {
  const isLaptop = (category || '').toLowerCase().includes('laptop');
  const intervalMonths = isLaptop ? 1 : 3;

  const getLastSaturday = (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const date = new Date(year, month + 1, 0); 
    while (date.getDay() !== 6) {
      date.setDate(date.getDate() - 1);
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const baseDate = lastDateString ? new Date(lastDateString) : (createdAtString ? new Date(createdAtString) : new Date());
  if (!lastDateString) return getLastSaturday(baseDate);
  const targetMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + intervalMonths, 1);
  return getLastSaturday(targetMonthDate);
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
};

const triggerDesktopAlert = (title: string, body: string) => {
  try { const audio = new Audio('/alert.mp3'); audio.play().catch(() => {}); } catch (err) {}
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo.png' });
  }
};

export default function StaffAssetsPage() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  
  // E-Sign Modal State
  const [signModalAsset, setSignModalAsset] = useState<any>(null);
  const [signatureName, setSignatureName] = useState('');
  const [isSigning, setIsSigning] = useState(false);

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
  const [replaceCondition, setReplaceCondition] = useState('Minor Wear');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchMyAssets();
  }, []);

  const fetchMyAssets = async () => {
    setLoading(true);
    try {
      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { window.location.replace('/'); return; }

      let user: any = {};
      try { user = JSON.parse(sessionStr); } catch (e) { user = { email: sessionStr }; }
      
      const cleanEmail = user.email?.toLowerCase().trim();
      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      
      const empId = profile?.emp_code || profile?.emp_id || 'STAFF';
      const userId = profile?.id || user.id;
      const userName = profile?.full_name || profile?.name || cleanEmail.split('@')[0];
      setCurrentUser({ id: userId, email: cleanEmail, emp_id: empId, name: userName });

      const { data: assetsRes, error } = await supabase
        .from('assets')
        .select('*')
        .or(`assigned_to.eq.${userId},assigned_to.ilike.${cleanEmail},assigned_to.eq.${empId}`);
      
      if (error) throw error;
      
      const { data: inspectionsRes } = await supabase
        .from('inspections')
        .select('asset_id, status, notes, photos, created_at')
        .order('created_at', { ascending: false });

      const compiledAssets = (assetsRes || []).map(asset => {
        const latestInsp = (inspectionsRes || []).find(i => i.asset_id === asset.id);
        return {
          ...asset,
          live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null,
          live_inspection_notes: latestInsp?.notes || null,
          live_inspection_photos: latestInsp?.photos || null
        };
      });

      setAssignedAssets(compiledAssets);
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 Auto-Removal Realtime Sync
  useEffect(() => {
    if (!currentUser?.id) return;
    const realtimeChannel = supabase.channel('staff_assets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets', filter: `assigned_to=eq.${currentUser.id}` }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          if (payload.new.assigned_to === null) {
            setAssignedAssets(current => current.filter(a => a.id !== payload.old.id));
            triggerDesktopAlert('Asset Removed', `Admin has processed and detached an asset from your profile.`);
          } else {
            setAssignedAssets(current => current.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
          }
        } else if (payload.eventType === 'DELETE') {
          setAssignedAssets(current => current.filter(a => a.id !== payload.old.id));
        }
      }).subscribe();
    return () => { supabase.removeChannel(realtimeChannel); };
  }, [currentUser]);

  // 🌟 Realtime Photo Sync (Listens for mobile uploads)
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

  // 📸 Helper: Handle File Uploads (Multiple)
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

  const handleGenerateQR = (asset: any, isReturn: boolean) => {
    // Validate form inputs before generating QR
    if (isReturn && !returnNotes.trim()) return alert("Please provide a return reason.");
    if (!isReturn && !replaceReason.trim()) return alert("Please provide a replacement reason.");

    const requiredPhotos = (asset?.category || '').toLowerCase().includes('laptop') ? 5 : 2;
    const sessionId = crypto.randomUUID();
    setQrSessionId(sessionId);
    
    // Desktop fallback link / mobile link for verification
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

      setAssignedAssets(prev => prev.map(a => a.id === selectedReturnAsset.id ? { ...a, status: 'Return Pending Approval' } : a));
      resetModals();
      triggerDesktopAlert('Return Sent', `Return request for ${selectedReturnAsset.asset_tag} sent to Admin.`);
    } catch (err: any) { alert(err.message); } finally { setIsSubmittingReturn(false); }
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

      setAssignedAssets(prev => prev.map(a => a.id === selectedReplaceAsset.id ? { ...a, status: 'Replacement Requested' } : a));
      resetModals();
      triggerDesktopAlert('Replacement Sent', `Replacement request for ${selectedReplaceAsset.asset_tag} sent to Admin.`);
    } catch (err: any) { alert(err.message); } finally { setIsSubmittingReplace(false); }
  };

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) return alert("Please type your name to sign.");
    setIsSigning(true);
    try {
      const now = new Date().toISOString();
      const { error: assetError } = await supabase.from('assets').update({ inspection_status: 'Approved', last_inspection_date: now, status: 'Assigned' }).eq('id', signModalAsset.id);
      if (assetError) throw assetError;
      const signatureNote = `Digitally Signed Handover Agreement by ${signatureName} on ${new Date().toLocaleString()}`;
      await supabase.from('inspections').insert({ asset_id: signModalAsset.id, inspected_by: currentUser.id || currentUser.emp_id, user_email: currentUser.email, condition: 'Pristine / Flawless', status: 'Approved', notes: signatureNote });
      setAssignedAssets(prev => prev.map(a => a.id === signModalAsset.id ? { ...a, live_inspection_status: 'Approved', live_inspection_date: now, status: 'Assigned', live_inspection_notes: signatureNote } : a));
      setSignModalAsset(null); setSignatureName('');
    } catch (err: any) { alert(err.message); } finally { setIsSigning(false); }
  };

  if (loading) return <div className="min-h-[70vh] flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>;

  // Active Asset Context for Modals
  const activeAsset = selectedReturnAsset || selectedReplaceAsset;
  const isLaptop = (activeAsset?.category || '').toLowerCase().includes('laptop');
  const REQUIRED_PHOTOS = isLaptop ? 5 : 2;
  const currentPhotoCount = remotePhotos.length + localPhotos.length;
  const hasEnoughPhotos = currentPhotoCount >= REQUIRED_PHOTOS;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 space-y-8 animate-in fade-in duration-500 w-full min-h-screen">
        
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <Laptop size={20} className="text-purple-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-widest uppercase">My Hardware Units</h2>
          </div>
          <span className="text-sm font-black text-slate-500">{assignedAssets.length} Total</span>
        </div>

        {assignedAssets.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-200/60 rounded-4xl bg-white/20">
            <h3 className="text-lg font-bold text-slate-700">No Hardware Assigned</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {assignedAssets.map(asset => {
              const currentStatus = (asset.status || 'Assigned').toLowerCase();
              const isReturnPending = currentStatus.includes('return pending');
              const isReplacePending = currentStatus.includes('replacement requested');

              return (
                <div key={asset.id} className="bg-white/20 backdrop-blur-2xl rounded-4xl p-6 sm:p-8 border border-white/40 shadow-sm relative overflow-hidden">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{asset.name || asset.category}</h3>
                    
                    {isReturnPending ? (
                      <span className="px-4 py-2 bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-widest rounded-lg border border-orange-200 shadow-sm">
                        Return Request Sent to Admin - Pending Approval
                      </span>
                    ) : isReplacePending ? (
                      <span className="px-4 py-2 bg-purple-100 text-purple-700 text-xs font-black uppercase tracking-widest rounded-lg border border-purple-200 shadow-sm">
                        Replacement Request Sent - Pending Approval
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-emerald-200">
                        Assigned & Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                    <div className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tag ID</span><span className="font-bold text-sm text-slate-900">{asset.asset_tag || 'N/A'}</span></div>
                    <div className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Serial S/N</span><span className="font-bold text-sm text-slate-900">{asset.serial_number || 'N/A'}</span></div>
                    <div className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Updated</span><span className="font-bold text-sm text-slate-900">{asset.live_inspection_date ? formatDate(new Date(asset.live_inspection_date)) : 'N/A'}</span></div>
                    <div className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Status</span><span className="font-bold text-sm text-slate-900">{asset.status || 'Assigned'}</span></div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-white/40">
                    {(isReturnPending || isReplacePending) ? (
                      <button disabled className="px-6 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest cursor-not-allowed">
                        Waiting on Admin
                      </button>
                    ) : (
                      <>
                        <button onClick={() => { resetModals(); setSelectedReturnAsset(asset); setReturnModalOpen(true); }} className="px-6 py-2.5 rounded-2xl border border-orange-200 text-orange-600 hover:bg-orange-50 text-xs font-bold bg-white/40 cursor-pointer">Return Asset</button>
                        <button onClick={() => { resetModals(); setSelectedReplaceAsset(asset); setReplaceModalOpen(true); }} className="px-6 py-2.5 rounded-2xl border border-purple-200 text-purple-600 hover:bg-purple-50 text-xs font-bold bg-white/40 cursor-pointer">Replace Asset</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 UNIFIED MODAL UI (Return & Replace) EXACT MATCH TO SCREENSHOT */}
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

            {/* STEP 1: FORM VIEW (Matches Screenshot) */}
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
                  <div className="relative">
                    <select 
                      value={returnModalOpen ? returnCondition : replaceCondition} 
                      onChange={(e) => returnModalOpen ? setReturnCondition(e.target.value) : setReplaceCondition(e.target.value)} 
                      className="w-full px-4 py-3.5 bg-white rounded-2xl text-sm font-semibold text-slate-800 shadow-sm outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[#ff7300]/20"
                    >
                      <option value={returnModalOpen ? "Pristine / Flawless" : "Minor Wear"}>{returnModalOpen ? "Pristine / Flawless" : "Minor Hardware Issue"}</option>
                      <option value="Minor Wear">Minor Wear (Scratches/Dents)</option>
                      <option value="Damaged">Damaged / Broken Part</option>
                      <option value="Not Working">Not Working / Won't Power On</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-2 h-2 border-r-2 border-b-2 border-slate-400 rotate-45 transform -translate-y-1"></div>
                    </div>
                  </div>
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
                    className="w-full px-5 py-4 bg-white/70 rounded-2xl text-sm font-semibold text-slate-700 outline-none resize-none h-24 shadow-inner placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#ff7300]/20 border border-transparent" 
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
                    {hasEnoughPhotos ? 'Uploads Complete ✓' : `Waiting for ${REQUIRED_PHOTOS - currentPhotoCount} more photo(s)...`}
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

    </>
  );
}