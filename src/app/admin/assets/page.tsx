'use client';

import React, { useState, useEffect } from 'react';
import { 
  PackageSearch, Plus, UploadCloud, Search, 
  Filter, User, ArrowLeft, Download, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Save,
  Printer, QrCode
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

// --- Category Prefix Mapping for Auto-Generation ---
const CATEGORY_PREFIX_MAP: Record<string, string> = {
  'Laptop': 'LAP',
  'Headphone': 'HDP',
  'Keyboard': 'KBD',
  'Wired Keyboard Combo': 'WKC',
  'Wireless Keyboard Combo': 'WMC',
  'Stand': 'STN',
  'Cleaning Kit': 'CLN',
  'Mobile Phone': 'MOB',
  'Other': 'OTH'
};

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'add_single' | 'bulk_upload' | 'print_tags'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [printCategoryFilter, setPrintCategoryFilter] = useState('All');
  
  // Bulk Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add Single Asset State
  const [singleAssetForm, setSingleAssetForm] = useState({
    tagId: '',
    serialNumber: '',
    name: '',
    category: '',
    price: '',
    purchaseDate: '',
    warrantyExpiry: '',
    condition: '',
    status: 'In Stock (Available)',
    notes: ''
  });

  // Mock Asset Data
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', tagId: 'VS-LAP-104291', name: 'Dell XPS 15 Laptop', category: 'Laptop', status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042' },
    { id: '2', tagId: 'VS-WMC-209932', name: 'Logitech Wireless Combo', category: 'Wireless Keyboard Combo', status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042' },
    { id: '3', tagId: 'VS-LAP-300188', name: 'Apple MacBook Pro M2', category: 'Laptop', status: 'Available' },
    { id: '4', tagId: 'VS-OTH-300511', name: 'Dell 27" 4K Monitor', category: 'Other', status: 'Maintenance' },
    { id: '5', tagId: 'VS-HDP-559102', name: 'Sony WH-1000XM5', category: 'Headphone', status: 'Available' },
  ]);

  // --- Listen for URL Parameters from Quick Actions ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'add') {
        setViewState('add_single');
      }
    }
  }, []);

  // --- AUTO GENERATE ASSET TAG ID WHEN CATEGORY CHANGES ---
  useEffect(() => {
    if (singleAssetForm.category && viewState === 'add_single') {
      const prefix = CATEGORY_PREFIX_MAP[singleAssetForm.category] || 'OTH';
      // Generates a random 6-digit number between 100000 and 999999
      const uniqueNum = Math.floor(100000 + Math.random() * 900000);
      setSingleAssetForm(prev => ({ ...prev, tagId: `VS-${prefix}-${uniqueNum}` }));
    }
  }, [singleAssetForm.category, viewState]);


  // --- Handlers ---
  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Tag ID,Asset Name,Category,Status,Assigned Employee Code\n"
      + "VS-LAP-500122,Dell Latitude 7420,Laptop,Available,\n"
      + "VS-KBD-500211,Logitech K850,Keyboard,Assigned,EMP-1042";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Asset_Bulk_Upload_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
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
    if (!singleAssetForm.tagId || !singleAssetForm.name || !singleAssetForm.category) {
      return alert("Please fill in all the required fields (*).");
    }
    
    setIsUploading(true);
    setTimeout(() => {
      setAssets(prev => [{
        id: Date.now().toString(),
        tagId: singleAssetForm.tagId,
        name: singleAssetForm.name,
        category: singleAssetForm.category,
        status: singleAssetForm.status.includes('Available') ? 'Available' : 'Maintenance'
      }, ...prev]);
      
      setIsUploading(false);
      setSingleAssetForm({
        tagId: '', serialNumber: '', name: '', category: '', price: '',
        purchaseDate: '', warrantyExpiry: '', condition: '', status: 'In Stock (Available)', notes: ''
      });
      alert('Asset successfully added to inventory!');
      setViewState('list');
    }, 800);
  };

  // Trigger Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Stats & Filters
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'Available').length;
  const assignedAssets = assets.filter(a => a.status === 'Assigned').length;

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.tagId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const printFilteredAssets = printCategoryFilter === 'All' 
    ? assets 
    : assets.filter(a => a.category === printCategoryFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      
      {/* CORRECTED: dangerouslySetInnerHTML instead of dangerouslySetContent */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* ========================================== */}
      {/* 1. ASSET LIST VIEW                         */}
      {/* ========================================== */}
      {viewState === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <PackageSearch size={28} className="text-teal-600" /> Asset Inventory
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Manage, track, and upload company hardware.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => setViewState('print_tags')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
              >
                <Printer size={18} /> Print Tags
              </button>
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
                          <QrCode size={10} /> {asset.tagId}
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
      {/* 2. PRINT LABELS VIEW                       */}
      {/* ========================================== */}
      {viewState === 'print_tags' && (
        <div className="space-y-6">
          <div className="no-print flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <div className="flex items-center gap-4">
              <select 
                value={printCategoryFilter}
                onChange={(e) => setPrintCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-teal-500"
              >
                <option value="All">All Categories</option>
                {Object.keys(CATEGORY_PREFIX_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors">
                <Printer size={16}/> Print Now
              </button>
            </div>
          </div>

          <div id="printable-area" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {printFilteredAssets.map(asset => (
                <div key={asset.id} className="border-2 border-gray-900 rounded-xl p-4 flex flex-col items-center text-center bg-white">
                  <div className="font-black text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b-2 border-gray-100 w-full pb-1">VS Asset Tag</div>
                  <QrCode size={48} className="text-gray-900 mb-3" />
                  <div className="font-black text-lg text-gray-900 tracking-tight">{asset.tagId}</div>
                  <div className="text-xs font-bold text-gray-600 mt-1 line-clamp-1">{asset.name}</div>
                </div>
              ))}
              {printFilteredAssets.length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-500 font-bold">No assets found for this category.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. ADD NEW ASSET VIEW                      */}
      {/* ========================================== */}
      {viewState === 'add_single' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Add New Asset</h2>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleAddSingleSubmit(); }} className="space-y-6">
            
            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-5 pb-4 border-b border-gray-100">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Category <span className="text-red-500">*</span></label>
                  <select 
                    value={singleAssetForm.category}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, category: e.target.value})}
                    className={`w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none ${!singleAssetForm.category ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    <option value="" disabled>Select Category...</option>
                    {Object.keys(CATEGORY_PREFIX_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <p className="text-[10px] font-bold text-teal-600 mt-1 flex items-center gap-1"><AlertCircle size={10}/> Select category first to auto-generate Asset Tag</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Tag <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    readOnly
                    placeholder="Auto-generated (e.g. VS-LAP-123456)" 
                    value={singleAssetForm.tagId}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-bold text-gray-900 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Dell XPS 15 Laptop" 
                    value={singleAssetForm.name}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, name: e.target.value})}
                    className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Serial Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SN-9982348X" 
                    value={singleAssetForm.serialNumber}
                    onChange={(e) => setSingleAssetForm({...singleAssetForm, serialNumber: e.target.value})}
                    className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-5 pb-4 border-b border-gray-100">Purchase & Warranty</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Price / Cost</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input type="number" placeholder="0.00" value={singleAssetForm.price} onChange={(e) => setSingleAssetForm({...singleAssetForm, price: e.target.value})} className="w-full bg-white border border-gray-200 pl-8 pr-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none placeholder-gray-400"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Purchase Date</label>
                  <input type="date" value={singleAssetForm.purchaseDate} onChange={(e) => setSingleAssetForm({...singleAssetForm, purchaseDate: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Warranty Expiry</label>
                  <input type="date" value={singleAssetForm.warrantyExpiry} onChange={(e) => setSingleAssetForm({...singleAssetForm, warrantyExpiry: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none"/>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-5 pb-4 border-b border-gray-100">Condition & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Condition</label>
                  <select value={singleAssetForm.condition} onChange={(e) => setSingleAssetForm({...singleAssetForm, condition: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium focus:border-teal-500 focus:outline-none">
                    <option value="" disabled>Select...</option>
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Current Status <span className="text-red-500">*</span></label>
                  <select value={singleAssetForm.status} onChange={(e) => setSingleAssetForm({...singleAssetForm, status: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none">
                    <option value="In Stock (Available)">In Stock (Available)</option>
                    <option value="Maintenance">Maintenance / Repair</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
              <button type="button" onClick={() => setViewState('list')} className="px-6 py-3.5 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">Cancel</button>
              <button type="submit" disabled={isUploading} className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 text-sm">
                {isUploading ? 'Saving...' : <><Save size={18} /> Save Asset</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. BULK UPLOAD VIEW                        */}
      {/* ========================================== */}
      {viewState === 'bulk_upload' && (
        <div className="space-y-6">
           <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back to Assets
          </button>
          <div className="bg-white p-6 sm:p-10 rounded-[24px] shadow-sm border border-gray-100 max-w-3xl mx-auto">
             <div className="text-center mb-8">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-100">
                <FileSpreadsheet size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Bulk Upload Assets</h2>
            </div>
            <div className="mb-8">
              <div className={`relative w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedFile ? 'border-teal-400 bg-teal-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"/>
                {selectedFile ? (
                  <div className="text-center">
                    <FileSpreadsheet size={36} className="text-teal-500 mx-auto mb-2" />
                    <p className="text-sm font-black text-teal-800">{selectedFile.name}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <UploadCloud size={36} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-black text-gray-700">Click or drag file here</p>
                  </div>
                )}
              </div>
              
              {/* ADDED: Button to trigger your handleDownloadSample function */}
              <button 
                type="button" 
                onClick={handleDownloadSample} 
                className="text-teal-600 text-sm font-bold mt-4 flex items-center justify-center gap-2 w-full hover:underline"
              >
                <Download size={16} /> Download Sample CSV
              </button>
            </div>
            <button type="button" onClick={handleBulkUploadSubmit} disabled={isUploading || !selectedFile} className={`w-full py-4 rounded-xl font-black text-sm shadow-md transition-all flex justify-center items-center gap-2 ${selectedFile ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {isUploading ? 'Processing Data...' : <><UploadCloud size={18} /> Upload Assets</>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}