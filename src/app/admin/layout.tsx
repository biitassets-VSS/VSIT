'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Package, Users, ClipboardCheck, Settings, LogOut 
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const calculatePending = () => {
      const savedData = localStorage.getItem('vsit_assets_inventory');
      if (savedData) {
        const assets = JSON.parse(savedData);
        // Count assets where lastInspection is exactly "Pending"
        const count = assets.filter((asset: any) => asset.lastInspection === 'Pending').length;
        setPendingCount(count);
      }
    };

    // Run once on load
    calculatePending();

    // Listen for custom event whenever we add/edit/delete an asset
    window.addEventListener('inventoryUpdated', calculatePending);
    return () => window.removeEventListener('inventoryUpdated', calculatePending);
  }, []);

  const navLinks = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Assets Inventory', href: '/admin/assets', icon: Package },
    { name: 'Staff & Users', href: '/admin/staff', icon: Users },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-blue-600 flex items-center gap-2">
            <Package size={24} /> IT Admin
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'}/>
                {link.name}
              </Link>
            );
          })}

          {/* INSPECTIONS LINK WITH BADGE */}
          <Link 
            href="/admin/inspections" 
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
              pathname.startsWith('/admin/inspections') ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck size={18} className={pathname.startsWith('/admin/inspections') ? 'text-blue-600' : 'text-gray-400'} />
              <span>Inspections</span>
            </div>
            {/* 🔴 THE PENDING NOTIFICATION BADGE */}
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link 
            href="/admin/settings" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
              pathname.startsWith('/admin/settings') ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Settings size={18} className={pathname.startsWith('/admin/settings') ? 'text-blue-600' : 'text-gray-400'}/> Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
