'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  RefreshCw, Loader2, History, PackageOpen, CheckCircle2, 
  AlertCircle, ArrowRight, Laptop, Wrench, ArrowLeft, 
  Clock, X, Plus, ChevronDown
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffProfile, setStaffProfile] = useState<any>(null);

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

    // 🌟 REAL-TIME SYNC FOR REPLACEMENTS & ASSETS
    const realtimeChannel = supabase
      .channel('staff_replacements_sync')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'replacements' }, 
        () => fetchInitialData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        () => fetchInitialData(false)
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(realtimeChannel); 
      observer.disconnect();
    };
  }, []);

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

      // 1. Fetch Staff Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, name, email, emp_code, emp_id')
        .eq('email', cleanEmail)
        .single();
      
      if (profile) {
        setStaffProfile(profile);

        // 2. Fetch Assigned Assets
        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .eq('assigned_to', profile.id)
          .not('status', 'ilike', '%Return%');
        
        setMyAssets(assets || []);
      }

      // 3. Fetch Replacement Requests (Querying the proper table to avoid mixing with Helpdesk Tickets)
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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !reason.trim()) return;

    const asset = myAssets.find(a => String(a.id) === selectedAssetId);
    if (!asset) return;

    // 🌟 STRICT RECONFIRMATION ALERT
    const confirmed = window.confirm(
      `RECONFIRM REPLACEMENT:\n\nAre you sure you want to request a replacement for:\nAsset: ${asset.name || asset.asset_name}\nTag ID: ${asset.asset_tag}\nSerial: ${asset.serial_number || 'N/A'}\n\nThis will immediately alert IT logistics to prepare a replacement.`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      // 1. Insert directly into the dedicated replacements table
      const { error: insertError } = await supabase.from('replacements').insert([{
        old_asset_id: asset.id,
        asset_tag: asset.asset_tag,
        serial_number: asset.serial_number,
        user_id: staffProfile?.id,
        staff_name: staffProfile?.full_name || staffProfile?.name || 'Staff Member',
        user_email: staffProfile?.email,
        emp_code: staffProfile?.emp_code || staffProfile?.emp_id || 'STAFF',
        condition: 'Hardware Failure',
        reason: reason,
        status: 'Pending Approval'
      }]);

      if (insertError) throw insertError;

      // 2. Update Assets Table & Clear Overdue Timers so the Admin Inspections page ignores it
      const { error: updateError } = await supabase.from('assets').update({ 
        status: 'Replacement Requested',
        inspection_status: 'Approved', // Resetting this clears the "overdue/pending" logic in inspections
        last_inspection_date: new Date().toISOString(), // Resets the overdue clock
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

      setShowModal(false);
      setReason('');
      setSelectedAssetId('');
      fetchInitialData(true);
      toast.success("Replacement request successfully transmitted.");
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 2026 MACOS PURE LIQUID GLASS SYSTEM THEME
  const theme = {
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    
    glassCard: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/20 backdrop-blur-3xl border border-white/40 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]',
    
    glassInnerCard: isDarkMode 
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-xl border border-white/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    
    glassItem: isDarkMode
      ? 'bg-white/5 backdrop-blur-2xl border border-white/10 transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
      : 'bg-white/30 backdrop-blur-2xl border border-white/50 shadow-[0_4px_16px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300',
      
    glassButton: isDarkMode
      ? 'bg-white/5 backdrop-blur-xl border border-white/10 text-zinc-300 hover:bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all'
      : 'bg-white/40 backdrop-blur-xl border border-white/60 text-slate-700 hover:bg-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.02)] transition-all',
  };

  if (!isAuthorized && !loading) return null;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-transparent'} p-4 sm:p-6 lg:p-8 font-sans relative z-10 transition-colors duration-1000 pb-32`}>
      
      {/* 🌟 Premium Background Orbs */}
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <div className={`${theme.glassCard} rounded-[2.5rem] p-5 sm:p-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
          <div className="flex items-center gap-5 z-10">
            <button onClick={() => router.push('/staff')} className={`w-12 h-12 flex items-center justify-center rounded-[1.25rem] transition-all hover:scale-105 cursor-pointer ${theme.glassButton}`}>
              <ArrowLeft size={20} className={theme.textSub} />
            </button>
            <div>
              <h1 className={`text-[20px] sm:text-[24px] font-bold tracking-tight flex items-center gap-2.5 ${theme.textMain}`}>
                <History className="text-[#a855f7]" size={24} strokeWidth={2.5} /> Replacement Log
              </h1>
              <p className={`text-[12px] font-medium mt-1 ${theme.textSub}`}>
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
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-[1.25rem] text-[12px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-[0_4px_15px_rgba(168,85,247,0.35)] active:scale-95"
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
                  <div className={`absolute top-0 right-0 w-48 h-48 blur-[60px] -z-10 rounded-full opacity-20 transition-opacity duration-500 pointer-events-none ${isResolved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'}`} />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className={`text-[19px] font-bold tracking-tight flex items-center gap-3 ${theme.textMain}`}>
                      <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 ${theme.glassInnerCard} text-purple-500`}>
                        <Wrench size={20} strokeWidth={2.5} />
                      </div>
                      <span className="line-clamp-1">Hardware Swap: {record.asset_tag}</span>
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 ${theme.glassInnerCard} ${theme.textSub}`}>
                        <Clock size={14} /> {new Date(record.created_at).toLocaleDateString('en-GB')}
                      </span>
                      <span className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border shrink-0 ${
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
                      <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-5 flex items-center gap-2 ${isDarkMode ? 'text-rose-400' : 'text-[#e11d48]'}`}>
                        <AlertCircle size={16}/> Original Faulty Hardware
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-4 rounded-[1.25rem] ${theme.glassItem}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>Tag ID</span>
                            <span className={`text-[13px] font-bold ${theme.textMain} wrap-break-word`}>{record.asset_tag}</span>
                          </div>
                          <div className={`p-4 rounded-[1.25rem] ${theme.glassItem}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${theme.textSub}`}>Serial (S/N)</span>
                            <span className={`text-[13px] font-mono font-bold ${theme.textMain} wrap-break-word`}>{record.serial_number || 'N/A'}</span>
                          </div>
                        </div>
                        <div className={`p-4 rounded-[1.25rem] flex flex-col gap-1.5 ${theme.glassItem}`}>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Reason for Request</span>
                          <p className={`text-[13px] font-medium leading-relaxed ${theme.textMain}`}>{record.reason || record.description || 'No reason provided.'}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`hidden lg:flex flex-col justify-center items-center px-2 ${theme.textSub}`}>
                      <ArrowRight size={28} />
                    </div>

                    {/* RIGHT: ADMIN RESOLUTION & NEW ASSET */}
                    <div className={`flex-1 rounded-3xl p-5 sm:p-6 relative overflow-hidden transition-all ${theme.glassInnerCard}`}>
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${isResolved ? 'bg-[#34d399]' : isRejected ? 'bg-[#fb7185]' : 'bg-[#fb923c]'}`}></div>
                      
                      <h4 className={`text-[11px] font-bold uppercase tracking-widest mb-5 flex items-center gap-2 ${
                        isResolved ? (isDarkMode ? 'text-emerald-400' : 'text-[#059669]') : 
                        isRejected ? (isDarkMode ? 'text-rose-400' : 'text-[#e11d48]') : 
                        (isDarkMode ? 'text-amber-400' : 'text-[#ea580c]')
                      }`}>
                        {isResolved ? <CheckCircle2 size={16}/> : isRejected ? <X size={16}/> : <RefreshCw size={16} className="animate-spin"/>} 
                        {isResolved ? 'Admin Resolution & New Asset' : isRejected ? 'Request Denied' : 'Pending IT Logistics Approval'}
                      </h4>
                      
                      {(isResolved || isRejected || adminNote) ? (
                        <div className="space-y-3 h-full">
                          <div className={`p-5 rounded-[1.25rem] h-full flex flex-col ${theme.glassItem}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${
                              isResolved ? (isDarkMode ? 'text-emerald-500' : 'text-[#059669]') : 
                              isRejected ? (isDarkMode ? 'text-rose-500' : 'text-[#e11d48]') : theme.textSub
                            }`}>
                              Official IT Admin Remarks:
                            </span>
                            <p className={`text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${theme.textMain}`}>
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
                          <div className={`p-4 rounded-full mb-3 ${theme.glassItem}`}>
                            <PackageOpen size={24} className={theme.textSub}/>
                          </div>
                          <p className={`text-[13px] font-medium max-w-62.5 leading-relaxed ${theme.textSub}`}>
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

      {/* 🌟 2026 MACOS PURE LIQUID GLASS REPLACEMENT REQUEST MODAL */}
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
                  <h2 className={`text-[16px] font-bold uppercase tracking-widest ${theme.textMain}`}>
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

              <form id="replacement-form" onSubmit={handleRequestSubmit} className="px-8 pt-6 pb-6 flex flex-col gap-6 relative z-10">
                
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
                          <span className={`text-[10px] font-bold uppercase tracking-widest block ${theme.textSub}`}>Tag ID</span>
                          <span className={`text-[13px] font-bold ${theme.textMain}`}>
                            {myAssets.find(a => String(a.id) === selectedAssetId)?.asset_tag}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-widest block ${theme.textSub}`}>Serial Number</span>
                          <span className={`text-[13px] font-bold ${theme.textMain}`}>
                            {myAssets.find(a => String(a.id) === selectedAssetId)?.serial_number || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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

              </form>

              <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-white/60'}`} />

              {/* Footer Buttons */}
              <div className="px-8 py-7 flex justify-center items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`w-[8.75rem] py-3.5 rounded-[1.25rem] text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${theme.glassButton}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="replacement-form"
                  disabled={isSubmitting || !selectedAssetId || !reason.trim()}
                  className="w-[8.75rem] py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-[1.25rem] text-[11px] font-bold uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(168,85,247,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Transmit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}