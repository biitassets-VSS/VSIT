'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Camera, Lock, Loader2, ShieldCheck, CheckCircle2, AlertTriangle, MonitorSmartphone, Mouse } from 'lucide-react';

function MobileVerifyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const assetId = searchParams.get('assetId');
  const requiredCount = parseInt(searchParams.get('req') || '2', 10);
  const staffName = searchParams.get('name') || 'Unknown Staff';
  const empCode = searchParams.get('empCode') || searchParams.get('emp') || 'UNKNOWN';
  const category = searchParams.get('cat') || 'Hardware';
  const notes = searchParams.get('notes') || '';
  const isLaptop = category.toLowerCase().includes('laptop');

  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [success, setSuccess] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🌟 AI-Guided Step Instructions based on exact rules
  const laptopSteps = [
    { title: "Screen & Keypad", desc: "Open laptop, capture full display and keyboard.", icon: MonitorSmartphone },
    { title: "Top Lid Brand Logo", desc: "Close laptop, capture the top exterior brand logo.", icon: MonitorSmartphone },
    { title: "Left Side Ports", desc: "Capture all ports on the left edge clearly.", icon: MonitorSmartphone },
    { title: "Right Side Ports", desc: "Capture all ports on the right edge clearly.", icon: MonitorSmartphone },
    { title: "Bottom S/N & Tag", desc: "Flip over, capture the bottom showing Asset Tag & Serial Number fully.", icon: MonitorSmartphone }
  ];

  const accessorySteps = [
    { title: "Top / Front View", desc: "Capture the main visible surface of the device.", icon: Mouse },
    { title: "Bottom / Asset Tag", desc: "Capture the bottom showing the Asset Tag or S/N.", icon: Mouse }
  ];

  const activeSteps = isLaptop ? laptopSteps : accessorySteps;
  const currentStepInfo = activeSteps[Math.min(uploadedCount, activeSteps.length - 1)] || activeSteps[0];

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const locked = localStorage.getItem(`locked_session_${sessionId}`);
    if (locked) setIsLocked(true);
    setLoading(false);
  }, [sessionId]);

  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return "Apple iPhone";
    if (/iPad/i.test(ua)) return "Apple iPad";
    if (/Samsung/i.test(ua) || /SM-/i.test(ua)) return "Samsung Galaxy";
    if (/Pixel/i.test(ua)) return "Google Pixel";
    if (/Android/i.test(ua)) return "Android Device";
    return "Mobile Device";
  };

  const processWatermark = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas not supported");

        const MAX_WIDTH = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const fontSize = Math.max(16, Math.floor(canvas.width / 35));
        const padding = fontSize;
        const textX = padding;
        const textY = canvas.height - (fontSize * 4.5);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, canvas.height - (fontSize * 6.5), canvas.width, fontSize * 6.5);

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        
        ctx.fillText(`👤 STAFF: ${staffName} (${empCode})`, textX, textY);
        ctx.fillText(`📅 DATE/TIME: ${new Date().toLocaleString('en-IN')}`, textX, textY + fontSize * 1.5);
        ctx.fillText(`📱 DEVICE: ${getDeviceName()}`, textX, textY + fontSize * 3);
        ctx.fillText(`🔒 SECURE LIVE CAPTURE`, textX, textY + fontSize * 4.5);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Blob conversion failed");
        }, 'image/jpeg', 0.80);
      };
      img.onerror = () => reject("Image load failed");
      img.src = URL.createObjectURL(file);
    });
  };

  const finalizeInspection = async (finalUrls: string[]) => {
    if (!assetId) return;
    try {
      await supabase.from('assets').update({ inspection_status: 'Pending Review' }).eq('id', assetId);
      
      await supabase.from('inspections').insert({
        asset_id: assetId,
        status: 'Pending Review',
        notes: notes || 'Mobile Device Audit Complete',
        photos: finalUrls
      });

      await supabase.from('notifications').insert({
        target_role: 'admin',
        title: 'New Hardware Audit',
        message: `${staffName} submitted a new audit for ${category}. Awaiting your review.`,
        type: 'inspection',
        is_read: false
      });
    } catch (e) {
      console.error("Failed to finalize in DB", e);
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);

    try {
      const watermarkedBlob = await processWatermark(file);
      const fileExt = 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // 🌟 FIX: Updated bucket name to 'asset-photos' which exists in your Supabase DB
      const { error } = await supabase.storage
        .from('asset-photos')
        .upload(fileName, watermarkedBlob, { contentType: 'image/jpeg' });
      if (error) throw error;
      
      // 🌟 FIX: Fetching public URL from the correct 'asset-photos' bucket
      const { data } = supabase.storage.from('asset-photos').getPublicUrl(fileName);
      const newUrls = [...uploadedUrls, data.publicUrl];
      setUploadedUrls(newUrls);
      
      if (sessionId) {
        await supabase.channel(`qr_session_${sessionId}`).send({
          type: 'broadcast',
          event: 'photo_uploaded',
          payload: { url: data.publicUrl }
        });
      }
      
      const newCount = uploadedCount + 1;
      setUploadedCount(newCount);

      if (newCount >= requiredCount) {
        await finalizeInspection(newUrls);
        setSuccess(true);
        if (sessionId) localStorage.setItem(`locked_session_${sessionId}`, 'true');
        setIsLocked(true);
      }

    } catch (err: any) {
      alert(`Failed to upload photo: ${err.message}. Please try again.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0914] flex items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-purple-500 w-10 h-10"/>
      </div>
    );
  }

  if (isLocked || success) {
    return (
      <div className="min-h-screen bg-[#0d0914] text-white flex flex-col items-center justify-center p-8 text-center space-y-5 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vh] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.3)] z-10">
          <CheckCircle2 className="text-emerald-400 w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-white z-10">
          Upload Complete
        </h1>
        <p className="text-slate-300 font-semibold text-sm leading-relaxed max-w-xs z-10">
          The hardware photos have been securely transmitted to the admin dashboard. Your staff portal is now updated.
        </p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8 px-4 py-2 bg-white/10 rounded-full border border-white/20 z-10">
          You may safely close this window
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0914] text-white flex flex-col items-center justify-start pt-12 p-6 text-center space-y-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vh] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
        <div className="h-full bg-purple-500 transition-all duration-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]" style={{ width: `${(uploadedCount / requiredCount) * 100}%` }}></div>
      </div>
      
      <div className="space-y-3 relative z-10 w-full max-w-sm">
        <h1 className="text-xl font-black uppercase tracking-widest text-white">Live Hardware Audit</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target: {category}</p>
      </div>

      {/* 🌟 AI Guided Photo Instruction Card */}
      <div className="bg-[#1a1325] border border-purple-500/20 p-5 rounded-3xl w-full max-w-sm flex flex-col items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-10">
        <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/40 shadow-inner">
          <currentStepInfo.icon className="text-purple-400 w-7 h-7" />
        </div>
        <div className="text-center">
          <h2 className="text-sm font-black uppercase tracking-widest text-purple-300 mb-1">
            Photo {uploadedCount + 1}: {currentStepInfo.title}
          </h2>
          <p className="text-[11px] font-semibold text-slate-300 leading-relaxed px-2">
            {currentStepInfo.desc}
          </p>
        </div>
      </div>

      <div className="bg-[#1a1325] border border-purple-500/20 p-4 rounded-3xl text-left w-full max-w-sm space-y-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 z-10">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Staff Identity:</span> <span className="text-slate-200 truncate max-w-[150px] text-right">{staffName}</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Upload Status:</span> <span className="text-purple-400">{uploadedCount} / {requiredCount} Complete</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Device Meta:</span> <span className="text-emerald-400 truncate max-w-[120px] text-right">{getDeviceName()}</span>
        </div>
      </div>

      <div className="w-full max-w-sm pt-2 z-10">
        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-4 bg-[#1a1325] rounded-full border border-purple-500/20">
            <Loader2 className="animate-spin text-purple-500 w-6 h-6" />
            <span className="font-black tracking-widest uppercase text-[10px] text-purple-400">Processing...</span>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 rounded-full bg-[#a855f7] hover:bg-purple-500 text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center justify-center gap-3 active:scale-95 transition-all border border-purple-400"
          >
            <Camera size={18} /> Capture {currentStepInfo.title}
          </button>
        )}
      </div>

      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] font-black tracking-widest text-[#a855f7]/50">Designed by AinodeArt</p>
      </div>

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleCapture} />
    </div>
  );
}

export default function MobileVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0914] flex items-center justify-center p-6 text-center"><Loader2 className="animate-spin text-purple-500 w-10 h-10"/></div>}>
      <MobileVerifyContent />
    </Suspense>
  );
}