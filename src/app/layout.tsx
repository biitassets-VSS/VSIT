import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IT Assets Management System',
  description: 'Virtual Staffing Solutions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} relative min-h-screen`}>
        {children}

        {/* GLOBAL FLOATING COPYRIGHT FOR EVERY SINGLE PAGE */}
        <div className="fixed bottom-4 right-6 z-[9999] pointer-events-none">
          <p className="text-[11px] font-medium text-gray-500 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
            Design by <span className="text-orange-500 font-bold tracking-wide">AinodeArt</span>
          </p>
        </div>
        
      </body>
    </html>
  );
}