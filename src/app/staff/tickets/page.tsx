'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Ticket, Loader2, Search } from 'lucide-react';

export default function StaffTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);

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
  };

  useEffect(() => {
    fetchTickets();
    const sub = supabase.channel('staff_tickets_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'open' || s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'in progress') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'resolved' || s === 'closed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My IT Tickets</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Track the status of your hardware and software issues.</p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Ticket size={24}/></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-sm">You have no active IT service tickets.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map(tix => (
              <div key={tix.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 text-lg">{tix.title || tix.subject}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadge(tix.status)}`}>{tix.status || 'Open'}</span>
                  </div>
                  <p className="text-sm text-slate-600 max-w-2xl">{tix.description || tix.note}</p>
                  <div className="flex gap-4 text-xs font-semibold text-slate-400">
                    <span>Category: <span className="text-slate-600">{tix.category}</span></span>
                    <span>Submitted: {new Date(tix.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Ticket ID</p>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-0.5">#{tix.id.split('-')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}