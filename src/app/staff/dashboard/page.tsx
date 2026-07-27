'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Monitor, Loader2, ShieldCheck, Check, X, Radio, Laptop, 
  ShieldAlert, Wifi, CheckCircle2, AlertTriangle, ExternalLink, 
  StopCircle, Ticket, Lock, PlusCircle, RefreshCw, Bell, Power,
  ChevronRight, Cpu, HardDrive, UserCheck, Trash2
} from 'lucide-react';

interface StaffProfile {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  emp_code?: string;
  department?: string;
}

// 🌟 DETERMINISTIC TOPIC KEY GENERATOR (GUARANTEES 100% ALIGNMENT WITH ADMIN)
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
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
];

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [hardwareUnits, setHardwareUnits] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 🌟 INTERACTIVE WEBRTC POPUP & STREAMING STATE
  const [incomingRequest, setIncomingRequest] = useState<{ adminName: string; adminCode: string; channelId: string; alertId?: string } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // WebRTC Peer & Media Stream References
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const activeSignalingUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('vsit_theme');
      const isDark = savedTheme === 'dark' || document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    checkTheme();
    window.addEventListener('storage', checkTheme);
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    loadDashboardData();
    return () => {
      window.removeEventListener('storage', checkTheme);
      observer.disconnect();
      stopScreenSharing();
      
      activeSignalingUserIdRef.current = null;
      supabase.getChannels().forEach(ch => {
        if (ch.topic.includes('webrtc_signaling_') || ch.topic.includes('staff_notif_popup_') || ch.topic.includes('vsit_rtc_')) {
          supabase.removeChannel(ch);
        }
      });
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const rawSession = localStorage.getItem('vsit_staff_session') || 
                         localStorage.getItem('vsit_admin_session') || 
                         localStorage.getItem('user');

      if (!rawSession) {
        toast.error("No active session found. Redirecting...");
        router.push('/');
        return;
      }

      let activeUser: any = {};
      try { activeUser = JSON.parse(rawSession); } 
      catch (e) { activeUser = { email: rawSession }; }

      const cleanEmail = (activeUser.email || '').toLowerCase().trim();

      const [{ data: userProfile }, { data: assets }, { data: userTickets }, { data: userAlerts }] = await Promise.all([
        supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle(),
        supabase.from('assets').select('*'),
        supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(30)
      ]);

      let currentProf: StaffProfile;
      if (userProfile) {
        currentProf = userProfile;
      } else {
        currentProf = {
          id: 'temp-' + Date.now(),
          full_name: activeUser.name || activeUser.full_name || cleanEmail.split('@')[0],
          email: cleanEmail,
          emp_code: activeUser.emp_code || 'EMP-9857',
          department: activeUser.department || 'Migration'
        };
      }

      setProfile(currentProf);

      const myAssets = (assets || []).filter(a => a.assigned_to === currentProf.id || a.assigned_to === currentProf.email);
      setHardwareUnits(myAssets);

      const myTickets = (userTickets || []).filter(t => t.user_email === cleanEmail || t.user_id === currentProf.id);
      setTickets(myTickets);

      // 🌟 SMART DEDUPLICATION: Collapses multiple duplicate alerts into single cards
      const rawAlerts = (userAlerts || []).filter(n => 
        (n.target_user === currentProf.id || n.target_role === 'staff' || !n.target_user) && !n.is_read
      );
      
      const uniqueAlerts: any[] = [];
      const seenTitles = new Set<string>();
      rawAlerts.forEach(a => {
        const key = `${a.title}_${a.message}`;
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          uniqueAlerts.push(a);
        } else {
          // Silently clean up duplicate database rows in background
          supabase.from('notifications').delete().eq('id', a.id).then(() => {});
        }
      });

      setAlerts(uniqueAlerts);

      const pendingShareAlert = uniqueAlerts.find(a => !a.is_read && (a.title?.includes('Screen Share') || a.title?.includes('Remote Support')));
      if (pendingShareAlert && !isStreaming) {
        setIncomingRequest({
          adminName: 'IT Support Commander',
          adminCode: 'EMP-ADMIN',
          channelId: getChannelTopic(currentProf),
          alertId: pendingShareAlert.id
        });
      }

      setupSignalingListener(currentProf.id, currentProf);

    } catch (error: any) {
      toast.error(`Error syncing dashboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 📡 SETUP LIVE SIGNALING WITH DYNAMIC INSTANCE TOKEN (ZERO LINTER / RUNTIME ERRORS)
  const setupSignalingListener = (userId: string, currentProf: any) => {
    if (!userId) return;
    if (activeSignalingUserIdRef.current === userId) return;
    activeSignalingUserIdRef.current = userId;

    const sigTopic = `webrtc_signaling_${userId}`;
    // 🌟 ROOT CAUSE FIX: Dynamic unique topic token prevents "cannot add postgres_changes" errors!
    const notifTopic = `staff_notif_popup_${userId}_${Date.now()}`;
    const targetChannelId = getChannelTopic(currentProf);

    supabase.getChannels().forEach(ch => {
      if (ch.topic.includes(sigTopic) || ch.topic.includes(`staff_notif_popup_${userId}`)) {
        supabase.removeChannel(ch);
      }
    });

    const signalingChannel = supabase.channel(sigTopic)
      .on('broadcast', { event: 'request_screen_share' }, (payload) => {
        setIncomingRequest({
          adminName: payload.payload?.adminName || 'IT Administrator',
          adminCode: payload.payload?.adminCode || 'EMP-ADMIN',
          channelId: targetChannelId
        });
        toast("⚠️ IT Admin requested live screen sharing!", { icon: '📡', duration: 8000 });
      })
      .subscribe();

    const dbNotifChannel = supabase.channel(notifTopic)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_user=eq.${userId}` }, (payload) => {
        const newNotif = payload.new;
        if (!newNotif.is_read) {
          setAlerts(prev => {
            if (prev.some(a => a.id === newNotif.id || (a.title === newNotif.title && a.message === newNotif.message))) return prev;
            return [newNotif, ...prev];
          });
        }
        if (!newNotif.is_read && newNotif.title && (newNotif.title.includes('Screen Share') || newNotif.title.includes('Remote Support'))) {
          setIncomingRequest({
            adminName: 'IT Support Commander',
            adminCode: 'EMP-ADMIN',
            channelId: targetChannelId,
            alertId: newNotif.id
          });
        }
      })
      .subscribe();
  };

  // 🚀 START WEBRTC SCREEN SHARE OVER DETERMINISTIC TOPIC & TURN RELAYS
  const startScreenShare = async (manualChannelId?: string, alertIdToDismiss?: string) => {
    const targetChannelId = manualChannelId || incomingRequest?.channelId || getChannelTopic(profile);
    setIsConnecting(true);

    try {
      supabase.getChannels().forEach(ch => {
        if (ch.topic === `realtime:${targetChannelId}` || ch.topic === targetChannelId) {
          supabase.removeChannel(ch);
        }
      });

      toast("🚀 Launching Screen Picker... Please select 'Entire Screen'", { icon: '🖥️', duration: 5000 });

      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: 30, max: 60 } },
        audio: false
      });

      streamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
        toast.error("Screen sharing stopped.");
      };

      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;

      stream.getTracks().forEach((track: MediaStreamTrack) => peer.addTrack(track, stream));

      const sessionChannel = supabase.channel(targetChannelId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_staff', payload: { candidate: event.candidate } });
        }
      };

      sessionChannel.on('broadcast', { event: 'sdp_answer_admin' }, async (payload) => {
        toast("⚡ Received SDP Answer from Admin... Completing Tunnel", { icon: '🔄', duration: 4000 });
        if (peer.signalingState === 'have-local-offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          setIsConnecting(false);
          setIsStreaming(true);
          setIncomingRequest(null);
          toast.success("🟢 Live WebRTC Screen Share Established!");
          if (alertIdToDismiss) dismissAlert(alertIdToDismiss);
        }
      }).on('broadcast', { event: 'ice_candidate_admin' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
        }
      }).on('broadcast', { event: 'terminate_session' }, () => {
        stopScreenSharing();
        toast("🛑 IT Admin ended the remote support session.", { icon: 'ℹ️' });
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          toast(`📡 Subscribed to topic: [${targetChannelId}]... Sending Offer`, { icon: '📡', duration: 4000 });
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_offer_staff', payload: { sdp: offer } });
          toast("📤 Transmitted SDP Offer to Admin Commander!", { icon: '📡', duration: 3000 });
        }
      });

      if (!incomingRequest) {
        toast.success("📡 Transmitting screen stream to IT Admin Commander...");
      }

    } catch (err: any) {
      toast.error(`Screen share cancelled or failed: ${err.message || 'Permission denied'}`);
      setIsConnecting(false);
    }
  };

  const stopScreenSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      streamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'staff_stopped_sharing', payload: {} });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsStreaming(false);
    setIsConnecting(false);
    setIncomingRequest(null);
  };

  const dismissAlert = async (id?: string) => {
    if (id) {
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (incomingRequest?.alertId === id) setIncomingRequest(null);
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        await supabase.from('notifications').delete().eq('id', id);
      } catch (err) {
        console.error("Error updating notification:", err);
      }
    } else {
      setIncomingRequest(null);
    }
    toast.success("Alert dismissed.");
  };

  const dismissAllAlerts = async () => {
    const ids = alerts.map(a => a.id);
    setAlerts([]);
    setIncomingRequest(null);
    if (ids.length > 0) {
      try {
        await supabase.from('notifications').update({ is_read: true }).in('id', ids);
        await supabase.from('notifications').delete().in('id', ids);
        toast.success("All action alerts cleared permanently!");
      } catch (err) {
        console.error("Error clearing notifications:", err);
      }
    }
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    loadDashboardData().then(() => {
      setIsSyncing(false);
      toast.success("✔ Live feeds synchronized!");
    });
  };

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
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.textSub}`}>Syncing Staff Workspace...</p>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 font-sans antialiased pb-12 flex flex-col relative`}>
      <Toaster position="top-right" />
      
      {/* 🔴 ACTIVE STREAMING FLOATING BADGE */}
      {isStreaming && (
        <div className="fixed bottom-6 right-6 z-9999 bg-slate-900 border-2 border-orange-500 text-white p-4 sm:p-5 rounded-3xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6 max-w-sm w-full">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <div>
              <p className="text-xs font-black text-orange-400 uppercase tracking-wider">Screen Share Active</p>
              <p className="text-[11px] text-zinc-300">IT Support is actively monitoring your workspace.</p>
            </div>
          </div>
          <button onClick={stopScreenSharing} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0">
            <StopCircle size={15} /> <span>Stop Sharing</span>
          </button>
        </div>
      )}

      {/* ⚠️ INTERACTIVE INCOMING SCREEN SHARE REQUEST POPUP MODAL */}
      {incomingRequest && !isStreaming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-9999 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#150f24] border-2 border-orange-500 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Monitor size={32} />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-purple-50">Live IT Support Access Requested</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-purple-300/70">
                <strong className="text-slate-900 dark:text-white font-bold">{incomingRequest.adminName}</strong> ({incomingRequest.adminCode}) is requesting permission to view your screen for live troubleshooting.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-xs font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-3">
              <ShieldAlert size={22} className="shrink-0 text-orange-600 dark:text-orange-400" />
              <span>When prompted by your browser, select <strong className="underline">"Entire Screen"</strong> or your active window to establish the connection.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => dismissAlert(incomingRequest?.alertId)} 
                disabled={isConnecting} 
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-purple-900/50 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Decline
              </button>
              <button 
                onClick={() => startScreenShare(incomingRequest.channelId, incomingRequest.alertId)} 
                disabled={isConnecting} 
                className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer active:scale-95"
              >
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isConnecting ? 'Connecting...' : 'Accept & Share'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 FULL-SCREEN ENTERPRISE FLUID CONTAINER */}
      <div className="w-full max-w-350 px-3 sm:px-6 lg:px-10 mx-auto space-y-6 pt-4 flex-1 flex flex-col">
        
        {/* STANDARDIZED WELCOME BANNER */}
        <div className={`${theme.card} rounded-3xl p-6 sm:p-8 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300`}>
          <div className="space-y-1 min-w-0">
            <h1 className={`text-xl sm:text-3xl font-black tracking-tight truncate ${theme.textMain} flex items-center gap-2`}>
              <span>Welcome back, {profile?.full_name || profile?.name || 'Staff Member'}</span>
              <span className="animate-bounce">👋</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                ID: {profile?.emp_code || 'EMP-9857'}
              </span>
              <span className={`text-xs font-semibold truncate ${theme.textSub}`}>{profile?.email}</span>
            </div>
          </div>

          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm shrink-0 hover:border-orange-500 hover:text-orange-600 ${theme.cardInner} ${theme.textMain} disabled:opacity-50`}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>Sync Feeds</span>
          </button>
        </div>

        {/* 🌟 ACTION ALERTS BOX WITH GUARANTEED ACCEPT BUTTON & CLEANUP TOOL */}
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-orange-600 dark:text-orange-400 animate-pulse" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${theme.textSub}`}>Action Alerts ({alerts.length})</h2>
            </div>
            {alerts.length > 0 && (
              <button
                onClick={dismissAllAlerts}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} /> <span>Clear All Alerts</span>
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className={`p-6 rounded-2xl border text-center text-xs font-bold ${theme.cardInner} ${theme.textSub}`}>
              <CheckCircle2 size={24} className="mx-auto mb-1.5 text-emerald-500 opacity-60" />
              <span>No pending action alerts. You are all caught up!</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alert) => {
                const isRemoteShareAlert = alert.title?.includes('Screen Share') || alert.title?.includes('Remote Support') || alert.message?.includes('screen access');

                return (
                  <div 
                    key={alert.id}
                    className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isRemoteShareAlert 
                        ? 'bg-orange-500/10 border-orange-500/40 shadow-md ring-1 ring-orange-500/20' 
                        : `${theme.cardInner} ${theme.divider}`
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isRemoteShareAlert ? 'bg-orange-600 text-white animate-bounce' : 'bg-purple-500/10 text-purple-600 dark:text-purple-300'}`}>
                        {isRemoteShareAlert ? <Monitor size={18} /> : <AlertTriangle size={18} />}
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-sm font-black truncate ${isRemoteShareAlert ? 'text-orange-600 dark:text-orange-400' : theme.textMain}`}>
                          {alert.title || 'System Notification'}
                        </h3>
                        <p className={`text-xs font-medium mt-0.5 leading-relaxed ${theme.textSub}`}>
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                      {/* 🟢 UNCONDITIONAL ACCEPT & SHARE BUTTON FOR SUPPORT ALERTS */}
                      {isRemoteShareAlert && !isStreaming && (
                        <button
                          type="button"
                          disabled={isConnecting}
                          onClick={() => startScreenShare(getChannelTopic(profile), alert.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer animate-pulse active:scale-95 disabled:opacity-50"
                        >
                          {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                          <span>Accept & Share</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => dismissAlert(alert.id)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          isRemoteShareAlert 
                            ? 'bg-white/80 dark:bg-[#150f24] border-orange-200 dark:border-orange-500/30 text-orange-800 dark:text-orange-300 hover:bg-orange-100' 
                            : `${theme.card} ${theme.textSub} hover:border-orange-500 hover:text-orange-600`
                        }`}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌟 QUICK ACTION GRID WITH DYNAMIC "TEAM SCREEN" LIVE REQUEST BADGE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {[
            { title: 'Raise Ticket', desc: 'IT failure & support', icon: <Ticket size={20} />, path: '/staff/dashboard/tickets/new', color: 'purple', badge: null },
            { title: 'Device Audit', desc: 'Hardware inspections', icon: <Lock size={20} />, path: '/staff/dashboard/inspections', color: 'slate', badge: null },
            { title: 'Request Gear', desc: 'New equipment order', icon: <PlusCircle size={20} />, path: '/staff/dashboard/requests', color: 'emerald', badge: null },
            { 
              title: 'Team Screen', 
              desc: 'Remote IT support hub', 
              icon: <Monitor size={20} />, 
              path: '/staff/dashboard/remote', 
              color: 'orange',
              badge: (incomingRequest || alerts.some(a => a.title?.includes('Screen Share'))) ? '🚨 Live Request' : null
            }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => router.push(item.path)}
              className={`relative p-4 sm:p-5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer ${theme.card} hover:-translate-y-1 hover:shadow-lg hover:border-orange-500 group`}
            >
              {/* 🚨 DYNAMIC BADGE ON TEAM SCREEN THUMBNAIL */}
              {item.badge && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-600 text-white shadow-md animate-bounce">
                  {item.badge}
                </span>
              )}

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                item.color === 'orange' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                item.color === 'purple' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300' :
                item.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                'bg-slate-500/10 text-slate-600 dark:text-zinc-400'
              }`}>
                {item.icon}
              </div>
              <div>
                <h3 className={`text-xs sm:text-sm font-black group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors ${theme.textMain}`}>{item.title}</h3>
                <p className={`text-[11px] font-medium mt-0.5 truncate ${theme.textSub}`}>{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* STAT COUNTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${theme.card}`}>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Assigned Hardware</span>
              <h3 className={`text-2xl sm:text-3xl font-black mt-1 ${theme.textMain}`}>{hardwareUnits.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
              <Laptop size={24} />
            </div>
          </div>

          <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${theme.card}`}>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Action Required</span>
              <h3 className="text-2xl sm:text-3xl font-black mt-1 text-orange-600 dark:text-orange-400">{alerts.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${theme.card}`}>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Open Tickets</span>
              <h3 className="text-2xl sm:text-3xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                {tickets.filter(t => !t.status?.toLowerCase().includes('resolv') && !t.status?.toLowerCase().includes('clos')).length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Ticket size={24} />
            </div>
          </div>
        </div>

        {/* HARDWARE & TICKETS SPLIT VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* Hardware Units List */}
          <div className={`rounded-3xl border shadow-sm overflow-hidden flex flex-col ${theme.card}`}>
            <div className={`p-5 border-b flex items-center justify-between ${theme.divider} ${isDarkMode ? 'bg-[#0f0a1c]/60' : 'bg-slate-50/60'}`}>
              <div className="flex items-center gap-2">
                <Laptop size={18} className="text-purple-600 dark:text-purple-300" />
                <h3 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>My Hardware Units</h3>
              </div>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300">{hardwareUnits.length} Total</span>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar max-h-95">
              {hardwareUnits.length === 0 ? (
                <div className={`text-center py-12 text-xs font-bold ${theme.textSub}`}>No hardware assets currently assigned.</div>
              ) : (
                hardwareUnits.map((asset) => (
                  <div key={asset.id} className={`p-4 rounded-2xl border space-y-3 ${theme.cardInner}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm font-black ${theme.textMain}`}>{asset.name || 'Unnamed Asset'}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {asset.status || 'Approved'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 dark:border-purple-900/30 text-[11px]">
                      <div>
                        <span className={`block font-bold text-[9px] uppercase ${theme.textSub}`}>Tag ID</span>
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{asset.asset_tag || asset.tag_id || 'N/A'}</span>
                      </div>
                      <div>
                        <span className={`block font-bold text-[9px] uppercase ${theme.textSub}`}>Serial S/N</span>
                        <span className="font-mono font-bold truncate block" title={asset.serial_number}>{asset.serial_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Service Tickets List */}
          <div className={`rounded-3xl border shadow-sm overflow-hidden flex flex-col ${theme.card}`}>
            <div className={`p-5 border-b flex items-center justify-between ${theme.divider} ${isDarkMode ? 'bg-[#0f0a1c]/60' : 'bg-slate-50/60'}`}>
              <div className="flex items-center gap-2">
                <Ticket size={18} className="text-orange-600 dark:text-orange-400" />
                <h3 className={`text-xs font-black uppercase tracking-widest ${theme.textMain}`}>My Service Tickets</h3>
              </div>
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">{tickets.length} Raised</span>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar max-h-95">
              {tickets.length === 0 ? (
                <div className={`text-center py-12 text-xs font-bold ${theme.textSub}`}>No service tickets submitted.</div>
              ) : (
                tickets.map((t) => {
                  const isResolved = t.status?.toLowerCase().includes('resolv') || t.status?.toLowerCase().includes('clos');
                  return (
                    <div key={t.id} className={`p-4 rounded-2xl border space-y-2.5 ${theme.cardInner}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-bold truncate ${theme.textMain}`}>{t.title || 'Support Request'}</h4>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shrink-0 ${
                          isResolved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {t.status || 'Pending'}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${theme.textSub}`}>{t.description || t.message || 'No description provided.'}</p>
                      <div className="pt-2 border-t border-slate-200/50 dark:border-purple-900/30 flex justify-between items-center text-[10px] font-mono text-zinc-400">
                        <span>Submitted: {new Date(t.created_at).toLocaleDateString()}</span>
                        <span className="text-purple-600 dark:text-purple-300 font-bold uppercase">{t.category || 'Hardware'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}