'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useNotifications } from '@/hooks/useNotifications';
import { Asset, Inspection, Ticket } from '@/types';

// 🌟 DEFINITIVE IMPORT LIST
import { 
  AlertTriangle,
  Laptop, 
  ClipboardCheck, 
  Ticket as TicketIcon, 
  PlusCircle, 
  RefreshCw, 
  AlertCircle, 
  X, 
  Loader2, 
  CheckCircle, 
  Camera, 
  Bell
} from 'lucide-react';

// --- DATE ENGINE ---
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false); 
  
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [allInspections, setAllInspections] = useState<Inspection[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  
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
        router.replace('/admin');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      
      if (!profile || profile.status === 'Disabled') {
        alert("Access Terminated.");
        router.replace('/');
        return;
      }

      const user = {
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
      if (ticketsRes.data) setMyTickets(ticketsRes.data as Ticket[]);

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
    if (s.includes('open') || s.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('re-inspection')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s.includes('resolved') || s.includes('approved')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
        
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, {formatDisplayName(currentUser.name)} 👋
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadRealDatabase} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-200 cursor-pointer">
              <RefreshCw size={14}/> Sync
            </button>
          </div>
        </div>

        {activeReInspections.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-4">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-full shrink-0"><AlertTriangle size={20} /></div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 uppercase">Re-Inspection Required</h4>
              <p className="text-xs text-rose-700">An administrator has returned your recent inspection for review.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', icon: TicketIcon, type: 'TICKET' },
            { name: 'Device Audit', icon: ClipboardCheck, type: 'INSPECTION' },
          ].map((item) => (
            <button key={item.name} onClick={() => setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] })} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left flex items-start gap-4 cursor-pointer">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><item.icon size={22} /></div>
              <h3 className="font-bold text-sm text-slate-900">{item.name}</h3>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <h3 className="font-bold text-sm mb-4">My Hardware Units</h3>
            {assignedAssets.map(asset => {
              const auditState = getAssetAuditState(asset); 
              return (
                <div key={asset.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm">{asset.name}</h4>
                    <p className="text-xs text-slate-500">Tag: {asset.asset_tag}</p>
                  </div>
                  <button 
                    disabled={auditState.disabled}
                    onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                    className={`px-4 py-2 font-bold text-[10px] rounded-xl ${auditState.classes}`}
                  >
                    {auditState.text}
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full">
                <h3 className="text-lg font-black mb-6 uppercase">Submission Portal</h3>
                {modal.type === 'INSPECTION' ? (
                     <div className="text-center">
                        <p className="mb-6 text-sm">Please scan the QR code to proceed with the device audit.</p>
                        <button onClick={() => setModal({ isOpen: false, type: '' })} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold">Close Portal</button>
                     </div>
                ) : (
                    <button onClick={() => setModal({ isOpen: false, type: '' })} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold">Close</button>
                )}
            </div>
        </div>
      )}
    </div>
  );
}