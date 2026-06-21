'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle, ClipboardList, CheckCircle2, ArrowLeft, Loader2, X } from 'lucide-react';

function AssetRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('Laptop');
  const [note, setNote] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const assetCategories = ['Laptop', 'Headphone', 'Keyboard', 'Mouse', 'Cleaning Kits', 'Mouse Pad', 'Laptop Stand', 'Other'];

  useEffect(() => {
    fetchRequestHistory();
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const fetchRequestHistory = async () => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setRequestHistory([
          { id: 'req-1', category: 'Laptop Stand', note: 'Need an ergonomic stand for the desk setup.', status: 'approved', created_at: new Date().toISOString() },
          { id: 'req-2', category: 'Headphone', note: 'Current pair has microphone static issue.', status: 'pending', created_at: new Date().toISOString() }
        ]);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userEmail = user.email || 'migration_canberra.bi@outlook.com';

      const { data } = await supabase
        .from('asset_requests')
        .select('*')
        .or(`requested_by.eq.${user.id},requested_by.eq.${userEmail}`)
        .order('created_at', { ascending: false });

      if (data) setRequestHistory(data);
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
        const newMock = { id: `req-${Date.now()}`, category, note, status: 'pending', created_at: new Date().toISOString() };
        setRequestHistory(prev => [newMock, ...prev]);
        setNote('');
        setSuccessMessage('Demo allocation request submitted successfully!');
        setTimeout(() => { setIsModalOpen(false); setSuccessMessage(''); router.replace('/staff/requests'); }, 1200);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('asset_requests').insert([{ category, note, status: 'pending', requested_by: user.email }]);
      if (error) throw error;

      setNote('');
      setSuccessMessage('Asset allocation request filed successfully!');
      fetchRequestHistory();
      setTimeout(() => { setIsModalOpen(false); setSuccessMessage(''); router.replace('/staff/requests'); }, 1200);
    } catch (err: any) {
      alert(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const cleanStatus = status?.toLowerCase();
    if (cleanStatus === 'approved' || cleanStatus === 'completed') return <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-200">Approved</span>;
    if (cleanStatus === 'rejected') return <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200">Rejected</span>;
    return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-200">Pending Review</span>;
  };

  if (isLoading) return <div className="w-full h-96 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/staff')} className="p-2.5 hover:bg-gray-50 rounded-xl border border-gray-100 text-gray-600"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-xl font-black text-[#002B49] uppercase tracking-wide">Asset Requests Details</h1>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Track allocation validation logs and historical records</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"><PlusCircle size={16} /> Request New Asset</button>
      </div>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2 bg-gray-50/20"><ClipboardList size={18} className="text-[#ff9800]" /><h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">Asset Allocation Request Logs</h2></div>
        <div className="p-6">
          {requestHistory.length === 0 ? (
            <div className="text-center py-16"><CheckCircle2 size={36} className="text-gray-300 mx-auto mb-2" /><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">No historical allocation requests logged.</p></div>
          ) : (
            <div className="space-y-3">
              {requestHistory.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/60 gap-3 hover:bg-gray-100/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2"><span className="text-sm font-extrabold text-gray-900">{req.category}</span><span className="text-[10px] text-gray-400 font-bold">({new Date(req.created_at).toLocaleDateString()})</span></div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-3xl">{req.note}</p>
                  </div>
                  <div className="sm:text-right shrink-0">{getStatusBadge(req.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-gray-100 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100"><h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2"><PlusCircle size={16} className="text-emerald-500" /> Request Asset Allocation</h3><button type="button" onClick={() => { setIsModalOpen(false); router.replace('/staff/requests'); }} className="text-gray-400 hover:text-gray-700"><X size={18}/></button></div>
            {successMessage && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl text-center font-bold">{successMessage}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">Select Asset Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-orange-500 focus:bg-white">{assetCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wide mb-1.5">Notes (What hardware are you using before?)</label>
                <textarea rows={4} required value={note} onChange={e => setNote(e.target.value)} placeholder="Explain why you need this hardware item allocation..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-orange-500 focus:bg-white" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'File Request Record'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssetRequestsPage() {
  return (
    <Suspense fallback={<div className="w-full h-96 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>}>
      <AssetRequestsContent />
    </Suspense>
  );
}