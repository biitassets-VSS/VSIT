'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, CheckCircle2, AlertCircle, Camera, 
  ArrowLeft, Trash2, MessageSquare, ShieldAlert, Send,
  Ticket, PlusCircle, Timer, PauseCircle, MonitorUp, ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function StaffDashboardPage() {
  // 1. STATE FOR DYNAMIC USER DATA
  const [staffUser, setStaffUser] = useState({ name: 'Loading...', empCode: '...' });
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 2. LOAD USER & FETCH DATA
  useEffect(() => {
    // A. Get User from localStorage (Set this on your Login Page)
    const storedUser = localStorage.getItem('logged_in_staff');
    let currentUser = { name: 'User', empCode: 'N/A' };
    
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      setStaffUser(currentUser);
    }

    // B. Fetch real data from Supabase using the dynamic empCode
    const fetchDashboardData = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('emp_code', currentUser.empCode); // Matches database column

        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        console.error("Error fetching assets:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* HEADER: Updated with Live Name and Emp ID */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            Welcome, {staffUser.name} 👋
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">ID: {staffUser.empCode}</p>
        </div>
        <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">EMP CODE</span>
          <span className="text-lg font-black text-teal-900">{staffUser.empCode}</span>
        </div>
      </div>

      {/* ASSETS SECTION */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-2">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Package size={20} className="text-teal-600" /> My Assigned Assets ({assets.length})
          </h2>
        </div>
        
        {assets.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-bold text-sm">
            No assets currently assigned to this ID.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <h3 className="text-lg font-black text-gray-900">{asset.name}</h3>
                <p className="text-sm font-bold text-teal-600">{asset.tag_id}</p>
                <p className="text-xs font-bold text-gray-500 mt-2">Status: {asset.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* ... (Keep your existing Ticket/Inspection UI code below) ... */}
    </div>
  );
}