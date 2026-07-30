import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF4E6' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' }
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
      {/* 🌟 UPGRADE: Replaced solid gray with a warm, premium light-orange gradient base */}
      <body className="antialiased bg-gradient-to-br from-[#FDFBF9] via-[#FFF4E6] to-[#FFE8D6] dark:from-[#09090b] dark:via-[#120f14] dark:to-[#1a1217] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-1000 relative">
        
        {/* 🌟 AMBIENT LIGHT ENGINE: Glowing blurred orbs that sit behind the glass UI */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-orange-400/20 dark:bg-orange-600/15 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
          <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vh] bg-purple-400/20 dark:bg-purple-600/15 blur-[140px] rounded-full mix-blend-multiply dark:mix-blend-screen transition-all duration-1000" />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full relative z-10">
          {children}
        </main>
        
        {/* 🌟 WATERMARK: Removed background, made text highly visible but elegant */}
        <div className="fixed bottom-4 right-5 text-[10px] sm:text-[11px] font-black tracking-widest text-orange-600/50 dark:text-orange-400/50 z-[9999] pointer-events-none uppercase">
          Designed by AinodeArt
        </div>

      </body>
    </html>
  );
}