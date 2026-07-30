import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF4E6' },
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
      {/* 🌟 BASE THEME: Upgraded to a richer, warmer base to eliminate harsh whites */}
      <body className="antialiased bg-[#FFF4E6] dark:bg-[#0C0A09] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-1000 relative selection:bg-orange-500/30 selection:text-orange-900 dark:selection:text-orange-100">
        
        {/* 🌟 GLOBAL AMBIENT LIGHT ENGINE: 
            This sits at the absolute bottom of the app. It provides the deep, 
            rich colors that your transparent glass cards will blur and refract. */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vh] bg-orange-400/15 dark:bg-orange-600/10 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
          <div className="absolute top-[20%] right-[-15%] w-[50vw] h-[50vh] bg-purple-400/10 dark:bg-purple-600/10 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
          <div className="absolute bottom-[-15%] left-[20%] w-[60vw] h-[60vh] bg-rose-400/10 dark:bg-rose-600/5 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
        </div>

        {/* 🌟 GLOBAL NEON OUTER FRAME: Adds a premium, glowing inner-shadow to the browser window */}
        <div className="fixed inset-0 pointer-events-none z-99999 border-2 border-orange-500/15 dark:border-orange-500/10 shadow-[inset_0_0_80px_rgba(249,115,22,0.07)] dark:shadow-[inset_0_0_80px_rgba(249,115,22,0.05)] transition-all duration-1000" />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 UPGRADED WATERMARK: Pure Tinted Glass without rigid white backgrounds */}
        <div className="fixed bottom-5 right-6 text-[9px] sm:text-[10px] font-black tracking-widest text-orange-900/40 dark:text-orange-100/30 z-99999 pointer-events-none uppercase bg-orange-500/5 dark:bg-orange-500/10 backdrop-blur-2xl px-4 py-2 rounded-full border border-orange-500/20 dark:border-orange-500/10 shadow-[0_8px_32px_rgba(249,115,22,0.05)] transition-all duration-500">
          Designed by AinodeArt
        </div>

      </body>
    </html>
  );
}