'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, 
  RefreshCw, AlertCircle, Clock, X, Upload, CheckCircle, 
  ShieldCheck, Loader2, Calendar, CheckCircle2, 
  Hourglass, AlertTriangle, Package, Bell
} from 'lucide-react';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF', id: '' });
  
  // LIVE DATABASE FEEDS
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myPastInspections, setMyPastInspections] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, inRepair: 0 });

  // UI State
  const [activeTab, setActiveTab] = useState<'assets' | 'inspections' | 'tickets' | 'requests'>('assets');
  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({
    isOpen: false,
    type: '',
  });

  const loadRealDatabase = async () => {
    try {
      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { router.replace('/'); return; }

      let user: any = {};
      try { user = JSON.parse(sessionStr); } 
      catch (e) { user = { name: sessionStr.split('@')[0], email: sessionStr }; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('email', user.email).maybeSingle();
      if (profile) {
        user.emp_id = profile.emp_code || profile.emp_id || profile.id.split('-')[0].toUpperCase();
        user.name = profile.full_name || profile.name || user.name;
        user.id = profile.id;
      } else {
        user.emp_id = user.emp_id || 'UNKNOWN';
      }
      
      setCurrentUser(user);

      const [assetsRes, inspRes, ticketsRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*, assets(asset_name, asset_tag)').eq('inspected_by', user.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').or(`created_by.eq.${user.id},created_by.eq.${user.emp_id}`).order('created_at', { ascending: false })
      ]);

      if (assetsRes.data) {
        setAssignedAssets(assetsRes.data);
        const needsInsp = assetsRes.data.filter(a => a.inspection_status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'overdue' || a.inspection_status?.toLowerCase() === 're-inspection').length;
        const inRep = assetsRes.data.filter(a => a.status?.toLowerCase() === 'in repair').length;
        setStats({ totalAssets: assetsRes.data.length, needsInspection: needsInsp, inRepair: inRep });
      }

      if (inspRes.data) setMyPastInspections(inspRes.data);

      if (ticketsRes.data) {
        const requests = ticketsRes.data.filter(t => t.title?.includes('Allocation') || t.category?.includes('Request'));
        const support = ticketsRes.data.filter(t => !t.title?.includes('Allocation') && !t.category?.includes('Request'));
        setMyRequests(requests);
        setMyTickets(support);
      }

    } catch (err) {
      console.error("Postgres feed error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRealDatabase(); }, []);

  const calculateTurnaround = (createdAt: string, closedAt: string, status: string) => {
    const start = new Date(createdAt).getTime();
    const isClosed = status?.toLowerCase() === 'closed' || status?.toLowerCase() === 'resolved' || status?.toLowerCase() === 'approved';
    const end = isClosed ? new Date(closedAt || new Date()).getTime() : new Date().getTime();
    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today (< 24h)';
    return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
  };

  const calculateUpcomingDate = (dateStr: string) => {
    if (!dateStr) return 'Pending Setup';
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Syncing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {currentUser.name}! 👋
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-slate-500">
              <span className="text-blue-700 font-black uppercase tracking-widest px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-100">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <button onClick={() => loadRealDatabase()} className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-slate-200 shadow-sm">
            <RefreshCw size={16}/> Sync Data
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'RAISE TICKET', icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:border-blue-300', type: 'TICKET' },
            { name: 'SUBMIT INSPECTION', icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50', hover: 'hover:border-amber-300', type: 'INSPECTION' },
            { name: 'REQUEST ASSET', icon: PlusCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:border-emerald-300', type: 'REQUEST' },
            { name: 'ASSETS REPLACEMENT', icon: RefreshCw, color: 'text-pink-600', bg: 'bg-pink-50', hover: 'hover:border-pink-300', type: 'REPLACEMENT' },
          ].map((action) => (
            <button key={action.name} onClick={() => {
              const target = assignedAssets.length > 0 ? assignedAssets[0] : null;
              setModal({ isOpen: true, type: action.type, targetAsset: target });
            }} className={`bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer ${action.hover}`}>
              <div className={`w-14 h-14 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}><action.icon size={26} /></div>
              <span className="text-xs font-black text-slate-900 tracking-wider uppercase text-center">{action.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">MY ASSETS</p><h2 className="text-4xl font-black text-slate-900 mt-1">{stats.totalAssets}</h2></div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Laptop size={26} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">NEEDS INSPECTION</p><h2 className="text-4xl font-black text-orange-600 mt-1">{stats.needsInspection}</h2></div>
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center"><AlertCircle size={26} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">IN REPAIR</p><h2 className="text-4xl font-black text-pink-600 mt-1">{stats.inRepair}</h2></div>
            <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center"><Clock size={26} /></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/50 custom-scrollbar">
            {[
              { id: 'assets', name: 'My Assigned Assets', icon: Laptop, count: assignedAssets.length },
              { id: 'inspections', name: 'Inspection Records', icon: ClipboardCheck, count: myPastInspections.length },
              { id: 'tickets', name: 'Support Tickets', icon: Ticket, count: myTickets.length },
              { id: 'requests', name: 'Asset Requests', icon: Package, count: myRequests.length },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-6 py-5 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <tab.icon size={18} /> {tab.name}
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] ${activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'assets' && (
            <div className="p-6 md:p-8 space-y-5 bg-white">
              {assignedAssets.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold text-sm">No hardware units currently assigned to you.</div>
              ) : (
                assignedAssets.map((asset) => {
                  const isOverdue = asset.status?.toLowerCase() === 'overdue' || asset.inspection_status?.toLowerCase() === 'pending' || asset.inspection_status?.toLowerCase() === 're-inspection';
                  
                  return (
                    <div key={asset.id} className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 space-y-5 hover:border-blue-300 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">{asset.asset_name || asset.model}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-sm font-mono font-bold text-slate-500">S/N: {asset.serial_number || 'N/A'}</span>
                            <span className="text-xs font-mono font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">{asset.asset_tag}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-black uppercase tracking-wider">{asset.status}</span>
                          {isOverdue && <span className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">ACTION REQUIRED</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                          <Clock className="text-slate-400 shrink-0" size={20} />
                          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Audited</p><p className="text-sm font-black text-slate-800 mt-0.5">{asset.last_inspection_date ? new Date(asset.last_inspection_date).toLocaleDateString('en-IN') : 'Pending Initial Setup'}</p></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                          <Calendar className="text-slate-400 shrink-0" size={20} />
                          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Due Date</p><p className="text-sm font-black text-blue-700 mt-0.5">{calculateUpcomingDate(asset.last_inspection_date || asset.created_at)}</p></div>
                        </div>
                        <button onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl py-4 transition-colors flex items-center justify-center cursor-pointer shadow-md">
                          {isOverdue ? 'START INSPECTION NOW' : 'SUBMIT EARLY AUDIT'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'inspections' && (
            <div className="p-6 md:p-8 bg-white space-y-4">
              {myPastInspections.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold text-sm">No past inspection logs found.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myPastInspections.map((log: any) => {
                    const st = (log.status || '').toLowerCase();
                    const isApproved = st.includes('approved') || st.includes('pass');
                    const isRejected = st.includes('reject') || st.includes('not');

                    return (
                      <div key={log.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-5 hover:shadow-sm transition-all">
                        <div className="space-y-1.5">
                          <h4 className="text-base font-black text-slate-900">{log.assets?.asset_name || 'Hardware Unit'}</h4>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <span className="font-mono text-blue-600">{log.assets?.asset_tag || 'NO-TAG'}</span>
                            <span>•</span>
                            <span className="uppercase tracking-widest">Sub: {new Date(log.created_at).toLocaleDateString('en-IN')}</span>
                          </div>
                          <p className="text-xs italic text-slate-500 pt-1 font-medium">"{log.notes || 'No description provided'}"</p>
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Audit Due</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">{isApproved ? calculateUpcomingDate(log.created_at) : 'N/A'}</p>
                          </div>
                          <div className={`px-5 py-2.5 rounded-xl flex items-center gap-2 border ${
                            isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isApproved ? <CheckCircle2 size={18}/> : isRejected ? <AlertTriangle size={18}/> : <Hourglass size={18}/>}
                            <span className="text-xs font-black uppercase tracking-widest">{log.status || 'Pending'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="p-6 md:p-8 bg-white space-y-4">
              <div className="flex justify-end mb-4">
                <button onClick={() => setModal({ isOpen: true, type: 'TICKET' })} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md cursor-pointer flex items-center gap-2 transition-colors">
                  <PlusCircle size={16}/> Raise New Ticket
                </button>
              </div>

              {myTickets.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold text-sm">You have no active or past IT support tickets.</div>
              ) : (
                <div className="space-y-4">
                  {myTickets.map(ticket => {
                    const isClosed = ticket.status?.toLowerCase() === 'closed' || ticket.status?.toLowerCase() === 'resolved';
                    return (
                      <div key={ticket.id} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">{ticket.category}</span>
                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${isClosed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {ticket.status || 'Open'}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-slate-900 leading-tight">{ticket.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ticket.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raised On</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{new Date(ticket.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="w-px h-8 bg-slate-200"></div>
                          <div className="text-left min-w-[80px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turnaround</p>
                            <p className={`text-xs font-black mt-0.5 ${isClosed ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {calculateTurnaround(ticket.created_at, ticket.updated_at, ticket.status)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="p-6 md:p-8 bg-white space-y-4">
              <div className="flex justify-end mb-4">
                <button onClick={() => setModal({ isOpen: true, type: 'REQUEST' })} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md cursor-pointer flex items-center gap-2 transition-colors">
                  <PlusCircle size={16}/> Request Hardware
                </button>
              </div>

              {myRequests.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-bold text-sm">No hardware requests submitted.</div>
              ) : (
                <div className="space-y-4">
                  {myRequests.map(req => {
                    const isClosed = req.status?.toLowerCase() === 'closed' || req.status?.toLowerCase() === 'approved';
                    return (
                      <div key={req.id} className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl shadow-sm hover:border-emerald-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded text-[10px] font-black uppercase tracking-widest border border-emerald-200">{req.category} Request</span>
                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${isClosed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {req.status || 'Pending Approval'}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-slate-900 leading-tight">{req.title.replace('New Asset Allocation: ', '')}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">Justification: {req.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-5 bg-white p-4 rounded-2xl border border-slate-200 shrink-0">
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested</p>
                            <p className="text-xs font-bold text-slate-800 mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="w-px h-8 bg-slate-200"></div>
                          <div className="text-left min-w-[80px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wait Time</p>
                            <p className={`text-xs font-black mt-0.5 ${isClosed ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {calculateTurnaround(req.created_at, req.updated_at, req.status)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

function LiveDatabaseModal({ type, asset, user, onClose }: any) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  useEffect(() => {
    if (type === 'REQUEST') setFormCategory('Laptop');
    else if (type === 'TICKET') setFormCategory('Hardware');
  }, [type]);

  const handleAttemptUnlock = () => {
    if (!asset) { alert("Please assign an asset to this profile first!"); return; }
    const typed = serialInput.trim().toLowerCase();
    const sn = (asset?.serial_number || '').toLowerCase();
    const tag = (asset?.asset_tag || '').toLowerCase();

    if (typed === sn || typed === tag) {
      setLockError(false);
      setIsUnlocked(true);
    } else setLockError(true);
  };

  const handleLivePostgresSubmit = async () => {
    setIsTransmitting(true);
    try {
      if (type === 'TICKET' || type === 'REQUEST') {
        // 🚨 BULLETPROOF FALLBACK FOR EMP_CODE
        const safeEmpCode = user.emp_id || user.emp_code || 'EMP-UNKNOWN';
        const safeEmail = user.email || 'unknown@domain.com';

        const ticketPayload = {
          title: formTitle || (type === 'REQUEST' ? `Asset Request: ${formCategory}` : 'IT Service Ticket'),
          category: type === 'REQUEST' ? `Hardware Request` : formCategory,
          description: formText || 'No details provided.',
          status: 'Open',
          created_by: user.id,
          emp_code: safeEmpCode, 
          user_email: safeEmail
        };

        const { error } = await supabase.from('tickets').insert([ticketPayload]);
        
        if (error) {
          console.error("Database Rejection:", error);
          alert(`Database error: ${error.message}`);
          setIsTransmitting(false);
          return;
        }
      } 
      else if (type === 'INSPECTION' || type === 'REPLACEMENT') {
        const { error } = await supabase.from('inspections').insert({
          asset_id: asset.id,
          inspected_by: user.id,
          user_email: user.email,
          emp_code: user.emp_id || 'UNKNOWN', 
          condition: formCondition,
          notes: formText || `Submitted via ${type}`,
          status: 'Pending'
        });

        if (error) throw error;

        await supabase.from('assets').update({
          inspection_status: 'Pending',
          status: type === 'REPLACEMENT' ? 'Replacement Requested' : 'Assigned'
        }).eq('id', asset.id);
      }

      setSuccessDone(true);
      setTimeout(() => onClose(), 1500);

    } catch (e: any) {
      console.error("DB write failed:", e);
      alert(`Submission Failed: ${e.message}`);
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in text-left font-sans text-slate-900">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${type === 'TICKET' ? 'bg-blue-100 text-blue-600 border-blue-200' : type === 'REQUEST' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : type === 'INSPECTION' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-pink-100 text-pink-600 border-pink-200'}`}>
                {type === 'TICKET' && <Ticket size={20} />}
                {type === 'REQUEST' && <PlusCircle size={20} />}
                {type === 'INSPECTION' && <ClipboardCheck size={20} />}
                {type === 'REPLACEMENT' && <RefreshCw size={20} />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm tracking-widest uppercase">
                {type === 'TICKET' && 'RAISE IT SERVICE TICKET'}
                {type === 'REQUEST' && 'REQUEST ASSET ALLOCATION'}
                {type === 'INSPECTION' && 'COMPLIANCE POP-UP FRAMEWORK'}
                {type === 'REPLACEMENT' && 'ASSET REPLACEMENT FRAMEWORK'}
              </h3>
              {asset?.asset_name && type !== 'REQUEST' && type !== 'TICKET' && <p className="text-[11px] font-bold text-slate-500 mt-1">{asset.asset_name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center border border-slate-200 cursor-pointer transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {successDone ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-24 h-24 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce shadow-sm"><CheckCircle size={48} /></div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">Transmission Secured!</h4>
              <p className="text-sm font-bold text-slate-500">Your record has been written to the live Postgres database.</p>
            </div>
          ) : (

            <div className="space-y-6">
              {needsLock && (
                <div className="space-y-4">
                  <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200 text-xs font-bold text-blue-900 flex gap-3 leading-relaxed shadow-sm">
                    <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20} />
                    <div><span className="font-black">SECURITY ANTI-WRONG GUARD:</span> Please enter this machine's exact Tag ID or Serial Number parameter to unlock configuration fields.</div>
                  </div>

                  <div className="flex gap-3">
                    <input disabled={isUnlocked} value={serialInput} onChange={e => { setSerialInput(e.target.value); setLockError(false); }} placeholder="Type Tag ID or Serial Number..." className={`flex-1 p-4 rounded-xl border text-sm font-black outline-none transition-colors ${lockError ? 'border-red-500 bg-red-50/20 text-red-900' : isUnlocked ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} />
                    {!isUnlocked && (
                      <button onClick={handleAttemptUnlock} className="bg-slate-900 hover:bg-slate-800 text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer shadow-md transition-colors">
                        VERIFY
                      </button>
                    )}
                  </div>
                  {lockError && <p className="text-[11px] font-black text-red-500 pl-1">❌ Mismatch. Look at the sticker on the bottom of your device.</p>}
                </div>
              )}

              {type === 'REQUEST' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Select Asset Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full p-4 rounded-2xl border border-emerald-500 text-sm font-black bg-emerald-50/10 text-emerald-900 outline-none shadow-sm cursor-pointer transition-colors focus:ring-4 focus:ring-emerald-500/20">
                      <option>Laptop</option><option>Headphone</option><option>Keyboard</option><option>Mouse</option><option>Cleaning Kits</option><option>Mouse Pad</option><option>Stand</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Allocation Justification</label>
                    <textarea rows={4} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Explain why this equipment allocation is required..." className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:border-emerald-600 focus:bg-white transition-colors" />
                  </div>
                </div>
              )}

              {type === 'TICKET' && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">What is the issue title?</label>
                    <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Describe the issue briefly" className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm font-black outline-none transition-colors" />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Select Category Type</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full p-4 rounded-2xl border border-blue-500 text-sm font-black bg-blue-50/10 text-blue-900 outline-none shadow-sm cursor-pointer transition-colors focus:ring-4 focus:ring-blue-500/20">
                      <option>Hardware</option><option>Software</option><option>Internet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Brief Notes & Explanations</label>
                    <textarea rows={3} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Explain the problem details..." className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm font-bold outline-none transition-colors" />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Share Error Screenshot (Optional)</label>
                    <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 cursor-pointer group transition-colors">
                      <Upload className="group-hover:text-blue-600 mb-3 transition-colors" size={28} />
                      <span className="text-[11px] font-black text-slate-500 group-hover:text-blue-700 tracking-wider">UPLOAD SNAPSHOT</span>
                    </div>
                  </div>
                </div>
              )}

              {(type === 'INSPECTION' || type === 'REPLACEMENT') && (
                <div className={`space-y-6 transition-all duration-300 ${!isUnlocked ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Device Physical Condition</label>
                    <select value={formCondition} onChange={e => setFormCondition(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm font-black outline-none cursor-pointer transition-colors">
                      <option>Pristine / Flawless</option><option>Normal Wear & Scratches</option><option>Damaged / Cracked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">Declaration Notes & Reason</label>
                    <textarea rows={4} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Provide explanation details..." className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm font-bold outline-none transition-colors" />
                  </div>
                </div>
              )}
            </div>

          )}
        </div>

        {!successDone && (
          <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-3xl">
            <button onClick={onClose} className="px-8 py-4 text-xs font-black tracking-widest uppercase text-slate-500 hover:bg-white hover:text-slate-800 rounded-xl cursor-pointer border border-transparent hover:border-slate-200 transition-colors">Cancel Process</button>
            <button 
              disabled={isTransmitting || (needsLock && !isUnlocked)}
              onClick={handleLivePostgresSubmit} 
              className={`px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${needsLock && !isUnlocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : type === 'REQUEST' ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/20'}`}
            >
              {isTransmitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {type === 'TICKET' && 'SUBMIT IT TICKET'}
              {type === 'REQUEST' && 'DISPATCH REQUEST'}
              {(type === 'INSPECTION' || type === 'REPLACEMENT') && 'SUBMIT VERIFICATION'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}