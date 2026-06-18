'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, AlertCircle, Camera, 
  ArrowLeft, Trash2, MessageSquare, ShieldAlert, Send,
  Ticket, PlusCircle, Timer, PauseCircle, MonitorUp, ImagePlus
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function StaffDashboardPage() {
  const [staffUser, setStaffUser] = useState({ name: 'Loading...', empCode: '...' });
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Get logged-in user from localStorage (set this during your login flow)
    const storedUser = localStorage.getItem('logged_in_staff');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setStaffUser({ name: user.name, empCode: user.empCode });
      
      // 2. Fetch live data for this specific user
      fetchDashboardData(user.empCode);
    } else {
      // Fallback: If not logged in, redirect to login page or handle accordingly
      console.error("No user found in localStorage");
      setIsLoaded(true);
    }
  }, []);

  const fetchDashboardData = async (empCode: string) => {
    try {
      // Fetch Assets assigned to THIS employee
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('emp_code', empCode); // Uses the correct emp_code from DB

      if (error) throw error;
      setAssets(data || []);
    } catch (err) {
      console.error("Error fetching staff data:", err);
    } finally {
      setIsLoaded(true);
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Welcome, {staffUser.name} 👋</h1>
          <p className="text-gray-500 font-bold mt-1">ID: {staffUser.empCode}</p>
        </div>
        <div className="bg-teal-50 px-6 py-3 rounded-2xl">
          <p className="text-xs font-black text-teal-600 uppercase">Emp Code</p>
          <p className="text-2xl font-black text-teal-900">{staffUser.empCode}</p>
        </div>
      </div>
      
      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} className="p-6 bg-white rounded-3xl border border-gray-100">
            <h3 className="font-black text-lg">{asset.name}</h3>
            <p className="text-sm font-bold text-gray-400">{asset.tag_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}