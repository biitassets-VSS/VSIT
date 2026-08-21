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
  status: string;
  qualification: string;
  experience: string;
  skills: string;
  interview_date: string;
  typing_speed: string;
  communication_skills: string;
  joining_date: string;
  hr_notes: string;
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
    watermarkFormat: 'Date, Time, Tag ID, Emp Name, Emp Code, Device Name/ID',
    securityPolicy: 'Standard (Passwords Only)',
    sessionTimeoutMinutes: '60',
    maintenanceMode: false,
    systemAnnouncement: 'Welcome to the VSIT Admin Portal.',
  };

  let dbUsers: UserProfile[] = [];
  let dbRequests: any[] = [];
  
  try {
    if (supabaseUrl && supabaseKey) {
      const { data: users, error: usersError } = await supabase
        .from('profiles') 
        .select('*')
        .order('full_name', { ascending: true });

      if (!usersError && users) {
        dbUsers = users as UserProfile[];
      }

      const { data: tickets } = await supabase
        .from('tickets') 
        .select(`*, profiles:user_id (full_name, name, emp_code)`)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: inspections } = await supabase
        .from('inspections') 
        .select(`*`)
        .order('created_at', { ascending: false })
        .limit(100);
        
      const formattedTickets = (tickets || []).map(req => ({
        ...req,
        type: 'Ticket',
        table: 'tickets',
        display_detail: req.issue_description || req.subject,
        staff_name: req.profiles?.full_name || req.profiles?.name || 'Unknown Staff',
        emp_code: req.profiles?.emp_code || 'N/A'
      }));

      const formattedInspections = (inspections || []).map(insp => ({
        ...insp,
        type: 'Asset Return / Inspection',
        table: 'inspections',
        display_detail: insp.notes || insp.admin_remarks || 'Hardware Log',
        staff_name: insp.user_name || 'System / Admin',
        emp_code: insp.emp_code || 'N/A'
      }));

      dbRequests = [...formattedTickets, ...formattedInspections].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
  }

  return (
    <div className="min-h-screen bg-transparent relative z-10 p-4 sm:p-6 lg:p-8">
      <SettingsClient 
        initialSettings={liveSettings} 
        initialUsers={dbUsers} 
        initialRequests={dbRequests} 
      />
    </div>
  );
}