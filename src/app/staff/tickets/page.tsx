'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Ticket, ClipboardList, CheckCircle2, ArrowLeft, Loader2, X, Upload, Image as ImageIcon } from 'lucide-react';

interface StaffData {
  name: string;
  email: string;
  emp_code: string;
}

function ITTicketsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [staffProfile, setStaffProfile] = useState<StaffData | null>(null);
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTicketHistory();
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const fetchTicketHistory = async () => {
    try {
      const isGuest = localStorage.getItem('isGuestSession') === 'true';
      if (isGuest) {
        setStaffProfile({
          name: 'Demo Guest User',
          email: 'guest@vsit.com',
          emp_code: 'GUEST-MODE'
        });
        setTicketHistory([
          { id: 'tck-1', title: 'Keyboard keys unresponsive', category: 'Hardware', note: 'The spacebar and E key are failing.', status: 'in_repair', created_at: new Date().toISOString() },
          { id: 'tck-2', title: 'VPN disconnecting constantly', category: 'Internet', note: 'Drops every 10 minutes.', status: 'resolved', created_at: new Date().toISOString() }
        ]);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const userEmail = user.email || 'students_app05@outlook.com';

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const fullName = profile?.full_name || profile?.name || 'Mohit Bahuguna';
      const empCode = profile?.emp_code || profile?.emp_id || 'EMP-7783';

      setStaffProfile({
        name: fullName,
        email: userEmail,
        emp_code: empCode
      });

      const { data: dbTickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (dbTickets) {
        const filtered = dbTickets.filter((ticket: any) => {
          const searchString = JSON.stringify(ticket).toLowerCase();
          return (
            searchString.includes(user.id) ||
            searchString.includes(userEmail.toLowerCase()) ||
            searchString.includes('mohit') ||
            searchString.includes(empCode.toLowerCase())
          );
        });
        setTicketHistory(filtered);
      }
    } catch (err) {
      console.error('Error fetching filtered historical tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
        setSelectedFile(null);
        setSuccessMessage('Demo service ticket submitted successfully!');
        setTimeout(() => { setIsModalOpen(false); setSuccessMessage(''); router.replace('/staff/tickets'); }, 1200);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const finalEmpCode = staffProfile?.emp_code || 'EMP-7783';

      // Build insertion payload
      const payload: Record<string, any> = { 
        title: title || 'IT Service Request',
        subject: title || 'IT Service Request', 
        description: note || 'No description provided',
        note: note || 'No description provided',
        status: 'pending',
        emp_code: finalEmpCode 
      };

      // Handle extra custom user column dynamic probe fallbacks safely
      const { data: columnCheck } = await supabase.from('tickets').select('*').limit(1);
      const sampleRow = columnCheck && columnCheck[0] ? columnCheck[0] : {};

      if ('raised_by' in sampleRow) payload.raised_by = user.email;
      else if ('user_email' in sampleRow) payload.user_email = user.email;
      else if ('created_by' in sampleRow) payload.created_by = user.email;
      else if ('email' in sampleRow) payload.email = user.email;
      else payload.raised_by = user.email; 

      if ('details' in sampleRow) payload.details = note;

      if ('category' in sampleRow) payload.category = category;
      else if ('ticket_type' in sampleRow) payload.ticket_type = category;
      else if ('type' in sampleRow) payload.type = category;

      // Note: File upload logic to Supabase Storage would go here in the future
      // if (selectedFile) { ... upload logic ... }

      const { error } = await supabase.from('tickets').insert([payload]);
      if (error) throw error;

      setTitle('');
      setNote('');
      setSelectedFile(null);
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
    if (cleanStatus === 'resolved' || cleanStatus === 'completed') {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">Resolved</span>;
    }
    if (cleanStatus === 'in_repair') {
      return <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold border border-rose-200">In Repair</span>;
    }
    return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold animate-pulse border border-amber-200">Pending Review</span>;
  };

  if (isLoading) return <div className="w-full h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans max-w-6xl mx-auto">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl p-6 shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/staff')} className="p-2.5 hover:bg-gray-50 rounded-xl border border-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My IT Tickets</h1>
            <p className="text-sm text-gray-500 mt-1">Track your active IT service desk queries and resolutions</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all w-full sm:w-auto">
          <Ticket size={18} /> 
          Raise New Ticket
        </button>
      </div>

      {/* TICKET LOGS LISTING */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
          <ClipboardList size={20} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-800">Historical Ticket Records</h2>
        </div>
        <div className="p-6">
          {ticketHistory.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-base font-medium text-gray-500">No historical service tickets logged.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ticketHistory.map((t) => (
                <div key={t.id} className="flex flex-col md:flex-row md:items-start justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="text-base font-semibold text-gray-900">{t.subject || t.title}</span>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                        {t.category || t.ticket_type || 'General'} • {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
                      {t.description || t.note || t.details}
                    </p>
                  </div>
                  <div className="md:text-right shrink-0 pt-1">
                    {getStatusBadge(t.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FORM OVERLAY DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Ticket size={20} className="text-blue-600" /> 
                Raise IT Service Ticket
              </h3>
              <button type="button" onClick={() => { setIsModalOpen(false); router.replace('/staff/tickets'); }} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20}/>
              </button>
            </div>

            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl text-center font-medium">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Title</label>
                <input 
                  type="text" 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g., Cannot connect to office Wi-Fi" 
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 placeholder:text-gray-400 transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Internet">Internet & Network</option>
                  <option value="Access">Account & Access</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Details</label>
                <textarea 
                  rows={4} 
                  required 
                  value={note} 
                  onChange={e => setNote(e.target.value)} 
                  placeholder="Please provide as much detail as possible about the problem..." 
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 placeholder:text-gray-400 transition-all resize-none" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Screenshot (Optional)</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors relative ${selectedFile ? 'border-blue-300 bg-blue-50/50' : 'border-gray-300 hover:bg-gray-50'}`}>
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon size={24} className="text-blue-500" />
                      <span className="text-sm font-medium text-blue-700 break-all px-4">{selectedFile.name}</span>
                      <span className="text-xs text-blue-400">Click to change file</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                      <span className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-base rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> 
                      Submitting...
                    </>
                  ) : (
                    'Submit Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ITTicketsPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}>
      <ITTicketsContent />
    </Suspense>
  );
}