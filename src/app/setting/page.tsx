// src/app/settings/page.tsx
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function SettingsPage() {
  
  const liveSettings = {
    appName: 'Asset Management Portal',
    supportEmail: 'admin@company.com',
    allowStaffLogin: true,
    allowStaffEditAssets: false,
    requireAdminApproval: true,
    compressUploads: true,
    maxUploadSizeMB: '5',
    enableWatermarks: true,
    watermarkFormat: 'Date & Time'
  };

  try {
    // ⚠️ CHANGED from 'profiles' to 'staff'
    const { data: dbUsers, error } = await supabase
      .from('staff') 
      .select('id, name, email, role')
      .order('name', { ascending: true });

    if (error) {
      console.error("Supabase Error fetching staff:", error.message);
      return <SettingsClient initialSettings={liveSettings} initialUsers={[]} />;
    }

    return <SettingsClient initialSettings={liveSettings} initialUsers={dbUsers || []} />;
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return <SettingsClient initialSettings={liveSettings} initialUsers={[]} />;
  }
}