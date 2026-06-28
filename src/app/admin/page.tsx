'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, Users, Search, RefreshCw, Plus, 
  Mail, Hash, ShieldCheck, UserX, UserCheck, Loader2
} from 'lucide-react';

export default function AdminStaffDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAuthorization();
  }, []);

  const checkAdminAuthorization = async () => {
    try {
      const sessionStr = localStorage.getItem('vsit_admin_session') || localStorage.getItem('user');
      
      if (!sessionStr) {
        window.location.replace('/');
        return;
      }

      let sessionUser: any = {};
      try { sessionUser = JSON.parse(sessionStr); } 
      catch (e) { sessionUser = { email: sessionStr }; }

      const cleanEmail = sessionUser.email?.toLowerCase().trim();

      if (cleanEmail === 'lakhwinder.bi@outlook.com' || sessionUser.role === 'admin') {
        setIsAuthorized(true);
        await fetchStaffDirectory(); 
      } else {
        // 🌟 THE FIX: Destroy the invalid session before kicking the user out!
        // This breaks the infinite redirect loop.
        localStorage.removeItem('vsit_admin_session');
        localStorage.removeItem('vsit_staff_session');
        localStorage.removeItem('user');
        
        alert("Access Denied: You do not possess structural administrative clearance levels. Please log in again.");
        window.location.replace('/');
      }
    } catch (err) {
      console.error("Authorization check failed:", err);
      // Failsafe clear
      localStorage.removeItem('vsit_admin_session');
      window.location.replace('/');
    }
  };

  const fetchStaffDirectory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error fetching users:", error.message);
        throw error;
      }
      
      setStaffList(data || []);
    } catch (err: any) {
      console.error("Failed to load staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staffList.filter(user => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (user.full_name || user.name || '').toLowerCase().includes(query);
    const emailMatch = (user.email || '').toLowerCase().includes(query);
    const idMatch = (user.emp_code || user.emp_id || '').toLowerCase().includes(query);
    return nameMatch || emailMatch || idMatch;
  });

  const getStatusBadge = (status: string) => {
    const s = (status || 'Active').toLowerCase();
    if (s === 'disabled' || s === 'inactive') {
      return (
        <span className="px-3 py-1 flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-widest">
          <UserX size={12} /> Disabled
        </span>
      );
    }
    return (
      <span className="px-3 py-1 flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-widest">
        <UserCheck size={12} /> Active
      </span>
    );
  };

  if (!isAuthorized || loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
        <Loader2 className="animate-spin h-10 w-10 border-b-4 text-blue-600" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Authenticating Control clearance...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-sans text-slate-800 bg-slate-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push('/admin')} className="p-3 hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Staff Directory</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 font-black text-[10px] uppercase tracking-widest rounded-full shadow-sm">
                {staffList.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold">Manage employee access, profiles, and active statuses.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStaffDirectory} 
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
          <button 
            onClick={() => router.push('/admin/staff/add')} 
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-600/20"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2.5 rounded-3xl border border-slate-200 shadow-sm flex items-center">
        <div className="relative w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Employee Name, Email, or ID Code..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all"
          />
        </div>
      </div>

      {/* STAFF GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black border border-blue-100 shrink-0">
                  {(user.full_name || user.name || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-black text-slate-900 truncate" title={user.full_name || user.name}>
                    {user.full_name || user.name || 'Unnamed User'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ShieldCheck size={12} className={user.role === 'admin' ? 'text-rose-500' : 'text-blue-500'} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {user.role || 'Staff'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Hash size={12}/></div>
                <span className="font-mono font-black text-slate-700">{user.emp_code || user.emp_id || 'NO-ID'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Mail size={12}/></div>
                <span className="font-medium text-slate-600 truncate" title={user.email}>{user.email}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              {getStatusBadge(user.status)}
              
              <button 
                onClick={() => router.push(`/admin/staff/${user.emp_code || user.id}`)}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
              >
                Manage Profile &rarr;
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}