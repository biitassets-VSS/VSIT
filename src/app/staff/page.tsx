'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Laptop, ClipboardCheck, Ticket, PlusCircle, RefreshCw, 
  AlertCircle, Clock, X, CheckCircle2, AlertTriangle, 
  Loader2, CheckCircle, HelpCircle,
  Camera, Lock, Monitor, Bell, LogOut,
  ThumbsUp, ThumbsDown, Star, Radio, StopCircle, ShieldAlert, Check,
  MessageSquare, Send
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// 🌟 SMART AUDIT WINDOW ENGINE
function getAuditWindowInfo(category: string = 'Laptop') {
  const today = new Date();
  const year = today.getFullYear();
  const currentMonth = today.getMonth(); 
  
  let targetMonth = currentMonth;
  const isLaptop = (category || '').toLowerCase().includes('laptop');
  
  if (!isLaptop) {
    const quarter = Math.floor(currentMonth / 3);
    targetMonth = (quarter * 3) + 2; 
  }

  const lastDayOfMonth = new Date(year, targetMonth + 1, 0);
  const lastSaturday = new Date(lastDayOfMonth);
  while (lastSaturday.getDay() !== 6) {
    lastSaturday.setDate(lastSaturday.getDate() - 1);
  }
  lastSaturday.setHours(23, 59, 59, 999);

  const windowStart = new Date(lastSaturday);
  windowStart.setDate(lastSaturday.getDate() - 4);
  windowStart.setHours(0, 0, 0, 0);

  return {
    isOpen: today >= windowStart && today <= lastSaturday,
    windowStart,
    lastSaturday,
    year,
    month: targetMonth
  };
}

const playAlertSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => console.warn("Browser requires user interaction before playing sound automatically."));
    }
  } catch (e) {}
};

const formatDuration = (start: string, end: string) => {
  if (!start || !end) return '';
  const d1 = new Date(start).getTime();
  const d2 = new Date(end).getTime();
  const diffHrs = Math.max(0, (d2 - d1) / (1000 * 60 * 60));
  
  if (diffHrs < 1) {
    const mins = Math.max(0, (d2 - d1) / (1000 * 60));
    return `${Math.floor(mins)} mins`;
  }
  if (diffHrs > 24) return `${Math.floor(diffHrs / 24)} days`;
  return `${Math.floor(diffHrs)} hrs`;
};

// 🌟 DETERMINISTIC TOPIC KEY GENERATOR
const getChannelTopic = (user: any) => {
  const code = (user?.emp_code || user?.emp_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = (user?.email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = (user?.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `vsit_rtc_${code || email || id || 'default'}`;
};

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
  const [currentUser, setCurrentUser] = useState<any>({ name: 'Staff Member', email: '', emp_id: 'STAFF' });
  const [isAuthorized, setIsAuthorized] = useState(false); 
  
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [allInspections, setAllInspections] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAssets: 0, needsInspection: 0, openTickets: 0 });

  const [reactions, setReactions] = useState<Record<string, 'like' | 'dislike'>>({});
  const [toasts, setToasts] = useState<{ id: number, title: string, message: string }[]>([]);

  const [modal, setModal] = useState<{ isOpen: boolean; type: string; targetAsset?: any }>({
    isOpen: false,
    type: '',
  });

  const [incomingRequest, setIncomingRequest] = useState<{ adminName: string; adminCode: string; channelId: string; alertId?: string } | null>(null);
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
  const activeSignalingUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showChat]);

  const formatDisplayName = (raw: string) => {
    if (!raw) return 'Staff Member';
    let s = raw.split('@')[0].split('.')[0];            
    s = s.replace(/[_-]/g, ' ');  
    return s.charAt(0).toUpperCase() + s.slice(1); 
  };

  const showToast = (title: string, message: string) => {
    playAlertSound();
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 7000); 
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const savedReactions = JSON.parse(localStorage.getItem('vsit_reactions') || '{}');
    setReactions(savedReactions);
  }, []);

  const loadRealDatabase = async () => {
    const safetyTimeoutId = setTimeout(() => setLoading(false), 4000);

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';

      if (isGuest) {
        clearTimeout(safetyTimeoutId);
        setCurrentUser({ id: 'guest-mock-uuid', email: 'demo_user@virtualstaffing.com', emp_id: 'DEMO-001', name: 'Demo Guest User' });
        setAssignedAssets([]); setAllInspections([]); setMyTickets([]); setNotifications([]);
        setStats({ totalAssets: 0, needsInspection: 0, openTickets: 0 });
        setIsAuthorized(true); setLoading(false); return; 
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
      if (!sessionStr) { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }

      let user: any = {};
      try { user = JSON.parse(sessionStr); } catch (e) { user = { name: sessionStr.split('@')[0], email: sessionStr }; }

      const cleanEmail = user.email?.toLowerCase().trim();
      if (cleanEmail === 'lakhwinder.bi@outlook.com') { clearTimeout(safetyTimeoutId); window.location.replace('/admin'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').ilike('email', cleanEmail).maybeSingle();
      if (profile) {
        if (profile.status === 'Disabled') { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }
        user.emp_id = profile.emp_code || profile.emp_id || 'STAFF';
        user.name = profile.full_name || profile.name || user.name;
        user.id = profile.id;
      } else { clearTimeout(safetyTimeoutId); window.location.replace('/'); return; }
      
      setCurrentUser(user);
      setIsAuthorized(true); 

      const [assetsRes, inspRes, ticketsRes, notifRes] = await Promise.all([
        supabase.from('assets').select('*').eq('assigned_to', user.id),
        supabase.from('inspections').select('*').eq('inspected_by', user.id).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').ilike('created_by', cleanEmail).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200)
      ]);

      if (inspRes.data) setAllInspections(inspRes.data);

      if (notifRes.data) {
        const dismissedBroadcasts = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
        const now = new Date().getTime();
        
        let activeNotifications = notifRes.data.filter(n => {
          const isUnread = n.is_read !== true; 
          const isNotDismissedLocally = !dismissedBroadcasts.includes(n.id);
          const target = String(n.target_user || '').trim().toLowerCase();
          const isGlobal = target === '' || target === 'null' || target === 'undefined' || ['all', 'broadcast', 'everyone', 'staff', 'all_staff'].includes(target);
          const isPersonal = target === String(user.id).toLowerCase() || target === cleanEmail || target === String(user.emp_id).toLowerCase();
          
          const s = ((n.title || '') + ' ' + (n.message || '')).toLowerCase();
          const isScreenShareAlert = s.includes('screen') || s.includes('remote') || s.includes('share');
          const ageInMinutes = (now - new Date(n.created_at).getTime()) / 60000;
          if (isScreenShareAlert && ageInMinutes > 5) return false;

          return isUnread && isNotDismissedLocally && (isGlobal || isPersonal);
        });

        const uniqueAlerts: any[] = [];
        const seenKeys = new Set<string>();
        activeNotifications.forEach(n => {
          const key = `${n.title}_${n.message}`.toLowerCase();
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueAlerts.push(n);
          } else {
            supabase.from('notifications').delete().eq('id', n.id).then(() => {});
          }
        });

        setNotifications(uniqueAlerts);
      }

      const compiledAssets = (assetsRes.data || []).map(asset => {
        const latestInsp = (inspRes.data || []).find(i => i.asset_id === asset.id);
        return {
          ...asset,
          live_inspection_status: latestInsp?.status || asset.inspection_status || 'Pending',
          live_inspection_date: latestInsp?.created_at || asset.last_inspection_date || null
        };
      });
      setAssignedAssets(compiledAssets);
      
      const needsInspCount = compiledAssets.filter(a => 
        ['pending', 're-inspection', 'overdue', 'not approved', 'reject'].some(status => (a.live_inspection_status || '').toLowerCase().includes(status))
      ).length;

      const tix = ticketsRes.data || [];
      setMyTickets(tix);
      const openTixCount = tix.filter(t => !['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;

      setStats({ totalAssets: compiledAssets.length, needsInspection: needsInspCount, openTickets: openTixCount });

      setupSignalingListener(user.id, user);

    } catch (err) { console.error("Data sync failure:", err); } finally { clearTimeout(safetyTimeoutId); setLoading(false); }
  };

  const setupSignalingListener = (userId: string, userObj: any) => {
    if (!userId) return;
    if (activeSignalingUserIdRef.current === userId) return;
    activeSignalingUserIdRef.current = userId;

    const sigTopic = `webrtc_signaling_${userId}`;
    const notifTopic = `staff_notif_popup_${userId}_${Date.now()}`;
    const targetChannelId = getChannelTopic(userObj);

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
        showToast("⚠️ Remote Access Requested", "IT Admin requested live screen sharing!");
      })
      .subscribe();

    const dbNotifChannel = supabase.channel(notifTopic)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `target_user=eq.${userId}` }, (payload) => {
        const newNotif = payload.new;
        const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
        if (!newNotif.is_read && !dismissed.includes(newNotif.id)) {
          setNotifications(prev => {
            if (prev.some(a => a.id === newNotif.id || (a.title === newNotif.title && a.message === newNotif.message))) return prev;
            return [newNotif, ...prev];
          });
        }
      })
      .subscribe();
  };

  // 🚀 START WEBRTC SCREEN SHARE (WITH SPLIT BROWSER/ELECTRON LOGIC)
  const startScreenShare = async (manualChannelId?: string, alertIdToDismiss?: string) => {
    const targetChannelId = manualChannelId || incomingRequest?.channelId || getChannelTopic(currentUser);
    setIsConnecting(true);

    if (alertIdToDismiss) markNotificationAsRead(alertIdToDismiss);
    if (incomingRequest) setIncomingRequest(null); 
    setChatMessages([]);

    try {
      supabase.getChannels().forEach(ch => {
        if (ch.topic === `realtime:${targetChannelId}` || ch.topic === targetChannelId) {
          supabase.removeChannel(ch);
        }
      });

      showToast("🚀 Launching Screen Picker", "Establishing secure capture channel...");

      let stream: MediaStream | null = null;
      const isElectronApp = typeof window !== 'undefined' && (window as any).electronAPI && (window as any).electronAPI.getDesktopSourceId;

      try {
        if (isElectronApp) {
          // 🛡️ STRICT ELECTRON CAPTURE (Bypasses Browser Picker)
          const sourceId = await (window as any).electronAPI.getDesktopSourceId();
          
          if (!sourceId) {
             throw new Error("Electron Preload missing or backend failed to retrieve monitor ID.");
          }

          stream = await (navigator.mediaDevices as any).getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId
              }
            }
          });
        } else {
          // 🌐 STRICT BROWSER CAPTURE
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        }
      } catch (captureError: any) {
        console.error("Capture Failed:", captureError);
        throw new Error(`[${isElectronApp ? 'App' : 'Browser'} Error] ${captureError.name || captureError.message}`);
      }

      if (!stream) throw new Error("Failed to acquire video stream from hardware.");

      streamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
        showToast("Screen Share Stopped", "You have ended live screen sharing.");
      };

      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          stopScreenSharing();
          showToast("🛑 Session Ended", "IT Admin disconnected from the session.");
        }
      };

      stream.getTracks().forEach((track: MediaStreamTrack) => peer.addTrack(track, stream));

      const sessionChannel = supabase.channel(targetChannelId, { config: { broadcast: { self: false, ack: true } } });
      channelRef.current = sessionChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_staff', payload: { candidate: event.candidate } });
        }
      };

      sessionChannel.on('broadcast', { event: 'sdp_answer_admin' }, async (payload) => {
        showToast("⚡ Handshake Complete", "Establishing secure WebRTC video stream.");
        if (peer.signalingState === 'have-local-offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          setIsConnecting(false);
          setIsStreaming(true);
          showToast("🟢 Connected", "Live WebRTC Screen Share Established!");
        }
      }).on('broadcast', { event: 'ice_candidate_admin' }, async (payload) => {
        if (peer.remoteDescription && payload.payload?.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
        }
      }).on('broadcast', { event: 'terminate_session' }, () => {
        stopScreenSharing();
        showToast("🛑 Session Ended", "IT Admin ended the remote support session.");
      }).on('broadcast', { event: 'admin_stopped_sharing' }, () => {
        stopScreenSharing(); 
        showToast("🛑 Session Ended", "IT Admin ended the remote support session.");
      })
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        setChatMessages(prev => [...prev, {
          sender: payload.payload.sender || 'Admin',
          text: payload.payload.text,
          time: payload.payload.time,
          isSelf: false
        }]);
        
        setShowChat(true);
        playAlertSound();
        showToast("💬 New IT Message", `Admin: ${payload.payload.text}`);
      })
      .on('broadcast', { event: 'admin_pointer_click' }, (payload) => {
        const { x, y } = payload.payload;
        
        setAdminPing({ x, y, id: Date.now() });
        setTimeout(() => setAdminPing(null), 2000); 

        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          (window as any).electronAPI.sendRemoteClick(x, y);
        }
      })
      .on('broadcast', { event: 'admin_keyboard_input' }, (payload) => {
         const { text } = payload.payload;
         if (typeof window !== 'undefined' && (window as any).electronAPI) {
           (window as any).electronAPI.sendRemoteType(text);
         }
      })
      .on('broadcast', { event: 'admin_system_command' }, (payload) => {
         const { command } = payload.payload;
         if (typeof window !== 'undefined' && (window as any).electronAPI) {
           (window as any).electronAPI.sendSystemCommand(command);
         }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          showToast("📡 Subscribed to stream channel", "Sending SDP Offer to Admin...");
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await sessionChannel.send({ type: 'broadcast', event: 'sdp_offer_staff', payload: { sdp: offer } });
          showToast("📤 Offer Sent", "Transmitted SDP Offer to Admin Commander!");
        }
      });

    } catch (err: any) {
      showToast("Cancelled", `Failure: ${err.message || 'Permission denied'}`);
      setIsConnecting(false);
      setIsStreaming(false);
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
    setShowChat(false);
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !channelRef.current) return;
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages(prev => [...prev, {
      sender: currentUser.name || 'Me',
      text: chatInput,
      time: timeString,
      isSelf: true
    }]);

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: {
        sender: currentUser.name || currentUser.email,
        text: chatInput,
        time: timeString
      }
    });

    setChatInput('');
  };

  useEffect(() => {
    loadRealDatabase();
    
    return () => {
      activeSignalingUserIdRef.current = null;
      supabase.getChannels().forEach(ch => {
        if (ch.topic.includes('webrtc_signaling_') || ch.topic.includes('staff_notif_popup_') || ch.topic.includes('vsit_rtc_')) {
          supabase.removeChannel(ch);
        }
      });
      stopScreenSharing();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.id === 'guest-mock-uuid' || !currentUser.id) return;

    const realtimeChannel = supabase.channel('staff-dashboard-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => { 
        if (payload.new.created_by?.toLowerCase() === currentUser.email?.toLowerCase()) showToast("Ticket Updated", `Your ticket status was changed to: ${payload.new.status}`);
        loadRealDatabase(); 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => { 
        if (payload.new.assigned_to === currentUser.id) showToast("Hardware Update", `IT has updated your device details.`);
        loadRealDatabase(); 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inspections' }, (payload) => { 
        if (payload.new.inspected_by === currentUser.id) {
          if (payload.new.status === 'Return Approved') showToast("Handover Approved", "IT has successfully received and unassigned your device.");
          if (payload.new.status === 'Return Rejected') showToast("Return Rejected", "IT rejected your device return. Please check dashboard for details.");
        }
        loadRealDatabase(); 
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => { 
        const target = String(payload.new.target_user || '').trim().toLowerCase();
        const isGlobal = target === '' || target === 'null' || target === 'undefined' || ['all', 'broadcast', 'everyone', 'staff'].includes(target);
        const isPersonal = target === String(currentUser.id).toLowerCase() || target === currentUser.email?.toLowerCase() || target === String(currentUser.emp_id).toLowerCase();
        if (isGlobal || isPersonal) {
            showToast(payload.new.title || "New System Alert", payload.new.message || "You have a new message from Admin.");
            if ("Notification" in window && Notification.permission === "granted") new Notification(payload.new.title || "New System Alert", { body: payload.new.message, icon: "/favicon.ico" });
        }
        loadRealDatabase(); 
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(realtimeChannel); 
    };
  }, [currentUser.id]);

  const markNotificationAsRead = async (notifId: string, targetUser?: string | null) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    if (incomingRequest?.alertId === notifId) setIncomingRequest(null);

    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
      if (!dismissed.includes(notifId)) { 
        dismissed.push(notifId); 
        localStorage.setItem('dismissed_broadcasts', JSON.stringify(dismissed)); 
      }
    } catch (e) {}

    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
      await supabase.from('notifications').delete().eq('id', notifId);
    } catch (e) {}
    
    showToast("Alert Dismissed", "Notification permanently cleared.");
  };

  const toggleReaction = (notifId: string, type: 'like' | 'dislike') => {
    setReactions(prev => {
      const newReactions = { ...prev };
      if (newReactions[notifId] === type) delete newReactions[notifId]; else newReactions[notifId] = type;
      localStorage.setItem('vsit_reactions', JSON.stringify(newReactions));
      return newReactions;
    });
  };

  const handleRateTicket = async (ticketId: string, rating: number) => {
    try {
      await supabase.from('tickets').update({ rating }).eq('id', ticketId);
      setMyTickets(prev => prev.map(t => t.id === ticketId ? { ...t, rating } : t));
      showToast("Rating Submitted", "Thank you for rating our IT support!");
    } catch (e) {
      console.error(e);
    }
  };
  
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'open' || s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'in progress') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getAssetAuditState = (asset: any) => {
    const status = (asset.live_inspection_status || '').toLowerCase();
    const auditWindow = getAuditWindowInfo(asset.category);
    
    if (asset.status?.toLowerCase().includes('return') || status.includes('return pending')) {
      return { disabled: true, text: "Return Pending", classes: "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" };
    }

    if (status === 'rejected' || status === 'fail') {
      return { disabled: false, text: "Re-Audit Required", classes: "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm animate-pulse" };
    }
    if (status === 're-inspection') {
      return { disabled: false, text: "Re-Inspection Required", classes: "bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-sm animate-pulse" };
    }

    const hasAudited = allInspections.some(insp => {
       const d = new Date(insp.created_at);
       return insp.asset_id === asset.id && 
              d.getFullYear() === auditWindow.year && 
              d.getMonth() === auditWindow.month &&
              !insp.notes?.includes('[RETURN REQUEST]') &&
              !insp.status?.toLowerCase().includes('return') &&
              (insp.status === 'Approved' || insp.status === 'Pending Review' || insp.status === 'Pending');
    });

    if (hasAudited) return { disabled: true, text: "Audited This Cycle", classes: "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed shadow-none" };
    if (!auditWindow.isOpen) return { disabled: true, text: `Opens ${auditWindow.windowStart.toLocaleDateString()}`, classes: "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200" };
    
    return { disabled: false, text: "Audit Device", classes: "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-sm" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Connecting real-time database...</p>
      </div>
    );
  }

  if (!isAuthorized) return null; 

  const requiresGlobalReinspection = assignedAssets.some(a => {
    const s = (a.live_inspection_status || '').toLowerCase();
    if (s.includes('return')) return false;
    return ['re-inspection', 'not approved', 'reject'].some(val => s.includes(val));
  });

  const isGlobalAuditOpen = assignedAssets.some(a => getAuditWindowInfo(a.category).isOpen) || requiresGlobalReinspection;

  const visibleNotifications = notifications.filter(notif => {
    const s = ((notif.title || '') + ' ' + (notif.message || '')).toLowerCase();
    const isScreenShare = s.includes('screen') || s.includes('remote') || s.includes('share');
    if (isScreenShare && (isStreaming || isConnecting)) return false; 
    return true;
  });

  const hasScreenShareAlert = visibleNotifications.some(n => {
    const s = (n.title || '').toLowerCase() + ' ' + (n.message || '').toLowerCase();
    return s.includes('screen') || s.includes('remote') || s.includes('share');
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased relative overflow-x-hidden">

      {isStreaming && (
        <>
          {adminPing && (
            <div 
              className="fixed z-[99999] pointer-events-none flex items-center justify-center"
              style={{ left: `${adminPing.x}vw`, top: `${adminPing.y}vh`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="absolute w-12 h-12 bg-rose-500/30 rounded-full animate-ping" />
              <div className="relative w-4 h-4 bg-rose-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(225,29,72,1)]" />
            </div>
          )}

          <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
            
            {showChat && (
              <div className="w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4">
                <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={14} className="text-orange-500" /> Live Support Chat
                  </span>
                  <button onClick={() => setShowChat(false)} className="hover:text-rose-400 transition-colors cursor-pointer"><X size={16}/></button>
                </div>
                
                <div className="h-56 p-3 overflow-y-auto flex flex-col gap-2.5 bg-slate-50 custom-scrollbar">
                  {chatMessages.length === 0 ? (
                    <div className="m-auto text-[11px] font-bold text-slate-400 text-center">No messages yet.</div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={`max-w-[85%] text-[11px] font-medium p-2.5 shadow-sm ${msg.isSelf ? 'bg-orange-600 text-white self-end rounded-2xl rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 self-start rounded-2xl rounded-bl-none'}`}>
                        <div className={`font-bold text-[9px] mb-1 ${msg.isSelf ? 'text-orange-200' : 'text-slate-400'}`}>{msg.sender}</div>
                        {msg.text}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={sendChatMessage} className="p-2 bg-white border-t border-slate-100 flex gap-2">
                  <input 
                    value={chatInput} 
                    onChange={e=>setChatInput(e.target.value)} 
                    placeholder="Type a reply to Admin..." 
                    className="flex-1 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-orange-500 transition-colors" 
                  />
                  <button type="submit" disabled={!chatInput.trim()} className="p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 cursor-pointer transition-colors">
                    <Send size={14}/>
                  </button>
                </form>
              </div>
            )}

            <div className="bg-slate-900 border-2 border-orange-500 text-white p-3 sm:p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6 max-w-md w-full pointer-events-auto">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                <div>
                  <p className="text-xs font-black text-orange-400 uppercase tracking-wider">Screen Share Active</p>
                  <p className="text-[10px] text-zinc-300">IT Support is viewing your workspace.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowChat(!showChat)} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer relative ${showChat ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}`}>
                  <MessageSquare size={14} /> 
                  <span className="hidden sm:inline">Chat</span>
                  {chatMessages.length > 0 && !showChat && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full animate-pulse border-2 border-slate-900" />}
                </button>
                <button onClick={stopScreenSharing} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer">
                  <StopCircle size={15} /> <span className="hidden sm:inline">Stop Sharing</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ⚠️ INTERACTIVE INCOMING SCREEN SHARE REQUEST POPUP MODAL */}
      {incomingRequest && !isStreaming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 border-2 border-orange-500">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Monitor size={32} />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">Live IT Support Access Requested</h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                <strong className="text-slate-900 font-bold">{incomingRequest.adminName}</strong> ({incomingRequest.adminCode}) is requesting permission to view your screen for live troubleshooting.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-800 flex items-center gap-3">
              <ShieldAlert size={22} className="shrink-0 text-orange-600" />
              <span>When prompted by your browser, select <strong className="underline">"Entire Screen"</strong> or your active window to establish the connection.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => {
                  if (incomingRequest.alertId) markNotificationAsRead(incomingRequest.alertId);
                  else setIncomingRequest(null);
                }} 
                disabled={isConnecting} 
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
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

      <div className="max-w-7xl mx-auto space-y-8 mt-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Welcome back, {formatDisplayName(currentUser.name)} 👋</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm font-semibold text-slate-500">
              <span className="text-purple-700 font-bold uppercase tracking-wider px-2.5 py-0.5 bg-purple-50 rounded-md border border-purple-200/60">ID: {currentUser.emp_id}</span>
              <span>{currentUser.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={loadRealDatabase} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-200 cursor-pointer"><RefreshCw size={14}/> Sync Feeds</button>
          </div>
        </div>

        {visibleNotifications.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-top-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Bell size={14} className="text-amber-500 animate-bounce" /> Action Alerts ({visibleNotifications.length})</h3>
            <div className="grid grid-cols-1 gap-3">
              {visibleNotifications.map(notif => {
                const s = (notif.title || '').toLowerCase();
                const isReject = s.includes('reject'); const isReInspect = s.includes('re-inspect') || s.includes('re-audit');
                const isApprove = s.includes('approve'); const isReplacement = s.includes('replace') || s.includes('new asset'); 
                const isBroadcast = s.includes('broadcast') || s.includes('announcement');
                const isScreenShare = s.includes('screen') || s.includes('remote') || (notif.message || '').toLowerCase().includes('screen');

                let bgColor = 'bg-purple-50 border-purple-200'; let iconColor = 'text-purple-600';
                if (isScreenShare) { bgColor = 'bg-orange-50 border-orange-300 shadow-md ring-1 ring-orange-400/30'; iconColor = 'text-orange-600'; }
                else if (isReplacement) { bgColor = 'bg-purple-50 border-purple-200'; iconColor = 'text-purple-600'; } 
                else if (isReject) { bgColor = 'bg-rose-50 border-rose-200'; iconColor = 'text-rose-600'; } 
                else if (isReInspect) { bgColor = 'bg-amber-50 border-amber-200'; iconColor = 'text-amber-600'; } 
                else if (isApprove) { bgColor = 'bg-emerald-50 border-emerald-200'; iconColor = 'text-emerald-600'; }

                return (
                  <div key={notif.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${bgColor}`}>
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`p-2 bg-white rounded-lg shadow-xs shrink-0 ${iconColor}`}>{isScreenShare ? <Monitor size={20} className="animate-bounce" /> : isApprove || isReplacement ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div>
                      <div><h4 className={`font-bold text-sm ${iconColor}`}>{notif.title || 'System Alert'}</h4><p className="text-xs font-medium text-slate-700 mt-0.5">{notif.message || 'Check your dashboard.'}</p></div>
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto mt-3 sm:mt-0">
                      {isBroadcast && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
                          <button onClick={() => toggleReaction(notif.id, 'like')} className={`p-1.5 rounded-md transition-colors ${reactions[notif.id] === 'like' ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title="Acknowledge / Like"><ThumbsUp size={14} className={reactions[notif.id] === 'like' ? "fill-blue-600 text-purple-600" : ""} /></button>
                          <button onClick={() => toggleReaction(notif.id, 'dislike')} className={`p-1.5 rounded-md transition-colors ${reactions[notif.id] === 'dislike' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`} title="Dislike"><ThumbsDown size={14} className={reactions[notif.id] === 'dislike' ? "fill-rose-600 text-rose-600" : ""} /></button>
                        </div>
                      )}
                      
                      {isScreenShare && !isStreaming && (
                        <button 
                          onClick={() => startScreenShare(getChannelTopic(currentUser), notif.id)} 
                          disabled={isConnecting}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer animate-pulse active:scale-95 disabled:opacity-50"
                        >
                          {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                          <span>Accept & Share</span>
                        </button>
                      )}

                      <button onClick={() => markNotificationAsRead(notif.id, notif.target_user)} className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer shadow-xs">Dismiss</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: 'Raise Ticket', desc: 'IT failure', icon: Ticket, color: 'text-purple-600 bg-purple-50 border-purple-100', type: 'TICKET', isActionDisabled: false, badge: null },
            { name: 'Device Audit', desc: requiresGlobalReinspection ? 'Action Required' : (isGlobalAuditOpen ? 'Submit inspection' : 'Window Closed'), icon: ClipboardCheck, color: requiresGlobalReinspection ? 'text-rose-600 bg-rose-50 border-rose-200 animate-pulse' : (isGlobalAuditOpen ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-100 border-slate-200'), type: 'INSPECTION', isActionDisabled: !isGlobalAuditOpen, badge: null },
            { name: 'Request Gear', desc: 'New equipment', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', type: 'REQUEST', isActionDisabled: false, badge: null },
            { 
              name: 'Team Screen', 
              desc: isStreaming ? '🟢 Screen Live Active' : (hasScreenShareAlert ? '🚨 Live Request' : 'Remote access'), 
              icon: Monitor, 
              color: isStreaming ? 'text-emerald-600 bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400 animate-pulse' : (hasScreenShareAlert ? 'text-rose-600 bg-rose-50 border-rose-300 ring-2 ring-rose-400 animate-bounce' : 'text-orange-600 bg-orange-50 border-indigo-100'), 
              type: 'ROUTE', 
              path: '/staff/dashboard/remote', 
              isActionDisabled: false,
              badge: isStreaming ? '🟢 LIVE' : (hasScreenShareAlert ? '🚨 REQUEST' : null)
            },
          ].map((item) => (
              <button 
                key={item.name} 
                onClick={() => { if (item.isActionDisabled) return; if (item.path) { router.push(item.path); } else { setModal({ isOpen: true, type: item.type, targetAsset: assignedAssets[0] }); } }} 
                disabled={item.isActionDisabled}
                className={`relative bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left flex flex-col sm:flex-row items-start gap-3 lg:gap-4 group transition-all ${item.isActionDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 hover:shadow-md cursor-pointer'}`}
              >
                {item.badge && (
                  <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-md ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-rose-600 animate-bounce'}`}>
                    {item.badge}
                  </span>
                )}

                <div className={`p-3 rounded-xl border shrink-0 transition-transform ${item.isActionDisabled ? '' : 'group-hover:scale-105'} ${item.color}`}>{item.isActionDisabled ? <Lock size={20} /> : <item.icon size={20} />}</div>
                <div><h3 className={`font-bold text-sm leading-tight ${item.isActionDisabled ? 'text-slate-500' : 'text-slate-900 group-hover:text-purple-600'} transition-colors`}>{item.name}</h3><p className="text-[10px] lg:text-xs font-medium text-slate-500 mt-1 line-clamp-2">{item.desc}</p></div>
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Hardware</p><h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-1">{stats.totalAssets}</h2></div>
            <div className="p-4 rounded-2xl bg-purple-50 text-purple-600 font-bold"><Laptop size={28} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Action Required</p><h2 className="text-3xl sm:text-4xl font-black text-amber-600 mt-1">{stats.needsInspection}</h2></div>
            <div className="p-4 rounded-2xl bg-amber-50 text-amber-600"><AlertCircle size={28} /></div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Tickets</p><h2 className="text-3xl sm:text-4xl font-black text-orange-600 mt-1">{stats.openTickets}</h2></div>
            <div className="p-4 rounded-2xl bg-orange-50 text-orange-600"><Ticket size={28} /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800">
                <Laptop className="text-purple-600 shrink-0" size={18}/> My Hardware Units
              </div>
              <span className="text-xs font-bold text-slate-400">{assignedAssets.length} Total</span>
            </div>
            
            {assignedAssets.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium text-xs">No active assets linked to your account.</div>
            ) : (
              <div className="space-y-4">
                {assignedAssets.map(asset => {
                  const btnState = getAssetAuditState(asset);
                  const isReInspect = (asset.live_inspection_status || '').toLowerCase().includes('re-inspection');
                  const isReturnPending = (asset.status || '').toLowerCase().includes('return');
                  const isReturnRejected = (asset.live_inspection_status || '').toLowerCase() === 'return rejected';

                  return (
                    <div key={asset.id} className={`bg-white p-5 rounded-2xl border ${isReInspect || isReturnRejected ? 'border-rose-200/80 shadow-sm' : 'border-slate-200/80 shadow-sm'} hover:border-slate-300 hover:shadow-md transition-all flex flex-col gap-4`}>
                      
                      <div className="flex justify-between items-start gap-3">
                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                          {asset.name || asset.asset_name || asset.model || 'Generic Device'}
                        </h4>
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border shrink-0 ${
                          isReturnRejected ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          isReturnPending ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          isReInspect ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {isReturnRejected ? 'Return Rejected' : isReturnPending ? 'Pending Return' : (asset.live_inspection_status || 'Pending')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Tag ID</span>
                          <span className="font-mono text-xs font-semibold text-slate-700">{asset.asset_tag || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Serial S/N</span>
                          <span className="font-mono text-xs font-semibold text-slate-700 break-all">{asset.serial_number || asset.serial || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Updated</span>
                          <span className="text-xs font-semibold text-slate-700">{asset.live_inspection_date ? new Date(asset.live_inspection_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Category</span>
                          <span className="text-xs font-semibold text-slate-700">{asset.category || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 pt-1 justify-end">
                        <button 
                          disabled={isReturnPending && !isReturnRejected}
                          onClick={() => setModal({ isOpen: true, type: 'RETURN', targetAsset: asset })}
                          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all border shadow-sm ${
                            (isReturnPending && !isReturnRejected)
                              ? 'bg-orange-100 text-orange-400 border-orange-100 cursor-not-allowed opacity-60'
                              : 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50 cursor-pointer'
                          }`}
                        >
                          Return
                        </button>

                        <button 
                          disabled={isReturnPending && !isReturnRejected}
                          onClick={() => setModal({ isOpen: true, type: 'REPLACEMENT', targetAsset: asset })}
                          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all border shadow-sm ${
                            (isReturnPending && !isReturnRejected)
                              ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50 cursor-pointer'
                          }`}
                        >
                          Replace
                        </button>

                        <button 
                          disabled={btnState.disabled}
                          onClick={() => setModal({ isOpen: true, type: 'INSPECTION', targetAsset: asset })} 
                          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm ${btnState.classes}`}
                        >
                          {btnState.disabled && !btnState.text.includes('Opens') && <CheckCircle size={14} />}
                          {btnState.disabled && btnState.text.includes('Opens') && <Lock size={14} />}
                          <span>{btnState.text}</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider text-slate-800"><Ticket className="text-orange-600 shrink-0" size={18}/> My Service Tickets</div>
              <span className="text-xs font-bold text-slate-400">{myTickets.length} Raised</span>
            </div>
            
            {myTickets.length === 0 ? (
              <div className="py-10 text-center text-slate-400 font-medium text-xs">No service requests submitted yet.</div>
            ) : (
              <div className="space-y-3 max-h-150 overflow-y-auto pr-1 custom-scrollbar">
                {myTickets.map(tix => {
                  const isResolved = ['resolved', 'closed'].includes((tix.status || '').toLowerCase());
                  
                  return (
                    <div key={tix.id} className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-colors bg-white space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900 leading-snug">{tix.title || tix.subject}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shrink-0 ${getStatusBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                      </div>
                      
                      <p className="text-xs text-slate-600 font-normal">{tix.description || tix.note}</p>

                      {(tix.admin_remarks || tix.admin_notes || tix.resolution_notes) && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700">
                          <strong className="text-slate-900 block mb-1">Admin Response:</strong>
                          {tix.admin_remarks || tix.admin_notes || tix.resolution_notes}
                        </div>
                      )}

                      {isResolved && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                          {tix.updated_at && (
                              <div className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                                <Clock size={12}/> Resolved in: {formatDuration(tix.created_at, tix.updated_at)}
                              </div>
                          )}

                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Rate Support:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                disabled={!!tix.rating}
                                onClick={() => handleRateTicket(tix.id, star)}
                                className={`transition-all ${tix.rating ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                              >
                                <Star size={14} className={star <= (tix.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-medium border-t border-slate-50 mt-2">
                        <span>Category: <strong className="text-slate-600 font-semibold">{tix.category || 'General'}</strong></span>
                        <span>{tix.created_at ? new Date(tix.created_at).toLocaleDateString() : 'Just now'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {modal.isOpen && (
        <LiveDatabaseModal type={modal.type} asset={modal.targetAsset} user={currentUser} setAssignedAssets={setAssignedAssets} onClose={() => { setModal({ isOpen: false, type: '' }); loadRealDatabase(); }} />
      )}
    </div>
  );
}

function LiveDatabaseModal({ type, asset, user, setAssignedAssets, onClose }: any) {
  const needsLock = type === 'INSPECTION' || type === 'REPLACEMENT' || type === 'RETURN';
  const [isUnlocked, setIsUnlocked] = useState(!needsLock);
  const [serialInput, setSerialInput] = useState('');
  const [lockError, setLockError] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formCategory, setFormCategory] = useState(type === 'REQUEST' ? 'Laptop' : 'Hardware');
  const [formCondition, setFormCondition] = useState('Pristine / Flawless');
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  const handleAttemptUnlock = () => {
    if (!asset) { alert("No hardware assigned to test against!"); return; }
    if (user.id === 'guest-mock-uuid') { setLockError(false); setIsUnlocked(true); return; }
    const typed = serialInput.trim().toLowerCase();
    if (typed === (asset.serial_number||'').toLowerCase() || typed === (asset.asset_tag||'').toLowerCase()) { setLockError(false); setIsUnlocked(true); } else setLockError(true);
  };

  const generateMobileHandoff = () => {
    const baseUrl = window.location.origin;
    const cat = asset?.category || formCategory;
    const finalNotes = type === 'RETURN' ? `[RETURN REQUEST] ${formText}` : formText;
    const url = `${baseUrl}/mobile-audit?assetId=${asset.id}&empCode=${user.emp_id}&name=${encodeURIComponent(user.name)}&cat=${encodeURIComponent(cat)}&cond=${encodeURIComponent(formCondition)}&notes=${encodeURIComponent(finalNotes)}&auditType=${type}`;
    setQrUrl(url);
    setShowQR(true);
  };

  const handleLivePostgresSubmit = async () => {
    if (type === 'INSPECTION' || type === 'RETURN') {
      if (type === 'RETURN') {
        try {
          await supabase.from('assets').update({ status: 'Pending Return' }).eq('id', asset.id);
          if (setAssignedAssets) {
            setAssignedAssets((prev: any[]) => prev.map(a => a.id === asset.id ? { ...a, status: 'Pending Return' } : a));
          }
        } catch(e) { console.warn("Failed to mark as Pending Return", e); }
      }
      generateMobileHandoff();
      return;
    }

    setIsTransmitting(true);
    if (user.id === 'guest-mock-uuid') { setTimeout(() => { setIsTransmitting(false); setSuccessDone(true); setTimeout(() => onClose(), 1200); }, 800); return; }

    let submitError = null; 
    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const finalEmp = user.emp_id || 'STAFF';
      let humanName = user.name || cleanEmail.split('@')[0];
      humanName = humanName.split('.')[0].replace(/[_-]/g, ' ');
      humanName = humanName.charAt(0).toUpperCase() + humanName.slice(1);

      if (type === 'TICKET') {
        const { error } = await supabase.from('tickets').insert({ title: formTitle || 'IT Support Ticket', category: formCategory, description: formText || 'No details given', status: 'Open', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = error;
      } else if (type === 'REQUEST') {
        const { error } = await supabase.from('tickets').insert({ title: `Asset Request: ${formCategory}`, category: `Request: ${formCategory}`, description: formText || `Staff requested ${formCategory}`, status: 'Pending', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = error;
      } else if (type === 'REPLACEMENT') {
        const { error: ticketError } = await supabase.from('tickets').insert({ title: `Replacement Request: ${asset.name}`, category: 'Asset Replacement', description: `Tag ID: ${asset.asset_tag} | S/N: ${asset.serial_number}\n\nReason: ${formText}`, status: 'Pending', created_by: cleanEmail, emp_code: finalEmp, staff_name: humanName });
        submitError = ticketError;
        if (!ticketError) await supabase.from('assets').update({ status: 'Replacement Requested' }).eq('id', asset.id);
      }
      if (submitError) throw submitError;
      setSuccessDone(true); setTimeout(() => onClose(), 1200);
    } catch (e: any) { alert(`Database Error: ${e.message || JSON.stringify(e)}`); } finally { setIsTransmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl font-bold ${type === 'RETURN' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>{type === 'RETURN' ? <LogOut size={20} /> : <Ticket size={20}/>}</div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">{type === 'REPLACEMENT' ? 'Assets Replacement' : type === 'RETURN' ? 'Asset Return Request' : 'Portal Submission'}</h3>
              {type !== 'REPLACEMENT' && type !== 'RETURN' && <p className="text-xs text-slate-500 font-medium">{type}</p>}
              {type === 'RETURN' && <p className="text-xs text-slate-500 font-medium">Initiate IT Handover</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"><X size={18}/></button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
          {successDone ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 size={48} className="text-emerald-600 mx-auto animate-bounce"/>
              <h4 className="text-xl font-bold text-slate-900">Database Updated!</h4>
            </div>
          ) : showQR ? (
            <div className="py-6 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest">Mobile Device Handoff</h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">Scan this code with your phone camera to take certified watermark photos of the asset.</p>
              </div>
              <div className="p-4 bg-white border-2 border-slate-200 rounded-3xl inline-block shadow-lg mx-auto">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Scan to Audit" className="w-48 h-48 rounded-xl" />
              </div>
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-left">
                <h5 className="text-[10px] font-black uppercase text-purple-800 tracking-widest mb-2 flex items-center gap-2"><Camera size={14}/> Photo Requirements</h5>
                <ul className="text-xs text-purple-900 font-medium space-y-1.5 ml-1">
                  {(asset?.category || '').toLowerCase().includes('laptop') ? (
                    <><li>✅ Screen & Keypad view</li><li>✅ Top and Bottom (with Tag)</li><li>✅ Left and Right Side Ports</li></>
                  ) : (
                    <><li>✅ Clear Front / Top View</li><li>✅ Bottom View (showing Asset Tag)</li></>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm font-medium">
              {needsLock && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
                  <p className="text-xs font-bold text-purple-900 flex items-center gap-2">🔒 Security Verification Required</p>
                  <div className="flex gap-2">
                    <input disabled={isUnlocked} value={serialInput} onChange={e=>setSerialInput(e.target.value)} placeholder={user.id === 'guest-mock-uuid' ? 'Type anything for Guest mode...' : 'Type exact Tag ID or S/N...'} className="flex-1 p-3 bg-white rounded-xl border border-purple-200 text-xs font-bold outline-none"/>
                    {!isUnlocked && <button onClick={handleAttemptUnlock} className="px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors">Verify</button>}
                  </div>
                  {lockError && <p className="text-[11px] text-rose-600 font-bold">Incorrect device code.</p>}
                </div>
              )}

              {type === 'TICKET' && (
                <>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Issue Subject</label><input value={formTitle} onChange={e=>setFormTitle(e.target.value)} placeholder="E.g. Monitor display flickering" className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:border-purple-600 text-sm font-semibold"/></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label><select value={formCategory} onChange={e=>setFormCategory(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 font-semibold"><option>Hardware</option><option>Software</option><option>Network</option></select></div>
                </>
              )}

              {(type === 'INSPECTION' || type === 'RETURN') && isUnlocked && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Asset Condition</label>
                  <select value={formCondition} onChange={e=>setFormCondition(e.target.value)} className="w-full p-3.5 rounded-xl border border-slate-200 font-semibold mb-4 outline-none focus:border-purple-600">
                    <option>Pristine / Flawless</option><option>Good / Minor Scratches</option><option>Poor / Damaged (Requires Fix)</option><option>Non-Functional / Dead</option>
                  </select>
                </div>
              )}

              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{type === 'INSPECTION' ? 'Audit Notes' : type === 'RETURN' ? 'Return Reason & Notes' : 'Detailed Explanation'}</label><textarea rows={4} value={formText} onChange={e=>setFormText(e.target.value)} placeholder={type === 'INSPECTION' ? "Note any missing keys, screen cracks, or damage..." : type === 'RETURN' ? "Provide reason for returning..." : "Describe what happened..."} className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:border-purple-600 text-sm resize-none"/></div>
            </div>
          )}
        </div>

        {!successDone && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            {showQR ? (
              <button onClick={onClose} className="w-full py-3.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-sm transition-colors">Close Portal (Awaiting Mobile Scan)</button>
            ) : (
              <>
                <button onClick={onClose} className="px-5 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors">Cancel</button>
                <button disabled={isTransmitting || (needsLock && !isUnlocked)} onClick={handleLivePostgresSubmit} className={`px-7 py-3 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest transition-colors ${type === 'RETURN' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                  {isTransmitting && <Loader2 size={14} className="animate-spin"/>} {type === 'INSPECTION' || type === 'RETURN' ? 'Generate Camera QR' : 'Transmit'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}