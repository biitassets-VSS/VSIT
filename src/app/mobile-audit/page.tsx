'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Camera, Lock, Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

function MobileVerifyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const requiredCount = parseInt(searchParams.get('req') || '2', 10);
  const staffName = searchParams.get('name') || 'Unknown Staff';
  const empCode = searchParams.get('emp') || 'UNKNOWN';

  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    // Check if this specific session was already completed and locked on this device
    const locked = localStorage.getItem(`locked_session_${sessionId}`);
    if (locked) setIsLocked(true);
    
    setLoading(false);
  }, [sessionId]);

  // Detect Device Model for Watermark
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return "Apple iPhone";
    if (/iPad/i.test(ua)) return "Apple iPad";
    if (/Samsung/i.test(ua) || /SM-/i.test(ua)) return "Samsung Galaxy";
    if (/Pixel/i.test(ua)) return "Google Pixel";
    if (/Android/i.test(ua)) return "Android Device";
    return "Mobile Device";
  };

  // 🌟 PURE HTML5 CANVAS WATERMARK ENGINE
  const processWatermark = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas not supported");

        // Maintain original resolution for clear zoom
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original photo
        ctx.drawImage(img, 0, 0);

        // Responsive text sizing based on image resolution
        const fontSize = Math.max(24, Math.floor(canvas.width / 35));
        const padding = fontSize;
        const textX = padding;
        const textY = canvas.height - (fontSize * 4.5);
        
        // Draw Glass-like Background Panel for Watermark text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, canvas.height - (fontSize * 6.5), canvas.width, fontSize * 6.5);

        // Draw Watermark Text
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        
        ctx.fillText(`👤 STAFF: ${staffName} (${empCode})`, textX, textY);
        ctx.fillText(`📅 DATE: ${new Date().toLocaleString('en-IN')}`, textX, textY + fontSize * 1.5);
        ctx.fillText(`📱 DEVICE: ${getDeviceName()}`, textX, textY + fontSize * 3);
        ctx.fillText(`🔒 SECURE RETURN VERIFICATION`, textX, textY + fontSize * 4.5);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Blob conversion failed");
        }, 'image/jpeg', 0.85); // Compress slightly for faster uploads
      };
      img.onerror = () => reject("Image load failed");
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    
    // Enforce required count
    if (files.length < requiredCount) {
      alert(`Security Rule: You must capture at least ${requiredCount} photos. You selected ${files.length}. Please try again.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        // 1. Process Watermark
        const watermarkedBlob = await processWatermark(files[i]);
        
        // 2. Prepare for Upload
        const fileExt = 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // 3. Upload to Supabase 'attachments' bucket
        const { error } = await supabase.storage
          .from('attachments')
          .upload(`asset-attachments/${fileName}`, watermarkedBlob, { contentType: 'image/jpeg' });
        
        if (error) throw error;
        
        // 4. Get Public URL
        const { data } = supabase.storage.from('attachments').getPublicUrl(`asset-attachments/${fileName}`);
        
        // 5. Broadcast directly back to the Staff Dashboard / Admin Page in Real-time
        if (sessionId) {
          await supabase.channel(`qr_session_${sessionId}`).send({
            type: 'broadcast',
            event: 'photo_uploaded',
            payload: { url: data.publicUrl }
          });
        }
        
        // Update Progress UI
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      setSuccess(true);
      
      // 🌟 PERMANENTLY LOCK THE SESSION ON THIS DEVICE
      if (sessionId) {
        localStorage.setItem(`locked_session_${sessionId}`, 'true');
      }
      setIsLocked(true);

    } catch (err: any) {
      console.error(err);
      alert(`Failed to encrypt and upload photos: ${err.message}. Please refresh and try again.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10"/>
      </div>
    );
  }

  // 🔒 RENDER SESSION LOCKED STATE
  if (isLocked || success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8 text-center space-y-5 font-sans">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          {success ? <CheckCircle2 className="text-emerald-500 w-12 h-12" /> : <Lock className="text-emerald-500 w-12 h-12" />}
        </div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-emerald-400">
          {success ? 'Upload Complete' : 'Session Locked'}
        </h1>
        <p className="text-zinc-400 font-semibold text-sm leading-relaxed max-w-xs">
          The hardware photos have been successfully encrypted, watermarked, and transmitted to the database. This capture link is now permanently disabled.
        </p>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-8 px-4 py-2 bg-white/5 rounded-full border border-white/10">
          You may safely close this window
        </p>
      </div>
    );
  }

  // 📸 RENDER ACTIVE CAPTURE STATE
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center space-y-8 font-sans relative overflow-hidden">
      
      {/* Top Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-800">
        <div className="h-full bg-orange-500 transition-all duration-300 shadow-[0_0_10px_rgba(249,115,22,0.8)]" style={{ width: `${progress}%` }}></div>
      </div>
      
      <div className="space-y-4 relative z-10 w-full max-w-sm">
        <div className="w-20 h-20 bg-orange-500/10 rounded-4xl flex items-center justify-center mx-auto border border-orange-500/30 mb-8 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
          <ShieldCheck className="text-orange-500 w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-white">Secure Handoff</h1>
        
        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-2xl flex items-start gap-3 text-left">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            You must capture at least <strong className="text-white text-xs">{requiredCount} photos</strong> at once. Permanent watermarks will be applied automatically.
          </p>
        </div>
      </div>

      {/* Embedded Metadata Glass Panel */}
      <div className="bg-zinc-900/80 border border-white/10 p-5 rounded-3xl text-left w-full max-w-sm space-y-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 shadow-inner">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Staff Identity:</span> 
          <span className="text-zinc-200 truncate max-w-37.5 text-right">{staffName}</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Employee Code:</span> 
          <span className="text-zinc-200">{empCode}</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Upload Date:</span> 
          <span className="text-zinc-200">{new Date().toLocaleDateString('en-IN')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Device Meta:</span> 
          <span className="text-purple-400 truncate max-w-30 text-right">{getDeviceName()}</span>
        </div>
      </div>

      <div className="w-full max-w-sm pt-4">
        {uploading ? (
          <div className="flex flex-col items-center gap-4 py-4 bg-zinc-900/50 rounded-full border border-white/5">
            <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
            <span className="font-black tracking-widest uppercase text-[10px] text-orange-400">
              Encrypting & Transmitting... {progress}%
            </span>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(249,115,22,0.4)] flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer"
          >
            <Camera size={20} /> Open Camera Sequence
          </button>
        )}
      </div>

      {/* 🌟 NATIVE CAMERA TRIGGER */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        multiple 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleCapture} 
      />
    </div>
  );
}

export default function MobileVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10"/>
      </div>
    }>
      <MobileVerifyContent />
    </Suspense>
  );
}