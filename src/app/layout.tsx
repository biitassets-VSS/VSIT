import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FCF8F3' },
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
      <body className="antialiased bg-[#FCF8F3] dark:bg-[#0D0914] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-1000 relative selection:bg-purple-500/30 selection:text-purple-900 dark:selection:text-purple-100">
        
        {/* 🌟 SOFT AMBIENT LIGHT ENGINE: Smooth, colorful background orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-70 dark:opacity-100">
          <div className="absolute -left-[10%] w-[50vw] h-[70vh] bg-orange-400/30 dark:bg-orange-600/20 blur-[120px] rounded-full transition-all duration-1000" />
          <div className="absolute -right-[10%] w-[50vw] h-[70vh] bg-purple-400/30 dark:bg-purple-700/20 blur-[120px] rounded-full transition-all duration-1000" />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 HIGH VISIBILITY WATERMARK: Fixed to Bottom-Right across the entire portal */}
        <div className="fixed bottom-6 right-6 z-[2147483647] pointer-events-none">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl px-5 py-2.5 rounded-full border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 dark:text-zinc-200 uppercase">
              Designed by AinodeArt
            </span>
          </div>
        </div>

      </body>
    </html>
  );
}