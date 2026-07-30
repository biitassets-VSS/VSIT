import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#FFF4E6',
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
      {/* 🌟 BASE THEME: Pure Light Orange/Cream background. No black colors. */}
      <body className="antialiased bg-[#FFF4E6] text-slate-900 min-h-screen flex flex-col relative selection:bg-purple-500/30 selection:text-purple-900">
        
        {/* 🌟 EXTREMELY SOFT AMBIENT LIGHT: Low opacity, high blur, no harsh saturation */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-30">
          <div className="absolute left-[-10%] w-[50vw] h-[70vh] bg-orange-400/50 blur-[160px] rounded-full" />
          <div className="absolute right-[-10%] w-[50vw] h-[70vh] bg-purple-400/50 blur-[160px] rounded-full" />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 HIGH VISIBILITY WATERMARK: Frosted white glass, sharp text */}
        <div className="fixed bottom-6 right-6 z-2147483647 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-2xl px-5 py-2.5 rounded-full border border-white/60 shadow-lg flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-slate-800 uppercase">
              Designed by AinodeArt
            </span>
          </div>
        </div>

      </body>
    </html>
  );
}