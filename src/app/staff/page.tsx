'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, Upload, CheckCircle2, AlertTriangle, 
  Loader2, Calendar, CheckCircle, ArrowUpRight, HelpCircle,
  Camera, Lock, Monitor, Bell, History
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

  useEffect(() => {
    const watcher = setInterval(() => {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      const activeSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      
      if (!activeSession && !isGuest) {
        window.location.replace('/');
      }
    }, 500);
    return () => clearInterval(watcher);
  }, []);

  const loadRealDatabase = async () => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';

      if (isGuest) {
        setCurrentUser({
          id: 'guest-mock-uuid',
          email: 'demo_user@virtualstaffing.com',
          emp_id: 'DEMO-001',
          name: 'Demo Guest User',
        });
        
        const demoAssets = [
          { id: 'demo-1', name: 'Demo MacBook Pro 16"', asset_tag: 'MAC-9999', serial_number: 'SN-DEMO-1', category: 'Laptop', live_inspection_status: 'Pending', live_inspection_date: new Date().toISOString() },
          { id: 'demo-2', name: 'Demo Dell UltraSharp Monitor', asset_tag: 'MON-8888', serial_number: 'SN-DEMO-2', category: 'Hardware', live_inspection_status: 'Pending', live_inspection_date: new Date().toISOString() }
        ];
        
        setAssignedAssets(demoAssets);
        setAllInspections([]);
        setMyTickets([]);
        setNotifications([]);
        setStats({ totalAssets: 2, needsInspection: 2, openTickets: 0 });
        setIsAuthorized(true);
        setLoading(false);
        return; 
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      
      if (!sessionStr) { 
        window.location.replace('/'); 
        return; 
      }

      let user: any = {};
      try { user = JSON.parse(sessionStr); } 
      catch (e) { user = { name: sessionStr.split('@')[0], email: sessionStr }; }

      const cleanEmail = user.email?.toLowerCase().trim();

      if (cleanEmail === 'lakhwinder.bi@outlook.com') {
        window.location.replace('/admin');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      
      if (profile) {
        if (profile.status === 'Disabled') {
          window.location.replace('/');
          return;
        }
        user.emp_id = profile.emp_code || profile.emp_id || 'STAFF';
        user.name = profile.full_name || profile.name || user.name;
        user.id = profile.id;
      } else {
        window.location.replace('/');
        return;
      }
      
      setCurrentUser(user);
      setIsAuthorized(true); 

      const [assetsRes, inspRes, ticketsRes, notifRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('target_user', user.id).eq('is_read', false).order('created_at', { ascending: false })
      ]);

      if (assetsRes.data) {
        setAllInspections(inspRes.data || []); 
        setNotifications(notifRes.data || []);

        const compiledAssets = assetsRes.data.map(asset => {
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
    } catch (err) {
      console.error("Data sync failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealDatabase();
    if (localStorage.getItem('isGuestSession') === 'true') return;

    const ticketSubscription = supabase.channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => { loadRealDatabase(); })
      .subscribe();
      
    const inspSubscription = supabase.channel('public:inspections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => { loadRealDatabase(); })
      .subscribe();
      
    const notifSubscription = supabase.channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { loadRealDatabase(); })
      .subscribe();

    const assetSubscription = supabase.channel('public:assets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { loadRealDatabase(); })
      .subscribe();

    return () => { 
      supabase.removeChannel(ticketSubscription); 
      supabase.removeChannel(inspSubscription);
      supabase.removeChannel(notifSubscription);
      supabase.removeChannel(assetSubscription);
    };
  }, []);

  const markNotificationAsRead = async (notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'in progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getAssetAuditState = (asset: any) => {
    const status = (asset.live_inspection_status || '').toLowerCase();
    
    if (status.includes('re-inspection') || status.includes('not approved') || status.includes('reject')) {
      return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm animate-pulse" };
    }

    const hasAudited = allInspections.some(insp => {
      const d = new Date(insp.created_at);
      return insp.asset_id === asset.id && 
             d.getFullYear() === auditWindow.year && 
             d.getMonth() === auditWindow.month &&
             insp.status !== 'Re-Inspection'; 
    });

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

  const requiresGlobalReinspection = assignedAssets.some(a => {
    const s = (a.live_inspection_status || '').toLowerCase();
    return s.includes('re-inspection') || s.includes('not approved') || s.includes('reject');
  });
  const isGlobalAuditOpen = auditWindow.isOpen || requiresGlobalReinspection;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, {formatDisplayName(currentUser.name)} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm font-semibold text-slate-500">
              {currentUser.id === 'guest-mock-uuid' ? (
                <span className="text-emerald-700 font-bold uppercase tracking-wider px-2.5 py-0.5 bg-emerald-50 rounded-md border border-emerald-200/60">GUEST MODE (DEMO)</span>
              ) : (
                <span className="text-blue-700 font-bold uppercase tracking-wider px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-200/60">ID: {currentUser.emp_id}</span>
              )}
              <span>{currentUser.email}</span>
            </div>
          </div>
          <button onClick={loadRealDatabase} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-200 shrink-0 cursor-pointer">
            <RefreshCw size={14}/> Sync Feeds
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-top-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Bell size={14} className="text-amber-500 animate-bounce" /> Action Alerts ({notifications.length})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {notifications.map(notif => {
                const s = (notif.title || '').toLowerCase();
                const isReject = s.includes('reject');
                const isReInspect = s.includes('re-inspect') || s.includes('re-audit');
                const isApprove = s.includes('approve');
                const isReplacement = s.includes('replace') || s.includes('new asset'); // 🌟 Added Replacement catching logic
                
                let bgColor = 'bg-blue-50 border-blue-200';
                let iconColor = 'text-blue-600';

                if (isReplacement) {
                  bgColor = 'bg-purple-50 border-purple-200';
                  iconColor = 'text-purple-600';
                } else if (isReject) {
                  bgColor = 'bg-rose-50 border-rose-200';
                  iconColor = 'text-rose-600';
                } else if (isReInspect) {
                  bgColor = 'bg-amber-50 border-amber-200';
                  iconColor = 'text-amber-600';
                } else if (isApprove) {
                  bgColor = 'bg-emerald-50 border-emerald-200';
                  iconColor = 'text-emerald-600';
                }

                return (
                  <div key={notif.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${bgColor}`}>
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`p-2 bg-white rounded-lg shadow-xs shrink-0 ${iconColor}`}>
                        {isApprove || isReplacement ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${iconColor}`}>{notif.title || 'System Alert'}</h4>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">{notif.message || 'Check your dashboard.'}</p>
                      </div>
                    </div>
                    <button onClick={() => markNotificationAsRead(notif.id)} className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer">
                      Dismiss
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🌟 ADDED NEW REPLACEMENTS LOG BUTTON TO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'Hardware or IT failure', icon: Ticket, color: 'text-blue-600 bg-blue-50 border-blue-100', type: 'TICKET', isActionDisabled: false },
            { 
              name: 'Device Audit', 
              desc: requiresGlobalReinspection ? 'Action Required' : (auditWindow.isOpen ? 'Submit asset inspection' : 'Window Currently Closed'), 
              icon: ClipboardCheck, 
              color: requiresGlobalReinspection ? 'text-rose-600 bg-rose-50 border-rose-200 animate-pulse' : (auditWindow.isOpen ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-100 border-slate-200'), 
              type: 'INSPECTION', 
              isActionDisabled: !isGlobalAuditOpen 
            },
            { name: 'Request Gear', desc: 'Ask for new equipment', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', type: 'REQUEST', isActionDisabled: false },
            { name: 'Replacement', desc: 'Swap faulty hardware', icon: RefreshCw, color: 'text-purple-600 bg-purple-50 border-purple-100', type: 'REPLACEMENT', isActionDisabled: false },
            { name: 'Replacements Log', desc: 'View replacement history', icon: History, color: 'text-orange-600 bg-orange-50 border-orange-100', type: 'ROUTE', path: '/staff/dashboard/replacements', isActionDisabled: false },
            { name: 'Team Screen', desc: 'Collaborate remotely', icon: Monitor, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', type: 'ROUTE', path: '/staff/dashboard/remote', isActionDisabled: false },
          ].map((item) => (
              <button 
                key={item.name} 
                onClick={() => {
                  if (item.isActionDisabled) return;
                  if (item.path) {
                    router.push(item.path);
                  } else {
                    setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] });
                  }
                }} 
                disabled={item.isActionDisabled}
                className={`bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left flex items-start gap-3 lg:gap-4 group transition-all ${item.isActionDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 hover:shadow-md cursor-pointer'}`}
              >
                <div className={`p-3 rounded-xl border shrink-0 transition-transform ${item.isActionDisabled ? '' : 'group-hover:scale-105'} ${item.color}`}>
                  {item.isActionDisabled ? <Lock size={20} /> : <item.icon size={20} />}
                </div>
                <div>
                  <h3 className={`font-bold text-sm leading-tight ${item.isActionDisabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-600'} transition-colors`}>{item.name}</h3>
                  <p className="text-[10px] lg:text-xs font-medium text-slate-500 mt-1 line-clamp-2">{item.desc}</p>
                </div>
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Hardware</p><h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">{stats.totalAssets}</h2></div>
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 font-bold"><Laptop size={28} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Action Required</p><h2 className="text-3xl sm:text-4xl font-black text-amber-600 mt-1">{stats.needsInspection}</h2></div>
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-600"><AlertCircle size={28} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Tickets</p><h2 className="text-3xl sm:text-4xl font-black text-indigo-600 mt-1">{stats.openTickets}</h2></div>
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600"><Ticket size={28} /></div>
          </div>
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

                return (
                  <div key={asset.id} className={`p-4 rounded-2xl bg-slate-50 border ${isReInspect ? 'border-rose-200' : 'border-slate-200/60'} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{asset.name || asset.asset_name || asset.model || 'Generic Device'}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Tag: {asset.asset_tag || 'NO-TAG'} • S/N: {asset.serial_number || asset.serial || 'N/A'}</p>
                      
                      <div className="text-[10px] mt-1.5 font-bold uppercase tracking-widest flex items-center gap-2">
                        Status: <span className={isReInspect ? 'text-rose-600' : 'text-slate-600'}>{asset.status === 'Replacement Requested' ? 'Replacement Requested' : (asset.live_inspection_status || 'Pending')}</span>
                        <span className="text-slate-300">•</span>
                        Updated: <span className="text-slate-600">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <button 
                      disabled={btnState.disabled}
                      onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                      className={`px-4 py-2 font-bold text-xs rounded-xl transition-all shrink-0 text-center flex items-center justify-center gap-1.5 ${btnState.classes}`}
                    >
                      {btnState.disabled && !btnState.text.includes('Opens') && <CheckCircle size={14} />}
                      {btnState.disabled && btnState.text.includes('Opens') && <Lock size={14} />}
                      {btnState.text}
                    </button>
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
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shrink-0 ${getStatusBadge(tix.status)}`}>
                        {tix.status || 'Open'}
                      </span>
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
        <LiveDatabaseModal type={modal.type} asset={modal.targetAsset} user={currentUser} onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(); }} />
      )}
    </div>
  );
}

// 🌟 ARMORED TRANSACTION MODAL
function LiveDatabaseModal({ type, asset, user, onClose }: any) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT';
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
    
    if (user.id === 'guest-mock-uuid') {
      setLockError(false); setIsUnlocked(true);
      return;
    }

    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number||'').toLowerCase() || typed === (asset.asset_tag||'').toLowerCase()) {
      setLockError(false); setIsUnlocked(true);
    } else setLockError(true);
  };

  const generateMobileHandoff = () => {
    const baseUrl = window.location.origin;
    const cat = asset?.category || formCategory;
    const url = `${baseUrl}/mobile-audit?assetId=${asset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(formText)}`;
    
    setQrUrl(url);
    setShowQR(true);
  };

  const handleLivePostgresSubmit = async () => {
    if (type === 'INSPECTION') {
      generateMobileHandoff();
      return;
    }

    setIsTransmitting(true);

    if (user.id === 'guest-mock-uuid') {
      setTimeout(() => {
        setIsTransmitting(false);
        setSuccessDone(true);
        setTimeout(() => onClose(), 1200);
      }, 800); 
      return;
    }

    let submitError = null; 

    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const finalEmp = user.emp_id || 'STAFF';

      let humanName = user.name || cleanEmail.split('@')[0];
      humanName = humanName.split('.')[0].replace(/[_-]/g, ' ');
      humanName = humanName.charAt(0).toUpperCase() + humanName.slice(1);

      if (type === 'TICKET') {
        const { error } = await supabase.from('tickets').insert({
          title: formTitle || 'IT Support Ticket',
          category: formCategory,
          description: formText || 'No details given',
          status: 'Open',
          created_by: cleanEmail,
          emp_code: finalEmp,
          staff_name: humanName 
        });
        submitError = error;
      } else if (type === 'REQUEST') {
        const { error } = await supabase.from('tickets').insert({
          title: `Asset Request: ${formCategory}`,
          category: `Request: ${formCategory}`,
          description: formText || `Staff requested ${formCategory}`,
          status: 'Pending',
          created_by: cleanEmail,
          emp_code: finalEmp,
          staff_name: humanName
        });
        submitError = error;
      } else if (type === 'REPLACEMENT') {
        // 🌟 UPDATED: Store as an Asset Replacement Request ticket to build the history log
        const { error: ticketError } = await supabase.from('tickets').insert({
          title: `Replacement Request: ${asset.name}`,
          category: 'Asset Replacement', // Used by the new page to filter history
          description: `Tag ID: ${asset.asset_tag} | S/N: ${asset.serial_number}\n\nReason: ${formText}`,
          status: 'Pending',
          created_by: cleanEmail,
          emp_code: finalEmp,
          staff_name: humanName
        });
        submitError = ticketError;
        
        if (!ticketError) {
          await supabase.from('assets').update({
            status: 'Replacement Requested'
          }).eq('id', asset.id);
        }
      }

      if (submitError) throw submitError;

      setSuccessDone(true);
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      console.error("FULL POSTGRES ERROR:", e);
      alert(`Database Error: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 font-bold"><Ticket size={20}/></div>
            <div>
              {/* 🌟 RENAMED THE TITLE IF TYPE IS REPLACEMENT */}
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">
                {type === 'REPLACEMENT' ? 'Assets Replacement' : 'Portal Submission'}
              </h3>
              {type !== 'REPLACEMENT' && <p className="text-xs text-slate-500 font-medium">{type}</p>}
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
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} 
                  alt="Scan to Audit" 
                  className="w-48 h-48 rounded-xl"
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-left">
                <h5 className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-2 flex items-center gap-2">
                  <Camera size={14}/> Photo Requirements
                </h5>
                <ul className="text-xs text-blue-900 font-medium space-y-1.5 ml-1">
                  {(asset?.category || '').toLowerCase().includes('laptop') ? (
                    <>
                      <li>✅ Screen & Keypad view</li>
                      <li>✅ Top and Bottom (with Tag)</li>
                      <li>✅ Left and Right Side Ports</li>
                    </>
                  ) : (
                    <>
                      <li>✅ Clear Front / Top View</li>
                      <li>✅ Bottom View (showing Asset Tag)</li>
                    </>
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

              {type === 'INSPECTION' && isUnlocked && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asset Condition</label>
                  <select value={formCondition} onChange={e=>setFormCondition(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 font-semibold mb-4 outline-none focus:border-blue-600">
                    <option>Pristine / Flawless</option>
                    <option>Good / Minor Scratches</option>
                    <option>Poor / Damaged (Requires Fix)</option>
                    <option>Non-Functional / Dead</option>
                  </select>
                </div>
              )}

              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{type === 'INSPECTION' ? 'Audit Notes' : 'Detailed Explanation'}</label><textarea rows={4} value={formText} onChange={e=>setFormText(e.target.value)} placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : "Describe what happened..."} className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 text-sm resize-none"/></div>
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
                <button disabled={isTransmitting || (needsLock && !isUnlocked)} onClick={handleLivePostgresSubmit} className="px-7 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest transition-colors">
                  {isTransmitting && <Loader2 size={14} className="animate-spin"/>} 
                  {type === 'INSPECTION' ? 'Generate Camera QR' : 'Transmit'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}