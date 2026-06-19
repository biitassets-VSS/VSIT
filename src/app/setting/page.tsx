'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { 
  Settings, Users, ShieldCheck, Key, Loader2, Database, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // =========================================================================
  // SYNC STAFF TO AUTHENTICATION ACCOUNTS
  // =========================================================================
  const handleSyncStaffLogins = async () => {
    if (!window.confirm("This will scan all staff members and generate login accounts for them. Proceed?")) return;
    
    setIsSyncing(true);
    setSyncStats(null);
    setErrorMsg('');

    try {
      // 1. Fetch all staff members
      const { data: staffList, error: fetchError } = await supabase
        .from('staff')
        .select('emp_code, name, email, password, status');

      if (fetchError) throw fetchError;
      if (!staffList || staffList.length === 0) {
        throw new Error("No staff members found in the database.");
      }

      let successCount = 0;
      let failCount = 0;

      // 2. Create a "Silent" Auth Client so the Admin doesn't get logged out
      const silentAuthClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );

      // 3. Loop through staff and create accounts
      for (const staff of staffList) {
        // Only attempt if they have an email and password
        if (staff.email && staff.password && staff.status === 'Active') {
          
          // Attempt to register them in Supabase Auth
          const { error: authError } = await silentAuthClient.auth.signUp({
            email: staff.email,
            password: staff.password,
          });

          // If the error is just that they already exist, we count it as a success and move on to profile creation
          if (authError && !authError.message.toLowerCase().includes('already registered')) {
            console.error(`Auth failed for ${staff.email}:`, authError.message);
            failCount++;
            continue;
          }

          // Ensure they are strictly marked as 'staff' in the profiles database
          const { error: profileError } = await supabase.from('profiles').upsert({
            email: staff.email,
            name: staff.name,
            emp_code: staff.emp_code,
            role: 'staff'
          });

          if (profileError) {
            console.error(`Profile failed for ${staff.email}:`, profileError.message);
            failCount++;
          } else {
            successCount++;
          }
        }
      }

      setSyncStats({ total: staffList.length, success: successCount, failed: failCount });

    } catch (error: any) {
      setErrorMsg(error.message || "An error occurred during synchronization.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="h-12 w-12 bg-orange-50 text-orange-600 flex items-center justify-center rounded-xl">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Platform Settings</h1>
          <p className="text-sm font-medium text-gray-500">Manage system preferences and database synchronizations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ========================================================= */}
        {/* SYNC LOGINS CARD                                          */}
        {/* ========================================================= */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
            <Database className="text-orange-500" size={20} />
            <h2 className="text-lg font-black text-gray-800">User Authentication Sync</h2>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4">
                If you bulk-uploaded staff members or created accounts before authentication was fully active, those users may not be able to log in. 
              </p>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs font-bold text-blue-800 flex items-start gap-2">
                <Users size={16} className="shrink-0 mt-0.5" />
                <p>This tool scans your Staff database and securely generates login permissions for any active staff member who has an email and password assigned.</p>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-2">
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            {syncStats && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                <p className="text-xs font-black text-green-800 flex items-center gap-2 mb-2"><CheckCircle2 size={16} /> Synchronization Complete</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-white p-2 rounded-lg text-center border border-green-100">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Scanned</p>
                    <p className="text-lg font-black text-gray-800">{syncStats.total}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg text-center border border-green-100">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Synced</p>
                    <p className="text-lg font-black text-green-600">{syncStats.success}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg text-center border border-green-100">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Failed/Ignored</p>
                    <p className="text-lg font-black text-red-600">{syncStats.failed}</p>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={handleSyncStaffLogins}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-900 hover:bg-black text-white text-sm font-bold shadow-sm rounded-xl transition-all disabled:opacity-70 mt-4"
            >
              {isSyncing ? (
                <><Loader2 size={18} className="animate-spin" /> Processing Database...</>
              ) : (
                <><Key size={18} /> Sync Staff Logins</>
              )}
            </button>
          </div>
        </motion.div>

        {/* ========================================================= */}
        {/* SECURITY & ACCESS CARD (Placeholder for future features)  */}
        {/* ========================================================= */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
            <ShieldCheck className="text-emerald-500" size={20} />
            <h2 className="text-lg font-black text-gray-800">Security Policies</h2>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-center text-center space-y-4">
            <ShieldCheck size={48} className="mx-auto text-gray-200" />
            <h3 className="text-base font-bold text-gray-700">Strict Role-Based Access is Active</h3>
            <p className="text-sm font-medium text-gray-500 px-4">
              Your system is currently protected by Supabase Row Level Security and layout middleware. Staff members can only view their assigned assets, and only Administrators can manage inventory.
            </p>
            <div className="inline-flex mx-auto items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Security Active
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}