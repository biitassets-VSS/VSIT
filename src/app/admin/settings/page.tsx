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
    supportEmail: 'support@vsit.com',
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
        .select(`
          *,
          profiles:user_id (full_name, name, emp_code)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (!reqError && requests) {
        dbRequests = requests.map(req => ({
          ...req,
          staff_name: req.profiles?.full_name || req.profiles?.name || 'Unknown Staff',
          emp_code: req.profiles?.emp_code || 'N/A'
        }));
      }
    }
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 p-4 sm:p-6 lg:p-8">
      {/* 🌟 Removed the fixed background orbs from here to eliminate the double background. 
          The portal will now rely solely on the clean layout.tsx background! */}
      
      <SettingsClient 
        initialSettings={liveSettings} 
        initialUsers={dbUsers} 
        initialRequests={dbRequests} 
      />
    </div>
  );
}