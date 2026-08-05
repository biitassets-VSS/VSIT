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
      <body className="antialiased bg-[#FCF9F5] text-slate-900 min-h-screen flex flex-col relative selection:bg-purple-500/30 selection:text-purple-900">
        
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center opacity-20">
          <div className="absolute left-[-10%] w-[50vw] h-[70vh] bg-orange-500 blur-[180px] rounded-full" />
          <div className="absolute right-[-10%] w-[50vw] h-[70vh] bg-purple-600 blur-[180px] rounded-full" />
        </div>

        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>

        {/* 🌟 CRISP, CLEAR WATERMARK: No shadows, no blur. Uses your Orange/Purple theme as a clean transparent gradient */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-2147483647 pointer-events-none select-none">
          <span className="text-[10px] sm:text-[11px] font-black tracking-widest bg-linear-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent opacity-70 dark:from-orange-400 dark:to-purple-400 dark:opacity-80">
            Designed by AinodeArt
          </span>
        </div>

      </body>
    </html>
  );
}