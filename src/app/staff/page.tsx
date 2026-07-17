'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, Upload, CheckCircle2, AlertTriangle, 
  Loader2, Calendar, CheckCircle, ArrowUpRight, HelpCircle,
  Camera, Lock, Monitor, Bell, LogOut, RotateCcw,
  ThumbsUp, ThumbsDown
} from 'lucide-react';

// 🌟 THE AUDIT WINDOW ENGINE
function getAuditWindowInfo() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const lastSaturday = new Date(lastDayOfMonth);
  while (lastSaturday.getDay() !== 6) {
    lastSaturday.setDate(lastSaturday.getDate() - 1);
  }
  lastSaturday.setHours(23, 59, 59, 999);

  const windowStart = new Date(lastSaturday);
  windowStart.setDate(lastSaturday.getDate() - 4);
  windowStart.setHours(0, 0, 0, 0);

  return {
    isOpen: today >= windowStart && today <= lastSaturday,
    windowStart,
    lastSaturday,
    year,
    month
  };
}

// 🔊 SOUND PLAYER CONTROLLER
const playAlertSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        console.warn("Browser requires user interaction before playing sound automatically.");
      });
    }
  } catch (e) {}
};

export default function StaffDashboardPage() {
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  const [isAuthorized, setIsAuthorized] = useState(false); 
  
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, openTickets: 0 });

  // 🌟 LIKE/DISLIKE STATE
  const [reactions, setReactions] = useState<Record<string, 'like' | 'dislike'>>({});
  
  // 🔔 FLOATING RIGHT-SIDE TOAST NOTIFICATION STATE
  const [toasts, setToasts] = useState<{ id: number, title: string, message: string }[]>([]);

  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({
    isOpen: false,
    type: '',
  });

  const auditWindow = getAuditWindowInfo();

  const formatDisplayName = (raw: string) => {
    if (!raw) return 'Staff Member';
    let s = raw.split('@')[0];       
    s = s.split('.')[0];             
    s = s.replace(/[_-]/g, ' ');     
    return s.charAt(0).toUpperCase() + s.slice(1); 
  };

  // 🔔 POPUP TOAST TRIGGER FUNCTION
  const showToast = (title: string, message: string) => {
    playAlertSound();
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 7000); 
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const savedReactions = JSON.parse(localStorage.getItem('vsit_reactions') || '{}');
    setReactions(savedReactions);
  }, []);

  useEffect(() => {
    const watcher = setInterval(() => {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      const activeSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!activeSession && !isGuest) window.location.replace('/');
    }, 500);
    return () => clearInterval(watcher);
  }, []);

  const loadRealDatabase = async () => {
    const safetyTimeoutId = setTimeout(() => {
      setLoading(false);
    }, 4000);

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';

      if (isGuest) {
        clearTimeout(safetyTimeoutId);
        setCurrentUser({ id: 'guest-mock-uuid', email: 'demo_user@virtualstaffing.com', emp_id: 'DEMO-001', name: 'Demo Guest User' });
        setAssignedAssets([]); setAllInspections([]); setMyTickets([]); setNotifications([]);
        setStats({ totalAssets: 0, needsInspection: 0, openTickets: 0 });
        setIsAuthorized(true); setLoading(false); return; 
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }

      let user: any = {};
      try { user = JSON.parse(sessionStr); } catch (e) { user = { name: sessionStr.split('@')[0], email: sessionStr }; }

      const cleanEmail = user.email?.toLowerCase().trim();
      if (cleanEmail === 'lakhwinder.bi@outlook.com') { clearTimeout(safetyTimeoutId); window.location.replace('/admin'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      if (profile) {
        if (profile.status === 'Disabled') { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }
        user.emp_id = profile.emp_code || profile.emp_id || 'STAFF';
        user.name = profile.full_name || profile.name || user.name;
        user.id = profile.id;
      } else { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }
      
      setCurrentUser(user);
      setIsAuthorized(true); 

      const [assetsRes, inspRes, ticketsRes, notifRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200)
      ]);

      if (notifRes.data) {
        const dismissedBroadcasts = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
        
        let activeNotifications = notifRes.data.filter(n => {
          const isUnread = n.is_read !== true; 
          const isNotDismissedLocally = !dismissedBroadcasts.includes(n.id);
          const target = String(n.target_user || '').trim().toLowerCase();
          const isGlobal = target === '' || target === 'null' || target === 'undefined' || ['all', 'broadcast', 'everyone', 'staff', 'all_staff'].includes(target);
          const isPersonal = target === String(user.id).toLowerCase() || target === cleanEmail || target === String(user.emp_id).toLowerCase();
          return isUnread && isNotDismissedLocally && (isGlobal || isPersonal);
        });

        activeNotifications = activeNotifications.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        setNotifications(activeNotifications);

        const compiledAssets = (assetsRes.data || []).map(asset => {
          const latestInsp = (inspRes.data || []).find(i => i.asset_id === asset.id);
          return {
            ...asset,
            live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
            live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null
          };
        });
        setAssignedAssets(compiledAssets);
        
        const needsInspCount = compiledAssets.filter(a => 
          ['pending', 're-inspection', 'overdue', 'not approved', 'reject'].some(status => (a.live_inspection_status || '').toLowerCase().includes(status))
        ).length;

        const tix = ticketsRes.data || [];
        setMyTickets(tix);
        const openTixCount = tix.filter(t => !['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;

        setStats({ totalAssets: compiledAssets.length, needsInspection: needsInspCount, openTickets: openTixCount });
      }
    } catch (err) { console.error("Data sync failure:", err); } finally { clearTimeout(safetyTimeoutId); setLoading(false); }
  };

  // REAL-TIME WEBSOCKET LISTENERS
  useEffect(() => {
    loadRealDatabase();
    if (!currentUser || currentUser.id === 'guest-mock-uuid' || !currentUser.id) return;

    const realtimeChannel = supabase.channel('staff-dashboard-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => { 
        if (payload.new.created_by?.toLowerCase() === currentUser.email?.toLowerCase()) showToast("Ticket Updated", `Your ticket status was changed to: ${payload.new.status}`);
        loadRealDatabase(); 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => { 
        if (payload.new.assigned_to === currentUser.id) showToast("Hardware Update", `IT has updated your device details.`);
        loadRealDatabase(); 
      })
      // 🌟 LISTEN FOR ADMIN RETURN APPROVAL/REJECTION 🌟
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inspections' }, (payload) => { 
        if (payload.new.inspected_by === currentUser.id) {
          if (payload.new.status === 'Return Approved') showToast("Handover Approved", "IT has successfully received and unassigned your device.");
          if (payload.new.status === 'Return Rejected') showToast("Return Rejected", "IT rejected your device return. Please check dashboard for details.");
        }
        loadRealDatabase(); 
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => { 
        const target = String(payload.new.target_user || '').trim().toLowerCase();
        const isGlobal = target === '' || target === 'null' || target === 'undefined' || ['all', 'broadcast', 'everyone', 'staff'].includes(target);
        const isPersonal = target === String(currentUser.id).toLowerCase() || target === currentUser.email?.toLowerCase() || target === String(currentUser.emp_id).toLowerCase();
        if (isGlobal || isPersonal) {
            showToast(payload.new.title || "New System Alert", payload.new.message || "You have a new message from Admin.");
            if ("Notification" in window && Notification.permission === "granted") new Notification(payload.new.title || "New System Alert", { body: payload.new.message, icon: "/favicon.ico" });
        }
        loadRealDatabase(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(realtimeChannel); };
  }, [currentUser.id, currentUser.email, currentUser.emp_id]);

  const markNotificationAsRead = async (notifId: string, targetUser?: string | null) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    const target = String(targetUser || '').trim().toLowerCase();
    const isGlobalBroadcast = target === '' || target === 'null' || ['all', 'broadcast', 'everyone', 'staff'].includes(target);
    
    if (isGlobalBroadcast) {
      const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
      if (!dismissed.includes(notifId)) { dismissed.push(notifId); localStorage.setItem('dismissed_broadcasts', JSON.stringify(dismissed)); }
    } else {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    }
  };

  const toggleReaction = (notifId: string, type: 'like' | 'dislike') => {
    setReactions(prev => {
      const newReactions = { ...prev };
      if (newReactions[notifId] === type) delete newReactions[notifId]; else newReactions[notifId] = type;
      localStorage.setItem('vsit_reactions', JSON.stringify(newReactions));
      return newReactions;
    });
  };

  const resetLocalDismissals = () => { localStorage.removeItem('dismissed_broadcasts'); loadRealDatabase(); };
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'in progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getAssetAuditState = (asset: any) => {
    const status = (asset.live_inspection_status || '').toLowerCase();
    if (status.includes('re-inspection') || status.includes('not approved') || status.includes('reject')) return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm animate-pulse" };
    const hasAudited = allInspections.some(insp => { const d = new Date(insp.created_at); return insp.asset_id === asset.id && d.getFullYear() === auditWindow.year && d.getMonth() === auditWindow.month && insp.status !== 'Re-Inspection'; });
    if (hasAudited) return { disabled: true, text: "Audited This Month", classes: "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed shadow-none" };
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens ${auditWindow.windowStart.toLocaleDateString()}`, classes: "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" };
    return { disabled: false, text: "Audit Device", classes: "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-sm" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Connecting real-time database...</p>
      </div>
    );
  }

  if (!isAuthorized) return null; 

  const requiresGlobalReinspection = assignedAssets.some(a => ['re-inspection', 'not approved', 'reject'].some(s => (a.live_inspection_status || '').toLowerCase().includes(s)));
  const isGlobalAuditOpen = auditWindow.isOpen || requiresGlobalReinspection;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased relative">
      <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-80 sm:w-96 animate-in slide-in-from-right-8 fade-in duration-300 flex items-start gap-3 pointer-events-auto">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0"><Bell size={18} className="animate-pulse" /></div>
            <div className="flex-1 pt-0.5"><h4 className="font-bold text-sm text-slate-900 leading-tight">{t.title}</h4><p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.message}</p></div>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-slate-400 hover:text-slate-600 shrink-0 p-1"><X size={16}/></button>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Welcome back, {formatDisplayName(currentUser.name)} 👋</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm font-semibold text-slate-500">
              <span className="text-blue-700 font-bold uppercase tracking-wider px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-200/60">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={resetLocalDismissals} title="Reset Dismissed Alerts" className="flex items-center justify-center p-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 rounded-xl transition-all border border-slate-200 cursor-pointer"><RotateCcw size={16}/></button>
            <button onClick={loadRealDatabase} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-200 cursor-pointer"><RefreshCw size={14}/> Sync Feeds</button>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-top-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Bell size={14} className="text-amber-500 animate-bounce" /> Action Alerts ({notifications.length})</h3>
            <div className="grid grid-cols-1 gap-3">
              {notifications.map(notif => {
                const s = (notif.title || '').toLowerCase();
                const isReject = s.includes('reject'); const isReInspect = s.includes('re-inspect') || s.includes('re-audit');
                const isApprove = s.includes('approve'); const isReplacement = s.includes('replace') || s.includes('new asset'); 
                const isBroadcast = s.includes('broadcast') || s.includes('announcement');
                let bgColor = 'bg-blue-50 border-blue-200'; let iconColor = 'text-blue-600';
                if (isReplacement) { bgColor = 'bg-purple-50 border-purple-200'; iconColor = 'text-purple-600'; } 
                else if (isReject) { bgColor = 'bg-rose-50 border-rose-200'; iconColor = 'text-rose-600'; } 
                else if (isReInspect) { bgColor = 'bg-amber-50 border-amber-200'; iconColor = 'text-amber-600'; } 
                else if (isApprove) { bgColor = 'bg-emerald-50 border-emerald-200'; iconColor = 'text-emerald-600'; }

                return (
                  <div key={notif.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${bgColor}`}>
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`p-2 bg-white rounded-lg shadow-xs shrink-0 ${iconColor}`}>{isApprove || isReplacement ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div>
                      <div><h4 className={`font-bold text-sm ${iconColor}`}>{notif.title || 'System Alert'}</h4><p className="text-xs font-medium text-slate-700 mt-0.5">{notif.message || 'Check your dashboard.'}</p></div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                      {isBroadcast && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
                          <button onClick={() => toggleReaction(notif.id, 'like')} className={`p-1.5 rounded-md transition-colors ${reactions[notif.id] === 'like' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title="Acknowledge / Like"><ThumbsUp size={14} className={reactions[notif.id] === 'like' ? "fill-blue-600 text-blue-600" : ""} /></button>
                          <button onClick={() => toggleReaction(notif.id, 'dislike')} className={`p-1.5 rounded-md transition-colors ${reactions[notif.id] === 'dislike' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title="Dislike"><ThumbsDown size={14} className={reactions[notif.id] === 'dislike' ? "fill-rose-600 text-rose-600" : ""} /></button>
                        </div>
                      )}
                      <button onClick={() => markNotificationAsRead(notif.id, notif.target_user)} className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer shadow-xs">Dismiss</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'IT failure', icon: Ticket, color: 'text-blue-600 bg-blue-50 border-blue-100', type: 'TICKET', isActionDisabled: false },
            { name: 'Device Audit', desc: requiresGlobalReinspection ? 'Action Required' : (auditWindow.isOpen ? 'Submit inspection' : 'Window Closed'), icon: ClipboardCheck, color: requiresGlobalReinspection ? 'text-rose-600 bg-rose-50 border-rose-200 animate-pulse' : (auditWindow.isOpen ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-100 border-slate-200'), type: 'INSPECTION', isActionDisabled: !isGlobalAuditOpen },
            { name: 'Request Gear', desc: 'New equipment', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', type: 'REQUEST', isActionDisabled: false },
            { name: 'Replacement', desc: 'Swap hardware', icon: RefreshCw, color: 'text-purple-600 bg-purple-50 border-purple-100', type: 'REPLACEMENT', isActionDisabled: assignedAssets.length === 0 },
            { name: 'Return Asset', desc: 'Handover to IT', icon: LogOut, color: 'text-orange-600 bg-orange-50 border-orange-100', type: 'RETURN', isActionDisabled: assignedAssets.length === 0 },
            { name: 'Team Screen', desc: 'Remote access', icon: Monitor, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', type: 'ROUTE', path: '/staff/dashboard/remote', isActionDisabled: false },
          ].map((item) => (
              <button 
                key={item.name} 
                onClick={() => { if (item.isActionDisabled) return; if (item.path) { router.push(item.path); } else { setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] }); } }} 
                disabled={item.isActionDisabled}
                className={`bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left flex flex-col sm:flex-row items-start gap-3 lg:gap-4 group transition-all ${item.isActionDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 hover:shadow-md cursor-pointer'}`}
              >
                <div className={`p-3 rounded-xl border shrink-0 transition-transform ${item.isActionDisabled ? '' : 'group-hover:scale-105'} ${item.color}`}>{item.isActionDisabled ? <Lock size={20} /> : <item.icon size={20} />}</div>
                <div><h3 className={`font-bold text-sm leading-tight ${item.isActionDisabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>{item.name}</h3><p className="text-[10px] lg:text-xs font-medium text-slate-500 mt-1 line-clamp-2">{item.desc}</p></div>
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800"><Laptop className="text-blue-600 shrink-0" size={18}/> My Hardware Units</div>
              <span className="text-xs font-bold text-slate-400">{assignedAssets.length} Total</span>
            </div>
            {assignedAssets.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium text-xs">No active machines linked to your ID.</div>
            ) : (
              assignedAssets.map(asset => {
                const btnState = getAssetAuditState(asset);
                const isReInspect = (asset.live_inspection_status || '').toLowerCase().includes('re-inspection');
                
                // 🌟 FIX: Return Dashboard UI States 🌟
                const isReturnPending = (asset.status || '').toLowerCase().includes('return');
                const isReturnRejected = (asset.live_inspection_status || '').toLowerCase() === 'return rejected';

                return (
                  <div key={asset.id} className={`p-4 rounded-2xl bg-slate-50 border ${isReInspect || isReturnRejected ? 'border-rose-200' : 'border-slate-200/60'} flex flex-col xl:flex-row xl:items-center justify-between gap-4`}>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{asset.name || asset.asset_name || asset.model || 'Generic Device'}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Tag: {asset.asset_tag || 'NO-TAG'} • S/N: {asset.serial_number || asset.serial || 'N/A'}</p>
                      
                      <div className="text-[10px] mt-1.5 font-bold uppercase tracking-widest flex flex-wrap items-center gap-2">
                        Status: <span className={isReInspect ? 'text-rose-600' : isReturnRejected ? 'text-rose-600' : isReturnPending ? 'text-orange-600' : 'text-slate-600'}>
                          {isReturnRejected ? 'Return Rejected' : isReturnPending ? 'Return Pending Approval' : (asset.live_inspection_status || 'Pending')}
                        </span>
                        <span className="text-slate-300">•</span>
                        Updated: <span className="text-slate-600">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full xl:w-auto mt-2 xl:mt-0">
                      <button 
                        disabled={isReturnPending && !isReturnRejected}
                        onClick={() => setModal({ isOpen: true, type: 'RETURN', targetAsset: asset })}
                        className={`px-4 py-2 font-bold text-xs rounded-xl transition-all shrink-0 text-center flex-1 xl:flex-none border shadow-sm ${
                          (isReturnPending && !isReturnRejected)
                            ? 'bg-orange-100 text-orange-400 border-orange-200 cursor-not-allowed opacity-60'
                            : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer'
                        }`}
                      >
                        {(isReturnPending && !isReturnRejected) ? 'Return Pending' : 'Return'}
                      </button>
                      <button disabled={btnState.disabled} onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} className={`px-4 py-2 font-bold text-xs rounded-xl transition-all shrink-0 text-center flex-1 xl:flex-none flex items-center justify-center gap-1.5 ${btnState.classes}`}>
                        {btnState.disabled && !btnState.text.includes('Opens') && <CheckCircle size={14} />}
                        {btnState.disabled && btnState.text.includes('Opens') && <Lock size={14} />}
                        {btnState.text}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800"><Ticket className="text-indigo-600 shrink-0" size={18}/> My Service Tickets</div>
              <span className="text-xs font-bold text-slate-400">{myTickets.length} Raised</span>
            </div>
            {myTickets.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium text-xs">No service requests submitted yet.</div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {myTickets.map(tix => (
                  <div key={tix.id} className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-colors bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 leading-snug">{tix.title || tix.subject}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shrink-0 ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 font-normal">{tix.description || tix.note}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-medium">
                      <span>Category: <strong className="text-slate-600 font-semibold">{tix.category || 'General'}</strong></span>
                      <span>{tix.created_at ? new Date(tix.created_at).toLocaleDateString() : 'Just now'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal.isOpen && (
        <LiveDatabaseModal type={modal.type} asset={modal.targetAsset} user={currentUser} setAssignedAssets={setAssignedAssets} onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(); }} />
      )}
    </div>
  );
}

// 🌟 ARMORED TRANSACTION MODAL
function LiveDatabaseModal({ type, asset, user, setAssignedAssets, onClose }: any) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT' || type === 'RETURN';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  
  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  const handleAttemptUnlock = () => {
    if (!asset) { alert("No hardware assigned to test against!"); return; }
    if (user.id === 'guest-mock-uuid') { setLockError(false); setIsUnlocked(true); return; }
    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number||'').toLowerCase() || typed === (asset.asset_tag||'').toLowerCase()) { setLockError(false); setIsUnlocked(true); } else setLockError(true);
  };

  const generateMobileHandoff = () => {
    const baseUrl = window.location.origin;
    const cat = asset?.category || formCategory;
    
    // 🚀 CRITICAL FIX: Inject a hidden tag into the notes so the mobile app carries the "Return" signal to the database
    const finalNotes = type === 'RETURN' ? `[RETURN REQUEST] ${formText}` : formText;
    
    const url = `${baseUrl}/mobile-audit?assetId=${asset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(finalNotes)}&auditType=${type}`;
    
    setQrUrl(url);
    setShowQR(true);
  };

  const handleLivePostgresSubmit = async () => {
    if (type === 'INSPECTION' || type === 'RETURN') {
      
      if (type === 'RETURN') {
        try {
          await supabase.from('assets').update({ status: 'Pending Return' }).eq('id', asset.id);
          // 🚀 INSTANT UI UPDATE: Forces the dashboard to disable the button without waiting for websocket
          if (setAssignedAssets) {
            setAssignedAssets((prev: any[]) => prev.map(a => a.id === asset.id ? { ...a, status: 'Pending Return' } : a));
          }
        } catch(e) { console.warn("Failed to mark as Pending Return", e); }
      }

      generateMobileHandoff();
      return;
    }

    setIsTransmitting(true);
    if (user.id === 'guest-mock-uuid') { setTimeout(() => { setIsTransmitting(false); setSuccessDone(true); setTimeout(() => onClose(), 1200); }, 800); return; }

    let submitError = null; 
    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const finalEmp = user.emp_id || 'STAFF';
      let humanName = user.name || cleanEmail.split('@')[0];
      humanName = humanName.split('.')[0].replace(/[_-]/g, ' ');
      humanName = humanName.charAt(0).toUpperCase() + humanName.slice(1);

      if (type === 'TICKET') {
        const { error } = await supabase.from('tickets').insert({ title: formTitle || 'IT Support Ticket', category: formCategory, description: formText || 'No details given', status: 'Open', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = error;
      } else if (type === 'REQUEST') {
        const { error } = await supabase.from('tickets').insert({ title: `Asset Request: ${formCategory}`, category: `Request: ${formCategory}`, description: formText || `Staff requested ${formCategory}`, status: 'Pending', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = error;
      } else if (type === 'REPLACEMENT') {
        const { error: ticketError } = await supabase.from('tickets').insert({ title: `Replacement Request: ${asset.name}`, category: 'Asset Replacement', description: `Tag ID: ${asset.asset_tag} | S/N: ${asset.serial_number}\n\nReason: ${formText}`, status: 'Pending', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = ticketError;
        if (!ticketError) await supabase.from('assets').update({ status: 'Replacement Requested' }).eq('id', asset.id);
      }
      if (submitError) throw submitError;
      setSuccessDone(true); setTimeout(() => onClose(), 1200);
    } catch (e: any) { alert(`Database Error: ${e.message || JSON.stringify(e)}`); } finally { setIsTransmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl font-bold ${type === 'RETURN' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{type === 'RETURN' ? <LogOut size={20} /> : <Ticket size={20}/>}</div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">{type === 'REPLACEMENT' ? 'Assets Replacement' : type === 'RETURN' ? 'Asset Return Request' : 'Portal Submission'}</h3>
              {type !== 'REPLACEMENT' && type !== 'RETURN' && <p className="text-xs text-slate-500 font-medium">{type}</p>}
              {type === 'RETURN' && <p className="text-xs text-slate-500 font-medium">Initiate IT Handover</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"><X size={18}/></button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
          {successDone ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 size={48} className="text-emerald-600 mx-auto animate-bounce"/>
              <h4 className="text-xl font-bold text-slate-900">Database Updated!</h4>
            </div>
          ) : showQR ? (
            <div className="py-6 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Mobile Device Handoff</h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">Scan this code with your phone camera to take certified watermark photos of the asset.</p>
              </div>
              <div className="p-4 bg-white border-2 border-slate-200 rounded-3xl inline-block shadow-lg mx-auto">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Scan to Audit" className="w-48 h-48 rounded-xl" />
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-left">
                <h5 className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-2 flex items-center gap-2"><Camera size={14}/> Photo Requirements</h5>
                <ul className="text-xs text-blue-900 font-medium space-y-1.5 ml-1">
                  {(asset?.category || '').toLowerCase().includes('laptop') ? (
                    <><li>✅ Screen & Keypad view</li><li>✅ Top and Bottom (with Tag)</li><li>✅ Left and Right Side Ports</li></>
                  ) : (
                    <><li>✅ Clear Front / Top View</li><li>✅ Bottom View (showing Asset Tag)</li></>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm font-medium">
              {needsLock && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-2">🔒 Security Verification Required</p>
                  <div className="flex gap-2">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder={user.id === 'guest-mock-uuid' ? 'Type anything for Guest mode...' : 'Type exact Tag ID or S/N...'} className="flex-1 p-3 bg-white rounded-xl border border-blue-200 text-xs font-bold outline-none"/>
                    {!isUnlocked && <button onClick={handleAttemptUnlock} className="px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors">Verify</button>}
                  </div>
                  {lockError && <p className="text-[11px] text-rose-600 font-bold">Incorrect device code.</p>}
                </div>
              )}

              {type === 'TICKET' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Subject</label><input value={formTitle} onChange={e=>setFormTitle(e.target.value)} placeholder="E.g. Monitor display flickering" className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 text-sm font-semibold"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label><select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 font-semibold"><option>Hardware</option><option>Software</option><option>Network</option></select></div>
                </>
              )}

              {(type === 'INSPECTION' || type === 'RETURN') && isUnlocked && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Asset Condition</label>
                  <select value={formCondition} onChange={e=>setFormCondition(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 font-semibold mb-4 outline-none focus:border-blue-600">
                    <option>Pristine / Flawless</option><option>Good / Minor Scratches</option><option>Poor / Damaged (Requires Fix)</option><option>Non-Functional / Dead</option>
                  </select>
                </div>
              )}

              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{type === 'INSPECTION' ? 'Audit Notes' : type === 'RETURN' ? 'Return Reason & Notes' : 'Detailed Explanation'}</label><textarea rows={4} value={formText} onChange={e=>setFormText(e.target.value)} placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : type === 'RETURN' ? "Provide reason for returning (e.g., leaving company, replacing)..." : "Describe what happened..."} className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 text-sm resize-none"/></div>
            </div>
          )}
        </div>

        {!successDone && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            {showQR ? (
              <button onClick={onClose} className="w-full py-3.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-sm transition-colors">Close Portal (Awaiting Mobile Scan)</button>
            ) : (
              <>
                <button onClick={onClose} className="px-5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors">Cancel</button>
                <button disabled={isTransmitting || (needsLock && !isUnlocked)} onClick={handleLivePostgresSubmit} className={`px-7 py-3 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest transition-colors ${type === 'RETURN' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {isTransmitting && <Loader2 size={14} className="animate-spin"/>} {type === 'INSPECTION' || type === 'RETURN' ? 'Generate Camera QR' : 'Transmit'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}