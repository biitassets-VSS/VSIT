'use client';

import React, { useState } from 'react';
import { 
  Plus, Upload, Download, Search, X, 
  Laptop, Tag, QrCode, Calendar, CheckCircle2, AlertCircle, 
  User, Clipboard, FileText, Image as ImageIcon, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA ---
const mockAssets = [
  { id: 1, name: 'MacBook Pro M2', category: 'Laptops', tagId: 'TAG-1001', serialNumber: 'C02HG123QW', purchaseDate: '2023-05-10', condition: 'New', status: 'Assigned', assignedTo: 'John Doe (EMP-001)', lastInspectionDate: '2024-01-15', notes: 'Perfect condition.', photo: '/laptop-mock.jpg' },
  { id: 2, name: 'Dell UltraSharp 27"', category: 'Monitors', tagId: 'TAG-1002', serialNumber: 'CN-0XV3X2', purchaseDate: '2022-11-20', condition: 'Refurbished', status: 'In Stock', assignedTo: 'Unassigned', lastInspectionDate: '2024-02-01', notes: 'Slight scratch on stand.', photo: '' },
  { id: 3, name: 'ThinkPad T14', category: 'Laptops', tagId: 'TAG-1003', serialNumber: 'PF-34X98A', purchaseDate: '2021-08-15', condition: 'Repair', status: 'Repair', assignedTo: 'Jane Smith (EMP-002)', lastInspectionDate: '2024-03-05', notes: 'Keyboard keys sticky. Sent to IT.', photo: '' },
  { id: 4, name: 'Logitech MX Master 3', category: 'Accessories', tagId: 'TAG-1004', serialNumber: 'LZ-99932', purchaseDate: '2023-10-05', condition: 'New', status: 'Assigned', assignedTo: 'Jane Smith (EMP-002)', lastInspectionDate: '2024-03-05', notes: 'Working fine.', photo: '' },
];

export default function AssetsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [viewAsset, setViewAsset] = useState<any>(null); // State for View Modal
  const [activeTab, setActiveTab] = useState<'category' | 'staff'>('category');

  // Form State
  const [formData, setFormData] = useState({
    assetName: '', category: 'Laptops', tagId: '', serialNumber: '',
    purchaseDate: '', condition: 'New', status: 'In Stock', 
    assignedTo: '', lastInspectionDate: '', inspectionNotes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Bulk Upload CSV Generate
  const downloadSampleCSV = () => {
    const csvHeader = "AssetName,Category,TagID,SerialNumber,PurchaseDate,Condition,Status,AssignedTo,LastInspectionDate,InspectionNotes\n";
    const csvRow = "MacBook Pro M2,Laptops,TAG-1001,C02HG123QW,2023-05-10,New,Assigned,John Doe (EMP-001),2024-01-15,Perfect condition\n";
    
    const blob = new Blob([csvHeader + csvRow], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Assets_Bulk_Upload_Sample.csv";
    link.click();
  };

  // Grouping Logic for the UI
  const groupedAssets = mockAssets.reduce((acc: any, asset) => {
    const key = activeTab === 'category' ? asset.category : asset.assignedTo;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Assets Management</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Track hardware, software, and assignments</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 border border-gray-200 transition-all">
            <Upload size={18} /> Bulk Upload
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-sm transition-all">
            <Plus size={18} /> Add New Asset
          </button>
        </div>
      </div>

      {/* FILTER & TABS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 pl-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 w-full md:w-96">
          <Search size={20} className="text-gray-400" />
          <input type="text" placeholder="Search by TAG ID, Name, or Serial..." className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400" />
        </div>
        
        {/* Toggle Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
          <button onClick={() => setActiveTab('category')} className={`flex-1 md:w-36 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'category' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Category Wise
          </button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 md:w-36 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'staff' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Staff Wise
          </button>
        </div>
      </div>

      {/* DISPLAY ASSETS BASED ON TABS */}
      <div className="space-y-8">
        {Object.keys(groupedAssets).map(groupName => (
          <div key={groupName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                {activeTab === 'category' ? <Laptop className="text-orange-500" size={20} /> : <User className="text-orange-500" size={20} />}
                {groupName} <span className="text-sm text-gray-400 font-semibold ml-2">({groupedAssets[groupName].length} items)</span>
              </h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {groupedAssets[groupName].map((asset: any) => (
                <div key={asset.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-orange-50/30 transition-all">
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                      {asset.category === 'Laptops' ? <Laptop size={24}/> : <Tag size={24}/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{asset.name}</h4>
                      <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><QrCode size={12}/> {asset.tagId}</span>
                        <span className="flex items-center gap-1"><AlertCircle size={12}/> {asset.condition}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                      asset.status === 'Assigned' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      asset.status === 'In Stock' ? 'bg-green-50 text-green-600 border-green-200' :
                      'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {asset.status}
                    </span>
                    <button onClick={() => setViewAsset(asset)} className="p-2 bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-600 rounded-xl transition-all font-semibold text-sm flex items-center gap-2">
                      <Eye size={16} /> <span className="hidden sm:inline">View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        
        {/* 1. ADD NEW ASSET MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><Plus size={20} className="text-orange-600"/> Add New Asset</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Asset Name</label>
                    <input type="text" name="assetName" value={formData.assetName} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. MacBook Pro M3" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option>Laptops</option><option>Monitors</option><option>Accessories</option><option>Phones</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">TAG ID</label>
                    <input type="text" name="tagId" value={formData.tagId} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="TAG-0000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Serial Number</label>
                    <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="S/N..." />
                  </div>
                </div>

                {/* Status & Assignment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-100 pt-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Condition</label>
                    <select name="condition" value={formData.condition} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option>New</option><option>Refurbished</option><option>Repair</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                      <option>In Stock</option><option>Assigned</option><option>Repair</option><option>Discard</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-bold text-gray-700">Assigned To (Search)</label>
                    {/* Searchable Input (Datalist mapping) */}
                    <input list="staffList" name="assignedTo" value={formData.assignedTo} onChange={handleInputChange} placeholder="Search Staff Name or ID" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" />
                    <datalist id="staffList">
                      <option value="John Doe (EMP-001)" />
                      <option value="Jane Smith (EMP-002)" />
                    </datalist>
                  </div>
                </div>

                {/* Dates, Notes & Photo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-gray-100 pt-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Calendar size={16}/> Purchase Date</label>
                      <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Clipboard size={16}/> Last Inspection Date</label>
                      <input type="date" name="lastInspectionDate" value={formData.lastInspectionDate} onChange={handleInputChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><FileText size={16}/> Inspection Notes</label>
                      <textarea name="inspectionNotes" value={formData.inspectionNotes} onChange={handleInputChange} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Any issues found?"></textarea>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><ImageIcon size={16}/> Upload Photo</label>
                      <input type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 transition-all cursor-pointer border border-gray-300 rounded-xl" />
                    </div>
                  </div>
                </div>

              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                <button className="px-5 py-2.5 text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-xl shadow-sm transition-all">Save Asset</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. BULK UPLOAD MODAL */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBulkModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden text-center p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-800">Bulk Upload Assets</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20}/></button>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <p className="text-sm text-orange-800 font-semibold mb-3">Ensure your CSV matches the required format including Tags, Condition, and Assignment.</p>
                <button onClick={downloadSampleCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 text-sm font-bold rounded-xl hover:bg-orange-100 shadow-sm"><Download size={16} /> Download Sample CSV</button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:bg-gray-50 cursor-pointer flex flex-col items-center">
                <div className="h-12 w-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-3"><Upload size={24} /></div>
                <p className="font-bold text-gray-700">Click to upload CSV file</p>
                <input type="file" accept=".csv" className="hidden" />
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. VIEW ASSET FULL DETAILS MODAL */}
        {viewAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewAsset(null)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">Asset Details</h2>
                <button onClick={() => setViewAsset(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex gap-6 items-start">
                  {/* Photo Preview Placeholder */}
                  <div className="w-32 h-32 bg-gray-100 border border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                    {viewAsset.photo ? <img src={viewAsset.photo} alt="Asset" className="w-full h-full object-cover"/> : <><ImageIcon size={32} className="mb-2"/> <span className="text-xs font-bold">No Photo</span></>}
                  </div>

                  <div className="flex-1 space-y-1">
                    <h3 className="text-2xl font-black text-gray-900">{viewAsset.name}</h3>
                    <p className="text-sm font-semibold text-gray-500">Category: {viewAsset.category}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">{viewAsset.tagId}</span>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">SN: {viewAsset.serialNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 pt-5">
                  <div><p className="text-xs text-gray-500 font-bold mb-1">Condition</p><p className="text-sm font-semibold text-gray-900">{viewAsset.condition}</p></div>
                  <div><p className="text-xs text-gray-500 font-bold mb-1">Status</p><p className="text-sm font-semibold text-gray-900">{viewAsset.status}</p></div>
                  <div><p className="text-xs text-gray-500 font-bold mb-1">Purchase Date</p><p className="text-sm font-semibold text-gray-900">{viewAsset.purchaseDate}</p></div>
                  <div><p className="text-xs text-gray-500 font-bold mb-1">Last Inspection</p><p className="text-sm font-semibold text-gray-900">{viewAsset.lastInspectionDate}</p></div>
                </div>

                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-600 font-bold mb-1 flex items-center gap-1"><User size={14}/> Currently Assigned To</p>
                  <p className="text-sm font-black text-gray-900">{viewAsset.assignedTo}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Clipboard size={14}/> Inspection Notes</p>
                  <p className="text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{viewAsset.notes || 'No inspection notes available.'}</p>
                </div>
              </div>

            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
