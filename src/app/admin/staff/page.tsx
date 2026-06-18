'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, CheckCircle2, Camera, ArrowLeft, Trash2, 
  MessageSquare, ShieldAlert, Send, Ticket, PlusCircle, 
  Timer, PauseCircle, MonitorUp, ImagePlus
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

interface StaffUser {
  name: string;
  empCode: string;
}

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [activeTickets, setActiveTickets] = useState<StaffTicket[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting' | 'raising_ticket' | 'requesting_asset'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Load User & Data
  useEffect(() => {
    // Attempt to get user from localStorage
    const storedUser = localStorage.getItem('logged_in_staff');
    const user = storedUser ? JSON.parse(storedUser) : { name: 'Lakhwinder Canberra', empCode: 'EMP-1722' };
    setStaffUser(user);
  }, []);

  // 2. Fetch Live Supabase Data
  useEffect(() => {
    if (!staffUser) return;

    const fetchData = async () => {
      try {
        // Fetch Assets assigned to this employee
        const { data: assetData } = await supabase
          .from('assets')
          .select('*')
          .eq('emp_code', staffUser.empCode);

        if (assetData) {
          setAssets(assetData.map((a: any) => ({
            id: a.id,
            tagId: a.tag_id,
            name: a.name,
            category: a.category,
            status: a.status,
            inspectionStatus: a.inspection_status || 'Due',
            adminFeedback: a.inspection_notes || ''
          })));
        }

        // Fetch Tickets
        const { data: ticketData } = await supabase
          .from('tickets')
          .select('*')
          .eq('emp_code', staffUser.empCode);

        if (ticketData) {
          setActiveTickets(ticketData.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status || 'Open',
            estimatedTime: t.estimated_time
          })));
        }
      } catch (err) {
        console.error("Database Error:", err);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchData();
  }, [staffUser]);

  if (!isLoaded) return <div className="p-20 text-center font-bold text-gray-400">Loading your profile...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Hi, {staffUser?.name}</h1>
          <p className="text-gray-500 font-bold">{staffUser?.empCode}</p>
        </div>
      </div>
      
      {/* Dashboard UI goes here (same as previous) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assets.map(asset => (
          <div key={asset.id} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-black text-xl">{asset.name}</h3>
            <p className="text-teal-600 font-bold">{asset.tagId}</p>
            <p className="mt-2 text-sm font-bold text-gray-500">Status: {asset.inspectionStatus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}