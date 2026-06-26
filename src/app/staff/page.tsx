'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, Upload, CheckCircle2, AlertTriangle, 
  Loader2, Calendar, CheckCircle, ArrowUpRight, HelpCircle
} from 'lucide-react';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, openTickets: 0 });

  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({
    isOpen: false,
    type: '',
  });

  // 🌟 SMART NAME FORMATTER: Turns "meenakshi.bi" into "Meenakshi"
  const formatDisplayName = (raw: string) => {
    if (!raw) return 'Staff Member';
    let s = raw.split('@')[0];       // Strip email domain
    s = s.split('.')[0];             // Chop off ".bi" or ".vss"
    s = s.replace(/[_-]/g, ' ');     // Clean up underscores/dashes
    return s.charAt(0).toUpperCase() + s.slice(1); // Capitalize first letter
  };

  const loadRealDatabase = async () => {
    try {
      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { router.replace('/'); return; }

      let user: any = {};
      try { user = JSON.parse(sessionStr); } 
      catch (e) { user = { name: sessionStr.split('@')[0], email: sessionStr }; }

      const cleanEmail = user.email?.toLowerCase().trim();

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      if (profile) {
        user.emp_id = profile.emp_code || profile.emp_id || 'STAFF';
        user.name = profile.full_name || profile.name || user.name;
        user.id = profile.id;
      } else {
        user.emp_id = 'STAFF-UNLINKED';
      }
      setCurrentUser(user);

      const [assetsRes, inspRes, ticketsRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false })
      ]);

      if (assetsRes.data) {
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
          ['pending', 're-inspection', 'overdue'].includes((a.live_inspection_status || '').toLowerCase())
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
    const ticketSubscription = supabase
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        loadRealDatabase();
      })
      .subscribe();

    return () => { supabase.removeChannel(ticketSubscription); };
  }, []);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'in progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Connecting live database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, {formatDisplayName(currentUser.name)} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm font-semibold text-slate-500">
              <span className="text-blue-700 font-bold uppercase tracking-wider px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-200/60">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <button onClick={loadRealDatabase} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-200 shrink-0 cursor-pointer">
            <RefreshCw size={14}/> Sync Feeds
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'Hardware or IT failure', icon: Ticket, color: 'text-blue-600 bg-blue-50 border-blue-100', type: 'TICKET' },
            { name: 'Device Audit', desc: 'Submit asset inspection', icon: ClipboardCheck, color: 'text-amber-600 bg-amber-50 border-amber-100', type: 'INSPECTION' },
            { name: 'Request Gear', desc: 'Ask for new equipment', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', type: 'REQUEST' },
            { name: 'Replacement', desc: 'Swap faulty hardware', icon: RefreshCw, color: 'text-purple-600 bg-purple-50 border-purple-100', type: 'REPLACEMENT' },
          ].map((item) => (
            <button key={item.name} onClick={() => setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] })} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all text-left flex items-start gap-4 group cursor-pointer">
              <div className={`p-3.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${item.color}`}><item.icon size={22} /></div>
              <div><h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</h3><p className="text-xs font-medium text-slate-500 mt-0.5">{item.desc}</p></div>
            </button>
          ))}
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
              assignedAssets.map(asset => (
                <div key={asset.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{asset.asset_name || 'Generic Device'}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Tag: {asset.asset_tag} • S/N: {asset.serial_number || 'N/A'}</p>
                  </div>
                  <button onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shrink-0 text-center cursor-pointer">
                    Audit Device
                  </button>
                </div>
              ))
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

// ARMORED TRANSACTION MODAL
function LiveDatabaseModal({ type, asset, user, onClose }: any) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  const handleAttemptUnlock = () => {
    if (!asset) { alert("No hardware assigned to test against!"); return; }
    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number||'').toLowerCase() || typed === (asset.asset_tag||'').toLowerCase()) {
      setLockError(false); setIsUnlocked(true);
    } else setLockError(true);
  };

  const handleLivePostgresSubmit = async () => {
    setIsTransmitting(true);
    let submitError = null; 

    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const finalEmp = user.emp_id || 'STAFF';

      // 🌟 Clean up the human name safely before sending to Postgres
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
      } else if (type === 'INSPECTION' || type === 'REPLACEMENT') {
        const { error: inspError } = await supabase.from('inspections').insert({
          asset_id: asset.id, inspected_by: user.id || user.emp_id, user_email: cleanEmail,
          condition: formCondition, notes: formText || `Submitted ${type}`, status: 'Pending'
        });
        submitError = inspError;
        
        if (!inspError) {
          await supabase.from('assets').update({
            inspection_status: 'Pending', status: type === 'REPLACEMENT' ? 'Replacement Requested' : 'Assigned'
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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 font-bold"><Ticket size={20}/></div>
            <div><h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">Portal Submission</h3><p className="text-xs text-slate-500 font-medium">{type}</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"><X size={18}/></button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
          {successDone ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle size={48} className="text-emerald-600 mx-auto animate-bounce"/>
              <h4 className="text-xl font-bold text-slate-900">Database Updated!</h4>
            </div>
          ) : (
            <div className="space-y-4 text-sm font-medium">
              {needsLock && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                  <p className="text-xs font-bold text-blue-900">🔒 Security Verification Required</p>
                  <div className="flex gap-2">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder="Type exact Tag ID or S/N..." className="flex-1 p-3 bg-white rounded-xl border border-blue-200 text-xs font-bold outline-none"/>
                    {!isUnlocked && <button onClick={handleAttemptUnlock} className="px-5 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer">Verify</button>}
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

              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Detailed Explanation</label><textarea rows={3} value={formText} onChange={e=>setFormText(e.target.value)} placeholder="Describe what happened..." className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:border-blue-600 text-sm"/></div>
            </div>
          )}
        </div>

        {!successDone && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 cursor-pointer">Cancel</button>
            <button disabled={isTransmitting || (needsLock && !isUnlocked)} onClick={handleLivePostgresSubmit} className="px-7 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2">
              {isTransmitting && <Loader2 size={14} className="animate-spin"/>} Transmit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}