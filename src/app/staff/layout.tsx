'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, ClipboardCheck, 
  LogOut, Menu, X, Loader2, Ticket, PlusCircle, Bell, History, AlertTriangle,
  Monitor, ShieldAlert, Check, StopCircle, MessageSquare, Send, MousePointer2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
];

const getChannelTopic = (user: any) => {
  const code = (user?.emp_code || user?.emp_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = (user?.email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = (user?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `vsit_rtc_${code || email || id || 'default'}`;
};

const playAlertSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const playPromise = audio.play();
    if (playPromise !== undefined) playPromise.catch(() => {});
  } catch (e) {}
};

interface AlertRecord {
  id: string; title: string; message: string; time: string; read: boolean;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [alertHistory, setAlertHistory] = useState<AlertRecord[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);
  const [listenerKey, setListenerKey] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [incomingRequest, setIncomingRequest] = useState<any | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender: string, text: string, time: string, isSelf: boolean}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [adminPing, setAdminPing] = useState<{x: number, y: number, id: number} | null>(null);

  const [remoteControlRequest, setRemoteControlRequest] = useState(false);
  const [isControlGranted, setIsControlGranted] = useState(false);
  
  const isControlGrantedRef = useRef(false);
  useEffect(() => { isControlGrantedRef.current = isControlGranted; }, [isControlGranted]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const controlChannelRef = useRef<any>(null);

  const [staffProfile, setStaffProfile] = useState<any>({ id: '', name: 'Loading...', email: '...', initials: 'ST' });

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const verifyStaff = async () => {
      const sessionString = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionString) { window.location.href = '/'; return; }

      let activeUser: any = {};
      try { activeUser = JSON.parse(sessionString); } catch (e) { activeUser = { email: sessionString, name: sessionString.split('@')[0] }; }

      const profileName = activeUser.name || activeUser.full_name || 'Staff Member';
      setStaffProfile({
        id: activeUser.id || activeUser.email || String(Date.now()), 
        name: profileName,
        email: activeUser.email || 'staff@vsit.com',
        initials: profileName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'ST',
        emp_id: activeUser.emp_code || activeUser.emp_id || 'STAFF'
      });
      setIsCheckingAuth(false);
    };
    verifyStaff();
  }, [router]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, showChat]);

  useEffect(() => {
    if (!staffProfile.id) return;
    
    const presenceChannel = supabase.channel('vsit_online_presence', {
      config: { presence: { key: staffProfile.id || staffProfile.email } }
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: staffProfile.id,
          email: staffProfile.email,
          name: staffProfile.name,
          online_at: new Date().toISOString()
        });
      }
    });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [staffProfile]);

  const addSystemAlert = (title: string, message: string, playSound = true) => {
    if (playSound) playAlertSound();
    const id = String(Date.now() + Math.random());
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setToasts(prev => [...prev, { id, title, message }]);
    setAlertHistory(prev => [{ id, title, message, time, read: false }, ...prev].slice(0, 50));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 12000);
  };

  const dismissHistoryAlert = async (id: string) => {
    setAlertHistory(prev => prev.filter(a => a.id !== id));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      await supabase.from('notifications').delete().eq('id', id);
    } catch (e) {}
  };

  useEffect(() => {
    if (!staffProfile.id) return;
    const topic1 = `webrtc_signaling_${staffProfile.id}`;
    const topic2 = `webrtc_signaling_${staffProfile.emp_id}`;
    const topic3 = getChannelTopic(staffProfile);

    supabase.getChannels().forEach(ch => {
      if (ch.topic === topic1 || ch.topic === topic2 || ch.topic === topic3) supabase.removeChannel(ch);
    });

    const handlePing = (payload: any, channelUsed: string) => {
      setIncomingRequest((prev: any) => {
        if (!prev) addSystemAlert("⚠️ Remote Access Requested", "IT Admin requested live screen sharing! Please click Accept on your dashboard.");
        return { 
          adminName: payload.payload?.adminName || 'IT Administrator', 
          adminCode: payload.payload?.adminCode || 'EMP-ADMIN', 
          channelId: payload.payload?.channelId || channelUsed 
        };
      });
    };

    const ch1 = supabase.channel(topic1).on('broadcast', { event: 'request_screen_share' }, p => handlePing(p, topic1)).subscribe();
    const ch2 = supabase.channel(topic2).on('broadcast', { event: 'request_screen_share' }, p => handlePing(p, topic2)).subscribe();
    const ch3 = supabase.channel(topic3).on('broadcast', { event: 'request_screen_share' }, p => handlePing(p, topic3)).subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [staffProfile, listenerKey]);

  const executeAdminCommand = async (cmd: any) => {
    if (!isControlGrantedRef.current) return;

    if (cmd.type !== 'mousemove' && cmd.type !== 'scroll') {
      console.log("⚡ COMMAND RECEIVED FROM DB BRIDGE:", cmd.type);
    }

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        if (cmd.type === 'mousemove') {
          (window as any).electronAPI.sendMouseMove(cmd.xPercent, cmd.yPercent);
        }
        else if (cmd.type === 'mousedown') {
          (window as any).electronAPI.sendMouseMove(cmd.xPercent, cmd.yPercent);
          (window as any).electronAPI.sendMouseDown(cmd.button);
        }
        else if (cmd.type === 'mouseup') {
          (window as any).electronAPI.sendMouseMove(cmd.xPercent, cmd.yPercent);
          (window as any).electronAPI.sendMouseUp(cmd.button);
        }
        else if (cmd.type === 'keydown') (window as any).electronAPI.sendKeyDown(cmd.key);
        else if (cmd.type === 'keyup') (window as any).electronAPI.sendKeyUp(cmd.key);
        else if (cmd.type === 'scroll') (window as any).electronAPI.sendScroll(cmd.deltaY);
        else if (cmd.type === 'refresh') (window as any).electronAPI.sendSystemCommand('refresh_app');
        else if (cmd.type === 'sync_clipboard') {
          if ((window as any).electronAPI.readClipboard) {
            const text = await (window as any).electronAPI.readClipboard();
            if (channelRef.current) {
              channelRef.current.send({ type: 'broadcast', event: 'clipboard_data', payload: { text } });
            }
            addSystemAlert("📋 Clipboard Synced", "Clipboard securely synced to IT Admin.");
          }
        }
      } catch (e) {
        console.error("OS execution failed:", e);
      }
    }
  };

  const startScreenShare = async (manualChannelId?: string, alertIdToDismiss?: string) => {
    const targetChannelId = manualChannelId || incomingRequest?.channelId || getChannelTopic(staffProfile);
    setIsConnecting(true);
    if (alertIdToDismiss) dismissHistoryAlert(alertIdToDismiss);

    try {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }

      let stream: MediaStream | null = null;
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;

      if (electronAPI && electronAPI.getDesktopSourceId) {
        const sourceId = await electronAPI.getDesktopSourceId();
        if (!sourceId) throw new Error("Could not detect Windows monitor source ID.");
        stream = await (navigator.mediaDevices as any).getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }

      if (!stream) throw new Error("Failed to acquire video stream.");
      streamRef.current = stream;

      setIncomingRequest(null); setChatMessages([]);
      addSystemAlert("🚀 Stream Secured", "Establishing remote connection...", false);

      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          stopScreenSharing("Network connection failed.");
        }
      };

      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      supabase.getChannels().forEach(ch => { if (ch.topic === targetChannelId) supabase.removeChannel(ch); });
      const sessionChannel = supabase.channel(targetChannelId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

      const controlChannel = supabase.channel(`${targetChannelId}_controls`, { config: { broadcast: { ack: false } } });
      controlChannelRef.current = controlChannel;
      
      controlChannel.on('broadcast', { event: 'control_command' }, (payload) => {
        executeAdminCommand(payload.payload);
      }).subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log("🟢 STAFF DEDICATED CONTROL CHANNEL OPEN!");
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_staff', payload: { candidate: event.candidate } });
      };

      sessionChannel.on('broadcast', { event: 'sdp_answer_admin' }, async (payload) => {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          setIsConnecting(false); setIsStreaming(true);
          addSystemAlert("🟢 Connected", "Live WebRTC Screen Share Established!");
        } catch (e) {}
      }).on('broadcast', { event: 'ice_candidate_admin' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
      }).on('broadcast', { event: 'terminate_session' }, (payload) => {
        const reason = payload?.payload?.reason || "Session ended by remote user.";
        stopScreenSharing(reason);
      }).on('broadcast', { event: 'admin_stopped_sharing' }, (payload) => {
        stopScreenSharing(payload?.payload?.reason || "Admin stopped the session.");
      }).on('broadcast', { event: 'chat_message' }, (payload) => {
        setChatMessages(prev => [...prev, { sender: payload.payload.sender || 'Admin', text: payload.payload.text, time: payload.payload.time, isSelf: false }]);
        setShowChat(true);
        addSystemAlert("💬 New Message", `${payload.payload.sender || 'Admin'}: ${payload.payload.text}`);
      }).on('broadcast', { event: 'request_remote_control' }, () => {
        setRemoteControlRequest(true);
        addSystemAlert("⚠️ Control Request", "IT Admin is requesting to control your mouse and keyboard.");
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            await sessionChannel.send({ type: 'broadcast', event: 'sdp_offer_staff', payload: { sdp: offer } });
          } catch (e) {}
        }
      });

    } catch (err: any) {
      addSystemAlert("❌ Connection Failed", err.message || 'Permission denied');
      setIsConnecting(false); setIsStreaming(false); setIncomingRequest(null); setListenerKey(prev => prev + 1);
    }
  };

  const stopScreenSharing = (reason = "Screen sharing stopped.") => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'staff_stopped_sharing', payload: { reason } });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (controlChannelRef.current) {
      supabase.removeChannel(controlChannelRef.current);
      controlChannelRef.current = null;
    }
    setIsStreaming(false); setIsConnecting(false); setIncomingRequest(null); setShowChat(false);
    setIsControlGranted(false); setRemoteControlRequest(false);
    
    addSystemAlert("🛑 Session Disconnected", reason);
    setListenerKey(prev => prev + 1);
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !channelRef.current) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'Me', text: chatInput, time: timeString, isSelf: true }]);
    channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: { sender: staffProfile.name, text: chatInput, time: timeString } });
    setChatInput('');
  };

  const handleAcceptControl = () => {
    setIsControlGranted(true);
    setRemoteControlRequest(false);
    if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'control_accepted', payload: {} });
    addSystemAlert("✅ Control Granted", "Remote user now has full mouse and keyboard access.");
  };

  const handleDeclineControl = () => {
    setRemoteControlRequest(false);
    if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'control_rejected', payload: {} });
    addSystemAlert("❌ Control Declined", "You denied the remote control request.");
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.clear();
    window.location.href = '/';
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    glassPanel: isDarkMode 
      ? 'bg-zinc-900/30 backdrop-blur-3xl border border-white/10 shadow-2xl' 
      : 'bg-white/20 backdrop-blur-3xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)]',
    text: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    subText: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  if (isCheckingAuth) return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  const unreadCount = alertHistory.filter(a => !a.read).length;

  return (
    <div className={`min-h-screen ${theme.bg} flex font-sans relative overflow-hidden transition-colors duration-1000 z-0`}>
      
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="fixed bottom-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto ${theme.glassPanel} border-l-4 border-l-rose-500 rounded-3xl p-4 w-85 sm:w-100 flex gap-3 animate-in slide-in-from-right-8 fade-in duration-300`}>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20 text-rose-600">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 pr-2 min-w-0">
              <h4 className={`text-sm font-bold leading-tight truncate ${theme.text}`}>{toast.title}</h4>
              <p className={`text-xs font-medium mt-1 leading-relaxed wrap-break-word ${theme.subText}`}>{toast.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className={`transition-colors shrink-0 self-start p-1 rounded-xl bg-white/10 hover:bg-rose-500/10 ${isDarkMode ? 'text-zinc-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'}`}><X size={16} /></button>
          </div>
        ))}
      </div>

      {isStreaming && (
        <>
          {adminPing && (
            <div className="fixed z-99999 pointer-events-none flex items-center justify-center" style={{ left: `${adminPing.x}vw`, top: `${adminPing.y}vh`, transform: 'translate(-50%, -50%)' }}>
              <div className="absolute w-12 h-12 bg-rose-500/30 rounded-full animate-ping" />
              <div className="relative w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
            </div>
          )}
          
          <div className="fixed bottom-6 right-6 z-9999 flex flex-col items-end gap-3 pointer-events-none">
            
            {remoteControlRequest && (
              <div className={`${theme.glassPanel} p-5 rounded-3xl w-96 flex flex-col gap-4 animate-in slide-in-from-right-8 pointer-events-auto`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 shadow-sm flex items-center justify-center shrink-0 border border-purple-500/20">
                    <MousePointer2 size={20} className="animate-bounce" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-black leading-tight ${theme.text}`}>Remote Control Requested</h3>
                    <p className={`text-[11px] mt-1 font-medium leading-relaxed ${theme.subText}`}>IT Admin wants to temporarily control your mouse and keyboard.</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full mt-1">
                  <button onClick={handleDeclineControl} className={`flex-1 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${isDarkMode ? 'border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/50' : 'bg-white/30 border-white/40 text-slate-600 hover:bg-white/50'}`}>Deny</button>
                  <button onClick={handleAcceptControl} className="flex-1 py-2.5 bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer">
                    <Check size={14} /> Allow Access
                  </button>
                </div>
              </div>
            )}

            {showChat && (
              <div className={`w-80 ${theme.glassPanel} rounded-3xl flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 overflow-hidden border border-white/40`}>
                <div className={`p-4 border-b text-sm font-bold flex justify-between items-center ${isDarkMode ? 'border-white/10 text-white' : 'border-white/30 text-slate-900'}`}>
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14} className="text-orange-500" /> Live Support Chat</span>
                  <button onClick={() => setShowChat(false)} className={`p-1.5 rounded-xl transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-white/30 text-slate-500'}`}><X size={16}/></button>
                </div>
                <div className="h-56 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`max-w-[85%] text-[12px] font-medium p-3 shadow-sm ${msg.isSelf ? 'bg-purple-500/10 text-purple-800 border border-purple-500/20 dark:bg-purple-500/30 dark:text-purple-100 self-end rounded-2xl rounded-br-none' : 'bg-white/40 backdrop-blur-md text-slate-800 border border-white/50 dark:bg-white/10 dark:text-zinc-100 self-start rounded-2xl rounded-bl-none'}`}>
                      <div className={`font-bold text-[9px] mb-1 uppercase tracking-widest ${msg.isSelf ? 'text-purple-600 dark:text-purple-300' : 'text-orange-600 dark:text-orange-400'}`}>{msg.sender}</div>{msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendChatMessage} className={`p-3 border-t flex gap-2 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/30 bg-white/20'}`}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Type a reply..." className={`flex-1 text-xs font-semibold px-4 py-2.5 rounded-2xl outline-none transition-all shadow-inner border ${isDarkMode ? 'bg-black/50 text-white border-white/20 focus:border-orange-500' : 'bg-white/40 backdrop-blur-md text-slate-900 border-white/50 focus:bg-white/60 focus:ring-4 focus:ring-orange-500/10'}`} />
                  <button type="submit" disabled={!chatInput.trim()} className={`p-3 rounded-2xl disabled:opacity-50 cursor-pointer transition-all border shadow-sm ${isDarkMode ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-white/40 text-slate-800 border-white/50 hover:bg-white/60'}`}><Send size={14}/></button>
                </form>
              </div>
            )}

            <div className={`${theme.glassPanel} p-3 sm:p-4 rounded-3xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6 max-w-md w-full pointer-events-auto border-white/40`}>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                <div>
                  <p className="text-[11px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-2">
                    Screen Share Active <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-black">V3-TUNNEL</span>
                  </p>
                  <p className={`text-[10px] font-semibold ${theme.subText}`}>
                    {isControlGranted ? 'Admin controls your PC.' : 'IT Support is viewing your workspace.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowChat(!showChat)} className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${showChat ? 'bg-purple-500 text-white border-purple-600 shadow-md' : (isDarkMode ? 'bg-white/10 text-white border-white/20 hover:bg-white/20' : 'bg-white/30 text-slate-700 border-white/50 hover:bg-white/50')}`}>
                  <MessageSquare size={14} /> <span className="hidden sm:inline">Chat</span>
                </button>
                <button onClick={() => stopScreenSharing("Disconnected by user.")} className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20 cursor-pointer border border-rose-400"><StopCircle size={15} /> <span className="hidden sm:inline">Stop</span></button>
              </div>
            </div>
          </div>
        </>
      )}

      {incomingRequest && !isStreaming && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-99999 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${theme.glassPanel} rounded-4xl max-w-md w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.15)] space-y-6 animate-in zoom-in-95 border-2 ${isDarkMode ? 'border-orange-500/50' : 'border-white/50'}`}>
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 flex items-center justify-center mx-auto shadow-sm border border-orange-500/20 animate-bounce"><Monitor size={32} /></div>
            <div className="text-center space-y-1.5">
              <h3 className={`text-xl font-black ${theme.text}`}>Live Support Access Requested</h3>
              <p className={`text-xs sm:text-sm font-medium ${theme.subText}`}><strong className={`font-bold ${theme.text}`}>{incomingRequest.adminName}</strong> ({incomingRequest.adminCode}) is requesting permission to view your screen.</p>
            </div>
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-800'}`}>
              <ShieldAlert size={22} className="shrink-0 text-orange-500" />
              <span>By accepting, they will be able to view your desktop natively.</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIncomingRequest(null)} disabled={isConnecting} className={`flex-1 py-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10' : 'bg-white/30 backdrop-blur-md border-white/50 text-slate-600 hover:bg-white/50'}`}>Decline</button>
              <button onClick={() => startScreenShare(incomingRequest.channelId, incomingRequest.alertId)} disabled={isConnecting} className="flex-1 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 border border-orange-400 transition-all cursor-pointer active:scale-95">
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isConnecting ? 'Connecting...' : 'Accept & Share'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-56 z-50 flex flex-col transition-transform duration-300 ${theme.glassPanel} border-y-0 border-l-0 border-r ${isDarkMode ? 'border-r-white/10' : 'border-r-white/40'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className={`h-16 flex items-center px-5 border-b shrink-0 ${isDarkMode ? 'border-white/10' : 'border-white/30'}`}><img src="/logo.png" alt="Logo" className="h-7 w-auto drop-shadow-sm" /></div>
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {[
            { name: 'Dashboard', href: '/staff', icon: LayoutDashboard },
            { name: 'My Assets', href: '/staff/assets', icon: Laptop },
            { name: 'My Inspections', href: '/staff/inspections', icon: ClipboardCheck },
            { name: 'IT Tickets', href: '/staff/tickets', icon: Ticket },
            { name: 'Asset Requests', href: '/staff/requests', icon: PlusCircle },
            { name: 'Replacement Log', href: '/staff/replacements', icon: History }
          ].map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/staff' ? pathname === '/staff' : pathname.startsWith(link.href);
            return (
              <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] group border ${isActive ? (isDarkMode ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 font-bold shadow-sm' : 'bg-white/50 text-orange-600 border-white/60 shadow-sm font-bold backdrop-blur-md') : (isDarkMode ? 'text-zinc-400 border-transparent hover:bg-white/5 hover:text-zinc-200 font-semibold' : 'text-slate-600 border-transparent hover:bg-white/30 hover:text-slate-900 hover:border-white/40 font-semibold')}`}>
                <Icon size={18} className={`${isActive ? (isDarkMode ? 'text-orange-400' : 'text-orange-600') : 'text-current opacity-70 group-hover:opacity-100'} transition-colors`} /> {link.name}
              </Link>
            );
          })}
        </nav>
        <div className={`p-4 border-t shrink-0 ${isDarkMode ? 'border-white/10' : 'border-white/30'}`}>
          <button onClick={handleLogout} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-bold cursor-pointer border shadow-sm ${isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20' : 'bg-white/30 text-rose-600 border-white/50 hover:bg-white/50 hover:shadow-md'}`}><LogOut size={15}/> Logout</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        
        <header className={`h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 z-30 ${theme.glassPanel} border-x-0 border-t-0 border-b ${isDarkMode ? 'border-b-white/10' : 'border-b-white/40'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className={`p-2 -ml-2 lg:hidden rounded-xl transition-colors ${isDarkMode ? 'text-zinc-400 hover:bg-white/10' : 'text-slate-500 hover:bg-white/30'}`}><Menu size={20} /></button>
            <h2 className={`text-sm lg:text-[15px] font-extrabold tracking-tight hidden sm:block ${theme.text}`}>Virtual Staffing Solutions <span className="opacity-40 px-1">|</span> Staff Dashboard</h2>
          </div>

          <div className="relative">
            <button onClick={() => { setIsNotifOpen(!isNotifOpen); if (!isNotifOpen) setAlertHistory(prev => prev.map(a => ({ ...a, read: true }))); }} className={`relative p-2.5 rounded-xl border transition-all shadow-sm cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10' : 'bg-white/30 border-white/50 text-slate-600 hover:bg-white/50 backdrop-blur-md'}`} title="Session Alerts History">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-md border-2 border-white/50">{unreadCount}</span>}
            </button>

            {/* 🌟 FIX: SOLID FROSTED GLASS BACKGROUND APPLIED HERE */}
            {isNotifOpen && (
              <div className={`absolute top-full right-0 mt-3 w-80 sm:w-96 rounded-4xl overflow-hidden z-9999 animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xl border backdrop-blur-3xl ${isDarkMode ? 'bg-zinc-900/95 border-zinc-700/50' : 'bg-white/95 border-white/80'}`}>
                <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50/80 border-slate-200 backdrop-blur-md'}`}>
                  <h3 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${theme.text}`}><History size={14} className="text-purple-600"/> Session Alerts</h3>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {alertHistory.length === 0 ? (
                    <div className={`px-4 py-10 text-center flex flex-col items-center gap-2 ${theme.subText}`}><Bell size={28} className="opacity-20" /><span className="text-[11px] font-bold uppercase tracking-widest">No alerts recorded yet.</span></div>
                  ) : (
                    <div className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                      {alertHistory.map((notif) => {
                        const isError = (notif.title || '').toLowerCase().includes('error') || (notif.title || '').toLowerCase().includes('cancel') || (notif.title || '').toLowerCase().includes('fail');
                        return (
                          <div key={notif.id} className={`p-5 transition-colors group relative flex gap-3 ${isError ? (isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50') : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')}`}>
                            <div className={`mt-0.5 shrink-0 ${isError ? 'text-rose-500' : 'text-orange-500'}`}><AlertTriangle size={16} /></div>
                            <div className="flex-1 pr-6 min-w-0">
                              <div className="flex justify-between items-start mb-0.5"><p className={`text-xs font-bold truncate ${isError ? (isDarkMode ? 'text-rose-400' : 'text-rose-700') : theme.text}`}>{notif.title}</p><span className={`text-[9px] font-bold uppercase tracking-wider ${theme.subText}`}>{notif.time}</span></div>
                              <p className={`text-[11px] mt-1.5 leading-relaxed wrap-break-word ${isError ? (isDarkMode ? 'text-rose-300 font-medium' : 'text-rose-600 font-medium') : theme.subText}`}>{notif.message}</p>
                            </div>
                            <button onClick={() => dismissHistoryAlert(notif.id)} className={`absolute top-5 right-4 p-1.5 rounded-xl shadow-sm transition-colors border ${isDarkMode ? 'bg-white/5 border-white/10 text-zinc-500 hover:text-rose-400 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-slate-100'}`} title="Delete from History"><X size={12} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 relative z-10 w-full h-full overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}