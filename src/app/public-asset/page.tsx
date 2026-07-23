'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Laptop, AlertTriangle, CheckCircle2, User, Loader2 } from 'lucide-react';

function PublicAssetContent() {
  const searchParams = useSearchParams();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAsset = async () => {
      const rawId = searchParams.get('id');
      if (!rawId) {
        setError('No Asset ID provided in the URL.');
        setLoading(false);
        return;
      }

      // Decode in case the QR code scanner added weird characters
      const assetId = decodeURIComponent(rawId).trim();

      try {
        // 1. SAFE DATABASE QUERY ROUTING
        // Check if the scanned string is a UUID format or a text Tag
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId);

        let query = supabase.from('assets').select('*');
        
        if (isUuid) {
          query = query.eq('id', assetId); // Search by exact UUID
        } else {
          query = query.ilike('asset_tag', assetId); // Search by Tag (case-insensitive)
        }

        const { data, error: fetchError } = await query.single();

        if (fetchError) {
          console.error("Supabase Database Error:", fetchError);
          throw new Error('Asset not found in the database. (Check Supabase RLS policies if you are certain this asset exists)');
        }
        if (!data) throw new Error('Asset not found.');

        // 2. FETCH ASSIGNEE (Graceful fallback if profiles table is locked)
        let staffName = 'Unassigned';
        if (data.assigned_to) {
          const { data: staffData } = await supabase
            .from('profiles')
            .select('full_name, name')
            .eq('id', data.assigned_to)
            .maybeSingle(); 
          
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
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Loading Asset Data</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800 mb-2">Asset Not Found</h1>
        <p className="text-slate-500 text-sm max-w-md">{error}</p>
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
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
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
              <span className="text-sm font-mono font-bold text-purple-600 break-all">{asset.asset_tag}</span>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-purple-600" /></div>}>
      <PublicAssetContent />
    </Suspense>
  );
}