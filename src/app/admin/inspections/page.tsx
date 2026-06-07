'use client';

import React, { useState } from 'react';

export default function InspectionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  // States for the Review Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);

  // Advanced Dummy Data with SPECIFIC Photo Angles
  const inspectionsList = [
    { 
      id: 1, assetTag: '#AST-042', assetName: 'Dell XPS 15', category: 'Laptop', staffName: 'John Doe', empCode: 'EMP-001',
      lastInspection: 'Oct 10, 2023', dueDate: 'Nov 10, 2023', status: 'Waiting Approval',
      evidence: { 
        // 5 Photos for Laptops
        photos: [
          { url: 'https://placehold.co/600x400/e2e8f0/475569?text=Top+Side', label: 'Top Side (Lid)' },
          { url: 'https://placehold.co/600x400/e2e8f0/475569?text=Back+Side', label: 'Back Side (Base/Serial)' },
          { url: 'https://placehold.co/600x400/e2e8f0/475569?text=Left+Side', label: 'Left Side (Ports)' },
          { url: 'https://placehold.co/600x400/e2e8f0/475569?text=Right+Side', label: 'Right Side (Ports)' },
          { url: 'https://placehold.co/600x400/e2e8f0/475569?text=Keyboard+%26+Screen', label: 'Keyboard & Screen' }
        ], 
        note: "The laptop is working perfectly. However, the 'E' key is feeling a little bit sticky sometimes. Attached all 5 required photos." 
      }
    },
    { 
      id: 2, assetTag: '#AST-105', assetName: 'Logitech MX Master 3', category: 'Other', staffName: 'John Doe', empCode: 'EMP-001',
      lastInspection: 'Oct 20, 2023', dueDate: 'Nov 20, 2023', status: 'Waiting Approval',
      evidence: { 
        // 2 Photos for Other Assets
        photos: [
          { url: 'https://placehold.co/600x400/e2e8f0/475569?text=Top+View', label: 'Top View' },
          { url: 'https://placehold.co/600x400/e2e8f0/475569?text=Bottom+View', label: 'Bottom View (Sensor/Serial)' }
        ], 
        note: "Mouse glides smoothly. Battery still holds a full charge for weeks." 
      }
    },
    { 
      id: 3, assetTag: '#AST-112', assetName: 'Lenovo ThinkPad', category: 'Laptop', staffName: 'Sarah Williams', empCode: 'EMP-004',
      lastInspection: 'Aug 05, 2023', dueDate: 'Sep 05, 2023', status: 'Failed',
      evidence: { 
        photos: [
          { url: 'https://placehold.co/600x400/fee2e2/b91c1c?text=Top+Side', label: 'Top Side (Lid)' },
          { url: 'https://placehold.co/600x400/fee2e2/b91c1c?text=Back+Side', label: 'Back Side (Base/Serial)' },
          { url: 'https://placehold.co/600x400/fee2e2/b91c1c?text=Left+Side', label: 'Left Side (Ports)' },
          { url: 'https://placehold.co/600x400/fee2e2/b91c1c?text=Right+Side', label: 'Right Side (Ports)' },
          { url: 'https://placehold.co/600x400/fee2e2/b91c1c?text=Screen+Crack', label: 'Keyboard & Screen' }
        ], 
        note: "Dropped my bag and the screen cracked in the corner. Device still turns on but screen is unusable." 
      }
    },
    { 
      id: 4, assetTag: '#AST-089', assetName: 'MacBook Pro 16"', category: 'Laptop', staffName: 'Jane Smith', empCode: 'EMP-002',
      lastInspection: 'Sep 15, 2023', dueDate: 'Oct 15, 2023', status: 'Pending',
      evidence: { photos: [], note: "" }
    }
  ];

  const toggleSelectAll = () => {
    if (selectedRecords.length === inspectionsList.length) setSelectedRecords([]);
    else setSelectedRecords(inspectionsList.map(item => item.id));
  };

  const toggleSelectRecord = (id: number) => {
    if (selectedRecords.includes(id)) setSelectedRecords(selectedRecords.filter(recordId => recordId !== id));
    else setSelectedRecords([...selectedRecords, id]);
  };

  const openReviewModal = (record: any) => {
    setReviewData(record);
    setIsModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsModalOpen(false);
    setReviewData(null);
  };

  return (
    <div className="w-full min-h-screen space-y-6 pb-10 animate-[fadeIn_0.5s_ease-out] relative">
      
      {/* TOP BAR & SEARCH */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative w-full lg:w-1/2 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all duration-300 sm:text-sm"
            placeholder="Search by Asset Tag, Staff Name, or EMP Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 relative">
          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="w-full sm:w-auto px-5 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>Export PDF Reports</span>
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">Download Options</div>
                <div className="p-2 space-y-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">📄 Export Selected ({selectedRecords.length > 0 ? selectedRecords.length : 'All'})</button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">👤 Export by Staff Member</button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg">💻 Export by Asset Category</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INSPECTIONS TABLE */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-bold text-gray-800">Inspection Approvals</h2>
        </div>
        
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold w-10">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" onChange={toggleSelectAll} checked={selectedRecords.length === inspectionsList.length && inspectionsList.length > 0} />
                </th>
                <th className="px-6 py-4 font-semibold">Asset & Staff</th>
                <th className="px-6 py-4 font-semibold text-center">Evidence Submitted</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Review</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-50">
              {inspectionsList.map((record) => (
                <tr key={record.id} className={`transition-colors group ${selectedRecords.includes(record.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                  
                  <td className="px-6 py-4">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" checked={selectedRecords.includes(record.id)} onChange={() => toggleSelectRecord(record.id)} />
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-blue-600">{record.assetTag} - {record.assetName}</div>
                    <div className="text-sm text-gray-500 mt-1">By: {record.staffName} ({record.empCode})</div>
                    <div className="text-xs text-gray-400 mt-0.5">{record.category}</div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    {record.evidence.photos.length > 0 || record.evidence.note ? (
                      <button onClick={() => openReviewModal(record)} className="flex justify-center items-center gap-2 mx-auto hover:scale-105 transition-transform">
                        {record.evidence.photos.length > 0 && (
                          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${record.evidence.photos.length === 5 ? 'text-green-700 bg-green-100' : 'text-blue-600 bg-blue-50'}`}>
                            📸 {record.evidence.photos.length} / {record.category === 'Laptop' ? '5' : '2'}
                          </span>
                        )}
                        {record.evidence.note && <span className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">📝 Note</span>}
                      </button>
                    ) : <span className="text-xs text-gray-400 italic">No Evidence</span>}
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide border ${record.status === 'Waiting Approval' ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse' : record.status === 'Failed' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {record.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    {record.status === 'Waiting Approval' || record.status === 'Failed' ? (
                       <button onClick={() => openReviewModal(record)} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                         Review Evidence
                       </button>
                    ) : (
                      <button className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg">View Report</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- REVIEW MODAL (POPUP) --- */}
      {isModalOpen && reviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Review Inspection Evidence</h3>
                <p className="text-sm text-gray-500">Asset: <span className="font-semibold text-blue-600">{reviewData.assetTag} - {reviewData.assetName} ({reviewData.category})</span></p>
              </div>
              <button onClick={closeReviewModal} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-200 hover:bg-red-50 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Staff Info */}
              <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold border border-blue-300">
                  {reviewData.staffName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Submitted by: {reviewData.staffName}</p>
                  <p className="text-xs text-gray-500">EMP ID: {reviewData.empCode} • Last Inspected: {reviewData.lastInspection}</p>
                </div>
              </div>

              {/* Note Section */}
              {reviewData.evidence.note && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">📝 Staff Notes</h4>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-700 italic text-sm">
                    "{reviewData.evidence.note}"
                  </div>
                </div>
              )}

              {/* Photos Section */}
              {reviewData.evidence.photos.length > 0 && (
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">📸 Uploaded Photos</h4>
                    <span className="text-xs font-semibold text-gray-500">
                      Requirement: {reviewData.category === 'Laptop' ? '5 Angles Required' : '2 Angles Required'}
                    </span>
                  </div>
                  
                  {/* Grid changes layout based on how many photos there are */}
                  <div className={`grid gap-4 ${reviewData.evidence.photos.length > 2 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {reviewData.evidence.photos.map((photo: { url: string, label: string }, index: number) => (
                      <div key={index} className="group relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.label} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 backdrop-blur-sm">
                          <p className="text-white text-xs text-center font-bold tracking-wide">{photo.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <button onClick={closeReviewModal} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              
              <div className="flex gap-3">
                <button className="px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-600 hover:text-white transition-colors">
                  ✖ Reject & Mark Failed
                </button>
                <button className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl shadow-lg hover:bg-green-700 shadow-green-500/30 transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  Approve & Pass
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
