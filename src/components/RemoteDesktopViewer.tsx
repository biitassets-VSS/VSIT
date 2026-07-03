// src/components/RemoteDesktopViewer.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2, MonitorCheck, Maximize, Minimize, PanelLeftClose } from 'lucide-react';

interface RemoteDesktopViewerProps {
  targetId: string;
  targetName: string;
  onMaximize?: () => void;
}

export default function RemoteDesktopViewer({ targetId, targetName, onMaximize }: RemoteDesktopViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Ref for the container we want to make fullscreen
  const viewerRef = useRef<HTMLDivElement>(null);

  // Your actual RustDesk Web Client URL
  const webClientUrl = `https://vsit-teal.vercel.app/?id=${targetId}`;

  // Listen for the "Esc" key native fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Native HTML5 Fullscreen Toggle
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await viewerRef.current?.requestFullscreen();
      } catch (err) {
        console.error("Error attempting to enable fullscreen:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  return (
    <div 
      ref={viewerRef} 
      className="w-full h-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800"
    >
      {/* Viewer Header (Hidden in Fullscreen for maximum immersion) */}
      {!isFullscreen && (
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
          
          {/* View Controls */}
          <div className="flex items-center gap-1.5">
            {onMaximize && (
              <button 
                onClick={onMaximize}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold"
                title="Toggle Directory Sidebar"
              >
                <PanelLeftClose size={16} /> 
                <span className="hidden sm:inline">Sidebar</span>
              </button>
            )}

            <button 
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold"
              title="Enter Fullscreen"
            >
              <Maximize size={16} />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Container */}
      <div className="relative flex-1 bg-black">
        
        {/* 🌟 WATERMARK OVERLAY */}
        <div className="absolute bottom-6 right-6 z-50 pointer-events-none select-none">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl flex flex-col items-end shadow-2xl">
            <span className="text-white/90 font-bold text-sm tracking-wide">
              {targetName}
            </span>
            <span className="text-white/60 font-mono text-[10px] tracking-wider uppercase mt-0.5">
              EMP ID: {targetId}
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-950">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Establishing secure tunnel...</p>
          </div>
        )}
        
        {/* Native Fullscreen Exit Button (Only shows when in Fullscreen) */}
        {isFullscreen && (
          <button 
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-xl transition-colors shadow-2xl flex items-center gap-2 text-xs font-bold"
          >
            <Minimize size={16} /> Exit Fullscreen
          </button>
        )}

        {/* Remote Desktop Iframe */}
        <iframe 
          src={webClientUrl}
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-none relative z-10"
          allow="clipboard-read; clipboard-write; display-capture; fullscreen"
          title={`Remote connection to ${targetName}`}
        />
      </div>
    </div>
  );
}