'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, 
  RefreshCw, AlertCircle, Clock, X, Upload, CheckCircle, 
  ShieldCheck, Loader2, Calendar, CheckCircle2, AlertTriangle
} from 'lucide-react';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  
  // LIVE DATABASE FEEDS
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, inRepair: 0 });

  // Modal Controller
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

      // 1. FETCH PROFILE
      const { data: profile } = await supabase.from('profiles').select('*').eq('email', user.email).maybeSingle();
      if (profile) {
        user.emp_id = profile.emp_code || profile.emp_id || profile.id.split('-')[0].toUpperCase();
        user.name = profile.full_name || profile.name || user.name;
        user.id = profile.id;
      } else {
        user.emp_id = 'PENDING-SETUP';
      }
      setCurrentUser(user);

      // 2. FETCH ASSETS & LATEST INSPECTIONS
      const [assetsRes, inspRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false })
      ]);

      if (assetsRes.data) {
        const compiledAssets = assetsRes.data.map(asset => {
          // Find the newest inspection log for this specific asset to get real-time status
          const latestInsp = (inspRes.data || []).find(i => i.asset_id === asset.id);
          return {
            ...asset,
            live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
            live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null
          };
        });

        setAssignedAssets(compiledAssets);
        
        const needsInsp = compiledAssets.filter(a => 
          a.live_inspection_status?.toLowerCase() === 'pending' || 
          a.live_inspection_status?.toLowerCase() === 're-inspection' || 
          a.status?.toLowerCase() === 'overdue'
        ).length;
        const inRep = compiledAssets.filter(a => a.status?.toLowerCase() === 'in repair').length;
        
        setStats({ totalAssets: compiledAssets.length, needsInspection: needsInsp, inRepair: inRep });
      }

    } catch (err) {
      console.error("Postgres feed error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRealDatabase(); }, []);

  const calculateUpcomingDate = (dateStr: string) => {
    if (!dateStr) return 'Pending Setup';
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + 6); // 6 month compliance interval
    return d.toLocaleDateString('en-IN');
  };

  const getInspectionStatusColor = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'approved') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 're-inspection') return 'text-amber-700 bg-amber-50 border-amber-200';
    if (s === 'rejected' || s === 'not approved') return 'text-rose-700 bg-rose-50 border-rose-200';
    return 'text-blue-700 bg-blue-50 border-blue-200'; // Default Pending
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
        
        {/* 🌟 TOP WELCOME PILL */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Welcome back, {currentUser.name}! 👋
            </h1>
            <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-500">
              <span className="text-blue-700 font-black uppercase tracking-widest px-2.5 py-0.5 bg-blue-50 rounded-md border border-blue-100">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <button onClick={() => loadRealDatabase()} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors self-start md:self-auto border border-slate-200">
            <RefreshCw size={14}/> Sync Data
          </button>
        </div>

        {/* 🌟 THE 4 QUICK ACTION BUTTONS */}
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

        {/* 🌟 THE 3 STATS PILLS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">MY ASSETS</p><h2 className="text-4xl font-black text-slate-900 mt-1">{stats.totalAssets}</h2></div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Laptop size={26} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">NEEDS INSPECTION</p><h2 className="text-4xl font-black text-orange-600 mt-1">{stats.needsInspection}</h2></div>
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center"><AlertCircle size={26} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">IN REPAIR</p><h2 className="text-4xl font-black text-pink-600 mt-1">{stats.inRepair}</h2></div>
            <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center"><Clock size={26} /></div>
          </div>
        </div>

        {/* 🌟 ORIGINAL CLEAN ASSET DETAILS VIEW */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Laptop className="text-blue-600" size={22} />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">ASSIGNED ASSET DETAILS</h2>
          </div>

          {assignedAssets.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 font-bold text-xs">
              No hardware units currently assigned to your profile in the database.
            </div>
          ) : (
            assignedAssets.map((asset) => {
              const isOverdue = asset.live_inspection_status?.toLowerCase() === 'pending' || asset.live_inspection_status?.toLowerCase() === 're-inspection';
              
              return (
                <div key={asset.id} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 hover:border-blue-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{asset.asset_name || asset.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-slate-500">S/N: {asset.serial_number || 'N/A'}</span>
                        <span className="text-[10px] font-mono font-black text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md">{asset.asset_tag}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider">{asset.status || 'Assigned'}</span>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${getInspectionStatusColor(asset.live_inspection_status)}`}>
                        {asset.live_inspection_status?.toLowerCase() === 'approved' && <CheckCircle2 size={12}/>}
                        {asset.live_inspection_status?.toLowerCase() === 're-inspection' && <RefreshCw size={12}/>}
                        {(asset.live_inspection_status?.toLowerCase() === 'rejected' || asset.live_inspection_status?.toLowerCase() === 'not approved') && <AlertTriangle size={12}/>}
                        {asset.live_inspection_status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 shadow-xs">
                      <Clock className="text-slate-400 shrink-0" size={18} />
                      <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Audited</p><p className="text-xs font-black text-slate-800 mt-0.5">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'Pending Initial Setup'}</p></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 shadow-xs">
                      <Calendar className="text-slate-400 shrink-0" size={18} />
                      <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Due Date</p><p className="text-xs font-black text-blue-700 mt-0.5">{calculateUpcomingDate(asset.live_inspection_date || asset.created_at)}</p></div>
                    </div>
                    <button onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} className={`w-full text-white font-black text-[10px] uppercase tracking-widest rounded-xl py-3 transition-colors flex items-center justify-center cursor-pointer shadow-md ${isOverdue ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                      {isOverdue ? 'START INSPECTION NOW' : 'SUBMIT EARLY AUDIT'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 🌟 ARMORED MODAL CONTROLLER */}
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

// =========================================================
// COMPONENT: ORIGINAL DETAILED TRANSACTION MODAL
// =========================================================
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
      const finalEmpCode = user.emp_id || user.emp_code || user.id || 'STAFF';

      if (type === 'TICKET') {
        await supabase.from('tickets').insert({
          title: formTitle || 'IT Service Ticket',
          subject: formTitle || 'IT Service Ticket', 
          category: formCategory,
          description: formText || 'No details provided',
          note: formText || 'No details provided',
          status: 'Open',
          created_by: user.email,
          emp_code: finalEmpCode // FIXED PAYLOAD
        });
      } 
      else if (type === 'REQUEST') {
        await supabase.from('tickets').insert({
          title: `New Asset Allocation: ${formCategory}`,
          subject: `Asset Request: ${formCategory}`, 
          category: `Asset Request: ${formCategory}`,
          description: formText || `Requested allocation for category: ${formCategory}`,
          note: formText || `Requested allocation for category: ${formCategory}`,
          status: 'Pending',
          created_by: user.email,
          emp_code: finalEmpCode // FIXED PAYLOAD
        });
      }
      else if (type === 'INSPECTION' || type === 'REPLACEMENT') {
        await supabase.from('inspections').insert({
          asset_id: asset.id,
          inspected_by: user.id || user.emp_id,
          user_email: user.email,
          condition: formCondition,
          notes: formText || `Submitted via ${type}`,
          status: 'Pending'
        });

        await supabase.from('assets').update({
          inspection_status: 'Pending',
          status: type === 'REPLACEMENT' ? 'Replacement Requested' : 'Assigned'
        }).eq('id', asset.id);
      }

      setSuccessDone(true);
      setTimeout(() => onClose(), 1500);

    } catch (e) {
      console.error("DB write failed:", e);
      alert("Failed to save to Postgres database.");
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in text-left">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col font-sans max-h-[90vh]">
        
        {/* Top Header Row */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${type === 'TICKET' ? 'bg-blue-100 text-blue-600 border-blue-200' : type === 'REQUEST' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : type === 'INSPECTION' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-pink-100 text-pink-600 border-pink-200'}`}>
                {type === 'TICKET' && <Ticket size={18} />}
                {type === 'REQUEST' && <PlusCircle size={18} />}
                {type === 'INSPECTION' && <ClipboardCheck size={18} />}
                {type === 'REPLACEMENT' && <RefreshCw size={18} />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase">
                {type === 'TICKET' && 'RAISE IT SERVICE TICKET'}
                {type === 'REQUEST' && 'REQUEST ASSET ALLOCATION'}
                {type === 'INSPECTION' && 'COMPLIANCE POP-UP FRAMEWORK'}
                {type === 'REPLACEMENT' && 'ASSET REPLACEMENT FRAMEWORK'}
              </h3>
              {asset?.asset_name && type !== 'REQUEST' && type !== 'TICKET' && <p className="text-[10px] font-bold text-slate-500 mt-0.5">{asset.asset_name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center border border-slate-200 cursor-pointer transition-colors"><X size={16} /></button>
        </div>

        {/* Modal Dynamic Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {successDone ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-20 h-20 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce shadow-sm"><CheckCircle size={40} /></div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">Transmission Secured!</h4>
              <p className="text-xs font-bold text-slate-500">Your record has been written to the live Postgres database.</p>
            </div>
          ) : (

            <div className="space-y-5">
              {/* COMPLIANCE GUARD FOR REPLACEMENT/INSPECTION */}
              {needsLock && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 text-[11px] font-bold text-blue-900 flex gap-3 leading-relaxed">
                    <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <div><span className="font-black">SECURITY ANTI-WRONG GUARD:</span> Please enter this machine's exact Tag ID or Serial Number parameter to unlock configuration fields.</div>
                  </div>

                  <div className="flex gap-2">
                    <input disabled={isUnlocked} value={serialInput} onChange={e => { setSerialInput(e.target.value); setLockError(false); }} placeholder="Type Tag ID or Serial Number..." className={`flex-1 p-3.5 rounded-xl border text-xs font-black outline-none transition-colors ${lockError ? 'border-red-500 bg-red-50/20 text-red-900' : isUnlocked ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} />
                    {!isUnlocked && (
                      <button onClick={handleAttemptUnlock} className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer shadow-md transition-colors">
                        VERIFY
                      </button>
                    )}
                  </div>
                  {lockError && <p className="text-[10px] font-black text-red-500 pl-1">❌ Mismatch. Look at the sticker on the bottom of your device.</p>}
                </div>
              )}

              {/* WINDOW 1: REQUEST ASSET ALLOCATION */}
              {type === 'REQUEST' && (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Select Asset Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full p-4 rounded-xl border border-emerald-500 text-xs font-black bg-emerald-50/10 text-emerald-900 outline-none shadow-sm cursor-pointer transition-colors focus:ring-4 focus:ring-emerald-500/20">
                      <option>Laptop</option>
                      <option>Headphone</option>
                      <option>Keyboard</option>
                      <option>Mouse</option>
                      <option>Cleaning Kits</option>
                      <option>Mouse Pad</option>
                      <option>Stand</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Allocation Justification</label>
                    <textarea rows={3} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Explain why this equipment allocation is required..." className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-emerald-600 focus:bg-white transition-colors" />
                  </div>
                </div>
              )}

              {/* WINDOW 2: RAISE IT SERVICE TICKET */}
              {type === 'TICKET' && (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">What is the issue title?</label>
                    <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Describe the issue briefly" className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-xs font-black outline-none transition-colors" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Select Category Type</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full p-3.5 rounded-xl border border-blue-500 text-xs font-black bg-blue-50/10 text-blue-900 outline-none shadow-sm cursor-pointer transition-colors focus:ring-4 focus:ring-blue-500/20">
                      <option>Hardware</option>
                      <option>Software</option>
                      <option>Internet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Brief Notes & Explanations</label>
                    <textarea rows={3} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Explain the problem details..." className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-xs font-bold outline-none transition-colors" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Share Error Screenshot (Optional)</label>
                    <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 cursor-pointer group transition-colors">
                      <Upload className="group-hover:text-blue-600 mb-2 transition-colors" size={24} />
                      <span className="text-[11px] font-black text-slate-500 group-hover:text-blue-700 tracking-wider">UPLOAD SNAPSHOT</span>
                    </div>
                  </div>
                </div>
              )}

              {/* WINDOW 3: INSPECTION / REPLACEMENT */}
              {(type === 'INSPECTION' || type === 'REPLACEMENT') && (
                <div className={`space-y-5 transition-all duration-300 ${!isUnlocked ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Device Physical Condition</label>
                    <select value={formCondition} onChange={e => setFormCondition(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-xs font-black outline-none cursor-pointer transition-colors">
                      <option>Pristine / Flawless</option><option>Normal Wear & Scratches</option><option>Damaged / Cracked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Declaration Notes & Reason</label>
                    <textarea rows={3} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Provide explanation details..." className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-xs font-bold outline-none transition-colors" />
                  </div>
                </div>
              )}
            </div>

          )}
        </div>

        {/* Dynamic Modal Footer */}
        {!successDone && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-3xl">
            <button onClick={onClose} className="px-6 py-3.5 text-[11px] font-black tracking-widest uppercase text-slate-500 hover:bg-white hover:text-slate-800 rounded-xl cursor-pointer border border-transparent hover:border-slate-200 transition-colors">Cancel Process</button>
            <button 
              disabled={isTransmitting || (needsLock && !isUnlocked)}
              onClick={handleLivePostgresSubmit} 
              className={`px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${needsLock && !isUnlocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : type === 'REQUEST' ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/20'}`}
            >
              {isTransmitting ? <Loader2 size={16} className="animate-spin" /> : null}
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