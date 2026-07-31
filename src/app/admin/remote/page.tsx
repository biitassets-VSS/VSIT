'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Monitor, ArrowLeft, Loader2, Search, PanelLeftClose, PanelLeftOpen, 
  RefreshCw, Power, Keyboard, Video, Clipboard, FileUp, Volume2, 
  Ban, MessageSquare, Send, X, Maximize, Minimize, GripVertical
} from 'lucide-react';

interface StaffMember { id: string; name?: string; full_name?: string; email: string; emp_code?: string; department?: string; is_online?: boolean; assigned_asset_name?: string; }
interface ChatMessage { sender: string; text: string; time: string; isSelf: boolean; }
const getChannelTopic = (staff: any) => `vsit_rtc_${(staff?.emp_code || staff?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

const iceServers = [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' } ];

export default function AdminRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeSession, setActiveSession] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'requesting' | 'connected' | 'controlling'>('idle');
  
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
  
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMoveTimeRef = useRef<number>(0);

  useEffect(() => { 
    document.documentElement.classList.remove('dark'); 
    loadStaffAndAdminData(); 
    return () => terminateSession(); 
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
      if (profiles) setStaffList(profiles.map((p: any) => ({ ...p, assigned_asset_name: (assets || []).find(a => a.assigned_to === p.id)?.name || 'Unassigned PC' })));
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

      // 🌟 THE FIX: DO NOT TERMINATE SESSION ON WEBRTC FAILURE. Let Supabase Fallback take over!
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed') {
          toast.error("WebRTC dropped. Falling back to secure database routing...", { duration: 4000 });
        }
      };

      const dataChannel = peer.createDataChannel('enterprise_channel', { ordered: true });
      dataChannelRef.current = dataChannel;
      
      dataChannel.onopen = () => {
        keepAliveIntervalRef.current = setInterval(() => {
          if (dataChannel.readyState === 'open') dataChannel.send(JSON.stringify({ type: 'ping' }));
        }, 3000); 
      };

      dataChannel.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'file_meta') toast(`Receiving file: ${msg.name}...`);
            if (msg.type === 'clipboard_data') {
               navigator.clipboard.writeText(msg.text).then(() => {
                 toast.success("Staff clipboard copied to your PC!", { icon: '📋' });
               });
            }
          } catch(e) {}
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

      const sessionChannel = supabase.channel(liveSessionId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

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
        navigator.clipboard.writeText(payload.payload.text).then(() => {
          toast.success("Staff clipboard copied to your PC!", { icon: '📋' });
        });
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
    if (keepAliveIntervalRef.current) { clearInterval(keepAliveIntervalRef.current); keepAliveIntervalRef.current = null; }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (channelRef.current) { channelRef.current.send({ type: 'broadcast', event: 'terminate_session', payload: {} }); supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    setSessionStatus('idle'); setIsControlling(false); setIsKeyboardEnabled(false); setIsChatOpen(false); setIsFullscreen(false);
  };

  const sendControlCommand = (command: any) => {
    if (isControlling) {
      if (dataChannelRef.current?.readyState === 'open') dataChannelRef.current.send(JSON.stringify(command));
      else if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'control_command', payload: command });
    }
  };

  const sendFileP2P = (file: File) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return toast.error("P2P Data Tunnel not open.");
    toast.loading(`Uploading ${file.name}...`);
    dataChannelRef.current.send(JSON.stringify({ type: 'file_meta', name: file.name, size: file.size, fileType: file.type }));
    const CHUNK_SIZE = 16384; 
    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
      if (e.target?.result && dataChannelRef.current) {
        dataChannelRef.current.send(e.target.result as ArrayBuffer);
        offset += (e.target.result as ArrayBuffer).byteLength;
        if (offset < file.size) readSlice(offset);
        else toast.success("Document Sent Successfully!");
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
      if (isDraggingDock) { setDockPos({ x: e.clientX - dragStartDock.current.x, y: e.clientY - dragStartDock.current.y }); return; }
      if (isDraggingChat) { setChatPos({ x: e.clientX - dragStartChat.current.x, y: e.clientY - dragStartChat.current.y }); return; }
    }
    if (type === 'mouseup' || type === 'mouseleave') {
      if (isDraggingDock || isDraggingChat) { setIsDraggingDock(false); setIsDraggingChat(false); return; }
    }

    if (!isControlling) return;
    e.preventDefault();

    if (type === 'mousemove') {
      const now = Date.now();
      if (now - lastMoveTimeRef.current < 35) return; 
      lastMoveTimeRef.current = now;
    }

    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const rect = video.getBoundingClientRect();
    const videoRatio = video.videoWidth / video.videoHeight;
    const viewRatio = rect.width / rect.height;

    let actualWidth = rect.width;
    let actualHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (viewRatio > videoRatio) {
      actualWidth = rect.height * videoRatio;
      offsetX = (rect.width - actualWidth) / 2;
    } else {
      actualHeight = rect.width / videoRatio;
      offsetY = (rect.height - actualHeight) / 2;
    }

    const clickX = e.clientX - rect.left - offsetX;
    const clickY = e.clientY - rect.top - offsetY;

    if (clickX < 0 || clickX > actualWidth || clickY < 0 || clickY > actualHeight) return;

    const xPercent = (clickX / actualWidth) * 100;
    const yPercent = (clickY / actualHeight) * 100;

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
    toast.loading("Requesting Staff Clipboard...");
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !channelRef.current) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages(prev => [...prev, { sender: 'IT Admin', text: chatInput, time: timeString, isSelf: true }]);
    channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: { sender: 'IT Admin', text: chatInput, time: timeString } });
    setChatInput('');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { viewportContainerRef.current?.requestFullscreen().catch(() => {}); } 
    else { document.exitFullscreen(); }
  };

  const theme = {
    bg: 'bg-[#F1F5F9]',
    card: 'bg-white/60 backdrop-blur-xl rounded-3xl border border-white/80 shadow-sm', 
    textMain: 'text-slate-900',
    textSub: 'text-slate-600',
  };

  return (
    <div className={`h-screen ${theme.bg} font-sans flex flex-col overflow-hidden relative`}>
      <Toaster position="top-right" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-225 h-125 pointer-events-none z-0 flex justify-between items-center opacity-30">
        <div className="w-112.5 h-112.5 bg-[#FFD1B3] rounded-full blur-[120px]"></div>
        <div className="w-112.5 h-112.5 bg-[#D8B4FE] rounded-full blur-[120px]"></div>
      </div>
      <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files?.[0]) sendFileP2P(e.target.files[0]) }} className="hidden" />

      <div className="w-full max-w-[100rem] px-4 mx-auto py-4 flex-1 flex flex-col min-h-0 gap-4 relative z-10">
        <div className={`${theme.card} p-4 sm:p-5 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-white/80 text-orange-600 flex items-center justify-center shadow-sm"><Monitor size={20} /></div>
            <div>
              <h1 className={`text-xl font-bold tracking-tight ${theme.textMain}`}>Virtual Support Commander</h1>
              <p className={`text-xs font-semibold ${theme.textSub}`}>Enterprise P2P Remote Diagnostics Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className={`flex items-center gap-1.5 px-4 py-2.5 bg-white/60 border border-white/80 hover:bg-white/90 shadow-sm rounded-xl text-xs font-bold uppercase tracking-wider text-slate-800 transition-colors cursor-pointer`}>
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl border border-white/80 text-slate-700 bg-white/60 hover:bg-white/90 transition-all shadow-sm cursor-pointer">
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {isSidebarOpen && (
            <div className={`w-80 ${theme.card} flex flex-col shrink-0 overflow-hidden border border-white/80 shadow-sm`}>
              <div className="p-4 border-b border-white/60">
                <div className="relative w-full">
                  <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                  <input type="text" placeholder="Search EMP ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 bg-white/80 border border-white/80 text-slate-900 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 rounded-xl text-sm font-semibold outline-none transition-all shadow-sm placeholder:text-slate-400`} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {staffList.filter(s => s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.emp_code?.toLowerCase().includes(searchQuery.toLowerCase())).map((staff) => {
                  const isActive = activeSession?.id === staff.id;
                  return (
                    <button key={staff.id} onClick={() => { terminateSession(); setActiveSession(staff); }} className={`w-full text-left p-3 rounded-2xl transition-all border flex items-center justify-between cursor-pointer ${isActive ? 'bg-white shadow-[0_4px_15px_rgba(249,115,22,0.1)] border-orange-300' : 'bg-white/40 border-transparent hover:bg-white/80 hover:shadow-sm'}`}>
                      <div>
                        <p className={`font-bold text-sm ${isActive ? 'text-orange-600' : theme.textMain}`}>{staff.full_name}</p>
                        <p className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-orange-700/80' : theme.textSub}`}>{staff.emp_code}</p>
                      </div>
                      <Monitor size={16} className={isActive ? 'text-orange-500' : 'text-slate-400'} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`flex-1 ${theme.card} flex flex-col overflow-hidden relative shadow-sm`}>
            {activeSession ? (
              <>
                <div className="p-4 border-b border-white/60 flex justify-between items-center bg-white/40">
                  <div>
                    <h2 className={`text-lg font-bold ${theme.textMain}`}>{activeSession.full_name}</h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 bg-purple-100/80 border border-purple-200 px-2 py-0.5 rounded-md inline-block mt-1">{sessionStatus}</span>
                  </div>
                  {sessionStatus === 'idle' ? (
                    <button onClick={requestLiveScreenShare} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(249,115,22,0.3)] transition-all flex items-center gap-2 cursor-pointer"><Monitor size={16} /> Connect WebRTC</button>
                  ) : (
                    <button onClick={terminateSession} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_15px_rgba(225,29,72,0.3)] transition-all flex items-center gap-2 cursor-pointer"><Power size={16} /> Disconnect</button>
                  )}
                </div>

                <div 
                  ref={viewportContainerRef} 
                  className={`flex-1 bg-slate-900 relative overflow-hidden flex items-center justify-center rounded-b-3xl ${isControlling ? 'cursor-crosshair' : ''}`}
                  onMouseMove={(e) => handleMouseEvent(e, 'mousemove')}
                  onMouseDown={(e) => handleMouseEvent(e, 'mousedown')}
                  onMouseUp={(e) => handleMouseEvent(e, 'mouseup')}
                  onMouseLeave={(e) => handleMouseEvent(e, 'mouseleave')}
                  onWheel={(e) => { if(isControlling) { e.preventDefault(); sendControlCommand({ type: 'scroll', deltaY: e.deltaY }); }}}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <video ref={videoRef} autoPlay playsInline muted={!isAudioEnabled} className={`max-w-full max-h-full object-contain ${sessionStatus === 'connected' || sessionStatus === 'controlling' ? 'block' : 'hidden'}`} />
                  
                  {sessionStatus === 'requesting' && (
                    <div className="text-center text-white">
                      <Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
                      <p className="font-bold tracking-widest uppercase text-sm">Awaiting Staff Approval...</p>
                    </div>
                  )}
                  
                  {isChatOpen && (sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                    <div onMouseDown={(e) => e.stopPropagation()} style={{ transform: `translate(${chatPos.x}px, ${chatPos.y}px)` }} className="absolute bottom-24 right-6 w-80 bg-white/95 backdrop-blur-3xl border border-white shadow-2xl rounded-3xl flex flex-col z-50 overflow-hidden">
                      <div onMouseDown={(e) => { e.stopPropagation(); setIsDraggingChat(true); dragStartChat.current = { x: e.clientX - chatPos.x, y: e.clientY - chatPos.y }; }} className="p-4 border-b border-slate-100 text-slate-800 flex justify-between items-center cursor-grab active:cursor-grabbing bg-slate-50/50">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14} className="text-purple-600" /> Live Chat</span>
                        <button onClick={() => setIsChatOpen(false)} className="hover:bg-slate-200 p-1.5 rounded-md text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"><X size={16}/></button>
                      </div>
                      <div className="h-60 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                        {chatMessages.length === 0 ? <div className="m-auto text-center text-xs font-medium text-slate-400">Send a message to start communicating.</div> : chatMessages.map((msg, i) => (
                          <div key={i} className={`max-w-[85%] text-[12px] font-medium p-3 shadow-sm ${msg.isSelf ? 'bg-purple-600 text-white self-end rounded-2xl rounded-br-none border border-purple-500' : 'bg-slate-100 text-slate-800 self-start rounded-2xl rounded-bl-none border border-slate-200'}`}>
                            <div className={`font-bold text-[9px] mb-1 uppercase tracking-wider ${msg.isSelf ? 'text-purple-200' : 'text-slate-500'}`}>{msg.sender}</div>{msg.text}
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <form onSubmit={sendChatMessage} className="p-3 bg-slate-50/80 border-t border-slate-100 flex gap-2">
                        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Type a reply..." className="flex-1 text-xs font-semibold px-4 py-2.5 bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:border-purple-400 transition-all placeholder-slate-400 shadow-sm" />
                        <button type="submit" disabled={!chatInput.trim()} className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all border border-purple-500 shadow-sm cursor-pointer"><Send size={14}/></button>
                      </form>
                    </div>
                  )}

                  {(sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                    <div onMouseDown={(e) => e.stopPropagation()} style={{ transform: `translate(calc(-50% + ${dockPos.x}px), ${dockPos.y}px)` }} className="absolute bottom-6 left-1/2 bg-white/80 backdrop-blur-2xl border border-white p-2 rounded-full flex gap-2 shadow-2xl z-50 items-center transition-all">
                      <div onMouseDown={(e) => { e.stopPropagation(); setIsDraggingDock(true); dragStartDock.current = { x: e.clientX - dockPos.x, y: e.clientY - dockPos.y }; }} className="cursor-grab active:cursor-grabbing p-2 text-slate-400 hover:text-slate-800 transition-colors ml-1">
                        <GripVertical size={18} />
                      </div>
                      <div className="w-px h-6 bg-slate-200 mx-0.5" />

                      {[
                        { 
                          icon: <Video size={20} strokeWidth={isControlling ? 2.5 : 2} />, active: isControlling, 
                          color: 'text-blue-500 hover:bg-blue-100 hover:text-blue-700', activeClass: 'text-blue-700 bg-white border-[3px] border-blue-600 shadow-lg shadow-blue-600/30 scale-[1.15]',
                          action: () => { 
                            if (isControlling) { setIsControlling(false); setSessionStatus('connected'); toast.success("Switched to View-Only mode."); } 
                            else { channelRef.current?.send({ type: 'broadcast', event: 'request_remote_control', payload: {} }); toast("Requesting control..."); }
                          }, tooltip: isControlling ? "Disable Control" : "Request Control" 
                        },
                        { 
                          icon: <Keyboard size={20} strokeWidth={isKeyboardEnabled ? 2.5 : 2} />, active: isKeyboardEnabled, 
                          color: 'text-purple-500 hover:bg-purple-100 hover:text-purple-700', activeClass: 'text-purple-700 bg-white border-[3px] border-purple-600 shadow-lg shadow-purple-600/30 scale-[1.15]', 
                          action: () => { 
                            if(isControlling) { 
                              setIsKeyboardEnabled(!isKeyboardEnabled); 
                              toast.success(!isKeyboardEnabled ? "Keyboard Control Enabled ⌨️" : "Keyboard Control Disabled", { id: 'kb' });
                            } else toast.error("Request control first!"); 
                          }, tooltip: "Keyboard Input" 
                        },
                        { icon: <MessageSquare size={20} strokeWidth={isChatOpen ? 2.5 : 2} />, active: isChatOpen, color: 'text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700', activeClass: 'text-emerald-700 bg-white border-[3px] border-emerald-600 shadow-lg shadow-emerald-600/30 scale-[1.15]', action: () => setIsChatOpen(!isChatOpen), tooltip: "Live Chat" },
                        { icon: <Clipboard size={20} />, active: false, color: 'text-amber-500 hover:bg-amber-100 hover:text-amber-700', action: requestClipboardSync, tooltip: "Sync Clipboard" },
                        { icon: <Volume2 size={20} strokeWidth={isAudioEnabled ? 2.5 : 2} />, active: isAudioEnabled, color: 'text-teal-500 hover:bg-teal-100 hover:text-teal-700', activeClass: 'text-teal-700 bg-white border-[3px] border-teal-600 shadow-lg shadow-teal-600/30 scale-[1.15]', action: () => setIsAudioEnabled(!isAudioEnabled), tooltip: "Stream Audio" },
                        { icon: isFullscreen ? <Minimize size={20} strokeWidth={2.5}/> : <Maximize size={20} />, active: isFullscreen, color: 'text-slate-500 hover:bg-slate-200 hover:text-slate-800', activeClass: 'text-slate-800 bg-white border-[3px] border-slate-700 shadow-lg shadow-slate-600/30 scale-[1.15]', action: toggleFullscreen, tooltip: "Fullscreen" },
                        { icon: <FileUp size={20} />, active: false, color: 'text-orange-500 hover:bg-orange-100 hover:text-orange-700', action: () => fileInputRef.current?.click(), tooltip: "Share Document" },
                        { icon: <RefreshCw size={20} />, active: false, color: 'text-indigo-500 hover:bg-indigo-100 hover:text-indigo-700', action: () => sendControlCommand({ type: 'refresh' }), tooltip: "Reload App" },
                        { icon: <Ban size={20} />, active: false, color: "text-rose-500 hover:text-white hover:bg-rose-500", action: terminateSession, tooltip: "Disconnect" }
                      ].map((btn, i) => (
                        <button key={i} onClick={btn.action} title={btn.tooltip} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${btn.active ? btn.activeClass : `border border-transparent ${btn.color}`}`}>{btn.icon}</button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
                <Monitor size={64} className="opacity-20 text-orange-600" />
                <p className="font-bold tracking-widest uppercase text-sm text-slate-500">Select a user to begin remote session</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}