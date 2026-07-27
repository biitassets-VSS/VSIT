import React from 'react';
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

  return <SettingsClient initialSettings={liveSettings} initialUsers={dbUsers} />;
}