'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { RefreshCw, Loader2, History, PackageOpen, CheckCircle2, AlertCircle, ArrowRight, Laptop, Wrench, ArrowLeft } from 'lucide-react';

export default function ReplacementsHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const activeSession = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
    const isGuest = localStorage.getItem('isGuestSession') === 'true';

    if (!activeSession && !isGuest) {
      window.location.replace('/');
      return;
    }
    
    fetchReplacements();
  }, []);

  const fetchReplacements = async () => {
    setLoading(true);
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setReplacements([
          { 
            id: '1', 
            title: 'Replacement Request: Demo Keyboard', 
            status: 'Replaced', 
            description: 'Tag ID: KBD-112 | S/N: FAULTY-9982\n\nReason: Keys sticking and unresponsive.', 
            admin_notes: 'Replaced with new Logitech Keyboard. New S/N: NEW-LOGI-5544',
            created_at: new Date().toISOString() 
          }
        ]);
        setIsAuthorized(true);
        setLoading(false);
        return;
      }

      const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user') || '';
      let email = '';
      try { email = JSON.parse(sessionStr).email; } catch (e) { email = sessionStr; }

      const cleanEmail = email.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .ilike('created_by', cleanEmail)
        .eq('category', 'Asset Replacement')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReplacements(data || []);
      setIsAuthorized(true);

    } catch (err) {
      console.error("Error fetching replacements:", err);
    } finally {
      setLoading(false);
    }
  };

  const parseFaultyDetails = (desc: string) => {
    const tagMatch = desc.match(/Tag ID:\s*([^\s|]+)/i);
    const snMatch = desc.match(/S\/N:\s*([^\n]+)/i);
    const reasonMatch = desc.match(/Reason:\s*([\s\S]+)/i);
    
    return {
      tag: tagMatch ? tagMatch[1].trim() : 'Unknown',
      sn: snMatch ? snMatch[1].trim() : 'Unknown',
      reason: reasonMatch ? reasonMatch[1].trim() : 'No reason provided'
    };
  };

  if (!isAuthorized && !loading) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-5">
            <button onClick={() => router.push('/staff/dashboard')} className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                <History className="text-orange-500" /> Replacement History Log
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Review your faulty asset reports and newly assigned replacement hardware.</p>
            </div>
          </div>
          <button onClick={fetchReplacements} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-slate-200 shrink-0 cursor-pointer">
            <RefreshCw size={14}/> Sync Data
          </button>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Fetching records...</p>
          </div>
        ) : replacements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
            <PackageOpen size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Replacements Found</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm">Your hardware replacement history will appear here once requested.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {replacements.map(record => {
              const details = parseFaultyDetails(record.description || '');
              const status = (record.status || '').toLowerCase().trim();
              const isResolved = status === 'approved' || status === 'replaced' || status === 'resolved' || status === 'closed';
              
              return (
                <div key={record.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Wrench size={16} className="text-slate-400"/> {record.title}
                    </h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(record.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="p-6 flex flex-col lg:flex-row gap-6 items-stretch">
                    
                    {/* LEFT: FAULTY ASSET */}
                    <div className="flex-1 bg-rose-50/50 border border-rose-100 rounded-2xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-rose-400"></div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-rose-600 mb-4 flex items-center gap-2">
                        <AlertCircle size={14}/> Faulty Asset Reported
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-rose-100">
                          <span className="text-[10px] font-bold uppercase text-slate-500">Serial No. (S/N)</span>
                          <span className="text-xs font-mono font-bold text-slate-800">{details.sn}</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-rose-100">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Issue / Error Note</span>
                          <p className="text-xs font-medium text-slate-700">{details.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE: ARROW (Hidden on mobile) */}
                    <div className="hidden lg:flex flex-col justify-center items-center px-2 text-slate-300">
                      <ArrowRight size={24} />
                    </div>

                    {/* RIGHT: NEW REPLACEMENT ASSET */}
                    <div className={`flex-1 border rounded-2xl p-5 relative overflow-hidden transition-colors ${isResolved ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200 dashed'}`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${isResolved ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                      <h4 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isResolved ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isResolved ? <CheckCircle2 size={14}/> : <RefreshCw size={14} className="animate-spin"/>} 
                        {isResolved ? 'New Asset Assigned' : 'Pending Logistics Assignment'}
                      </h4>
                      
                      {isResolved ? (
                        <div className="space-y-3">
                          <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm flex items-start gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 shrink-0"><Laptop size={20}/></div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-emerald-600 block mb-0.5">Replacement Details</span>
                              <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                                {record.admin_notes || record.resolution || 'New asset has been assigned to your inventory. Check dashboard.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-4 text-center">
                          <div className="p-3 bg-white rounded-full border border-slate-200 mb-3 shadow-sm">
                            <PackageOpen size={20} className="text-slate-400"/>
                          </div>
                          <p className="text-xs font-semibold text-slate-500 max-w-[200px]">IT Admin is currently processing a new replacement for your faulty hardware.</p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}