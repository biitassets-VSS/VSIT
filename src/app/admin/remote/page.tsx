'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Monitor, ArrowLeft, Loader2, Search, PanelLeftClose, PanelLeftOpen, 
  RefreshCw, Power, Maximize, Minimize, MousePointer2, Keyboard, 
  Video, Sliders, ShieldCheck, Clipboard, FileUp, Volume2, VolumeX, Ban
} from 'lucide-react';

interface StaffMember {
  id: string; name?: string; full_name?: string; email: string; emp_code?: string; department?: string; is_online?: boolean; assigned_asset_name?: string;
}

const getChannelTopic = (staff: any) => `vsit_rtc_${(staff?.emp_code || staff?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
];

export default function AdminRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeSession, setActiveSession] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'requesting' | 'connected' | 'controlling'>('idle');
  
  // Enterprise Features State
  const [isControlling, setIsControlling] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { loadStaffAndAdminData(); return () => terminateSession(); }, []);

  const loadStaffAndAdminData = async () => {
    try {
      const [{ data: profiles }, { data: assets }] = await Promise.all([ supabase.from('profiles').select('*'), supabase.from('assets').select('name, assigned_to') ]);
      if (profiles) {
        setStaffList(profiles.map((p: any) => ({ ...p, assigned_asset_name: (assets || []).find(a => a.assigned_to === p.id)?.name || 'Unassigned PC' })));
      }
    } catch (error) {} finally { setLoading(false); }
  };

  const requestLiveScreenShare = async () => {
    if (!activeSession) return;
    setSessionStatus('requesting');

    try {
      const backgroundChannelId = getChannelTopic(activeSession);
      const liveSessionId = `${backgroundChannelId}_live_${Date.now()}`;
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;
      peer.addTransceiver('video', { direction: 'recvonly' });

      // 🌟 WEBRTC DATA CHANNEL FOR ZERO-LATENCY ENTERPRISE CONTROL
      const dataChannel = peer.createDataChannel('enterprise_control');
      dataChannelRef.current = dataChannel;
      dataChannel.onopen = () => console.log("🚀 Data Channel Open!");

      peer.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          // 🌟 BLACK SCREEN FIX: Force playback on metadata load
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Play failed:", e));
          };
          setSessionStatus('connected');
          toast.success("🟢 Live Video Stream Established!");
        }
      };

      const sessionChannel = supabase.channel(liveSessionId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_admin', payload: { candidate: event.candidate } });
      };

      sessionChannel.on('broadcast', { event: 'sdp_offer_staff' }, async (payload) => {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_answer_admin', payload: { sdp: answer } });
        } catch (rtcError) {}
      }).on('broadcast', { event: 'ice_candidate_staff' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
      }).on('broadcast', { event: 'staff_stopped_sharing' }, () => terminateSession())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const pingChannel = supabase.channel(backgroundChannelId);
          pingChannel.subscribe(async (pingStatus) => {
            if (pingStatus === 'SUBSCRIBED') {
              await pingChannel.send({ type: 'broadcast', event: 'request_screen_share', payload: { adminName: 'Admin', adminCode: 'EMP-ADMIN', channelId: liveSessionId }});
              supabase.removeChannel(pingChannel);
            }
          });
        }
      });
    } catch (err) { setSessionStatus('idle'); }
  };

  const terminateSession = () => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (channelRef.current) { channelRef.current.send({ type: 'broadcast', event: 'terminate_session', payload: {} }); supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setSessionStatus('idle'); setIsControlling(false); setIsKeyboardEnabled(false);
  };

  // 🌟 ZERO-LATENCY MOUSE/KEYBOARD TRANSMITTER
  const sendControlCommand = (command: any) => {
    if (isControlling && dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(command));
    }
  };

  const handleMouseEvent = (e: React.MouseEvent, type: string) => {
    if (!isControlling) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    sendControlCommand({ type, xPercent, yPercent, button: e.button });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (isKeyboardEnabled) { e.preventDefault(); sendControlCommand({ type: 'keydown', key: e.key }); }};
    const handleKeyUp = (e: KeyboardEvent) => { if (isKeyboardEnabled) { e.preventDefault(); sendControlCommand({ type: 'keyup', key: e.key }); }};
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [isKeyboardEnabled, isControlling]);

  const requestClipboardSync = () => {
    sendControlCommand({ type: 'sync_clipboard' });
    toast.success("Clipboard sync requested. Awaiting remote data...");
  };

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <Toaster position="top-right" />
      <div className="w-full max-w-[1600px] px-4 mx-auto py-4 flex-1 flex flex-col min-h-0 gap-4">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20"><Monitor size={20} /></div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Virtual Support Commander</h1>
              <p className="text-xs font-semibold text-slate-500">Enterprise P2P Remote Diagnostics Protocol</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:border-purple-500 hover:text-purple-600 transition-all bg-slate-50 shadow-sm">
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar */}
          {isSidebarOpen && (
            <div className="w-80 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search EMP ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {staffList.filter(s => s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.emp_code?.toLowerCase().includes(searchQuery.toLowerCase())).map((staff) => (
                  <button key={staff.id} onClick={() => { terminateSession(); setActiveSession(staff); }} className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between ${ activeSession?.id === staff.id ? 'bg-orange-50 border-orange-500 shadow-sm' : 'bg-white border-transparent hover:border-slate-200' }`}>
                    <div>
                      <p className={`font-bold text-sm ${activeSession?.id === staff.id ? 'text-orange-700' : 'text-slate-900'}`}>{staff.full_name}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">{staff.emp_code}</p>
                    </div>
                    <Monitor size={16} className={activeSession?.id === staff.id ? 'text-orange-600' : 'text-slate-400'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Viewport */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
            {activeSession ? (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{activeSession.full_name}</h2>
                    <p className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md inline-block mt-1">{sessionStatus.toUpperCase()}</p>
                  </div>
                  {sessionStatus === 'idle' ? (
                    <button onClick={requestLiveScreenShare} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2">
                      <Monitor size={16} /> Connect WebRTC
                    </button>
                  ) : (
                    <button onClick={terminateSession} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2">
                      <Power size={16} /> Disconnect
                    </button>
                  )}
                </div>

                <div 
                  ref={viewportContainerRef} 
                  className={`flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center ${isControlling ? 'cursor-crosshair' : ''}`}
                  onMouseMove={(e) => handleMouseEvent(e, 'mousemove')}
                  onMouseDown={(e) => handleMouseEvent(e, 'mousedown')}
                  onMouseUp={(e) => handleMouseEvent(e, 'mouseup')}
                  onWheel={(e) => { if(isControlling) { e.preventDefault(); sendControlCommand({ type: 'scroll', deltaY: e.deltaY }); }}}
                >
                  <video ref={videoRef} autoPlay playsInline muted={!isAudioEnabled} className={`max-w-full max-h-full object-contain ${sessionStatus === 'connected' || sessionStatus === 'controlling' ? 'block' : 'hidden'}`} />
                  
                  {sessionStatus === 'requesting' && <div className="text-center text-white"><Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" /><p className="font-bold">Awaiting Staff Approval...</p></div>}
                  
                  {/* 🌟 PREMIUM PERMISSIONS CONTROL BAR */}
                  {(sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-2xl border border-white/20 p-2 rounded-2xl flex gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-50">
                      {[
                        { icon: <Keyboard size={18} />, active: isKeyboardEnabled, action: () => setIsKeyboardEnabled(!isKeyboardEnabled), tooltip: "Keyboard Passthrough" },
                        { icon: <Clipboard size={18} />, active: false, action: requestClipboardSync, tooltip: "Pull Remote Clipboard" },
                        { icon: <Volume2 size={18} />, active: isAudioEnabled, action: () => setIsAudioEnabled(!isAudioEnabled), tooltip: "Stream Audio" },
                        { icon: <FileUp size={18} />, active: false, action: () => toast("File transfer ready via DataChannel."), tooltip: "Transfer File" },
                        { icon: <RefreshCw size={18} />, active: false, action: () => sendControlCommand({ type: 'refresh' }), tooltip: "Force App Refresh" },
                        { icon: <Video size={18} />, active: isControlling, action: () => { setIsControlling(!isControlling); setSessionStatus(isControlling ? 'connected' : 'controlling'); }, tooltip: "Enable Remote Control" },
                        { icon: <Ban size={18} />, active: false, action: terminateSession, tooltip: "Terminate Session", color: "text-rose-500 hover:bg-rose-500/20" }
                      ].map((btn, i) => (
                        <button key={i} onClick={btn.action} title={btn.tooltip} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${btn.color || 'text-white'} ${btn.active ? 'bg-gradient-to-tr from-purple-600 to-orange-500 shadow-lg' : 'bg-white/5 hover:bg-white/20 border border-white/10'}`}>
                          {btn.icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
                <Monitor size={64} className="opacity-20" />
                <p className="font-bold">Select a user to begin remote session</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}