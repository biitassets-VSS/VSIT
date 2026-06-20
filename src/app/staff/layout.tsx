'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      setIsAuthenticated(true);
    };

    verifyUserSession();

    // 1. Create the realtime listener cleanly BEFORE subscribing
    const channel = supabase
      .channel('staff_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications', 
        },
        (payload) => {
          console.log('New notification received:', payload);
        }
      )
      .subscribe();

    // 2. Clean up the channel on component unmount to prevent double-subscription errors
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
        <p className="text-sm font-bold text-gray-500">Verifying session access...</p>
      </div>
    );
  }

  return <>{children}</>;
}