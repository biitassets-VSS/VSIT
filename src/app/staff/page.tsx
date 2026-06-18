'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, ArrowLeft, Trash2, 
  MessageSquare, ShieldAlert, Send, Ticket, 
  PlusCircle, Timer, PauseCircle, MonitorUp, ImagePlus, Camera
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// --- Interfaces ---
interface AssignedAsset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: string;
  inspectionStatus: 'Due' | 'Pending Approval' | 'Passed' | 'Failed' | 'Pending Repair' | 'Re-inspection';
  adminFeedback?: string;
}

interface StaffTicket {
  id: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Hold' | 'Resolved';
  estimatedTime?: string;
}

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState({ name: 'Loading...', empCode: '...', email: '' });
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [activeTickets, setActiveTickets] = useState<StaffTicket[]>([]);
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting' | 'raising_ticket' | 'requesting_asset'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms State
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [ticketForm, setTicketForm] = useState({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
  const [ticketPhoto, setTicketPhoto] = useState<string | null>(null);
  const [assetRequestForm, setAssetRequestForm] = useState({ category: 'Mouse', reason: '' });

  // 1. Load User & Data
  useEffect(() => {
    const storedUser = localStorage.getItem('logged_in_staff');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setStaffUser({ name: user.name, empCode: user.empCode, email: user.email || '' });
      fetchDashboardData(user.empCode);
    } else {
      setIsLoaded(true);
    }
  }, []);

  const fetchDashboardData = async (empCode: string) => {
    try {
      const [assetRes, ticketRes] = await Promise.all([
        supabase.from('assets').select('*').eq('emp_code', empCode),
        supabase.from('tickets').select('*').eq('emp_code', empCode).order('created_at', { ascending: false })
      ]);

      setAssets((assetRes.data || []).map((a: any) => ({
        id: a.id, tagId: a.tag_id, name: a.name, category: a.category,
        status: a.status, inspectionStatus: a.inspection_status || 'Due',
        adminFeedback: a.inspection_notes || ''
      })));

      setActiveTickets((ticketRes.data || []).map((t: any) => ({
        id: t.id, title: t.title, status: t.status, estimatedTime: t.estimated_time
      })));
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setIsLoaded(true);
    }
  };

  const handleSubmitInspection = async () => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      await supabase.from('inspections').insert([{
        asset_id: selectedAsset.id, submitted_by: staffUser.name,
        emp_code: staffUser.empCode, status: 'Pending', notes: notes, photos: photos
      }]);
      await supabase.from('assets').update({ inspection_status: 'Pending Approval' }).eq('id', selectedAsset.id);
      alert('Inspection submitted!');
      setViewState('dashboard');
      fetchDashboardData(staffUser.empCode);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) return <div className="p-20 text-center font-bold text-gray-400">Loading your profile...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* DASHBOARD VIEW */}
      {viewState === 'dashboard' && (
        <>
          {/* USER HEADER */}
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

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setViewState('raising_ticket')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:bg-red-50 transition-colors">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center"><Ticket size={24} /></div>
              <div><h3 className="font-black text-gray-900">Raise IT Ticket</h3><p className="text-xs font-bold text-gray-500">Report issues</p></div>
            </button>
            <button onClick={() => setViewState('requesting_asset')} className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:bg-blue-50 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><PlusCircle size={24} /></div>
              <div><h3 className="font-black text-gray-900">Request New Asset</h3><p className="text-xs font-bold text-gray-500">New hardware request</p></div>
            </button>
          </div>

          {/* ASSETS GRID */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-black">My Assigned Assets ({assets.length})</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {assets.map((a) => (
                <div key={a.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <h3 className="font-black text-gray-900">{a.name}</h3>
                  <p className="text-teal-600 font-bold text-sm">{a.tagId}</p>
                  <p className="text-xs font-bold mt-2">Status: {a.inspectionStatus}</p>
                  {a.inspectionStatus === 'Due' && (
                    <button onClick={() => { setSelectedAsset(a); setViewState('inspecting'); }} className="mt-3 bg-teal-600 text-white px-3 py-1 rounded-lg text-xs font-black">Start Inspection</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* INSPECTION VIEW */}
      {viewState === 'inspecting' && selectedAsset && (
        <div className="bg-white p-8 rounded-3xl">
           <button onClick={() => setViewState('dashboard')} className="flex items-center gap-2 font-bold text-gray-500 mb-6"><ArrowLeft size={16}/> Back</button>
           <h2 className="text-2xl font-black mb-4">Inspection: {selectedAsset.name}</h2>
           {/* Photo upload and submit logic goes here */}
           <button onClick={handleSubmitInspection} className="bg-teal-600 text-white p-4 rounded-xl font-black">Submit Inspection</button>
        </div>
      )}
    </div>
  );
}