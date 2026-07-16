'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Search, 
  Box, UserCheck, Wrench, BarChart3,
  Laptop, Keyboard, MousePointer, Headphones, ShieldAlert, X
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
  status: 'In Use' | 'Available' | 'Pending Return' | 'Discarded';
  assignedToName?: string;
  brand?: string;
}

type ReportGroup = 
  | 'CATEGORY_SUMMARY'
  | 'LAPTOPS'
  | 'WIRELESS_KEYBOARDS'
  | 'COMBO_KITS'
  | 'WIRED_KEYBOARDS'
  | 'WIRED_MICE'
  | 'HEADPHONES'
  | 'RETIRED_DISCARD';

// 🌟 DEEP NORMALIZATION ENGINE FOR CATEGORIES
const normalizeCategory = (cat: string, name: string) => {
  const c = (cat || '').toLowerCase();
  const n = (name || '').toLowerCase();
  
  if (c.includes('laptop') || n.includes('laptop')) return 'Laptop';
  if (c.includes('headphone') || n.includes('headphone') || c.includes('headset') || n.includes('earphone')) return 'Headphone';
  if (c.includes('combo') || n.includes('ckm') || (n.includes('keyboard') && n.includes('mouse'))) return 'Combo Kit (Keyboard + Mouse)';
  if (c.includes('wireless') && (c.includes('keyboard') || n.includes('keyboard'))) return 'Wireless Keyboard';
  if (c.includes('keyboard') || n.includes('keyboard')) return 'USB Wired Keyboard';
  if (c.includes('mouse') || n.includes('mouse')) return 'USB Wired Mouse';
  if (c.includes('monitor') || n.includes('monitor') || n.includes('display')) return 'Monitor';
  
  if (!cat) return 'Other / Uncategorized';
  return cat.trim().charAt(0).toUpperCase() + cat.trim().slice(1).toLowerCase();
};

// 🌟 EXACT STATUS BUCKET ENFORCEMENT
const normalizeStatus = (status: string): Asset['status'] => {
  const s = (status || '').toLowerCase().trim();
  
  if (s === 'discarded' || s.includes('discard') || s.includes('scrap') || s.includes('retire')) return 'Discarded';
  if (s === 'pending return' || s.includes('return requested') || s.includes('pending')) return 'Pending Return';
  if (s === 'in use' || s.includes('assign') || s.includes('deployed')) return 'In Use';
  
  // Fallback for Available, In Stock, etc.
  return 'Available'; 
};

// 🌟 ADVANCED BRAND RECOGNITION ENGINE (FIXED BUG)
// This catches model lines (like TUF, ThinkPad, ProBook) even if the user forgot to type the brand name.
const extractBrand = (dbBrand: string | undefined, name: string) => {
  const textToSearch = `${dbBrand || ''} ${name || ''}`.toUpperCase();

  if (/(ASUS|TUF|ROG|ZENBOOK|VIVOBOOK|EXPERTBOOK)/.test(textToSearch)) return 'ASUS';
  if (/(DELL|LATITUDE|INSPIRON|OPTIPLEX|VOSTRO|XPS|ALIENWARE|PRECISION)/.test(textToSearch)) return 'DELL';
  if (/(LENOVO|THINKPAD|IDEAPAD|YOGA|THINKBOOK|LEGION|THINKCENTRE)/.test(textToSearch)) return 'LENOVO';
  if (/(HP|HEWLETT|PROBOOK|ELITEBOOK|PAVILION|ZBOOK|SPECTRE|ENVY|OMEN)/.test(textToSearch)) return 'HP';
  if (/(APPLE|MACBOOK|IMAC|MAC MINI|MAC STUDIO|IPAD)/.test(textToSearch)) return 'APPLE';
  if (/(ACER|PREDATOR|NITRO|SWIFT|ASPIRE|SPIN)/.test(textToSearch)) return 'ACER';
  if (/(MICROSOFT|SURFACE)/.test(textToSearch)) return 'MICROSOFT';
  if (/(LOGITECH|LOGI)/.test(textToSearch)) return 'LOGITECH';
  if (/(ZEBRONICS|ZEB-)/.test(textToSearch)) return 'ZEBRONICS';
  if (/(SAMSUNG)/.test(textToSearch)) return 'SAMSUNG';
  if (/(LG)/.test(textToSearch)) return 'LG';

  // If we can't find a known brand mapping, but the database explicitly has a brand written, use that
  if (dbBrand && dbBrand.trim().length > 1) {
    return dbBrand.trim().toUpperCase();
  }

  return 'Other';
};

export default function AdminReportsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeReport, setActiveReport] = useState<ReportGroup>('CATEGORY_SUMMARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // 1. FETCH AND COMPILING DATA
  useEffect(() => {
    const fetchAssets = async () => {
      const [{ data: profilesData }, { data: assetsData, error }] = await Promise.all([
        supabase.from('profiles').select('id, name, full_name, emp_code, email'),
        supabase.from('assets').select('*')
      ]);

      if (!error && assetsData) {
        const mapped: Asset[] = assetsData.map((a) => {
          let assignedName = a.assigned_to || 'Not Assigned';
          if (profilesData && a.assigned_to) {
            const profile = profilesData.find(p => p.id === a.assigned_to);
            if (profile) assignedName = `${profile.full_name || profile.name} (${profile.emp_code || profile.email})`;
          }

          return {
            id: a.id,
            tagId: a.asset_tag || a.tag_id || 'NO-TAG',
            name: a.name || 'Unnamed Asset',
            category: normalizeCategory(a.category, a.name),
            status: normalizeStatus(a.status), 
            assignedToName: assignedName,
            brand: extractBrand(a.brand, a.name) // Using the new deep search engine
          };
        });
        setAssets(mapped);
      } else if (error) {
        console.error("Error fetching assets:", error.message);
      }
      setIsLoaded(true);
    };
    fetchAssets();
  }, []);

  const matchesReportGroup = (asset: Asset, group: ReportGroup): boolean => {
    const cat = asset.category;
    const status = asset.status;

    switch (group) {
      case 'LAPTOPS': return cat === 'Laptop';
      case 'WIRELESS_KEYBOARDS': return cat === 'Wireless Keyboard';
      case 'COMBO_KITS': return cat === 'Combo Kit (Keyboard + Mouse)';
      case 'WIRED_KEYBOARDS': return cat === 'USB Wired Keyboard';
      case 'WIRED_MICE': return cat === 'USB Wired Mouse';
      case 'HEADPHONES': return cat === 'Headphone';
      case 'RETIRED_DISCARD': return status === 'Discarded';
      default: return true;
    }
  };

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
        (a.brand && a.brand.toLowerCase().includes(q))
      );
    }
    return result;
  }, [activeReport, searchQuery, assets]);

  // 🌟 BRAND BREAKDOWN SUMMARY CALCULATOR
  const brandSummary = useMemo(() => {
    const targetAssets = activeReport === 'CATEGORY_SUMMARY' 
      ? assets 
      : assets.filter(a => matchesReportGroup(a, activeReport));

    const brands = Array.from(new Set(targetAssets.map(a => a.brand || 'Other')));
    
    return brands.map(brand => {
      const bAssets = targetAssets.filter(a => a.brand === brand);
      return {
        brand: brand,
        total: bAssets.length,
        inUse: bAssets.filter(a => a.status === 'In Use').length,
        available: bAssets.filter(a => a.status === 'Available').length,
        pendingReturn: bAssets.filter(a => a.status === 'Pending Return').length,
        discarded: bAssets.filter(a => a.status === 'Discarded').length,
      };
    }).sort((a, b) => b.total - a.total); 
  }, [activeReport, assets]);

  // --- CATEGORY SUMMARY BREAKDOWN ---
  const categorySummary = useMemo(() => {
    const categories = Array.from(new Set(assets.map(a => a.category)));
    return categories.map(cat => {
      const catAssets = assets.filter(a => a.category === cat);
      return {
        category: cat,
        total: catAssets.length,
        inUse: catAssets.filter(a => a.status === 'In Use').length,
        available: catAssets.filter(a => a.status === 'Available').length,
        pendingReturn: catAssets.filter(a => a.status === 'Pending Return').length,
        discarded: catAssets.filter(a => a.status === 'Discarded').length,
      };
    }).sort((a, b) => b.total - a.total);
  }, [assets]);

  const getGroupTitle = (group: ReportGroup) => {
    return group
      .replace('CATEGORY_SUMMARY', 'Category Global Summary')
      .replace('LAPTOPS', 'Laptops Inventory (Brand-Wise)')
      .replace('WIRELESS_KEYBOARDS', 'Wireless Keyboards Inventory')
      .replace('COMBO_KITS', 'Combo Kits (Keyboard + Mouse)')
      .replace('WIRED_KEYBOARDS', 'USB Wired Keyboards Inventory')
      .replace('WIRED_MICE', 'USB Wired Mice Inventory')
      .replace('HEADPHONES', 'Headphones & Audio Gear')
      .replace('RETIRED_DISCARD', 'Discarded Ledger Records');
  };

  // --- PDF EXPORT FUNCTION ---
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
      columns = ["Category Profile Name", "Total Inventory", "In Use", "Available", "Pending Return", "Discarded"];
      rows = categorySummary.map(c => [
        c.category, 
        c.total.toString(), 
        c.inUse.toString(), 
        c.available.toString(), 
        c.pendingReturn.toString(),
        c.discarded.toString()
      ]);
    } else {
      doc.setFontSize(14);
      doc.text("Brand-Wise Matrix Configuration Summary", 14, 43);
      
      autoTable(doc, {
        head: [["Brand Profile", "Total Count", "In Use", "Available", "Pending Return", "Discarded"]],
        body: brandSummary.map(b => [b.brand, b.total.toString(), b.inUse.toString(), b.available.toString(), b.pendingReturn.toString(), b.discarded.toString()]),
        startY: 48,
        headStyles: { fillColor: [79, 70, 229] }, 
      });

      const nextY = (doc as any).lastAutoTable.finalY + 12;
      doc.text("Individual Serialized Register Tracking Logs", 14, nextY);

      columns = ["Asset Name", "Tag ID", "Brand", "Status Mapping", "Assigned Holder Details"];
      rows = filteredAssets.map(a => [
        a.name, 
        a.tagId, 
        a.brand || 'Other', 
        a.status,
        a.status === 'In Use' ? (a.assignedToName || 'N/A') : 'N/A'
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: nextY + 5,
        headStyles: { fillColor: [0, 139, 116] }, 
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 bg-[#F8FAFC] min-h-screen p-4 md:p-8 font-sans antialiased text-slate-900 relative">
      
      {/* 🌟 ASSET DETAILS MODAL 🌟 */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Laptop className="text-indigo-600"/> Asset Details
              </h3>
              <button onClick={() => setSelectedAsset(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer">
                <X size={18}/>
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Hardware Specifications</span>
                <p className="font-black text-slate-900 text-lg leading-tight mt-0.5">{selectedAsset.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Tag ID</span>
                  <p className="font-mono text-sm font-bold text-indigo-600">{selectedAsset.tagId}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Detected Brand</span>
                  <p className="font-bold text-sm text-slate-800">{selectedAsset.brand}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Current Real Status</span>
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black tracking-wide uppercase border ${
                    selectedAsset.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                    selectedAsset.status === 'In Use' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                    selectedAsset.status === 'Pending Return' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                    'bg-rose-50 text-rose-700 border-rose-200/60'
                  }`}>
                    {selectedAsset.status}
                  </span>
                </div>
                
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <span className="text-[10px] uppercase tracking-widest font-black text-blue-400 block mb-1 flex items-center gap-1.5"><UserCheck size={12}/> Assignment Information</span>
                  <p className="font-bold text-sm text-blue-900 mt-1">
                    {selectedAsset.status === 'In Use' ? selectedAsset.assignedToName : 'Not currently assigned out.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Widget */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="text-indigo-600" size={26} /> VSIT Advanced Metrics Engine
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Extract high-fidelity brand profiles, deployment summaries, and configurations records matrix logs.</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl shadow-xs transition-colors font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer">
          <Download size={16} /> Compile PDF Blueprint
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Sidebar Navigation Filter Panel */}
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
            { id: 'WIRELESS_KEYBOARDS', label: 'Wireless Keyboards Kits', icon: <Keyboard size={16}/> },
            { id: 'COMBO_KITS', label: 'Combo Desktop Kits', icon: <Box size={16}/> },
            { id: 'WIRED_KEYBOARDS', label: 'USB Wired Keyboards', icon: <Keyboard size={16}/> },
            { id: 'WIRED_MICE', label: 'USB Wired Mice', icon: <MousePointer size={16}/> },
            { id: 'HEADPHONES', label: 'Headphones & Audio', icon: <Headphones size={16}/> },
            { id: 'RETIRED_DISCARD', label: 'Discarded Asset Ledger', icon: <ShieldAlert size={16}/> },
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

        {/* Core Processing Panel */}
        <div className="flex-1 w-full space-y-5">
          
          {/* Textual Search Filter Widget */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={`Search inside ${activeReport.replace('_',' ')}...`} 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-all" 
              />
            </div>
          </div>

          {/* DYNAMIC METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Total Count</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{filteredAssets.length}</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">In Use</p>
              <h3 className="text-xl font-black text-blue-600 mt-1">{filteredAssets.filter(a => a.status === 'In Use').length}</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Available</p>
              <h3 className="text-xl font-black text-emerald-600 mt-1">{filteredAssets.filter(a => a.status === 'Available').length}</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Pending Return</p>
              <h3 className="text-xl font-black text-amber-500 mt-1">{filteredAssets.filter(a => a.status === 'Pending Return').length}</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-black tracking-wider uppercase text-slate-400">Discarded</p>
              <h3 className="text-xl font-black text-rose-600 mt-1">{filteredAssets.filter(a => a.status === 'Discarded').length}</h3>
            </div>
          </div>

          {/* Visualized Table Grid */}
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
                      <th className="p-4">In Use</th>
                      <th className="p-4">Available</th>
                      <th className="p-4">Pending Return</th>
                      <th className="p-4">Discarded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {categorySummary.map((cat, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-900">{cat.category}</td>
                        <td className="p-4 text-slate-600">{cat.total}</td>
                        <td className="p-4 text-blue-600">{cat.inUse}</td>
                        <td className="p-4 text-emerald-600">{cat.available}</td>
                        <td className="p-4 text-amber-500">{cat.pendingReturn}</td>
                        <td className="p-4 text-rose-500">{cat.discarded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 🌟 BRAND-WISE LIVE SUMMARY MATRIX LOG VIEW */}
                <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-100 mx-5 mt-4">
                  <h4 className="text-[10px] font-black uppercase text-indigo-800 tracking-wider mb-2">Dynamic Brand Configuration Summary Matrix</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead className="text-[9px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-200/60">
                        <tr>
                          <th className="pb-2">Brand Profile</th>
                          <th className="pb-2">Total Pack</th>
                          <th className="pb-2">In Use</th>
                          <th className="pb-2">Available</th>
                          <th className="pb-2">Pending Return</th>
                          <th className="pb-2">Discarded</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-200/40">
                        {brandSummary.map((b, idx) => (
                          <tr key={idx} className="hover:bg-white/50">
                            <td className="py-2.5 font-black text-slate-900">{b.brand}</td>
                            <td className="py-2.5">{b.total}</td>
                            <td className="py-2.5 text-blue-600">{b.inUse}</td>
                            <td className="py-2.5 text-emerald-600">{b.available}</td>
                            <td className="py-2.5 text-amber-500">{b.pendingReturn}</td>
                            <td className="py-2.5 text-rose-500">{b.discarded}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Serial Logs output */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 font-black tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="p-4">Asset Identification Name</th>
                        <th className="p-4">Brand Profile</th>
                        <th className="p-4">Current Verified Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold">
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-10 text-center text-slate-400 font-medium">No serialized assets matched the selected matrix criteria.</td>
                        </tr>
                      ) : (
                        filteredAssets.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4">
                              <button 
                                onClick={() => setSelectedAsset(a)}
                                className="text-indigo-600 hover:text-indigo-800 text-left group flex flex-col cursor-pointer transition-colors"
                              >
                                <span className="font-extrabold text-sm group-hover:underline">{a.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 no-underline">Tag: {a.tagId}</span>
                              </button>
                            </td>
                            <td className="p-4 font-black text-slate-600 uppercase tracking-wide">{a.brand}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide uppercase border ${
                                a.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                                a.status === 'In Use' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                                a.status === 'Pending Return' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
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