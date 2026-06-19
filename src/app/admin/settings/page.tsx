// src/app/settings/page.tsx
import SettingsClient from './SettingsClient';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for the Server
// Ensure these environment variables exist in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Or your Service Role key
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function SettingsPage() {
  
  // Default Settings (You can fetch these from Supabase later if you create a settings table)
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
    // FETCH REAL USERS FROM SUPABASE
    // Change 'profiles' to whatever your table is named (e.g., 'users' or 'staff')
    const { data: dbUsers, error } = await supabase
      .from('profiles') 
      .select('id, name, email, role')
      .order('name', { ascending: true });

    if (error) {
      console.error("Supabase Error fetching users:", error.message);
      return <SettingsClient initialSettings={liveSettings} initialUsers={[]} />;
    }

    // Pass the fetched data to your Client Component
    return <SettingsClient initialSettings={liveSettings} initialUsers={dbUsers || []} />;
    
  } catch (error) {
    console.error("Unexpected error connecting to Supabase:", error);
    return <SettingsClient initialSettings={liveSettings} initialUsers={[]} />;
  }
}