'use client';

import React, { useState } from 'react';

export default function StaffDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inspection Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState<any>(null);
  
  // Verification States
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Upload States
  const [note, setNote] = useState('');

  // Dummy Data (Only assets assigned to this specific logged-in user: John Doe)
  const myAssets = [
    { 
      id: 1, tag: '#AST-042', serial: 'SN-998234', name: 'Dell XPS 15', category: 'Laptop',
      lastInspection: 'Oct 10, 2022', dueDate: 'Oct 10, 2023', status: 'Overdue' 
    },
    { 
      id: 2, tag: '#AST-105', serial: 'SN-MS881', name: 'Logitech MX Master 3', category: 'Other',
      lastInspection: 'Oct 20, 2023', dueDate: 'Nov 20, 2023', status: 'Pending' 
    },
    { 
      id: 3, tag: '#AST-150', serial: 'SN-KB992', name: 'Dell Wired Keyboard', category: 'Other',
      lastInspection: 'Oct 22, 2023', dueDate: 'Nov 22, 2024', status: 'Passed' 
    },
  ];

  // Calculate Alerts
  const overdueCount = myAssets.filter(a => a.status === 'Overdue').length;
  const pendingCount = myAssets.filter(a => a.status === 'Pending').length;

  // Modal Handlers
  const openInspection = (asset: any) => {
    setActiveAsset(asset);
    setVerificationInput('');
    setVerificationStatus('idle');
    setNote('');
    setIsModalOpen(true);
  };

  const closeInspection = () => {
    setIsModalOpen(false);
    setTimeout(() => setActiveAsset(null), 300); // Wait for animation
  };

  const handleVerify = () => {
    // Check if input matches EITHER the tag OR the serial number (case insensitive)
    const input = verificationInput.trim().toLowerCase();
    const isMatch = input === activeAsset.tag.toLowerCase() || input === activeAsset.serial.toLowerCase();
    
    setVerificationStatus(isMatch ? 'success' : 'error');
  };

  return (
    <div className="w-full space-y-6 animate-[fadeIn_0.5s_ease-out] relative">
      
      {/* 1. WELCOME & ALERT BANNERS */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome back, John! 👋</h1>
        
        <div className="flex flex-col gap-3">
          {overdueCount > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-red-500 text-xl">⚠️</span>
                <div>
                  <h3 className="text-sm font-bold text-red-800">Action Required: Overdue Inspections</h3>
                  <p className="text-xs text-red-600">You have {overdueCount} asset(s) that are past their inspection due date. Please inspect them immediately.</p>
                </div>
              </div>
            </div>
          )}

          {pendingCount > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-orange-500 text-xl">⏳</span>
                <div>
                  <h3 className="text-sm font-bold text-orange-800">Upcoming Inspections</h3>
                  <p className="text-xs text-orange-600">You have {pendingCount} asset(s) waiting for inspection this month.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. MY ASSETS TABLE */}
      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-gray-800">My Assigned Assets</h2>
          
          <div className="relative w-full sm:w-64 group">
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white transition-all focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Search my assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Asset Details</th>
                <th className="px-6 py-4 font-semibold">Inspection Dates</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-50">
              {myAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-blue-50/30 transition-colors group">
                  
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{asset.name}</div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">Tag: {asset.tag} | SN: {asset.serial}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm"><span className="text-gray-400 text-xs mr-2">Last:</span>{asset.lastInspection}</div>
                    <div className="text-sm mt-1"><span className="text-gray-400 text-xs mr-2">Due:</span>
                      <span className={asset.status === 'Overdue' ? 'text-red-600 font-bold' : 'text-gray-800'}>{asset.dueDate}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide border ${
                      asset.status === 'Passed' ? 'bg-green-50 text-green-700 border-green-200' :
                      asset.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      'bg-red-50 text-red-700 border-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-right">
                    {asset.status === 'Passed' ? (
                      <span className="text-green-600 text-sm font-semibold flex items-center justify-end gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Up to date
                      </span>
                    ) : (
                      <button 
                        onClick={() => openInspection(asset)}
                        className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-transform hover:scale-105 ${
                          asset.status === 'Overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        Start Inspection
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. INSPECTION MODAL (VERIFICATION & UPLOAD) */}
      {isModalOpen && activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Asset Inspection</h3>
                <p className="text-sm text-gray-500 mt-1">Inspecting: <span className="font-semibold text-blue-600">{activeAsset.name}</span></p>
              </div>
              <button onClick={closeInspection} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-gray-200 hover:bg-red-50 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* STEP 1: VERIFICATION */}
              <div className={`p-5 rounded-2xl border transition-all duration-300 ${verificationStatus === 'success' ? 'bg-green-50/50 border-green-200' : 'bg-blue-50/30 border-blue-100'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold ${verificationStatus === 'success' ? 'bg-green-500' : 'bg-blue-600'}`}>1</div>
                  <h4 className="font-bold text-gray-800">Verify Asset Identity</h4>
                </div>
                
                {verificationStatus === 'success' ? (
                  <div className="flex items-center gap-3 text-green-700 bg-green-100 p-3 rounded-xl">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="font-bold text-sm">Asset Verified Successfully!</p>
                      <p className="text-xs opacity-80">You may now proceed to upload evidence.</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">To ensure you are inspecting the correct item, please type the <strong className="text-gray-800">Serial Number</strong> or <strong className="text-gray-800">Asset Tag</strong> printed on the device.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${verificationStatus === 'error' ? 'border-red-300 focus:ring-red-200 bg-red-50' : 'border-gray-300 focus:ring-blue-200'}`}
                        placeholder={`e.g. ${activeAsset.tag} or ${activeAsset.serial}`}
                        value={verificationInput}
                        onChange={(e) => {
                          setVerificationInput(e.target.value);
                          setVerificationStatus('idle'); 
                        }}
                      />
                      <button onClick={handleVerify} className="px-6 py-2.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors">
                        Verify
                      </button>
                    </div>
                    {verificationStatus === 'error' && (
                      <p className="text-red-500 text-xs mt-2 font-medium">❌ Incorrect Tag or Serial Number. Please check the physical device and try again.</p>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 2: EVIDENCE UPLOAD */}
              <div className={`transition-all duration-500 ${verificationStatus === 'success' ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">2</div>
                  <h4 className="font-bold text-gray-800">Upload Evidence & Notes</h4>
                </div>

                {/* Dynamic Photo Grid */}
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-sm font-semibold text-gray-700">Required Photos ({activeAsset?.category === 'Laptop' ? '5 Angles' : '2 Angles'})</p>
                  </div>
                  
                  <div className={`grid gap-3 ${activeAsset?.category === 'Laptop' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
                    {(activeAsset?.category === 'Laptop' ? 
                      ['Top (Lid)', 'Bottom (Serial)', 'Left Side', 'Right Side', 'Keyboard/Screen'] : 
                      ['Top View', 'Bottom (Serial)']
                    ).map((label, idx) => (
                      <div key={idx} className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-blue-50 hover:border-blue-400 transition-colors cursor-pointer group h-32">
                        <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-600">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Inspection Notes (Optional)</label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe any scratches, dents, or issues..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  ></textarea>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeInspection} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button 
                disabled={verificationStatus !== 'success'}
                className={`px-6 py-2.5 text-sm font-bold rounded-xl shadow-lg transition-all ${
                  verificationStatus === 'success' 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Submit Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
