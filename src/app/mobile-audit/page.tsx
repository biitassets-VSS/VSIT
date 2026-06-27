'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Camera, CheckCircle, Loader2, Monitor, Keyboard, ArrowRight, ShieldCheck, Laptop } from 'lucide-react';

function MobileAuditScanner() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId');
  const empCode = searchParams.get('empCode');
  const staffName = searchParams.get('name');
  const category = searchParams.get('cat') || 'Laptop';
  const condition = searchParams.get('cond') || 'Good';
  const notes = searchParams.get('notes') || '';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  // 🌟 DYNAMIC PHOTO RULES
  const isLaptop = category.toLowerCase().includes('laptop');
  const requiredShots = isLaptop ? [
    { id: 'screen', name: 'Screen & Keypad', icon: Monitor, desc: 'Display on, showing full keyboard' },
    { id: 'top', name: 'Top Lid', icon: Laptop, desc: 'Closed lid, showing casing' },
    { id: 'left', name: 'Left Ports', icon: ArrowRight, desc: 'Clear view of left side ports' },
    { id: 'right', name: 'Right Ports', icon: ArrowRight, desc: 'Clear view of right side ports' },
    { id: 'bottom', name: 'Bottom & Tag', icon: Hash, desc: 'Underside showing the Asset Tag' }
  ] : [
    { id: 'front', name: 'Front View', icon: Monitor, desc: 'Clear view of the front' },
    { id: 'back', name: 'Back & Tag', icon: Hash, desc: 'Backside showing the Asset Tag' }
  ];

  const allPhotosTaken = requiredShots.every(shot => photos[shot.id]);

  // 🌟 THE WATERMARK ENGINE (Canvas processing)
  const processImageWithWatermark = (file: File, shotId: string) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Keep standard HD resolution to save database space
        const MAX_WIDTH = 1280;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        // Draw original photo
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Prepare Watermark Design
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Dark background box for text readable on any photo
        ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#FFE81F'; // Bright yellow highly visible text
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;

        // Add Watermark Text
        const dateStr = new Date().toLocaleString();
        ctx.fillText(`AUDIT BY: ${staffName} (${empCode})`, 20, canvas.height - 60);
        ctx.fillText(`TIMESTAMP: ${dateStr}`, 20, canvas.height - 25);
        ctx.fillText(`ASSET: ${category} | SHOT: ${shotId.toUpperCase()}`, canvas.width - 400, canvas.height - 42);

        // Convert back to base64 to show in UI
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotos(prev => ({ ...prev, [shotId]: watermarkedDataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>, shotId: string) => {
    if (e.target.files && e.target.files[0]) {
      processImageWithWatermark(e.target.files[0], shotId);
    }
  };

  const submitFinalAudit = async () => {
    setLoading(true);
    try {
      // In a real production app, you would upload these Base64 strings to a Supabase Storage Bucket here.
      // For now, we simulate the save and update the inspections table.
      
      const { error } = await supabase.from('inspections').insert({
        asset_id: assetId,
        inspected_by: empCode, // using emp code as identifier
        condition: condition,
        notes: notes + '\n[Mobile Photos Verified]',
        status: 'Pending',
        // If your database has a JSON column for photos, you can attach the URLs here.
      });

      if (error) throw error;

      await supabase.from('assets').update({ inspection_status: 'Pending' }).eq('id', assetId);
      
      setSuccess(true);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <CheckCircle size={80} className="text-emerald-500 animate-bounce" />
        <h1 className="text-3xl font-black text-white">Audit Secured</h1>
        <p className="text-slate-400 font-medium">Watermarked photos uploaded successfully. You can now close this window on your phone.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans pb-32">
      <div className="bg-slate-900 text-white p-6 rounded-3xl mb-6 shadow-xl">
        <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-2"><Camera size={20} className="text-blue-500"/> Mobile Audit Camera</h1>
        <p className="text-sm font-medium text-slate-400 mt-2">Asset ID: {assetId}</p>
        <p className="text-xs font-mono text-emerald-400 mt-1">Operator: {staffName} ({empCode})</p>
      </div>

      <div className="space-y-4">
        {requiredShots.map((shot) => {
          const hasPhoto = !!photos[shot.id];
          return (
            <div key={shot.id} className={`p-4 rounded-3xl border-2 transition-all ${hasPhoto ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 border-dashed bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${hasPhoto ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <shot.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{shot.name}</h3>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{shot.desc}</p>
                  </div>
                </div>
                {hasPhoto && <CheckCircle size={24} className="text-emerald-500" />}
              </div>

              {hasPhoto ? (
                <div className="relative rounded-xl overflow-hidden border border-emerald-200">
                  <img src={photos[shot.id]!} alt={shot.name} className="w-full h-48 object-cover" />
                  <button onClick={() => setPhotos(p => ({...p, [shot.id]: null}))} className="absolute top-2 right-2 px-3 py-1 bg-slate-900/80 text-white text-xs font-bold rounded-lg backdrop-blur-sm">Retake</button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full py-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors group">
                  <div className="text-center">
                    <Camera size={28} className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest text-blue-700">Open Camera</span>
                  </div>
                  {/* The capture="environment" tag forces mobile browsers to open the rear camera directly! */}
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleCapture(e, shot.id)} className="hidden" />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={submitFinalAudit} 
          disabled={!allPhotosTaken || loading}
          className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${allPhotosTaken ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-200 text-slate-400'}`}
        >
          {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          {loading ? 'Uploading Secure Files...' : 'Submit Certified Audit'}
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center animate-pulse font-bold uppercase tracking-widest">Loading Camera Secure Link...</div>}>
      <MobileAuditScanner />
    </Suspense>
  );
}