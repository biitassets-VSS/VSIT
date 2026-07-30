import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#FCF9F5',
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
    <html lang="en">
      {/* 🌟 DECREASED BRIGHTNESS: Very soft, soothing cream base */}
      <body className="antialiased bg-[#FCF9F5] text-slate-900 min-h-screen flex flex-col relative selection:bg-purple-500/30 selection:text-purple-900">
        
        {/* 🌟 EXTREMELY SOFT AMBIENT LIGHT: Low opacity (20%), massive blur for eye comfort */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-20">
          <div className="absolute left-[-10%] w-[50vw] h-[70vh] bg-orange-500 blur-[180px] rounded-full" />
          <div className="absolute right-[-10%] w-[50vw] h-[70vh] bg-purple-600 blur-[180px] rounded-full" />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 HIGH VISIBILITY WATERMARK: Larger text, frosted white glass pill */}
        <div className="fixed bottom-6 right-6 z-2147483647 pointer-events-none">
          <div className="bg-white/60 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/80 shadow-sm flex items-center justify-center">
            <span className="text-[11px] sm:text-xs font-black tracking-widest text-slate-800 uppercase drop-shadow-sm">
              Designed by AinodeArt
            </span>
          </div>
        </div>

      </body>
    </html>
  );
}