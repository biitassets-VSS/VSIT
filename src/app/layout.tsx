import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// 🚀 PERFORMANCE FIX: Preloads the Inter font at the server level to prevent layout shifts
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap', // Ensures text remains visible while webfont is loading
});

// 📱 MOBILE OPTIMIZATION: Prevents users from accidentally zooming in when tapping buttons
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#002B49', // Sets the top mobile browser bar to match your brand color
};

// 🌍 SEO & METADATA: Controls how your app looks when shared in Slack/WhatsApp
export const metadata: Metadata = {
  title: 'Virtual Staffing | IT Asset Management',
  description: 'Enterprise IT Asset Verification and Tracking Dashboard',
  appleWebApp: {
    title: 'VSIT Assets',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      {/* 🎨 ENTERPRISE STYLING APPLIED GLOBALLY:
        - antialiased: Makes text ultra-crisp
        - bg-[#F8FAFC]: The professional "slate" background
        - text-gray-900: Pure contrast text
      */}
      <body className={`${inter.variable} font-sans antialiased bg-[#F8FAFC] text-gray-900 min-h-screen selection:bg-blue-200 selection:text-blue-900`}>
        {/* Main App Content Injection */}
        <main className="w-full h-full">
          {children}
        </main>
      </body>
    </html>
  );
}