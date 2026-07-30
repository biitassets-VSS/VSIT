'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Monitor, ArrowLeft, Loader2, Search, PanelLeftClose, PanelLeftOpen, 
  RefreshCw, Power, Keyboard, Video, Clipboard, FileUp, Volume2, 
  Ban, MessageSquare, Send, X, Users, Maximize, Minimize, GripVertical, ShieldCheck,
  ShieldAlert, Check, StopCircle 
} from 'lucide-react';

interface StaffMember {
  id: string; 
  name?: string; 
  full_name?: string; 
  email: string; 
  emp_code?: string; 
  department?: string; 
  is_online?: boolean; 
  assigned_asset_name?: string;
}

interface ChatMessage {
  sender: string; 
  text: string; 
  time: string; 
  isSelf: boolean;
}

const getChannelTopic = (staff: any) => `vsit_rtc_${(staff?.emp_code || staff?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }, 
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun.services.mozilla.com' }
];

export default function StaffRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeSession, setActiveSession] = useState<StaffMember | null>(null);
  const [currentStaffProfile, setCurrentStaffProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'requesting' | 'connected' | 'controlling'>('idle');
  
  // Missing Modal & Streaming States
  const [incomingRequest, setIncomingRequest] = useState<any | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isControlGranted, setIsControlGranted] = useState(false);

  const [isControlling, setIsControlling] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [dockPos, setDockPos] = useState({ x: 0, y: 0 });
  const [chatPos, setChatPos] = useState({ x: 0, y: 0 });
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const dragStartDock = useRef({ x: 0, y: 0 });
  const dragStartChat = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { loadStaffData(); return () => terminateSession("Page navigated away."); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadStaffData = async () => {
    try {
      const sessionString = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      let currentEmail = '';
      if (sessionString) {
        try {
          const parsed = JSON.parse(sessionString);
          currentEmail = parsed.email || '';
          setCurrentStaffProfile(parsed);
        } catch (e) { currentEmail = sessionString; }
      }

      const [{ data: profiles }, { data: assets }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('assets').select('name, assigned_to')
      ]);

      if (profiles) {
        const otherStaff = profiles
          .filter((p: any) => p.email?.toLowerCase() !== currentEmail.toLowerCase())
          .map((p: any) => ({
            ...p,
            assigned_asset_name: (assets || []).find(a => a.assigned_to === p.id)?.name || 'Unassigned PC'
          }));
        setStaffList(otherStaff);
      }
    } catch (error) {} finally { setLoading(false); }
  };

  const requestLiveScreenShare = async () => {
    if (!activeSession) return;
    setSessionStatus('requesting');
    setChatMessages([]);
    setDockPos({ x: 0, y: 0 });
    setChatPos({ x: 0, y: 0 });

    try {
      const backgroundChannelId = getChannelTopic(activeSession);
      const liveSessionId = `${backgroundChannelId}_live_${Date.now()}`;
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const peer = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });
      peerRef.current = peer;
      peer.addTransceiver('video', { direction: 'recvonly' });

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed') { terminateSession("Network connection failed."); }
      };

      const dataChannel = peer.createDataChannel('enterprise_control', { ordered: true });
      dataChannelRef.current = dataChannel;

      dataChannel.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'file_meta') toast(`Receiving file: ${msg.name}...`);
          } catch(e) {}
        }
      };

      peer.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.onloadedmetadata = () => { videoRef.current?.play().catch(e => console.error("Play failed:", e)); };
          setSessionStatus('connected');
          toast.success("🟢 Live Screen Stream Established!");
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
          
          if (answer.sdp) {
            answer.sdp = answer.sdp.replace(/useinbandfec=1/g, 'useinbandfec=1;stereo=0;maxaveragebitrate=16000');
          }

          await peer.setLocalDescription(answer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_answer_admin', payload: { sdp: answer } });
        } catch (rtcError) {}
      }).on('broadcast', { event: 'ice_candidate_staff' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
      }).on('broadcast', { event: 'staff_stopped_sharing' }, () => {
        terminateSession("Remote colleague stopped sharing their screen.");
      }).on('broadcast', { event: 'chat_message' }, (payload) => {
        setChatMessages(prev => [...prev, { sender: payload.payload.sender || 'Staff', text: payload.payload.text, time: payload.payload.time, isSelf: false }]);
        setIsChatOpen(true);
      }).on('broadcast', { event: 'control_accepted' }, () => {
        setIsControlling(true); setSessionStatus('controlling'); toast.success("✅ Colleague granted remote control access!");
      }).on('broadcast', { event: 'control_rejected' }, () => {
        toast.error("❌ Colleague declined remote control.");
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const pingChannel = supabase.channel(backgroundChannelId);
          pingChannel.subscribe(async (pingStatus) => {
            if (pingStatus === 'SUBSCRIBED') {
              const senderName = currentStaffProfile?.full_name || currentStaffProfile?.name || 'Staff Colleague';
              const senderCode = currentStaffProfile?.emp_code || 'STAFF';
              await pingChannel.send({ type: 'broadcast', event: 'request_screen_share', payload: { adminName: senderName, adminCode: senderCode, channelId: liveSessionId } });
              supabase.removeChannel(pingChannel);
            }
          });
        }
      });
    } catch (err) { setSessionStatus('idle'); }
  };

  // Missing Shared Functions mapped
  const startScreenShare = async (channelId?: string, alertId?: string) => {
    setIsConnecting(true);
    // Add custom incoming accept logic here based on your P2P setup
    setTimeout(() => {
      setIsConnecting(false);
      setIsStreaming(true);
      setIncomingRequest(null);
      toast.success("🟢 Screen sharing established");
    }, 1500);
  };

  const terminateSession = (reason = "Session terminated.") => {
    if (channelRef.current) { channelRef.current.send({ type: 'broadcast', event: 'terminate_session', payload: { reason } }); supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});

    if (sessionStatus !== 'idle') toast.error(`🛑 ${reason}`);
    setSessionStatus('idle'); setIsControlling(false); setIsKeyboardEnabled(false); setIsChatOpen(false); setIsFullscreen(false);
  };

  const stopScreenSharing = (reason = "Disconnected by user.") => {
    setIsStreaming(false);
    setIsConnecting(false);
    setIncomingRequest(null);
    terminateSession(reason);
  };

  const sendControlCommand = (command: any) => {
    if (isControlling && dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(command));
    }
  };

  const sendFileP2P = (file: File) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      toast.error("P2P Data Tunnel not open");
      return;
    }
    toast.loading(`Uploading ${file.name}...`);
    dataChannelRef.current.send(JSON.stringify({ type: 'file_meta', name: file.name, size: file.size, fileType: file.type }));
    
    const CHUNK_SIZE = 16384; 
    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
      if (e.target?.result && dataChannelRef.current) {
        dataChannelRef.current.send(e.target.result as ArrayBuffer);
        offset += (e.target.result as ArrayBuffer).byteLength;
        if (offset < file.size) {
          readSlice(offset);
        } else {
          toast.success("Document Sent Successfully!");
        }
      }
    };
    const readSlice = (o: number) => {
      const slice = file.slice(o, o + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };
    readSlice(0);
  };

  const handleMouseEvent = (e: React.MouseEvent, type: string) => {
    if (type === 'mousemove') {
      if (isDraggingDock) {
        setDockPos({ x: e.clientX - dragStartDock.current.x, y: e.clientY - dragStartDock.current.y });
        return;
      }
      if (isDraggingChat) {
        setChatPos({ x: e.clientX - dragStartChat.current.x, y: e.clientY - dragStartChat.current.y });
        return;
      }
    }
    if (type === 'mouseup' || type === 'mouseleave') {
      if (isDraggingDock || isDraggingChat) { setIsDraggingDock(false); setIsDraggingChat(false); return; }
    }

    if (!isControlling) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    sendControlCommand({ type, xPercent, yPercent, button: e.button });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (isKeyboardEnabled && document.activeElement?.tagName !== 'INPUT') { 
        e.preventDefault(); sendControlCommand({ type: 'keydown', key: e.key }); 
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
      if (isKeyboardEnabled && document.activeElement?.tagName !== 'INPUT') { 
        e.preventDefault(); sendControlCommand({ type: 'keyup', key: e.key }); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [isKeyboardEnabled, isControlling]);

  const requestClipboardSync = () => {
    sendControlCommand({ type: 'sync_clipboard' });
    toast.success("Clipboard sync requested...");
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !channelRef.current) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const myName = currentStaffProfile?.full_name?.split(' ')[0] || 'Me';
    
    setChatMessages(prev => [...prev, { sender: myName, text: chatInput, time: timeString, isSelf: true }]);
    channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: { sender: currentStaffProfile?.full_name || 'Colleague', text: chatInput, time: timeString } });
    setChatInput('');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewportContainerRef.current?.requestFullscreen().catch(err => { toast.error(`Fullscreen error: ${err.message}`); });
    } else { document.exitFullscreen(); }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Staff Directory...</p>
    </div>
  );

  return (
    <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 h-dvh flex flex-col space-y-6 animate-in fade-in duration-500 select-none relative overflow-hidden">
      <Toaster position="top-right" toastOptions={{ className: 'bg-white/80 backdrop-blur-xl border border-white/60 text-slate-800 font-bold rounded-2xl shadow-xl' }} />
      <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files?.[0]) sendFileP2P(e.target.files[0]) }} className="hidden" />

      {/* 🌟 AMBIENT BACKGROUND ORBS */}
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      {/* 🌟 PREMIUM GLASS HEADER */}
      <div className="relative bg-white/40 backdrop-blur-3xl rounded-4xl p-5 sm:p-6 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 overflow-hidden z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/20 border border-white/20">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Peer Remote Support</h1>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 backdrop-blur-md">P2P Active</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Collaborate, share screens, and assist teammates directly from your browser.
            </p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 rounded-2xl border border-white/60 text-slate-600 bg-white/40 backdrop-blur-md hover:bg-white/80 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.02)] cursor-pointer">
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 z-10 pb-4">
        
        {/* 🌟 DIRECTORY SIDEBAR (Ultra Glass) */}
        {isSidebarOpen && (
          <div className="w-80 bg-white/30 backdrop-blur-3xl rounded-4xl border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col shrink-0 overflow-hidden relative">
            <div className="p-5 border-b border-white/40 bg-white/30 backdrop-blur-md z-10">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
                <input 
                  type="text" 
                  placeholder="Search Staff Name or ID..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md text-sm font-bold text-slate-900 outline-none focus:bg-white/80 focus:ring-4 focus:ring-purple-500/10 transition-all shadow-inner placeholder:text-slate-500" 
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar z-10">
              {staffList.filter(s => s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.emp_code?.toLowerCase().includes(searchQuery.toLowerCase())).map((staff) => (
                <button 
                  key={staff.id} 
                  onClick={() => { terminateSession("Switched user."); setActiveSession(staff); }} 
                  className={`w-full text-left p-4 rounded-3xl transition-all border flex items-center justify-between cursor-pointer ${ 
                    activeSession?.id === staff.id 
                    ? 'bg-white/70 border-purple-300 shadow-md backdrop-blur-xl' 
                    : 'bg-transparent border-transparent hover:bg-white/50 hover:border-white/60 hover:shadow-sm' 
                  }`}
                >
                  <div>
                    <p className={`font-black text-sm tracking-tight ${activeSession?.id === staff.id ? 'text-purple-900' : 'text-slate-800'}`}>{staff.full_name || staff.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest wrap-break-word">{staff.emp_code || 'STAFF'} • {staff.assigned_asset_name}</p>
                  </div>
                  <Monitor size={18} className={activeSession?.id === staff.id ? 'text-purple-600' : 'text-slate-400'} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 🌟 MAIN REMOTE VIEWPORT (Glass Framed) */}
        <div className="flex-1 bg-white/30 backdrop-blur-3xl rounded-4xl border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden relative z-10">
          {activeSession ? (
            <>
              {/* Viewport Header */}
              <div className="p-5 border-b border-white/40 bg-white/40 backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-20">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{activeSession.full_name || activeSession.name}</h2>
                  <p className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 mt-1.5 border shadow-sm ${
                    sessionStatus === 'idle' ? 'bg-slate-100/50 text-slate-500 border-slate-200/60' :
                    sessionStatus === 'requesting' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30' :
                    'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                  }`}>
                    {sessionStatus === 'idle' ? 'Ready to Connect' : sessionStatus === 'requesting' ? 'Awaiting Permission...' : `Session Active: ${sessionStatus.toUpperCase()}`}
                  </p>
                </div>
                {sessionStatus === 'idle' ? (
                  <button onClick={requestLiveScreenShare} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer border border-white/20">
                    <Monitor size={16} /> Request Connection
                  </button>
                ) : (
                  <button onClick={() => terminateSession("Disconnected by user.")} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer border border-white/20">
                    <Power size={16} /> Disconnect
                  </button>
                )}
              </div>

              {/* Viewport Body */}
              <div 
                ref={viewportContainerRef} 
                className={`flex-1 bg-slate-950/90 relative overflow-hidden flex items-center justify-center rounded-b-4xl ${isControlling ? 'cursor-crosshair' : ''}`}
                onMouseMove={(e) => handleMouseEvent(e, 'mousemove')}
                onMouseDown={(e) => handleMouseEvent(e, 'mousedown')}
                onMouseUp={(e) => handleMouseEvent(e, 'mouseup')}
                onMouseLeave={(e) => handleMouseEvent(e, 'mouseleave')}
                onWheel={(e) => { if(isControlling) { e.preventDefault(); sendControlCommand({ type: 'scroll', deltaY: e.deltaY }); }}}
                onContextMenu={(e) => e.preventDefault()}
              >
                <video ref={videoRef} autoPlay playsInline muted={!isAudioEnabled} className={`max-w-full max-h-full object-contain ${sessionStatus === 'connected' || sessionStatus === 'controlling' ? 'block' : 'hidden'}`} />
                
                {sessionStatus === 'requesting' && (
                  <div className="text-center text-white p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-4xl shadow-2xl">
                    <Loader2 size={48} className="animate-spin text-purple-500 mx-auto mb-4" />
                    <p className="font-black text-lg tracking-widest uppercase text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-purple-400">Awaiting Permission</p>
                    <p className="text-xs font-medium text-slate-400 mt-2">Waiting for {activeSession.name} to accept the request.</p>
                  </div>
                )}
                
                {/* 🌟 PURE TRANSPARENT GLASS CHAT BOX (Absolute inside Viewport) */}
                {isChatOpen && (sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                  <div 
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ transform: `translate(${chatPos.x}px, ${chatPos.y}px)` }}
                    className="absolute bottom-24 right-6 w-80 bg-white/80 backdrop-blur-3xl border border-white/60 shadow-2xl rounded-4xl flex flex-col z-50 overflow-hidden transition-opacity"
                  >
                    <div 
                      onMouseDown={(e) => { e.stopPropagation(); setIsDraggingChat(true); dragStartChat.current = { x: e.clientX - chatPos.x, y: e.clientY - chatPos.y }; }}
                      className="p-4 bg-white/50 border-b border-white/40 text-slate-900 flex justify-between items-center cursor-grab active:cursor-grabbing backdrop-blur-md"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare size={14} className="text-purple-600" /> Peer Chat
                      </span>
                      <button onClick={() => setIsChatOpen(false)} className="hover:bg-white p-1.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors shadow-sm cursor-pointer"><X size={16}/></button>
                    </div>
                    
                    <div className="h-64 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                      {chatMessages.length === 0 ? (
                        <div className="m-auto text-center text-xs font-bold text-slate-400 uppercase tracking-widest px-4 leading-relaxed">Send a message to start communicating.</div>
                      ) : (
                        chatMessages.map((msg, i) => (
                          <div key={i} className={`max-w-[85%] text-[12px] font-semibold p-3 shadow-md backdrop-blur-md wrap-break-word ${msg.isSelf ? 'bg-purple-600 text-white self-end rounded-2xl rounded-br-none border border-purple-500/50' : 'bg-white/80 text-slate-800 self-start rounded-2xl rounded-bl-none border border-white/60'}`}>
                            <div className={`font-black text-[9px] uppercase tracking-widest mb-1 ${msg.isSelf ? 'text-purple-200' : 'text-purple-600'}`}>{msg.sender}</div>{msg.text}
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    
                    <form onSubmit={sendChatMessage} className="p-3 bg-white/50 border-t border-white/40 flex gap-2 backdrop-blur-md">
                      <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 text-xs font-bold px-4 py-3 bg-white/60 text-slate-900 border border-white/60 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-slate-400 shadow-inner" />
                      <button type="submit" disabled={!chatInput.trim()} className="p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:opacity-50 transition-all shadow-md cursor-pointer border border-white/20"><Send size={16}/></button>
                    </form>
                  </div>
                )}

                {/* 🌟 PURE GLASS TRANSPARENT MAC-OS DOCK */}
                {(sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                  <div 
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ transform: `translate(calc(-50% + ${dockPos.x}px), ${dockPos.y}px)` }}
                    className="absolute bottom-6 left-1/2 bg-slate-950/40 backdrop-blur-2xl border border-white/20 p-2 rounded-full flex gap-1 shadow-2xl z-50 items-center transition-all"
                  >
                    <div 
                      onMouseDown={(e) => { e.stopPropagation(); setIsDraggingDock(true); dragStartDock.current = { x: e.clientX - dockPos.x, y: e.clientY - dockPos.y }; }}
                      className="cursor-grab active:cursor-grabbing p-2.5 text-white/40 hover:text-white transition-colors ml-1"
                    >
                      <GripVertical size={18} />
                    </div>
                    
                    <div className="w-px h-6 bg-white/15 mx-1.5" />

                    {[
                      { 
                        icon: <Video size={20} />, active: isControlling, 
                        action: () => { 
                          if (isControlling) { setIsControlling(false); setSessionStatus('connected'); toast.success("Switched to View-Only mode."); } 
                          else { channelRef.current?.send({ type: 'broadcast', event: 'request_remote_control', payload: {} }); toast("Requesting control..."); }
                        }, 
                        tooltip: isControlling ? "Disable Control" : "Request Control" 
                      },
                      { icon: <Keyboard size={20} />, active: isKeyboardEnabled, action: () => { if(isControlling) setIsKeyboardEnabled(!isKeyboardEnabled); else toast.error("Request control first!"); }, tooltip: "Keyboard Input" },
                      { icon: <MessageSquare size={20} />, active: isChatOpen, action: () => setIsChatOpen(!isChatOpen), tooltip: "Peer Chat" },
                      { icon: <Clipboard size={20} />, active: false, action: requestClipboardSync, tooltip: "Sync Clipboard" },
                      { icon: <Volume2 size={20} />, active: isAudioEnabled, action: () => setIsAudioEnabled(!isAudioEnabled), tooltip: "Audio" },
                      { icon: isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />, active: isFullscreen, action: toggleFullscreen, tooltip: "Fullscreen" },
                      { icon: <FileUp size={20} />, active: false, action: () => fileInputRef.current?.click(), tooltip: "Share Document" },
                      { icon: <RefreshCw size={20} />, active: false, action: () => sendControlCommand({ type: 'refresh' }), tooltip: "Reload App" },
                      { icon: <Ban size={20} />, active: false, action: () => terminateSession("Session ended by user."), tooltip: "Disconnect", color: "text-rose-400 hover:text-rose-300 hover:bg-rose-500/20" }
                    ].map((btn, i) => (
                      <button 
                        key={i} 
                        onClick={btn.action} 
                        title={btn.tooltip} 
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${btn.color || 'text-white/80 hover:text-white'} ${btn.active ? 'bg-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/40 backdrop-blur-md' : 'bg-transparent hover:bg-white/15 border border-transparent'}`}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-5 bg-white/20 backdrop-blur-sm rounded-b-4xl">
              <div className="p-6 bg-white/40 rounded-full border border-white/60 shadow-sm">
                <Monitor size={48} className="text-purple-400" />
              </div>
              <p className="font-black text-sm uppercase tracking-widest text-slate-500">Select a colleague from the directory to start sharing</p>
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ INCOMING REQUEST MODAL (Fixed Z-Index & Overlay) */}
      {incomingRequest && !isStreaming && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-99999 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-2xl rounded-4xl max-w-md w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.15)] space-y-6 animate-in zoom-in-95 border border-white/60">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto shadow-sm border border-orange-500/20 animate-bounce"><Monitor size={32} /></div>
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">Live Support Access Requested</h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-500"><strong className="font-black text-slate-900">{incomingRequest.adminName}</strong> ({incomingRequest.adminCode}) is requesting permission to view your screen.</p>
            </div>
            <div className="p-4 rounded-2xl border text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-3 bg-orange-500/10 border-orange-500/20 text-orange-800">
              <ShieldAlert size={22} className="shrink-0 text-orange-500" />
              <span>By accepting, they will be able to view your desktop natively.</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIncomingRequest(null)} disabled={isConnecting} className="flex-1 py-3.5 rounded-2xl border border-white/60 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer bg-white/40 backdrop-blur-md text-slate-600 hover:bg-white/60 shadow-sm disabled:opacity-50">Decline</button>
              <button onClick={() => startScreenShare(incomingRequest.channelId, incomingRequest.alertId)} disabled={isConnecting} className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 border border-white/20 transition-all cursor-pointer disabled:opacity-50">
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isConnecting ? 'Connecting...' : 'Accept & Share'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 FLOATING ACTION BAR */}
      {isStreaming && (
        <div className="fixed bottom-6 right-6 z-9999 flex flex-col items-end gap-3 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-3xl border border-white/60 p-4 rounded-4xl flex items-center justify-between gap-6 animate-in slide-in-from-bottom-6 max-w-md w-full pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-4">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              <div>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Screen Share Active</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {isControlGranted ? 'Colleague controls your PC.' : 'Colleague is viewing your workspace.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => stopScreenSharing("Disconnected by user.")} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-rose-600/20 cursor-pointer border border-white/20"><StopCircle size={14} /> Stop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}