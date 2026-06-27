'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClipboardCheck, Loader2 } from 'lucide-react';

export default function StaffInspectionsPage() {
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<any[]>([]);

  const fetchInspections = async () => {
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) return;
    
    let email = sessionStr;
    try { email = JSON.parse(sessionStr).email; } catch(e) {}
    const cleanEmail = email?.toLowerCase().trim();

    // 1. Fetch inspections and the associated asset details in one go
    const { data: inspData } = await supabase
      .from('inspections')
      .select('*, assets(*)') // Get inspection data AND the related asset row
      .ilike('user_email', cleanEmail)
      .order('created_at', { ascending: false });

    if (inspData) setInspections(inspData);
    setLoading(false);
  };

  useEffect(() => {
    fetchInspections();
    const sub = supabase.channel('staff_insp_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, fetchInspections)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'rejected' || s === 'not approved') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s === 're-inspection') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-amber-600 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit History</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review the compliance and condition history of your devices.</p>
        </div>
        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><ClipboardCheck size={24}/></div>
      </div>
{/* 🌟 UPDATED PHOTOGRAPHIC EVIDENCE RENDERER */}
<div className="mt-8">
  <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
    Photographic Evidence ({inspection.photos?.length || 0})
  </h4>
  
  {inspection.photos && inspection.photos.length > 0 ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {inspection.photos.map((photoUrl: string, idx: number) => (
        <a 
          key={idx} 
          href={photoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-lg transition-all group"
        >
          <img 
            src={photoUrl} 
            alt={`Audit Evidence ${idx + 1}`} 
            className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-500" 
          />
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] p-2 font-black uppercase tracking-widest text-center">
            View Evidence {idx + 1}
          </div>
        </a>
      ))}
    </div>
  ) : (
    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
      <AlertTriangle size={16} /> No visual evidence was attached to this payload.
    </div>
  )}
</div>
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {inspections.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-sm">No inspections have been submitted yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {inspections.map(insp => {
              // Get the related asset object
              const asset = insp.assets || {};
              
              return (
                <div key={insp.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      {/* 🚨 FIXED: Now shows the actual asset name */}
                      <h3 className="font-bold text-slate-900 text-lg">
                        {asset.name || asset.asset_name || asset.model || 'Unknown Device'}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadge(insp.status)}`}>
                        {insp.status || 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Condition reported: <strong className="text-slate-800">{insp.condition}</strong></p>
                    <p className="text-xs font-semibold text-slate-400">Notes: {insp.notes || 'None'}</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Audit Date</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{new Date(insp.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}