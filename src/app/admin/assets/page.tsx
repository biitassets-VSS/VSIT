import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FEFAF6' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0710' } 
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
      {/* 🌟 SOFT WHITE/ORANGE BLEND: #FEFAF6 provides a clean, highly readable base */}
      <body className="antialiased bg-[#FEFAF6] dark:bg-[#0B0710] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-1000 relative selection:bg-orange-500/30 selection:text-orange-900 dark:selection:text-orange-100">
        
        {/* 🌟 LOW BRIGHTNESS ORBS: Opacity is down to 10-15% to ensure text remains 100% readable over them */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-15 dark:opacity-40">
          <div className="absolute -left-[10%] w-[50vw] h-[70vh] bg-orange-500 blur-[150px] rounded-full transition-all duration-1000" />
          <div className="absolute -right-[10%] w-[50vw] h-[70vh] bg-purple-600 blur-[150px] rounded-full transition-all duration-1000" />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 HIGH VISIBILITY WATERMARK */}
        <div className="fixed bottom-6 right-6 z-[2147483647] pointer-events-none">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-slate-200 dark:border-white/10 shadow-lg flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 dark:text-slate-300 uppercase">
              Designed by AinodeArt
            </span>
          </div>
        </div>

      </body>
    </html>
  );
}