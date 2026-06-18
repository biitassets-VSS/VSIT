'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, Camera, ArrowLeft, Trash2, 
  MessageSquare, ShieldAlert, Send, Ticket, PlusCircle, 
  Timer, PauseCircle, MonitorUp, ImagePlus
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// ... [Interfaces remain the same] ...

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState<StaffUser>({ name: 'Loading...', empCode: '...', email: '' });
  const [assets, setAssets] = useState<AssignedAsset[]>([]);
  const [activeTickets, setActiveTickets] = useState<StaffTicket[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [viewState, setViewState] = useState<'dashboard' | 'inspecting' | 'raising_ticket' | 'requesting_asset'>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  
  // ... [Other state remains the same] ...

  useEffect(() => {
    const loadUserAndData = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setIsLoaded(true);
        return;
      }

      try {
        // 1. Fetch Profile - Using select('*') to see everything
        const { data: profileData, error: profileError } = await supabase
          .from('profiles') 
          .select('*') 
          .eq('email', userEmail)
          .maybeSingle(); 

        if (profileError) console.error("Supabase Error:", profileError);

        // 2. ROBUST DATA MAPPING
        // This will check multiple common naming conventions for your columns
        const name = profileData?.full_name || profileData?.name || profileData?.first_name || 'Staff Member';
        const empCode = profileData?.emp_code || profileData?.employee_code || profileData?.emp_id || 'N/A';
        
        const currentUser = { name, empCode, email: userEmail };
        setStaffUser(currentUser);
        localStorage.setItem('userName', name); // Sync for Sidebar

        // 3. Fetch Assets and Tickets ONLY if we found a valid empCode
        if (empCode !== 'N/A') {
          const [assetRes, ticketRes] = await Promise.all([
            supabase.from('assets').select('*').eq('emp_code', empCode),
            supabase.from('tickets').select('*').eq('emp_code', empCode).order('created_at', { ascending: false })
          ]);

          if (assetRes.data) {
            setAssets(assetRes.data.map((a: any) => ({
              id: a.id,
              tagId: a.tag_id || a.tagId,
              name: a.name,
              category: a.category,
              status: a.status,
              inspectionStatus: a.inspection_status || 'Due',
              adminFeedback: a.inspection_notes || ''
            })));
          }

          if (ticketRes.data) {
            setActiveTickets(ticketRes.data.map((t: any) => ({
              id: t.id,
              title: t.title,
              status: t.status || 'Open',
              estimatedTime: t.estimated_time
            })));
          }
        }
      } catch (err) {
        console.error("Data fetch error", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadUserAndData();
  }, []);

  // ... [Handlers remain the same] ...

  // UI rendering remains exactly as you had it
  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0">
      {viewState === 'dashboard' && (
        <>
          {/* Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Welcome, {staffUser.name} 👋</h1>
              <p className="text-sm font-bold text-gray-500 mt-1">Email: {staffUser.email}</p>
            </div>
            <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Emp Code</span>
              <span className="text-lg font-black text-teal-900">{staffUser.empCode}</span>
            </div>
          </div>
          {/* ... [Rest of your UI] ... */}
        </>
      )}
      {/* ... [Rest of your ViewStates] ... */}
    </div>
  );
}