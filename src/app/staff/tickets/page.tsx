'use client';

import React, { useState } from 'react';
import { 
  Ticket, PlusCircle, AlertCircle, CheckCircle2, 
  Clock, X, UploadCloud, Image as ImageIcon, MessageSquare
} from 'lucide-react';

export default function StaffTicketsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock Data: Saved record of all tickets
  const [tickets, setTickets] = useState([
    {
      id: 'TKT-1092',
      issue: 'Screen flickering occasionally',
      asset: 'MacBook Pro M2 (TAG-1045)',
      status: 'Open',
      date: 'Today, 9:30 AM',
      notes: 'The screen flashes black for a second when I open heavy applications.',
      hasAttachment: true
    },
    {
      id: 'TKT-0844',
      issue: 'Need access to Adobe Creative Cloud',
      asset: 'Software Request',
      status: 'Closed',
      date: 'Oct 12, 2023',
      notes: 'Required for the new marketing project.',
      hasAttachment: false
    },
    {
      id: 'TKT-0612',
      issue: 'Mouse scrolling is broken',
      asset: 'Logitech MX Master 3',
      status: 'Closed',
      date: 'Sep 05, 2023',
      notes: 'The scroll wheel has stopped registering movement.',
      hasAttachment: false
    }
  ]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this sends data to your database
    alert("Ticket raised successfully! IT Support has been notified.");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My IT Tickets</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Track your support requests and report new issues.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all font-bold text-sm"
        >
          <PlusCircle size={18} />
          Raise New Ticket
        </button>
      </div>

      {/* TICKETS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Ticket size={20} className="text-blue-500"/> Ticket History
          </h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-4 md:items-center justify-between">
              
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full mt-1 ${ticket.status === 'Open' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                  {ticket.status === 'Open' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-gray-900">{ticket.issue}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                      ticket.status === 'Open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-blue-600 mt-1">{ticket.asset}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 bg-gray-100/50 p-3 rounded-lg border border-gray-100">
                    <MessageSquare size={16} className="text-gray-400 min-w-[16px]"/>
                    <span className="italic">"{ticket.notes}"</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2 md:pl-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                  <Clock size={14} /> {ticket.date}
                </div>
                {ticket.hasAttachment && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-md">
                    <ImageIcon size={14} /> Screenshot attached
                  </div>
                )}
                <span className="text-xs font-bold text-gray-300 mt-1">ID: {ticket.id}</span>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* RAISE TICKET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-900">Raise IT Ticket</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">What is the issue?</label>
                <input required type="text" placeholder="E.g. Cannot connect to Wi-Fi" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Select Asset (Optional)</label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium appearance-none">
                  <option>MacBook Pro M2 (TAG-1045)</option>
                  <option>Dell UltraSharp 27" (TAG-2099)</option>
                  <option>Software / General Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Notes / Description</label>
                <textarea required rows={3} placeholder="Please provide details about what happened..." className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium resize-none"></textarea>
              </div>

              {/* FILE UPLOAD DRAG & DROP */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Attach Screenshot (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer group">
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-700">Click to upload or drag & drop</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">PNG, JPG, or PDF (max 5MB)</p>
                  <input type="file" className="hidden" />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-5 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all">
                  Submit Ticket
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
