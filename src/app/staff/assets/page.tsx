'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Laptop, Loader2, MonitorSmartphone } from 'lucide-react';

export default function StaffAssetsPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);

  const fetchAssets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile to get real ID if needed, or just use user.id
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', user.email).maybeSingle();
    const targetId = profile?.id || user.id;

    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('assigned_to', targetId)
      .order('created_at', { ascending: false });

    if (data) setAssets(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
    const sub = supabase.channel('staff_assets_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, fetchAssets)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Assets</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review all hardware physically assigned to your profile.</p>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Laptop size={24}/></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 font-medium text-sm">
            No active hardware assigned to you.
          </div>
        ) : (
          assets.map(asset => (
            <div key={asset.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-100"><MonitorSmartphone size={20}/></div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider">{asset.status || 'Assigned'}</span>
              </div>
              <h3 className="font-black text-lg text-slate-900 mb-1">{asset.asset_name || 'Generic Device'}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{asset.category || 'Hardware'}</p>
              
              <div className="mt-auto space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Asset Tag</span>
                  <span className="text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{asset.asset_tag}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Serial No.</span>
                  <span className="text-slate-900 font-mono">{asset.serial_number || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}