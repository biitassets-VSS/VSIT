import React from 'react';
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 🌟 Defined a strict TypeScript interface for the Supabase data
interface UserProfile {
  id: string;
  name: string;
  full_name: string;
  email: string;
  role: string;
  emp_code: string;
}

export default async function SettingsPage() {
  const liveSettings = {
    appName: 'Virtual Staffing IT Portal',
    supportEmail: 'support@vsit.com',
    allowStaffLogin: true,
    allowStaffEditAssets: false,
    requireAdminApproval: true,
    compressUploads: true,
    maxUploadSizeMB: '10',
    enableWatermarks: true,
    watermarkFormat: 'Date, Time & Tag ID'
  };

  // 🌟 Applied the strict interface here instead of using 'any[]'
  let dbUsers: UserProfile[] = [];
  
  try {
    if (supabaseUrl && supabaseKey) {
      const { data, error } = await supabase
        .from('profiles') 
        .select('id, name, full_name, email, role, emp_code')
        .order('full_name', { ascending: true });

      if (!error && data) {
        dbUsers = data as UserProfile[];
      } else {
        console.error("Supabase Error fetching users:", error?.message);
      }
    }
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0b0712] transition-colors duration-300 font-sans antialiased pb-12">
      {/* 🌟 FULL-SCREEN ENTERPRISE FLUID CONTAINER */}
      <div className="w-full max-w-400 px-3 sm:px-6 lg:px-10 mx-auto space-y-5 sm:space-y-6 pt-4">
        
        {/* 🌟 ADAPTIVE STANDARDIZED HEADER FOR SETTINGS */}
        <div className="bg-white dark:bg-[#150f24] p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-purple-900/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3.5 sm:gap-5">
            <Link 
              href="/admin" 
              className="p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer bg-white dark:bg-[#150f24] border-slate-200/80 dark:border-purple-900/40 text-slate-500 dark:text-purple-300/70 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 shadow-2xs"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-purple-50 flex items-center gap-2.5">
                  <SettingsIcon className="text-orange-600 dark:text-orange-400 w-6 h-6 sm:w-7 sm:h-7 shrink-0" /> 
                  <span>Portal Settings</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30">
                  System Commander
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-purple-300/70">
                Configure system preferences, appearance themes, user roles, and global IT portal parameters.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
            <Link 
              href="/admin" 
              className="w-full sm:w-auto px-5 py-2.5 sm:py-3 bg-orange-50 dark:bg-[#18181b] hover:bg-orange-100 dark:hover:bg-orange-600/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-purple-900/50 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-x-0.5 shrink-0 uppercase tracking-wider shadow-2xs"
            >
              <ArrowLeft size={16} /> <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* The Client Component renders the actual settings UI Below */}
        <div className="transition-all duration-300 rounded-3xl">
           <SettingsClient initialSettings={liveSettings} initialUsers={dbUsers} />
        </div>

      </div>
    </div>
  );
}