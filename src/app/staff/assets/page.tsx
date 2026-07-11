'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, Keyboard, Mouse, Headphones, Monitor, Smartphone, Cpu, HardDrive, Package, // 🌟 New Asset Icons
  Loader2, ShieldCheck, AlertTriangle, FileSignature, CheckCircle2, 
  QrCode, PenTool, X, CalendarClock, AlertCircle
} from 'lucide-react';

// 🌟 BULLETPROOF DYNAMIC DUE DATE ENGINE
function getNextDueDate(category: string, lastDateString: string | null, createdAtString: string | null) {
  const isLaptop = (category || '').toLowerCase().includes('laptop');
  const intervalMonths = isLaptop ? 1 : 3;

  const getLastSaturday = (targetDate: Date) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const date = new Date(year, month + 1, 0); // Last day of target month
    while (date.getDay() !== 6) {
      date.setDate(date.getDate() - 1);
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const baseDate = lastDateString ? new Date(lastDateString) : (createdAtString ? new Date(createdAtString) : new Date());

  if (!lastDateString) {
    return getLastSaturday(baseDate);
  }

  const targetMonthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + intervalMonths, 1);
  return getLastSaturday(targetMonthDate);
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// 🌟 DYNAMIC ASSET ICON HELPER
const getAssetIcon = (category: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('laptop') || cat.includes('macbook')) return Laptop;
  if (cat.includes('keyboard')) return Keyboard;
  if (cat.includes('mouse')) return Mouse;
  if (cat.includes('headphone') || cat.includes('headset') || cat.includes('earphone')) return Headphones;
  if (cat.includes('monitor') || cat.includes('display') || cat.includes('screen')) return Monitor;
  if (cat.includes('phone') || cat.includes('mobile')) return Smartphone;
  if (cat.includes('desktop') || cat.includes('cpu')) return Cpu;
  if (cat.includes('drive') || cat.includes('storage')) return HardDrive;
  return Package; // Default fallback icon
};

export default function StaffAssetsPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  
  // E-Sign Modal State
  const [signModalAsset, setSignModalAsset] = useState<any>(null);
  const [signatureName, setSignatureName] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    fetchMyAssets();
  }, []);

  const fetchMyAssets = async () => {
    setLoading(true);
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      let user: any = {};

      if (isGuest) {
        user = { id: 'guest-mock-uuid', email: 'guest@vsit.com', emp_id: 'DEMO-001', name: 'Demo Guest' };
        setCurrentUser(user);
        
        setAssignedAssets([
          { 
            id: 'demo-1', name: 'Demo MacBook Pro 16"', asset_tag: 'MAC-9999', 
            serial_number: 'SN-DEMO-1', category: 'Laptop', live_inspection_status: 'Pending', status: 'Pending Handover',
            live_inspection_date: null, live_inspection_notes: null, live_inspection_photos: null, created_at: new Date().toISOString()
          },
          { 
            id: 'demo-2', name: 'Demo Dell UltraSharp Monitor', asset_tag: 'MON-8888', 
            serial_number: 'SN-DEMO-2', category: 'Monitor', live_inspection_status: 'Approved', status: 'Assigned',
            live_inspection_date: new Date().toISOString(), live_inspection_notes: 'All good', live_inspection_photos: null, created_at: new Date().toISOString()
          },
          { 
            id: 'demo-3', name: 'Logitech MX Master 3', asset_tag: 'MOU-1111', 
            serial_number: 'SN-DEMO-3', category: 'Mouse', live_inspection_status: 'Approved', status: 'Assigned',
            live_inspection_date: new Date().toISOString(), live_inspection_notes: 'Working perfectly', live_inspection_photos: null, created_at: new Date().toISOString()
          }
        ]);
        setLoading(false);
        return;
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) {
        window.location.replace('/');
        return;
      }

      try { user = JSON.parse(sessionStr); } 
      catch (e) { user = { email: sessionStr }; }

      const cleanEmail = user.email?.toLowerCase().trim();
      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      
      const empId = profile?.emp_code || profile?.emp_id || 'STAFF';
      const userId = profile?.id || user.id;
      const userName = profile?.full_name || profile?.name || cleanEmail.split('@')[0];

      setCurrentUser({ id: userId, email: cleanEmail, emp_id: empId, name: userName });

      const { data: assetsRes, error } = await supabase
        .from('assets')
        .select('*')
        .or(`assigned_to.eq.${userId},assigned_to.ilike.${cleanEmail},assigned_to.eq.${empId}`);

      if (error) throw error;
      
      const { data: inspectionsRes } = await supabase
        .from('inspections')
        .select('asset_id, status, notes, photos, created_at')
        .order('created_at', { ascending: false });

      const compiledAssets = (assetsRes || []).map(asset => {
        const latestInsp = (inspectionsRes || []).find(i => i.asset_id === asset.id);
        return {
          ...asset,
          live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null,
          live_inspection_notes: latestInsp?.notes || null,
          live_inspection_photos: latestInsp?.photos || null
        };
      });

      setAssignedAssets(compiledAssets);

    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) return alert("Please type your name to sign.");
    setIsSigning(true);

    try {
      const now = new Date().toISOString();

      if (currentUser.id === 'guest-mock-uuid') {
        setTimeout(() => {
          setAssignedAssets(prev => prev.map(a => a.id === signModalAsset.id ? { ...a, live_inspection_status: 'Approved', live_inspection_date: now, status: 'Assigned' } : a));
          setSignModalAsset(null);
          setIsSigning(false);
          setSignatureName('');
        }, 800);
        return;
      }

      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          inspection_status: 'Approved',
          last_inspection_date: now,
          status: 'Assigned'
        })
        .eq('id', signModalAsset.id);

      if (assetError) throw assetError;

      await supabase.from('inspections').insert({
        asset_id: signModalAsset.id,
        inspected_by: currentUser.id || currentUser.emp_id,
        user_email: currentUser.email,
        condition: 'Pristine / Flawless',
        status: 'Approved',
        notes: `Digitally Signed Handover Agreement by ${signatureName} on ${new Date().toLocaleString()}`
      });

      await supabase.from('notifications').insert({
        title: 'Agreement Signed',
        message: `${currentUser.name} has electronically signed the Handover Agreement for ${signModalAsset.name || signModalAsset.category} (${signModalAsset.asset_tag}).`,
        target_role: 'admin',
        is_read: false
      });

      setAssignedAssets(prev => prev.map(a => a.id === signModalAsset.id ? { ...a, live_inspection_status: 'Approved', live_inspection_date: now, status: 'Assigned' } : a));
      setSignModalAsset(null);
      setSignatureName('');

    } catch (err: any) {
      alert(`Error signing agreement: ${err.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Syncing Inventory...</p>
      </div>
    );
  }

  const pendingAssets = assignedAssets.filter(a => 
    !a.live_inspection_date || 
    ['pending', 'not approved', 're-inspection'].includes((a.live_inspection_status || '').toLowerCase()) || 
    (a.status || '').toLowerCase() === 'pending handover'
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">My Hardware</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your assigned equipment and sign handover agreements.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
          <ShieldCheck className="text-blue-600" size={20} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Total Units</p>
            <p className="text-lg font-black text-blue-700 leading-none">{assignedAssets.length}</p>
          </div>
        </div>
      </div>

      {/* 🚨 PENDING E-SIGN ALERTS */}
      {pendingAssets.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><FileSignature size={120} /></div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-md shrink-0 animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-900">Action Required: Sign Handover Agreement</h3>
                <p className="text-sm font-medium text-rose-700 mt-1 max-w-lg">
                  You have {pendingAssets.length} new asset(s) assigned to you. You must electronically sign the IT asset handover policy to finalize the assignment.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 relative z-10">
            {pendingAssets.map(asset => {
              const AlertIcon = getAssetIcon(asset.category);
              return (
                <div key={asset.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-rose-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <AlertIcon size={20} className="text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{asset.name || asset.category || 'Hardware Unit'}</p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">S/N: {asset.serial_number || 'N/A'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSignModalAsset(asset)}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-colors"
                  >
                    <PenTool size={14} /> Review & Sign
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ASSETS GRID */}
      {assignedAssets.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center">
          <Package size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No Hardware Assigned</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">You currently have no hardware assets linked to your employee ID. If you recently requested equipment, please wait for IT approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignedAssets.map(asset => {
            const isPending = !asset.live_inspection_date || ['pending', 'not approved', 're-inspection'].includes((asset.live_inspection_status || '').toLowerCase()) || (asset.status || '').toLowerCase() === 'pending handover';
            const dueDate = getNextDueDate(asset.category, asset.live_inspection_date, asset.created_at);
            
            // 🌟 Get Dynamic Icon
            const AssetIcon = getAssetIcon(asset.category);

            return (
              <div key={asset.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-slate-300">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <AssetIcon size={18}/>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{asset.name || asset.category || 'Hardware Unit'}</h4>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{asset.brand || 'Standard'}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm"><QrCode size={16} className="text-slate-400"/></div>
                </div>

                <div className="p-5 space-y-3 flex-1">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tag ID</span>
                    <span className="font-mono font-bold text-xs text-slate-800">{asset.asset_tag || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Serial No.</span>
                    <span className="font-mono font-bold text-xs text-slate-800">{asset.serial_number || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><CalendarClock size={10}/> Last Inspection</span>
                    <span className="font-bold text-xs text-slate-800">
                      {asset.live_inspection_date ? formatDate(new Date(asset.live_inspection_date)) : 'Pending Signature'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><AlertTriangle size={10}/> Next Due Date</span>
                    <span className={`font-bold text-xs ${dueDate < new Date() ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatDate(dueDate)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</span>
                    {isPending ? (
                      <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-wider rounded border border-rose-200 flex items-center gap-1">
                          Signature Required
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded border border-emerald-200 flex items-center gap-1">
                          Active & Assigned
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                  <button 
                    onClick={() => setSignModalAsset(asset)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      isPending 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600'
                    }`}
                  >
                    {isPending ? <><PenTool size={14}/> Sign Handover Form</> : <><FileSignature size={14}/> View Agreement</>}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 📝 DIGITAL E-SIGN MODAL */}
      {signModalAsset && (() => {
        const isModalPending = !signModalAsset.live_inspection_date || ['pending', 'not approved', 're-inspection'].includes((signModalAsset.live_inspection_status || '').toLowerCase()) || (signModalAsset.status || '').toLowerCase() === 'pending handover';
        
        let safePhotos: string[] = [];
        try {
          if (Array.isArray(signModalAsset.live_inspection_photos)) {
            safePhotos = signModalAsset.live_inspection_photos;
          } else if (typeof signModalAsset.live_inspection_photos === 'string') {
            const parsed = JSON.parse(signModalAsset.live_inspection_photos);
            if (Array.isArray(parsed)) safePhotos = parsed;
            else if (typeof parsed === 'object' && parsed !== null) safePhotos = Object.values(parsed);
          } else if (typeof signModalAsset.live_inspection_photos === 'object' && signModalAsset.live_inspection_photos !== null) {
            safePhotos = Object.values(signModalAsset.live_inspection_photos);
          }
        } catch(e) {}

        const ModalAssetIcon = getAssetIcon(signModalAsset.category);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <FileSignature size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Asset Handover Agreement</h3>
                    <p className="text-xs font-semibold text-slate-500">Virtual Staffing Solutions IT Policy</p>
                  </div>
                </div>
                <button onClick={() => setSignModalAsset(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm text-slate-700 font-medium custom-scrollbar">
                
                {/* 🌟 WARNING BOX */}
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex gap-3">
                  <AlertCircle className="text-rose-600 shrink-0" size={20} />
                  <div>
                    <h4 className="text-rose-700 font-black text-xs uppercase tracking-widest mb-1">Attention Required</h4>
                    <p className="text-xs font-semibold text-rose-800 leading-relaxed">
                      Please review this agreement carefully. Match the current condition and health of the asset against the attached photos and read the notes carefully. If everything is in order, then sign. Otherwise, DO NOT sign and raise a ticket to the admin immediately.
                    </p>
                  </div>
                </div>

                {/* ASSET SPECS */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                    <ModalAssetIcon size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Asset Name</span>
                      <span className="font-bold text-slate-900 line-clamp-1">{signModalAsset.name || signModalAsset.category}</span>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1"><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Serial Number</span> <span className="font-mono font-bold text-slate-900">{signModalAsset.serial_number}</span></div>
                  <div><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Asset Tag</span> <span className="font-mono font-bold text-slate-900">{signModalAsset.asset_tag}</span></div>
                  <div><span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Assignment Date</span> <span className="font-bold text-slate-900">{signModalAsset.live_inspection_date ? formatDate(new Date(signModalAsset.live_inspection_date)) : formatDate(new Date())}</span></div>
                </div>

                {/* 🌟 EVIDENCE SECTION */}
                <div className="p-5 border border-slate-200 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 border-b border-slate-100 pb-2">Latest Inspection & Condition Evidence</h4>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Inspector Notes:</span>
                    <div className="font-mono text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      {signModalAsset.live_inspection_notes || 'No specific notes provided during the last audit.'}
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-2">Asset Photos:</span>
                    {safePhotos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {safePhotos.slice(0, 4).map((src, idx) => (
                          <img key={idx} src={src} alt="Evidence" className="w-full h-20 object-cover rounded-lg border border-slate-200 bg-slate-50" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No inspection photos available on record.</p>
                    )}
                  </div>
                </div>

                {/* 🌟 TERMS & POLICIES */}
                <div className="prose prose-sm prose-slate max-w-none">
                  <p>I, <strong>{currentUser.name}</strong> (Emp ID: {currentUser.emp_id}), acknowledge the receipt of the IT asset detailed above, provided by Virtual Staffing Solutions for official use.</p>
                  <ul className="space-y-2 mt-4 text-xs font-semibold text-slate-600 leading-relaxed">
                    <li><strong>1. Care & Maintenance:</strong> I agree to handle the equipment with care, protecting it from damage, loss, or theft.</li>
                    <li><strong>2. Official Use Only:</strong> I understand this equipment is strictly for professional duties and complies with company IT security policies.</li>
                    <li><strong className="text-slate-800">3. Mandatory Audits:</strong> Laptop Inspections are required every month before the last Saturday. All other assets require inspection every 3 months. On your Dashboard, the Device Audit Button will activate 4 days before the due date.</li>
                    <li><strong className="text-slate-800">4. Verification:</strong> You can verify assets in your dashboard and scan the asset TAG ID QR code we paste on the bottom of your assets.</li>
                    <li><strong className="text-slate-800">5. Discrepancies:</strong> If any asset serial number does not match with the physical asset's serial number, you must inform the IT Admin user immediately.</li>
                    <li><strong>6. Return Policy & Liability:</strong> I agree to return this asset in good working condition upon separation from the company, or immediately upon request by IT Management. Gross negligence or unauthorized modifications resulting in hardware damage may result in disciplinary action or financial liability.</li>
                  </ul>
                </div>

                {isModalPending ? (
                  <form onSubmit={handleSignAgreement} className="pt-6 border-t border-slate-200 space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Electronic Signature</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Type your full legal name to sign..."
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      />
                      <p className="text-[10px] font-semibold text-slate-400 mt-2 flex items-center gap-1.5">
                        <ShieldCheck size={12} /> Typing your name acts as a legally binding digital signature.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setSignModalAsset(null)} className="px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                      <button type="submit" disabled={isSigning || !signatureName.trim()} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                        {isSigning ? <Loader2 size={16} className="animate-spin" /> : <PenTool size={16} />} 
                        {isSigning ? 'Processing...' : 'I Agree & Accept Asset'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                      <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Agreement Signed & Accepted</h4>
                        <p className="text-xs font-medium text-emerald-700 mt-1">This asset is actively assigned to you. The digital handover agreement is legally logged in the system.</p>
                      </div>
                    </div>
                    <button onClick={() => setSignModalAsset(null)} className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer">
                      Close Document
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}