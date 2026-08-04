'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Camera, CheckCircle, Loader2, Monitor, Keyboard, ArrowRight, ShieldCheck, Laptop, Hash, Lock } from 'lucide-react';

function MobileAuditScanner() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId');
  const empCode = searchParams.get('empCode');
  const staffName = searchParams.get('name');
  const category = searchParams.get('cat') || 'Laptop';
  const condition = searchParams.get('cond') || 'Good';
  const notes = searchParams.get('notes') || '';
  const auditType = searchParams.get('auditType') || 'INSPECTION';

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});

  // 🌟 PREVENT DUPLICATE SUBMISSIONS (DB LOCK CHECK)
  useEffect(() => {
    if (!assetId) return;
    
    const checkLockStatus = async () => {
      try {
        const { data: asset } = await supabase.from('assets').select('inspection_status, status').eq('id', assetId).single();
        if (asset) {
          const inspStatus = (asset.inspection_status || '').toLowerCase();
          const assetStatus = (asset.status || '').toLowerCase();
          
          // If the asset is currently pending review by an admin, lock the page
          if (['pending', 'approved', 'return pending', 'returned to inventory', 'return approved'].some(s => inspStatus.includes(s) || assetStatus.includes(s))) {
            setIsAlreadySubmitted(true);
          }
        }
      } catch (err) {
        console.error("Lock check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkLockStatus();
  }, [assetId]);

  // 🌟 DYNAMIC PHOTO RULES WITH SAMPLE IMAGES
  const isLaptop = category.toLowerCase().includes('laptop');
  const requiredShots = isLaptop ? [
    { id: 'screen', name: 'Screen & Keypad', icon: Monitor, desc: 'Display on, showing full keyboard', sample: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&q=80' },
    { id: 'top', name: 'Top Lid', icon: Laptop, desc: 'Closed lid, showing casing', sample: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500&q=80' },
    { id: 'left', name: 'Left Ports', icon: ArrowRight, desc: 'Clear view of left side ports', sample: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500&q=80' },
    { id: 'right', name: 'Right Ports', icon: ArrowRight, desc: 'Clear view of right side ports', sample: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500&q=80' },
    { id: 'bottom', name: 'Bottom & Tag', icon: Hash, desc: 'Underside showing the Asset Tag', sample: 'https://plus.unsplash.com/premium_photo-1664302152996-322119eb4aeb?w=500&q=80' }
  ] : [
    { id: 'front', name: 'Front View', icon: Monitor, desc: 'Clear view of the front', sample: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80' },
    { id: 'back', name: 'Back & Tag', icon: Hash, desc: 'Backside showing the Asset Tag', sample: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=500&q=80' }
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

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Add Watermark Text
        const dateStr = new Date().toLocaleString();
        ctx.font = '24px sans-serif'; 
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; 
        ctx.shadowBlur = 4;
        
        ctx.fillText(`AUDIT BY: ${staffName} (${empCode})`, 20, canvas.height - 60);
        ctx.fillText(`TIMESTAMP: ${dateStr}`, 20, canvas.height - 25);
        ctx.fillText(`ASSET: ${category} | SHOT: ${shotId.toUpperCase()}`, canvas.width - 400, canvas.height - 42);

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
      const photoEntries = Object.entries(photos).filter(([_, data]) => data !== null);
      const finalImageUrls: string[] = [];

      for (let i = 0; i < photoEntries.length; i++) {
        const [shotId, base64Data] = photoEntries[i];
        
        const fetchResponse = await fetch(base64Data as string);
        const blob = await fetchResponse.blob();
        
        const fileName = `${assetId}_${Date.now()}_${shotId}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('inspections')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) throw new Error(`Failed to upload ${shotId} image: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage.from('inspections').getPublicUrl(fileName);
        finalImageUrls.push(publicUrlData.publicUrl);
      }

      // Format notes based on Return or Standard Inspection
      const finalNotes = auditType === 'RETURN' ? `[RETURN REQUEST] ${notes}` : notes;

      const { error: dbError } = await supabase.from('inspections').insert({
        asset_id: assetId,
        inspected_by: empCode, 
        condition: condition,
        notes: finalNotes + '\n[Mobile Photos Verified]',
        status: 'Pending',
        photos: finalImageUrls 
      });

      if (dbError) throw dbError;

      // Update asset status to lock the page
      await supabase.from('assets').update({ inspection_status: 'Pending' }).eq('id', assetId);
      
      setSuccess(true);
      setIsAlreadySubmitted(true);
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 size={48} className="text-purple-500 animate-spin" />
        <h1 className="text-sm font-black text-white uppercase tracking-widest">Securing Connection...</h1>
      </div>
    );
  }

  // 🌟 THE PAGE LOCK SCREEN
  if (isAlreadySubmitted && !success) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Lock size={80} className="text-amber-500" />
        <h1 className="text-3xl font-black text-white">Submission Locked</h1>
        <p className="text-slate-400 font-medium">This asset is currently awaiting administrator review. You cannot submit another audit until the admin clears or requests a re-inspection.</p>
        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-4">You may safely close this tab.</p>
      </div>
    );
  }

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
        <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-2"><Camera size={20} className="text-purple-500"/> Mobile Audit Camera</h1>
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
                <div className="relative rounded-xl overflow-hidden bg-slate-100 group border border-slate-200 h-48">
                  {/* 🌟 AI SAMPLE ANGLE BACKGROUND */}
                  <img src={shot.sample} alt="Sample Angle" className="w-full h-full object-cover opacity-30 grayscale mix-blend-multiply" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <span className="bg-slate-900/60 text-white text-[9px] font-bold px-2 py-1 rounded-md mb-3 backdrop-blur-sm uppercase tracking-widest shadow-sm">Example Angle</span>
                    <label className="flex items-center justify-center px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-transform shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95">
                      <Camera size={20} className="mr-2" />
                      <span className="text-xs font-black uppercase tracking-widest">Open Camera</span>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleCapture(e, shot.id)} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={submitFinalAudit} 
          disabled={!allPhotosTaken || loading}
          className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${allPhotosTaken ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-200 text-slate-400'}`}
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