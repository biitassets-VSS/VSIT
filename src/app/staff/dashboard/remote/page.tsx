'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Monitor, Copy, AlertTriangle, Key, Radio } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

export default function RemoteSupportPage() {
  const [staffInfo, setStaffInfo] = useState({ emp_id: '...', assigned_pc: 'Loading...' });

  useEffect(() => {
    const fetchInfo = async () => {
      const sessionString = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionString) return;

      let user: any = {};
      try { user = JSON.parse(sessionString); } catch (e) { return; }

      const email = user.email?.toLowerCase().trim();
      const { data: profile } = await supabase.from('profiles').select('emp_code, id').ilike('email', email).single();
      
      let pcName = 'Not Assigned';
      if (profile) {
        const { data: assets } = await supabase.from('assets').select('name').eq('assigned_to', profile.id).single();
        if (assets) pcName = assets.name;
      }

      setStaffInfo({
        emp_id: profile?.emp_code || 'EMP-UNKNOWN',
        assigned_pc: pcName
      });
    };
    fetchInfo();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleManualShareRequest = () => {
    // 🌟 TRIGGER THE GLOBAL ENGINE FROM layout.tsx
    if (typeof window !== 'undefined' && (window as any).triggerGlobalScreenShare) {
      (window as any).triggerGlobalScreenShare();
    } else {
      toast.error("Screen share engine is initializing. Please wait a moment and try again.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Monitor size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">IT Remote Support Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">Live Signaling Active</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              View your workstation credentials and connect with IT administration for live screen sharing and diagnostics.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NATIVE WEBRTC CONNECTION PANEL */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col relative overflow-hidden shadow-sm">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600" />
          
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <Monitor size={16} className="text-orange-500"/> Native WebRTC Connection
          </h2>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4">
            <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Workstation</p>
              <p className="text-lg font-black text-slate-800">{staffInfo.assigned_pc}</p>
              <p className="text-xs font-medium text-slate-500">ID: {staffInfo.emp_id}</p>
            </div>

            {/* 🌟 WIRED BUTTON */}
            <button 
              onClick={handleManualShareRequest}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
            >
              <Radio size={16} />
              <span>Share Screen Now</span>
            </button>
            
            <p className="text-[11px] text-slate-500 font-medium px-4">
              Click to instantly open a secure, peer-to-peer screen sharing tunnel directly with the IT Admin dashboard.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-slate-400 flex items-center gap-1.5"><ShieldCheck size={14}/> TLS 1.3 Secure</span>
            <span className="text-emerald-500 flex items-center gap-1.5">🟢 Online & Ready</span>
          </div>
        </div>

        {/* 3RD PARTY FALLBACK PANEL (e.g. RustDesk / AnyDesk) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
            <Key size={16} className="text-purple-600"/> 3rd-Party Fallback Credentials
          </h2>

          <p className="text-xs text-slate-600 font-medium mb-6 leading-relaxed">
            Provide these credentials to your IT Administrator over telephone or support chat ONLY if the native WebRTC connection above fails.
          </p>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">RustDesk / AnyDesk ID</p>
                <p className="text-base font-black text-slate-800 font-mono tracking-wider">Not Assigned</p>
              </div>
              <button 
                onClick={() => copyToClipboard('Not Assigned', 'Remote ID')}
                className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy size={12}/> Copy ID
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Access PIN / Password</p>
                <p className="text-base font-black text-slate-800 font-mono tracking-wider">••••••••</p>
              </div>
              <button 
                onClick={() => copyToClipboard('No Password Set', 'Access PIN')}
                className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy size={12}/> Copy PIN
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 items-start">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
              Never share your remote credentials with anyone outside of authorized Virtual Staffing IT Administration.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}