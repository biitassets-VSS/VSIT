'use client';

import React, { useState } from 'react';
import { Loader2, MonitorCheck, Maximize2 } from 'lucide-react';

interface RemoteDesktopViewerProps {
  targetId: string;
  targetName: string;
}

export default function RemoteDesktopViewer({ targetId, targetName }: RemoteDesktopViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 IMPORTANT: Replace this URL with your actual self-hosted RustDesk Web Client URL
  // If you are using another web-based tool, put that URL here.
  const webClientUrl = `https://your-rustdesk-web-client-url.com/?id=${targetId}`;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
      {/* Viewer Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <MonitorCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{targetName}'s Screen</h3>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">CONNECTION ID: {targetId}</p>
          </div>
        </div>
        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* iframe Container */}
      <div className="relative flex-1 bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Establishing secure tunnel...</p>
          </div>
        )}
        
        {/* The actual remote screen iframe */}
        <iframe 
          src={webClientUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-none relative z-10"
          allow="clipboard-read; clipboard-write; display-capture"
          title={`Remote connection to ${targetName}`}
        />
      </div>
    </div>
  );
}