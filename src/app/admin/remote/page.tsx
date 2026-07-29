'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, Monitor, ArrowLeft, Loader2, ShieldAlert, Search, 
  PanelLeftClose, PanelLeftOpen, ExternalLink, Copy, Check, 
  Bell, RefreshCw, Play, Terminal, Sliders, Power, 
  Maximize, Minimize, AlertTriangle, CheckCircle2, Laptop,
  HelpCircle, ShieldCheck, Cpu, MousePointer, Keyboard, Lock,
  Video, Radio, Eye, Camera, StopCircle, Filter, 
  MessageSquare, Send, Volume2, VolumeX
} from 'lucide-react';

interface StaffMember {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  emp_code?: string;
  department?: string;
  role?: string;
  status?: string;
  is_online?: boolean;
  assigned_asset_name?: string;
}

interface AdminProfile {
  name: string;
  email: string;
  emp_code: string;
}

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isSelf: boolean;
}

// 🌟 DETERMINISTIC TOPIC KEY GENERATOR
const getChannelTopic = (staff: any) => {
  const code = (staff?.emp_code || staff?.emp_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = (staff?.email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = (staff?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `vsit_rtc_${code || email || id || 'default'}`;
};

// 🌟 ENTERPRISE ICE SERVERS WITH STUN + TURN TCP/UDP RELAYS
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
];

export default function AdminRemotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeSession, setActiveSession] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 🌟 NATIVE WEBRTC RECEIVER STATE
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'requesting' | 'connected' | 'controlling'>('idle');
  const [isControlling, setIsControlling] = useState(false);
  const [viewerTab, setViewerTab] = useState<'live_stream' | 'diagnostics' | 'security_logs'>('live_stream');
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({ name: 'System Admin', email: 'admin@vsit.com', emp_code: 'EMP-ADMIN' });

  // 🌟 NEW FEATURES STATE (FULLSCREEN, AUDIO, CHAT)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // WebRTC & DOM References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('vsit_theme');
      const isDark = savedTheme === 'dark' || document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };

    checkTheme();
    window.addEventListener('storage', checkTheme);
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    loadStaffAndAdminData();
    
    return () => {
      window.removeEventListener('storage', checkTheme);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      observer.disconnect();
      terminateSession();
    };
  }, []);

  // 🌟 KEYBOARD PASSTHROUGH ENGINE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isControlling || !channelRef.current) return;
      
      // Do not capture keyboard input if the Admin is typing in the chat or search box
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      e.preventDefault(); // Prevent scrolling when pressing space/arrows

      // Transmit the exact keystroke to the Electron Desktop App
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_keyboard_input',
        payload: { text: e.key }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isControlling]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadStaffAndAdminData = async () => {
    setLoading(true);
    try {
      const rawSession = localStorage.getItem('vsit_admin_session') || 
                         localStorage.getItem('vsit_staff_session') || 
                         localStorage.getItem('user');

      if (!rawSession) {
        toast.error("No active session found. Redirecting to dashboard...");
        router.push('/admin');
        return;
      }

      let activeUser: any = {};
      try { activeUser = JSON.parse(rawSession); } 
      catch (e) { activeUser = { email: rawSession, role: 'admin' }; }

      const cleanEmail = (activeUser.email || '').toLowerCase().trim();
      const userRole = (activeUser.role || '').toLowerCase().trim();

      if (cleanEmail !== 'lakhwinder.bi@outlook.com' && userRole !== 'admin') {
        toast.error("Access restricted to IT Administrators.");
        router.push('/admin');
        return;
      }

      setAdminProfile({
        name: activeUser.full_name || activeUser.name || cleanEmail.split('@')[0] || 'IT Administrator',
        email: cleanEmail,
        emp_code: activeUser.emp_code || activeUser.emp_id || 'EMP-ADMIN-01'
      });

      const [{ data: profiles, error: profErr }, { data: assets }] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name', { ascending: true }),
        supabase.from('assets').select('name, assigned_to')
      ]);

      if (profErr) throw profErr;

      if (profiles) {
        const enhancedStaff: StaffMember[] = profiles.map((p: any) => {
          const matchedAsset = (assets || []).find(a => a.assigned_to === p.id || a.assigned_to === p.email);
          return {
            ...p,
            assigned_asset_name: matchedAsset ? matchedAsset.name : 'Unassigned PC'
          };
        });

        enhancedStaff.sort((a, b) => {
          const aOnline = a.is_online || a.status?.toLowerCase() === 'online' || a.status?.toLowerCase() === 'active';
          const bOnline = b.is_online || b.status?.toLowerCase() === 'online' || b.status?.toLowerCase() === 'active';
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return 0;
        });

        setStaffList(enhancedStaff);
      }
    } catch (error: any) {
      toast.error(`Failed to load network core: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectStaffMember = (staff: StaffMember) => {
    if (sessionStatus !== 'idle') terminateSession();
    setActiveSession(staff);
    setSessionStatus('idle');
    setIsControlling(false);
    setChatMessages([]);
  };

  const requestLiveScreenShare = async () => {
    if (!activeSession) return;
    setIsSendingPing(true);
    setSessionStatus('requesting');
    setChatMessages([]);

    try {
      const backgroundChannelId = getChannelTopic(activeSession);
      
      // 🌟 NEW ARCHITECTURE: Create a totally unique channel just for this video session!
      const liveSessionId = `${backgroundChannelId}_live_${Date.now()}`;
      
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      toast(`📡 Establishing video session on: [${liveSessionId}]`, { icon: '🔍', duration: 4000 });

      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;

      // Force WebRTC to expect incoming video
      peer.addTransceiver('video', { direction: 'recvonly' });

      peer.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(() => {});
          setSessionStatus('connected');
          toast.success("🟢 Live Video Stream Established & Playing!");
        }
      };

      // 🌟 Connect to the NEW unique video channel
      const sessionChannel = supabase.channel(liveSessionId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_admin', payload: { candidate: event.candidate } });
        }
      };

      sessionChannel.on('broadcast', { event: 'sdp_offer_staff' }, async (payload) => {
        try {
          toast("⚡ Received SDP Offer from Staff... Generating Answer", { icon: '🔄', duration: 4000 });
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_answer_admin', payload: { sdp: answer } });
          toast("📤 Transmitted SDP Answer to Staff!", { icon: '📡', duration: 3000 });
        } catch (rtcError: any) {
          toast.error(`WebRTC Handshake Crash: ${rtcError.message || rtcError.name}`);
          console.error("SDP Answer Error:", rtcError);
        }
      }).on('broadcast', { event: 'ice_candidate_staff' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
        }
      }).on('broadcast', { event: 'staff_stopped_sharing' }, () => {
        terminateSession();
        toast.error("Employee stopped sharing their screen.");
      }).on('broadcast', { event: 'chat_message' }, (payload) => {
        setChatMessages(prev => [...prev, {
          sender: payload.payload.sender || 'Staff',
          text: payload.payload.text,
          time: payload.payload.time,
          isSelf: false
        }]);
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          
          // 🌟 ONCE ADMIN IS LISTENING TO THE VIDEO CHANNEL, PING STAFF ON THE BACKGROUND CHANNEL TO JOIN!
          const pingChannel = supabase.channel(backgroundChannelId);
          pingChannel.subscribe(async (pingStatus) => {
            if (pingStatus === 'SUBSCRIBED') {
              await pingChannel.send({
                type: 'broadcast',
                event: 'request_screen_share',
                payload: {
                  adminName: adminProfile.name,
                  adminCode: adminProfile.emp_code,
                  channelId: liveSessionId // 🌟 This tells Staff exactly where to send the video!
                }
              });
              supabase.removeChannel(pingChannel); // Hang up the ping channel
            }
          });

          await supabase.from('notifications').insert([{
            target_user: activeSession.id,
            title: '📡 Live Screen Share Request',
            message: `IT Admin (${adminProfile.name}) is requesting live browser screen access for IT support. Please click Accept on your dashboard.`,
            is_read: false,
            type: 'warning'
          }]);

          toast.success(`📡 Signaling prompt dispatched to ${activeSession.full_name || 'Staff'}!`);
        }
      });

    } catch (err: any) {
      toast.error(`Signaling failed: ${err.message}`);
      setSessionStatus('idle');
    } finally {
      setIsSendingPing(false);
    }
  };

  const toggleRemoteControl = () => {
    if (sessionStatus !== 'connected' && sessionStatus !== 'controlling') {
      return toast.error("Please establish a live screen share stream before enabling control.");
    }
    const nextState = !isControlling;
    setIsControlling(nextState);
    setSessionStatus(nextState ? 'controlling' : 'connected');
    toast.success(nextState ? "🎮 Remote Mouse & Keyboard Injection ENABLED!" : "👁️ Switched to View-Only Mode.");
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      viewportContainerRef.current?.requestFullscreen().catch((err) => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const terminateSession = () => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'terminate_session', payload: {} });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setSessionStatus('idle');
    setIsControlling(false);
    if (document.fullscreenElement) document.exitFullscreen();
  };

  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isControlling) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_pointer_click',
        payload: { x, y }
      });
    }
  };

  const dispatchSystemCommand = (commandType: string) => {
    if (!channelRef.current) {
      return toast.error("No active connection to execute commands.");
    }
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'admin_system_command',
      payload: { command: commandType }
    });
    
    toast.success(`OS Command dispatched: [${commandType.toUpperCase()}]`);
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !channelRef.current) return;
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages(prev => [...prev, {
      sender: 'Me (Admin)',
      text: chatInput,
      time: timeString,
      isSelf: true
    }]);

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: {
        sender: adminProfile.name,
        text: chatInput,
        time: timeString
      }
    });

    setChatInput('');
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return []; 

    return staffList.filter(s => {
      return (s.full_name || s.name || '').toLowerCase().includes(q) || 
             (s.emp_code || '').toLowerCase().includes(q) ||
             (s.email || '').toLowerCase().includes(q) ||
             (s.department || '').toLowerCase().includes(q);
    });
  }, [staffList, searchQuery]);

  const theme = {
    bg: isDarkMode ? 'bg-[#0b0712]' : 'bg-slate-50',
    card: isDarkMode ? 'bg-[#150f24] border-purple-900/40' : 'bg-white border-slate-200/80',
    cardInner: isDarkMode ? 'bg-[#0f0a1c] border-purple-900/50' : 'bg-slate-50 border-slate-200',
    textMain: isDarkMode ? 'text-purple-50' : 'text-slate-900',
    textSub: isDarkMode ? 'text-purple-300/70' : 'text-slate-500',
    divider: isDarkMode ? 'border-purple-900/40' : 'border-slate-100',
  };

  if (loading) return (
    <div className={`min-h-screen ${theme.bg} flex flex-col items-center justify-center gap-4 transition-colors`}>
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-900 border-t-orange-600 dark:border-t-orange-500"></div>
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.textSub}`}>Initializing WebRTC Support Engine...</p>
    </div>
  );

  return (
    <div className={`h-screen max-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased flex flex-col overflow-hidden`}>
      <Toaster position="top-right" />
      
      <div className="w-full max-w-400 px-3 sm:px-6 lg:px-8 mx-auto py-3.5 flex-1 flex flex-col min-h-0 overflow-hidden gap-3.5">
        
        <div className={`${theme.card} rounded-2xl p-3 sm:p-4 border shadow-sm flex items-center justify-between gap-4 shrink-0 transition-all duration-300`}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/admin')} className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${theme.card} hover:border-orange-500 hover:text-orange-600 ${theme.textSub}`} title="Back to Dashboard">
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className={`text-base sm:text-xl font-black tracking-tight truncate ${theme.textMain} flex items-center gap-2`}>
                  <Monitor className="text-orange-600 dark:text-orange-400 w-5 h-5 shrink-0" /> 
                  <span>In-Browser Remote Support Commander</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30 shrink-0">
                  True WebRTC Receiver Engine
                </span>
              </div>
              <p className={`text-xs font-semibold truncate hidden sm:block ${theme.textSub}`}>
                View and control employee screens directly inside your browser with mandatory security watermark overlays—no 3rd party software needed.
              </p>
            </div>
          </div>

          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm shrink-0 hover:border-orange-500 hover:text-orange-600 ${theme.card} ${theme.textMain}`}>
            {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            <span className="hidden sm:inline">{isSidebarOpen ? 'Hide Directory' : 'Show Directory'}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
          
          {isSidebarOpen && (
            <div className={`w-full lg:w-80 rounded-2xl border shadow-sm flex flex-col shrink-0 overflow-hidden transition-all duration-300 max-h-75 lg:max-h-full ${theme.card}`}>
              <div className={`p-3 border-b space-y-2.5 shrink-0 ${theme.divider} ${isDarkMode ? 'bg-[#0f0a1c]/60' : 'bg-slate-50/60'}`}>
                <div className="relative w-full">
                  <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                  <input
                    type="text"
                    placeholder="Search Staff or EMP ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ backgroundColor: isDarkMode ? '#130d24' : '#ffffff', color: isDarkMode ? '#f3e8ff' : '#0f172a', borderColor: isDarkMode ? '#581c87' : '#cbd5e1' }}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar min-h-0">
                {searchQuery.trim() === '' ? (
                  <div className={`text-center p-6 text-xs font-bold ${theme.textSub}`}>
                    Type a name, email, or EMP ID to search.
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className={`text-center p-6 text-xs font-bold ${theme.textSub}`}>
                    No matching staff found.
                  </div>
                ) : (
                  filteredStaff.map((staff) => {
                    const isSelected = activeSession?.id === staff.id;
                    const isOnline = staff.is_online || staff.status?.toLowerCase() === 'online' || staff.status?.toLowerCase() === 'active';

                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => selectStaffMember(staff)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all duration-150 border cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected ? 'bg-orange-600 text-white shadow-sm border-orange-600' : `${theme.cardInner} ${theme.textMain} hover:border-orange-400 dark:hover:border-purple-700`
                        }`}
                      >
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30' : 'bg-slate-400 dark:bg-zinc-600'}`} />
                            <p className="font-bold text-xs truncate leading-tight">{staff.full_name || staff.name || staff.email.split('@')[0]}</p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded ${isSelected ? 'bg-orange-700 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-300'}`}>{staff.emp_code || 'NO-ID'}</span>
                            <span className={`text-[9px] truncate font-semibold ${isSelected ? 'text-orange-100' : theme.textSub}`}>{staff.assigned_asset_name}</span>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                          <Monitor size={13} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className={`flex-1 rounded-2xl border shadow-sm overflow-hidden flex flex-col min-w-0 min-h-0 transition-all ${theme.card}`}>
            {activeSession ? (
              <div className="flex-1 flex flex-col h-full min-w-0 min-h-0">
                
                <div className={`p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${isDarkMode ? 'bg-[#0f0a1c]/80 border-purple-900/40' : 'bg-purple-50/40 border-purple-100'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm">
                      {activeSession.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className={`text-sm sm:text-base font-black truncate ${theme.textMain}`}>{activeSession.full_name || activeSession.name || 'Unnamed Employee'}</h2>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                          sessionStatus === 'connected' || sessionStatus === 'controlling' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 animate-pulse'
                            : sessionStatus === 'requesting' 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {sessionStatus === 'controlling' ? '🎮 Remote Control Active' : sessionStatus === 'connected' ? '🟢 Connected (WebRTC Live)' : sessionStatus === 'requesting' ? '🟡 Awaiting Staff Share...' : '⚪ Session Idle'}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold truncate mt-0.5 ${theme.textSub}`}>
                        Assigned PC: <strong className={theme.textMain}>{activeSession.assigned_asset_name}</strong> • Target ID: <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">{activeSession.emp_code || 'EMP-UNKNOWN'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sessionStatus === 'idle' || sessionStatus === 'requesting' ? (
                      <button
                        type="button"
                        disabled={sessionStatus === 'requesting' || isSendingPing}
                        onClick={requestLiveScreenShare}
                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        <Radio size={14} className={sessionStatus === 'requesting' ? 'animate-ping' : ''} />
                        <span>{sessionStatus === 'requesting' ? 'Connecting WebRTC...' : '📡 Initiate Screen Share'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={toggleRemoteControl}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 ${
                            isControlling 
                              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25 ring-2 ring-purple-400 animate-pulse'
                              : 'bg-slate-900 dark:bg-zinc-800 hover:bg-black text-white'
                          }`}
                        >
                          <MousePointer size={14} />
                          <span>{isControlling ? '🎮 Controlling PC' : 'Enable Control'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={terminateSession}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <Power size={14} />
                          <span>Disconnect</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={`px-5 pt-1 flex items-center gap-4 border-b shrink-0 ${theme.divider} ${isDarkMode ? 'bg-[#0f0a1c]/40' : 'bg-slate-50/40'}`}>
                  {[
                    { id: 'live_stream', label: '🖥️ Live WebRTC Viewport', icon: <Video size={13} /> },
                    { id: 'diagnostics', label: '🛠️ Remote Diagnostics', icon: <Sliders size={13} /> },
                    { id: 'security_logs', label: '🛡️ Audit Ledger', icon: <ShieldCheck size={13} /> }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setViewerTab(t.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        viewerTab === t.id ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-black' : 'border-transparent text-purple-400 dark:text-purple-300/60 hover:text-orange-500'
                      }`}
                    >
                      {t.icon} <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-4 sm:p-5 overflow-hidden flex flex-col min-h-0">
                  
                  {viewerTab === 'live_stream' && (
                    <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 overflow-hidden">
                      
                      <div className="flex-1 flex flex-col gap-3 min-h-0">
                        <div 
                          ref={viewportContainerRef}
                          onClick={handleViewportClick}
                          className={`relative flex-1 w-full rounded-2xl overflow-hidden border-2 flex flex-col items-center justify-center min-h-0 transition-all select-none ${
                            isControlling 
                              ? 'border-orange-500 ring-4 ring-orange-500/20 cursor-crosshair bg-slate-950' 
                              : sessionStatus === 'connected'
                              ? 'border-purple-600/50 bg-slate-950 shadow-2xl'
                              : isDarkMode ? 'border-purple-900/60 bg-[#0f0a1c]' : 'border-slate-300 bg-slate-900'
                          }`}
                        >
                          <div className={`absolute top-3 inset-x-3 z-30 pointer-events-none flex items-center justify-center ${isFullscreen ? 'opacity-50' : ''}`}>
                            <div className="w-full max-w-2xl py-2 px-4 rounded-xl bg-black/85 border border-orange-500/80 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center sm:text-left">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                                <span className="text-[10px] font-mono font-black text-orange-400 uppercase tracking-wider">
                                  ⚠️ LIVE IT SUPPORT IN PROGRESS | DO NOT CLOSE BROWSER
                                </span>
                              </div>
                              <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase bg-purple-950/80 px-2.5 py-0.5 rounded-md border border-purple-500/40">
                                AUTHORIZED ADMIN: <strong className="text-white">{adminProfile.name} ({adminProfile.emp_code})</strong>
                              </span>
                            </div>
                          </div>

                          {sessionStatus === 'connected' || sessionStatus === 'controlling' ? (
                            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setIsAudioEnabled(!isAudioEnabled); }}
                                className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg"
                                title={isAudioEnabled ? "Mute Incoming Audio" : "Enable Incoming Audio (If Staff is transmitting)"}
                              >
                                {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-rose-400" />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }}
                                className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg"
                                title="Toggle Fullscreen"
                              >
                                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                              </button>
                            </div>
                          ) : null}

                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted={!isAudioEnabled}
                            className={`w-full h-full object-contain z-10 ${sessionStatus === 'connected' || sessionStatus === 'controlling' ? 'block' : 'hidden'}`}
                          />

                          {sessionStatus === 'requesting' ? (
                            <div className="flex flex-col items-center justify-center text-center p-6 text-white z-10">
                              <Loader2 size={40} className="text-orange-500 animate-spin mb-3" />
                              <h3 className="text-base font-black">Awaiting Employee Screen Share Authorization...</h3>
                              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                                A WebRTC signaling prompt has been sent to <strong className="text-white">{activeSession.full_name || 'Staff'}</strong>. Once they click Accept on their screen, the video feed will render live inside this player.
                              </p>
                            </div>
                          ) : sessionStatus === 'idle' && (
                            <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500 z-10">
                              <Video size={48} className="mb-3 opacity-30" />
                              <h3 className="text-sm font-black text-zinc-400">WebRTC Viewport Offline</h3>
                              <p className="text-xs mt-1 max-w-sm">
                                Click <strong className="text-orange-400">Initiate Screen Share</strong> above to establish a live in-browser stream with mandatory watermark overlays.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 shrink-0 ${theme.cardInner}`}>
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={toggleRemoteControl}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                                isControlling ? 'bg-orange-600 text-white shadow-md' : 'bg-white dark:bg-zinc-900 border text-slate-700 dark:text-zinc-300 hover:border-orange-500'
                              }`}
                            >
                              <MousePointer size={13} />
                              <span>{isControlling ? '🎮 Mouse Input Enabled' : 'Enable Mouse Input'}</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if(isControlling) toast.success("⌨️ Keyboard active! Simply type on your keyboard to send input.");
                                else toast.error("Please click 'Enable Mouse Input' to activate keyboard passthrough.");
                              }}
                              className="px-3.5 py-1.5 rounded-lg border bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-orange-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Keyboard size={13} />
                              <span>Enable Keyboard</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {(sessionStatus === 'connected' || sessionStatus === 'controlling') && (
                        <div className={`w-full xl:w-80 rounded-2xl border flex flex-col overflow-hidden shrink-0 transition-all ${theme.cardInner}`}>
                          <div className={`p-3 border-b flex items-center gap-2 ${theme.divider} ${isDarkMode ? 'bg-[#0f0a1c]' : 'bg-slate-50'}`}>
                            <MessageSquare size={16} className="text-purple-500" />
                            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textMain}`}>Live Session Chat</h3>
                          </div>
                          
                          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar bg-white dark:bg-[#0b0712] min-h-62.5">
                            {chatMessages.length === 0 ? (
                              <div className="m-auto text-center text-xs font-medium text-slate-400 dark:text-zinc-600">
                                Send a message to communicate with {activeSession.full_name?.split(' ')[0]}.
                              </div>
                            ) : (
                              chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col max-w-[85%] ${msg.isSelf ? 'self-end items-end' : 'self-start items-start'}`}>
                                  <span className="text-[9px] text-slate-400 font-bold mb-0.5 px-1">{msg.isSelf ? 'You' : msg.sender} • {msg.time}</span>
                                  <div className={`px-3 py-2 rounded-xl text-xs font-medium shadow-sm ${msg.isSelf ? 'bg-orange-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-bl-none border border-slate-200 dark:border-zinc-700'}`}>
                                    {msg.text}
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={sendChatMessage} className={`p-3 border-t flex gap-2 ${theme.divider} ${isDarkMode ? 'bg-[#0f0a1c]' : 'bg-slate-50'}`}>
                            <input 
                              type="text" 
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              placeholder="Type a message..."
                              className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none focus:border-orange-500 transition-colors ${
                                isDarkMode ? 'bg-[#150f24] border-purple-900/50 text-white placeholder-zinc-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                            <button 
                              type="submit" 
                              disabled={!chatInput.trim()}
                              className="p-2 bg-orange-600 text-white rounded-xl disabled:opacity-50 hover:bg-orange-700 transition-colors cursor-pointer"
                            >
                              <Send size={16} />
                            </button>
                          </form>
                        </div>
                      )}

                    </div>
                  )}

                  {/* 🌟 NEW: DIAGNOSTICS & SYSTEM COMMAND DISPATCHER */}
                  {viewerTab === 'diagnostics' && (
                    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-300 overflow-y-auto w-full">
                      <div className={`p-5 rounded-2xl border space-y-3.5 ${theme.cardInner}`}>
                        <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${theme.textMain}`}>
                          <Sliders className="text-orange-600 dark:text-orange-400" size={18} /> 
                          <span>Remote IT Diagnostics & OS Commands</span>
                        </h3>
                        <p className={`text-xs font-medium ${theme.textSub}`}>
                          Execute remote commands directly on <strong className={theme.textMain}>{activeSession.full_name}</strong>'s Windows OS using the Electron backend privileges.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          {[
                            { title: '🔄 Force App Refresh', desc: 'Command the staff application to perform a hard reload and re-fetch session tokens.', action: () => dispatchSystemCommand('refresh_app') },
                            { title: '🧹 Clear Application Cache', desc: 'Purge local cache and temporary storage on the remote staff client.', action: () => dispatchSystemCommand('clear_cache') },
                            { title: '🔒 Lock Windows Workstation', desc: 'Instantly lock the employee Windows screen requiring their password to re-enter.', action: () => dispatchSystemCommand('lock_windows') },
                            { title: '📁 Open File Explorer', desc: 'Launch the Windows File Explorer on the remote machine for visual access.', action: () => dispatchSystemCommand('open_explorer') },
                          ].map((tool, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={tool.action}
                              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${theme.card} hover:border-orange-500 group`}
                            >
                              <div>
                                <h4 className={`text-xs font-bold group-hover:text-orange-600 dark:group-hover:text-orange-400 ${theme.textMain}`}>{tool.title}</h4>
                                <p className={`text-[11px] font-medium mt-1 leading-relaxed ${theme.textSub}`}>{tool.desc}</p>
                              </div>
                              <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 self-end">Execute Command ➔</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {viewerTab === 'security_logs' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className={`p-4 rounded-xl border flex items-center justify-between ${theme.cardInner}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                            <ShieldCheck size={18} />
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${theme.textMain}`}>WebRTC & Signaling Encryption Active</p>
                            <p className={`text-[11px] font-medium mt-0.5 ${theme.textSub}`}>All screen share streams run over secure TLS 1.3 / DTLS protocols with strict watermark logging.</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active RLS</span>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Monitor size={48} className={`mb-3 opacity-40 ${theme.textSub}`} />
                <h3 className={`text-sm sm:text-base font-black ${theme.textMain}`}>Select a Computer from the Directory</h3>
                <p className={`text-xs font-medium mt-1 max-w-sm ${theme.textSub}`}>
                  Search for a staff member on the left to initiate live in-browser WebRTC screen sharing and interactive mouse control.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}