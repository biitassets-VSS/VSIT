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
      {/* 
        Added flex, flex-col, and dark mode baseline classes 
        to ensure the footer stays at the bottom and themes work globally 
      */}
      <body className="antialiased bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 min-h-screen flex flex-col transition-colors duration-500">
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative">
          {children}
        </main>
        
        {/* Global Copyright Footer */}
        <footer className="w-full py-4 text-center text-[11px] font-semibold tracking-wider text-slate-500 dark:text-zinc-600 z-50">
          Copyright © {new Date().getFullYear()} AinodeArt
        </footer>

      </body>
    </html>
  );
}