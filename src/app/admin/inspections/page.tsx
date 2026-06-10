'use client';

import React, { useState } from 'react';
import { 
  Search, X, CheckCircle2, AlertTriangle, 
  Laptop, Tag, Calendar, User, FileText, 
  ImageIcon, Eye, Clock, ShieldCheck, ThumbsDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data: Simulating inspections submitted by staff waiting for admin approval
const initialInspections = [
  { 
    id: 1, 
    assetName: 'MacBook Pro M2', 
    tagId: 'TAG-1001', 
    date: '2024-06-10', 
    inspector: 'John Doe (EMP-001)', 
    status: 'Pending Review', 
    notes: 'Everything looks good. Cleaned the screen and formatted the drive. Ready for next user.', 
    photo: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1000' 
  },
  { 
    id: 2, 
    assetName: 'ThinkPad T14', 
    tagId: 'TAG-1003', 
    date: '2024-06-09', 
    inspector: 'Jane Smith (EMP-002)', 
    status: 'Pending Review', 
    notes: 'The "Enter" key is slightly sticky, and there is a small scratch on the back cover. Otherwise working fine.', 
    photo: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=1000' 
  },
  { 
    id: 3, 
    assetName: 'Dell UltraSharp 27"', 
    tagId: 'TAG-1002', 
    date: '2024-06-05', 
    inspector: 'Alex Johnson (EMP-003)', 
    status: 'Passed', 
    notes: 'Perfect condition. Display tested and calibrated.', 
    photo: '' 
  },
  { 
    id: 4, 
    assetName: 'Logitech MX Master 3', 
    tagId: 'TAG-1004', 
    date: '2024-06-01', 
    inspector: 'Jane Smith (EMP-002)', 
    status: 'Rejected', 
    notes: 'Scroll wheel is completely broken. Needs replacement.', 
    photo: '' 
  },
];

export default function InspectionsPage() {
  const [inspections, setInspections] = useState(initialInspections);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending Review' | 'Passed' | 'Rejected'>('Pending Review');
  const [searchQuery, setSearchQuery] = useState('');
  
  // View/Approval Modal State
  const [viewInspection, setViewInspection] = useState<any>(null);

  // Handle Admin Approval or Rejection
  const handleStatusUpdate = (id: number, newStatus: 'Passed' | 'Rejected') => {
    setInspections(inspections.map(insp => 
      insp.id === id ? { ...insp, status: newStatus } : insp
    ));
    setViewInspection(null); // Close modal after action
  };

  // Filter Logic
  const filteredInspections = inspections.filter(insp => {
    const matchesSearch = insp.assetName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          insp.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          insp.inspector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' ? true : insp.status === activeTab;
    return matchesSearch && matchesTab;
  });

  // Dynamic Status Configurations
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Passed': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle2 size={16} /> };
      case 'Rejected': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <AlertTriangle size={16} /> };
      case 'Pending Review': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: <Clock size={16} /> };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: <FileText size={16} /> };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">Inspection Approvals</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Review staff submitted inspection forms, check photos, and approve or reject.</p>
      </div>

      {/* FILTERS & TABS */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white p-2 pl-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 w-full lg:w-96">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by Asset, TAG ID, or Inspector..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400" 
          />
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
          {['Pending Review', 'All', 'Passed', 'Rejected'].map((tab) => {
            // Count badges for tabs
            const count = tab === 'All' ? inspections.length : inspections.filter(i => i.status === tab).length;
            
            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`flex-1 lg:w-36 py-2 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab} 
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* INSPECTIONS LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredInspections.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
              <p className="text-gray-500 font-medium mt-1">No inspections matching this criteria right now.</p>
            </div>
          ) : (
            filteredInspections.map((insp) => {
              const statusStyle = getStatusConfig(insp.status);
              
              return (
                <div key={insp.id} className={`p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${insp.status === 'Pending Review' ? 'hover:bg-orange-50/50 bg-white' : 'hover:bg-gray-50 bg-white'}`}>
                  
                  <div className="flex gap-4 items-start w-full md:w-auto">
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
                  
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-0 pt-3 md:pt-0 border-gray-100">
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                      {statusStyle.icon} {insp.status}
                    </span>
                    
                    <button 
                      onClick={() => setViewInspection(insp)} 
                      className={`px-4 py-2 rounded-xl transition-all font-bold text-sm flex items-center gap-2 shadow-sm ${insp.status === 'Pending Review' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {insp.status === 'Pending Review' ? 'Review Form' : 'View Details'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* REVIEW / DETAILS MODAL */}
      <AnimatePresence>
        {viewInspection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewInspection(null)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  {viewInspection.status === 'Pending Review' ? 'Review Inspection Form' : 'Inspection Record'}
                </h2>
                <button onClick={() => setViewInspection(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Asset Info Card */}
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{viewInspection.assetName}</h3>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold">
                      <Tag size={14} /> {viewInspection.tagId}
                    </span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl border flex flex-col items-center justify-center ${getStatusConfig(viewInspection.status).bg} ${getStatusConfig(viewInspection.status).text} ${getStatusConfig(viewInspection.status).border}`}>
                    <span className="text-xs font-bold uppercase tracking-wide opacity-80 mb-0.5">Current Status</span>
                    <span className="font-black text-sm flex items-center gap-1">{getStatusConfig(viewInspection.status).icon} {viewInspection.status}</span>
                  </div>
                </div>

                {/* Staff & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-gray-100 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><User size={12}/> Submitted By</p>
                    <p className="text-sm font-bold text-gray-900">{viewInspection.inspector}</p>
                  </div>
                  <div className="border border-gray-100 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 font-bold mb-1 flex items-center gap-1"><Calendar size={12}/> Inspection Date</p>
                    <p className="text-sm font-bold text-gray-900">{viewInspection.date}</p>
                  </div>
                </div>

                {/* Staff Notes */}
                <div>
                  <p className="text-sm text-gray-700 font-bold mb-2 flex items-center gap-1.5"><FileText size={16} className="text-orange-500"/> Inspector Notes</p>
                  <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 text-gray-800 font-medium text-sm leading-relaxed">
                    {viewInspection.notes}
                  </div>
                </div>

                {/* Uploaded Photo Preview */}
                <div>
                  <p className="text-sm text-gray-700 font-bold mb-2 flex items-center gap-1.5"><ImageIcon size={16} className="text-orange-500"/> Uploaded Photo</p>
                  {viewInspection.photo ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 group">
                      <img src={viewInspection.photo} alt="Asset condition" className="w-full h-64 object-cover" />
                      {/* Enlarge hint overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="bg-white/90 text-gray-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Eye size={16}/> View Attached Image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={32} className="mb-2" />
                      <p className="text-sm font-bold text-gray-500">No photos attached by inspector.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* ACTION FOOTER (Only shows if Pending) */}
              {viewInspection.status === 'Pending Review' ? (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-4">
                  <button 
                    onClick={() => handleStatusUpdate(viewInspection.id, 'Rejected')}
                    className="flex-1 flex justify-center items-center gap-2 px-5 py-3.5 text-sm font-bold bg-white text-red-600 border-2 border-red-100 hover:border-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <ThumbsDown size={18} /> Reject / Needs Repair
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(viewInspection.id, 'Passed')}
                    className="flex-1 flex justify-center items-center gap-2 px-5 py-3.5 text-sm font-bold bg-green-600 text-white hover:bg-green-700 shadow-sm rounded-xl transition-all"
                  >
                    <ShieldCheck size={18} /> Approve & Pass
                  </button>
                </div>
              ) : (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                   <button onClick={() => setViewInspection(null)} className="px-6 py-2.5 text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl transition-all">Close Record</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
