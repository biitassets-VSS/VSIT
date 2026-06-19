'use client';

import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, Search, QrCode, Laptop, CheckCircle2, 
  Clock, Hash, Calendar, AlertCircle, Loader2 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface AssignedAsset {
  id: string;
  tag_id: string;
  name: string;
  category: string;
  serial_number: string;
  status: string;
  condition: string;
  purchase_date: string;
  inspection_status: string;
  next_inspection_date: string;
}

export default function StaffAssetsPage() {
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const fetchMyAssets = async () => {
      try {
        // 1. Get Logged-in User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        // 2. Find their Staff Profile to get their Employee Code
        const { data: staffProfile, error: staffError } = await supabase
          .from('staff')
          .select('emp_code')
          .eq('email', user.email)
          .single();

        if (staffError || !staffProfile) {
          console.error("Could not find staff profile for this email.");
          setIsLoading(false);
          return;
        }

        // 3. Fetch Real Assets assigned to this Employee Code
        const { data: myAssets, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .eq('emp_code', staffProfile.emp_code)
          .order('created_at', { ascending: false });

        if (assetsError) throw assetsError;

        if (myAssets) {
          setAssets(myAssets);
        }

      } catch (error) {
        console.error("Error fetching assets:", error);
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

  // Filter Logic
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.tag_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || asset.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <PackageSearch size={28} className="text-blue-600" /> My Assigned Assets
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            View the details, status, and inspection schedule of hardware assigned to you.
          </p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2 text-sm font-bold shadow-sm">
          <Laptop size={18} /> Total Assets: {assets.length}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name, tag ID, or serial..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" 
          />
        </div>
        <div className="relative w-full sm:w-auto min-w-[200px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Assigned">Active / Assigned</option>
            <option value="Maintenance">In Maintenance</option>
          </select>
        </div>
      </div>

      {/* ASSET GRID */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-[24px] p-10 text-center shadow-sm border border-gray-100">
          <Laptop size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-black text-gray-800">No assets found</h3>
          <p className="text-sm font-medium text-gray-500 mt-2">
            You don't have any matching assets assigned to your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <motion.div 
              key={asset.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gray-50/80 p-5 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-gray-900 text-lg line-clamp-1">{asset.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <QrCode size={12} /> {asset.tag_id}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{asset.category}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                  asset.status === 'Maintenance' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  {asset.status === 'Maintenance' ? 'In Repair' : 'Active'}
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Serial Number</p>
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                      <Hash size={12} className="text-gray-400" /> {asset.serial_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Condition</p>
                    <p className="text-xs font-bold text-gray-800">{asset.condition || 'Not Specified'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assigned / Purchase Date</p>
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <Calendar size={12} className="text-gray-400" /> {asset.purchase_date || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between mt-2">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Inspection Status</p>
                    <p className="text-xs font-black flex items-center gap-1.5 text-gray-700">
                      {asset.inspection_status === 'Passed' && <CheckCircle2 size={14} className="text-green-500" />}
                      {asset.inspection_status === 'Failed' && <AlertCircle size={14} className="text-red-500" />}
                      {(asset.inspection_status === 'Pending' || asset.inspection_status === 'Pending Repair') && <Clock size={14} className="text-orange-500" />}
                      {asset.inspection_status || 'Pending'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Next Due</p>
                    <p className="text-xs font-bold text-gray-600">{asset.next_inspection_date || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
}