'use client';

import React, { useState } from 'react';
import { 
  Settings, ShieldCheck, Image as ImageIcon, 
  Smartphone, Save, CheckCircle2, UserCog, Camera
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings State Management
  const [settings, setSettings] = useState({
    appName: 'Asset Management Portal',
    supportEmail: 'admin@company.com',
    
    // Role & Access Control
    allowStaffLogin: true,
    allowStaffEditAssets: false,
    requireAdminApproval: true,

    // Photo Upload Settings
    compressUploads: true,
    maxUploadSizeMB: '5',
    enableWatermarks: true,
    watermarkFormat: 'Date & Time'
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API save
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Settings size={24} className="text-teal-600" /> System Settings
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Control application rules, roles, and media configurations.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className={`w-full sm:w-auto px-6 py-3 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${saved ? 'bg-green-500 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
        >
          {isSaving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> 
           : saved ? <><CheckCircle2 size={18}/> Saved Successfully</> 
           : <><Save size={18}/> Save Settings</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ========================================== */}
        {/* SECTION 1: ACCESS & ROLE CONTROL           */}
        {/* ========================================== */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><UserCog size={20}/></div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Role & Access Control</h2>
              <p className="text-xs font-bold text-gray-500">Manage what staff can do.</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Toggle Item */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-bold text-sm text-gray-900">Allow Staff to Login</p>
                <p className="text-xs text-gray-500 font-medium">If disabled, only Admin can access the portal.</p>
              </div>
              <button onClick={() => handleToggle('allowStaffLogin')} className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowStaffLogin ? 'bg-teal-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.allowStaffLogin ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-bold text-sm text-gray-900">Staff Can Edit Assets</p>
                <p className="text-xs text-gray-500 font-medium">Allow staff to modify asset details and status.</p>
              </div>
              <button onClick={() => handleToggle('allowStaffEditAssets')} className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowStaffEditAssets ? 'bg-teal-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.allowStaffEditAssets ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-bold text-sm text-gray-900">Require Admin Approval</p>
                <p className="text-xs text-gray-500 font-medium">For asset assignments and discards.</p>
              </div>
              <button onClick={() => handleToggle('requireAdminApproval')} className={`w-12 h-6 rounded-full transition-colors relative ${settings.requireAdminApproval ? 'bg-teal-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.requireAdminApproval ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* SECTION 2: PHOTO UPLOAD CONFIGURATION      */}
        {/* ========================================== */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Camera size={20}/></div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Media & Upload Controls</h2>
              <p className="text-xs font-bold text-gray-500">Fix mobile upload limits and quality.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-bold text-sm text-gray-900 flex items-center gap-2">Auto-Compress Mobile Photos <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] uppercase rounded-md">Recommended</span></p>
                <p className="text-xs text-gray-500 font-medium">Prevents crashes on high-res gallery images.</p>
              </div>
              <button onClick={() => handleToggle('compressUploads')} className={`w-12 h-6 rounded-full transition-colors relative ${settings.compressUploads ? 'bg-teal-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.compressUploads ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <label className="font-bold text-sm text-gray-900 block mb-2">Max Image Upload Size (MB)</label>
              <select value={settings.maxUploadSizeMB} onChange={(e) => setSettings({...settings, maxUploadSizeMB: e.target.value})} className="w-full bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-teal-500">
                <option value="2">2 MB (Fastest)</option>
                <option value="5">5 MB (Balanced)</option>
                <option value="10">10 MB (High Quality)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-bold text-sm text-gray-900">Apply Date Watermarks</p>
                <p className="text-xs text-gray-500 font-medium">Imprints timestamp on asset inspection photos.</p>
              </div>
              <button onClick={() => handleToggle('enableWatermarks')} className={`w-12 h-6 rounded-full transition-colors relative ${settings.enableWatermarks ? 'bg-teal-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.enableWatermarks ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
