'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  PackageSearch, AlertCircle, CheckCircle2, 
  Clock, QrCode, Laptop, Wrench, ChevronRight, Loader2,
  Ticket, PlusCircle, RefreshCw, X, Camera, ShieldCheck, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function StaffDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isNewReqModalOpen, setIsNewReqModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  
  // Forms
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) return;

        const { data: profileData } = await supabase
          .from('staff')
          .select('emp_code, name')
          .eq('email', user.email)
          .single();

        if (profileData) {
          setStaffProfile(profileData);
          
          // Fetch Assets
          const { data: myAssets } = await supabase
            .from('assets')
            .select('*')
            .eq('emp_code', profileData.emp_code);
          if (myAssets) setAssets(myAssets);

          // Fetch Tickets
          const { data: myTickets } = await supabase
            .from('tickets')
            .select('*')
            .eq('emp_code', profileData.emp_code)
            .order('created_at', { ascending: false });
          if (myTickets) setTickets(myTickets);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffProfile) return;
    try {
      const { error } = await supabase.from('tickets').insert([{
        emp_code: staffProfile.emp_code,
        subject: ticketSubject,
        description: ticketDesc,
        status: 'Open'
      }]);
      if (error) throw error;
      alert("Ticket raised successfully!");
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (isLoading) return <div className="flex justify-center min-h-[60vh] items-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto relative">
      
      {/* WELCOME HEADER */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 blur-3xl rounded-full opacity-10 -mr-10 -mt-10 pointer-events-none"></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Welcome back, {staffProfile?.name}! 👋</h1>
          <p className="text-sm font-medium text-gray-500 mt-2 flex items-center gap-2">
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-black font-mono text-xs border border-gray-200">
              {staffProfile?.emp_code}
            </span>
          </p>
        </div>
      </div>

      {/* RECENT IT TICKETS (Added below Welcome per request) */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Ticket size={20} className="text-orange-500" /> My IT Tickets</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {tickets.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 font-bold text-center">No active tickets.</p>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50">
                <div>
                  <h3 className="font-bold text-gray-900">{ticket.subject}</h3>
                  <p className="text-xs font-medium text-gray-500 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right flex flex-col gap-1 items-end">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                    ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {ticket.status}
                  </span>
                  {/* Status Enhancements */}
                  {ticket.waiting_time && ticket.status !== 'Resolved' && (
                    <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1"><Clock size={12}/> ETA: {ticket.waiting_time}</span>
                  )}
                  {ticket.resolved_duration && ticket.status === 'Resolved' && (
                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Duration: {ticket.resolved_duration}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.button onClick={() => setIsTicketModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
          <div className="w-14 h-14 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition-all"><Ticket size={26} /></div>
          <span className="font-black text-gray-800 text-sm">Raise IT Ticket</span>
        </motion.button>
        <motion.button onClick={() => setIsNewReqModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 bg-orange-50/50 border border-orange-100 rounded-[24px] shadow-sm hover:shadow-md hover:border-orange-300 transition-all group">
          <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all"><PlusCircle size={26} /></div>
          <span className="font-black text-orange-900 text-sm">Request New Asset</span>
        </motion.button>
        <motion.button onClick={() => setIsReplaceModalOpen(true)} className="flex flex-col items-center justify-center gap-3 p-6 bg-red-50/50 border border-red-100 rounded-[24px] shadow-sm hover:shadow-md hover:border-red-300 transition-all group">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all"><RefreshCw size={26} /></div>
          <span className="font-black text-red-900 text-sm">Request Replacement</span>
        </motion.button>
      </div>

      {/* TICKET MODAL */}
      <AnimatePresence>
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-gray-900/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-black text-gray-900">Raise IT Ticket</h2><button onClick={() => setIsTicketModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20} /></button></div>
              <form onSubmit={handleTicketSubmit} className="p-6 space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Subject</label><input required type="text" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"/></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Description</label><textarea required rows={4} value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none"/></div>
                <button type="submit" className="w-full py-3.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all text-sm">Submit Ticket</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}