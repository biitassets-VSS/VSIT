'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, UploadCloud, Search, 
  Filter, User, ArrowLeft, Download, 
  FileSpreadsheet, CheckCircle2, AlertCircle, Save,
  Printer, QrCode, FileText, Image as ImageIcon,
  DollarSign, Wrench, Hash, Trash2, UserMinus, X
} from 'lucide-react';

// --- Interfaces ---
interface Asset {
  id: string;
  tagId: string;
  name: string;
  category: string;
  status: 'In Stock (Available)' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string;
  empCode?: string;
  serialNumber?: string;
  price?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  condition?: string;
  notes?: string;
  photos?: string[];
}

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

// Mock Staff Database for Assignment Search
const MOCK_STAFF = [
  { empCode: 'EMP-1001', name: 'Aarav Patel' },
  { empCode: 'EMP-1002', name: 'Diya Sharma' },
  { empCode: 'EMP-1042', name: 'Rahul Sharma' },
  { empCode: 'EMP-2005', name: 'Priya Singh' },
  { empCode: 'EMP-3010', name: 'Arjun Gupta' },
  { empCode: 'EMP-3015', name: 'Neha Verma' },
];

export default function AdminAssetsPage() {
  const [viewState, setViewState] = useState<'list' | 'add_single' | 'bulk_upload' | 'print_tags' | 'view_details'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [printCategoryFilter, setPrintCategoryFilter] = useState('All');
  
  // View Details & Assignment State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  
  // Inspection Photo Viewer State
  const [inspectionPhoto, setInspectionPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add Single Asset State
  const [singleAssetForm, setSingleAssetForm] = useState({
    tagId: '', serialNumber: '', name: '', category: '', price: '',
    purchaseDate: '', warrantyExpiry: '', condition: '', status: 'In Stock (Available)', notes: ''
  });

  // Mock Asset Data
  const [assets, setAssets] = useState<Asset[]>([
    { 
      id: '1', tagId: 'VS-LAP-104291', name: 'Dell XPS 15 Laptop', category: 'Laptop', status: 'Assigned', 
      assignedTo: 'Rahul Sharma', empCode: 'EMP-1042', serialNumber: 'SN-9982348X', price: '125000', 
      purchaseDate: '2023-01-15', warrantyExpiry: '2026-01-15', condition: 'Good', 
      notes: 'Handed over with charger and wireless mouse.', photos: [] 
    },
    { 
      id: '2', tagId: 'VS-WMC-209932', name: 'Logitech Wireless Combo', category: 'Wireless Keyboard Combo', 
      status: 'Assigned', assignedTo: 'Rahul Sharma', empCode: 'EMP-1042', serialNumber: 'SN-112233', 
      price: '3500', purchaseDate: '2023-02-10', warrantyExpiry: '2024-02-10', condition: 'Good', photos: []
    },
    { 
      id: '3', tagId: 'VS-LAP-300188', name: 'Apple MacBook Pro M2', category: 'Laptop', status: 'In Stock (Available)',
      serialNumber: 'C02F3983QQQ', price: '185000', purchaseDate: '2023-11-05', warrantyExpiry: '2026-11-05', condition: 'New', photos: []
    },
    { 
      id: '4', tagId: 'VS-OTH-300511', name: 'Dell 27" 4K Monitor', category: 'Other', status: 'Maintenance',
      serialNumber: 'DELL-MON-4K-99', price: '32000', purchaseDate: '2022-06-12', warrantyExpiry: '2025-06-12', condition: 'Poor',
      notes: 'Screen flickering issue reported. Sent to service center.', photos: []
    },
  ]);

  // Tag ID Generator
  const generateTagId = (category: string) => {
    const prefix = CATEGORY_PREFIX_MAP[category] || 'OTH';
    return `VS-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  useEffect(() => {
    if (singleAssetForm.category && viewState === 'add_single') {
      setSingleAssetForm(prev => ({ ...prev, tagId: generateTagId(singleAssetForm.category) }));
    }
  }, [singleAssetForm.category, viewState]);

  // --- Bulk Upload & CSV Logic ---
  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Category,Asset Tag,Asset Name,Serial Number,Price / Cost,Purchase Date,Warranty Expiry,Asset Condition,Current Status\n"
      + "Laptop,,Dell XPS 15 Laptop,SN-9982348X,120000,2023-01-15,2026-01-15,New,In Stock (Available)\n"
      + "Keyboard,VS-KBD-654321,Logitech K850,SN-112233,4500,2023-05-20,2024-05-20,Good,In Stock (Available)";
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const rows = text.split('\n').slice(1);
        const newAssets: Asset[] = [];
        
        rows.forEach((row, index) => {
          if (!row.trim()) return;
          const cols = row.split(',');
          const category = cols[0] || 'Other';
          // Auto-generate tag if column 1 is empty, otherwise use provided tag
          const tagId = cols[1] ? cols[1] : generateTagId(category); 

          newAssets.push({
            id: Date.now().toString() + index,
            category: category,
            tagId: tagId,
            name: cols[2] || 'Unknown Asset',
            serialNumber: cols[3],
            price: cols[4],
            purchaseDate: cols[5],
            warrantyExpiry: cols[6],
            condition: cols[7],
            status: (cols[8]?.trim() as Asset['status']) || 'In Stock (Available)',
            photos: []
          });
        });

        setTimeout(() => {
          setAssets(prev => [...newAssets, ...prev]);
          setIsUploading(false);
          setSelectedFile(null);
          alert(`${newAssets.length} Assets uploaded successfully!`);
          setViewState('list');
        }, 1000);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleAddSingleSubmit = () => {
    if (!singleAssetForm.tagId || !singleAssetForm.name || !singleAssetForm.category) {
      return alert("Please fill in all the required fields (*).");
    }
    setIsUploading(true);
    setTimeout(() => {
      setAssets(prev => [{ id: Date.now().toString(), ...singleAssetForm, status: singleAssetForm.status as any, photos: [] }, ...prev]);
      setIsUploading(false);
      setSingleAssetForm({ tagId: '', serialNumber: '', name: '', category: '', price: '', purchaseDate: '', warrantyExpiry: '', condition: '', status: 'In Stock (Available)', notes: '' });
      alert('Asset successfully added to inventory!');
      setViewState('list');
    }, 800);
  };

  // --- Photo Upload & Canvas Watermarking ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAsset) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to draw the image and watermark
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Setup Watermark Text (Current Date & Time)
        const watermarkText = new Date().toLocaleString();
        
        // Responsive font size based on image width
        const fontSize = Math.max(16, Math.floor(img.width * 0.03)); 
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        const padding = Math.max(10, Math.floor(img.width * 0.02));
        const x = canvas.width - padding;
        const y = canvas.height - padding;

        // Add shadow/outline for readability on light backgrounds
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = fontSize * 0.15;
        ctx.strokeText(watermarkText, x, y);

        // Add White Text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(watermarkText, x, y);

        // Get final watermarked image
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // Update State
        const updatedAsset = { ...selectedAsset, photos: [...(selectedAsset.photos || []), watermarkedDataUrl] };
        setAssets(assets.map(a => a.id === selectedAsset.id ? updatedAsset : a));
        setSelectedAsset(updatedAsset);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- Assignment Logic ---
  const updateAssetStatus = (newStatus: Asset['status'], staff?: {empCode: string, name: string}) => {
    if (!selectedAsset) return;
    
    let assignedData = {};
    if (newStatus === 'Assigned' && staff) {
      assignedData = { assignedTo: staff.name, empCode: staff.empCode };
    } else if (newStatus === 'In Stock (Available)' || newStatus === 'Maintenance' || newStatus === 'Retired') {
      assignedData = { assignedTo: undefined, empCode: undefined };
    }

    const updatedAsset = { ...selectedAsset, status: newStatus, ...assignedData };
    setAssets(assets.map(a => a.id === selectedAsset.id ? updatedAsset : a));
    setSelectedAsset(updatedAsset);
    setShowAssignModal(false);
  };

  const handlePrint = () => window.print();
  const openAssetDetails = (asset: Asset) => { setSelectedAsset(asset); setViewState('view_details'); };

  // Stats & Filters
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === 'In Stock (Available)').length;
  const assignedAssets = assets.filter(a => a.status === 'Assigned').length;
  const filteredAssets = assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.tagId.toLowerCase().includes(searchQuery.toLowerCase()));
  const printFilteredAssets = printCategoryFilter === 'All' ? assets : assets.filter(a => a.category === printCategoryFilter);
  const filteredStaff = MOCK_STAFF.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase()) || s.empCode.toLowerCase().includes(staffSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto relative">
      <style dangerouslySetInnerHTML={{__html: `@media print { body * { visibility: hidden; } #printable-area, #printable-area * { visibility: visible; } #printable-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }`}} />

      {/* ========================================== */}
      {/* 1. ASSET LIST VIEW                         */}
      {/* ========================================== */}
      {viewState === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <PackageSearch size={28} className="text-[#008b74]" /> Asset Inventory
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">Manage, track, and upload company hardware.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <button onClick={() => setViewState('print_tags')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"><Printer size={18} /> Print Tags</button>
              <button onClick={() => setViewState('bulk_upload')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#008b74] hover:bg-[#e6f4f1] text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"><UploadCloud size={18} /> Bulk Upload</button>
              <button onClick={() => setViewState('add_single')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#008b74] hover:bg-[#00705d] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm"><Plus size={18} /> Add Asset</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600"><PackageSearch size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Total Assets</p><p className="text-2xl font-black text-gray-900">{totalAssets}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#e6f4f1] flex items-center justify-center text-[#008b74]"><CheckCircle2 size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Available</p><p className="text-2xl font-black text-gray-900">{availableAssets}</p></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><User size={24}/></div>
              <div><p className="text-xs font-bold text-gray-500 uppercase">Assigned</p><p className="text-2xl font-black text-gray-900">{assignedAssets}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search assets by name or tag ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#008b74]" />
              </div>
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
                    <tr key={asset.id} className="border-b border-gray-50 hover:bg-[#f2faf8] transition-colors">
                      <td className="p-4">
                        <div className="font-black text-sm text-[#008b74] cursor-pointer hover:underline" onClick={() => openAssetDetails(asset)}>{asset.name}</div>
                        <div className="text-[11px] font-bold text-gray-600 bg-gray-100 inline-flex items-center gap-1 px-2 py-0.5 rounded-md mt-1 border border-gray-200">
                          <QrCode size={10} /> {asset.tagId}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-600">{asset.category}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                          asset.status === 'In Stock (Available)' ? 'bg-[#e6f4f1] text-[#008b74] border-[#008b74]/20' :
                          asset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          asset.status === 'Maintenance' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>{asset.status}</span>
                      </td>
                      <td className="p-4">
                        {asset.assignedTo ? (
                          <div>
                            <div className="text-sm font-bold text-gray-900">{asset.assignedTo}</div>
                            <div className="text-xs font-medium text-gray-500">{asset.empCode}</div>
                          </div>
                        ) : (<span className="text-xs font-bold text-gray-400">-</span>)}
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
      {/* 2. VIEW DETAILS PAGE                       */}
      {/* ========================================== */}
      {viewState === 'view_details' && selectedAsset && (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
          
          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              
              {selectedAsset.status === 'Assigned' ? (
                <button onClick={() => updateAssetStatus('In Stock (Available)')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                  <UserMinus size={16} /> Unassign (Return to Stock)
                </button>
              ) : selectedAsset.status !== 'Retired' ? (
                <button onClick={() => setShowAssignModal(true)} className="px-4 py-2 bg-[#008b74] text-white text-sm font-bold rounded-xl hover:bg-[#00705d] flex items-center gap-2 shadow-sm relative">
                  <User size={16} /> Assign User
                </button>
              ) : null}

              {selectedAsset.status !== 'Maintenance' && selectedAsset.status !== 'Retired' && (
                <button onClick={() => updateAssetStatus('Maintenance')} className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold rounded-xl hover:bg-orange-100 flex items-center gap-2 shadow-sm">
                  <Wrench size={16} /> Send to Repair
                </button>
              )}

              {selectedAsset.status === 'Maintenance' && (
                <button onClick={() => updateAssetStatus('In Stock (Available)')} className="px-4 py-2 bg-[#008b74] text-white text-sm font-bold rounded-xl hover:bg-[#00705d] flex items-center gap-2 shadow-sm">
                  <CheckCircle2 size={16} /> Mark Repaired
                </button>
              )}

              {selectedAsset.status !== 'Retired' && (
                 <button onClick={() => updateAssetStatus('Retired')} className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl hover:bg-red-100 flex items-center gap-2 shadow-sm">
                 <Trash2 size={16} /> Discard
               </button>
              )}

            </div>
          </div>

          {/* Asset Card */}
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 p-6 sm:p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                      selectedAsset.status === 'In Stock (Available)' ? 'bg-[#e6f4f1] text-[#008b74] border-[#008b74]/20' :
                      selectedAsset.status === 'Assigned' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      selectedAsset.status === 'Maintenance' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>{selectedAsset.status}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{selectedAsset.category}</span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-1">{selectedAsset.name}</h2>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                  <span className="flex items-center gap-1"><QrCode size={14}/> {selectedAsset.tagId}</span>
                  {selectedAsset.serialNumber && <span className="flex items-center gap-1"><Hash size={14}/> {selectedAsset.serialNumber}</span>}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* Left Details Column */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><DollarSign size={16}/> Purchase & Warranty</h3>
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-100">
                    <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-500">Purchase Price</span><span className="text-sm font-black text-gray-900">{selectedAsset.price ? `₹ ${selectedAsset.price}` : 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-500">Purchase Date</span><span className="text-sm font-black text-gray-900">{selectedAsset.purchaseDate || 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-500">Warranty Expiry</span><span className="text-sm font-black text-[#008b74]">{selectedAsset.warrantyExpiry || 'N/A'}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16}/> Notes & Condition</h3>
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="mb-4"><span className="text-sm font-bold text-gray-500 block mb-1">Current Condition</span><span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-700">{selectedAsset.condition || 'Not Specified'}</span></div>
                    <div><span className="text-sm font-bold text-gray-500 block mb-1">Additional Notes</span><p className="text-sm font-medium text-gray-800 bg-white p-3 rounded-xl border border-gray-200 min-h-[80px]">{selectedAsset.notes || 'No notes have been added.'}</p></div>
                  </div>
                </div>
              </div>

              {/* Right Media Column */}
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={16}/> Inspection Photos</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Render saved & watermarked photos */}
                    {selectedAsset.photos?.map((photoUrl, idx) => (
                      <div key={idx} onClick={() => setInspectionPhoto(photoUrl)} className="aspect-square bg-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition">
                        <img src={photoUrl} alt="Inspection" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-white text-xs font-bold text-center px-2">Click to View Inspection Verification</div>
                      </div>
                    ))}

                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                    
                    {/* Upload button */}
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-[#008b74] hover:text-[#008b74] transition cursor-pointer">
                      <Plus size={24} className="mb-1" />
                      <span className="text-xs font-bold text-center px-2">Upload Photo (Auto-Watermarks)</span>
                    </div>
                  </div>
                </div>

                {selectedAsset.status === 'Assigned' && selectedAsset.assignedTo && (
                   <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><User size={16}/> Current Assignment</h3>
                    <div className="bg-white border border-blue-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-lg">{selectedAsset.assignedTo.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-black text-gray-900">{selectedAsset.assignedTo}</div>
                        <div className="text-xs font-bold text-gray-500">{selectedAsset.empCode}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS OVERLAYS --- */}

      {/* 1. Assignment Modal */}
      {showAssignModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-gray-900 text-lg">Assign to Employee</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" autoFocus
                  placeholder="Search by name or EMP code..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#008b74]" 
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {filteredStaff.length === 0 ? (
                  <p className="text-center text-sm font-bold text-gray-400 py-4">No staff found.</p>
                ) : (
                  filteredStaff.map(staff => (
                    <div key={staff.empCode} onClick={() => updateAssetStatus('Assigned', staff)} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#008b74] hover:bg-[#e6f4f1] cursor-pointer transition">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">{staff.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-black text-gray-900">{staff.name}</div>
                        <div className="text-xs font-bold text-gray-500">{staff.empCode}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Photo Inspection Modal */}
      {inspectionPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8 animate-in fade-in">
          <button onClick={() => setInspectionPhoto(null)} className="absolute top-6 right-6 text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition">
            <X size={24}/>
          </button>
          <div className="max-w-4xl max-h-full flex flex-col items-center">
            <img src={inspectionPhoto} alt="Verification" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <p className="text-white text-sm font-bold mt-4 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
              Inspection Photo Verification (Timestamp Embedded)
            </p>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. PRINT TAGS VIEW                         */}
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
                className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-[#008b74]"
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
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. ADD NEW ASSET VIEW                      */}
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
                    className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium focus:border-[#008b74] focus:outline-none"
                  >
                    <option value="" disabled>Select Category...</option>
                    {Object.keys(CATEGORY_PREFIX_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Tag <span className="text-red-500">*</span></label>
                  <input type="text" readOnly placeholder="Auto-generated" value={singleAssetForm.tagId} className="w-full bg-gray-50 border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-bold text-gray-900 cursor-not-allowed"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Asset Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Dell XPS 15 Laptop" value={singleAssetForm.name} onChange={(e) => setSingleAssetForm({...singleAssetForm, name: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium focus:border-[#008b74] focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Serial Number</label>
                  <input type="text" placeholder="e.g. SN-9982348X" value={singleAssetForm.serialNumber} onChange={(e) => setSingleAssetForm({...singleAssetForm, serialNumber: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-3.5 rounded-xl text-sm font-medium focus:border-[#008b74] focus:outline-none"/>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 border-t border-gray-200 pt-6">
              <button type="button" onClick={() => setViewState('list')} className="px-6 py-3.5 border border-gray-200 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">Cancel</button>
              <button type="submit" disabled={isUploading} className="px-8 py-3.5 bg-[#008b74] hover:bg-[#00705d] text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 text-sm">
                {isUploading ? 'Saving...' : <><Save size={18} /> Save Asset</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. BULK UPLOAD VIEW                        */}
      {/* ========================================== */}
      {viewState === 'bulk_upload' && (
        <div className="space-y-6">
           <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"><ArrowLeft size={16} /> Back to Assets</button>
          <div className="bg-white p-6 sm:p-10 rounded-[24px] shadow-sm border border-gray-100 max-w-3xl mx-auto">
             <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#e6f4f1] text-[#008b74] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#008b74]/20"><FileSpreadsheet size={32} /></div>
              <h2 className="text-2xl font-black text-gray-900">Bulk Upload Assets</h2>
            </div>
            <div className="mb-8">
              <div className={`relative w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${selectedFile ? 'border-[#008b74] bg-[#e6f4f1]' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"/>
                {selectedFile ? (
                  <div className="text-center"><FileSpreadsheet size={36} className="text-[#008b74] mx-auto mb-2" /><p className="text-sm font-black text-[#00705d]">{selectedFile.name}</p></div>
                ) : (
                  <div className="text-center"><UploadCloud size={36} className="text-gray-400 mx-auto mb-2" /><p className="text-sm font-black text-gray-700">Click or drag CSV file here</p></div>
                )}
              </div>
              <button type="button" onClick={handleDownloadSample} className="text-[#008b74] text-sm font-bold mt-4 flex items-center justify-center gap-2 w-full hover:underline"><Download size={16} /> Download Sample CSV (Blank Tag IDs will Auto-Generate)</button>
            </div>
            <button type="button" onClick={handleBulkUploadSubmit} disabled={isUploading || !selectedFile} className={`w-full py-4 rounded-xl font-black text-sm shadow-md transition-all flex justify-center items-center gap-2 ${selectedFile ? 'bg-[#008b74] hover:bg-[#00705d] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {isUploading ? 'Processing Data...' : <><UploadCloud size={18} /> Upload Assets</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}