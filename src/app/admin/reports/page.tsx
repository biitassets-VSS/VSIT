'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Search, 
  Box, UserCheck, Wrench, BarChart3,
  Laptop, Keyboard, MousePointer, Headphones, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TYPES ---
interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'In Stock (Available)' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedToName?: string;
}

// Normalized report groups requested by the admin
type ReportGroup = 
  | 'CATEGORY_SUMMARY'
  | 'LAPTOPS'
  | 'WIRELESS_KEYBOARDS'
  | 'COMBO_KITS'
  | 'WIRED_KEYBOARDS'
  | 'WIRED_MICE'
  | 'HEADPHONES'
  | 'RETIRED_DISCARD';

// Helper to normalize category names
const normalizeCategory = (cat: string) => {
  if (!cat) return 'Uncategorized';
  const trimmed = cat.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// Helper function to dynamically guess the brand from the asset name
const detectBrand = (name: string) => {
  if (!name) return 'Generic';
  const upperName = name.toUpperCase();
  const brands = ['DELL', 'HP', 'LENOVO', 'APPLE', 'MACBOOK', 'LOGITECH', 'ASUS', 'ACER', 'ZEBRONICS', 'BOAT', 'JBL', 'SONY'];
  for (const brand of brands) {
    if (upperName.includes(brand)) {
      return brand === 'MACBOOK' ? 'APPLE' : brand;
    }
  }
  return 'Other';
};

export default function AdminReportsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeReport, setActiveReport] = useState<ReportGroup>('CATEGORY_SUMMARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. FETCH LIVE DATA FROM SUPABASE
  useEffect(() => {
    const fetchAssets = async () => {
      const { data, error } = await supabase.from('assets').select('*');
      if (!error && data) {
        const mapped: Asset[] = data.map((a) => ({
          id: a.id,
          tagId: a.asset_tag || a.tag_id || 'NO-TAG',
          name: a.name || 'Unnamed Asset',
          category: normalizeCategory(a.category),
          status: a.status || 'In Stock (Available)',
          assignedToName: a.assigned_to,
        }));
        setAssets(mapped);
      } else if (error) {
        console.error("Error fetching assets:", error.message);
      }
      setIsLoaded(true);
    };
    fetchAssets();
  }, []);

  // --- REPORT GROUP FILTERING DICTIONARY ---
  const matchesReportGroup = (asset: Asset, group: ReportGroup): boolean => {
    const name = asset.name.toLowerCase();
    const cat = asset.category.toLowerCase();
    const status = asset.status.toLowerCase();

    switch (group) {
      case 'LAPTOPS':
        return cat.includes('laptop') || name.includes('laptop') || name.includes('macbook');
      case 'WIRELESS_KEYBOARDS':
        return name.includes('wireless keyboard') || (name.includes('keyboard') && name.includes('wireless'));
      case 'COMBO_KITS':
        return name.includes('combo') || name.includes('kit') || (name.includes('keyboard') && name.includes('mouse'));
      case 'WIRED_KEYBOARDS':
        return (name.includes('keyboard') || cat.includes('keyboard')) && !name.includes('wireless') && !name.includes('combo');
      case 'WIRED_MICE':
        return (name.includes('mouse') || cat.includes('mouse')) && !name.includes('wireless') && !name.includes('combo');
      case 'HEADPHONES':
        return cat.includes('headphone') || name.includes('headphone') || name.includes('headset') || name.includes('earphone');
      case 'RETIRED_DISCARD':
        return status.includes('retired') || status.includes('discard') || status.includes('scrap');
      default:
        return true;
    }
  };

  // --- FILTERING ASSETS VIEW ---
  const filteredAssets = useMemo(() => {
    let result = assets;

    if (activeReport !== 'CATEGORY_SUMMARY') {
      result = result.filter(a => matchesReportGroup(a, activeReport));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.tagId.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        detectBrand(a.name).toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeReport, searchQuery, assets]);

  // --- DYNAMIC BRAND BREAKDOWN SUMMARY ---
  const brandSummary = useMemo(() => {
    // Isolate targeting set based on report selection
    const targetAssets = activeReport === 'CATEGORY_SUMMARY' 
      ? assets 
      : assets.filter(a => matchesReportGroup(a, activeReport));

    const brands = Array.from(new Set(targetAssets.map(a => detectBrand(a.name))));
    
    return brands.map(brand => {
      const bAssets = targetAssets.filter(a => detectBrand(a.name) === brand);
      return {
        brand: brand,
        total: bAssets.length,
        inStock: bAssets.filter(a => a.status === 'In Stock (Available)').length,
        assigned: bAssets.filter(a => a.status === 'Assigned').length,
        maintenance: bAssets.filter(a => a.status === 'Maintenance').length,
        retired: bAssets.filter(a => a.status === 'Retired').length,
      };
    });
  }, [activeReport, assets]);

  // --- ADVANCED CATEGORY CONFIGURATION ENGINE ---
  const categorySummary = useMemo(() => {
    const categories = Array.from(new Set(assets.map(a => a.category)));
    return categories.map(cat => {
      const catAssets = assets.filter(a => a.category === cat);
      return {
        category: cat,
        total: catAssets.length,
        inStock: catAssets.filter(a => a.status === 'In Stock (Available)').length,
        assigned: catAssets.filter(a => a.status === 'Assigned').length,
        repair: catAssets.filter(a => a.status === 'Maintenance').length,
        retired: catAssets.filter(a => a.status === 'Retired').length,
      };
    });
  }, [assets]);

  // --- AUTOMATED REPORT FORMATTER FOR TITLE IN PDF ---
  const getGroupTitle = (group: ReportGroup) => {
    return group
      .replace('CATEGORY_SUMMARY', 'Category Global Summary')
      .replace('LAPTOPS', 'Laptops Inventory (Brand-Wise)')
      .replace('WIRELESS_KEYBOARDS', 'Wireless Keyboards Inventory')
      .replace('COMBO_KITS', 'Keyboard & Mouse Combo Kits')
      .replace('WIRED_KEYBOARDS', 'Wired USB Keyboards')
      .replace('WIRED_MICE', 'Wired USB Mice')
      .replace('HEADPHONES', 'Headphones & Audio Gear')
      .replace('RETIRED_DISCARD', 'Discarded & Retired Hardware Assets');
  };

  // --- PDF EXPORT FUNCTION ENGINE ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    
    const formattedTitle = getGroupTitle(activeReport);
    doc.text(`VSIT Asset Management Report`, 14, 18);
    doc.setFontSize(12);
    doc.text(`Report Target: ${formattedTitle}`, 14, 25);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 31);
    
    let columns: string[] = [];
    let rows: string[][] = [];

    if (activeReport === 'CATEGORY_SUMMARY') {
      columns = ["Category Profile", "Total Count", "Assigned Out", "In Stock", "Under Maintenance", "Retired / Scrap"];
      rows = categorySummary.map(c => [
        c.category, 
        c.total.toString(), 
        c.assigned.toString(), 
        c.inStock.toString(), 
        c.repair.toString(),
        c.retired.toString()
      ]);
    } else {
      // Append secondary metrics table displaying the Brand matrix first
      doc.setFontSize(14);
      doc.text("Operational Brand Summary Matrix", 14, 43);
      
      autoTable(doc, {
        head: [["Brand Profile", "Total Profile", "Available (In Stock)", "Assigned Out", "Maintenance", "Retired"]],
        body: brandSummary.map(b => [b.brand, b.total.toString(), b.inStock.toString(), b.assigned.toString(), b.maintenance.toString(), b.retired.toString()]),
        startY: 48,
        headStyles: { fillColor: [79, 70, 229] }, // Slate Purple Accent
      });

      // Break off lower data down into the serialized asset registers list
      const nextY = (doc as any).lastAutoTable.finalY + 12;
      doc.text("Individual Asset Serialization Register Logs", 14, nextY);

      columns = ["Asset Identification Name", "Hardware Tag ID", "Calculated Brand", "Operational Status Status"];
      rows = filteredAssets.map(a => [
        a.name, 
        a.tagId, 
        detectBrand(a.name), 
        a.status
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: nextY + 5,
        headStyles: { fillColor: [0, 139, 116] }, // Teal Accent
      });
      
      doc.save(`VSIT_${activeReport}_Report_${new Date().toISOString().slice(0,10)}.pdf`);
      return;
    }

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 38,
      headStyles: { fillColor: [0, 139, 116] }, 
    });

    doc.save(`VSIT_Global_Summary_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (!isLoaded) return <div className="p-10 text-center font-bold text-xs tracking-widest text-indigo-600 animate-pulse uppercase">Syncing Real-time Asset Logs...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 bg-[#F8FAFC] min-h-screen p-4 md:p-8 font-sans antialiased text-slate-900">
      
      {/* Header Widget */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="text-indigo-600" size={26} /> VSIT Advanced Metrics Engine
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Extract high-fidelity brand profiles, deployment summaries, and scraps configurations records.</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl shadow-xs transition-colors font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer">
          <Download size={16} /> Compile PDF Blueprint
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Extended Sidebar Navigation Filter Panel */}
        <div className="w-full lg:w-72 shrink-0 space-y-1 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Global Summary Matrix</h3>
          <button onClick={() => setActiveReport('CATEGORY_SUMMARY')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeReport === 'CATEGORY_SUMMARY' 
                ? 'bg-indigo-50 border-indigo-200/60 text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-50 border-transparent hover:text-slate-900'
            }`}>
            <BarChart3 size={16}/> Global Summary Overview
          </button>

          <div className="h-px bg-slate-100 my-3" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Hardware Device Registers</h3>
          
          {[
            { id: 'LAPTOPS', label: 'Laptops Registers', icon: <Laptop size={16}/> },
            { id: 'WIRELESS_KEYBOARDS', label: 'Wireless Keyboards', icon: <Keyboard size={16}/> },
            { id: 'COMBO_KITS', label: 'Combo Desktop Kits', icon: <Box size={16}/> },
            { id: 'WIRED_KEYBOARDS', label: 'Wired USB Keyboards', icon: <Keyboard size={16}/> },
            { id: 'WIRED_MICE', label: 'Wired USB Mice', icon: <MousePointer size={16}/> },
            { id: 'HEADPHONES', label: 'Headphones & Audio', icon: <Headphones size={16}/> },
            { id: 'RETIRED_DISCARD', label: 'Retired / Scraped Ledger', icon: <ShieldAlert size={16}/> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveReport(tab.id as ReportGroup)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeReport === tab.id 
                  ? 'bg-indigo-50 border-indigo-200/60 text-indigo-700 shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-50 border-transparent hover:text-slate-900'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Core Processing Canvas Panel */}
        <div className="flex-1 w-full space-y-5">
          
          {/* Real-time Textual Search Filter Widget */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={`Query metrics inside ${activeReport.replace('_',' ')}...`} 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-all" 
              />
            </div>
          </div>

          {/* DYNAMIC CARD-SUMMARY GRID MATRIX PANEL FOR SPECIFIC GROUPS */}
          {activeReport !== 'CATEGORY_SUMMARY' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Total Profiled</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{filteredAssets.length}</h3>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">In Stock (Available)</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{filteredAssets.filter(a => a.status === 'In Stock (Available)').length}</h3>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Assigned Out</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">{filteredAssets.filter(a => a.status === 'Assigned').length}</h3>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Under Repair / Scrap</p>
                <h3 className="text-2xl font-black text-orange-500 mt-1">{filteredAssets.filter(a => a.status === 'Maintenance' || a.status === 'Retired').length}</h3>
              </div>
            </div>
          )}

          {/* Core Visualized Spreadsheet Data Matrix Elements */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">{getGroupTitle(activeReport)}</h3>
            </div>
            
            {activeReport === 'CATEGORY_SUMMARY' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 font-black tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="p-4">Category System Profile</th>
                      <th className="p-4">Total Inventory</th>
                      <th className="p-4">Assigned Out</th>
                      <th className="p-4">In Stock Available</th>
                      <th className="p-4">Under Repair</th>
                      <th className="p-4">Retired / Scrap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {categorySummary.map((cat, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-900">{cat.category}</td>
                        <td className="p-4 text-slate-600">{cat.total}</td>
                        <td className="p-4 text-blue-600">{cat.assigned}</td>
                        <td className="p-4 text-indigo-600">{cat.inStock}</td>
                        <td className="p-4 text-orange-500">{cat.repair}</td>
                        <td className="p-4 text-rose-500">{cat.retired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Brand Summary Nested Table Matrix View inside specific target groups */}
                <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-100 mx-5 mt-4">
                  <h4 className="text-[10px] font-black uppercase text-indigo-800 tracking-wider mb-2">Dynamic Brand Configuration Summary</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead className="text-[9px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-200/60">
                        <tr>
                          <th className="pb-2">Brand Profile</th>
                          <th className="pb-2">Total Pack</th>
                          <th className="pb-2">Available In Stock</th>
                          <th className="pb-2">Active Assignment</th>
                          <th className="pb-2">Maintenance</th>
                          <th className="pb-2">Retired</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-200/40">
                        {brandSummary.map((b, idx) => (
                          <tr key={idx} className="hover:bg-white/50">
                            <td className="py-2.5 font-black text-slate-900">{b.brand}</td>
                            <td className="py-2.5">{b.total}</td>
                            <td className="py-2.5 text-indigo-600">{b.inStock}</td>
                            <td className="py-2.5 text-blue-600">{b.assigned}</td>
                            <td className="py-2.5 text-orange-500">{b.maintenance}</td>
                            <td className="py-2.5 text-rose-500">{b.retired}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Main Individual Registry Log Entries Output */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 font-black tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="p-4">Asset Specifications Name</th>
                        <th className="p-4">Calculated Brand</th>
                        <th className="p-4">Operational Status Badge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold">
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-10 text-center text-slate-400 font-medium">No serialized assets matched the selected report criteria matrix logs.</td>
                        </tr>
                      ) : (
                        filteredAssets.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4">
                              <span className="text-slate-900 font-extrabold text-sm">{a.name}</span><br/>
                              <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 inline-block">Tag: {a.tagId}</span>
                            </td>
                            <td className="p-4 font-black text-slate-600 uppercase tracking-wide">{detectBrand(a.name)}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide uppercase border ${
                                a.status === 'In Stock (Available)' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                                a.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                                a.status === 'Maintenance' ? 'bg-orange-50 text-orange-700 border-orange-200/60' :
                                'bg-rose-50 text-rose-700 border-rose-200/60'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}