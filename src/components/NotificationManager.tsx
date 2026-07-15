'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BellRing, Check } from 'lucide-react';

export default function NotificationManager({ userId, userRole = 'staff' }: { userId: string, userRole?: string }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check current permission on load
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
  };

  const triggerAlert = (title: string, body: string) => {
    // 1. Play Sound
    try {
      const audio = new Audio('/alert.mp3');
      audio.play().catch(e => console.log("Audio play blocked by browser:", e));
    } catch (err) {}

    // 2. Show Native OS Notification
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/logo.png', // Uses your PWA icon
        badge: '/logo.png',
        vibrate: [200, 100, 200] // Vibrates on Android
      } as any); // <-- TypeScript bypass added here
    }
  };

  useEffect(() => {
    if (!userId || userId === 'guest-mock-uuid') return;

    // Listen for Personal Staff Alerts (Asset updates, Tickets)
    const notifSub = supabase
      .channel('realtime:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `target_user=eq.${userId}` 
      }, (payload) => {
        triggerAlert(payload.new.title, payload.new.message);
      })
      .subscribe();

    // Listen for Global Admin Broadcasts
    const broadcastSub = supabase
      .channel('realtime:broadcasts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'broadcasts' 
      }, (payload) => {
        triggerAlert('📣 Company Announcement', payload.new.message);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notifSub);
      supabase.removeChannel(broadcastSub);
    };
  }, [userId]);

  // If permission is already granted, we can hide the button to keep the UI clean
  if (permission === 'granted') return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-sm animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <BellRing size={20} className="animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900">Enable Desktop Alerts</h4>
          <p className="text-xs font-medium text-indigo-700 mt-0.5">Get instantly notified when admins update your tickets or send announcements.</p>
        </div>
      </div>
      <button 
        onClick={requestPermission}
        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors shrink-0 shadow-sm"
      >
        Enable Notifications
      </button>
    </div>
  );
}