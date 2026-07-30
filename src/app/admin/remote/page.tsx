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

interface StaffMember {
  id: string; name?: string; full_name?: string; email: string; emp_code?: string; department?: string; is_online?: boolean; assigned_asset_name?: string;
}

interface ChatMessage {
  sender: string; text: string; time: string; isSelf: boolean;
}

const getChannelTopic = (staff: any) => `vsit_rtc_${(staff?.emp_code || staff?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }, 
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun.services.mozilla.com' }
];

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

  useEffect(() => { loadStaffAndAdminData(); return () => terminateSession(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
        if (peer.connectionState === 'failed') {
          terminateSession();
          toast.error("Network connection failed.");
        }
      };

      const dataChannel = peer.createDataChannel('enterprise_channel', { ordered: true });
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
          toast.success("🟢 Live Video Stream Established!");
        }
      };

      const sessionChannel = supabase.channel(liveSessionId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_admin', payload: { candidate: event.candidate } });
        }
      };

      sessionChannel.on('broadcast', { event: 'sdp_offer_staff' }, async (payload) => {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          const answer = await peer.createAnswer();
          
          // 🌟 LOW BANDWIDTH AUDIO OPTIMIZER (TypeScript Fix)
          if (answer.sdp) {
            answer.sdp = answer.sdp.replace(/useinbandfec=1/g, 'useinbandfec=1;stereo=0;maxaveragebitrate=16000');
          }
          
          await peer.setLocalDescription(answer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_answer_admin', payload: { sdp: answer } });
        } catch (rtcError) { console.error("SDP offer error:", rtcError); }
      }).on('broadcast', { event: 'ice_candidate_staff' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
        }
      }).on('broadcast', { event: 'staff_stopped_sharing' }, () => {
        terminateSession();
        toast.error("Employee stopped sharing their screen.");
      }).on('broadcast', { event: 'chat_message' }, (payload) => {
        setChatMessages(prev => [...prev, { sender: payload.payload.sender || 'Staff', text: payload.payload.text, time: payload.payload.time, isSelf: false }]);
        setIsChatOpen(true);
      }).on('broadcast', { event: 'control_accepted' }, () => {
        setIsControlling(true);
        setSessionStatus('controlling');
        toast.success("✅ Staff granted remote control access!");
      }).on('broadcast', { event: 'control_rejected' }, () => {
        toast.error("❌ Staff declined remote control.");
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
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (channelRef.current) { channelRef.current.send({ type: 'broadcast', event: 'terminate_session', payload: {} }); supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    setSessionStatus('idle'); setIsControlling(false); setIsKeyboardEnabled(false); setIsChatOpen(false); setIsFullscreen(false);
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
    
    setChatMessages(prev => [...prev, { sender: 'Me', text: chatInput, time: timeString, isSelf: true }]);
    channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: { sender: 'IT Admin', text: chatInput, time: timeString } });
    setChatInput('');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewportContainerRef.current?.requestFullscreen().catch(err => { toast.error(`Fullscreen error: ${err.message}`); });
    } else { document.exitFullscreen(); }
  };

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <Toaster position="top-right" />
      <input type="file" ref={fileInputRef} onChange={(e) => { if(e.target.files?.[0]) sendFileP2P(e.target.files[0]) }} className="hidden" />

      <div className="w-full max-w-[1600px] px-4 mx-auto py-4 flex-1 flex flex-col min-h-0 gap-4">
        
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20"><Monitor size={20} /></div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Virtual Support Commander</h1>
              <p className="text-xs font-semibold text-slate-500">Enterprise P2P Remote Diagnostics Protocol</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:border-purple-500 transition-all bg-slate-50 shadow-sm">
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          
          {isSidebarOpen && (
            <div className="w-80 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col shrink-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search EMP ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-orange-500 transition-all" />
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

          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
            {activeSession ? (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{activeSession.full_name}</h2>
                    <p className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md inline-block mt-1">{sessionStatus.toUpperCase()}</p>
                  </div>
                  {sessionStatus === 'idle' ? (
                    <button onClick={requestLiveScreenShare} className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer">
                      <Monitor size={16} /> Connect WebRTC
                    </button>
                  ) : (
                    <button onClick={terminateSession} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer">
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
                  onMouseLeave={(e) => handleMouseEvent(e, 'mouseleave')}
                  onWheel={(e) => { if(isControlling) { e.preventDefault(); sendControlCommand({ type: 'scroll', deltaY: e.deltaY }); }}}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <video ref={videoRef} autoPlay playsInline muted={!isAudioEnabled} className={`max-w-full max-h-full object-contain ${sessionStatus === 'connected' || sessionStatus === 'controlling' ? 'block' : 'hidden'}`} />
                  
                  {sessionStatus === 'requesting' && (
                    <div className="text-center text-white">
                      <Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
                      <p className="font-bold">Awaiting Staff Approval...</p>
                    </div>
                  )}
                  
                  {/* 🌟 FULL TRANSPARENT GLASS CHAT BOX */}
                  {isChatOpen && (sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                    <div 
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ transform: `translate(${chatPos.x}px, ${chatPos.y}px)` }}
                      className="absolute bottom-24 right-6 w-80 bg-white/5 backdrop-blur-3xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-3xl flex flex-col z-50 overflow-hidden"
                    >
                      <div 
                        onMouseDown={(e) => { e.stopPropagation(); setIsDraggingChat(true); dragStartChat.current = { x: e.clientX - chatPos.x, y: e.clientY - chatPos.y }; }}
                        className="p-3 bg-white/5 border-b border-white/10 text-white flex justify-between items-center cursor-grab active:cursor-grabbing"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14} className="text-white/80" /> Live Chat</span>
                        <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded-md text-white/70 hover:text-white transition-colors"><X size={16}/></button>
                      </div>
                      
                      <div className="h-60 p-3 overflow-y-auto flex flex-col gap-2.5 custom-scrollbar">
                        {chatMessages.length === 0 ? (
                          <div className="m-auto text-center text-xs font-medium text-white/50">Send a message to start communicating.</div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={i} className={`max-w-[85%] text-[12px] font-medium p-2.5 shadow-sm backdrop-blur-md ${msg.isSelf ? 'bg-white/20 text-white self-end rounded-2xl rounded-br-none border border-white/30' : 'bg-white/5 text-white self-start rounded-2xl rounded-bl-none border border-white/10'}`}>
                              <div className={`font-bold text-[9px] mb-1 ${msg.isSelf ? 'text-white/90' : 'text-white/60'}`}>{msg.sender}</div>{msg.text}
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      
                      <form onSubmit={sendChatMessage} className="p-2 bg-white/5 border-t border-white/10 flex gap-2 backdrop-blur-md">
                        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Type a reply..." className="flex-1 text-xs font-semibold px-3 py-2 bg-black/20 text-white border border-white/10 rounded-xl outline-none focus:border-white/30 transition-all placeholder-white/40 shadow-inner" />
                        <button type="submit" disabled={!chatInput.trim()} className="p-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-50 transition-all border border-white/10 shadow-sm"><Send size={14}/></button>
                      </form>
                    </div>
                  )}

                  {/* 🌟 PURE GLASS TRANSPARENT MAC-OS DOCK */}
                  {(sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                    <div 
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ transform: `translate(calc(-50% + ${dockPos.x}px), ${dockPos.y}px)` }}
                      className="absolute bottom-6 left-1/2 bg-white/5 backdrop-blur-3xl border border-white/15 p-1.5 rounded-full flex gap-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] z-50 items-center transition-all"
                    >
                      <div 
                        onMouseDown={(e) => { e.stopPropagation(); setIsDraggingDock(true); dragStartDock.current = { x: e.clientX - dockPos.x, y: e.clientY - dockPos.y }; }}
                        className="cursor-grab active:cursor-grabbing p-2 text-white/40 hover:text-white transition-colors ml-1"
                      >
                        <GripVertical size={16} />
                      </div>
                      
                      <div className="w-px h-5 bg-white/15 mx-1" />

                      {[
                        { 
                          icon: <Video size={18} />, active: isControlling, 
                          action: () => { 
                            if (isControlling) { setIsControlling(false); setSessionStatus('connected'); toast.success("Switched to View-Only mode."); } 
                            else { channelRef.current?.send({ type: 'broadcast', event: 'request_remote_control', payload: {} }); toast("Requesting control..."); }
                          }, 
                          tooltip: isControlling ? "Disable Control" : "Request Control" 
                        },
                        { icon: <Keyboard size={18} />, active: isKeyboardEnabled, action: () => { if(isControlling) setIsKeyboardEnabled(!isKeyboardEnabled); else toast.error("Request control first!"); }, tooltip: "Keyboard Input" },
                        { icon: <MessageSquare size={18} />, active: isChatOpen, action: () => setIsChatOpen(!isChatOpen), tooltip: "Live Chat" },
                        { icon: <Clipboard size={18} />, active: false, action: requestClipboardSync, tooltip: "Sync Clipboard" },
                        { icon: <Volume2 size={18} />, active: isAudioEnabled, action: () => setIsAudioEnabled(!isAudioEnabled), tooltip: "Stream Audio" },
                        { icon: isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />, active: isFullscreen, action: toggleFullscreen, tooltip: "Fullscreen" },
                        { icon: <FileUp size={18} />, active: false, action: () => fileInputRef.current?.click(), tooltip: "Share Document" },
                        { icon: <RefreshCw size={18} />, active: false, action: () => sendControlCommand({ type: 'refresh' }), tooltip: "Reload App" },
                        { icon: <Ban size={18} />, active: false, action: terminateSession, tooltip: "Disconnect", color: "text-rose-400 hover:text-rose-300 hover:bg-rose-500/20" }
                      ].map((btn, i) => (
                        <button 
                          key={i} 
                          onClick={btn.action} 
                          title={btn.tooltip} 
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${btn.color || 'text-white/80 hover:text-white'} ${btn.active ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.25)] border border-white/30 backdrop-blur-md' : 'bg-transparent hover:bg-white/10 border border-transparent'}`}
                        >
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