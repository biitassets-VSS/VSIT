// src/components/RemoteDesktopViewer.tsx
'use client';

import React, { useState } from 'react';
import { Loader2, MonitorCheck, Maximize2, ServerCrash } from 'lucide-react';

interface RemoteDesktopViewerProps {
  targetId: string;
  targetName: string;
  onMaximize?: () => void;
}

export default function RemoteDesktopViewer({ targetId, targetName, onMaximize }: RemoteDesktopViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  // 🔴 IMPORTANT: Replace this with your actual RustDesk Web Client URL later!
  const webClientUrl = `https://your-rustdesk-web-client-url.com/?id=${targetId}`;
  
  // Checking if you are still using the placeholder URL
  const isPlaceholderUrl = webClientUrl.includes('your-rustdesk-web-client-url.com');

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
        {/* Maximize Button to trigger Sidebar Collapse */}
        <button 
          onClick={onMaximize}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Toggle Fullscreen Width"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Screen Container */}
      <div className="relative flex-1 bg-black">
        {isPlaceholderUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-950 p-8 text-center">
            <ServerCrash className="text-rose-500 mb-2" size={48} />
            <h3 className="text-lg font-bold text-white">Server URL Not Configured</h3>
            <p className="text-xs font-medium max-w-sm">
              The RustDesk Web Client URL is currently set to a placeholder. Once you host your RustDesk web client, replace the <code className="bg-slate-800 px-1 rounded">webClientUrl</code> variable in the code to view live screens.
            </p>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">Establishing secure tunnel...</p>
              </div>
            )}
            <iframe 
              src={webClientUrl}
              onLoad={() => setIsLoading(false)}
              className="w-full h-full border-none relative z-10"
              allow="clipboard-read; clipboard-write; display-capture"
              title={`Remote connection to ${targetName}`}
            />
          </>
        )}
      </div>
    </div>
  );
}