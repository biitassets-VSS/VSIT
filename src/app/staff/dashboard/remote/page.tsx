// src/app/staff/dashboard/remote/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Users, Monitor, ArrowLeft, Loader2, Network, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import RemoteDesktopViewer from '@/components/RemoteDesktopViewer';

export default function StaffRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [peerList, setPeerList] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🌟 State to toggle sidebar for maximum screen space
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => { loadPeerData(); }, []);

  const loadPeerData = async () => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      const rawSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!rawSession && !isGuest) { router.push('/'); return; }

      let currentEmail = '';
      if (!isGuest && rawSession) {
        try { currentEmail = JSON.parse(rawSession).email?.toLowerCase().trim(); } 
        catch (e) { currentEmail = rawSession.toLowerCase().trim(); }
      }

      const { data: profiles } = await supabase.from('profiles').select('*').order('name', { ascending: true });
      if (profiles) setPeerList(profiles.filter(p => p.email?.toLowerCase().trim() !== currentEmail));
    } catch (error) {
      console.error('Error loading peer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPeers = peerList.filter(peer => {
    const query = searchQuery.toLowerCase();
    return (peer.full_name || peer.name || '').toLowerCase().includes(query) || 
           (peer.emp_code || peer.emp_id || '').toLowerCase().includes(query);
  });

  if (loading) return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-purple-600" size={32} />
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Connecting to Team Hub...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-2 sm:p-4 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/staff/dashboard')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Network className="text-purple-600" size={20} />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Team Collaboration</h1>
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
                  placeholder="Search Teammate or Emp ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredPeers.length === 0 ? (
                <div className="text-center p-4 text-xs text-slate-400 font-medium">No matches found.</div>
              ) : (
                filteredPeers.map((peer) => (
                  <button
                    key={peer.id}
                    onClick={() => setActiveSession(peer)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                      activeSession?.id === peer.id 
                        ? 'bg-purple-50 border-purple-200' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <p className={`font-bold text-sm leading-tight ${activeSession?.id === peer.id ? 'text-purple-900' : 'text-slate-800'}`}>
                      {peer.full_name || peer.name || peer.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">ID: {peer.emp_code || peer.emp_id || 'N/A'}</p>
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
              targetName={activeSession.full_name || activeSession.name || 'Teammate'} 
              onMaximize={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
              <Monitor size={48} className="text-slate-300 mb-4" />
              <h2 className="text-lg font-black text-slate-800">Select a Teammate</h2>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}