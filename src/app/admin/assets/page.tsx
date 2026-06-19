'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageSearch, Plus, Search, Filter, Edit, 
  Trash2, X, Loader2, CheckCircle2, AlertCircle, Laptop, 
  Settings, Upload, Download, Eye, Camera, ShieldCheck, ClipboardCheck,
  ArrowLeft, Wrench, UserMinus, XOctagon, UserPlus, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

// ... [Keep your interfaces the same as previous step] ...

export default function AdminAssetsPage() {
  // ... [Keep your existing useState hooks and fetchData] ...

  // --- REVISED QUICK ACTIONS PANEL IN YOUR RENDER ---
  /* 
     Replace the existing "Quick Actions" div inside your Detail View 
     (viewState === 'detail') with this logic:
  */

  return (
    <div className="space-y-6">
      {/* ... (Existing List View Code) ... */}

      {/* --- REVISED QUICK ACTIONS PANEL --- */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
        
        {isAssigning ? (
           // ASSIGNMENT SEARCH BOX
           <div className="animate-in fade-in zoom-in duration-300 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
             <div className="flex justify-between items-center"><span className="text-xs font-black text-blue-900 uppercase">Search Staff</span><button onClick={() => setIsAssigning(false)}><X size={14}/></button></div>
             <input type="text" placeholder="Name or Emp ID..." onChange={(e) => setAssignSearch(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs border border-gray-200" />
             <div className="max-h-32 overflow-y-auto space-y-1">
               {staffList.filter(s => s.name.toLowerCase().includes(assignSearch.toLowerCase())).map(staff => (
                 <div key={staff.emp_code} className="flex justify-between items-center p-2 bg-white rounded-lg cursor-pointer hover:bg-blue-100" onClick={() => handleAssignAsset(staff.emp_code)}>
                   <p className="text-xs font-bold">{staff.name}</p><Plus size={14} className="text-blue-600"/>
                 </div>
               ))}
             </div>
           </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {/* 1. ASSIGN BUTTON (Shows only if NOT assigned) */}
            {selectedAsset?.status !== 'Assigned' && (
              <button onClick={() => setIsAssigning(true)} className="px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center gap-1">
                <UserPlus size={14}/> Assign Asset
              </button>
            )}

            {/* 2. UNASSIGN BUTTON (Shows ONLY if assigned) */}
            {selectedAsset?.status === 'Assigned' && (
              <button onClick={() => handleQuickStatusChange('Available')} className="px-3 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 flex items-center gap-1">
                <UserMinus size={14}/> Unassign
              </button>
            )}

            {/* 3. REPAIR BUTTON (Shows if not in repair) */}
            {selectedAsset?.status !== 'Maintenance' && (
              <button onClick={() => handleQuickStatusChange('Maintenance')} className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-100 flex items-center gap-1">
                <Wrench size={14}/> Repair
              </button>
            )}

            {/* 4. DISCARD BUTTON (Shows if not retired) */}
            {selectedAsset?.status !== 'Retired' && (
              <button onClick={() => handleQuickStatusChange('Retired')} className="px-3 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100 flex items-center gap-1">
                <XOctagon size={14}/> Discard
              </button>
            )}
          </div>
        )}
      </div>

      {/* --- REVISED STATUS & USER PANEL (SHOWS SHIELD) --- */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Status & User</p>
          <div className="flex items-center gap-1.5">
            {selectedAsset?.status === 'Assigned' && <Shield className="text-blue-500 fill-blue-500" size={16} />}
            <p className="font-bold text-gray-900 text-sm">{selectedAsset?.status} {selectedAsset?.status === 'Assigned' && `• ${selectedAsset.staff_name}`}</p>
          </div>
        </div>
        {/* ... (rest of details) ... */}
      </div>
    </div>
  );
}