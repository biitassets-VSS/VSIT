import React from 'react';
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';

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
      return <SettingsClient initialSettings={liveSettings} initialUsers={[]} />;
    }

    return <SettingsClient initialSettings={liveSettings} initialUsers={dbUsers || []} />;
    
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
    return <SettingsClient initialSettings={liveSettings} initialUsers={[]} />;
  }
}