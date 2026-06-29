'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Ticket, Loader2, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';

export default function StaffTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notification, setNotification] = useState<{show: boolean, msg: string}>({show: false, msg: ''});

  const showNotification = (msg: string) => {
    setNotification({ show: true, msg });
    setTimeout(() => setNotification({ show: false, msg: '' }), 5000);
  };

  const fetchTickets = async () => {
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) return;
    
    let email = sessionStr;
    try { email = JSON.parse(sessionStr).email; } catch(e) {}
    const cleanEmail = email?.toLowerCase().trim();

    // Fetch tickets that are NOT asset requests
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .ilike('created_by', cleanEmail)
      .not('title', 'ilike', '%Asset Request%')
      .order('created_at', { ascending: false });

    if (data) setTickets(data);
    setLoading(false);
    return cleanEmail; // return for the realtime listener
  };

  useEffect(() => {
    // 🌟 GLOBAL THEME SYNC
    const savedTheme = localStorage.getItem('vsit_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // 🚀 INITIAL FETCH & REALTIME ALERTS
    const setupRealtime = async () => {
      const userEmail = await fetchTickets();

      const sub = supabase.channel('staff_tickets_page')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => {
          const newTix = payload.new as any;
          const oldTix = payload.old as any;

          // Only trigger alert if the updated ticket belongs to the logged-in staff member
          if (newTix.created_by?.toLowerCase() === userEmail) {
            
            // 1. Check if Admin added/changed a note
            if (newTix.admin_notes !== oldTix.admin_notes && newTix.admin_notes) {
              showNotification(`IT Admin responded: "${newTix.admin_notes}"`);
            } 
            // 2. Check if Status changed
            else if (newTix.status !== oldTix.status) {
              showNotification(`Your ticket status changed to: ${newTix.status.toUpperCase()}`);
            }

            // Auto-refresh the list
            fetchTickets();
          }
        })
        .subscribe();

      return sub;
    };

    const subscriptionPromise = setupRealtime();

    return () => { 
      subscriptionPromise.then(sub => supabase.removeChannel(sub)); 
    };
  }, []);

  // 🎨 Carbon/Slate Aware Badges
  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'open' || s === 'pending') return isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'in progress') return isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'resolved' || s === 'closed') return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return isDarkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-50 text-slate-600 border-slate-200';
  };

  // 🌟 MASTER THEME DICTIONARY
  const theme = {
    bg: isDarkMode ? 'bg-zinc-950' : 'bg-slate-50',
    card: isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200/80',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    cardHover: isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50',
    divider: isDarkMode ? 'divide-zinc-800' : 'divide-slate-100',
  };

  if (loading) return (
    <div className={`flex h-[60vh] items-center justify-center ${theme.bg}`}>
      <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-blue-400' : 'text-indigo-600'}`} />
    </div>
  );

  return (
    <div className={`space-y-6 antialiased font-sans ${theme.bg} min-h-[80vh] p-4 md:p-6 rounded-3xl`}>
      
      {/* 🔔 GLOBAL TOAST NOTIFICATION */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${notification.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl border bg-blue-600 text-white border-blue-500 font-semibold text-sm">
          <ShieldCheck size={18} />
          {notification.msg}
        </div>
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${theme.textMain}`}>My IT Tickets</h1>
          <p className={`text-sm font-medium mt-1 ${theme.textSub}`}>Track the status of your hardware and software issues.</p>
        </div>
        <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-50 text-indigo-600'}`}>
          <Ticket size={24}/>
        </div>
      </div>

      {/* TICKETS LIST */}
      <div className={`${theme.card} rounded-3xl border shadow-sm overflow-hidden transition-colors`}>
        {tickets.length === 0 ? (
          <div className={`p-12 text-center font-medium text-sm ${theme.textSub}`}>You have no active IT service tickets.</div>
        ) : (
          <div className={`divide-y ${theme.divider}`}>
            {tickets.map(tix => (
              <div key={tix.id} className={`p-6 transition-colors flex flex-col sm:flex-row justify-between gap-6 ${theme.cardHover}`}>
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className={`font-bold text-lg ${theme.textMain}`}>{tix.title || tix.subject}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                  </div>
                  
                  <p className={`text-sm max-w-2xl ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                    {tix.description || tix.note}
                  </p>
                  
                  <div className={`flex gap-4 text-xs font-semibold ${theme.textSub}`}>
                    <span>Category: <span className={theme.textMain}>{tix.category}</span></span>
                    <span>Submitted: {new Date(tix.created_at).toLocaleDateString('en-IN')}</span>
                  </div>

                  {/* 🚨 ADMIN RESPONSE & RESOLUTION SECTION */}
                  {(tix.admin_notes || tix.resolution || tix.resolution_notes) && (
                    <div className={`mt-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-blue-950/30 border-blue-900/50' : 'bg-blue-50/50 border-blue-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <ShieldCheck size={12} strokeWidth={3} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                          IT Admin Response
                        </span>
                      </div>
                      <p className={`text-sm font-medium pl-8 ${isDarkMode ? 'text-blue-100' : 'text-slate-700'}`}>
                        {tix.admin_notes || tix.resolution || tix.resolution_notes}
                      </p>
                    </div>
                  )}

                </div>

                <div className="text-left sm:text-right shrink-0">
                  <p className={`text-[10px] font-bold tracking-widest uppercase ${theme.textSub}`}>Ticket ID</p>
                  <p className={`text-xs font-mono font-bold mt-0.5 ${theme.textMain}`}>#{tix.id.split('-')[0]}</p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}