'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Monitor, ShieldAlert, Check, X, Loader2, StopCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffRemoteBroadcaster({ staffId, staffName }: { staffId: string; staffName: string }) {
  const [incomingRequest, setIncomingRequest] = useState<{ adminName: string; adminCode: string; channelId: string } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!staffId) return;

    // Enforce light glass theme locally if needed
    document.documentElement.classList.remove('dark'); 

    // 1. Listen for WebRTC Screen Share Requests from IT Admin
    const signalingChannel = supabase.channel(`webrtc_signaling_${staffId}`)
      .on('broadcast', { event: 'request_screen_share' }, (payload) => {
        setIncomingRequest({
          adminName: payload.payload.adminName || 'IT Administrator',
          adminCode: payload.payload.adminCode || 'EMP-ADMIN',
          channelId: payload.payload.channelId
        });
        toast("⚠️ IT Admin requested live screen sharing!", { icon: '📡', duration: 6000 });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(signalingChannel);
      stopSharing();
    };
  }, [staffId]);

  // 🌟 HELPER: Translates Admin Web Clicks -> Physical OS Control via preload.js
  const executeAdminCommand = (cmd: any) => {
    // Check if running inside Electron and the API is available
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        if (cmd.type === 'mousemove') {
          (window as any).electronAPI.sendMouseMove(cmd.xPercent, cmd.yPercent);
        } 
        else if (cmd.type === 'mousedown') {
          (window as any).electronAPI.sendMouseDown(cmd.button);
        } 
        else if (cmd.type === 'mouseup') {
          (window as any).electronAPI.sendMouseUp(cmd.button);
        } 
        else if (cmd.type === 'keydown') {
          (window as any).electronAPI.sendKeyDown(cmd.key);
        } 
        else if (cmd.type === 'keyup') {
          (window as any).electronAPI.sendKeyUp(cmd.key);
        } 
        else if (cmd.type === 'scroll') {
          (window as any).electronAPI.sendScroll(cmd.deltaY);
        }
        else if (cmd.type === 'refresh') {
          (window as any).electronAPI.sendSystemCommand('refresh_app');
        }
      } catch (e) {
        console.error("OS execution failed:", e);
      }
    } else {
      console.warn("Control blocked: User is in a standard web browser, not the Electron App.");
    }
  };

  const startScreenShare = async () => {
    if (!incomingRequest) return;
    setIsConnecting(true);

    try {
      // 🌟 Using Electron's desktopCapturer bypass (handled in main process)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false 
      });

      streamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
        toast.error("Screen sharing stopped by user.");
      };

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
      });
      peerRef.current = peer;

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          stopSharing();
          toast.error("IT Admin disconnected from the session.");
        }
      };

      // 🌟 LISTEN FOR ADMIN'S WEBRTC DATA CHANNEL (For Zero-Latency Control & Heartbeats)
      peer.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        receiveChannel.onmessage = (e) => {
          if (typeof e.data === 'string') {
            try {
              const data = JSON.parse(e.data);
              
              // 1. Pass OS Control commands
              if (['mousemove', 'mousedown', 'mouseup', 'keydown', 'keyup', 'scroll', 'refresh'].includes(data.type)) {
                executeAdminCommand(data);
              } 
              // 2. Bounce back heartbeat to keep firewall open
              else if (data.type === 'ping') {
                receiveChannel.send(JSON.stringify({ type: 'pong' }));
              }
            } catch (err) {
              console.error("Data channel parse error:", err);
            }
          }
        };
      };

      // Add local screen video track to peer connection
      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      const sessionChannel = supabase.channel(incomingRequest.channelId);
      channelRef.current = sessionChannel;

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sessionChannel.send({ type: 'broadcast', event: 'ice_candidate_staff', payload: { candidate: event.candidate } });
        }
      };

      sessionChannel.on('broadcast', { event: 'sdp_answer_admin' }, async (payload) => {
        if (peer.signalingState === 'have-local-offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          setIsConnecting(false);
          setIsStreaming(true);
          setIncomingRequest(null);
          toast.success("🟢 Live WebRTC Screen Share Established!");
          
          // Auto-Accept remote control for enterprise environments
          sessionChannel.send({ type: 'broadcast', event: 'control_accepted', payload: {} });
        }
      }).on('broadcast', { event: 'ice_candidate_admin' }, async (payload) => {
        if (peer.remoteDescription && payload.payload.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(() => {});
        }
      }).on('broadcast', { event: 'terminate_session' }, () => {
        stopSharing();
        toast("🛑 IT Admin ended the remote session.", { icon: 'ℹ️' });
      }).on('broadcast', { event: 'admin_stopped_sharing' }, () => {
        stopSharing(); 
        toast.error("🛑 IT Admin ended the remote support session.");
      })
      // 🌟 SUPABASE FALLBACK CONTROL LISTENER (If P2P Network is blocked)
      .on('broadcast', { event: 'control_command' }, (payload) => {
        executeAdminCommand(payload.payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          sessionChannel.send({ type: 'broadcast', event: 'sdp_offer_staff', payload: { sdp: offer } });
        }
      });

    } catch (err: any) {
      toast.error(`Screen share cancelled or failed: ${err.message || 'Permission denied'}`);
      setIsConnecting(false);
    }
  };

  const stopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
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

  return (
    <>
      {/* 🟢 ACTIVE STREAMING MATTE GLASS BADGE */}
      {isStreaming && (
        <div className="fixed bottom-6 right-6 z-9999 bg-white/80 backdrop-blur-2xl border border-white/80 text-slate-800 p-4 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] flex items-center gap-4 animate-in slide-in-from-bottom-6">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)] shrink-0" />
            <div>
              <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Screen Share Active</p>
              <p className="text-[11px] font-semibold text-slate-500">IT Support is actively monitoring your workspace.</p>
            </div>
          </div>
          <button onClick={stopSharing} className="px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-2">
            <StopCircle size={15} /> <span>Stop Sharing</span>
          </button>
        </div>
      )}

      {/* ⚠️ INCOMING SCREEN SHARE MAC-OS REQUEST MODAL */}
      {incomingRequest && !isStreaming && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-9999 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white/90 backdrop-blur-3xl border border-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <Monitor size={32} />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Live IT Support Access</h3>
              <p className="text-sm font-medium text-slate-500">
                <strong className="text-slate-800">{incomingRequest.adminName}</strong> ({incomingRequest.adminCode}) is requesting permission to view and control your screen.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-start gap-3 shadow-sm">
              <ShieldAlert size={20} className="shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed">When prompted by your system, please select <strong className="underline decoration-amber-400">"Entire Screen"</strong> to allow full remote control access.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIncomingRequest(null)} 
                disabled={isConnecting} 
                className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
              >
                Decline
              </button>
              <button 
                onClick={startScreenShare} 
                disabled={isConnecting} 
                className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(249,115,22,0.3)] transition-all cursor-pointer"
              >
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isConnecting ? 'Connecting...' : 'Accept & Share'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}