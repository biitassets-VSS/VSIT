'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle } from 'lucide-react';

export default function NewInspectionForm() {
  const [formData, setFormData] = useState({
    assetId: '',
    condition: 'Good',
    notes: '',
  });
  
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const currentDateTime = new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });

      const fontSize = canvas.width * 0.04; 
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 1)'; 
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      const padding = canvas.width * 0.04;
      ctx.fillText(currentDateTime, canvas.width - padding, canvas.height - padding);

      const watermarkedImage = canvas.toDataURL('image/jpeg', 0.9);
      setPhotoUrl(watermarkedImage);
    };

    img.src = URL.createObjectURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) {
      alert("Please capture a photo before saving the inspection.");
      return;
    }
    alert('Inspection and Watermarked Photo Saved Successfully!');
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.1)]',
    glassInner: isDarkMode 
      ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner' 
      : 'bg-white/50 backdrop-blur-xl border border-white/80 shadow-sm',
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/10 text-white focus:border-purple-500/50' 
      : 'bg-white/50 border border-white/60 text-slate-900 focus:bg-white/70 focus:ring-4 focus:ring-purple-500/10',
  };

  return (
    <div className={`min-h-screen ${theme.bg} p-6 font-sans relative z-0 transition-colors duration-1000`}>
      <div className="fixed top-[-10%] left-[-5%] w-[50vw] h-[50vh] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      <div className="max-w-3xl mx-auto space-y-6 pb-12 relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-black ${theme.textMain}`}>New Inspection</h1>
            <p className={`text-xs font-semibold ${theme.textSub}`}>Log asset conditions and capture live photos.</p>
          </div>
          <Link href="/admin/inspections" className={`px-5 py-2.5 ${theme.glassInner} ${theme.textMain} hover:scale-105 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm`}>
            Back
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`${theme.glassCard} p-6 rounded-3xl space-y-4`}>
            <h2 className={`text-sm font-black uppercase tracking-widest ${theme.textMain} border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'} pb-3`}>Inspection Details</h2>
            
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Asset ID / Name *</label>
              <input type="text" name="assetId" required value={formData.assetId} onChange={handleChange} placeholder="e.g. LPT-204" className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all ${theme.inputBg}`} />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Condition *</label>
              <select name="condition" value={formData.condition} onChange={handleChange} className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all cursor-pointer ${theme.inputBg}`}>
                <option value="Excellent" className="dark:bg-zinc-900">Excellent</option>
                <option value="Good" className="dark:bg-zinc-900">Good</option>
                <option value="Fair" className="dark:bg-zinc-900">Fair (Needs minor repair)</option>
                <option value="Poor" className="dark:bg-zinc-900">Poor (Needs replacement)</option>
              </select>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Inspector Notes</label>
              <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} placeholder="Any visible damage?" className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all resize-none ${theme.inputBg}`} />
            </div>
          </div>

          <div className={`${theme.glassCard} p-6 rounded-3xl text-center flex flex-col items-center`}>
            <h2 className="text-lg font-black text-purple-500 mb-2">Live Photo Capture</h2>
            <p className={`text-xs font-semibold ${theme.textSub} mb-6 max-w-sm`}>Take a photo of the asset. The exact date and time will be permanently watermarked.</p>
            
            <input type="file" accept="image/*" capture="environment" onChange={handleCapture} ref={fileInputRef} className="hidden" />

            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-linear-to-r from-purple-500 to-purple-600 hover:opacity-90 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 border border-purple-400/50 cursor-pointer">
              <Camera size={20} /> Open Camera
            </button>

            {photoUrl && (
              <div className="mt-8">
                <p className={`text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center justify-center gap-1.5`}><CheckCircle size={14}/> Watermark Applied</p>
                <div className={`p-2 ${theme.glassInner} rounded-3xl inline-block shadow-lg`}>
                  <img src={photoUrl} alt="Inspection" className="w-full max-w-md h-auto rounded-2xl" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-linear-to-r from-emerald-500 to-emerald-600 hover:opacity-90 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/25 transition-all active:scale-95 border border-emerald-400/50 cursor-pointer w-full sm:w-auto">
              Save Secure Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}