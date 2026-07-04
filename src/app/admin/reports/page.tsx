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

// Helper to normalize category names
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
      headStyles: { fillColor: [0, 139, 116] }, // #008b74 RGB
    });

    doc.save(`Asset_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (!isLoaded) return <div className="p-10 text-center font-medium text-slate-500 tracking-wide">Loading Report Data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 bg-slate-50 min-h-screen p-4 md:p-8">
      
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="text-brand" /> Advanced Reports
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Generate and export live database reports.</p>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-5 py-2.5 rounded-xl shadow-sm transition-all font-semibold text-sm">
          <Download size={18} /> Download PDF Report
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <div className="lg:w-64 shrink-0 space-y-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-4 px-2">Report Types</h3>
          {[
            { id: 'CATEGORY_SUMMARY', label: 'Category Summary', icon: <BarChart3 size={16}/> },
            { id: 'ALL', label: 'All Assets', icon: <FileText size={16}/> },
            { id: 'IN_STOCK', label: 'In Stock', icon: <Box size={16}/> },
            { id: 'ASSIGNED', label: 'Assigned', icon: <UserCheck size={16}/> },
            { id: 'REPAIR', label: 'Under Repair', icon: <Wrench size={16}/> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveReport(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeReport === tab.id 
                  ? 'bg-brand-light text-brand border border-brand/20 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-4">
          
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search current report..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-brand focus:border-brand-muted outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all" 
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {activeReport === 'CATEGORY_SUMMARY' ? (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 uppercase text-[11px] text-slate-500 font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Category</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Assigned</th>
                    <th className="p-4">In Stock</th>
                    <th className="p-4">Repair</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categorySummary.map((cat, i) => (
                    <tr key={i} className="text-sm font-semibold hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-900">{cat.category}</td>
                      <td className="p-4 text-slate-600">{cat.total}</td>
                      <td className="p-4 text-blue-600">{cat.assigned}</td>
                      <td className="p-4 text-brand">{cat.inStock}</td>
                      <td className="p-4 text-orange-500">{cat.repair}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 uppercase text-[11px] text-slate-500 font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Asset Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.map((a) => (
                    <tr key={a.id} className="text-sm hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {a.name}<br/>
                        <span className="text-[11px] text-slate-500 font-medium">{a.tagId}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">{a.category}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-bold text-[11px] text-slate-700">
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