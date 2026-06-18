'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, ArrowLeft, Send, 
  Ticket, PlusCircle, ImagePlus, Trash2, MonitorUp 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState({ name: 'Loading...', empCode: '...', email: '' });
  const [assets, setAssets] = useState<any[]>([]);
  const [viewState, setViewState] = useState<'dashboard' | 'raising_ticket' | 'requesting_asset'>('dashboard');
  
  // Ticket/Request Form State
  const [ticketForm, setTicketForm] = useState({ title: '', category: 'Internet', description: '' });
  const [requestForm, setRequestForm] = useState({ category: 'Mouse', reason: '' });

  useEffect(() => {
    const storedUser = localStorage.getItem('logged_in_staff');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setStaffUser({ name: user.name, empCode: user.empCode, email: user.email || '' });
      fetchDashboardData(user.empCode);
    }
  }, []);

  const fetchDashboardData = async (empCode: string) => {
    const { data } = await supabase.from('assets').select('*').eq('emp_code', empCode);
    setAssets(data || []);
  };

  const submitTicket = async () => {
    await supabase.from('tickets').insert([{
      title: ticketForm.title,
      category: ticketForm.category,
      description: ticketForm.description,
      emp_code: staffUser.empCode,
      status: 'Open'
    }]);
    alert("Ticket Submitted!");
    setViewState('dashboard');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* 1. DASHBOARD VIEW */}
      {viewState === 'dashboard' && (
        <>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Welcome, {staffUser.name} 👋</h1>
              <p className="text-gray-500 font-bold mt-1">ID: {staffUser.empCode} | {staffUser.email}</p>
            </div>
            <div className="bg-teal-50 px-6 py-3 rounded-2xl text-right">
              <p className="text-xs font-black text-teal-600 uppercase">EMP CODE</p>
              <p className="text-xl font-black text-teal-900">{staffUser.empCode}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setViewState('raising_ticket')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-red-200 transition-colors text-left">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center"><Ticket size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900">Raise IT Ticket</h3>
                <p className="text-xs font-bold text-gray-500">Report issues or requests</p>
              </div>
            </button>
            <button onClick={() => setViewState('requesting_asset')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors text-left">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><PlusCircle size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900">Request New Asset</h3>
                <p className="text-xs font-bold text-gray-500">Need new hardware?</p>
              </div>
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-black">My Assigned Assets ({assets.length})</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {assets.map((a: any) => (
                <div key={a.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <h3 className="font-black text-gray-900">{a.name}</h3>
                  <p className="text-teal-600 font-bold text-sm">{a.tag_id}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 2. RAISE IT TICKET FORM */}
      {viewState === 'raising_ticket' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 font-bold mb-6 text-gray-500"><ArrowLeft size={16}/> Back</button>
          <h2 className="text-2xl font-black mb-6">Raise IT Ticket</h2>
          <div className="space-y-4 max-w-xl">
            <select className="w-full p-3 border rounded-xl font-bold" onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}>
              <option value="Internet">Internet</option>
              <option value="Laptop">Laptop</option>
              <option value="Software">Software</option>
              <option value="Headphone">Headphone</option>
              <option value="Email">Email Login</option>
              <option value="Other">Other</option>
            </select>
            <input type="text" placeholder="Title" className="w-full p-3 border rounded-xl" onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}/>
            <textarea placeholder="Brief note..." className="w-full p-3 border rounded-xl" onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}/>
            <button onClick={submitTicket} className="w-full bg-teal-600 text-white p-3 rounded-xl font-black flex items-center justify-center gap-2"><Send size={18}/> Submit Ticket</button>
          </div>
        </div>
      )}
      
      {/* 3. REQUEST ASSET FORM */}
      {viewState === 'requesting_asset' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
           <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 font-bold mb-6 text-gray-500"><ArrowLeft size={16}/> Back</button>
           <h2 className="text-2xl font-black mb-6">Request New Asset</h2>
           {/* Form logic here same as ticket form */}
        </div>
      )}
    </div>
  );
}