'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, CheckCircle2, Camera, ArrowLeft, Trash2, 
  MessageSquare, ShieldAlert, Send, Ticket, PlusCircle, 
  Timer, PauseCircle, MonitorUp, ImagePlus
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState({ name: 'Loading...', empCode: '...' });
  const [assets, setAssets] = useState<any[]>([]);
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [viewState, setViewState] = useState<'dashboard' | 'raising_ticket' | 'requesting_asset' | 'inspecting'>('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load User Identity
  useEffect(() => {
    const storedUser = localStorage.getItem('logged_in_staff');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setStaffUser({ name: user.name, empCode: user.empCode });
      fetchDashboardData(user.empCode);
    } else {
      setIsLoaded(true);
    }
  }, []);

  // 2. Fetch Live Data
  const fetchDashboardData = async (empCode: string) => {
    try {
      const [assetRes, ticketRes] = await Promise.all([
        supabase.from('assets').select('*').eq('emp_code', empCode),
        supabase.from('tickets').select('*').eq('emp_code', empCode)
      ]);
      setAssets(assetRes.data || []);
      setActiveTickets(ticketRes.data || []);
    } catch (err) {
      console.error("Data fetch error", err);
    } finally {
      setIsLoaded(true);
    }
  };

  if (!isLoaded) return <div className="p-20 text-center font-bold text-gray-400">Loading your profile...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* DASHBOARD VIEW */}
      {viewState === 'dashboard' && (
        <>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Welcome, {staffUser.name} 👋</h1>
              <p className="text-gray-500 font-bold mt-1">ID: {staffUser.empCode}</p>
            </div>
            <div className="bg-teal-50 px-6 py-3 rounded-2xl">
              <p className="text-xs font-black text-teal-600 uppercase">EMP CODE</p>
              <p className="text-xl font-black text-teal-900">{staffUser.empCode}</p>
            </div>
          </div>

          {/* Restored Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setViewState('raising_ticket')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors text-left group">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Ticket size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Raise IT Ticket</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Report a broken device or software issue</p>
              </div>
            </button>

            <button onClick={() => setViewState('requesting_asset')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><PlusCircle size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 text-[15px]">Request New Asset</h3>
                <p className="text-xs font-bold text-gray-500 mt-0.5">Need a mouse, keyboard, or monitor?</p>
              </div>
            </button>
          </div>

          {/* Assigned Assets */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">My Assigned Assets ({assets.length})</h2>
            </div>
            {assets.length === 0 ? (
              <div className="p-10 text-center text-gray-400 font-bold">No assets currently assigned to this ID.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                {assets.map((a: any) => (
                  <div key={a.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <h3 className="font-black text-gray-900">{a.name}</h3>
                    <p className="text-teal-600 font-bold text-sm">{a.tag_id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW HANDLERS: Simply toggle setViewState to switch forms */}
      {viewState === 'raising_ticket' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 font-bold text-gray-500 mb-6"><ArrowLeft size={16}/> Back</button>
          <h2 className="text-2xl font-black mb-4">Raise IT Ticket</h2>
          {/* Add your Ticket Form fields here */}
        </div>
      )}
    </div>
  );
}