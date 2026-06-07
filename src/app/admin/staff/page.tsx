"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function StaffDashboard() {
  const [debug, setDebug] = useState<any>("Fetching database info...");

  useEffect(() => {
    async function checkDatabase() {
      // 1. Get the currently logged in user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setDebug("No user found. You might not be logged in properly.");
        return;
      }

      // 2. Fetch their exact row from the profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // 3. Display the raw data on the screen
      setDebug({
        authenticatedEmail: user.email,
        databaseUserId: user.id,
        roleFoundInDatabase: profile?.role || "NO ROLE FOUND",
        error: profileError?.message || "No errors reading database",
      });
    }
    checkDatabase();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Database X-Ray Tool</h1>
        <p className="mb-6 text-gray-700 font-medium">
          You were routed to the Staff Dashboard. Let's look at exactly what Vercel is reading from your database right now:
        </p>
        
        <div className="bg-gray-900 text-green-400 p-6 rounded-xl text-left overflow-auto mb-8 font-mono text-sm shadow-inner">
          <pre>{JSON.stringify(debug, null, 2)}</pre>
        </div>

        <button 
          onClick={handleLogout} 
          className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
