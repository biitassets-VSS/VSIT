'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Filter, Search, 
  AlertCircle, CheckCircle2, Clock, 
  Package, Wrench, UserCheck, Box, BarChart3
} from 'lucide-react';

// --- TYPES ---
type UsageStatus = 'Assigned' | 'Unassigned' | 'Demo Use' | 'Under Repair' | 'Discarded';
type InspectionStatus = 'Pending' | 'Passed' | 'Failed';

interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: UsageStatus;
  assignedToName?: string;
  inspectionStatus: InspectionStatus;
  lastInspectionDate: string;
}

// --- MOCK DATABASE ---
const CATEGORIES = ['Laptops', 'Monitors', 'Keyboards', 'Mouse', 'Headphones', 'Stands', 'Cleaning Kits', 'Others'];

const mockAssets: Asset[] = [
  { id: '1', tagId: 'TAG-1045', name: 'MacBook Pro 14"', category: 'Laptops', status: 'Assigned', assignedToName: 'Lakhwinder Singh', inspectionStatus: 'Passed', lastInspectionDate: '2023-10-01' },
  { id: '2', tagId: 'TAG-2099', name: 'Dell UltraSharp 27"', category: 'Monitors', status: 'Unassigned', inspectionStatus: 'Pending', lastInspectionDate: 'N/A' },
  { id: '3', tagId: 'TAG-3011', name: 'Logitech MX Master 3', category: 'Mouse', status: 'Demo Use', inspectionStatus: 'Passed', lastInspectionDate: '2023-10-10' },
  { id: '4', tagId: 'TAG-1088', name: 'MacBook Air M1', category: 'Laptops', status: 'Under Repair', inspectionStatus: 'Failed', lastInspectionDate: '2023-08-20' },
  { id: '5', tagId: 'TAG-4001', name: 'Magic Keyboard', category: 'Keyboards', status: 'Assigned', assignedToName: 'Sarah Connor', inspectionStatus: 'Pending', lastInspectionDate: '2023-05-11' },
  { id: '6', tagId: 'TAG-5022', name: 'Sony WH-1000XM4', category: 'Headphones', status: 'Unassigned', inspectionStatus: 'Passed', lastInspectionDate: '2023-11-01' },
  { id: '7', tagId: 'TAG-6019', name: 'Laptop Stand Pro', category: 'Stands', status: 'Demo Use', inspectionStatus: 'Failed', lastInspectionDate: '2023-09-30' },
];

// --- REPORT TYPES ---
type ReportType = 
  | 'CATEGORY_SUMMARY' 
  | 'ALL' 
  | 'IN_STOCK' 
  | 'ASSIGNED' 
  | 'DEMO' 
  | 'REPAIR' 
  | 'INSP_PENDING' 
  | 'INSP_PASSED' 
  | 'INSP_FAILED';

export default function AdminReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('CATEGORY_SUMMARY');
  const [searchQuery, setSearchQuery] = useState('');

  // --- FILTERING LOGIC ---
  const filteredAssets = useMemo(() => {
    let result = mockAssets;

    // Apply Report Type Filter
    switch (activeReport) {
      case 'IN_STOCK': result = result.filter(a => a.status === 'Unassigned'); break;
      case 'ASSIGNED': result = result.filter(a => a.status === 'Assigned'); break;
      case 'DEMO': result = result.filter(a => a.status === 'Demo Use'); break;
      case 'REPAIR': result = result.filter(a => a.status === 'Under Repair'); break;
      case 'INSP_PENDING': result = result.filter(a => a.inspectionStatus === 'Pending'); break;
      case 'INSP_PASSED': result = result.filter(a => a.inspectionStatus === 'Passed'); break;
      case 'INSP_FAILED': result = result.filter(a => a.inspectionStatus === 'Failed'); break;
      default: break; // 'ALL' or 'CATEGORY_SUMMARY' shows all base data
    }

    // Apply Search Filter
    if (searchQuery) {
      result = result.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.assignedToName && a.assignedToName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return result;
  }, [activeReport, searchQuery]);

  // --- CATEGORY SUMMARY GENERATOR ---
  const categorySummary = useMemo(() => {
    return CATEGORIES.map(cat => {
      const catAssets = mockAssets.filter(a => a.category === cat);
      return {
        category: cat,
        total: catAssets.length,
        inStock: catAssets.filter(a => a.status === 'Unassigned').length,
        assigned: catAssets.filter(a => a.status === 'Assigned').length,
        demo: catAssets.filter(a => a.status === 'Demo Use').length,
        repair: catAssets.filter(a => a.status === 'Under Repair').length,
      };
    }).filter(c => c.total > 0); // Only show categories that have items
  }, []);

  const handleExportCSV = () => {
    alert(`Exporting ${activeReport.replace('_', ' ')} report as CSV/PDF...`);
    // In production, this would generate a real CSV or PDF download
  };

  // Helpers for UI
  const getStatusBadge = (status: UsageStatus) => {
    switch(status) {
      case 'Assigned': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Assigned</span>;
      case 'Unassigned': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase">In Stock</span>;
      case 'Demo Use': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Demo</span>;
      case 'Under Repair': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Repair</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const getInspectionBadge = (status: InspectionStatus) => {
    switch(status) {
      case 'Passed': return <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircle2 size={14}/> Passed</span>;
      case 'Failed': return <span className="text-red-600 flex items-center gap-1 text-xs font-bold"><AlertCircle size={14}/> Failed</span>;
      case 'Pending': return <span className="text-yellow-600 flex items-center gap-1 text-xs font-bold"><Clock size={14}/> Pending</span>;
    }
  };

  const reportTabs = [
    { id: 'CATEGORY_SUMMARY', label: 'Category Summary', icon: <BarChart3 size={16}/> },
    { id: 'ALL', label: 'All Assets List', icon: <FileText size={16}/> },
    { id: 'IN_STOCK', label: 'In Stock (Unassigned)', icon: <Box size={16}/> },
    { id: 'ASSIGNED', label: 'Assigned to Staff', icon: <UserCheck size={16}/> },
    { id: 'DEMO', label: 'Demo Use', icon: <Package size={16}/> },
    { id: 'REPAIR', label: 'Under Repair', icon: <Wrench size={16}/> },
    { id: 'INSP_PENDING', label: 'Inspection Pending', icon: <Clock size={16}/> },
    { id: 'INSP_PASSED', label: 'Inspection Passed', icon: <CheckCircle2 size={16}/> },
    { id: 'INSP_FAILED', label: 'Inspection Failed', icon: <AlertCircle size={16}/> },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" /> Advanced Reports
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Generate, view, and export asset and inspection reports.</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-md transition-all font-bold text-sm">
          <Download size={18} /> Export Current Report
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT SIDEBAR: REPORT SELECTOR */}
        <div className="lg:w-64 shrink-0 space-y-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-fit sticky top-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
            <Filter size={14}/> Report Types
          </h3>
          {reportTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeReport === tab.id 
                  ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* RIGHT CONTENT: REPORT DATA */}
        <div className="flex-1 space-y-4">
          
          {/* Action Bar (Search) */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Filter current report by name, tag, or staff..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
              />
            </div>
            <div className="text-sm font-bold text-gray-500 px-4">
              Showing: <span className="text-blue-600">{activeReport === 'CATEGORY_SUMMARY' ? categorySummary.length : filteredAssets.length}</span> results
            </div>
          </div>

          {/* TABLE AREA */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* VIEW 1: CATEGORY SUMMARY TABLE */}
            {activeReport === 'CATEGORY_SUMMARY' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-black">
                      <th className="p-4 pl-6">Category Name</th>
                      <th className="p-4">Total Assets</th>
                      <th className="p-4">Assigned (In Use)</th>
                      <th className="p-4">In Stock (Unassigned)</th>
                      <th className="p-4">Demo Use</th>
                      <th className="p-4">Under Repair</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categorySummary.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-400 font-medium">No category data found.</td></tr>
                    ) : (
                      categorySummary.map((cat, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 pl-6 font-black text-gray-900">{cat.category}</td>
                          <td className="p-4 font-bold text-gray-700">{cat.total}</td>
                          <td className="p-4 font-bold text-blue-600">{cat.assigned}</td>
                          <td className="p-4 font-bold text-green-600">{cat.inStock}</td>
                          <td className="p-4 font-bold text-purple-600">{cat.demo}</td>
                          <td className="p-4 font-bold text-orange-600">{cat.repair}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 2: STANDARD ASSETS LIST (Used for all other reports) */}
            {activeReport !== 'CATEGORY_SUMMARY' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-black">
                      <th className="p-4 pl-6">Asset Name & Tag</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Usage Status</th>
                      <th className="p-4">Inspection Status</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAssets.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No assets match this report criteria.</td></tr>
                    ) : (
                      filteredAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 pl-6">
                            <p className="font-bold text-gray-900">{asset.name}</p>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5">{asset.tagId}</p>
                          </td>
                          <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                          <td className="p-4">
                            <div className="flex flex-col items-start gap-1">
                              {getStatusBadge(asset.status)}
                              {asset.status === 'Assigned' && (
                                <span className="text-[10px] font-bold text-gray-500">{asset.assignedToName}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {getInspectionBadge(asset.inspectionStatus)}
                          </td>
                          <td className="p-4 text-xs font-bold text-gray-500">
                            {asset.lastInspectionDate}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
