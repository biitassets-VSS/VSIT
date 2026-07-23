'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle, Loader2 } from 'lucide-react';

export default function StaffRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    if (!sessionStr) return;
    
    let email = sessionStr;
    try { email = JSON.parse(sessionStr).email; } catch(e) {}

    // Fetch tickets that specifically contain "Request" in the title
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .ilike('created_by', email?.toLowerCase().trim())
      .ilike('title', '%Asset Request%')
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const sub = supabase.channel('staff_reqs_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const getBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'approved' || s === 'allocated') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Asset Requests</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Track the status of your requested equipment and gear.</p>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><PlusCircle size={24}/></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium text-sm">You have no pending asset requests.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map(req => (
              <div key={req.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 text-lg">{req.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBadge(req.status)}`}>{req.status || 'Pending'}</span>
                  </div>
                  <p className="text-sm text-slate-600">Reason: {req.description || req.note}</p>
                  <div className="text-xs font-semibold text-slate-400">
                    Requested on {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}