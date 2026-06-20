'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, Users, ClipboardCheck, 
  Activity, AlertTriangle, ArrowRight,
  CheckCircle2, Wrench, UserCheck, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- Interfaces ---
interface Asset {
  id: string;
  name: string;
  tagId: string;
  status: string;
}

interface StaffProfile {
  id: string;
  name: string;
  init: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    inStock: 0,
    assigned: 0,
    repair: 0,
    discard: 0,
    totalStaff: 0,
    overdueInspections: 0
  });
  
  // LIVE DATA STATES
  const [realStaffList, setRealStaffList] = useState<StaffProfile[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        // Fetch Assets and Real Staff Profiles
        const [assetsResponse, staffResponse] = await Promise.all([
          supabase.from('assets').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, name, first_name') 
        ]);

        if (assetsResponse.error) throw assetsResponse.error;
        if (staffResponse.error) throw staffResponse.error;

        const assetsData = assetsResponse.data || [];
        const staffData = staffResponse.data || [];

        // Format real staff names and initials for the thumbnails
        const formattedStaff = staffData.map((s: any) => {
          const fullName = s.full_name || s.name || s.first_name || 'Staff Member';
          // Create 2-letter initials (e.g. "John Doe" -> "JD")
          const init = fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          return { id: s.id, name: fullName, init };
        });

        // Check for overdue inspections
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const overdueCount = assetsData.filter((a: any) => {
          if (!a.next_inspection_date || a.next_inspection_date === '-') return false;
          const nextDate = new Date(a.next_inspection_date);
          return nextDate < today;
        }).length;

        if (isMounted) {
          setRealStaffList(formattedStaff);
          
          setStats({
            totalAssets: assetsData.length,
            inStock: assetsData.filter((a: any) => a.status === 'Available' || a.status === 'In Stock (Available)').length,
            assigned: assetsData.filter((a: any) => a.status === 'Assigned').length,
            repair: assetsData.filter((a: any) => a.status === 'Maintenance').length,
            discard: assetsData.filter((a: any) => a.status === 'Retired').length,
            totalStaff: staffData.length,
            overdueInspections: overdueCount
          });

          const mappedRecentAssets = assetsData.slice(0, 4).map((a: any) => ({
            id: a.id,
            name: a.name,
            tagId: a.tag_id,
            status: a.status
          }));
          
          setRecentAssets(mappedRecentAssets);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();

    // LIVE SUPABASE REALTIME PRESENCE (Microsoft Teams Engine)
    const presenceRoom = supabase.channel('online-users');

    presenceRoom
      .on('presence', { event: 'sync' }, () => {
        if (isMounted) {
          const newState = presenceRoom.presenceState();
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

  // Sort staff so ONLINE users appear first in the thumbnails!
  const sortedStaffList = [...realStaffList].sort((a, b) => {
    const aOnline = onlineIds.includes(a.id) ? 1 : 0;
    const bOnline = onlineIds.includes(b.id) ? 1 : 0;
    return bOnline - aOnline; 
  });

  const activeOnlineCount = Math.min(onlineIds.length, stats.totalStaff); 
  const offlineCount = Math.max(0, stats.totalStaff - activeOnlineCount);

  // Colors for thumbnails
  const thumbColors = ['bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Welcome Back, Admin 👋</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Here is the detailed overview of your inventory and staff.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================== */}
        {/* LEFT COLUMN (DETAILED STATS & RECENT)      */}
        {/* ========================================== */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* 1. ASSET OVERVIEW CARD */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-500 mb-1">Total Assets</p>
                  <h3 className="text-4xl font-black text-gray-900">{isLoading ? '-' : stats.totalAssets}</h3>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                  <Package size={24} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-green-50/50 border border-green-100 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600"/>
                    <span className="text-xs font-bold text-green-800">In Stock</span>
                  </div>
                  <span className="text-sm font-black text-green-900">{isLoading ? '-' : stats.inStock}</span>
                </div>
                
                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-blue-600"/>
                    <span className="text-xs font-bold text-blue-800">Assigned</span>
                  </div>
                  <span className="text-sm font-black text-blue-900">{isLoading ? '-' : stats.assigned}</span>
                </div>

                <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-orange-600"/>
                    <span className="text-xs font-bold text-orange-800">Repair</span>
                  </div>
                  <span className="text-sm font-black text-orange-900">{isLoading ? '-' : stats.repair}</span>
                </div>

                <div className="bg-red-50/50 border border-red-100 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 size={16} className="text-red-500"/>
                    <span className="text-xs font-bold text-red-800">Discard</span>
                  </div>
                  <span className="text-sm font-black text-red-900">{isLoading ? '-' : stats.discard}</span>
                </div>
              </div>
            </div>

            {/* 2. STAFF OVERVIEW CARD (WITH LIVE THUMBNAILS) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-500 mb-1 flex items-center gap-2">
                    Total Staff 
                    <span className="text-[9px] bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded-full animate-pulse tracking-wider uppercase">Live Sync</span>
                  </p>
                  <h3 className="text-4xl font-black text-gray-900">{isLoading ? '-' : stats.totalStaff}</h3>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-2">
                    <Users size={24} />
                  </div>
                  
                  {/* REAL DATA OVERLAPPING THUMBNAILS */}
                  {!isLoading && (
                    <div className="flex -space-x-3 items-center">
                      {sortedStaffList.slice(0, 4).map((staff, i) => {
                        const isOnline = onlineIds.includes(staff.id);
                        const bgClass = thumbColors[i % thumbColors.length];
                        
                        return (
                          <div key={staff.id} className="relative z-10 hover:z-50 transition-all cursor-pointer" title={staff.name}>
                            <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${bgClass} shadow-sm`}>
                              {staff.init}
                            </div>
                            {/* MICROSOFT TEAMS STATUS DOT */}
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </div>
                        );
                      })}
                      {stats.totalStaff > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-500 shadow-sm z-0">
                          +{stats.totalStaff - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Staff Status Breakdown */}
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="text-sm font-bold text-gray-700">Online / Active</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">{isLoading ? '-' : activeOnlineCount}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                    <span className="text-sm font-bold text-gray-700">Offline / Away</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">{isLoading ? '-' : offlineCount}</span>
                </div>
              </div>
            </div>

          </div>

          {/* RECENT ASSETS WIDGET */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Activity size={20} className="text-teal-600" /> Recently Added
              </h2>
              <Link href="/admin/assets" className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ArrowRight size={16} />
              </Link>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center p-4 text-gray-400 font-bold text-sm">Loading Database...</div>
              ) : recentAssets.length === 0 ? (
                <div className="text-center p-6 text-gray-400 font-bold text-sm bg-gray-50 rounded-2xl">No assets found in inventory.</div>
              ) : (
                recentAssets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 font-mono text-[10px] font-black">
                        {asset.tagId.split('-')[1] || 'AST'}
                      </div>
                      <div>
                        <p className="font-black text-sm text-gray-900">{asset.name}</p>
                        <p className="text-[11px] font-bold text-gray-500 uppercase">{asset.tagId}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${
                      asset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                      asset.status === 'Maintenance' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                      asset.status === 'Retired' ? 'bg-red-50 text-red-700 border-red-100' : 
                      'bg-green-50 text-green-700 border-green-100'
                    }`}>
                      {asset.status === 'Maintenance' ? 'Repair' : asset.status === 'Retired' ? 'Discard' : asset.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN (QUICK ACTIONS & ALERTS)      */}
        {/* ========================================== */}
        <div className="space-y-6">
          
          {/* QUICK ACTIONS WIDGET */}
          <div className="bg-white rounded-[32px] p-7 sm:p-8 shadow-sm border border-gray-100">
            <h2 className="text-[22px] font-black text-[#0f172a] mb-6">Quick Actions</h2>
            
            <div className="space-y-3.5">
              <Link href="/admin/assets" className="flex items-center justify-between p-5 bg-[#f0fcf9] hover:bg-[#e1f8f3] transition-colors rounded-2xl group">
                <span className="font-black text-[15px] text-[#0d7a66] tracking-tight">Manage Assets</span>
                <Package size={22} className="text-[#0d7a66] opacity-90 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              </Link>

              <Link href="/admin/staff" className="flex items-center justify-between p-5 bg-[#f8fafc] hover:bg-[#f1f5f9] transition-colors rounded-2xl group border border-transparent hover:border-gray-100">
                <span className="font-black text-[15px] text-[#334155] tracking-tight">Register Staff</span>
                <Users size={22} className="text-[#94a3b8] group-hover:text-[#64748b] group-hover:scale-110 transition-all" strokeWidth={2.5} />
              </Link>

              <Link href="/admin/inspections" className="flex items-center justify-between p-5 bg-[#f8fafc] hover:bg-[#f1f5f9] transition-colors rounded-2xl group border border-transparent hover:border-gray-100">
                <span className="font-black text-[15px] text-[#334155] tracking-tight">Review Inspections</span>
                <ClipboardCheck size={22} className="text-[#94a3b8] group-hover:text-[#64748b] group-hover:scale-110 transition-all" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {/* DYNAMIC ALERTS WIDGET */}
          <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-900 mb-1">Attention Required</h3>
                <p className="text-xs font-bold text-red-700/80 leading-relaxed mb-3">
                  You have <span className="text-red-600 font-black px-1">{isLoading ? '-' : stats.overdueInspections}</span> assets with overdue inspections that need your review.
                </p>
                <Link href="/admin/assets" className="text-xs font-black text-red-700 bg-red-100 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors inline-block">
                  Review Now
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}