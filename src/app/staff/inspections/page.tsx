'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Laptop, Camera, Clock, AlertTriangle, 
  CheckCircle2, XCircle, RefreshCw, Info, Calendar, Monitor, ShieldCheck,
  Image as ImageIcon, Eye, X
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

function StaffInspectionsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    loadMyInspections();

    return () => observer.disconnect();
  }, []);

  const loadMyInspections = async () => {
    try {
      const rawSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!rawSession) {
        router.push('/');
        return;
      }
      
      const sessionData = JSON.parse(rawSession);
      const userEmail = sessionData.email;

      // 1. Fetch Staff Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, name, emp_code')
        .eq('email', userEmail)
        .single();

      if (!profile) throw new Error("Profile not found.");
      setStaffProfile(profile);

      // 2. Fetch Assets Assigned to this Staff
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('assigned_to', profile.id)
        .not('status', 'ilike', '%Return%');

      if (!assets) {
        setMyAssets([]);
        setLoading(false);
        return;
      }

      // 3. Fetch latest inspection logs for these assets
      const assetIds = assets.map(a => a.id);
      const { data: inspections } = await supabase
        .from('inspections')
        .select('*')
        .in('asset_id', assetIds)
        .order('created_at', { ascending: false });

      const compiledAssets = assets.map(asset => {
        // Find the most recent inspection for this specific asset
        const latestInsp = (inspections || []).find(i => String(i.asset_id) === String(asset.id));
        
        // 🟢 FIX: Define what constitutes a "System Log" (Admin assignments, configs, handovers)
        const isSystemLog = latestInsp && (
          String(latestInsp.notes || '').toLowerCase().includes('admin') ||
          String(latestInsp.notes || '').toLowerCase().includes('asset configuration') ||
          String(latestInsp.notes || '').toLowerCase().includes('handover') ||
          String(latestInsp.status || '').toLowerCase() === 'assigned' ||
          String(latestInsp.status || '').toLowerCase() === 'stock intake'
        );

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

        const assetInspStatus = String(asset.inspection_status || '').toLowerCase();
        
        // 🟢 FIX: Prevent "Ghost" Pending states from tricking the UI
        let currentStatus = 'Action Required';
        
        if (latestInsp && !isSystemLog) {
           currentStatus = latestInsp.status; // Use real user submission status
        } else if (assetInspStatus && assetInspStatus !== 'pending') {
           currentStatus = asset.inspection_status; // Use explicit asset states (e.g. Assigned, Overdue)
        } else if (isSystemLog && String(latestInsp.status).toLowerCase() === 'assigned') {
           currentStatus = 'Assigned';
        }

        if (isOverdue && !String(currentStatus).toLowerCase().includes('pending') && !String(currentStatus).toLowerCase().includes('re-inspection')) {
          currentStatus = 'Overdue';
        }

        return {
          ...asset,
          latest_inspection: latestInsp,
          computed_status: currentStatus,
          is_system_log: !!isSystemLog,
          is_overdue: isOverdue,
          next_due: nextDue
        };
      });

      setMyAssets(compiledAssets);
    } catch (error) {
      console.error("Error loading staff inspections:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 PREMIUM 2026 LIQUID GLASS THEME
  const theme = {
    bg: 'bg-transparent',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.15)] hover:border-white/20 transition-all duration-500' 
      : 'bg-white/40 backdrop-blur-2xl backdrop-saturate-[1.5] border border-white/60 shadow-[0_16px_40px_rgba(31,38,135,0.05)] shadow-[inset_0_0_4px_2px_rgba(255,255,255,0.8)] hover:border-white/80 transition-all duration-500',
    glassInnerCard: isDarkMode 
      ? 'bg-black/20 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/50 backdrop-blur-xl border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)]',
    glassButton: isDarkMode
      ? 'bg-zinc-800/50 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-zinc-700/50 transition-all text-white'
      : 'bg-white/60 backdrop-blur-xl border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] hover:bg-white/90 transition-all text-slate-800',
  };

  if (loading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
        <span className={`text-xs font-bold tracking-widest uppercase ${theme.textSub}`}>Loading Your Assets...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} p-4 sm:p-6 lg:p-8 font-sans relative z-10 transition-colors duration-1000`}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className={`${theme.glassCard} rounded-4xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:scale-105 cursor-pointer ${theme.glassInnerCard} ${theme.textMain}`}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${theme.textMain}`}>
                <Camera className="text-purple-500" size={24} /> My Inspections
              </h1>
              <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Submit visual audits for your assigned hardware to maintain compliance.</p>
            </div>
          </div>
          <button onClick={loadMyInspections} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-sm ${theme.glassButton} active:scale-95`}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* ASSET LIST */}
        {myAssets.length === 0 ? (
          <div className={`w-full py-24 rounded-4xl text-center space-y-3 ${theme.glassCard}`}>
            <ShieldCheck size={48} className={`mx-auto opacity-50 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <h3 className={`text-base font-bold uppercase tracking-widest ${theme.textMain}`}>No Hardware Assigned</h3>
            <p className={`text-xs font-semibold ${theme.textSub}`}>You currently have no active assets requiring inspection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {myAssets.map((asset, index) => {
                const latestInsp = asset.latest_inspection;
                const isSystemLog = asset.is_system_log;
                const photosArray = latestInsp?.photos || [];

                const status = String(asset.computed_status || 'Action Required').toLowerCase();
                const isOverdue = asset.is_overdue || status === 'overdue';
                const isReInspect = status === 're-inspection';
                const isRejected = status === 'rejected' || status === 'fail';
                const isApproved = status === 'approved' || status === 'pass';
                
                // 🟢 FIX: A submission is ONLY "Pending Review" if it is a REAL user submission (Not a system log)
                const isPendingReview = (status.includes('pending') || status.includes('review')) && latestInsp && !isSystemLog;

                // Determine styling based on current state
                let statusColor = 'text-slate-500';
                let statusBg = isDarkMode ? 'bg-slate-500/10 border-slate-500/20' : 'bg-slate-50 border-slate-200';
                let StatusIcon = Clock;
                let cardGlow = '';
                let displayStatus = 'Action Required';

                if (isApproved) {
                  statusColor = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
                  statusBg = isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200';
                  StatusIcon = CheckCircle2;
                  cardGlow = 'hover:border-emerald-400/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]';
                  displayStatus = 'Asset Compliance Up To Date';
                } else if (isOverdue) {
                  statusColor = isDarkMode ? 'text-rose-400' : 'text-rose-600';
                  statusBg = isDarkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200';
                  StatusIcon = AlertTriangle;
                  cardGlow = 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/30';
                  displayStatus = 'Overdue';
                } else if (isReInspect || isRejected) {
                  statusColor = isDarkMode ? 'text-orange-400' : 'text-orange-600';
                  statusBg = isDarkMode ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200';
                  StatusIcon = RefreshCw;
                  cardGlow = 'border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)] ring-1 ring-orange-500/30';
                  displayStatus = isReInspect ? 'Re-Inspection Required' : 'Rejected';
                } else if (isPendingReview) {
                  statusColor = isDarkMode ? 'text-blue-400' : 'text-blue-600';
                  statusBg = isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200';
                  StatusIcon = Clock;
                  cardGlow = 'hover:border-blue-400/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]';
                  displayStatus = 'Review in Progress';
                } else {
                  displayStatus = isSystemLog ? 'Assigned' : 'Action Required';
                }

                // 🟢 FIX: Show the camera button if the user needs to act (which is any time it isn't approved AND isn't actively pending review)
                const needsAction = !isApproved && !isPendingReview;

                return (
                  <motion.div 
                    key={asset.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${theme.glassCard} rounded-4xl p-6 sm:p-8 ${cardGlow}`}
                  >
                    <div className="flex flex-col lg:flex-row gap-8">
                      
                      {/* ASSET INFO (LEFT) */}
                      <div className="w-full lg:w-1/3 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-white/20 pb-6 lg:pb-0 lg:pr-8">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${theme.glassInnerCard} ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                            {asset.category?.toLowerCase().includes('laptop') ? <Laptop size={24} /> : <Monitor size={24} />}
                          </div>
                          <div>
                            <h2 className={`text-lg font-black leading-tight ${theme.textMain}`}>{asset.name || asset.asset_name}</h2>
                            <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${theme.glassInnerCard} ${theme.textSub}`}>
                              {asset.category || 'Hardware'}
                            </span>
                          </div>
                        </div>

                        <div className={`p-5 rounded-3xl space-y-3 ${theme.glassInnerCard}`}>
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Tag ID:</span>
                            <span className={`text-xs font-mono font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>{asset.asset_tag}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>S/N:</span>
                            <span className={`text-xs font-mono font-bold ${theme.textMain}`}>{asset.serial_number || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                          <div className={`p-4 rounded-2xl ${theme.glassInnerCard}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar size={14} className={isDarkMode ? 'text-orange-400' : 'text-orange-500'} />
                              <span className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Next Due</span>
                            </div>
                            <p className={`text-sm font-bold ${isOverdue ? 'text-rose-500' : theme.textMain}`}>
                              {asset.next_due ? new Date(asset.next_due).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Pending Setup'}
                            </p>
                          </div>

                          <div className={`p-4 rounded-2xl ${theme.glassInnerCard}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <Clock size={14} className={theme.textSub} />
                              <span className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Last Submitted</span>
                            </div>
                            <p className={`text-sm font-bold ${theme.textMain}`}>
                              {(!isSystemLog && latestInsp?.created_at) ? new Date(latestInsp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Never'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* STATUS & SUBMISSION DETAILS (RIGHT) */}
                      <div className="w-full lg:w-2/3 flex flex-col">
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                          <h3 className={`text-[11px] font-black uppercase tracking-widest ${theme.textSub}`}>Current Compliance Status</h3>
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm ${statusBg} ${statusColor} ${isOverdue || isReInspect ? 'animate-pulse' : ''}`}>
                            <StatusIcon size={14} /> {displayStatus}
                          </span>
                        </div>

                        {/* LAST SUBMISSION DETAILS */}
                        {latestInsp ? (
                          <div className="flex-1 flex flex-col space-y-5">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {/* Photos & Staff Note */}
                              <div className="space-y-5">
                                {photosArray.length > 0 && (
                                  <div>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2.5 ${theme.textSub}`}>
                                      <ImageIcon size={14} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'}/> Uploaded Evidence
                                    </span>
                                    <div className="flex flex-wrap gap-2 overflow-x-auto custom-scrollbar pb-2">
                                      {photosArray.map((url: string, i: number) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => setPreviewPhotoModal(url)}
                                          className={`relative group w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border transition-all cursor-pointer shadow-sm hover:scale-105 shrink-0 ${isDarkMode ? 'border-white/10 hover:border-purple-500 bg-black/40' : 'border-white/80 hover:border-purple-400 bg-white/40'}`}
                                        >
                                          <img src={url} alt={`Evidence ${i+1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-sm">
                                            <Eye size={16} className="text-purple-400" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {latestInsp.notes && (
                                  <div>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2.5 ${theme.textSub}`}>
                                      Staff Declaration Note
                                    </span>
                                    <div className={`p-4 rounded-2xl text-xs font-semibold italic leading-relaxed ${theme.glassInnerCard}`}>
                                      "{latestInsp.notes}"
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Admin Verdict & Notes */}
                              <div className="space-y-5">
                                {(latestInsp.admin_remarks || !isPendingReview) && (
                                  <div>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2.5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                      Admin Verdict & Remarks
                                    </span>
                                    <div className={`p-5 rounded-2xl text-xs font-semibold ${theme.glassInnerCard} flex flex-col gap-3 h-full`}>
                                      <div className="flex items-center gap-2">
                                          <span className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                            isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' :
                                            isRejected ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400' :
                                            isReInspect ? 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400' :
                                            'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400'
                                          }`}>
                                            {latestInsp.status || 'Pending'}
                                          </span>
                                      </div>
                                      {latestInsp.admin_remarks ? (
                                        <p className={`${theme.textMain} leading-relaxed text-[13px] mt-1`}>"{latestInsp.admin_remarks}"</p>
                                      ) : (
                                        <p className={`${theme.textSub} italic opacity-70 mt-1`}>No administrative remarks provided.</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-300 bg-white/40'}`}>
                             <Info size={32} className={`mb-3 opacity-50 ${theme.textSub}`} />
                             <p className={`text-sm font-bold ${theme.textMain}`}>No Inspection Records Found</p>
                             <p className={`text-xs font-medium mt-1 ${theme.textSub}`}>You have not submitted an audit for this device yet.</p>
                          </div>
                        )}

                        {/* Action Area */}
                        <div className="mt-auto pt-6 border-t border-white/20 dark:border-white/10">
                          {needsAction ? (
                            <button 
                              onClick={() => {
                                const url = `/mobile-audit?assetId=${asset.id}&empCode=${staffProfile?.emp_code}&name=${encodeURIComponent(staffProfile?.full_name || staffProfile?.name)}&cat=${encodeURIComponent(asset.category)}`;
                                router.push(url);
                              }}
                              className="w-full py-4 bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(168,85,247,0.4)] transition-all active:scale-95 cursor-pointer border border-purple-400"
                            >
                              <Camera size={18} /> Open Camera & Begin Audit
                            </button>
                          ) : isPendingReview ? (
                            <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                              <RefreshCw size={16} className="animate-spin" /> Audit Submitted & Awaiting Admin Approval
                            </div>
                          ) : (
                            <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                              <CheckCircle2 size={16} /> Asset Compliance Up To Date
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

export default function StaffInspectionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-500"></div>
        <span className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-zinc-500">Loading Workspace...</span>
      </div>
    }>
      <StaffInspectionsContent />
    </Suspense>
  );
}