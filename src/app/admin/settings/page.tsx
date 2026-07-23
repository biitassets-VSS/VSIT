import React from 'react';
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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

  try {
    const { data: dbUsers, error } = await supabase
      .from('profiles') 
      .select('id, name, full_name, email, role, emp_code')
      .order('full_name', { ascending: true });

    if (error) {
      console.error("Supabase Error fetching users:", error.message);
      return (
        <div className="relative">
          <div className="absolute top-4 sm:top-6 right-4 sm:right-6 lg:right-8 z-50">
            <Link href="/admin" className="px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </div>
          <SettingsClient initialSettings={liveSettings} initialUsers={[]} />
        </div>
      );
    }

    return (
      <div className="relative">
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 lg:right-8 z-50">
          <Link href="/admin" className="px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
        <SettingsClient initialSettings={liveSettings} initialUsers={dbUsers || []} />
      </div>
    );
    
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
    return (
      <div className="relative">
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 lg:right-8 z-50">
          <Link href="/admin" className="px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
        <SettingsClient initialSettings={liveSettings} initialUsers={[]} />
      </div>
    );
  }
}