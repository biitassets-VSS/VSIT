// src/app/staff/dashboard/remote/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Users, Monitor, ArrowLeft, Loader2, Network, Search } from 'lucide-react'; // 🌟 Added Search Icon
import RemoteDesktopViewer from '@/components/RemoteDesktopViewer';

export default function StaffRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [peerList, setPeerList] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);

  // 🌟 NEW: Search State
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPeerData();
  }, []);

  const loadPeerData = async () => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      const rawSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      
      if (!rawSession && !isGuest) {
        router.push('/');
        return;
      }

      let currentEmail = '';
      if (!isGuest && rawSession) {
        try { 
          const user = JSON.parse(rawSession); 
          currentEmail = user.email?.toLowerCase().trim();
        } catch (e) { 
          currentEmail = rawSession.toLowerCase().trim(); 
        }
      }

      const { data: profiles } = await supabase.from('profiles').select('*').order('name', { ascending: true });
      
      if (profiles) {
        const peers = profiles.filter(p => p.email?.toLowerCase().trim() !== currentEmail);
        setPeerList(peers);
      }

    } catch (error) {
      console.error('Error loading peer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 NEW: Filtering Logic
  const filteredPeers = peerList.filter(peer => {
    const name = (peer.full_name || peer.name || peer.email || '').toLowerCase();
    const empId = (peer.emp_code || peer.emp_id || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return name.includes(query) || empId.includes(query);
  });

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Connecting to Team Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-4rem)] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/staff/dashboard')} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Network className="text-blue-600" size={24} /> Team Screen Collaboration
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Connect with team members for live troubleshooting.</p>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* Sidebar: Peer Directory with Search */}
          <div className="w-full lg:w-80 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users size={14} /> Team Members ({filteredPeers.length})
              </h3>

              {/* 🌟 NEW: Search Bar UI */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Search Name or Emp ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filteredPeers.length === 0 ? (
                <div className="text-center p-6 text-sm text-slate-400 font-medium">
                  No teammates found matching "{searchQuery}"
                </div>
              ) : (
                filteredPeers.map((peer) => (
                  <button
                    key={peer.id}
                    onClick={() => setActiveSession(peer)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      activeSession?.id === peer.id 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'
                    }`}
                  >
                    <p className={`font-bold text-sm ${activeSession?.id === peer.id ? 'text-blue-900' : 'text-slate-900'}`}>
                      {peer.full_name || peer.name || peer.email.split('@')[0]}
                    </p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">ID: {peer.emp_code || peer.emp_id || 'N/A'}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Area: Screen Viewer */}
          <div className="flex-1 rounded-3xl border border-slate-200 shadow-sm overflow-hidden bg-white relative flex flex-col">
            {activeSession ? (
              <RemoteDesktopViewer 
                targetId={activeSession.emp_code || activeSession.emp_id || activeSession.id} 
                targetName={activeSession.full_name || activeSession.name || 'Teammate'} 
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center mb-6 text-slate-300">
                  <Monitor size={40} />
                </div>
                <h2 className="text-xl font-black text-slate-800">Select a Teammate</h2>
                <p className="text-sm font-medium text-slate-500 mt-2 max-w-md">
                  Choose a team member from the directory to request screen access and collaborate.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}