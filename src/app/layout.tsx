import type { Metadata, Viewport } from 'next';
// 🚨 CRITICAL: This line imports Tailwind and your custom theme variables!
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    // Updated to match the new softer top gradient color
    { media: '(prefers-color-scheme: light)', color: '#FDFBF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0A09' }
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
      {/* 🌟 BASE THEME: Replaced flat background with a premium, warm gradient to blend the white out */}
      <body className="antialiased bg-linear-to-br from-[#FDFBF9] via-[#FFF4E6] to-[#FFE8D6] dark:from-[#0C0A09] dark:via-[#140F0A] dark:to-[#1C120C] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-1000 relative selection:bg-orange-500/30 selection:text-orange-900 dark:selection:text-orange-100">
        
        {/* 🌟 GLOBAL AMBIENT LIGHT ENGINE: 
            Increased blur to 160px and adjusted opacity for a softer, wider volumetric glow 
            that perfectly mimics the second screenshot. */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vh] bg-orange-300/30 dark:bg-orange-600/15 blur-[160px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
          <div className="absolute top-[15%] right-[-10%] w-[60vw] h-[60vh] bg-purple-300/25 dark:bg-purple-600/15 blur-[160px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
          <div className="absolute bottom-[-15%] left-[15%] w-[70vw] h-[70vh] bg-rose-300/20 dark:bg-rose-600/10 blur-[160px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
        </div>

        {/* 🌟 GLOBAL NEON OUTER FRAME: Swapped to a subtle glass highlight rim instead of flat orange */}
        <div className="fixed inset-0 pointer-events-none z-999 border-[1.5px] border-white/40 dark:border-white/5 shadow-[inset_0_0_100px_rgba(249,115,22,0.03)] dark:shadow-[inset_0_0_100px_rgba(249,115,22,0.05)] transition-all duration-1000" />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 UPGRADED WATERMARK: Ultra-premium frosted glass with a pure white/translucent border */}
        <div className="fixed bottom-5 right-6 text-[9px] sm:text-[10px] font-black tracking-widest text-orange-900/60 dark:text-orange-100/40 z-999 pointer-events-none uppercase backdrop border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(249,115,22,0.08)] transition-all duration-500">
          Designed by AinodeArt
        </div>

      </body>
    </html>
  );
}