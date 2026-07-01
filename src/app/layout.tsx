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
      <body className="antialiased bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-500">
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative w-full h-full">
          {children}
        </main>
        
        {/* Global Footer */}
        <footer className="w-full py-3 text-center text-[12px] font-bold tracking-widest text-slate-400 dark:text-zinc-600 z-[9999] shrink-0 bg-transparent">
          Designed by AinodeArt
        </footer>

      </body>
    </html>
  );
}