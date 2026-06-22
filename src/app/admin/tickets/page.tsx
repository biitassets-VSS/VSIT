'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Search, Users, Mail, 
  Hash, Shield, UserCheck
} from 'lucide-react';

export default function AdminStaffDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      // Fetch Profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch Assets to count assignments
      const { data: assetData } = await supabase.from('assets').select('assigned_to');

      if (profileData) {
        const enhancedStaff = profileData.map(user => {
          // Count how many assets are assigned to this user ID
          const assetCount = (assetData || []).filter(a => a.assigned_to === user.id).length;
          return { ...user, assetCount };
        });
        setStaff(enhancedStaff);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || 
           s.name?.toLowerCase().includes(q) || 
           s.email?.toLowerCase().includes(q) ||
           s.emp_code?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Staff Directory</h1>
              <span className="px-3 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 font-black text-xs rounded-full">
                {staff.length} Members
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Manage employee network access and view account profiles</p>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs flex items-center">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Employee Name, Email, or EMP Code..." 
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-[#002B49] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* STAFF GRID */}
      {loading ? (
        <div className="w-full py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B49]"></div></div>
      ) : filteredStaff.length === 0 ? (
        <div className="w-full py-20 bg-white rounded-3xl border border-gray-100 text-center space-y-2">
          <Users size={40} className="mx-auto text-gray-300" />
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">No Staff Found</h3>
          <p className="text-xs text-gray-400 font-medium">No matching profiles exist in the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors flex flex-col gap-4">
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100 shrink-0">
                  {user.full_name?.charAt(0) || user.name?.charAt(0) || <UserCheck size={20} />}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-black text-gray-900 truncate">{user.full_name || user.name || 'Unnamed User'}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-wider mt-0.5">
                    <Shield size={10} className="text-emerald-500" />
                    <span>{user.role || 'Staff Member'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <Hash size={14} className="text-gray-400" />
                  <span>{user.emp_code || user.emp_id || 'NO-CODE-ASSIGNED'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Hardware Held:</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.assetCount > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {user.assetCount} Assets
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}