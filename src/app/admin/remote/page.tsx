// src/app/admin/remote/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Users, Monitor, ArrowLeft, Loader2, ShieldAlert, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import RemoteDesktopViewer from '@/components/RemoteDesktopViewer';

export default function AdminRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🌟 State to toggle sidebar for maximum screen space
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => { loadStaffData(); }, []);

  const loadStaffData = async () => {
    try {
      const rawSession = localStorage.getItem('vsit_admin_session') || localStorage.getItem('user');
      if (!rawSession) { router.push('/'); return; }
      
      let activeUser: any = {};
      try { activeUser = JSON.parse(rawSession); } catch (e) { activeUser = { email: rawSession }; }
      if (activeUser.email?.toLowerCase().trim() !== 'lakhwinder.bi@outlook.com' && activeUser.role !== 'admin') {
        router.push('/admin'); return;
      }

      const { data: profiles } = await supabase.from('profiles').select('*').order('name', { ascending: true });
      if (profiles) setStaffList(profiles);
    } catch (error) {
      console.error('Error loading remote data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staffList.filter(staff => {
    const query = searchQuery.toLowerCase();
    return (staff.full_name || staff.name || '').toLowerCase().includes(query) || 
           (staff.emp_code || staff.emp_id || '').toLowerCase().includes(query);
  });

  if (loading) return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-orange-600" size={32} />
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Network Core...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-2 sm:p-4 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-orange-600" size={20} />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin Remote Access</h1>
          </div>
        </div>
        
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors"
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          {isSidebarOpen ? 'Hide Directory' : 'Show Directory'}
        </button>
      </div>

      {/* Main Interface */}
      <div className="flex gap-4 flex-1 min-h-0">
        
        {/* Collapsible Sidebar */}
        {isSidebarOpen && (
          <div className="w-full lg:w-72 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden transition-all duration-300">
            {/* Integrated Search Box inside Header */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Name or Emp ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredStaff.length === 0 ? (
                <div className="text-center p-4 text-xs text-slate-400 font-medium">No matches found.</div>
              ) : (
                filteredStaff.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => setActiveSession(staff)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                      activeSession?.id === staff.id 
                        ? 'bg-orange-50 border-indigo-200' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <p className={`font-bold text-sm leading-tight ${activeSession?.id === staff.id ? 'text-orange-900' : 'text-slate-800'}`}>
                      {staff.full_name || staff.name || staff.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">ID: {staff.emp_code || staff.emp_id || 'N/A'}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Maximized Screen Viewer */}
        <div className="flex-1 rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white relative flex flex-col">
          {activeSession ? (
            <RemoteDesktopViewer 
              targetId={activeSession.emp_code || activeSession.emp_id || activeSession.id} 
              targetName={activeSession.full_name || activeSession.name || 'User'} 
              onMaximize={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
              <Monitor size={48} className="text-slate-300 mb-4" />
              <h2 className="text-lg font-black text-slate-800">Select a User to View Screen</h2>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}