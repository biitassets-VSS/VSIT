import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF4E6' },
    { media: '(prefers-color-scheme: dark)', color: '#0D0914' } 
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
      <body className="antialiased bg-[#FFF4E6] dark:bg-[#0D0914] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-1000 relative selection:bg-purple-500/30 selection:text-purple-900 dark:selection:text-purple-100">
        
        {/* GLOBAL AMBIENT LIGHT ENGINE */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
          <div className="absolute left-[-10%] w-[50vw] h-[70vh] bg-orange-500/20 dark:bg-orange-600/20 blur-[130px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
          <div className="absolute right-[-10%] w-[50vw] h-[70vh] bg-purple-600/20 dark:bg-purple-700/20 blur-[130px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
        </div>

        {/* GLOBAL NEON OUTER FRAME */}
        <div className="fixed inset-0 pointer-events-none z-99999 border-[1.5px] border-orange-500/10 dark:border-white/5 shadow-[inset_0_0_80px_rgba(249,115,22,0.05)] dark:shadow-[inset_0_0_80px_rgba(168,85,247,0.05)] transition-all duration-1000" />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 FULL READABILITY WATERMARK (Maximum Z-Index) */}
        <div className="fixed bottom-6 right-6 text-[10px] sm:text-xs font-black tracking-widest text-slate-800 dark:text-zinc-200 z-2147483647 pointer-events-none uppercase bg-white/60 dark:bg-black/60 backdrop-blur-3xl px-5 py-2.5 rounded-full border border-white/80 dark:border-white/20 shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500">
          Designed by AinodeArt
        </div>

      </body>
    </html>
  );
}