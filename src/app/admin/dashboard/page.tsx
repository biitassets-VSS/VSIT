"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LogOut, Users, MonitorSmartphone, ShieldCheck, Download, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"staff" | "inspections">("staff");
  const [users, setUsers] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === "staff") {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setUsers(data || []);
    } else {
      const { data } = await supabase.from("inspections").select("*, profiles:assigned_to(email)").order("due_date", { ascending: true });
      setInspections(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("inspections").update({ status: "approved" }).eq("id", id);
    if (!error) {
      alert("Inspection Approved!");
      fetchData();
    }
  };

  const handleDownloadReport = () => {
    const headers = "ID,Asset Name,Staff Assigned,Due Date,Status,Notes\n";
    const rows = inspections.map(i => 
      `${i.id},"${i.asset_name}","${i.profiles?.email || 'Unknown'}","${i.due_date}","${i.status}","${(i.notes || '').replace(/"/g, '""')}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VSS_Inspection_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-400">
            <ShieldCheck className="w-8 h-8" />
            <h1 className="font-bold text-lg leading-tight">Admin<br/>Control</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab("staff")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'staff' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Users className="w-5 h-5" /> Manage Staff
          </button>
          <button 
            onClick={() => setActiveTab("inspections")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'inspections' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <MonitorSmartphone className="w-5 h-5" /> Inspections
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex justify-center gap-2 bg-slate-800 hover:bg-red-500 px-4 py-3 rounded-xl font-medium transition-all">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900">Virtual Staffing Solutions</h2>
          <p className="text-slate-500 mt-1">System Management Overview</p>
        </header>

        {/* STAFF TAB CONTENT */}
        {activeTab === "staff" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold">Staff Directory</h3></div>
            <div className="p-6">
              {loading ? <p>Loading...</p> : (
                <ul className="space-y-3">
                  {users.map(u => (
                    <li key={u.id} className="p-4 bg-slate-50 rounded-xl flex justify-between items-center">
                      <span className="font-medium">{u.email}</span>
                      <span className="px-3 py-1 bg-slate-200 rounded-full text-xs font-bold">{u.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* INSPECTIONS TAB CONTENT */}
        {activeTab === "inspections" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-lg font-bold text-slate-900">Asset Inspections</h3>
              <button onClick={handleDownloadReport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-all">
                <Download className="w-4 h-4" /> Download Report
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="p-4">Asset</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="p-6 text-center">Loading inspections...</td></tr>
                  ) : inspections.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center">No inspections found.</td></tr>
                  ) : (
                    inspections.map((insp) => (
                      <tr key={insp.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-900">{insp.asset_name}</td>
                        <td className="p-4 text-sm text-slate-600">{insp.profiles?.email}</td>
                        <td className="p-4 text-sm text-slate-600">{new Date(insp.due_date).toLocaleDateString()}</td>
                        <td className="p-4">
                          {insp.status === "approved" ? (
                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-lg text-xs font-bold w-max"><CheckCircle className="w-4 h-4"/> Complete</span>
                          ) : insp.status === "submitted" ? (
                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg text-xs font-bold w-max"><Clock className="w-4 h-4"/> Needs Approval</span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold w-max">Pending</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {insp.photo_url && (
                            <a href={insp.photo_url} target="_blank" className="text-blue-600 hover:underline text-sm font-medium">View Photo</a>
                          )}
                          {insp.status === "submitted" && (
                            <button onClick={() => handleApprove(insp.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700">Approve</button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
