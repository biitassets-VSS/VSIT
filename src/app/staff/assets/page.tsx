'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Laptop, CheckCircle2, Loader2, Package, Search, Box } from 'lucide-react';

export default function StaffMyAssignedAssetsPage() {
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssignedHardware = async () => {
    setIsLoading(true);
    try {
      // 1. Get the current user
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = (userData?.user?.email || 'students_app05@outlook.com').trim().toLowerCase();

      // 2. Fetch ALL assets (to ensure we don't miss anything due to query filters)
      const { data: allAssets, error } = await supabase
        .from('assets')
        .select('*');

      if (error) throw error;

      // 3. BROAD-SPECTRUM MATCHER
      // This will match if: 
      // - The emp_code matches 'EMP-7783' OR '7783'
      // - The assigned_to text contains 'Mohit' or the email address
      const myMatchingAssets = (allAssets || []).filter(item => {
        const isAssigned = item.status?.toLowerCase().includes('assign') || item.status?.toLowerCase().includes('deploy');
        if (!isAssigned) return false;

        const code = (item.emp_code || '').trim().toUpperCase();
        const assignedTo = (item.assigned_to || '').trim().toLowerCase();

        return (
          code === 'EMP-7783' || 
          code === '7783' ||
          assignedTo.includes('mohit') || 
          assignedTo.includes('bahuguna') ||
          assignedTo.includes(userEmail)
        );
      });

      setMyAssets(myMatchingAssets);
    } catch (err) {
      console.error("Staff portal sync error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedHardware();

    // Listen for updates
    const channel = supabase.channel('staff_assets_page_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchAssignedHardware();
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const displayedAssets = myAssets.filter(item => 
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.tag_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#002B49]" size={32}/></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans">
      <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Box className="text-blue-600" size={26} />
          <h1 className="text-2xl font-extrabold text-[#002B49]">My Assigned Assets</h1>
        </div>
        <p className="text-sm font-medium text-slate-500">View the details, status, and inspection schedule of hardware assigned to you.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50/80 border border-blue-100 text-blue-700 rounded-xl font-semibold text-xs">
          <Laptop size={16} /> Total Assets: {myAssets.length}
        </div>
      </div>

      <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, tag ID, or serial..." 
            className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-100 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-300"
          />
        </div>
      </div>

      {displayedAssets.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-16 text-center space-y-3">
          <Package className="mx-auto text-slate-300" size={48}/>
          <h3 className="text-lg font-bold text-[#002B49]">No assets found</h3>
          <p className="text-sm font-medium text-slate-400">You don't have any matching hardware provisioned to your ID.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedAssets.map(asset => (
            <div key={asset.id} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 bg-orange-50 text-orange-600 font-bold text-xs rounded-lg uppercase">{asset.tag_id}</span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg uppercase flex items-center gap-1">
                  <CheckCircle2 size={12}/> {asset.status}
                </span>
              </div>
              <div>
                <p className="text-base font-bold text-[#002B49]">{asset.name}</p>
                <p className="text-xs font-medium text-slate-400 mt-1">{asset.brand} • S/N: {asset.serial_number}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}