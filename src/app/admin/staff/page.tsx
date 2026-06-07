"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function StaffDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Force a hard reload to clear all caches
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border p-8 text-center">
        <h1 className="text-4xl font-extrabold text-indigo-600 mb-4">Staff Dashboard</h1>
        <p className="text-gray-600 mb-8 text-lg">Welcome to the Staff Portal. View your assigned assets here.</p>
        
        <button 
          onClick={handleLogout} 
          className="bg-red-50 text-red-600 font-bold px-6 py-3 rounded-lg hover:bg-red-100 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
