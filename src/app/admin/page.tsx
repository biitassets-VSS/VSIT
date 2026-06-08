"use client";

import React, { useState, useEffect } from "react";
// ⚠️ IMPORTANT: Adjust this path to match exactly where your supabase client is!
import { supabase } from "@/lib/supabaseClient"; 

export default function AdminDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [pendingInspections, setPendingInspections] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Form states for creating a new asset
  const [assetName, setAssetName] = useState("");
  const [assetDetails, setAssetDetails] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all assets
      const { data: assetData, error: assetError } = await supabase
        .from("assets")
        .select(`
          id, name, details, next_inspection_date, 
          profiles ( email )
        `); // We also fetch the email of the assigned staff

      if (assetError) throw assetError;
      setAssets(assetData || []);

      // 2. Fetch count of pending inspections
      const { count, error: countError } = await supabase
        .from("inspections")
        .select("*", { count: 'exact', head: true })
        .eq("status", "Pending Approval");

      if (countError) throw countError;
      setPendingInspections(count || 0);

    } catch (error: any) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to Create a New Asset
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("assets")
        .insert([{ 
          name: assetName, 
          details: assetDetails,
          // We leave assigned_to null for now, until you assign it to staff
        }]);

      if (error) throw error;
      
      alert("Asset Created Successfully!");
      setAssetName(""); // Clear form
      setAssetDetails(""); // Clear form
      fetchDashboardData(); // Refresh the list so it doesn't show zero!

    } catch (error: any) {
      alert("Error creating asset: " + error.message);
    }
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>Admin Dashboard</h1>

      {/* --- DASHBOARD STATS SECTION --- */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div style={{ padding: "20px", background: "#f0f2f5", borderRadius: "8px", flex: 1 }}>
          <h3>Total Assets</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>{assets.length}</p>
        </div>
        <div style={{ padding: "20px", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: "8px", flex: 1 }}>
          <h3>Pending Approvals</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "#faad14" }}>
            {pendingInspections}
          </p>
        </div>
      </div>

      {/* --- CREATE ASSET SECTION --- */}
      <div style={{ padding: "20px", background: "#fafafa", border: "1px solid #ddd", borderRadius: "8px", marginBottom: "30px" }}>
        <h3>Create New Asset</h3>
        <form onSubmit={handleCreateAsset} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Asset Name (e.g. Laptop, Vehicle)"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            required
            style={{ padding: "10px", flex: 1 }}
          />
          <input
            type="text"
            placeholder="Details / Serial Number"
            value={assetDetails}
            onChange={(e) => setAssetDetails(e.target.value)}
            style={{ padding: "10px", flex: 2 }}
          />
          <button type="submit" style={{ padding: "10px 20px", background: "blue", color: "white", border: "none", cursor: "pointer" }}>
            Add Asset
          </button>
        </form>
      </div>

      {/* --- ASSETS LIST SECTION --- */}
      <h3>All Assets Status</h3>
      {assets.length === 0 ? (
        <p>No assets found. Create one above!</p>
      ) : (
        <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "2px solid #ccc", padding: "10px" }}>Asset Name</th>
              <th style={{ borderBottom: "2px solid #ccc", padding: "10px" }}>Details</th>
              <th style={{ borderBottom: "2px solid #ccc", padding: "10px" }}>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>{asset.name}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>{asset.details}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: "10px" }}>
                  {asset.profiles ? asset.profiles.email : <span style={{ color: "gray" }}>Unassigned</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  
  );
}
