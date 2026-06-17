'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link'; 
import { 
  Search, Plus, UserCheck, Settings2, Wrench, Package, Box, CheckCircle2, 
  X, Trash2, Upload, Download, FileUp, Loader2, AlertCircle
} from 'lucide-react';

// --- TYPES ---
type UsageStatus = 'Assigned' | 'Unassigned' | 'Demo Use' | 'Under Repair' | 'Discarded';

interface Asset {
  id: string;
  tagId: string;
  serialNumber: string;
  name: string;
  category: string;
  brand?: string;
  vendor?: string;
  status: UsageStatus;
  assignedToName?: string;
  assignedToEmpId?: string;
  lastInspection?: string;
}

interface Staff {
  empId: string;
  name: string;
  department: string;
}

// --- MOCK DATABASE ---
const mockStaff: Staff[] = [
  { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department' },
  { empId: 'EMP-002', name: 'Sarah Connor', department: 'Migrations' },
  { empId: 'EMP-003', name: 'John Doe', department: 'Accounts' },
  { empId: 'EMP-004', name: 'Jane Smith', department: 'Edu Calling' },
];

const initialAssets: Asset[] = [
  { id: '1', tagId: 'TAG-1045', serialNumber: 'SN-MAC-001', name: 'MacBook Pro 14"', category: 'Laptops', brand: 'Apple', vendor: 'Imagine Store', status: 'Assigned', assignedToName: 'Lakhwinder Singh', assignedToEmpId: 'EMP-001', lastInspection: '2023-10-01' },
  { id: '2', tagId: 'TAG-2099', serialNumber: 'SN-DEL-442', name: 'Dell UltraSharp 27"', category: 'Monitors', brand: 'Dell', vendor: 'Amazon Business', status: 'Unassigned', lastInspection: '2023-09-15' },
  { id: '3', tagId: 'TAG-3011', serialNumber: 'SN-LOG-991', name: 'Logitech MX Master 3', category: 'Mouse', brand: 'Logitech', vendor: 'BestBuy', status: 'Demo Use', lastInspection: '2023-10-10' },
  { id: '4', tagId: 'TAG-1088', serialNumber: 'SN-MAC-002', name: 'MacBook Air M1', category: 'Laptops', brand: 'Apple', vendor: 'Imagine Store', status: 'Under Repair', lastInspection: '2023-08-20' },
];

const CATEGORIES = ['Laptops', 'Monitors', 'Keyboards', 'Mouse', 'Headphones', 'Stands', 'Cleaning Kits', 'Others'];

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchAssetQuery, setSearchAssetQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tagId: '', serialNumber: '', name: '', category: 'Laptops', brand: '', vendor: '', status: 'Unassigned' as UsageStatus, assignedToEmpId: '', assignedToName: '',
  });

  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  useEffect(() => {
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) {
      setAssets(JSON.parse(savedAssets));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('vsit_assets_inventory', JSON.stringify(assets));
    }
  }, [assets, isLoaded]);

  const stats = useMemo(() => {
    return {
      total: assets.length,
      assigned: assets.filter(a => a.status === 'Assigned').length,
      inStock: assets.filter(a => a.status === 'Unassigned' || a.status === 'Demo Use').length,
      repair: assets.filter(a => a.status === 'Under Repair').length,
      discarded: assets.filter(a => a.status === 'Discarded').length,
    };
  }, [assets]);

  const categoryStats = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat,
      total: assets.filter(a => a.category === cat).length,
      assigned: assets.filter(a => a.category === cat && a.status === 'Assigned').length,
      inStock: assets.filter(a => a.category === cat && (a.status === 'Unassigned' || a.status === 'Demo Use')).length,
    }));
  }, [assets]);

  const handleStatusChange = (newStatus: UsageStatus) => {
    setFormData(prev => {
      const updated = { ...prev, status: newStatus };
      if (newStatus !== 'Assigned') { updated.assignedToEmpId = ''; updated.assignedToName = ''; }
      return updated;
    });
  };

  const handleStaffSelect = (staff: Staff) => {
    setFormData(prev => ({ ...prev, assignedToEmpId: staff.empId, assignedToName: staff.name, status: 'Assigned' }));
    setIsStaffDropdownOpen(false); setStaffSearchQuery('');
  };

  const handleOpenModal = () => {
    const randomTag = `TAG-${Math.floor(Math.random() * 9000) + 1000}`;
    setFormData({ tagId: randomTag, serialNumber: '', name: '', category: 'Laptops', brand: '', vendor: '', status: 'Unassigned', assignedToEmpId: '', assignedToName: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsset: Asset = { id: `AST-${Date.now()}`, ...formData, lastInspection: 'Pending' };
    setAssets([newAsset, ...assets]);
    setIsModalOpen(false);
    alert("Asset successfully added to inventory!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setUploadError("Invalid file type! Please upload a .csv file.");
        setSelectedFile(null); return;
      }
      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = ["Tag ID,Serial Number,Hardware Name,Category,Brand,Vendor,Status","TAG-9001,SN-BULK-001,ThinkPad T14,Laptops,Lenovo,Amazon Business,Unassigned"].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', 'Asset_Upload_Template.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleBulkUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) { setUploadError("Cannot process Excel (.xlsx) files. Please save your file as a CSV."); return; }

    setIsUploading(true); setUploadError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        if (!csvText) throw new Error("Empty file");
        const lines = csvText.split('\n');
        const newAssets: Asset[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; 
          const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.replace(/^"|"$/g, '').trim());
          if (values.length >= 3) {
            newAssets.push({
              id: `AST-${Date.now()}-${i}`, tagId: values[0] || `TAG-AUTO-${Math.floor(Math.random() * 9000)}`,
              serialNumber: values[1] || 'UNKNOWN-SN', name: values[2] || 'Unknown Device', category: values[3] || 'Others',
              brand: values[4] || '', vendor: values[5] || '',
              status: (['Assigned', 'Unassigned', 'Demo Use', 'Under Repair', 'Discarded'].includes(values[6]) ? values[6] : 'Unassigned') as UsageStatus,
              lastInspection: 'Pending'
            });
          }
        }
        setTimeout(() => {
          if (newAssets.length > 0) {
            setAssets(prev => [...newAssets, ...prev]);
            alert(`Successfully imported ${newAssets.length} assets!`);
            setIsBulkModalOpen(false); setSelectedFile(null);
          } else { setUploadError("No valid data found."); }
          setIsUploading(false);
        }, 1000);
      } catch (error) { setUploadError("Failed to read the file."); setIsUploading(false); }
    };
    reader.readAsText(selectedFile);
  };

  const handleResetData = () => {
    if(confirm("Are you sure you want to delete all uploaded assets and reset to default?")) {
      setAssets(initialAssets); localStorage.setItem('vsit_assets_inventory', JSON.stringify(initialAssets));
    }
  };

  const filteredStaff = mockStaff.filter(s => s.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) || s.empId.toLowerCase().includes(staffSearchQuery.toLowerCase()));
  const filteredAssets = assets.filter(a => a.tagId.toLowerCase().includes(searchAssetQuery.toLowerCase()) || a.serialNumber.toLowerCase().includes(searchAssetQuery.toLowerCase()) || a.name.toLowerCase().includes(searchAssetQuery.toLowerCase()) || (a.brand && a.brand.toLowerCase().includes(searchAssetQuery.toLowerCase())));
  const getStatusColor = (status: UsageStatus) => {
    switch(status) {
      case 'Assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Unassigned': return 'bg-green-100 text-green-700 border-green-200';
      case 'Demo Use': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Under Repair': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Discarded': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isLoaded) return <div className="p-10 flex justify-center text-gray-400 animate-pulse">Loading Inventory...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Package className="text-blue-600" /> Asset Inventory</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage stock, track assignments, and view office usage.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {assets.length > initialAssets.length && (
            <button onClick={handleResetData} className="text-xs font-bold text-red-500 hover:text-red-700 underline px-2">Reset Data</button>
          )}
          <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-5 py-2.5 rounded-xl shadow-sm transition-all font-bold text-sm"><Upload size={18} /> Bulk Upload</button>
          <button onClick={handleOpenModal} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-md transition-all font-bold text-sm"><Plus size={18} /> Add New</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center"><span className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Total Assets</span><span className="text-3xl font-black text-gray-900">{stats.total}</span></div>
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col justify-center"><span className="text-blue-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><UserCheck size={14}/> Assigned</span><span className="text-3xl font-black text-blue-900">{stats.assigned}</span></div>
        <div className="bg-green-50 p-5 rounded-2xl border border-green-100 flex flex-col justify-center"><span className="text-green-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Box size={14}/> In Stock / Demo</span><span className="text-3xl font-black text-green-900">{stats.inStock}</span></div>
        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex flex-col justify-center"><span className="text-orange-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Wrench size={14}/> Repair</span><span className="text-3xl font-black text-orange-900">{stats.repair}</span></div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex flex-col justify-center"><span className="text-red-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Trash2 size={14}/> Discarded</span><span className="text-3xl font-black text-red-900">{stats.discarded}</span></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Category Breakdown</h3>
        <div className="flex flex-wrap gap-3">
          {categoryStats.filter(c => c.total > 0).map(cat => (
            <div key={cat.name} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex flex-col min-w-[120px]"><span className="text-xs font-bold text-gray-500">{cat.name}</span><div className="flex items-end justify-between mt-1"><span className="text-lg font-black text-gray-900">{cat.total}</span><span className="text-[10px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100">{cat.assigned} Assg</span></div></div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Search by Serial Number, Tag ID, Name..." value={searchAssetQuery} onChange={(e) => setSearchAssetQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-black"><th className="p-4 pl-6">Asset Details</th><th className="p-4">Category</th><th className="p-4">Status & Assignment</th><th className="p-4">Last Inspection</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6">
                    <Link href={`/admin/assets/${asset.id}`} className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer block">{asset.name}</Link>
                    <div className="flex flex-wrap gap-2 mt-1"><span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{asset.tagId}</span><span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{asset.serialNumber}</span>{asset.brand && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{asset.brand}</span>}</div>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                  <td className="p-4"><div className="flex flex-col items-start gap-1"><span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(asset.status)}`}>{asset.status}</span>{asset.status === 'Assigned' && asset.assignedToEmpId && <span className="text-xs font-bold text-gray-600 flex items-center gap-1 mt-1"><UserCheck size={12} className="text-blue-500"/> {asset.assignedToName}</span>}</div></td>
                  <td className="p-4 text-sm font-medium text-gray-500">{asset.lastInspection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-black flex items-center gap-2"><Upload className="text-blue-600"/> Bulk Upload</h2><button onClick={() => setIsBulkModalOpen(false)}><X size={20} className="text-gray-400"/></button></div><form onSubmit={handleBulkUploadSubmit}><input type="file" accept=".csv" onChange={handleFileChange} className="mb-4 block w-full text-sm"/><div className="flex gap-3"><button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-6 py-2 bg-gray-100 rounded-xl font-bold">Cancel</button><button type="submit" disabled={!selectedFile} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:bg-blue-300">Upload</button></div></form></div></div>
      )}

      {/* SINGLE ASSET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-black flex items-center gap-2"><Plus className="text-blue-600"/> Add Asset</h2><button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400"/></button></div><form onSubmit={handleSubmit}><input required type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full mb-4 px-4 py-2 border rounded-xl"/><div className="flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-100 rounded-xl font-bold">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Save</button></div></form></div></div>
      )}
    </div>
  );
}
