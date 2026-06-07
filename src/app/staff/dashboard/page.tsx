"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { LogOut, MonitorSmartphone, AlertTriangle, AlertCircle, CheckCircle, Clock, UploadCloud, X } from "lucide-react";

export default function StaffDashboard() {
  const router = useRouter();
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data } = await supabase
        .from("inspections")
        .select("*")
        .eq("assigned_to", user.id)
        .order("due_date", { ascending: true });
      setInspections(data || []);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getStatusDisplay = (status: string, dueDate: string) => {
    if (status === "approved") return { color: "text-green-600 bg-green-50", icon: <CheckCircle className="w-4 h-4" />, text: "Inspection Done" };
    if (status === "submitted") return { color: "text-blue-600 bg-blue-50", icon: <Clock className="w-4 h-4" />, text: "Pending Approval" };
    
    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilDue < 0) return { color: "text-red-600 bg-red-50", icon: <AlertCircle className="w-4 h-4" />, text: "Overdue Warning" };
    if (daysUntilDue <= 2) return { color: "text-orange-600 bg-orange-50", icon: <AlertTriangle className="w-4 h-4" />, text: "Due Soon Alert" };
    
    return { color: "text-slate-600 bg-slate-100", icon: <Clock className="w-4 h-4" />, text: "Pending" };
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;
    setUploading(true);

    try {
      let photo_url = null;
      
      // Upload Photo if exists
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedInspection.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("inspections").upload(fileName, file);
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from("inspections").getPublicUrl(fileName);
        photo_url = publicUrlData.publicUrl;
      }

      // Update Database
      const { error } = await supabase.from("inspections").update({
        notes,
        photo_url,
        status: "submitted"
      }).eq("id", selectedInspection.id);

      if (error) throw error;
      
      alert("Inspection submitted for admin approval!");
      setSelectedInspection(null);
      setNotes("");
      setFile(null);
      fetchData(); // Refresh list
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-md">
              <MonitorSmartphone className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Staff Dashboard</h2>
              <p className="text-slate-500 text-sm mt-1">Virtual Staffing Solutions - My Tasks</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-bold">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-4">My Asset Inspections</h3>

        {/* Inspections List */}
        <div className="grid gap-4">
          {loading ? (
            <p className="text-slate-500 animate-pulse">Loading assignments...</p>
          ) : inspections.length === 0 ? (
            <div className="bg-slate-50 p-6 rounded-2xl text-center border border-slate-100">
              <p className="text-slate-500">You have no pending asset inspections right now. Great job!</p>
            </div>
          ) : (
            inspections.map((task) => {
              const status = getStatusDisplay(task.status, task.due_date);
              return (
                <div key={task.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-300 transition-all">
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{task.asset_name}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${status.color}`}>
                      {status.icon} {status.text}
                    </span>
                    {task.status === "pending" && (
                      <button 
                        onClick={() => setSelectedInspection(task)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-all"
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* INSPECTION FORM MODAL */}
      {selectedInspection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedInspection(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-slate-900 mb-1">Inspect Asset</h3>
            <p className="text-sm text-slate-500 mb-6">Updating condition for: <strong className="text-blue-600">{selectedInspection.asset_name}</strong></p>

            <form onSubmit={handleSubmitInspection} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Condition Notes</label>
                <textarea
                  required
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the current condition of the asset (e.g., scratches, working perfectly...)"
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Upload Photo Evidence</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <UploadCloud className="w-8 h-8 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-600">
                      {file ? file.name : "Click to select a photo"}
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {uploading ? "Submitting..." : "Submit Inspection"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
