'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, 
  RefreshCw, AlertCircle, Clock, X, Upload, CheckCircle, ShieldCheck, Loader2 
} from 'lucide-react';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  
  // LIVE DATABASE FEEDS
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myPastInspections, setMyPastInspections] = useState<any[]>([]);
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

      // 1. FETCH REAL USER PROFILE FOR EMP ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (profile) {
        user.emp_id = profile.emp_code || profile.emp_id || profile.employee_id || profile.id.split('-')[0].toUpperCase();
        user.name = profile.full_name || profile.name || user.name;
      } else {
        user.emp_id = user.id ? user.id.split('-')[0].toUpperCase() : 'STAFF';
      }

      setCurrentUser(user);

      // 2. FETCH REAL ASSETS FROM POSTGRES
      const { data: realAssets } = await supabase
        .from('assets')
        .select('*')
        .eq('assigned_to', user.id || profile?.id);

      // 3. FETCH REAL PAST INSPECTIONS FROM POSTGRES
      const { data: realInspections } = await supabase
        .from('inspections')
        .select('*, assets(asset_name)')
        .eq('inspected_by', user.id || profile?.id)
        .order('created_at', { ascending: false });

      if (realAssets) {
        setAssignedAssets(realAssets);
        const needsInsp = realAssets.filter(a => a.inspection_status?.toLowerCase() === 'pending' || a.status?.toLowerCase() === 'overdue').length;
        const inRep = realAssets.filter(a => a.status?.toLowerCase() === 'in repair').length;

        setStats({
          totalAssets: realAssets.length,
          needsInspection: needsInsp,
          inRepair: inRep
        });
      }

      if (realInspections) setMyPastInspections(realInspections);

    } catch (err) {
      console.error("Postgres feed error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealDatabase();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs font-black text-slate-400 tracking-widest uppercase">Connecting to Live DB...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP WELCOME PILL */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, {currentUser.name}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-400">
            <span className="text-slate-700 font-black uppercase">ID: {currentUser.emp_id}</span>
            <span>|</span>
            <span>Email: {currentUser.email}</span>
          </div>
        </div>

        {/* THE 4 QUICK ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'RAISE TICKET', icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50', type: 'TICKET' },
            { name: 'SUBMIT INSPECTION', icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50', type: 'INSPECTION' },
            { name: 'REQUEST ASSET', icon: PlusCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', type: 'REQUEST' },
            { name: 'ASSETS REPLACEMENT', icon: RefreshCw, color: 'text-pink-600', bg: 'bg-pink-50', type: 'REPLACEMENT' },
          ].map((action) => (
            <button key={action.name} onClick={() => {
              const target = assignedAssets.length > 0 ? assignedAssets[0] : null;
              setModal({ isOpen: true, type: action.type, targetAsset: target });
            }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer">
              <div className={`w-14 h-14 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}><action.icon size={26} /></div>
              <span className="text-xs font-black text-slate-900 tracking-wider uppercase text-center">{action.name}</span>
            </button>
          ))}
        </div>

        {/* THE 3 STATS PILLS */}
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

        {/* LIVE ASSIGNED ASSET DETAILS */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Laptop className="text-emerald-600" size={22} />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">ASSIGNED ASSET DETAILS</h2>
          </div>

          {assignedAssets.length === 0 ? (
            <div className="py-12 text-center bg-[#F8FAFC] rounded-2xl border border-slate-100 text-slate-400 font-bold text-xs">
              No hardware units currently assigned to your profile in Postgres.
            </div>
          ) : (
            assignedAssets.map((asset) => {
              const isOverdue = asset.status?.toLowerCase() === 'overdue' || asset.inspection_status?.toLowerCase() === 'pending';
              
              return (
                <div key={asset.id} className="bg-[#F8FAFC] rounded-2xl p-6 border border-slate-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{asset.asset_name || asset.model}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">S/N: {asset.serial_number || asset.asset_tag}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider">ASSIGNED</span>
                      {isOverdue && <span className="px-3 py-1 bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs">OVER DUE</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                      <Clock className="text-slate-400 shrink-0" size={18} />
                      <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">LAST INSPECTION</p><p className="text-xs font-black text-slate-800 mt-0.5">{asset.last_inspection_date ? new Date(asset.last_inspection_date).toLocaleDateString() : 'Pending'}</p></div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                      <AlertCircle className={`shrink-0 ${isOverdue ? 'text-red-500' : 'text-emerald-500'}`} size={18} />
                      <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">AUDIT STATUS</p><p className={`text-xs font-black mt-0.5 uppercase ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>{asset.inspection_status || asset.status}</p></div>
                    </div>
                    <button onClick={() => setModal({ isOpen: true, type: 'REPLACEMENT', targetAsset: asset })} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl py-3 transition-colors flex items-center justify-center cursor-pointer shadow-md">
                      ASSETS REPLACEMENT
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ARMORED MODAL CONTROLLER */}
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
// COMPONENT: SCREENSHOT-EXACT TRANSACTION MODAL
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

  // Auto-reset category selection when switching windows
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
      if (type === 'TICKET') {
        await supabase.from('tickets').insert({
          title: formTitle || 'IT Service Ticket',
          category: formCategory,
          description: formText,
          status: 'open',
          created_by: user.id || user.emp_id
        });
      } 
      else if (type === 'REQUEST') {
        await supabase.from('tickets').insert({
          title: `New Asset Allocation: ${formCategory}`,
          category: formCategory,
          description: formText || `Requested allocation for category: ${formCategory}`,
          status: 'pending',
          created_by: user.id || user.emp_id
        });
      }
      else if (type === 'INSPECTION' || type === 'REPLACEMENT') {
        await supabase.from('inspections').insert({
          asset_id: asset.id,
          inspected_by: user.id || user.emp_id,
          condition: formCondition,
          notes: formText || `Submitted via ${type}`,
          status: 'Completed'
        });

        await supabase.from('assets').update({
          last_inspection_date: new Date().toISOString(),
          inspection_status: 'Verified',
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in text-left">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col font-sans">
        
        {/* Top Header Row matching your screenshots */}
        <div className="p-6 bg-white border-b border-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {type === 'TICKET' && <Ticket className="text-blue-600 shrink-0" size={22} />}
            {type === 'REQUEST' && <PlusCircle className="text-emerald-600 shrink-0" size={22} />}
            {type === 'INSPECTION' && <ClipboardCheck className="text-amber-500 shrink-0" size={22} />}
            {type === 'REPLACEMENT' && <RefreshCw className="text-pink-600 shrink-0" size={22} />}
            
            <div>
              <h3 className="font-black text-slate-900 text-sm tracking-wider uppercase">
                {type === 'TICKET' && 'RAISE IT SERVICE TICKET'}
                {type === 'REQUEST' && 'REQUEST ASSET ALLOCATION'}
                {type === 'INSPECTION' && 'COMPLIANCE POP-UP FRAMEWORK'}
                {type === 'REPLACEMENT' && 'ASSET REPLACEMENT FRAMEWORK'}
              </h3>
              {asset?.asset_name && type !== 'REQUEST' && type !== 'TICKET' && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{asset.asset_name}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"><X size={18} /></button>
        </div>

        {/* Modal Dynamic Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {successDone ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce"><CheckCircle size={32} /></div>
              <h4 className="text-lg font-black text-slate-900">Postgres Updated!</h4>
              <p className="text-xs font-bold text-slate-400">Transaction written securely to database.</p>
            </div>
          ) : (

            <div className="space-y-4">
              {/* COMPLIANCE GUARD FOR REPLACEMENT/INSPECTION */}
              {needsLock && (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-[11px] font-bold text-blue-900 flex gap-2.5">
                    <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <div><span className="font-black">SECURITY ANTI-WRONG GUARD:</span> Please enter this machine's exact Tag ID or Serial Number parameter to unlock configuration fields.</div>
                  </div>

                  <div className="flex gap-2">
                    <input disabled={isUnlocked} value={serialInput} onChange={e => { setSerialInput(e.target.value); setLockError(false); }} placeholder="Type Tag ID or Serial Number..." className={`flex-1 p-3.5 rounded-xl border text-xs font-black outline-none ${lockError ? 'border-red-500 bg-red-50/20' : isUnlocked ? 'bg-green-50 border-green-300 text-green-800' : 'border-slate-200'}`} />
                    {!isUnlocked && (
                      <button onClick={handleAttemptUnlock} className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-black text-xs cursor-pointer shadow-md">
                        VERIFY ASSET
                      </button>
                    )}
                  </div>
                  {lockError && <p className="text-[10px] font-black text-red-500">❌ Mismatch. Look at the sticker on the bottom of your device.</p>}
                </div>
              )}

              {/* WINDOW 1: REQUEST ASSET ALLOCATION (Exact match to Screenshot 1) */}
              {type === 'REQUEST' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">SELECT ASSET CATEGORY</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full mt-1 p-3.5 rounded-xl border border-orange-500 text-xs font-black bg-white text-slate-900 outline-none shadow-xs cursor-pointer">
                      <option>Laptop</option>
                      <option>Headphone</option>
                      <option>Keyboard</option>
                      <option>Mouse</option>
                      <option>Cleaning Kits</option>
                      <option>Mouse Pad</option>
                      <option>Laptop Stand</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">ALLOCATION JUSTIFICATION</label>
                    <textarea rows={3} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Explain why this equipment allocation is required..." className="w-full mt-1 p-3.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-emerald-600" />
                  </div>
                </div>
              )}

              {/* WINDOW 2: RAISE IT SERVICE TICKET (Exact match to Screenshot 2) */}
              {type === 'TICKET' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">WHAT IS THE ISSUE TITLE?</label>
                    <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Describe the issue briefly" className="w-full mt-1 p-3.5 rounded-xl border border-slate-200 focus:border-orange-500 text-xs font-black outline-none transition-colors" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">SELECT CATEGORY TYPE</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full mt-1 p-3.5 rounded-xl border border-orange-500 text-xs font-black bg-white text-slate-900 outline-none shadow-xs cursor-pointer">
                      <option>Hardware</option>
                      <option>Software</option>
                      <option>Internet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">BRIEF NOTES EXPLANATIONS</label>
                    <textarea rows={3} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Explain the problem details..." className="w-full mt-1 p-3.5 rounded-xl border border-slate-200 focus:border-orange-500 text-xs font-bold outline-none transition-colors" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">SHARE ERROR SCREENSHOT (OPTIONAL)</label>
                    <div className="mt-1 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-600 cursor-pointer group transition-colors">
                      <Upload className="group-hover:text-blue-600 mb-1 transition-colors" size={20} />
                      <span className="text-xs font-black text-slate-700 group-hover:text-blue-600">Upload Snapshot Image</span>
                    </div>
                  </div>
                </div>
              )}

              {/* WINDOW 3: INSPECTION / REPLACEMENT */}
              {(type === 'INSPECTION' || type === 'REPLACEMENT') && (
                <div className={`space-y-4 transition-all ${!isUnlocked ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">DEVICE PHYSICAL CONDITION</label>
                    <select value={formCondition} onChange={e => setFormCondition(e.target.value)} className="w-full mt-1 p-3.5 rounded-xl border border-slate-200 text-xs font-black bg-white outline-none">
                      <option>Pristine / Flawless</option><option>Normal Wear & Scratches</option><option>Damaged / Cracked</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">NOTES & REASON</label>
                    <textarea rows={3} value={formText} onChange={e => setFormText(e.target.value)} placeholder="Provide explanation details..." className="w-full mt-1 p-3.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-slate-900" />
                  </div>
                </div>
              )}
            </div>

          )}
        </div>

        {/* Dynamic Modal Footer */}
        {!successDone && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 cursor-pointer">Cancel</button>
            <button 
              disabled={isTransmitting || (needsLock && !isUnlocked)}
              onClick={handleLivePostgresSubmit} 
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${needsLock && !isUnlocked ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : type === 'REQUEST' ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-lg shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-lg shadow-blue-600/20'}`}
            >
              {isTransmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {type === 'TICKET' && 'SUBMIT SERVICE TICKET'}
              {type === 'REQUEST' && 'REQUEST ASSET ALLOCATION'}
              {(type === 'INSPECTION' || type === 'REPLACEMENT') && 'SUBMIT VERIFICATION'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}