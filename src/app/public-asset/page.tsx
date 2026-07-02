'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // Make sure this path matches your setup
import { Laptop, AlertTriangle, CheckCircle2, User, Loader2 } from 'lucide-react';

function PublicAssetContent() {
  const searchParams = useSearchParams();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAsset = async () => {
      const assetId = searchParams.get('id');
      if (!assetId) {
        setError('No Asset ID provided in the URL.');
        setLoading(false);
        return;
      }

      try {
        // Query Supabase for the specific asset
        const { data, error: fetchError } = await supabase
          .from('assets')
          .select('*')
          .or(`id.eq.${assetId},asset_tag.eq.${assetId}`)
          .single();

        if (fetchError || !data) throw new Error('Asset not found in the database.');

        // Fetch assignee details if assigned
        let staffName = 'Unassigned';
        if (data.assigned_to) {
          const { data: staffData } = await supabase
            .from('profiles')
            .select('full_name, name')
            .eq('id', data.assigned_to)
            .single();
          
          if (staffData) staffName = staffData.full_name || staffData.name || 'Unknown Staff';
        }

        setAsset({ ...data, staffName });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Loading Asset Data</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">Asset Not Found</h1>
        <p className="text-slate-500 text-sm max-w-md">{error || "The QR code you scanned is invalid or the asset has been removed from the system."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">VSS Asset</h1>
          <p className="text-slate-400 text-sm font-semibold tracking-wider">Verified Hardware Record</p>
        </div>

        {/* Details Section */}
        <div className="p-6 md:p-10 space-y-8">
          
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Laptop size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">{asset.name || asset.asset_name || 'Unnamed Asset'}</h2>
              <p className="text-sm text-slate-500 mt-1 font-semibold">{asset.brand || 'Standard Brand'} • {asset.category}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Asset Tag ID</span>
              <span className="text-sm font-mono font-bold text-blue-600 break-all">{asset.asset_tag}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Serial Number (S/N)</span>
              <span className="text-sm font-mono font-bold text-slate-800 break-all">{asset.serial_number || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logistics Status</span>
              <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {asset.status || 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assigned Holder</span>
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-800">{asset.staffName}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Condition</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-sm font-bold text-emerald-700">{asset.asset_condition || 'Good'}</span>
              </div>
            </div>
          </div>

        </div>
        
        <div className="bg-slate-100 p-4 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Virtual Staffing Solutions • IT Department</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicAssetViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>}>
      <PublicAssetContent />
    </Suspense>
  );
}