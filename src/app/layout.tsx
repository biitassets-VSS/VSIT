import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF9F2' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ],
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
    <html lang="en" className="transition-colors duration-1000">
      {/* 🌟 BASE THEME: Sets the absolute foundation for the Light Orange / Dark Glass themes */}
      <body className="antialiased bg-[#FFF9F2] dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-1000 relative selection:bg-purple-500/30 selection:text-purple-900 dark:selection:text-purple-100">
        
        {/* 🌟 GLOBAL NEON OUTER FRAME: Adds a subtle glowing border/inner-shadow to the entire viewport */}
        <div className="fixed inset-0 pointer-events-none z-99999 border-[1.5px] border-purple-500/10 dark:border-orange-500/10 shadow-[inset_0_0_60px_rgba(168,85,247,0.05)] dark:shadow-[inset_0_0_60px_rgba(249,115,22,0.05)] transition-all duration-1000" />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 UPGRADED WATERMARK: Premium Frosted Glass Pill */}
        <div className="fixed bottom-4 right-5 text-[9px] sm:text-[10px] font-black tracking-widest text-slate-500/60 dark:text-zinc-500/60 z-99999 pointer-events-none uppercase bg-white/20 dark:bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/40 dark:border-white/10 shadow-sm transition-all duration-500">
          Designed by AinodeArt
        </div>

      </body>
    </html>
  );
}