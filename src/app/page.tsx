"use client"; // Required for Next.js when using state and click events

import React, { useState, useEffect } from "react";
// ⚠️ IMPORTANT: Change the path below to wherever your Supabase client is located in your project!
// It might be something like "@/lib/supabase" or "../utils/supabaseClient"
import { supabase } from "@/lib/supabaseClient";

// Define a TypeScript interface for your staff data
interface StaffMember {
  id: string;
  email: string;
  role: string;
}

export default function AdminDashboard() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // 1️⃣ Fetch staff members when the page loads
  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      
      // Note: Change 'profiles' to the actual name of your table!
      const { data, error } = await supabase
        .from("profiles") 
        .select("*")
        .eq("role", "staff"); // Grabs only users with the role of 'staff'

      if (error) throw error;
      setStaffList(data || []);
      
    } catch (error: any) {
      console.error("Error fetching staff:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ The Delete Function
  const handleDeleteStaff = async (staffId: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this staff member? This cannot be undone."
    );
    if (!isConfirmed) return;

    try {
      // Calls the custom SQL function we created in the Supabase Dashboard
      const { error } = await supabase.rpc("delete_user", { user_id: staffId });

      if (error) throw error;

      alert("Staff member deleted successfully!");

      // Instantly remove the deleted user from the screen
      setStaffList((currentList) =>
        currentList.filter((staff) => staff.id !== staffId)
      );
    } catch (error: any) {
      console.error("Error deleting staff:", error.message);
      alert("Failed to delete staff member.");
    }
  };

  // 3️⃣ The UI
  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2>Admin Dashboard - Manage Staff</h2>

      {loading ? (
        <p>Loading staff members...</p>
      ) : staffList.length === 0 ? (
        <p>No staff members found.</p>
      ) : (
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "2px solid #ccc", padding: "10px" }}>Email</th>
              <th style={{ borderBottom: "2px solid #ccc", padding: "10px" }}>Role</th>
              <th style={{ borderBottom: "2px solid #ccc", padding: "10px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                  {staff.email}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                  <span style={{ background: "#e6f7ff", color: "#0050b3", padding: "4px 8px", borderRadius: "4px" }}>
                    {staff.role}
                  </span>
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                  <button
                    onClick={() => handleDeleteStaff(staff.id)}
                    style={{
                      backgroundColor: "#ff4d4f",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    Delete Account
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
