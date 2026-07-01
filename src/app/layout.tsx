import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VSIT - Enterprise Portal',
  description: 'Virtual Staffing IT Infrastructure & Hardware Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="transition-colors duration-500">
      <body className="antialiased bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-500 relative">
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col w-full h-full">
          {children}
        </main>
        
        {/* Global Bottom-Right Watermark */}
        <div className="fixed bottom-4 right-5 text-[10px] sm:text-[11px] font-black tracking-widest text-slate-400/60 dark:text-zinc-500/50 z-[9999] pointer-events-none uppercase">
          Designed by AinodeArt
        </div>

      </body>
    </html>
  );
}