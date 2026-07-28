import type { Metadata, Viewport } from 'next';
import { Download, Monitor } from 'lucide-react';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'VSIT - Enterprise Portal',
  description: 'Virtual Staffing IT Infrastructure & Hardware Management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VSIT Portal',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="transition-colors duration-500">
      <body className="antialiased bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-500 relative">
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full">
          {children}
        </main>

        {/* 💻 GLOBAL FLOATING WINDOWS APP DOWNLOAD BUTTON (Bottom-Left) */}
        <div className="fixed bottom-4 left-5 z-50">
          <a
            href="https://github.com/biitassets-VSS/VSIT/releases/download/v0.1.0/Virtual.Staffing.Portal.Setup.0.1.0.exe" // 👈 Replace with your direct GitHub release or .exe URL
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-black dark:bg-purple-600 dark:hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 border border-slate-700 dark:border-purple-500 group"
            title="Download Virtual Staffing Solutions Windows App (.exe)"
          >
            <Monitor size={15} className="text-orange-400 group-hover:animate-pulse shrink-0" />
            <span className="hidden sm:inline">Download Desktop App (.exe)</span>
            <span className="sm:hidden">App (.exe)</span>
            <Download size={14} className="opacity-80 shrink-0" />
          </a>
        </div>
        
        {/* Global Bottom-Right Watermark */}
        <div className="fixed bottom-4 right-5 text-[10px] sm:text-[11px] font-black tracking-widest text-slate-400/60 dark:text-zinc-500/50 z-50 pointer-events-none uppercase">
          Designed by AinodeArt
        </div>

      </body>
    </html>
  );
}