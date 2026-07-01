'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function DemoLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark'); 
  }, []);

  const handleDemoEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // No actual database auth required for guests. Just delay for effect and route.
    setTimeout(() => {
      router.push('/demo');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans antialiased">
      <div className="relative w-full max-w-md">
        
        {/* 🌟 NEON GLOW EFFECT BACKGROUND */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 rounded-[2.5rem] blur-md opacity-75 animate-pulse"></div>
        
        {/* MAIN CARD */}
        <div className="relative bg-[#121212] rounded-[2rem] p-8 md:p-10 border border-[#27272a] shadow-2xl flex flex-col items-center">
          
          <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.5)]">
            <PlayCircle size={28} />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-zinc-100">Guest Demo</h1>
          <p className="text-sm font-semibold tracking-wide text-zinc-400 mb-8 text-center">Explore the system with read-only access</p>

          <form onSubmit={handleDemoEntry} className="w-full space-y-5">
            <button type="submit" disabled={loading} className="w-full py-4 mt-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all disabled:opacity-70">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Preparing Demo...</> : <>Enter Demo Mode <ArrowRight size={16} /></>}
            </button>
            <p className="text-[10px] text-center font-semibold uppercase tracking-widest text-zinc-500 mt-4">
              No password required
            </p>
          </form>
          
        </div>
      </div>
    </div>
  );
}