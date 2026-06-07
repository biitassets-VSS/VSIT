"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { LogOut, MonitorSmartphone } from "lucide-react";

export default function StaffDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="flex justify-between items-center mb-8 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
              <MonitorSmartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Staff Dashboard</h2>
              <p className="text-gray-500 text-sm mt-1">Welcome to Virtual Staffing Solutions</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-6 rounded-xl text-center">
          <h3 className="text-lg font-semibold mb-2">Welcome to your workspace!</h3>
          <p className="text-sm">IT Asset forms and tools will be available here soon.</p>
        </div>

      </div>
    </div>
  );
}
