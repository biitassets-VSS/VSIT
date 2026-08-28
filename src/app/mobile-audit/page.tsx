'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Camera, Lock, Loader2, MonitorSmartphone, Mouse, Keyboard, Headphones, CheckCircle2, Scan, X, ZoomIn, ZoomOut } from 'lucide-react';

// 🌟 AI WIREFRAME GENERATOR FOR SAMPLE ANGLES
const AiSampleWireframe = ({ category, stepIndex }: { category: string, stepIndex: number }) => {
  const cat = category.toLowerCase();

  if (cat.includes('laptop')) {
    if (stepIndex === 0) return (
      <div className="w-40 h-32 flex flex-col items-center justify-end relative perspective-1000">
        <div className="w-32 h-20 border-2 border-purple-400 rounded-t-xl bg-purple-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <MonitorSmartphone size={24} className="text-purple-400 opacity-50" />
        </div>
        <div className="w-36 h-10 border-2 border-purple-400 rounded-b-xl bg-purple-500/20 transform rotate-x-45 -translate-y-2 flex flex-wrap gap-1 p-1 items-center justify-center">
          {[...Array(12)].map((_, i) => <div key={i} className="w-2 h-1.5 bg-purple-400/40 rounded-sm"></div>)}
        </div>
      </div>
    );
    if (stepIndex === 1) return (
      <div className="w-40 h-32 flex items-center justify-center">
        <div className="w-36 h-24 border-2 border-purple-400 rounded-xl bg-purple-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <div className="w-6 h-6 rounded-full border border-purple-400/60 flex items-center justify-center"><div className="w-3 h-3 bg-purple-400/60 rounded-full"></div></div>
        </div>
      </div>
    );
    if (stepIndex === 2) return (
      <div className="w-40 h-32 flex items-center justify-center relative">
        <div className="w-4 h-32 border-2 border-purple-400 rounded-l-md bg-purple-500/10 flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <div className="w-2 h-1 bg-purple-400/60"></div><div className="w-2 h-3 bg-purple-400/60"></div><div className="w-2 h-2 bg-purple-400/60 rounded-full"></div>
        </div>
        <div className="absolute right-10 text-[9px] font-black tracking-widest text-purple-400 uppercase flex items-center gap-1"><Scan size={12}/> Left Edge</div>
      </div>
    );
    if (stepIndex === 3) return (
      <div className="w-40 h-32 flex items-center justify-center relative">
        <div className="absolute left-10 text-[9px] font-black tracking-widest text-purple-400 uppercase flex items-center gap-1">Right Edge <Scan size={12}/></div>
        <div className="w-4 h-32 border-2 border-purple-400 rounded-r-md bg-purple-500/10 flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <div className="w-2 h-4 bg-purple-400/60"></div><div className="w-2 h-2 bg-purple-400/60 rounded-full"></div>
        </div>
      </div>
    );
    if (stepIndex === 4) return (
      <div className="w-40 h-32 flex items-center justify-center">
        <div className="w-36 h-24 border-2 border-purple-400 rounded-xl bg-purple-500/10 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] gap-2">
          <div className="w-16 h-4 bg-white/10 border border-purple-400/50 flex items-center justify-around px-1"><div className="w-0.5 h-2 bg-purple-400"></div><div className="w-1 h-2 bg-purple-400"></div><div className="w-0.5 h-2 bg-purple-400"></div><div className="w-1.5 h-2 bg-purple-400"></div></div>
          <div className="text-[7px] text-purple-400 uppercase font-mono tracking-widest">S/N: 10293847</div>
        </div>
      </div>
    );
  }

  if (cat.includes('keyboard')) {
    if (stepIndex === 0) return <div className="w-40 h-32 flex items-center justify-center"><Keyboard size={64} strokeWidth={1} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" /></div>;
    if (stepIndex === 1) return <div className="w-40 h-32 flex flex-col items-center justify-center gap-2"><div className="w-32 h-12 border-2 border-purple-400 rounded-md bg-purple-500/10 flex items-center justify-center"><div className="w-12 h-3 bg-white/10 border border-purple-400/50 flex items-center justify-around"><div className="w-0.5 h-1.5 bg-purple-400"></div><div className="w-1 h-1.5 bg-purple-400"></div></div></div></div>;
  }

  if (cat.includes('mouse')) {
    if (stepIndex === 0) return <div className="w-40 h-32 flex items-center justify-center"><Mouse size={64} strokeWidth={1} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" /></div>;
    if (stepIndex === 1) return <div className="w-40 h-32 flex items-center justify-center"><div className="w-16 h-24 border-2 border-purple-400 rounded-full bg-purple-500/10 flex flex-col items-center justify-center gap-2"><div className="w-4 h-4 rounded-full border border-purple-400"></div><div className="w-8 h-2 bg-white/10 border border-purple-400/50"></div></div></div>;
  }

  if (cat.includes('headphone') || cat.includes('headset')) {
    if (stepIndex === 0) return <div className="w-40 h-32 flex items-center justify-center"><Headphones size={64} strokeWidth={1} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" /></div>;
    if (stepIndex === 1) return <div className="w-40 h-32 flex items-center justify-center"><div className="w-20 h-8 border-2 border-purple-400 rounded-full bg-purple-500/10 flex items-center justify-center"><div className="w-8 h-2 bg-white/10 border border-purple-400/50"></div></div></div>;
  }

  return <div className="w-40 h-32 flex items-center justify-center"><MonitorSmartphone size={64} strokeWidth={1} className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" /></div>;
};

function MobileVerifyContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const assetId = searchParams.get('assetId');
  const staffName = searchParams.get('name') || 'Unknown Staff';
  const empCode = searchParams.get('empCode') || searchParams.get('emp') || 'UNKNOWN';
  const category = searchParams.get('cat') || 'Hardware';
  const notes = searchParams.get('notes') || '';
  
  const isLaptop = category.toLowerCase().includes('laptop');
  const isKeyboard = category.toLowerCase().includes('keyboard');
  const isMouse = category.toLowerCase().includes('mouse');
  const isHeadphone = category.toLowerCase().includes('headphone') || category.toLowerCase().includes('headset');

  const requiredCount = isLaptop ? 5 : 2;

  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [success, setSuccess] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  
  // Gallery & Interactive Zoom State
  const [gallery, setGallery] = useState({ isOpen: false, images: [] as string[], index: 0 });
  const [zoomState, setZoomState] = useState({ isZoomed: false, x: 50, y: 50 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const laptopSteps = [
    { title: "Screen & Keypad", desc: "Open laptop, capture full display and keyboard.", icon: MonitorSmartphone },
    { title: "Top Lid Brand Logo", desc: "Close laptop, capture the top exterior brand logo.", icon: MonitorSmartphone },
    { title: "Left Side Ports", desc: "Capture all ports on the left edge clearly.", icon: MonitorSmartphone },
    { title: "Right Side Ports", desc: "Capture all ports on the right edge clearly.", icon: MonitorSmartphone },
    { title: "Bottom S/N & Tag", desc: "Flip over, capture the bottom showing Asset Tag & Serial Number fully.", icon: MonitorSmartphone }
  ];

  const accessorySteps = [
    { title: "Clear Front / Top View", desc: "Capture the main visible surface of the device.", icon: isKeyboard ? Keyboard : isMouse ? Mouse : isHeadphone ? Headphones : MonitorSmartphone },
    { title: "Bottom Asset Tag", desc: "Capture the bottom showing the Asset Tag or S/N.", icon: Scan }
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

  // 🌟 INTERACTIVE ZOOM HANDLERS
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomState.isZoomed) {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setZoomState({ isZoomed: true, x, y });
    } else {
      setZoomState({ isZoomed: false, x: 50, y: 50 });
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomState.isZoomed) {
      const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setZoomState(prev => ({ ...prev, x, y }));
    }
  };

  // 🌟 3D LIQUID GLASS (ONYX STYLE) WATERMARK ENGINE
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

        const baseScale = canvas.width / 1600; 
        // 🌟 NORMAL FONT SIZE (Readable, not massive)
        const fontSize = Math.max(16, Math.floor(22 * baseScale));
        const lineHeight = Math.floor(fontSize * 1.6);
        
        const contentX = Math.floor(30 * baseScale);
        let contentY = canvas.height - (lineHeight * 4.5); 

        // 🌟 THE "ONYX" LIQUID GLASS RENDERING FUNCTION
        const drawLiquidGlassText = (text: string, x: number, y: number, size: number, align: 'left' | 'right' = 'left') => {
          ctx.font = `900 ${size}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
          ctx.textAlign = align;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          // 1. Deep Drop Shadow (Makes it readable against ANY background)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = size * 0.4;
          ctx.shadowOffsetX = size * 0.15;
          ctx.shadowOffsetY = size * 0.15;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Barely visible fill just to hold the shadow
          ctx.fillText(text, x, y);

          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // 2. Thick Translucent Dark Outline (The outer glass edge)
          ctx.lineWidth = size * 0.12;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.strokeText(text, x, y);

          // 3. Thick Translucent Light Outline (The inner glass body)
          ctx.lineWidth = size * 0.08;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.strokeText(text, x, y);

          // 4. Sharp Bright Highlight (The Specular Glass Reflection)
          ctx.lineWidth = size * 0.025;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          // Offset slightly up and left to simulate a top-left light source
          ctx.strokeText(text, x - (size * 0.02), y - (size * 0.02));

          // 5. Clear center (Fill with very faint white to complete the glass look)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillText(text, x, y);
          
          ctx.textAlign = 'left'; // Reset
        };

        // Render Watermark Content using the Liquid Glass effect
        drawLiquidGlassText(`● VIRTUAL STAFFING SOLUTIONS`, contentX, contentY, Math.floor(fontSize * 1.1), 'left');
        drawLiquidGlassText(`VERIFIED AUDIT ✓`, canvas.width - contentX, contentY, Math.floor(fontSize * 1.1), 'right');

        contentY += lineHeight;
        drawLiquidGlassText(`👤 CUSTODIAN: ${staffName} (${empCode})`, contentX, contentY, fontSize, 'left');
        
        contentY += lineHeight;
        drawLiquidGlassText(`📅 TIMESTAMP: ${new Date().toLocaleString('en-IN')}`, contentX, contentY, fontSize, 'left');
        
        contentY += lineHeight;
        drawLiquidGlassText(`📱 HARDWARE: ${category.toUpperCase()} | ${getDeviceName()}`, contentX, contentY, fontSize, 'left');

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject("Blob conversion failed");
        }, 'image/jpeg', 0.85);
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
      
      const { error } = await supabase.storage
        .from('asset-photos')
        .upload(fileName, watermarkedBlob, { contentType: 'image/jpeg' });
      if (error) throw error;
      
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
    <div className="min-h-screen bg-[#0d0914] text-white flex flex-col items-center justify-start pt-8 p-6 text-center space-y-5 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vh] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
        <div className="h-full bg-purple-500 transition-all duration-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]" style={{ width: `${(uploadedCount / requiredCount) * 100}%` }}></div>
      </div>
      
      <div className="space-y-1 relative z-10 w-full max-w-sm">
        <h1 className="text-xl font-black uppercase tracking-widest text-white">Live Hardware Audit</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target: {category}</p>
      </div>

      <div className="bg-[#1a1325] border border-purple-500/30 p-5 rounded-3xl w-full max-w-sm flex flex-col items-center shadow-[0_8px_30px_rgba(0,0,0,0.4)] z-10 relative overflow-hidden">
        <div className="mb-3 text-[9px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1.5 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
          <Scan size={12} /> AI Guide: Required Angle
        </div>
        
        <AiSampleWireframe category={category} stepIndex={uploadedCount} />

        <div className="text-center mt-4 border-t border-purple-500/20 w-full pt-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-1">
            Photo {uploadedCount + 1} of {requiredCount}
          </h2>
          <h3 className="text-xs font-bold text-purple-300 mb-1">{currentStepInfo.title}</h3>
          <p className="text-[10px] font-semibold text-slate-400 leading-relaxed">
            {currentStepInfo.desc}
          </p>
        </div>
      </div>

      <div className="bg-[#1a1325] border border-purple-500/20 p-4 rounded-3xl text-left w-full max-w-sm space-y-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 z-10">
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
            <span className="font-black tracking-widest uppercase text-[10px] text-purple-400">Processing & Watermarking...</span>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 rounded-full bg-[#a855f7] hover:bg-purple-500 text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center justify-center gap-3 active:scale-95 transition-all border border-purple-400"
          >
            <Camera size={18} /> Capture Photo {uploadedCount + 1}
          </button>
        )}
      </div>

      {uploadedUrls.length > 0 && (
        <div className="w-full max-w-sm z-10 mt-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left mb-2 pl-2">Captured Gallery</div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {uploadedUrls.map((url, idx) => (
              <div 
                key={idx} 
                onClick={() => setGallery({ isOpen: true, images: uploadedUrls, index: idx })}
                className="min-w-[64px] w-16 h-16 rounded-xl border-2 border-purple-500/40 overflow-hidden cursor-pointer snap-start relative shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:border-purple-400 transition-all shrink-0"
              >
                <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <ZoomIn size={16} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🌟 FULL-SCREEN INTERACTIVE MAGNIFIER GALLERY MODAL */}
      {gallery.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col p-4">
          
          {/* 🌟 PROMINENT ABSOLUTE CLOSE BUTTON (TOP RIGHT) */}
          <button 
            onClick={() => {
              setGallery(g => ({ ...g, isOpen: false }));
              setZoomState({ isZoomed: false, x: 50, y: 50 });
            }}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer z-[110] transition-all active:scale-95"
          >
            <X size={24} />
          </button>

          {/* Header Info */}
          <div className="flex flex-col items-center justify-center w-full z-[60] mt-4 mb-2 pointer-events-none">
            <span className="text-[12px] font-black uppercase tracking-widest text-purple-400 bg-black/50 px-4 py-1.5 rounded-full border border-white/10">
              Photo {gallery.index + 1} of {gallery.images.length}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-bold bg-black/50 px-3 py-1 rounded-full">
              {zoomState.isZoomed ? "Move mouse/finger to Pan" : "Click image to Zoom In"}
            </span>
          </div>
          
          {/* Interactive Magnifier Viewport */}
          <div className="flex-1 w-full h-full relative overflow-hidden mt-4 mb-4">
            <div 
              className={`relative w-full h-full flex items-center justify-center ${zoomState.isZoomed ? 'cursor-move' : 'cursor-zoom-in'}`}
              onClick={handleImageClick}
              onMouseMove={handleImageMouseMove}
              onMouseLeave={() => setZoomState({ isZoomed: false, x: 50, y: 50 })}
            >
              <img 
                src={gallery.images[gallery.index]} 
                alt="Expanded capture" 
                style={{ 
                  transform: zoomState.isZoomed ? `scale(3)` : `scale(1)`, 
                  transformOrigin: `${zoomState.x}% ${zoomState.y}%`,
                  transition: zoomState.isZoomed ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }}
                className="max-w-full max-h-[75vh] object-contain rounded-xl pointer-events-none shadow-[0_0_40px_rgba(168,85,247,0.15)] border border-white/5" 
              />
            </div>
          </div>
          
          {/* Navigation Controls */}
          {gallery.images.length > 1 && (
             <div className="flex justify-between items-center w-full max-w-sm mx-auto z-[60] mb-6">
                <button 
                  onClick={() => {
                    setGallery(g => ({ ...g, index: Math.max(g.index - 1, 0) }));
                    setZoomState({ isZoomed: false, x: 50, y: 50 });
                  }}
                  disabled={gallery.index === 0}
                  className="px-6 py-4 bg-white/10 border border-white/20 rounded-full text-white font-black text-[12px] uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-lg hover:bg-white/20"
                >
                  Previous
                </button>
                <button 
                  onClick={() => {
                    setGallery(g => ({ ...g, index: Math.min(g.index + 1, g.images.length - 1) }));
                    setZoomState({ isZoomed: false, x: 50, y: 50 });
                  }}
                  disabled={gallery.index === gallery.images.length - 1}
                  className="px-6 py-4 bg-white/10 border border-white/20 rounded-full text-white font-black text-[12px] uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-lg hover:bg-white/20"
                >
                  Next
                </button>
             </div>
          )}
        </div>
      )}

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