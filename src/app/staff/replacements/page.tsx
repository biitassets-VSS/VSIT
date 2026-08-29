'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  RefreshCw, Loader2, History, PackageOpen, CheckCircle2, 
  AlertCircle, ArrowRight, Laptop, Wrench, ArrowLeft, 
  Clock, X, Plus, ChevronDown, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function StaffTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [formCondition, setFormCondition] = useState('Minor Wear');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffProfile, setStaffProfile] = useState<any>(null);

  // QR & Upload State
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [remotePhotos, setRemotePhotos] = useState<string[]>([]);
  const [localPhotos, setLocalPhotos] = useState<File[]>([]);

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const activeSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    const isGuest = localStorage.getItem('isGuestSession') === 'true';

    if (!activeSession && !isGuest) {
      window.location.replace('/');
      return;
    }
    
    fetchInitialData();

    const realtimeChannel = supabase
      .channel('staff_replacements_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replacements' }, () => fetchInitialData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => fetchInitialData(false))
      .subscribe();

    return () => { 
      supabase.removeChannel(realtimeChannel); 
      observer.disconnect();
    };
  }, []);

  // Listen for mobile photo uploads via WebSockets
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

  const fetchInitialData = async (showLoadingScreen = true) => {
    if (showLoadingScreen) setLoading(true);
    else setIsRefreshing(true);

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user') || '';
      let email = '';
      try { email = JSON.parse(sessionStr).email; } catch (e) { email = sessionStr; }
      const cleanEmail = email.toLowerCase().trim();

      if (isGuest) {
        setIsAuthorized(true);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, name, email, emp_code, emp_id')
        .eq('email', cleanEmail)
        .single();
      
      if (profile) {
        setStaffProfile(profile);

        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .eq('assigned_to', profile.id)
          .not('status', 'ilike', '%Return%');
        
        setMyAssets(assets || []);
      }

      const { data: repls, error } = await supabase
        .from('replacements')
        .select('*')
        .ilike('user_email', cleanEmail)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') { 
        console.error(error); 
      } else {
        setReplacements(repls || []);
      }
      
      setIsAuthorized(true);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const uploadMultiplePhotos = async (files: File[]) => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from('asset-photos').upload(fileName, file);
        if (!error) {
          const { data } = supabase.storage.from('asset-photos').getPublicUrl(fileName);
          uploadedUrls.push(data.publicUrl);
        }
      } catch (error) { console.error("Upload failed", error); }
    }
    return uploadedUrls;
  };

  const handleGenerateQR = (asset: any) => {
    if (!asset || !reason.trim()) {
      toast.error("Please select an asset and provide a reason.");
      return;
    }

    const requiredPhotos = (asset?.category || '').toLowerCase().includes('laptop') ? 5 : 2;
    const sessionId = crypto.randomUUID();
    setQrSessionId(sessionId);
    
    const uploadLink = `${window.location.origin}/mobile-audit?session=${sessionId}&assetId=${asset.id}&req=${requiredPhotos}&name=${encodeURIComponent(staffProfile?.name || staffProfile?.full_name || 'Staff')}&empCode=${encodeURIComponent(staffProfile?.emp_code || staffProfile?.emp_id || 'EMP')}&cat=${encodeURIComponent(asset.category)}`;
    
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uploadLink)}&color=0f172a&bgcolor=ffffff`);
  };

  const handleRequestSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!selectedAssetId || !reason.trim()) {
      toast.error("Please ensure asset and reason are provided.");
      return;
    }

    const asset = myAssets.find(a => String(a.id) === selectedAssetId);
    if (!asset) return;

    // 🌟 STRICT RECONFIRMATION ALERT
    const confirmed = window.confirm(
      `RECONFIRM REPLACEMENT:\n\nAre you sure you want to request a replacement for:\nAsset: ${asset.name || asset.asset_name}\nTag ID: ${asset.asset_tag}\n\nThis will immediately alert IT logistics to prepare a replacement.`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const newUrls = await uploadMultiplePhotos(localPhotos);
      const allPhotos = [...remotePhotos, ...newUrls];

      // 1. Insert directly into the dedicated replacements table
      const { error: insertError } = await supabase.from('replacements').insert([{
        old_asset_id: asset.id,
        asset_tag: asset.asset_tag,
        serial_number: asset.serial_number,
        user_id: staffProfile?.id,
        staff_name: staffProfile?.full_name || staffProfile?.name || 'Staff Member',
        user_email: staffProfile?.email,
        emp_code: staffProfile?.emp_code || staffProfile?.emp_id || 'STAFF',
        condition: formCondition,
        reason: reason,
        photos: allPhotos.length > 0 ? allPhotos : null,
        status: 'Pending Approval'
      }]);

      if (insertError) throw insertError;

      // 2. Update Assets Table & Clear Overdue Timers
      const { error: updateError } = await supabase.from('assets').update({ 
        status: 'Replacement Requested',
        inspection_status: 'Pending Review', 
        last_inspection_date: new Date().toISOString(), 
        admin_remarks: null
      }).eq('id', asset.id);

      if (updateError) throw updateError;

      // 3. Notify Admins
      await supabase.from('notifications').insert({
        target_role: 'admin',
        title: '🔄 Replacement Request',
        message: `${staffProfile?.full_name || staffProfile?.name} requested a hardware replacement for ${asset.asset_tag}.`,
        type: 'warning',
        is_read: false
      });

      toast.success("Replacement request successfully transmitted.");
      setShowModal(false);
      setReason('');
      setSelectedAssetId('');
      setQrUrl(null);
      setRemotePhotos([]);
      setLocalPhotos([]);
      fetchInitialData(true);
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#101216]' : 'bg-linear-to-br from-[#fef6f0] via-[#fcefe6] to-[#f7e4d8]', 
    textMain: isDarkMode ? 'text-zinc-100' : 'text-[#0f172a]',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-[#64748b]',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/60 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/70 backdrop-blur-3xl backdrop-saturate-[1.8] border border-white/80 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9),0_12px_32px_rgba(230,210,200,0.35)]', 
    glassInnerCard: isDarkMode 
      ? 'bg-black/40 backdrop-blur-xl border border-white/10' 
      : 'bg-white/60 backdrop-blur-2xl border border-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_8px_rgba(0,0,0,0.02)]', 
    glassButton: isDarkMode
      ? 'bg-zinc-800/80 backdrop-blur-xl border border-white/10 hover:bg-zinc-700 transition-all text-white'
      : 'bg-white/80 backdrop-blur-2xl border border-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_4px_12px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_6px_16px_rgba(0,0,0,0.05)] transition-all text-[#0f172a]',
  };

  if (!isAuthorized && !loading) return null;

  const activeAsset = myAssets.find(a => String(a.id) === selectedAssetId);
  const isLaptopObj = (activeAsset?.category || '').toLowerCase().includes('laptop');
  const REQUIRED_PHOTOS = isLaptopObj ? 5 : 2;
  const currentPhotoCount = remotePhotos.length + localPhotos.length;
  const hasEnoughPhotos = currentPhotoCount >= REQUIRED_PHOTOS;

  return (
    <div className={`min-h-screen ${theme.bg} p-4 sm:p-6 lg:p-8 font-sans relative z-10 transition-colors duration-1000 pb-32`}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className={`${theme.glassCard} rounded-[2.5rem] p-5 sm:p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
          <div className="flex items-center gap-5 z-10">
            <button onClick={() => router.push('/staff')} className={`w-12 h-12 flex items-center justify-center rounded-[1.25rem] transition-all hover:scale-105 cursor-pointer ${theme.glassButton}`}>
              <ArrowLeft size={20} className={theme.textSub} />
            </button>
            <div>
              <h1 className={`text-[22px] sm:text-[26px] font-black tracking-tight flex items-center gap-2.5 ${theme.textMain}`}>
                <History className="text-[#a855f7]" size={26} strokeWidth={2.5} /> Replacement Log
              </h1>
              <p className={`text-[13px] font-semibold mt-0.5 ${theme.textSub}`}>
                Track your faulty hardware reports and request new replacements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto z-10">
            <button 
              onClick={() => fetchInitialData(false)} 
              disabled={loading || isRefreshing}
              className={`w-12 h-12 flex items-center justify-center rounded-[1.25rem] transition-all active:scale-95 cursor-pointer ${theme.glassButton} disabled:opacity-50`}
            >
              <RefreshCw size={18} className={(loading || isRefreshing) ? 'animate-spin text-[#a855f7]' : theme.textSub} /> 
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-linear-to-r from-[#b388ff] to-[#9955ff] hover:opacity-90 text-white rounded-[1.25rem] text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-[0_4px_15px_rgba(168,85,247,0.35)] active:scale-95"
            >
              <Plus size={16} /> New Request
            </button>
          </div>
        </div>

        {/* CONTENT CONTAINER */}
        {loading ? (
          <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#b388ff]"></div>
            <span className={`text-[11px] font-bold tracking-widest uppercase ${theme.textSub}`}>Fetching Records...</span>
          </div>
        ) : replacements.length === 0 ? (
          <div className={`w-full py-24 rounded-[2.5rem] text-center space-y-3 ${theme.glassCard}`}>
            <PackageOpen size={48} className={`mx-auto opacity-50 ${isDarkMode ? 'text-purple-400' : 'text-[#b388ff]'}`} />
            <h3 className={`text-[15px] font-bold uppercase tracking-widest ${theme.textMain}`}>No Replacements Requested</h3>
            <p className={`text-[13px] font-medium ${theme.textSub}`}>Your hardware replacement history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {replacements.map(record => {
              const status = (record.status || '').toLowerCase().trim();
              const adminNote = record.admin_remarks || record.admin_notes || record.resolution_notes || null;
              
              const isResolved = status === 'approved' || status === 'replaced' || status === 'resolved' || status === 'closed';
              const isRejected = status === 'rejected' || status === 'declined';
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={record.id} 
                  className={`${theme.glassCard} rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden flex flex-col`}
                >
                  <div className={`absolute top-0 right-0 w-48 h-48 blur-[60px] -z-10 rounded-full opacity-10 transition-opacity duration-500 pointer-events-none ${isResolved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'}`} />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className={`text-[19px] font-black tracking-tight flex items-center gap-3 ${theme.textMain}`}>
                      <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-white/80 ${isDarkMode ? 'bg-zinc-800 text-purple-400' : 'bg-white/80 backdrop-blur-xl text-[#a855f7] shadow-sm'}`}>
                        <Wrench size={20} strokeWidth={2.5} />
                      </div>
                      <span className="line-clamp-1">{record.title || `Hardware Swap: ${record.asset_tag}`}</span>
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 ${theme.glassInnerCard} ${theme.textSub}`}>
                        <Clock size={14} /> {new Date(record.created_at).toLocaleDateString('en-GB')}
                      </span>
                      <span className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shrink-0 ${
                        isResolved ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#e0faee]/80 backdrop-blur-md text-[#0f824d] border-[#b0ebd1]') : 
                        isRejected ? (isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-[#ffe4e6]/80 backdrop-blur-md text-[#e11d48] border-[#fecdd3]') : 
                        (isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-[#fff5eb]/80 backdrop-blur-md text-[#c96c14] border-[#ffe0c2]')
                      }`}>
                        {record.status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    
                    {/* LEFT: FAULTY ASSET */}
                    <div className={`flex-1 rounded-3xl p-5 sm:p-6 relative overflow-hidden ${theme.glassInnerCard}`}>
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#fb7185]"></div>
                      <h4 className={`text-[11px] font-black uppercase tracking-widest mb-5 flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-[#e11d48]'}`}>
                        <AlertCircle size={16}/> Original Faulty Hardware
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-4 rounded-[1.25rem] ${isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-white/50 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${theme.textSub}`}>Tag ID</span>
                            <span className={`text-[13px] font-bold ${theme.textMain} wrap-break-word`}>{record.asset_tag}</span>
                          </div>
                          <div className={`p-4 rounded-[1.25rem] ${isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-white/50 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${theme.textSub}`}>Serial (S/N)</span>
                            <span className={`text-[13px] font-mono font-bold ${theme.textMain} wrap-break-word`}>{record.serial_number || 'N/A'}</span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-[1.25rem] flex flex-col gap-1.5 ${isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-white/50 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Reason for Request</span>
                          <p className={`text-[13px] font-semibold leading-relaxed ${theme.textMain}`}>{record.reason || record.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`hidden lg:flex flex-col justify-center items-center px-2 ${theme.textSub}`}>
                      <ArrowRight size={28} />
                    </div>

                    {/* RIGHT: ADMIN RESOLUTION & NEW ASSET */}
                    <div className={`flex-1 rounded-3xl p-5 sm:p-6 relative overflow-hidden transition-all ${theme.glassInnerCard}`}>
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${isResolved ? 'bg-[#34d399]' : isRejected ? 'bg-[#fb7185]' : 'bg-[#fb923c]'}`}></div>
                      
                      <h4 className={`text-[11px] font-black uppercase tracking-widest mb-5 flex items-center gap-2 ${
                        isResolved ? (isDarkMode ? 'text-emerald-400' : 'text-[#059669]') : 
                        isRejected ? (isDarkMode ? 'text-rose-400' : 'text-[#e11d48]') : 
                        (isDarkMode ? 'text-amber-400' : 'text-[#ea580c]')
                      }`}>
                        {isResolved ? <CheckCircle2 size={16}/> : isRejected ? <X size={16}/> : <RefreshCw size={16} className="animate-spin"/>} 
                        {isResolved ? 'Admin Resolution & New Asset' : isRejected ? 'Request Denied' : 'Pending IT Logistics Approval'}
                      </h4>
                      
                      {(isResolved || isRejected || adminNote) ? (
                        <div className="space-y-3 h-full">
                          <div className={`p-5 rounded-[1.25rem] h-full flex flex-col ${isDarkMode ? 'bg-black/40 border border-white/5' : 'bg-white/50 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${
                              isResolved ? (isDarkMode ? 'text-emerald-500' : 'text-[#059669]') : 
                              isRejected ? (isDarkMode ? 'text-rose-500' : 'text-[#e11d48]') : theme.textSub
                            }`}>
                              Official IT Admin Remarks:
                            </span>
                            <p className={`text-[13px] font-semibold leading-relaxed whitespace-pre-wrap ${theme.textMain}`}>
                              {adminNote || (isResolved ? 'Request approved. New asset details should be available in your dashboard.' : 'Request rejected. No additional notes provided.')}
                            </p>
                            
                            {isResolved && (
                              <div className={`mt-auto pt-4 border-t flex items-start gap-3 ${isDarkMode ? 'border-emerald-900/50' : 'border-[#b0ebd1]/40'}`}>
                                <div className={`p-2 rounded-lg shrink-0 ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#e0faee]/80 text-[#0f824d]'}`}>
                                  <Laptop size={16} />
                                </div>
                                <p className={`text-xs font-bold leading-snug ${theme.textSub}`}>
                                  Your new hardware has been successfully linked to your profile.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-37.5 flex flex-col items-center justify-center text-center">
                          <div className={`p-4 rounded-full mb-3 ${isDarkMode ? 'bg-black/40' : 'bg-white/60 backdrop-blur-md'}`}>
                            <PackageOpen size={24} className="opacity-40"/>
                          </div>
                          <p className={`text-[13px] font-semibold max-w-62.5 leading-relaxed ${theme.textSub}`}>
                            IT Admin is currently reviewing your request to process a hardware replacement.
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🌟 REPLACEMENT REQUEST MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className={`absolute inset-0 ${isDarkMode ? 'bg-black/40' : 'bg-slate-900/20'} backdrop-blur-md`}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-[30rem] rounded-[2.5rem] flex flex-col overflow-hidden ${theme.glassCard}`}
            >
              {/* Header */}
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
                  onClick={() => setShowModal(false)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 ${theme.glassButton}`}
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-white/60'}`} />

              {!qrUrl ? (
                <div className="px-8 pt-6 pb-6 flex flex-col gap-6 relative z-10">
                  <div className="flex flex-col gap-2.5">
                    <label className={`text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                      Select Assigned Asset
                    </label>
                    <div className={`relative rounded-2xl overflow-hidden flex items-center pr-5 transition-all ${theme.glassInnerCard}`}>
                      <select
                        value={selectedAssetId}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                        required
                        className={`w-full pl-5 pr-10 py-4.5 text-[15px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}
                      >
                        <option value="" disabled className={isDarkMode ? 'text-black' : ''}>Choose Hardware...</option>
                        {myAssets.map(asset => (
                          <option key={asset.id} value={asset.id} className={isDarkMode ? 'text-black' : ''}>
                            {asset.name || asset.asset_name} ({asset.asset_tag})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={20} className={`absolute right-5 pointer-events-none ${theme.textSub}`} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedAssetId && (
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
                              {activeAsset?.asset_tag}
                            </span>
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <span className={`text-[10px] font-black uppercase tracking-widest block ${theme.textSub}`}>Serial Number</span>
                            <span className={`text-[13px] font-bold ${theme.textMain}`}>
                              {activeAsset?.serial_number || 'N/A'}
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
                        value={formCondition}
                        onChange={(e) => setFormCondition(e.target.value)}
                        className={`w-full pl-5 pr-10 py-4.5 text-[15px] font-semibold transition-all outline-none cursor-pointer appearance-none bg-transparent ${theme.textMain}`}
                      >
                        <option value="Minor Wear" className={isDarkMode ? 'text-black' : ''}>Minor Hardware Issue</option>
                        <option value="Damaged" className={isDarkMode ? 'text-black' : ''}>Damaged / Broken Part</option>
                        <option value="Not Working" className={isDarkMode ? 'text-black' : ''}>Not Working / Won't Power On</option>
                      </select>
                      <ChevronDown size={20} className={`absolute right-5 pointer-events-none ${theme.textSub}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <label className={`text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                      Detailed Explanation
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                      placeholder="Describe what happened..."
                      className={`w-full px-6 py-5 rounded-2xl text-[14px] font-medium transition-all outline-none min-h-[8.75rem] resize-none ${theme.glassInnerCard} ${
                        isDarkMode ? 'placeholder-zinc-500 text-white' : 'placeholder-[#818b9c] text-[#0f172a]'
                      }`}
                    />
                  </div>

                  <div className="flex justify-center items-center gap-4 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className={`w-[8.75rem] py-3.5 rounded-[1.25rem] text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}>
                      Cancel
                    </button>
                    <button type="button" onClick={() => handleGenerateQR(activeAsset)} disabled={!selectedAssetId || !reason.trim()} className="w-[8.75rem] py-3.5 bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(139,92,246,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95">
                      Generate QR
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-5 sm:px-6 sm:py-6 space-y-5 flex flex-col animate-in slide-in-from-right-4">
                  <div className={`rounded-2xl p-6 shadow-sm border flex flex-col items-center text-center ${theme.glassInnerCard} ${isDarkMode ? 'border-white/10' : 'border-white/80'}`}>
                    <h4 className={`text-sm font-black uppercase tracking-widest mb-1 ${theme.textMain}`}>Scan to Upload Photos</h4>
                    <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-5 ${theme.textSub}`}>
                      {isLaptopObj ? 'Laptop: Requires 5 Photos' : 'Accessory: Requires 2 Photos'}
                    </p>
                    
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mb-5">
                      <img src={qrUrl} alt="Upload QR Code" className="w-40 h-40 sm:w-48 sm:h-48 object-contain" />
                    </div>
                    
                    <div className="w-full bg-slate-200/50 rounded-full h-2 mb-2 overflow-hidden border border-slate-300/30">
                      <div 
                        className={`h-full transition-all duration-500 bg-purple-500`} 
                        style={{ width: `${Math.min((currentPhotoCount / REQUIRED_PHOTOS) * 100, 100)}%` }} 
                      />
                    </div>
                    
                    <p className={`text-[11px] sm:text-xs font-bold ${hasEnoughPhotos ? 'text-emerald-500' : 'text-purple-500 animate-pulse'}`}>
                      {hasEnoughPhotos ? 'Uploads Complete ✓' : `Waiting for ${REQUIRED_PHOTOS - currentPhotoCount} more photo(s)...`}
                    </p>

                    <div className={`mt-5 pt-5 border-t w-full ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                      <label className={`text-[9px] sm:text-[10px] font-bold hover:underline cursor-pointer uppercase tracking-widest transition-colors ${theme.textSub}`}>
                        Or upload directly from computer
                        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files) setLocalPhotos([...localPhotos, ...Array.from(e.target.files)]);
                        }} />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setQrUrl(null)} className={`w-12 h-12 flex items-center justify-center rounded-xl shadow-sm cursor-pointer shrink-0 transition-colors hover:scale-105 active:scale-95 ${theme.glassButton}`}>
                      <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    {/* 🌟 ATTACHED DIRECT ONCLICK TO A DIV TO ENSURE IT ALWAYS FIRES */}
                    <div 
                      onClick={() => {
                        if (hasEnoughPhotos && !isSubmitting) handleRequestSubmit();
                      }} 
                      className={`flex-1 h-12 rounded-xl text-[10px] sm:text-[11px] font-black text-white uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${(!hasEnoughPhotos || isSubmitting) ? 'opacity-50 cursor-not-allowed bg-purple-600/50' : 'bg-purple-600 hover:bg-purple-700 hover:scale-[1.02] active:scale-95'}`}
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Request'}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}