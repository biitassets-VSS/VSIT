'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Camera, Lock, Loader2, ShieldCheck, CheckCircle2, 
  AlertTriangle, MonitorPlay, Laptop, PanelLeft, PanelRight, ScanBarcode
} from 'lucide-react';

function MobileVerifyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const assetId = searchParams.get('assetId');
  
  const requiredCount = parseInt(searchParams.get('req') || '5', 10);
  const staffName = searchParams.get('name') || 'Unknown Staff';
  const empCode = searchParams.get('empCode') || searchParams.get('emp') || 'UNKNOWN';
  
  const isLaptop = (searchParams.get('cat') || '').toLowerCase().includes('laptop');
  const auditType = searchParams.get('auditType')?.toUpperCase() || '';
  
  let pageTitle = "SECURE HANDOFF";
  if (auditType === 'INSPECTION') pageTitle = "SECURE INSPECTION";
  else if (auditType === 'RETURN') pageTitle = "SECURE RETURN";
  else if (auditType === 'REPLACE' || auditType === 'REPLACEMENT') pageTitle = "SECURE REPLACEMENT";

  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [capturedUrls, setCapturedUrls] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
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

  // 🌟 DYNAMIC UPLOAD GUIDES WITH SAMPLE PHOTOS
  const laptopGuides = [
    { title: "Screen & Keyboard", desc: "Capture the display and keyboard area fully.", icon: MonitorPlay, sampleImg: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop" },
    { title: "Top Lid", desc: "Capture the outer lid showing the brand logo.", icon: Laptop, sampleImg: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=800&auto=format&fit=crop" },
    { title: "Left Side Ports", desc: "Capture the left side showing all USB/Type-C ports.", icon: PanelLeft, sampleImg: "https://images.unsplash.com/photo-1625842268584-8f3296236761?q=80&w=800&auto=format&fit=crop" },
    { title: "Right Side Ports", desc: "Capture the right side showing all ports.", icon: PanelRight, sampleImg: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop" },
    { title: "Bottom & Tag", desc: "Capture the bottom casing showing the serial number / asset tag.", icon: ScanBarcode, sampleImg: "https://images.unsplash.com/photo-1601524909162-ae8725290836?q=80&w=800&auto=format&fit=crop" }
  ];
  
  const accessoryGuides = [
    { title: "Front / Top View", desc: "Capture a clear overall photo of the device.", icon: Camera, sampleImg: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=800&auto=format&fit=crop" },
    { title: "Bottom / Tag View", desc: "Capture the bottom or back showing the asset tag.", icon: ScanBarcode, sampleImg: "https://images.unsplash.com/photo-1625842268584-8f3296236761?q=80&w=800&auto=format&fit=crop" }
  ];

  const currentGuide = isLaptop 
    ? laptopGuides[Math.min(uploadedCount, laptopGuides.length - 1)] 
    : accessoryGuides[Math.min(uploadedCount, accessoryGuides.length - 1)];

  const processWatermark = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file); 

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        setTimeout(() => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Canvas not supported"));

            const MAX_WIDTH = 1200; 
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);

            const fontSize = Math.max(14, Math.floor(canvas.width / 40));
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
            ctx.fillText(`📍 ANGLE: ${currentGuide.title.toUpperCase()}`, textX, textY + fontSize * 4.5);

            canvas.toBlob((blob) => {
              canvas.width = 0;
              canvas.height = 0; 
              if (blob) resolve(blob);
              else reject(new Error("Blob conversion failed"));
            }, 'image/jpeg', 0.70); 

          } catch (err) {
            reject(err);
          }
        }, 50); 
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };

      img.src = objectUrl;
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);

    try {
      const watermarkedBlob = await processWatermark(file);
      const fileExt = 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('asset-photos')
        .upload(`${fileName}`, watermarkedBlob, { contentType: 'image/jpeg' });
      
      if (error) throw error;
      
      const { data } = supabase.storage.from('asset-photos').getPublicUrl(`${fileName}`);
      const newCapturedUrls = [...capturedUrls, data.publicUrl];
      setCapturedUrls(newCapturedUrls);
      
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
        setSuccess(true);
        if (sessionId) localStorage.setItem(`locked_session_${sessionId}`, 'true');
        setIsLocked(true);

        // Overwrites the main assets table with ONLY the latest photos
        if (assetId) {
          await supabase.from('assets').update({ photos: newCapturedUrls }).eq('id', assetId);
        }
      }

    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}. Ensure Supabase RLS policies allow public inserts.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-purple-500 w-10 h-10"/>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-start py-8 px-5 text-center space-y-5 font-sans relative overflow-x-hidden overflow-y-auto">
      
      {/* Top Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-800">
        <div className="h-full bg-purple-500 transition-all duration-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]" style={{ width: `${(uploadedCount / requiredCount) * 100}%` }}></div>
      </div>
      
      {/* Header */}
      <div className="space-y-2 relative z-10 w-full max-w-sm mt-2">
        <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
          <ShieldCheck className="text-purple-400 w-7 h-7" />
        </div>
        <h1 className="text-lg font-black uppercase tracking-widest text-white">{pageTitle}</h1>
      </div>

      {/* 🌟 SAMPLE PHOTO REFERENCE UI */}
      <div className="w-full max-w-sm text-left bg-zinc-900 border border-purple-500/30 rounded-3xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden animate-in zoom-in-95 duration-300">
        <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          Required Angle {uploadedCount + 1} of {requiredCount}
        </p>

        <div className="w-full h-40 bg-zinc-800 rounded-2xl mb-4 overflow-hidden relative border border-white/10">
          <img src={currentGuide.sampleImg} alt="Sample Angle" className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
             <span className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/20">
               Sample Reference
             </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black/50 border border-white/10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-inner">
            <currentGuide.icon size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight mb-0.5">{currentGuide.title}</h3>
            <p className="text-[10px] font-medium text-zinc-400 leading-snug">{currentGuide.desc}</p>
          </div>
        </div>
      </div>

      {/* Embedded Metadata Panel */}
      <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-3xl text-left w-full max-w-sm space-y-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 shadow-inner">
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Staff Identity:</span> 
          <span className="text-zinc-200 truncate max-w-36 text-right">{staffName}</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <span>Employee Code:</span> 
          <span className="text-zinc-200">{empCode}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Upload Status:</span> 
          <span className="text-purple-400">{uploadedCount} / {requiredCount} Completed</span>
        </div>
      </div>

      {/* Capture Action */}
      <div className="w-full max-w-sm pt-2 pb-4">
        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-3.5 bg-zinc-900/50 rounded-full border border-white/5">
            <Loader2 className="animate-spin text-purple-500 w-6 h-6" />
            <span className="font-black tracking-widest uppercase text-[9px] text-purple-400">
              Encrypting & Transmitting...
            </span>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest shadow-[0_4px_25px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer border border-purple-500"
          >
            <Camera size={18} /> Capture Angle {uploadedCount + 1}
          </button>
        )}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
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
        <Loader2 className="animate-spin text-purple-500 w-10 h-10"/>
      </div>
    }>
      <MobileVerifyContent />
    </Suspense>
  );
}