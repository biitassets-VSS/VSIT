'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ShieldCheck, Package, User, Hash, Briefcase, 
  Calendar, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Cpu
} from 'lucide-react';

function PublicAssetContent() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<any>(null);
  const [assignee, setAssignee] = useState<any>(null);
  const [latestInspection, setLatestInspection] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rawId) {
      fetchLiveAssetData(rawId);
    } else {
      setError('No Asset Tag ID provided in QR Code.');
      setLoading(false);
    }
  }, [rawId]);

  const fetchLiveAssetData = async (assetTagOrId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch live asset record by Tag ID or UUID
      let { data: assetData, error: assetErr } = await supabase
        .from('assets')
        .select('*')
        .or(`asset_tag.eq.${assetTagOrId.toUpperCase()},id.eq.${assetTagOrId}`)
        .maybeSingle();

      if (assetErr || !assetData) {
        // Fallback search if tag has formatting variations
        const { data: fallbackData } = await supabase
          .from('assets')
          .select('*')
          .ilike('asset_tag', `%${assetTagOrId}%`)
          .limit(1)
          .maybeSingle();

        assetData = fallbackData;
      }

      if (!assetData) {
        setError(`Asset record "${assetTagOrId}" not found in inventory.`);
        setLoading(false);
        return;
      }

      setAsset(assetData);

      // 2. Fetch Live Assignee Profile if assigned
      const assignedToStr = String(assetData.assigned_to || '').trim();
      const isActuallyUnassigned = !assignedToStr || assignedToStr.toLowerCase() === 'unassigned' || assignedToStr.toLowerCase() === 'null';

      if (!isActuallyUnassigned) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${assignedToStr},email.ilike.${assignedToStr},emp_code.ilike.${assignedToStr}`)
          .maybeSingle();

        setAssignee(profileData || null);
      } else {
        setAssignee(null);
      }

      // 3. Fetch Latest Live Inspection
      const { data: inspectionData } = await supabase
        .from('inspections')
        .select('*')
        .eq('asset_id', assetData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatestInspection(inspectionData || null);

    } catch (err: any) {
      setError('Failed to fetch real-time asset status.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Querying Live Database...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4">
          <AlertTriangle size={48} className="text-rose-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900 uppercase">Asset Not Found</h2>
          <p className="text-xs font-semibold text-slate-600">{error || 'This asset is not registered in the system.'}</p>
          <button 
            onClick={() => rawId && fetchLiveAssetData(rawId)} 
            className="w-full py-3 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Retry Scan
          </button>
        </div>
      </div>
    );
  }

  const isAssigned = asset.assigned_to && assignee;
  const displayStatus = asset.status || 'In Stock (Unassigned)';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-slate-800 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-3xl overflow-hidden relative z-10">
        
        {/* Top Header */}
        <div className="bg-slate-900 px-6 py-7 text-center relative overflow-hidden">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-lg">
            <ShieldCheck size={28} className="text-orange-500" />
          </div>
          <h1 className="text-lg font-black text-white tracking-tight uppercase">Live Hardware Status</h1>
          <p className="text-slate-400 text-[10px] font-bold mt-0.5 tracking-widest uppercase">Virtual Staffing Solutions</p>
        </div>

        {/* Live Status Content */}
        <div className="p-6 space-y-4">
          
          {/* Asset Info Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl shrink-0">
                <Package size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Asset Tag ID</p>
                <p className="text-sm font-black font-mono text-orange-600 truncate">{asset.asset_tag || asset.id}</p>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{asset.name || asset.asset_name}</p>
              </div>
            </div>
          </div>

          {/* Real-time Status Badge */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
             <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Real-time Stock Status</p>
                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                  displayStatus.toLowerCase().includes('assigned') ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 
                  displayStatus.toLowerCase().includes('pending') ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' : 
                  'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                }`}>
                  <CheckCircle2 size={13} /> {displayStatus}
                </span>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Condition</p>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">{asset.asset_condition || 'New'}</span>
             </div>
          </div>

          {/* Hardware Specs */}
          {asset.system_specs && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start gap-3">
              <Cpu size={18} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Hardware Specifications</p>
                <p className="text-xs font-semibold text-slate-700 mt-1 leading-snug">{asset.system_specs}</p>
              </div>
            </div>
          )}

          {/* Current Holder Information */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={14} className="text-purple-600" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Current Assigned Holder</h3>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Live</span>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Employee Name</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {isAssigned ? (assignee.full_name || assignee.name) : 'Unassigned (In Stock)'}
                  </p>
                </div>
                {isAssigned && (
                  <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200">
                    {assignee.emp_code || 'N/A'}
                  </span>
                )}
              </div>

              {isAssigned && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Department</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{assignee.department || assignee.designation || 'Staff Member'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Last Inspection</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      {latestInspection ? new Date(latestInspection.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Stamp */}
        <div className="bg-slate-100/80 px-6 py-3 text-center border-t border-slate-200/60 flex items-center justify-center gap-1.5">
          <Calendar size={12} className="text-slate-400" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Scanned on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

      </div>
    </div>
  );
}

export default function PublicAssetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>}>
      <PublicAssetContent />
    </Suspense>
  );
}