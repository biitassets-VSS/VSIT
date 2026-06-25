'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, AlertCircle, Clock, X, Upload, CheckCircle, ShieldCheck, Loader2, Calendar, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, inRepair: 0 });
  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({ isOpen: false, type: '' });

  const loadRealDatabase = async () => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setCurrentUser({ name: 'Guest User', email: 'guest@vss.com', emp_id: 'GUEST-001', id: 'guest-id' });
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }

      let activeUser: any = { id: user.id, email: user.email, name: user.email?.split('@')[0], emp_id: 'PENDING' };

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (profile) {
        activeUser.emp_id = profile.emp_code || profile.id.split('-')[0].toUpperCase();
        activeUser.name = profile.full_name || activeUser.name;
      }
      setCurrentUser(activeUser);

      const [assetsRes, inspRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false })
      ]);

      if (assetsRes.data) {
        const compiledAssets = assetsRes.data.map(asset => {
          const latestInsp = (inspRes.data || []).find(i => i.asset_id === asset.id);
          return { ...asset, live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending', live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null };
        });

        setAssignedAssets(compiledAssets);
        const needsInsp = compiledAssets.filter(a => ['pending', 're-inspection'].includes(a.live_inspection_status?.toLowerCase()) || a.status?.toLowerCase() === 'overdue').length;
        const inRep = compiledAssets.filter(a => a.status?.toLowerCase() === 'in repair').length;
        setStats({ totalAssets: compiledAssets.length, needsInspection: needsInsp, inRepair: inRep });
      }
    } catch (err) {
      console.error("Database sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRealDatabase(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.replace('/');
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /><p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Syncing Dashboard...</p></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back, {currentUser.name}! 👋</h1>
            <div className="flex items-center gap-3 mt-2 text-sm font-semibold text-slate-500">
              <span className="text-blue-700 font-bold uppercase tracking-widest px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-100">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button onClick={() => loadRealDatabase()} className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-slate-200"><RefreshCw size={16}/> Sync</button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-rose-200"><LogOut size={16}/> Sign Out</button>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'RAISE TICKET', icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:border-blue-300', type: 'TICKET' },
            { name: 'SUBMIT INSPECTION', icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50', hover: 'hover:border-amber-300', type: 'INSPECTION' },
            { name: 'REQUEST ASSET', icon: PlusCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:border-emerald-300', type: 'REQUEST' },
            { name: 'ASSETS REPLACEMENT', icon: RefreshCw, color: 'text-pink-600', bg: 'bg-pink-50', hover: 'hover:border-pink-300', type: 'REPLACEMENT' },
          ].map((action) => (
            <button key={action.name} onClick={() => setModal({ isOpen: true, type: action.type, targetAsset: assignedAssets[0] })} className={`bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all flex flex-col items-center justify-center gap-3 group ${action.hover}`}>
              <div className={`w-14 h-14 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}><action.icon size={26} /></div>
              <span className="text-sm font-bold text-slate-900 tracking-wider uppercase text-center">{action.name}</span>
            </button>
          ))}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">MY ASSETS</p><h2 className="text-4xl font-black text-slate-900 mt-1">{stats.totalAssets}</h2></div><div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Laptop size={26} /></div></div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">NEEDS INSPECTION</p><h2 className="text-4xl font-black text-orange-600 mt-1">{stats.needsInspection}</h2></div><div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center"><AlertCircle size={26} /></div></div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">IN REPAIR</p><h2 className="text-4xl font-black text-pink-600 mt-1">{stats.inRepair}</h2></div><div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center"><Clock size={26} /></div></div>
        </div>

        {/* ASSETS VIEW */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><Laptop className="text-blue-600" size={22} /><h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">ASSIGNED ASSET DETAILS</h2></div>
          {assignedAssets.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 font-medium text-sm">No hardware units currently assigned to your profile.</div>
          ) : (
            assignedAssets.map((asset) => (
              <div key={asset.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 hover:border-blue-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{asset.asset_name}</h3>
                    <div className="flex items-center gap-2 mt-1"><span className="text-xs font-medium text-slate-500">S/N: {asset.serial_number || 'N/A'}</span><span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md">{asset.asset_tag}</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <button onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} className="w-full text-white font-bold text-xs uppercase tracking-widest rounded-xl py-3 bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center shadow-md">SUBMIT AUDIT</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modal.isOpen && <LiveDatabaseModal type={modal.type} asset={modal.targetAsset} user={currentUser} onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(); }} />}
    </div>
  );
}

// MODAL HANDLER
function LiveDatabaseModal({ type, asset, user, onClose }: any) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT';
  const [serialInput, setSerialInput] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  const handleLivePostgresSubmit = async () => {
    setIsTransmitting(true);
    try {
      const finalEmpCode = user.emp_id || 'STAFF';

      if (type === 'TICKET' || type === 'REQUEST') {
        await supabase.from('tickets').insert({
          title: type === 'REQUEST' ? `Asset Request: ${formCategory}` : formTitle || 'IT Service Ticket',
          subject: type === 'REQUEST' ? `Asset Request: ${formCategory}` : formTitle || 'IT Service Ticket',
          category: formCategory,
          description: formText || 'No description provided',
          note: formText || 'No description provided',
          status: 'Open',
          created_by: user.email,
          emp_code: finalEmpCode
        });
      }

      setSuccessDone(true);
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      alert("Failed to save data. Please check connection.");
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col font-sans max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-slate-900 text-sm tracking-widest uppercase">PORTAL SUBMISSION</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center border border-slate-200 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {successDone ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-sm"><CheckCircle size={48} /></div>
              <h4 className="text-2xl font-bold text-slate-900">Transmission Secured!</h4>
            </div>
          ) : (
            <div className="space-y-5">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Category</label><select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full p-4 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"><option>Hardware</option><option>Software</option><option>Internet</option></select></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Details / Title</label><textarea rows={4} value={formText} onChange={e => {setFormText(e.target.value); setFormTitle(e.target.value);}} className="w-full p-4 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" placeholder="Provide details..."></textarea></div>
            </div>
          )}
        </div>

        {!successDone && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0 rounded-b-3xl">
            <button disabled={isTransmitting} onClick={handleLivePostgresSubmit} className="px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2">{isTransmitting ? <Loader2 size={16} className="animate-spin" /> : 'SUBMIT DATA'}</button>
          </div>
        )}
      </div>
    </div>
  );
}