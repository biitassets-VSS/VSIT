'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Wifi, WifiOff, Loader2, Search, 
  UserCircle, ShieldCheck, Mail 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface StaffMember {
  id: string;
  name: string;
  empCode: string;
  email: string;
  isOnline: boolean;
}

export default function AdminStaffStatusPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch Staff Directory
    const fetchStaffProfiles = async () => {
      try {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (isMounted && profiles) {
          setStaff(profiles.map((p: any) => ({
            id: p.id,
            name: p.full_name || p.name || p.first_name || 'Staff Member',
            empCode: p.emp_code || p.employee_code || p.emp_id || 'N/A',
            email: p.email || 'No email',
            isOnline: false 
          })));
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStaffProfiles();

    // 2. Subscribe to Real-Time Presence (The "Microsoft Teams" Engine)
    const presenceRoom = supabase.channel('online-users');

    presenceRoom
      .on('presence', { event: 'sync' }, () => {
        if (isMounted) {
          const newState = presenceRoom.presenceState();
          // Extract user IDs of everyone currently active in the room
          const activeUserIds = Object.keys(newState);
          setOnlineIds(activeUserIds);
        }
      })
      .subscribe();

    return () => { 
      isMounted = false;
      supabase.removeChannel(presenceRoom); 
    };
  }, []);

  // Filter & Math
  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.empCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const onlineCount = staff.filter(s => onlineIds.includes(s.id)).length;
  const offlineCount = staff.length - onlineCount;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#002B49] flex items-center gap-2">
              <Users size={28} className="text-orange-500" />
              Team Directory & Status
            </h1>
            <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded-full animate-pulse tracking-wider uppercase">Live Sync Active</span>
          </div>
          <p className="text-sm font-medium text-gray-500 mt-1">Track which staff members are currently online and using the workspace.</p>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* REAL-TIME HERO STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Total Headcount</p>
            <p className="text-2xl font-black text-[#002B49]">{staff.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-green-100 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
            <Wifi size={24} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[11px] font-black text-green-600 uppercase tracking-wider">Online Right Now</p>
            <p className="text-2xl font-black text-green-900">{onlineCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center shrink-0">
            <WifiOff size={24} />
          </div>
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Away / Offline</p>
            <p className="text-2xl font-black text-gray-900">{offlineCount}</p>
          </div>
        </div>
      </div>

      {/* TEAM STATUS DIRECTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full p-10 text-center font-bold text-gray-400 bg-white rounded-[24px] border border-gray-100">
            No staff found matching your search.
          </div>
        ) : (
          filteredStaff.map((member) => {
            const isUserOnline = onlineIds.includes(member.id);
            
            return (
              <div key={member.id} className="bg-white p-5 rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    {/* Status Indicator Avatar (Microsoft Teams style) */}
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-50 border border-gray-200 text-[#002B49] font-black text-lg rounded-full flex items-center justify-center uppercase">
                        {member.name.charAt(0)}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isUserOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-[#002B49] group-hover:text-orange-600 transition-colors leading-tight">{member.name}</h4>
                      <p className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase mt-1 w-fit">{member.empCode}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 truncate pr-2">
                    <Mail size={12} className="shrink-0"/> <span className="truncate">{member.email}</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${isUserOnline ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                    {isUserOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}