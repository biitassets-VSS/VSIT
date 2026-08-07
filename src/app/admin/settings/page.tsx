import React from 'react';
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface UserProfile {
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
    supportEmail: 'lakhwinder.bi@outlook.com',
    allowStaffLogin: true,
    allowStaffEditAssets: false,
    requireAdminApproval: true,
    compressUploads: true,
    maxUploadSizeMB: '10',
    enableWatermarks: true,
    watermarkFormat: 'Date, Time, Tag ID, Emp Name & Emp Code',
    securityPolicy: 'Standard (Passwords Only)',
    sessionTimeoutMinutes: '60',
    maintenanceMode: false,
    systemAnnouncement: 'Welcome to the VSIT Admin Portal.',
  };

  let dbUsers: UserProfile[] = [];
  let dbRequests: any[] = [];
  
  try {
    if (supabaseUrl && supabaseKey) {
      // 1. Fetch Users
      const { data: users, error: usersError } = await supabase
        .from('profiles') 
        .select('id, name, full_name, email, role, emp_code')
        .order('full_name', { ascending: true });

      if (!usersError && users) {
        dbUsers = users as UserProfile[];
      } else {
        console.error("Supabase Error fetching users:", usersError?.message);
      }

      // 2. Fetch Requests for Cleanup
      const { data: requests, error: reqError } = await supabase
        .from('tickets') 
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (!reqError && requests) {
        dbRequests = requests;
      }
    }
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
  }

  // 🌟 Make absolutely sure the prop names match the Client component interface
  return (
    <SettingsClient 
      initialSettings={liveSettings} 
      initialUsers={dbUsers} 
    />
  );
}