'use client';

import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, Plus, UploadCloud, Search, 
  Filter, Tag, User, ArrowLeft, Download, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Save
} from 'lucide-react';

// --- Interfaces ---
interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string;
  empCode?: string;
}

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'add_single' | 'bulk_upload'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add Single Asset State
  const [singleAssetForm, setSingleAssetForm] = useState({
    tagId: '',
    name: '',
    category: 'Laptop',
    status: 'Available'
  });

  // Mock Asset Data
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', tagId: 'AST-1042', name: 'Dell XPS 15 Laptop', category: 'Laptop', status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042' },
    { id: '2', tagId: 'AST-2099', name: 'Logitech MX Master 3', category: 'Mouse', status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042' },
    { id: '3', tagId: 'AST-3001', name: 'Apple MacBook Pro M2', category: 'Laptop', status: 'Available' },
    { id: '4', tagId: 'AST-3005', name: 'Dell 27" 4K Monitor', category: 'Monitor', status: 'Maintenance' },
  ]);

  // --- NEW: Listen for URL Parameters from Quick Actions ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      // If the dashboard quick action links to /admin/assets?action=add
      if (urlParams.get('action') === 'add') {
        setViewState('add_single');
      }
    }
  }, []);

  // --- Handlers ---
  
  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Tag ID,Asset Name,Category,Status,Assigned Employee Code\n"
      + "AST-5001,Dell Latitude 7420,Laptop,Available,\n"
      + "AST-5002,Logitech K850,Keyboard,Assigned,EMP-1042\n"
      + "AST-5003,HP 24-inch Monitor,Monitor,Maintenance,";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Asset_Bulk_Upload_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleBulkUploadSubmit = () => {
    if (!selectedFile) return alert("Please select a file first.");
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setSelectedFile(null);
      alert("Assets uploaded successfully!");
      setViewState('list');
    }, 1500);
  };

  const handleAddSingleSubmit = () => {
    if (!singleAssetForm.tagId || !singleAssetForm.name) {
      return alert("Please fill in the Tag ID and Asset Name.");
    }
    
    setIsUploading(true);
    setTimeout(() => {
      setAssets(prev => [{
        id: Date.now().toString(),
        tagId: singleAssetForm.tagId,
        name: singleAssetForm.name,
        category: singleAssetForm.category,
        status: singleAssetForm.status as any
      }, ...prev]);
      
      setIsUploading(false);
      setSingleAssetForm({ tagId: '', name: '', category: 'Laptop', status: 'Available' });
      alert('Asset successfully added to inventory!');
      setViewState('list');
    }, 800);
  };

  // Stats
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'Available').length;
  const assignedAssets = assets.filter(a => a.status === 'Assigned').length;

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.tagId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ========================================== */}
      {/* 1. ASSET LIST VIEW                         */}
      {/* ========================================== */}
      {viewState === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <PackageSearch size={28} className="text-teal-600" /> Asset Inventory
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Manage, track, and upload company hardware.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              {/* BUG FIX: Added type="button" to prevent default form behaviors */}
              <button 
                type="button"
                onClick={() => setViewState('bulk_upload')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-teal-300 hover:bg-teal-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <UploadCloud size={18} /> Bulk Upload
              </button>
              <button 
                type="button"
                onClick={() => setViewState('add_single')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <Plus size={18} /> Add Asset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600"><PackageSearch size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Total Assets</p><p className="text-2xl font-black text-gray-900">{totalAssets}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><CheckCircle2 size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Available</p><p className="text-2xl font-black text-gray-900">{availableAssets}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><User size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Assigned</p><p className="text-2xl font-black text-gray-900">{assignedAssets}</p></div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search assets by name or tag ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-500"
                />
              </div>
              <button type="button" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
                <Filter size={16} /> Filter
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Asset Details</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Category</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-black text-gray-500 uppercase">Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(asset => (
                    <tr key={asset.id} className="border-b border-gray-50 hover:bg-teal-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-sm text-gray-900">{asset.name}</div>
                        <div className="text-[11px] font-bold text-teal-600 bg-teal-50 inline-flex items-center gap-1 px-2 py-0.5 rounded-md mt-1 border border-teal-100">
                          <Tag size={10} /> {asset.tagId}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                          asset.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' :
                          asset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {asset.assignedTo ? (
                          <div>
                            <div className="text-sm font-bold text-gray-900">{asset.assignedTo}</div>
                            <div className="text-xs font-medium text-gray-500">{asset.empCode}</div>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 2. BULK UPLOAD VIEW                        */}
      {/* ========================================== */}
      {viewState === 'bulk_upload' && (
        <div className="space-y-6">
          <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Inventory
          </button>

          <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-100">
                <FileSpreadsheet size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Bulk Upload Assets</h2>
              <p className="text-sm font-medium text-gray-500 mt-2">Upload a CSV file to add multiple assets to the inventory at once.</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-blue-900">Need the correct format?</h4>
                  <p className="text-xs font-medium text-blue-700 mt-1">Download our sample template to ensure your columns map correctly.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleDownloadSample}
                className="shrink-0 flex items-center gap-2 bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-black transition-colors shadow-sm"
              >
                <Download size={16} /> Download CSV Sample
              </button>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Upload CSV File</label>
              <div className={`relative w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedFile ? 'border-teal-400 bg-teal-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                />
                
                {selectedFile ? (
                  <div className="text-center">
                    <FileSpreadsheet size={36} className="text-teal-500 mx-auto mb-2" />
                    <p className="text-sm font-black text-teal-800">{selectedFile.name}</p>
                    <p className="text-xs font-bold text-teal-600 mt-1">Ready to upload</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <UploadCloud size={36} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-black text-gray-700">Click or drag file here</p>
                    <p className="text-xs font-medium text-gray-500 mt-1">Supports .CSV and .XLSX up to 10MB</p>
                  </div>
                )}
              </div>
              
              {selectedFile && (
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => setSelectedFile(null)} className="text-xs font-bold text-red-500 flex items-center gap-1 hover:underline">
                    <Trash2 size={12}/> Remove File
                  </button>
                </div>
              )}
            </div>

            <button 
              type="button"
              onClick={handleBulkUploadSubmit}
              disabled={isUploading || !selectedFile}
              className={`w-full py-4 rounded-xl font-black text-sm shadow-md transition-all flex justify-center items-center gap-2 ${selectedFile ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {isUploading ? 'Processing Data...' : <><UploadCloud size={18} /> Upload Assets</>}
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. ADD SINGLE ASSET VIEW                   */}
      {/* ========================================== */}
      {viewState === 'add_single' && (
        <div className="space-y-6">
          <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Inventory
          </button>
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
            <div className="mb-6 border-b border-gray-100 pb-5 flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center">
                <Plus size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Add Single Asset</h2>
                <p className="text-sm font-medium text-gray-500 mt-1">Manually register a new device into the system.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Asset Tag ID <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. AST-5001" 
                    value={singleAssetForm.tagId}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, tagId: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Asset Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dell XPS 15" 
                    value={singleAssetForm.name}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Category</label>
                  <select 
                    value={singleAssetForm.category}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, category: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Keyboard">Keyboard</option>
                    <option value="Mouse">Mouse</option>
                    <option value="Headphones">Headphones</option>
                    <option value="Mobile">Mobile Device</option>
                    <option value="Other">Other Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Initial Status</label>
                  <select 
                    value={singleAssetForm.status}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, status: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm font-bold focus:border-teal-500 focus:outline-none"
                  >
                    <option value="Available">Available (Ready to Assign)</option>
                    <option value="Maintenance">Maintenance (Under Repair)</option>
                  </select>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleAddSingleSubmit}
                disabled={isUploading}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2 mt-4"
              >
                {isUploading ? 'Saving Asset...' : <><Save size={18} /> Save Asset to Inventory</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
