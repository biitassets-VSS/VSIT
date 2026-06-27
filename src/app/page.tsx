'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const checkStaffAuthorization = async () => {
      try {
        // 1. Grab the session saved by your login page
        const sessionStr = localStorage.getItem('vsit_staff_session') || localStorage.getItem('user');
        if (!sessionStr) {
          router.replace('/login');
          return;
        }

        let loggedInUser: any = {};
        try {
          loggedInUser = JSON.parse(sessionStr);
        } catch (e) {
          loggedInUser = { email: sessionStr };
        }

        const cleanEmail = loggedInUser.email?.toLowerCase().trim();

        // 🛑 CRITICAL RESTRICTION: Keep your admin email out of the staff dashboard
        if (cleanEmail === 'lakhwinder.bi@outlook.com') {
          alert("Access Denied: Admins must use the Admin Control Desk.");
          router.replace('/admin');
          return;
        }

        // 2. Query your Supabase profiles table to pull the uploaded profile info
        const { data: staffProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (error) throw error;

        // 3. Authorization rules (Must exist, must be Active, and role shouldn't be admin)
        if (staffProfile && staffProfile.status === 'Active' && staffProfile.role?.toLowerCase() !== 'admin') {
          setProfile(staffProfile);
          setIsAuthorized(true);
        } else {
          // If deactivated or profile missing from batch upload, kick them out
          alert("Unauthorized access or inactive employee record.");
          router.replace('/');
        }
      } catch (err) {
        console.error("Authorization engine failure:", err);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    checkStaffAuthorization();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Verifying Staff Clearance...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  // 4. If authorization succeeds, display the rest of your UI using the profile data
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200">
        <h1 className="text-2xl font-black">Staff Workbench</h1>
        <p className="text-sm font-semibold text-slate-500">
          Welcome back, {profile?.full_name || profile?.name}! 
        </p>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Role: {profile?.role} | Department: {profile?.department} | Code: {profile?.emp_code}
        </p>
      </div>
      
      {/* Rest of your grid cards and device logs go here */}
    </div>
  );
}