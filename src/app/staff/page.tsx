'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useNotifications } from '@/hooks/useNotifications';
import { Asset, Inspection } from '@/types';

// Explicitly pruned down to components actively rendered in layout
import { 
  Laptop, 
  ClipboardCheck, 
  Ticket as TicketIcon, 
  PlusCircle, 
  RefreshCw, 
  X, 
  Loader2, 
  CheckCircle, 
  Bell, 
  AlertTriangle,
  ShieldCheck 
} from 'lucide-react';

interface StaffUser {
  id: string;
  email: string;
  emp_id: string;
  name: string;
}

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
    month,
    today
  };
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false); 
  
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [allInspections, setAllInspections] = useState<Inspection[]>([]);
  
  // 🌟 FIXED TYPE ERROR: Set to any[] to allow dynamic database columns like admin_notes
  const [myTickets, setMyTickets] = useState<any[]>([]);
  
  const { notifications, unreadCount, markAllAsRead } = useNotifications(currentUser?.id);
  const [showNotifications, setShowNotifications] = useState(false);

  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: Asset }>({
    isOpen: false,
    type: '',
  });

  const formatDisplayName = (raw: string) => {
    if (!raw) return 'Staff Member';
    let s = raw.split('@')[0].split('.')[0].replace(/[_-]/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1); 
  };

  const loadRealDatabase = async () => {
    try {
      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { router.replace('/'); return; }

      let sessionUser: any = {};
      try { sessionUser = JSON.parse(sessionStr); } 
      catch (e) { sessionUser = { email: sessionStr }; }

      const cleanEmail = sessionUser.email?.toLowerCase().trim();

      if (cleanEmail === 'lakhwinder.bi@outlook.com') {
        alert("Access Redirect: Admins must utilize the Admin Control Desk configuration panels.");
        router.replace('/admin');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      
      if (!profile || profile.status === 'Disabled') {
        alert("Access Terminated: This account has been disabled by system operations.");
        router.replace('/');
        return;
      }

      const user: StaffUser = {
        id: profile.id,
        email: cleanEmail,
        emp_id: profile.emp_code || profile.emp_id || 'STAFF',
        name: profile.full_name || profile.name || cleanEmail.split('@')[0],
      };
      
      setCurrentUser(user);
      setIsAuthorized(true); 

      const [assetsRes, inspRes, ticketsRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false })
      ]);

      if (assetsRes.data) setAssignedAssets(assetsRes.data as Asset[]);
      if (inspRes.data) setAllInspections(inspRes.data as Inspection[]);
      if (ticketsRes.data) setMyTickets(ticketsRes.data);

    } catch (err) {
      console.error("Data sync failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealDatabase();
    
    const channel = supabase.channel('staff_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => loadRealDatabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => loadRealDatabase())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => loadRealDatabase())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const auditWindow = getAuditWindowInfo();
  const activeReInspections = allInspections.filter(i => i.status === 'Re-Inspection');
  const openTixCount = myTickets.filter(t => !['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;
  const pendingInspectionsCount = allInspections.filter(i => i.status === 'Pending').length;

  const getAssetAuditState = (asset: Asset) => {
    const assetInspections = allInspections.filter(i => i.asset_id === asset.id);
    const latestInspection = assetInspections[0]; 

    if (latestInspection?.status === 'Re-Inspection') {
      return { 
        disabled: false, 
        text: "Re-Audit Required", 
        classes: "bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer animate-pulse",
        status: "Re-inspection Required"
      };
    }

    if (latestInspection?.status === 'Pending') {
      return { 
        disabled: true, 
        text: "Awaiting Approval", 
        classes: "bg-amber-100 text-amber-700 border border-amber-200 cursor-not-allowed",
        status: "Pending Approval"
      };
    }

    const hasAuditedThisMonth = assetInspections.some(insp => {
      const d = new Date(insp.created_at);
      return d.getFullYear() === auditWindow.year && d.getMonth() === auditWindow.month;
    });

    if (hasAuditedThisMonth) {
      return { 
        disabled: true, 
        text: "Audited This Month", 
        classes: "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-not-allowed opacity-80",
        status: latestInspection?.status || "Completed"
      };
    }

    if (auditWindow.today > auditWindow.lastSaturday && !hasAuditedThisMonth) {
      return { 
        disabled: true, 
        text: "Window Closed", 
        classes: "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed",
        status: "Overdue"
      };
    }

    if (!auditWindow.isOpen) {
      return { 
        disabled: true, 
        text: `Opens ${auditWindow.windowStart.toLocaleDateString()}`, 
        classes: "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed",
        status: "Not Started"
      };
    }
    
    return { 
      disabled: false, 
      text: "Audit Device", 
      classes: "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-sm",
      status: "Ready for Inspection"
    };
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('in progress')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('open') || s.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('re-inspection')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s.includes('resolved') || s.includes('closed') || s.includes('approved')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Connecting real-time database...</p>
      </div>
    );
  }

  if (!isAuthorized) return null; 

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, {formatDisplayName(currentUser.name)} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm font-semibold text-slate-500">
              <span className="text-blue-700 font-bold uppercase tracking-wider px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-200/60">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors relative cursor-pointer">
                <Bell size={20} className="text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    <button onClick={markAllAsRead} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline cursor-pointer">Mark all read</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 font-medium">No recent notifications.</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-4 border-b border-slate-50 text-sm ${notif.is_read ? 'bg-white opacity-60' : 'bg-blue-50/30'}`}>
                          <p className="font-bold text-slate-900">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={loadRealDatabase} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-200 shrink-0 cursor-pointer">
              <RefreshCw size={14}/> Sync Feeds
            </button>
          </div>
        </div>

        {activeReInspections.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top-4">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0"><AlertTriangle size={20} /></div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 uppercase tracking-widest mb-1">Re-Inspection Required</h4>
              <p className="text-xs text-rose-700 mb-2">An administrator has returned your recent inspection for review.</p>
              <div className="bg-white/60 p-3 rounded-xl border border-rose-100 text-xs text-rose-900 font-medium">
                <span className="font-bold">Admin Remarks: </span> 
                {activeReInspections[0].admin_remarks || "No reason provided. Please retake photos clearly."}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'Hardware or IT failure', icon: TicketIcon, color: 'text-blue-600 bg-blue-50 border-blue-100', type: 'TICKET' },
            { name: 'Device Audit', desc: 'Submit asset inspection', icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50 border-amber-100', type: 'INSPECTION' },
            { name: 'Request Gear', desc: 'Ask for new equipment', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', type: 'REQUEST' },
            { name: 'Replacement', desc: 'Swap faulty hardware', icon: RefreshCw, color: 'text-purple-600 bg-purple-50 border-purple-100', type: 'REPLACEMENT' },
          ].map((item) => (
            <button 
              key={item.name} 
              onClick={() => {
                if ((item.type === 'INSPECTION' || item.type === 'REPLACEMENT') && assignedAssets.length === 0) {
                  alert(`Action cancelled: There are no hardware assets currently assigned to your profile to complete a ${item.name.toLowerCase()}.`);
                  return;
                }
                setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] || undefined });
              }} 
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 hover:shadow-md transition-all text-left flex items-start gap-4 group cursor-pointer w-full"
            >
              <div className={`p-3.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${item.color}`}><item.icon size={22} /></div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Units</p>
            <h2 className="text-3xl font-black text-slate-900 mt-1">{assignedAssets.length}</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Review</p>
            <h2 className="text-3xl font-black text-amber-600 mt-1">{pendingInspectionsCount}</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Re-Inspections</p>
            <h2 className="text-3xl font-black text-rose-600 mt-1">{activeReInspections.length}</h2>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open Tickets</p>
            <h2 className="text-3xl font-black text-indigo-600 mt-1">{openTixCount}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800"><Laptop className="text-blue-600 shrink-0" size={18}/> My Hardware Units</div>
              <span className="text-xs font-bold text-slate-400">{assignedAssets.length} Total</span>
            </div>
            
            {assignedAssets.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium text-xs">No active machines linked to your ID.</div>
            ) : (
              assignedAssets.map(asset => {
                const auditState = getAssetAuditState(asset); 
                const latestInsp = allInspections.find(i => i.asset_id === asset.id);

                return (
                  <div key={asset.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{asset.name || 'Generic Device'}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Tag: {asset.asset_tag} • S/N: {asset.serial_number}</p>
                      </div>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${getStatusBadge(auditState.status)}`}>
                        {auditState.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
                      <div className="text-xs text-slate-500 font-medium space-y-1">
                        <p>Last Audited: <strong className="text-slate-800">{latestInsp ? new Date(latestInsp.created_at).toLocaleDateString() : 'Never'}</strong></p>
                        <p>Next Due: <strong className="text-slate-800">{auditWindow.lastSaturday.toLocaleDateString()}</strong></p>
                      </div>
                      
                      <button 
                        disabled={auditState.disabled}
                        onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                        className={`px-5 py-2.5 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all text-center ${auditState.classes}`}
                      >
                        {auditState.text}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800"><TicketIcon className="text-indigo-600 shrink-0" size={18}/> My Service Tickets</div>
              <span className="text-xs font-bold text-slate-400">{myTickets.length} Raised</span>
            </div>
            {myTickets.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium text-xs">No service requests submitted yet.</div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {myTickets.map(tix => (
                  <div key={tix.id} className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-colors bg-white flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 leading-snug">{tix.title}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shrink-0 ${getStatusBadge(tix.status)}`}>
                        {tix.status || 'Open'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-600 line-clamp-2 font-medium">{tix.description}</p>
                    
                    {tix.admin_notes && (
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/80 flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-blue-600"/> Support Update
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {tix.updated_at ? new Date(tix.updated_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium italic">"{tix.admin_notes}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-medium">
                      <span>Category: <strong className="text-slate-600 font-semibold">{tix.category}</strong></span>
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
        <LiveDatabaseModal 
          type={modal.type} 
          asset={modal.targetAsset} 
          user={currentUser} 
          onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(); }} 
        />
      )}
    </div>
  );
}

interface LiveDatabaseModalProps {
  type: string;
  asset?: Asset;
  user: StaffUser;
  onClose: () => void;
}

function LiveDatabaseModal({ type, asset, user, onClose }: LiveDatabaseModalProps) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Laptop / Main Workstation');
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  const handleAttemptUnlock = () => {
    if (!asset) { alert("No hardware assigned target recognized!"); return; }
    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number || '').toLowerCase() || typed === (asset.asset_tag || '').toLowerCase()) {
      setLockError(false); 
      setIsUnlocked(true);
    } else {
      setLockError(true);
    }
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `tickets/${user.emp_id || 'staff'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('tickets').getPublicUrl(filePath);
      setScreenshotUrl(data.publicUrl);
    } catch (err: any) {
      console.error("Upload error:", err.message);
      alert("Failed to attach screenshot, but you can still submit the ticket without it.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleLivePostgresSubmit = async () => {
    if ((type === 'TICKET') && !formTitle.trim()) {
      alert("Please specify a descriptive ticket title summary.");
      return;
    }
    if (!formText.trim()) {
      alert("Please populate notes/description tracking data fields.");
      return;
    }

    if (type === 'INSPECTION' && asset) {
      const url = `${window.location.origin}/mobile-audit?assetId=${asset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(asset?.category || 'Hardware')}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(formText)}`;
      setQrUrl(url); 
      setShowQR(true); 
      return;
    }

    setIsTransmitting(true);
    try {
      if (type === 'TICKET' || type === 'REQUEST' || type === 'REPLACEMENT') {
        let generatedTitle = formTitle;
        if (type === 'REQUEST') generatedTitle = `Request: ${formCategory}`;
        if (type === 'REPLACEMENT') generatedTitle = `Replacement Request: ${asset?.name || 'Assigned Device'}`;

        await supabase.from('tickets').insert({
          title: generatedTitle,
          category: formCategory,
          description: formText,
          status: 'Open',
          created_by: user.email,
          emp_code: user.emp_id,
          staff_name: user.name,
          screenshot_attachment: screenshotUrl 
        });
      }
      setSuccessDone(true);
      setTimeout(() => onClose(), 1200);
    } catch (e: any) { 
      alert(`Error Syncing Transaction: ${e.message}`); 
    } finally { 
      setIsTransmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 font-bold"><TicketIcon size={20}/></div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">
                {type === 'TICKET' ? 'Raise Support Ticket' : type === 'INSPECTION' ? 'Device Audit Portal' : type === 'REQUEST' ? 'Request Equipment' : 'Request Replacement'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer transition-colors"><X size={18}/></button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
          {successDone ? (
            <div className="py-10 text-center">
              <CheckCircle size={48} className="text-emerald-600 mx-auto animate-bounce"/>
              <h4 className="text-xl font-bold mt-2">Saved Successfully!</h4>
            </div>
          ) : showQR ? (
            <div className="py-6 text-center space-y-6">
              <h4 className="text-lg font-black text-slate-900 uppercase">Mobile Device Handoff</h4>
              <p className="text-xs text-slate-500">Scan this code with your phone to take watermarked photos.</p>
              <div className="p-4 bg-white border-2 border-slate-200 rounded-3xl inline-block shadow-lg mx-auto">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Scan QR" className="w-48 h-48 rounded-xl"/>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {needsLock && (
                <div className={`p-4 rounded-xl border transition-colors ${lockError ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-xs font-bold mb-2 ${lockError ? 'text-rose-900' : 'text-blue-900'}`}>
                    {lockError ? '❌ Verification Failed. Incorrect Value.' : '🔒 Security Verification Required'}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2">Please enter the exact Serial Number or Asset Tag for device: <strong>{asset?.name}</strong></p>
                  <div className="flex gap-2">
                    <input 
                      disabled={isUnlocked} 
                      value={serialInput} 
                      onChange={e => setSerialInput(e.target.value)} 
                      placeholder="Type exact Tag ID or S/N..." 
                      className="flex-1 p-3 rounded-xl border text-xs bg-white outline-none"
                    />
                    {!isUnlocked && (
                      <button onClick={handleAttemptUnlock} className="px-5 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-blue-700 transition-colors">
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isUnlocked && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {type === 'TICKET' && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Issue Title Summary</label>
                      <input 
                        type="text" 
                        value={formTitle} 
                        onChange={e => setFormTitle(e.target.value)} 
                        placeholder="e.g., Screen display flickering, keys broken..." 
                        className="w-full p-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 transition-all font-medium bg-white"
                      />
                    </div>
                  )}

                  {(type === 'TICKET' || type === 'REQUEST') && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Hardware Category</label>
                      <select 
                        value={formCategory} 
                        onChange={e => setFormCategory(e.target.value)} 
                        className="w-full p-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 font-semibold bg-white"
                      >
                        <option value="Laptop / Main Workstation">Laptop / Main Workstation</option>
                        <option value="Headphone">Headphone</option>
                        <option value="Monitor / Display">Monitor / Display</option>
                        <option value="Keyboard / Mouse Accessory">Keyboard / Mouse Accessory</option>
                        <option value="Other / Unlisted Device">Other / Unlisted Device</option>
                      </select>
                    </div>
                  )}

                  {type === 'INSPECTION' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Device Physical State</label>
                      <select 
                        value={formCondition} 
                        onChange={e => setFormCondition(e.target.value)} 
                        className="w-full p-3.5 rounded-xl border text-sm outline-none focus:border-blue-500 font-semibold bg-white"
                      >
                        <option value="Pristine / Flawless">Pristine / Flawless</option>
                        <option value="Good">Good / Standard Superficial Wear</option>
                        <option value="Poor">Poor / Damaged (Requires Evaluation)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                      {type === 'INSPECTION' ? 'Audit Inspection Notes' : type === 'TICKET' ? 'Detailed Issue Description' : 'Justification Remarks / Reasoning'}
                    </label>
                    <textarea 
                      rows={3} 
                      value={formText} 
                      onChange={e => setFormText(e.target.value)} 
                      placeholder={type === 'TICKET' ? 'Provide comprehensive details for operations reviews...' : 'Add diagnostic evaluation notes...'}
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500 transition-all bg-white resize-none"
                    />
                  </div>

                  {type === 'TICKET' && (
                    <div className="pt-1">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                        Upload Screenshot <span className="text-slate-400 font-medium lowercase italic">(optional)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleScreenshotChange} 
                          id="screenshot-file" 
                          className="hidden" 
                        />
                        <label 
                          htmlFor="screenshot-file" 
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer transition-colors"
                        >
                          {uploadingFile ? 'Uploading...' : 'Choose File'}
                        </label>
                        <span className="text-xs text-slate-500 truncate font-semibold">
                          {screenshotUrl ? '✓ Ready to attach image' : 'No image attached'}
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>

        {!successDone && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            {!showQR && (
              <button 
                disabled={isTransmitting || (needsLock && !isUnlocked) || uploadingFile} 
                onClick={handleLivePostgresSubmit} 
                className="px-7 py-3 rounded-xl text-xs font-bold bg-blue-600 text-white cursor-pointer hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isTransmitting ? (
                  <Loader2 className="animate-spin mx-auto" size={14}/>
                ) : type === 'INSPECTION' ? (
                  'Generate Camera QR'
                ) : (
                  'Submit Request'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}