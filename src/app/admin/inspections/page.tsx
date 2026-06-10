'use client';

import React, { useState } from 'react';
import { 
  Plus, Search, X, 
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle, 
  Laptop, Tag, Calendar, User, FileText, Image as ImageIcon, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data for Inspections
const initialInspections = [
  { id: 1, assetName: 'MacBook Pro M2', tagId: 'TAG-1001', date: '2024-05-10', inspector: 'John Doe (EMP-001)', status: 'Passed', notes: 'Asset is in perfect working condition. Cleaned and formatted.', photo: '' },
  { id: 2, assetName: 'ThinkPad T14', tagId: 'TAG-1003', date: '2024-05-12', inspector: 'Jane Smith (EMP-002)', status: 'Needs Repair', notes: 'Keyboard keys are sticky. Battery draining quickly. Needs IT attention.', photo: '' },
  { id: 3, assetName: 'Dell UltraSharp 27"', tagId: 'TAG-1002', date: '2024-06-15', inspector: 'Unassigned', status: 'Pending', notes: 'Scheduled for routine 6-month checkup.', photo: '' },
  { id: 4, assetName: 'Logitech MX Master 3', tagId: 'TAG-1004', date: '2024-05-20', inspector: 'John Doe (EMP-001)', status: 'Passed', notes: 'Working perfectly.', photo: '' },
];

export default function InspectionsPage() {
  const [inspections, setInspections] = useState(initialInspections);
  const [activeTab, setActiveTab] = useState<'All' | 'Passed' | 'Needs Repair' | 'Pending'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewInspection, setViewInspection] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    assetSearch: '', inspector: '', date: '', status: 'Passed', notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogInspection = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate adding to DB
    const newInspection = {
      id: Date.now(),
      assetName: formData.assetSearch.split(' - ')[0] || 'Unknown Asset',
      tagId: formData.assetSearch.split(' - ')[1] || 'TAG-XXXX',
      date: formData.date,
      inspector: formData.inspector,
      status: formData.status,
      notes: formData.notes,
      photo: ''
    };
    
    setInspections([newInspection, ...inspections]);
    setIsAddModalOpen(false);
    setFormData({ assetSearch: '', inspector: '', date: '', status: 'Passed', notes: '' }); // Reset
  };

  // Filter Logic
  const filteredInspections = inspections.filter(insp => {
    const matchesSearch = insp.assetName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          insp.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          insp.inspector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' ? true : insp.status === activeTab;
    return matchesSearch && matchesTab;
  });

  // Get status colors
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Passed': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle2 size={16} /> };
      case 'Needs Repair': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <AlertTriangle size={16} /> };
      case 'Pending': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: <Clock size={16} /> };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: <ClipboardCheck size={16} /> };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Asset Inspections</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Log routine checks, maintenance, and asset health</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-sm transition-all">
          <Plus size={18} /> Log Inspection
        </button>
      </div>

      {/* FILTERS & TABS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 pl-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 w-full md:w-96">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by Asset, TAG ID, or Inspector..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400" 
          />
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {['All', 'Pending', 'Passed', 'Needs Repair'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`flex-1 md:w-32 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* INSPECTIONS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardCheck className="text-orange-500" size={20} />
          <h3 className="text-lg font-black text-gray-800">Inspection Records</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredInspections.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-medium">No inspections found matching your criteria.</div>
          ) : (
            filteredInspections.map((insp) => {
              const statusStyle = getStatusConfig(insp.status);
              
              return (
                <div key={insp.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-orange-50/30 transition-all">
                  
                  <div className="flex gap-4 items-start w-full sm:w-auto">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold border shrink-0 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                      {statusStyle.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{insp.assetName}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-500 mt-1">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md"><Tag size={12}/> {insp.tagId}</span>
                        <span className="flex items-center gap-1"><Calendar size={12}/> {insp.date}</span>
                        <span className="flex items-center gap-1"><User size={12}/> {insp.inspector}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0 border-gray-100">
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                      {statusStyle.icon} {insp.status}
                    </span>
                    <button onClick={() => setViewInspection(insp)} className="p-2 bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-600 rounded-xl transition-all font-semibold text-sm flex items-center gap-2">
                      <Eye size={16} /> <span className="hidden sm:inline">Details</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        
        {/* 1. LOG NEW INSPECTION MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><ClipboardCheck size={20} className="text-orange-600"/> Log Asset Inspection</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleLogInspection} className="p-6 overflow-y-auto space-y-6">
                
                {/* Asset Search */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Laptop size={16} className="text-orange-500"/> Select Asset</label>
                  <input 
                    list="assetList" 
                    name="assetSearch" 
                    value={formData.assetSearch} 
                    onChange={handleInputChange} 
                    required
                    placeholder="Search by Asset Name or TAG ID..." 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" 
                  />
                  <datalist id="assetList">
                    <option value="MacBook Pro M2 - TAG-1001" />
                    <option value="Dell UltraSharp 27 - TAG-1002" />
                    <option value="ThinkPad T14 - TAG-1003" />
                  </datalist>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><User size={16} className="text-orange-500"/> Inspected By</label>
                    <input type="text" name="inspector" value={formData.inspector} onChange={handleInputChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Your Name or Emp ID" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Calendar size={16} className="text-orange-500"/> Inspection Date</label>
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-gray-100 pt-5">
                  <label className="text-sm font-bold text-gray-700">Inspection Result</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Passed', 'Needs Repair', 'Pending'].map((status) => (
                      <label key={status} className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl border-2 cursor-pointer transition-all font-bold text-sm ${formData.status === status ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        <input type="radio" name="status" value={status} checked={formData.status === status} onChange={handleInputChange} className="hidden" />
                        {status === 'Passed' && <CheckCircle2 size={16}/>}
                        {status === 'Needs Repair' && <AlertTriangle size={16}/>}
                        {status === 'Pending' && <Clock size={16}/>}
                        {status}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><FileText size={16} className="text-orange-500"/> Notes / Remarks</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} required rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Describe the condition, any damages, or reasons for repair..."></textarea>
                </div>

                <div className="space-y-1.5 border-t border-gray-100 pt-5">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><ImageIcon size={16} className="text-orange-500"/> Proof Photo (Optional)</label>
                  <input type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 transition-all cursor-pointer border border-gray-300 rounded-xl" />
                </div>

                <div className="px-1 py-2 flex justify-end gap-3 mt-4 border-t border-gray-100 pt-5">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-xl shadow-sm transition-all">Save Record</button>
                </div>
              </form>

            </motion.div>
          </div>
        )}

        {/* 2. VIEW INSPECTION DETAILS MODAL */}
        {viewInspection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewInspection(null)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800">Inspection Summary</h2>
                <button onClick={() => setViewInspection(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                <div className="text-center pb-6 border-b border-gray-100">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 border-4 shadow-sm ${getStatusConfig(viewInspection.status).bg} ${getStatusConfig(viewInspection.status).text} ${getStatusConfig(viewInspection.status).border}`}>
                    {getStatusConfig(viewInspection.status).icon}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">{viewInspection.assetName}</h3>
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">
                    <Tag size={14} /> {viewInspection.tagId}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Calendar size={12}/> Date</p>
                    <p className="text-sm font-bold text-gray-900">{viewInspection.date}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><User size={12}/> Inspected By</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{viewInspection.inspector}</p>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 font-bold mb-1">Final Result</p>
                    <p className={`text-sm font-black flex items-center gap-1 ${getStatusConfig(viewInspection.status).text}`}>
                      {viewInspection.status}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><FileText size={14}/> Inspection Notes</p>
                  <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">
                      {viewInspection.notes || 'No detailed notes provided for this inspection.'}
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
