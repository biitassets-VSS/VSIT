"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LogOut, Users, MonitorSmartphone, ShieldCheck, LayoutDashboard, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this user? This removes all their access.");
    if (!isConfirmed) return;

    try {
      // Assuming you have a secure RPC function to delete users. 
      // If not, you may need to delete them from auth.users in the Supabase dashboard manually for now.
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
      
      alert("User removed successfully!");
      setUsers(users.filter((user) => user.id !== userId));
    } catch (error: any) {
      console.error("Error deleting user:", error.message);
      alert("Failed to delete user. Check console for details.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Quick stats calculations
  const totalStaff = users.filter(u => u.role === 'staff').length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <ShieldCheck className="w-8 h-8" />
            <h1 className="font-bold text-lg leading-tight">Admin<br/>Control</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-xl font-medium shadow-sm transition-all">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <Users className="w-5 h-5" /> Manage Staff
          </button>
          <button className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800 hover:text-white px-4 py-3 rounded-xl font-medium transition-all">
            <MonitorSmartphone className="w-5 h-5" /> IT Assets
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-300 px-4 py-3 rounded-xl font-medium transition-all"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        <header className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900">Virtual Staffing Solutions</h2>
          <p className="text-slate-500 mt-1">Full System Overview & Management</p>
        </header>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalStaff}</h3>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Admins</p>
              <h3 className="text-3xl font-bold text-slate-900">{totalAdmins}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl">
              <MonitorSmartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Assets</p>
              <h3 className="text-3xl font-bold text-slate-900">--</h3>
            </div>
          </div>
        </div>

        {/* STAFF MANAGEMENT TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-slate-900">User Management</h3>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Email Address</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Role</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Joined Date</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">Loading user data...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No users found in database.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-900">{user.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
