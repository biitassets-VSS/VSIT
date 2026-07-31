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

  const startScreenShare = async () => {
    if (!incomingRequest) return;
    setIsConnecting(true);

    try {
      // 🌟 THE FIX: Simplified constraints to prevent Electron hardware/driver panics
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false // Strict false to prevent "NotReadableError"
      });

      streamRef.current = stream;

      // When user clicks the browser's native "Stop Sharing" floating bar
      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
        toast.error("Screen sharing stopped by user.");
      };

      // 3. Initialize WebRTC Peer Connection with Google STUN servers
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

      // Add local screen video track to peer connection
      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      // 4. Connect to Supabase Signaling Channel for ICE candidate exchange
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
      // 🌟 REMOTE CONTROL EVENTS (Clicks, Typing, System Commands)
      .on('broadcast', { event: 'admin_pointer_click' }, (payload) => {
        const { x, y } = payload.payload;
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
          // Create and send SDP Offer to Admin
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
      {/* 🟢 ACTIVE STREAMING FLOATING BADGE */}
      {isStreaming && (
        <div className="fixed bottom-6 right-6 z-9999 bg-slate-900 border-2 border-orange-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-6">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <div>
              <p className="text-xs font-black text-orange-400 uppercase tracking-wider">Screen Share Active</p>
              <p className="text-[11px] text-zinc-300">IT Support is actively monitoring your workspace.</p>
            </div>
          </div>
          <button onClick={stopSharing} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer">
            <StopCircle size={15} /> <span>Stop Sharing</span>
          </button>
        </div>
      )}

      {/* ⚠️ INCOMING SCREEN SHARE REQUEST MODAL */}
      {incomingRequest && !isStreaming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-9999 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#150f24] border border-orange-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Monitor size={28} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-purple-50">Live IT Support Access Requested</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-purple-300/70">
                <strong className="text-slate-900 dark:text-white">{incomingRequest.adminName}</strong> ({incomingRequest.adminCode}) is requesting permission to view your screen for live troubleshooting.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-[11px] font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2.5">
              <ShieldAlert size={20} className="shrink-0 text-orange-600 dark:text-orange-400" />
              <span>When prompted by your browser, select <strong className="underline">"Entire Screen"</strong> or your active application window.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setIncomingRequest(null)} disabled={isConnecting} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-purple-900/50 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                Decline
              </button>
              <button onClick={startScreenShare} disabled={isConnecting} className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition-all cursor-pointer">
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