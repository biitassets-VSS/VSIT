'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Laptop, ClipboardCheck, 
  LogOut, Menu, X, Loader2, ChevronDown, Ticket, PlusCircle, Bell, History, AlertTriangle,
  Monitor, ShieldAlert, Check, Radio, StopCircle, MessageSquare, Send
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
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
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [alertHistory, setAlertHistory] = useState<AlertRecord[]>([]);
  const [toasts, setToasts] = useState<any[]>([]);
  const [listenerKey, setListenerKey] = useState(0);

  const [incomingRequest, setIncomingRequest] = useState<any | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender: string, text: string, time: string, isSelf: boolean}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [adminPing, setAdminPing] = useState<{x: number, y: number, id: number} | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  const [staffProfile, setStaffProfile] = useState<any>({ id: '', name: 'Loading...', email: '...', initials: 'ST' });

  useEffect(() => {
    const verifyStaff = async () => {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setStaffProfile({ id: 'guest-mock-uuid', name: 'Demo Guest User', email: 'guest@vsit.com', initials: 'GS', emp_id: 'DEMO-001' });
        setIsCheckingAuth(false);
        return;
      }
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showChat]);

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
    const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
    if (!dismissed.includes(id)) { dismissed.push(id); localStorage.setItem('dismissed_broadcasts', JSON.stringify(dismissed)); }
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      await supabase.from('notifications').delete().eq('id', id);
    } catch (e) {}
  };

  useEffect(() => {
    if (!staffProfile.id || staffProfile.id === 'guest-mock-uuid') return;

    const fetchMissedNotifications = async () => {
      try {
        const { data } = await supabase.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false });
        if (data) {
          const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
          const validNotifs = data.filter(n => {
            if (dismissed.includes(n.id)) return false;
            const t = String(n.target_user || '').trim().toLowerCase();
            return t === '' || t === 'null' || ['all', 'broadcast', 'everyone', 'staff'].includes(t) || t === String(staffProfile.id).toLowerCase() || t === staffProfile.email.toLowerCase();
          });
          setAlertHistory(validNotifs.map(n => ({ id: n.id, title: n.title || 'System Alert', message: n.message, time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false })));
        }
      } catch (err) {}
    };
    fetchMissedNotifications();

    const topic1 = `webrtc_signaling_${staffProfile.id}`;
    const topic2 = `webrtc_signaling_${staffProfile.emp_id}`;
    const topic3 = getChannelTopic(staffProfile);

    supabase.getChannels().forEach(ch => {
      if (ch.topic === topic1 || ch.topic === topic2 || ch.topic === topic3 || ch.topic === 'staff-layout-alerts') {
        supabase.removeChannel(ch);
      }
    });

    const handlePing = (payload: any, channelUsed: string) => {
      setIncomingRequest((prev: any) => {
        if (!prev) addSystemAlert("⚠️ Remote Access Requested", "IT Admin requested live screen sharing! Please click Accept on your dashboard.");
        return { adminName: payload.payload?.adminName || 'IT Administrator', adminCode: payload.payload?.adminCode || 'EMP-ADMIN', channelId: channelUsed };
      });
    };

    const ch1 = supabase.channel(topic1).on('broadcast', { event: 'request_screen_share' }, p => handlePing(p, topic1)).subscribe();
    const ch2 = supabase.channel(topic2).on('broadcast', { event: 'request_screen_share' }, p => handlePing(p, topic2)).subscribe();
    const ch3 = supabase.channel(topic3).on('broadcast', { event: 'request_screen_share' }, p => handlePing(p, topic3)).subscribe();

    const dbChannel = supabase.channel('staff-layout-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new;
        const t = String(n.target_user || '').trim().toLowerCase();
        if (t === '' || t === 'null' || ['all', 'broadcast', 'everyone', 'staff'].includes(t) || t === String(staffProfile.id).toLowerCase() || t === staffProfile.email.toLowerCase()) {
          addSystemAlert(n.title || 'System Alert', n.message);
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      supabase.removeChannel(dbChannel);
    };
  }, [staffProfile, listenerKey]);

  const startScreenShare = async (manualChannelId?: string, alertIdToDismiss?: string) => {
    const targetChannelId = manualChannelId || incomingRequest?.channelId || getChannelTopic(staffProfile);
    setIsConnecting(true);
    
    if (alertIdToDismiss) dismissHistoryAlert(alertIdToDismiss);
    setIncomingRequest(null); 
    setChatMessages([]);

    try {
      // 🌟 FIX 1: FORCE-KILL ORPHANED STREAMS FIRST
      // This prevents the "Could not start video source" locked-device error.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      supabase.getChannels().forEach(ch => {
        if (ch.topic.includes('webrtc_signaling_') || ch.topic.includes('vsit_rtc_')) supabase.removeChannel(ch);
      });

      addSystemAlert("🚀 Launching Screen Picker", "Establishing secure capture channel...", false);
      let stream: MediaStream | null = null;
      
      try {
        const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
        
        if (electronAPI && electronAPI.getDesktopSourceId) {
          const sourceId = await electronAPI.getDesktopSourceId();
          if (!sourceId) throw new Error("Could not detect monitor ID.");
          
          // Electron Capture (Legacy constraints)
          stream = await (navigator.mediaDevices as any).getUserMedia({ 
            audio: false, 
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } as any 
          });
        } else {
          // Standard Browser Capture
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        }
      } catch (err1: any) {
        console.warn("Primary capture failed, engaging ultimate fallback...", err1);
        
        // 🌟 FIX 2: THE ULTIMATE FALLBACK
        // If Electron fails because of OS strictness, instantly fall back to generic getDisplayMedia
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: { displaySurface: "monitor" } as any, 
            audio: false 
          });
        } catch (err2: any) {
          throw new Error(`Permission Denied or App Restricted. [Err1: ${err1.message}] [Err2: ${err2.message}]`);
        }
      }

      if (!stream) throw new Error("Failed to acquire video stream from hardware.");
      streamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
        addSystemAlert("Screen Share Stopped", "You have ended live screen sharing.");
      };

      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          stopScreenSharing();
          addSystemAlert("🛑 Session Ended", "IT Admin disconnected from the session.");
        }
      };

      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      const sessionChannel = supabase.channel(targetChannelId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_staff', payload: { candidate: event.candidate } });
      };

      sessionChannel.on('broadcast', { event: 'sdp_answer_admin' }, async (payload) => {
        if (peer.signalingState === 'have-local-offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          setIsConnecting(false);
          setIsStreaming(true);
          addSystemAlert("🟢 Connected", "Live WebRTC Screen Share Established!");
        }
      }).on('broadcast', { event: 'ice_candidate_admin' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
      }).on('broadcast', { event: 'terminate_session' }, () => {
        stopScreenSharing();
        addSystemAlert("🛑 Session Ended", "IT Admin ended the remote support session.");
      }).on('broadcast', { event: 'admin_stopped_sharing' }, () => {
        stopScreenSharing(); 
        addSystemAlert("🛑 Session Ended", "IT Admin ended the remote support session.");
      }).on('broadcast', { event: 'chat_message' }, (payload) => {
        setChatMessages(prev => [...prev, { sender: payload.payload.sender || 'Admin', text: payload.payload.text, time: payload.payload.time, isSelf: false }]);
        setShowChat(true);
        addSystemAlert("💬 New IT Message", `Admin: ${payload.payload.text}`);
      }).on('broadcast', { event: 'admin_pointer_click' }, (payload) => {
        const { x, y } = payload.payload;
        setAdminPing({ x, y, id: Date.now() });
        setTimeout(() => setAdminPing(null), 2000); 
        if (typeof window !== 'undefined' && (window as any).electronAPI) (window as any).electronAPI.sendRemoteClick(x, y);
      }).on('broadcast', { event: 'admin_keyboard_input' }, (payload) => {
         if (typeof window !== 'undefined' && (window as any).electronAPI) (window as any).electronAPI.sendRemoteType(payload.payload.text);
      }).on('broadcast', { event: 'admin_system_command' }, (payload) => {
         if (typeof window !== 'undefined' && (window as any).electronAPI) (window as any).electronAPI.sendSystemCommand(payload.payload.command);
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_offer_staff', payload: { sdp: offer } });
        }
      });

    } catch (err: any) {
      addSystemAlert("❌ Connection Failed", err.message || 'Permission denied');
      setIsConnecting(false);
      setIsStreaming(false);
      setListenerKey(prev => prev + 1);
    }
  };

  const stopScreenSharing = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'staff_stopped_sharing', payload: {} });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsStreaming(false); setIsConnecting(false); setIncomingRequest(null); setShowChat(false);
    setListenerKey(prev => prev + 1);
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !channelRef.current) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: staffProfile.name || 'Me', text: chatInput, time: timeString, isSelf: true }]);
    channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: { sender: staffProfile.name, text: chatInput, time: timeString } });
    setChatInput('');
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.clear();
    window.location.href = '/';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerGlobalScreenShare = () => startScreenShare();
      (window as any).triggerGlobalStopShare = () => stopScreenSharing();
      (window as any).globalStreamStatus = isStreaming;
    }
  }, [staffProfile, incomingRequest, isStreaming]);

  const unreadCount = alertHistory.filter(a => !a.read).length;

  if (isCheckingAuth) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans relative overflow-hidden">
      
      {/* 🌟 FLOATING TOASTS CONTAINER */}
      <div className="fixed bottom-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto bg-white border-l-4 border-rose-500 shadow-2xl rounded-2xl p-4 w-85 sm:w-100 flex gap-3 animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="flex-1 pr-2 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">{toast.title}</h4>
              <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed wrap-break-word">{toast.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-rose-600 transition-colors shrink-0 self-start p-1 rounded-lg hover:bg-slate-100"><X size={16} /></button>
          </div>
        ))}
      </div>

      {/* 🔴 ACTIVE STREAMING UI */}
      {isStreaming && (
        <>
          {adminPing && (
            <div className="fixed z-99999 pointer-events-none flex items-center justify-center" style={{ left: `${adminPing.x}vw`, top: `${adminPing.y}vh`, transform: 'translate(-50%, -50%)' }}>
              <div className="absolute w-12 h-12 bg-rose-500/30 rounded-full animate-ping" />
              <div className="relative w-4 h-4 bg-rose-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(225,29,72,1)]" />
            </div>
          )}
          <div className="fixed bottom-6 right-6 z-9999 flex flex-col items-end gap-3 pointer-events-none">
            {showChat && (
              <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4">
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14} className="text-orange-500" /> Live Support Chat</span>
                  <button onClick={() => setShowChat(false)} className="hover:text-rose-400 transition-colors cursor-pointer"><X size={16}/></button>
                </div>
                <div className="h-56 p-3 overflow-y-auto flex flex-col gap-2.5 bg-slate-50 custom-scrollbar">
                  {chatMessages.length === 0 ? <div className="m-auto text-[11px] font-bold text-slate-400 text-center">No messages yet.</div> : chatMessages.map((msg, i) => (
                    <div key={i} className={`max-w-[85%] text-[11px] font-medium p-2.5 shadow-sm ${msg.isSelf ? 'bg-orange-600 text-white self-end rounded-2xl rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 self-start rounded-2xl rounded-bl-none'}`}>
                      <div className={`font-bold text-[9px] mb-1 ${msg.isSelf ? 'text-orange-200' : 'text-slate-400'}`}>{msg.sender}</div>{msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendChatMessage} className="p-2 bg-white border-t border-slate-100 flex gap-2">
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Type a reply to Admin..." className="flex-1 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-orange-500 transition-colors" />
                  <button type="submit" disabled={!chatInput.trim()} className="p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 cursor-pointer transition-colors"><Send size={14}/></button>
                </form>
              </div>
            )}
            <div className="bg-slate-900 border-2 border-orange-500 text-white p-3 sm:p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6 max-w-md w-full pointer-events-auto">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                <div><p className="text-xs font-black text-orange-400 uppercase tracking-wider">Screen Share Active</p><p className="text-[10px] text-zinc-300">IT Support is viewing your workspace.</p></div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowChat(!showChat)} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer relative ${showChat ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}`}>
                  <MessageSquare size={14} /> <span className="hidden sm:inline">Chat</span>
                  {chatMessages.length > 0 && !showChat && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full animate-pulse border-2 border-slate-900" />}
                </button>
                <button onClick={stopScreenSharing} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"><StopCircle size={15} /> <span className="hidden sm:inline">Stop</span></button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ⚠️ INCOMING REQUEST MODAL */}
      {incomingRequest && !isStreaming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-99999 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 border-2 border-orange-500">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto shadow-inner animate-bounce"><Monitor size={32} /></div>
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">Live IT Support Access Requested</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500"><strong className="text-slate-900 font-bold">{incomingRequest.adminName}</strong> ({incomingRequest.adminCode}) is requesting permission to view your screen for live troubleshooting.</p>
            </div>
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-800 flex items-center gap-3">
              <ShieldAlert size={22} className="shrink-0 text-orange-600" />
              <span>When prompted by your browser, select <strong className="underline">"Entire Screen"</strong> or your active window to establish the connection.</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIncomingRequest(null)} disabled={isConnecting} className="flex-1 py-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">Decline</button>
              <button onClick={() => startScreenShare(incomingRequest.channelId, incomingRequest.alertId)} disabled={isConnecting} className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer active:scale-95">
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isConnecting ? 'Connecting...' : 'Accept & Share'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity" />}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200/70 z-50 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center px-5 border-b border-slate-100 shrink-0"><img src="/logo.png" alt="Logo" className="h-7 w-auto" /></div>
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto custom-scrollbar">
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
              <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${isActive ? 'bg-orange-50 text-orange-700 font-semibold shadow-sm border border-orange-100/50' : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon size={18} className={`${isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} /> {link.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100 shrink-0 relative bg-slate-50/50">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-full flex items-center justify-between p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-full bg-linear-to-tr from-orange-500 to-orange-400 flex items-center justify-center text-white font-bold text-xs shadow-sm border border-orange-600/20">{staffProfile.initials}</div>
              <div className="text-left overflow-hidden"><p className="text-sm font-semibold text-slate-800 leading-tight truncate">{staffProfile.name}</p><p className="text-[10px] font-medium text-slate-500 truncate">{staffProfile.email}</p></div>
            </div>
            <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>
          {isProfileOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-xl border border-slate-200/80 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={14} /> Secure Logout</button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b border-slate-200/70 shrink-0 flex items-center justify-between px-4 lg:px-6 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 lg:hidden rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"><Menu size={20} /></button>
            <h2 className="text-sm lg:text-base font-bold text-slate-800 tracking-tight hidden sm:block">Virtual Staffing Solutions | Staff Dashboard</h2>
          </div>

          <div className="relative">
            <button onClick={() => { setIsNotifOpen(!isNotifOpen); if (!isNotifOpen) setAlertHistory(prev => prev.map(a => ({ ...a, read: true }))); }} className="relative p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm cursor-pointer" title="Session Alerts History">
              <Bell size={18} />
              {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm ring-2 ring-white">{unreadCount}</span>}
            </button>

            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><History size={14} className="text-purple-600"/> Session Alerts History</h3>
                </div>
                <div className="max-h-100 overflow-y-auto custom-scrollbar bg-white">
                  {alertHistory.length === 0 ? (
                    <div className="px-4 py-10 text-center text-slate-400 flex flex-col items-center gap-2"><Bell size={24} className="opacity-20" /><span className="text-xs font-medium">No alerts recorded yet.</span></div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {alertHistory.map((notif) => {
                        const isError = (notif.title || '').toLowerCase().includes('error') || (notif.title || '').toLowerCase().includes('cancel') || (notif.title || '').toLowerCase().includes('fail');
                        return (
                          <div key={notif.id} className={`p-4 hover:bg-slate-50 transition-colors group relative flex gap-3 ${isError ? 'bg-rose-50/30' : ''}`}>
                            <div className={`mt-0.5 shrink-0 ${isError ? 'text-rose-500' : 'text-orange-500'}`}><AlertTriangle size={16} /></div>
                            <div className="flex-1 pr-6 min-w-0">
                              <div className="flex justify-between items-start mb-0.5"><p className={`text-xs font-bold truncate ${isError ? 'text-rose-700' : 'text-slate-900'}`}>{notif.title}</p><span className="text-[9px] font-bold text-slate-400">{notif.time}</span></div>
                              <p className={`text-[11px] mt-1.5 leading-relaxed wrap-break-word ${isError ? 'font-medium text-rose-600' : 'text-slate-500'}`}>{notif.message}</p>
                            </div>
                            <button onClick={() => dismissHistoryAlert(notif.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors p-1 bg-white border border-slate-100 rounded-md shadow-sm" title="Delete from History"><X size={12} /></button>
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

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}