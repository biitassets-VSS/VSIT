'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Search, 
  Box, UserCheck, Wrench, BarChart3
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

// Helper to normalize category names (e.g., "laptop", "LAPTOP" -> "Laptop")
const normalizeCategory = (cat: string) => {
  if (!cat) return 'Uncategorized';
  const trimmed = cat.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

export default function AdminReportsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeReport, setActiveReport] = useState<string>('CATEGORY_SUMMARY');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. FETCH LIVE DATA
  useEffect(() => {
    const fetchAssets = async () => {
      const { data, error } = await supabase.from('assets').select('*');
      if (!error && data) {
        const mapped: Asset[] = data.map((a) => ({
          id: a.id,
          tagId: a.tag_id,
          name: a.name,
          category: normalizeCategory(a.category),
          status: a.status,
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

  // --- FILTERING LOGIC ---
  const filteredAssets = useMemo(() => {
    let result = assets;
    switch (activeReport) {
      case 'IN_STOCK': result = result.filter(a => a.status === 'In Stock (Available)'); break;
      case 'ASSIGNED': result = result.filter(a => a.status === 'Assigned'); break;
      case 'REPAIR': result = result.filter(a => a.status === 'Maintenance'); break;
      default: break;
    }
    if (searchQuery) {
      result = result.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.tagId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [activeReport, searchQuery, assets]);

  // --- CATEGORY SUMMARY GENERATOR ---
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
      };
    });
  }, [assets]);

  // --- PDF EXPORT FUNCTION ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    
    const reportTitle = activeReport === 'CATEGORY_SUMMARY' 
      ? 'Category Summary' 
      : activeReport.replace('_', ' ');
      
    doc.text(`Asset Report: ${reportTitle}`, 14, 20);
    
    const isSummary = activeReport === 'CATEGORY_SUMMARY';
    const columns = isSummary 
      ? ["Category", "Total", "Assigned", "In Stock", "Repair"]
      : ["Asset Name", "Tag ID", "Category", "Status"];

    const rows = isSummary 
      ? categorySummary.map(c => [c.category, c.total.toString(), c.assigned.toString(), c.inStock.toString(), c.repair.toString()])
      : filteredAssets.map(a => [a.name, a.tagId, a.category, a.status]);

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 30,
      headStyles: { fillColor: [0, 139, 116] },
    });

    doc.save(`Asset_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (!isLoaded) return <div className="p-10 text-center font-bold text-gray-500 dark:text-zinc-400">Loading Report Data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header Section */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-[#008b74]" /> Advanced Reports
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">Generate and export live database reports.</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-[#008b74] hover:bg-[#00705d] text-white px-5 py-2.5 rounded-xl shadow-md transition-all font-bold text-sm">
          <Download size={18} /> Download PDF Report
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <div className="lg:w-64 shrink-0 space-y-2 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 h-fit transition-colors">
          <h3 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-4 px-2">Report Types</h3>
          {[
            { id: 'CATEGORY_SUMMARY', label: 'Category Summary', icon: <BarChart3 size={16}/> },
            { id: 'ALL', label: 'All Assets', icon: <FileText size={16}/> },
            { id: 'IN_STOCK', label: 'In Stock', icon: <Box size={16}/> },
            { id: 'ASSIGNED', label: 'Assigned', icon: <UserCheck size={16}/> },
            { id: 'REPAIR', label: 'Under Repair', icon: <Wrench size={16}/> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveReport(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeReport === tab.id 
                  ? 'bg-[#e6f4f1] dark:bg-[#008b74]/15 text-[#008b74] border border-[#008b74]/20 dark:border-[#008b74]/30' 
                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-4">
          
          {/* Search Bar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-colors">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search current report..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 focus:ring-2 focus:ring-[#008b74] outline-none text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-colors" 
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transition-colors">
            {activeReport === 'CATEGORY_SUMMARY' ? (
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-zinc-800/50 uppercase text-[10px] text-gray-500 dark:text-zinc-400 font-black">
                  <tr>
                    <th className="p-4">Category</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Assigned</th>
                    <th className="p-4">In Stock</th>
                    <th className="p-4">Repair</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {categorySummary.map((cat, i) => (
                    <tr key={i} className="text-sm font-bold">
                      <td className="p-4 text-gray-900 dark:text-zinc-200">{cat.category}</td>
                      <td className="p-4 text-gray-900 dark:text-zinc-200">{cat.total}</td>
                      <td className="p-4 text-blue-600 dark:text-blue-400">{cat.assigned}</td>
                      <td className="p-4 text-[#008b74] dark:text-[#20c997]">{cat.inStock}</td>
                      <td className="p-4 text-orange-600 dark:text-orange-400">{cat.repair}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-zinc-800/50 uppercase text-[10px] text-gray-500 dark:text-zinc-400 font-black">
                  <tr>
                    <th className="p-4">Asset Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {filteredAssets.map((a) => (
                    <tr key={a.id} className="text-sm">
                      <td className="p-4 font-bold text-gray-900 dark:text-zinc-200">
                        {a.name}<br/>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">{a.tagId}</span>
                      </td>
                      <td className="p-4 font-bold text-gray-600 dark:text-zinc-400">{a.category}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 font-bold text-xs text-gray-700 dark:text-zinc-300">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}