import React from 'react';
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  let dbUsers = [];
  try {
    const { data, error } = await supabase
      .from('profiles') 
      .select('id, name, full_name, email, role, emp_code')
      .order('full_name', { ascending: true });

    if (!error && data) {
      dbUsers = data;
    } else {
      console.error("Supabase Error fetching users:", error?.message);
    }
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-sans text-slate-900 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* STANDARDIZED HEADER FOR SETTINGS */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:shadow-md">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <SettingsIcon className="text-orange-600" size={26} /> Portal Settings
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-2">
              Configure system preferences, user roles, and global IT portal parameters.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
            <Link 
              href="/admin" 
              className="w-full sm:w-auto px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-x-1 hover:shadow-sm shrink-0"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>
        </div>

        {/* The Client Component renders the actual settings UI Below */}
        <div className="transition-all hover:shadow-lg hover:-translate-y-1 duration-300 rounded-3xl">
           <SettingsClient initialSettings={liveSettings} initialUsers={dbUsers} />
        </div>
      </div>
    </div>
  );
}