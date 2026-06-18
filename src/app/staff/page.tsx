'use client';

import React, { useState, useEffect } from 'react';
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
  email: string;
}

// --- Photo Rules ---
const laptopPhotoRequirements = ["Top side", "Display and Keyboard", "Right Side port", "Left Side port", "Back side with Tag id Sticker"];
const standardPhotoRequirements = ["Front View / Main Photo", "Back side with Tag id Sticker"];

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState<StaffUser>({ name: 'Loading...', empCode: '...', email: '' });
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [activeTickets, setActiveTickets] = useState<StaffTicket[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting' | 'raising_ticket' | 'requesting_asset'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ticketForm, setTicketForm] = useState({ title: '', category: 'Hardware', priority: 'Medium', description: '' });
  const [ticketPhoto, setTicketPhoto] = useState<string | null>(null);
  const [assetRequestForm, setAssetRequestForm] = useState({ category: 'Mouse', reason: '' });

  // 1. Fetch Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return;

        // Fetch User Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, employee_code, email')
          .eq('email', user.email)
          .maybeSingle();

        if (profile) {
          const currentUser = { 
            name: profile.full_name || 'Staff Member', 
            empCode: profile.employee_code || 'N/A', 
            email: profile.email || user.email 
          };
          setStaffUser(currentUser);

          // Fetch Assets and Tickets
          if (currentUser.empCode !== 'N/A') {
            const [assetRes, ticketRes] = await Promise.all([
              supabase.from('assets').select('*').eq('emp_code', currentUser.empCode),
              supabase.from('tickets').select('*').eq('emp_code', currentUser.empCode).order('created_at', { ascending: false })
            ]);

            if (assetRes.data) {
              setAssets(assetRes.data.map((a: any) => ({
                id: a.id, tagId: a.tag_id, name: a.name, category: a.category,
                status: a.status, inspectionStatus: a.inspection_status || 'Due',
                adminFeedback: a.inspection_notes || ''
              })));
            }
            if (ticketRes.data) {
              setActiveTickets(ticketRes.data.map((t: any) => ({
                id: t.id, title: t.title, status: t.status || 'Open', estimatedTime: t.estimated_time
              })));
            }
          }
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // [Keep your existing Handlers: handleSubmitTicket, handleSubmitAssetRequest, handleSubmitInspection, handlePhotoUpload]
  // ... (Your existing function logic for handlers remains unchanged as it works correctly) ...

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* 1. VIEW: STAFF DASHBOARD */}
      {viewState === 'dashboard' && (
        <>
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Welcome, {staffUser.name} 👋</h1>
              <p className="text-sm font-bold text-gray-500 mt-1">{staffUser.email}</p>
            </div>
            <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Emp Code</span>
              <span className="text-lg font-black text-teal-900">{staffUser.empCode}</span>
            </div>
          </div>

          {/* Buttons, Tickets, and Assets Grid remain identical to your previous code */}
          {/* ... (Keep your existing JSX for Dashboard view) ... */}
        </>
      )}

      {/* 2, 3, 4. [Keep your existing View States: raising_ticket, requesting_asset, inspecting] */}
      {/* ... */}
    </div>
  );
}