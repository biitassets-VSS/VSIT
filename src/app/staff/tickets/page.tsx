'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Ticket, ClipboardList, CheckCircle2, ArrowLeft, Loader2, X, Upload } from 'lucide-react';

function ITTicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [note, setNote] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTicketHistory();
    // ⚡ DASHBOARD INTERCEPTOR: Instantly open the form if clicked from the home shortcut
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const fetchTicketHistory = async () => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setTicketHistory([
          { id: 'tck-1', title: 'Keyboard keys unresponsive', category: 'Hardware', note: 'The spacebar and E key are failing.', status: 'in_repair', created_at: new Date().toISOString() },
          { id: 'tck-2', title: 'VPN disconnecting constantly', category: 'Internet', note: 'Drops every 10 minutes.', status: 'resolved', created_at: new Date().toISOString() }
        ]);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userEmail = user.email || 'migration_canberra.bi@outlook.com';

      const { data } = await supabase
        .from('tickets')
        .select('*')
        .or(`raised_by.eq.${user.id},raised_by.eq.${userEmail}`)
        .order('created_at', { ascending: false });

      if (data) setTicketHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        const newMock = { id: `tck-${Date.now()}`, title, category, note, status: 'pending', created_at: new Date().toISOString() };
        setTicketHistory(prev => [newMock, ...prev]);
        setTitle('');
        setNote('');
        setSuccessMessage('Demo service ticket submitted successfully!');
        setTimeout(() => { setIsModalOpen(false); setSuccessMessage(''); router.replace('/staff/tickets'); }, 1200);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('tickets').insert([
        { title, category, note, status: 'pending', raised_by: user.email }
      ]);
      if (error) throw error;

      setTitle('');
      setNote('');
      setSuccessMessage('IT service ticket submitted successfully!');
      fetchTicketHistory();
      setTimeout(() => { setIsModalOpen(false); setSuccessMessage(''); router.replace('/staff/tickets'); }, 1200);
    } catch (err: any) {
      alert(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const cleanStatus = status?.toLowerCase();
    if (cleanStatus === 'resolved' || cleanStatus === 'completed') return <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-200">Resolved</span>;
    if (cleanStatus === 'in_repair') return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-200">In Repair</span>;
    return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-200">Pending Review</span>;
  };

  if (isLoading) return <div className="w-full h-96 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/staff')} className="p-2.5 hover:bg-gray-50 rounded-xl border border-gray-100 text-gray-600"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">MY IT TICKETS DETAILS</h1>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Track your active IT service desk queries and resolutions</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"><Ticket size={16} /> Raise New Ticket</button>
      </div>

      {/* TICKET LOGS LISTING */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2 bg-gray-50/20"><ClipboardList size={18} className="text-[#ff9800]" /><h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">Historical Ticket Records Log</h2></div>
        <div className="p-6">
          {ticketHistory.length === 0 ? (
            <div className="text-center py-16"><CheckCircle2 size={36} className="text-gray-300 mx-auto mb-2" /><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">No historical service tickets logged.</p></div>
          ) : (
            <div className="space-y-3">
              {ticketHistory.map((t) => (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/60 gap-3 hover:bg-gray-100/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-gray-900">{t.title}</span>
                      <span className="text-[10px] text-gray-400 font-bold">[{t.category}] ({new Date(t.created_at).toLocaleDateString()})</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-3xl">{t.note}</p>
                  </div>
                  <div className="sm:text-right shrink-0">{getStatusBadge(t.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FORM OVERLAY DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-gray-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2"><Ticket size={16} className="text-blue-500" /> Raise IT Service Ticket</h3>
              {/* Clean Close Handler resetting URL query string parameters perfectly */}
              <button type="button" onClick={() => { setIsModalOpen(false); router.replace('/staff/tickets'); }} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18}/></button>
            </div>

            {successMessage && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl text-center font-bold">{successMessage}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">What is the issue title?</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Describe the issue briefly" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 focus:bg-white text-gray-800" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">Select Category Type</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-orange-500">
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Internet">Internet</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">Brief Notes Explanations</label>
                <textarea rows={3} required value={note} onChange={e => setNote(e.target.value)} placeholder="Explain the problem details..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 focus:bg-white text-gray-800" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">Share Error Screenshot (Optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                  <Upload size={18} className="mx-auto text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500 font-bold">Upload Snapshot Image</span>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Service Ticket'}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ITTicketsPage() {
  return (
    <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}>
      <ITTicketsContent />
    </Suspense>
  );
}