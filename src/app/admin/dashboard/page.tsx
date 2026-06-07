"use client"; 

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface StaffMember {
  id: string;
  email: string;
  role: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles") 
        .select("*")
        .eq("role", "staff"); 

      if (error) throw error;
      setStaffList(data || []);
      
    } catch (error: any) {
      console.error("Error fetching staff:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this staff member? This cannot be undone."
    );
    if (!isConfirmed) return;

    try {
      const { error } = await supabase.rpc("delete_user", { user_id: staffId });
      if (error) throw error;
      alert("Staff member deleted successfully!");
      setStaffList((currentList) =>
        currentList.filter((staff) => staff.id !== staffId)
      );
    } catch (error: any) {
      console.error("Error deleting staff:", error.message);
      alert("Failed to delete staff member.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Manage Virtual Staffing Solutions Staff</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading staff members...</p>
        ) : staffList.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200">No staff members found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b-2 border-gray-200 p-4 text-sm font-semibold text-gray-700 rounded-tl-lg">Email</th>
                  <th className="border-b-2 border-gray-200 p-4 text-sm font-semibold text-gray-700">Role</th>
                  <th className="border-b-2 border-gray-200 p-4 text-sm font-semibold text-gray-700 rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                    <td className="border-b border-gray-100 p-4 text-sm text-gray-700">
                      {staff.email}
                    </td>
                    <td className="border-b border-gray-100 p-4">
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                        {staff.role}
                      </span>
                    </td>
                    <td className="border-b border-gray-100 p-4">
                      <button
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="bg-red-500 text-white border-none px-4 py-2 rounded-lg cursor-pointer font-semibold text-sm hover:bg-red-600 transition-colors shadow-sm"
                      >
                        Delete Account
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
