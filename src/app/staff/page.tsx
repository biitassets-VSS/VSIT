'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PackageSearch, AlertCircle, CheckCircle2, 
  Clock, QrCode, Laptop, Wrench, ChevronRight, Loader2,
  Ticket, PlusCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AssignedAsset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  status: string;
  inspection_status: string;
  next_inspection_date: string;
}

export default function StaffDashboard() {
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [staffName, setStaffName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyAssets = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        const { data: staffProfile, error: staffError } = await supabase
          .from('staff')
          .select('emp_code, name')
          .eq('email', user.email)
          .single();

        if (staffError || !staffProfile) {
          console.error("Could not find staff profile for this email.");
          setIsLoading(false);
          return;
        }

        setStaffName(staffProfile.name);

        const { data: myAssets, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .eq('emp_code', staffProfile.emp_code);

        if (assetsError) throw assetsError;

        if (myAssets) {
          const mappedAssets = myAssets.map((asset: any) => ({
            id: asset.id,
            tag_id: asset.tag_id,
            name: asset.name,
            category: asset.category,
            status: asset.status,
            inspection_status: asset.inspection_status || 'Pending',
            next_inspection_date: asset.next_inspection_date || '-',
          }));
          setAssets(mappedAssets);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAssets();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  const totalAssets = assets.length;
  const inRepair = assets.filter(a => a.status === 'Maintenance').length;
  const pendingInspections = assets.filter(a => 
    !a.inspection_status || 
    a.inspection_status === 'Pending' || 
    a.inspection_status === 'Failed' ||
    a.inspection_status === 'Pending Repair'
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      {/* HEADER WITH QUICK ACTIONS */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 blur-3xl rounded-full opacity-10 -mr-10 -mt-10 pointer-events-none"></div>
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            Welcome back, {staffName || 'Team Member'}! 👋
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-2">
            Here is an overview of the IT assets currently assigned to you.
          </p>
        </div>

        {/* QUICK ACTIONS RESTORED */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto z-10">
          <Link href="/staff/tickets" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-all">
            <Ticket size={18} /> Raise IT Ticket
          </Link>
          <Link href="/staff/requests" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all">
            <PlusCircle size={18} /> Request New Asset
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Laptop size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">My Assets</p>
            <p className="text-2xl font-black text-gray-900">{totalAssets}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <AlertCircle size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Needs Inspection</p>
            <p className="text-2xl font-black text-gray-900">{pendingInspections}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <Wrench size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">In Repair</p>
            <p className="text-2xl font-black text-gray-900">{inRepair}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <PackageSearch className="text-blue-600" size={24} />
          <h2 className="text-lg font-black text-gray-900">Currently Assigned to You</h2>
        </div>

        <div className="p-6">
          {assets.length === 0 ? (
            <div className="text-center py-10">
              <Laptop size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-lg font-black text-gray-800">No Assets Assigned</h3>
              <p className="text-sm font-medium text-gray-500 mt-2">
                You do not have any IT equipment assigned to your account right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 hover:border-blue-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-600 border border-gray-100">
                      <Laptop size={20} />
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                      asset.status === 'Maintenance' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-green-100 text-green-700 border-green-200'
                    }`}>
                      {asset.status}
                    </span>
                  </div>

                  <h3 className="font-black text-gray-900 text-base mb-1 line-clamp-1" title={asset.name}>
                    {asset.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] font-bold text-gray-600 bg-white inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200">
                      <QrCode size={12} /> {asset.tag_id}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">
                      {asset.category}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Inspection Status</p>
                      <p className="text-xs font-black flex items-center gap-1 text-gray-700">
                        {asset.inspection_status === 'Passed' && <CheckCircle2 size={12} className="text-green-500" />}
                        {(asset.inspection_status === 'Pending' || asset.inspection_status === 'Pending Repair' || !asset.inspection_status) && <Clock size={12} className="text-orange-500" />}
                        {asset.inspection_status === 'Failed' && <AlertCircle size={12} className="text-red-500" />}
                        {asset.inspection_status}
                      </p>
                    </div>
                    
                    <Link href={`/staff/assets`} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}