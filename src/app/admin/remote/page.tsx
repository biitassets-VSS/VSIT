'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Monitor, ArrowLeft, Loader2, Search, PanelLeftClose, PanelLeftOpen, 
  RefreshCw, Power, Keyboard, Video, Clipboard, FileUp, Volume2, 
  Ban, MessageSquare, Send, X, Maximize, Minimize, GripVertical, Wifi,
  Cpu
} from 'lucide-react';

interface StaffMember { id: string; name?: string; full_name?: string; email: string; emp_code?: string; department?: string; is_online?: boolean; assigned_asset_name?: string; }
interface ChatMessage { sender: string; text: string; time: string; isSelf: boolean; }
const getChannelTopic = (staff: any) => `vsit_rtc_${(staff?.emp_code || staff?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

const iceServers = [ 
  { urls: 'stun:stun.l.google.com:19302' }, 
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:vsit-portal.metered.ca:80', username: 'b13ed4c71d2d26a5a93f2f60', credential: 'oIXCegcSeNTsCZSG' },
  { urls: 'turn:vsit-portal.metered.ca:443', username: 'b13ed4c71d2d26a5a93f2f60', credential: 'oIXCegcSeNTsCZSG' },
  { urls: 'turn:vsit-portal.metered.ca:443?transport=tcp', username: 'b13ed4c71d2d26a5a93f2f60', credential: 'oIXCegcSeNTsCZSG' }
];

export default function AdminRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeSession, setActiveSession] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'requesting' | 'connected' | 'controlling'>('idle');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [isControlling, setIsControlling] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'high' | 'med' | 'low'>('high');
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [dockPos, setDockPos] = useState({ x: 0, y: 0 });
  const [chatPos, setChatPos] = useState({ x: 0, y: 0 });
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  
  const dragStartDock = useRef({ x: 0, y: 0 });
  const dragStartChat = useRef({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const controlChannelRef = useRef<any>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  const lastMoveTimeRef = useRef<number>(0);
  const lastBroadcastRef = useRef<number>(0);

  // 🌟 THEME SYNC
  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    loadStaffAndAdminData();
    return () => {
      observer.disconnect();
      terminateSession();
    };
  }, []);
  
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);
  
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadStaffAndAdminData = async () => {
    try {
      const [{ data: profiles }, { data: assets }] = await Promise.all([ supabase.from('profiles').select('*'), supabase.from('assets').select('name, assigned_to') ]);
      if (profiles) setStaffList(profiles.map((p: any) => ({ ...p, assigned_asset_name: (assets || []).find((a: any) => a.assigned_to === p.id)?.name || 'Unassigned PC' })));
    } catch (error) {} finally { setLoading(false); }
  };

  const requestLiveScreenShare = async () => {
    if (!activeSession) return;
    setSessionStatus('requesting');
    setChatMessages([]);
    setDockPos({ x: 0, y: 0 });
    setChatPos({ x: 0, y: 0 });
    setVideoQuality('high');

    try {
      const backgroundChannelId = getChannelTopic(activeSession);
      const liveSessionId = `${backgroundChannelId}_live_${Date.now()}`;
      if (signalingChannelRef.current) supabase.removeChannel(signalingChannelRef.current);

      const peer = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 10 });
      peerRef.current = peer;
      peer.addTransceiver('video', { direction: 'recvonly' });

      const dataChannel = peer.createDataChannel("controls", { ordered: false, maxRetransmits: 0 });
      dataChannelRef.current = dataChannel;

      peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'closed') {
          terminateSession();
        }
      };

      peer.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.onloadedmetadata = () => { videoRef.current?.play().catch(e => console.error("Play failed:", e)); };
          setSessionStatus('connected');
          toast.success("🟢 Live Video Stream Established!");
        }
      };

      const sessionChannel = supabase.channel(liveSessionId, { config: { broadcast: { self: false, ack: false } } });
      signalingChannelRef.current = sessionChannel;

      const controlChannel = supabase.channel(`${liveSessionId}_controls`, { config: { broadcast: { self: false, ack: false } } });
      controlChannelRef.current = controlChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_admin', payload: { candidate: event.candidate } });
      };

      sessionChannel.on('broadcast', { event: 'sdp_offer_staff' }, async (payload) => {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          const answer = await peer.createAnswer();
          if (answer.sdp) answer.sdp = answer.sdp.replace(/useinbandfec=1/g, 'useinbandfec=1;stereo=0;maxaveragebitrate=16000');
          await peer.setLocalDescription(answer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_answer_admin', payload: { sdp: answer } });
        } catch (rtcError) {}
      }).on('broadcast', { event: 'ice_candidate_staff' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
      }).on('broadcast', { event: 'staff_stopped_sharing' }, () => {
        terminateSession(); toast.error("Employee stopped sharing their screen.");
      }).on('broadcast', { event: 'chat_message' }, (payload) => {
        setChatMessages(prev => [...prev, { sender: payload.payload.sender || 'Staff', text: payload.payload.text, time: payload.payload.time, isSelf: false }]);
        setIsChatOpen(true);
      }).on('broadcast', { event: 'control_accepted' }, () => {
        setIsControlling(true); setSessionStatus('controlling'); toast.success("✅ Staff granted remote control access!");
      }).on('broadcast', { event: 'control_rejected' }, () => {
        toast.error("❌ Staff declined remote control.");
      }).on('broadcast', { event: 'clipboard_data' }, (payload) => {
        toast.dismiss('clipboard-toast'); 
        navigator.clipboard.writeText(payload.payload.text).then(() => {
          toast.success("Staff clipboard copied to your PC!", { icon: '📋' });
        }).catch(() => toast.error("Browser blocked clipboard write."));
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const pingChannel = supabase.channel(backgroundChannelId);
          pingChannel.subscribe(async (pingStatus) => {
            if (pingStatus === 'SUBSCRIBED') {
              await pingChannel.send({ type: 'broadcast', event: 'request_screen_share', payload: { adminName: 'IT Admin', adminCode: 'EMP-ADMIN', channelId: liveSessionId }});
              supabase.removeChannel(pingChannel);
            }
          });
        }
      });
    } catch (err) { setSessionStatus('idle'); }
  };

  const terminateSession = () => {
    if (dataChannelRef.current) { dataChannelRef.current.close(); dataChannelRef.current = null; } 
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (signalingChannelRef.current) { signalingChannelRef.current.send({ type: 'broadcast', event: 'terminate_session', payload: {} }); supabase.removeChannel(signalingChannelRef.current); signalingChannelRef.current = null; }
    if (controlChannelRef.current) { supabase.removeChannel(controlChannelRef.current); controlChannelRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    setSessionStatus('idle'); setIsControlling(false); setIsKeyboardEnabled(false); setIsChatOpen(false); setIsFullscreen(false);
  };

  const sendControlCommand = (command: any) => {
    if (!isControlling && command.type !== 'set_quality') return;
    
    try {
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        dataChannelRef.current.send(JSON.stringify(command));
        if (command.type === 'mousemove' || command.type === 'scroll') return;
      }
      if (!controlChannelRef.current) return;
      if (command.type === 'mousemove' || command.type === 'scroll') {
        const now = Date.now();
        if (now - lastBroadcastRef.current < 150) return; 
        lastBroadcastRef.current = now;
      }
      controlChannelRef.current.send({ type: 'broadcast', event: 'control_command', payload: command });
    } catch (err) {}
  };

  const cycleQuality = () => {
    let newQual: 'high' | 'med' | 'low' = 'high';
    let scale = 1; let fps = 30;
    
    if (videoQuality === 'high') { newQual = 'med'; scale = 1.5; fps = 24; }
    else if (videoQuality === 'med') { newQual = 'low'; scale = 2.0; fps = 15; }
    else { newQual = 'high'; scale = 1; fps = 30; }

    setVideoQuality(newQual);
    sendControlCommand({ type: 'set_quality', scale, fps });
    toast.success(`Network Quality Set: ${newQual.toUpperCase()} (Adjusting...)`);
  };

  const handleMouseEvent = (e: React.MouseEvent, type: string) => {
    if (type === 'mousemove') {
      if (isDraggingDock) { setDockPos({ x: e.clientX - dragStartDock.current.x, y: e.clientY - dragStartDock.current.y }); return; }
      if (isDraggingChat) { setChatPos({ x: e.clientX - dragStartChat.current.x, y: e.clientY - dragStartChat.current.y }); return; }
    }
    if (type === 'mouseup' || type === 'mouseleave') {
      if (isDraggingDock || isDraggingChat) { setIsDraggingDock(false); setIsDraggingChat(false); return; }
    }

    if (!isControlling) return;
    if (type !== 'scroll') e.preventDefault(); 

    if (type === 'mousemove') {
      const now = Date.now();
      if (now - lastMoveTimeRef.current < 30) return; 
      lastMoveTimeRef.current = now;
    }

    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const rect = video.getBoundingClientRect();
    const videoRatio = video.videoWidth / video.videoHeight;
    const viewRatio = rect.width / rect.height;

    let renderWidth = rect.width;
    let renderHeight = rect.height;
    let startX = 0; let startY = 0;

    if (viewRatio > videoRatio) {
      renderWidth = rect.height * videoRatio;
      startX = (rect.width - renderWidth) / 2;
    } else {
      renderHeight = rect.width / videoRatio;
      startY = (rect.height - renderHeight) / 2;
    }

    const clickX = e.clientX - rect.left - startX;
    const clickY = e.clientY - rect.top - startY;

    const xPercent = Math.max(0, Math.min(1, clickX / renderWidth));
    const yPercent = Math.max(0, Math.min(1, clickY / renderHeight));

    sendControlCommand({ type, xPercent, yPercent, button: e.button });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (isKeyboardEnabled && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { 
        e.preventDefault(); sendControlCommand({ type: 'keydown', key: e.key }); 
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
      if (isKeyboardEnabled && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { 
        e.preventDefault(); sendControlCommand({ type: 'keyup', key: e.key }); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [isKeyboardEnabled, isControlling]);

  const requestClipboardSync = () => {
    sendControlCommand({ type: 'sync_clipboard' });
    toast.loading("Requesting Staff Clipboard...", { id: 'clipboard-toast' });
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !signalingChannelRef.current) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'IT Admin', text: chatInput, time: timeString, isSelf: true }]);
    signalingChannelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: { sender: 'IT Admin', text: chatInput, time: timeString } });
    setChatInput('');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { viewportContainerRef.current?.requestFullscreen().catch(() => {}); } 
    else { document.exitFullscreen(); }
  };

  // 🎨 PURE MAC OS 2026 FROSTED GLASS THEME
  const theme = {
    bg: 'bg-transparent',
    glassCard: isDarkMode 
      ? 'bg-[#18181b]/40 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
      : 'bg-white/30 backdrop-blur-3xl border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.05)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
    glassItem: isDarkMode
      ? 'bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300'
      : 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-300',
    glassInner: isDarkMode
      ? 'bg-black/40 backdrop-blur-md border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
      : 'bg-white/50 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]',
    inputBg: isDarkMode 
      ? 'bg-black/50 border border-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20' 
      : 'bg-white/50 border border-white/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  return (
    <div className={`h-screen ${theme.bg} font-sans flex flex-col overflow-x-hidden relative transition-colors duration-1000`}>
      <Toaster position="top-right" />
      
      {/* 🌟 GLOBAL BACKGROUND ORBS */}
      <div className="fixed top-[-10%] left-[0%] w-[50vw] h-[50vh] bg-orange-500/20 dark:bg-orange-600/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-10%] right-[0%] w-[50vw] h-[50vh] bg-purple-600/20 dark:bg-purple-700/15 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      
      {/* 🌟 FULL WIDTH RESPONSIVE EXPANSION */}
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 mx-auto py-4 flex-1 flex flex-col min-h-0 gap-4 relative z-10">
        
        {/* HEADER */}
        <div className={`${theme.glassCard} p-4 sm:p-5 flex items-center justify-between shrink-0 rounded-4xl`}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className={`p-2.5 sm:p-3 ${theme.glassItem} rounded-2xl ${theme.textSub} transition-all cursor-pointer hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}>
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl ${theme.glassInner} text-orange-500 flex items-center justify-center`}><Monitor size={20} /></div>
              <div>
                <h1 className={`text-xl font-bold tracking-tight ${theme.textMain}`}>Virtual Support Commander</h1>
                <p className={`text-xs font-semibold ${theme.textSub}`}>Enterprise P2P Remote Diagnostics Protocol</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2.5 rounded-2xl ${theme.glassItem} ${theme.textMain} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500 transition-all shadow-sm cursor-pointer`}>{isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button>
          </div>
        </div>

        <div className="flex gap-5 flex-1 min-h-0 overflow-hidden">
          
          {/* SIDEBAR (STAFF LIST) */}
          {isSidebarOpen && (
            <div className={`w-80 ${theme.glassCard} flex flex-col shrink-0 overflow-hidden rounded-4xl`}>
              <div className={`p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'}`}>
                <div className={`relative w-full ${theme.inputBg} rounded-2xl`}>
                  <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                  <input type="text" placeholder="Search EMP ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-11 pr-4 py-3 bg-transparent ${theme.textMain} placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none text-xs font-semibold transition-all`} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {staffList.filter(s => s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.emp_code?.toLowerCase().includes(searchQuery.toLowerCase())).map((staff) => {
                  const isActive = activeSession?.id === staff.id;
                  return (
                    <button key={staff.id} onClick={() => { terminateSession(); setActiveSession(staff); }} className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between cursor-pointer ${isActive ? 'bg-orange-500/10 shadow-[0_4px_15px_rgba(249,115,22,0.2)] border border-orange-500' : `${theme.glassItem} hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] dark:hover:border-orange-500`}`}>
                      <div>
                        <p className={`font-bold text-sm ${isActive ? 'text-orange-600 dark:text-orange-400' : theme.textMain}`}>{staff.full_name}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-orange-600/80 dark:text-orange-400/80' : theme.textSub}`}>{staff.emp_code}</p>
                      </div>
                      <Monitor size={16} className={isActive ? 'text-orange-500' : theme.textSub} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAIN REMOTE AREA */}
          <div className={`flex-1 ${theme.glassCard} flex flex-col overflow-hidden relative rounded-4xl`}>
            {activeSession ? (
              <>
                <div className={`p-5 border-b ${isDarkMode ? 'border-white/10' : 'border-white/40'} flex justify-between items-center ${theme.glassInner}`}>
                  <div>
                    <h2 className={`text-lg font-bold ${theme.textMain}`}>{activeSession.full_name}</h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md inline-block mt-1">{sessionStatus}</span>
                  </div>
                  {sessionStatus === 'idle' ? (
                    <button onClick={requestLiveScreenShare} className="px-6 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(249,115,22,0.4)] transition-all flex items-center gap-2 cursor-pointer border border-orange-400"><Monitor size={16} /> Connect WebRTC</button>
                  ) : (
                    <button onClick={terminateSession} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(225,29,72,0.3)] transition-all flex items-center gap-2 cursor-pointer border border-rose-500"><Power size={16} /> Disconnect</button>
                  )}
                </div>

                <div 
                  ref={viewportContainerRef} 
                  className={`flex-1 ${isDarkMode ? 'bg-black/40' : 'bg-black/90'} relative flex items-center justify-center ${isControlling ? 'cursor-none select-none' : 'rounded-b-4xl overflow-hidden'}`}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  onMouseMove={(e) => handleMouseEvent(e, 'mousemove')}
                  onMouseDown={(e) => handleMouseEvent(e, 'mousedown')}
                  onMouseUp={(e) => handleMouseEvent(e, 'mouseup')}
                  onMouseLeave={(e) => handleMouseEvent(e, 'mouseleave')}
                  onWheel={(e) => { if(isControlling) { sendControlCommand({ type: 'scroll', deltaY: e.deltaY }); }}}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <video 
                    ref={videoRef} autoPlay playsInline muted={!isAudioEnabled} 
                    className={`max-w-full max-h-full object-contain pointer-events-auto select-none ${isControlling ? 'cursor-none' : 'cursor-default'} ${sessionStatus === 'connected' || sessionStatus === 'controlling' ? 'block' : 'hidden'}`} 
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  />
                  
                  {sessionStatus === 'requesting' && (
                    <div className="text-center text-white"><Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" /><p className="font-bold tracking-widest uppercase text-sm">Awaiting Staff Approval...</p></div>
                  )}

                  {(sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                    <div onMouseDown={(e) => e.stopPropagation()} style={{ transform: `translate(calc(-50% + ${dockPos.x}px), ${dockPos.y}px)` }} className={`absolute bottom-6 left-1/2 ${isDarkMode ? 'bg-black/60 border-white/20' : 'bg-white/60 border-white/80'} backdrop-blur-3xl border p-2.5 rounded-full flex gap-2 shadow-[0_16px_40px_rgba(0,0,0,0.3)] z-50 items-center transition-all cursor-default`}>
                      <div onMouseDown={(e) => { e.stopPropagation(); setIsDraggingDock(true); dragStartDock.current = { x: e.clientX - dockPos.x, y: e.clientY - dockPos.y }; }} className={`cursor-grab active:cursor-grabbing p-2 ${theme.textSub} hover:${theme.textMain} transition-colors ml-1`}><GripVertical size={18} /></div>
                      <div className={`w-px h-6 ${isDarkMode ? 'bg-white/20' : 'bg-slate-300'} mx-1`} />

                      {[
                        { icon: <Video size={20} strokeWidth={isControlling ? 2.5 : 2} />, active: isControlling, color: isDarkMode ? 'text-blue-400 hover:bg-blue-500/20' : 'text-blue-500 hover:bg-blue-100 hover:text-blue-700', activeClass: 'text-blue-700 bg-white border-[3px] border-blue-600 shadow-lg shadow-blue-600/30 scale-[1.15]', action: () => { if (isControlling) { setIsControlling(false); setSessionStatus('connected'); toast.success("Switched to View-Only mode."); } else { signalingChannelRef.current?.send({ type: 'broadcast', event: 'request_remote_control', payload: {} }); toast("Requesting control..."); setIsControlling(true); } }, tooltip: isControlling ? "Disable Control" : "Request Control" },
                        { icon: <Keyboard size={20} strokeWidth={isKeyboardEnabled ? 2.5 : 2} />, active: isKeyboardEnabled, color: isDarkMode ? 'text-purple-400 hover:bg-purple-500/20' : 'text-purple-500 hover:bg-purple-100 hover:text-purple-700', activeClass: 'text-purple-700 bg-white border-[3px] border-purple-600 shadow-lg shadow-purple-600/30 scale-[1.15]', action: () => { if(isControlling) { setIsKeyboardEnabled(!isKeyboardEnabled); toast.success(!isKeyboardEnabled ? "Keyboard Control Enabled ⌨️" : "Keyboard Control Disabled", { id: 'kb' }); } else toast.error("Request control first!"); }, tooltip: "Keyboard Input" },
                        { icon: <Wifi size={20} />, active: videoQuality !== 'high', color: isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700', activeClass: 'text-indigo-700 bg-white border-[3px] border-indigo-600 shadow-lg shadow-indigo-600/30 scale-[1.15]', action: cycleQuality, tooltip: `Network Quality: ${videoQuality.toUpperCase()}` },
                        { icon: <MessageSquare size={20} strokeWidth={isChatOpen ? 2.5 : 2} />, active: isChatOpen, color: isDarkMode ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700', activeClass: 'text-emerald-700 bg-white border-[3px] border-emerald-600 shadow-lg shadow-emerald-600/30 scale-[1.15]', action: () => setIsChatOpen(!isChatOpen), tooltip: "Live Chat" },
                        { icon: <Clipboard size={20} />, active: false, color: isDarkMode ? 'text-amber-400 hover:bg-amber-500/20' : 'text-amber-500 hover:bg-amber-100 hover:text-amber-700', action: requestClipboardSync, tooltip: "Sync Clipboard" },
                        { icon: <Volume2 size={20} strokeWidth={isAudioEnabled ? 2.5 : 2} />, active: isAudioEnabled, color: isDarkMode ? 'text-teal-400 hover:bg-teal-500/20' : 'text-teal-500 hover:bg-teal-100 hover:text-teal-700', activeClass: 'text-teal-700 bg-white border-[3px] border-teal-600 shadow-lg shadow-teal-600/30 scale-[1.15]', action: () => setIsAudioEnabled(!isAudioEnabled), tooltip: "Stream Audio" },
                        { icon: isFullscreen ? <Minimize size={20} strokeWidth={2.5}/> : <Maximize size={20} />, active: isFullscreen, color: isDarkMode ? 'text-zinc-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800', activeClass: 'text-slate-800 bg-white border-[3px] border-slate-700 shadow-lg shadow-slate-600/30 scale-[1.15]', action: toggleFullscreen, tooltip: "Fullscreen" },
                        { icon: <RefreshCw size={20} />, active: false, color: isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700', action: () => sendControlCommand({ type: 'refresh' }), tooltip: "Reload App" },
                        { icon: <Ban size={20} />, active: false, color: "text-rose-500 hover:text-white hover:bg-rose-500", action: terminateSession, tooltip: "Disconnect" }
                      ].map((btn, i) => (
                        <button key={i} onClick={btn.action} title={btn.tooltip} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${btn.active ? btn.activeClass : `border border-transparent ${btn.color}`}`}>{btn.icon}</button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-5 bg-black/5 dark:bg-white/5">
                <div className={`p-6 rounded-3xl ${theme.glassInner} shadow-sm border border-orange-500/20`}>
                  <Monitor size={56} className="text-orange-500 opacity-80" />
                </div>
                <p className={`font-black tracking-widest uppercase text-sm ${theme.textSub}`}>Select a user to begin remote session</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}