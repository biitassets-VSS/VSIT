'use client';

import React, { useState } from 'react';
import { 
  Ticket, PlusCircle, AlertCircle, CheckCircle2, 
  Clock, X, UploadCloud, Image as ImageIcon, MessageSquare
} from 'lucide-react';

// --- TYPES ---
interface TicketRecord {
  id: string;
  issue: string;
  asset: string;
  status: string;
  date: string;
  notes: string;
  hasAttachment: boolean;
}

interface AssetRecord {
  id: string;
  name: string;
}

interface StaffTicketsClientProps {
  initialTickets: TicketRecord[];
  assignedAssets: AssetRecord[];
}

export default function StaffTicketsClient({ initialTickets, assignedAssets }: StaffTicketsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState<TicketRecord[]>(initialTickets);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [issue, setIssue] = useState('');
  const [asset, setAsset] = useState('Software / General Issue');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. PREPARE DATA (Handle file upload if necessary)
      const formData = new FormData();
      formData.append('issue', issue);
      formData.append('asset', asset);
      formData.append('notes', notes);
      if (file) {
        formData.append('file', file);
      }

      // 2. SEND TO YOUR REAL API ENDPOINT
      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formData, // Using FormData to support file uploads
      });

      if (!response.ok) throw new Error('Failed to submit ticket');

      // 3. GET THE SAVED TICKET FROM DB
      const newlySavedTicket: TicketRecord = await response.json();

      // 4. UPDATE UI
      setTickets([newlySavedTicket, ...tickets]);
      alert("Ticket raised successfully! IT Support has been notified.");
      
      // 5. RESET FORM
      setIssue('');
      setAsset('Software / General Issue');
      setNotes('');
      setFile(null);
      setIsModalOpen(false);

    } catch (error) {
      alert("Failed to submit ticket. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
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
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all font-bold text-sm"
        >
          <PlusCircle size={18} />
          Raise New Ticket
        </button>
      </div>

      {/* TICKETS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Ticket size={20} className="text-purple-500"/> Ticket History
          </h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {tickets.length === 0 ? (
            <div className="p-10 text-center text-gray-500 font-medium">
              No tickets found. You have no active or past support requests.
            </div>
          ) : (
            tickets.map((ticket) => (
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
                    <p className="text-sm font-semibold text-purple-600 mt-1">{ticket.asset}</p>
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
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-500 bg-purple-50 px-2.5 py-1 rounded-md">
                      <ImageIcon size={14} /> Screenshot attached
                    </div>
                  )}
                  <span className="text-xs font-bold text-gray-300 mt-1">ID: {ticket.id}</span>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* RAISE TICKET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-900">Raise IT Ticket</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                disabled={isSubmitting}
                className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">What is the issue?</label>
                <input 
                  required 
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  disabled={isSubmitting}
                  type="text" 
                  placeholder="E.g. Cannot connect to Wi-Fi" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium disabled:opacity-50" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Select Asset</label>
                <select 
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium appearance-none disabled:opacity-50"
                >
                  <option value="Software / General Issue">Software / General Issue</option>
                  
                  {/* LIVE DATA: Dynamically maps the user's assigned assets to the dropdown */}
                  {assignedAssets.map((dbAsset) => (
                    <option key={dbAsset.id} value={`${dbAsset.name} (${dbAsset.id})`}>
                      {dbAsset.name} ({dbAsset.id})
                    </option>
                  ))}

                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Notes / Description</label>
                <textarea 
                  required 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                  rows={3} 
                  placeholder="Please provide details about what happened..." 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium resize-none disabled:opacity-50"
                ></textarea>
              </div>

              {/* FILE UPLOAD DRAG & DROP */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Attach Screenshot (Optional)</label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-purple-50 hover:border-purple-400 transition-colors cursor-pointer group">
                  <div className="bg-purple-100 text-purple-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    {file ? file.name : "Click to upload or drag & drop"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">PNG, JPG, or PDF (max 5MB)</p>
                  <input 
                    type="file" 
                    disabled={isSubmitting}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-blue-200 transition-all flex justify-center items-center disabled:opacity-70"
                >
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}