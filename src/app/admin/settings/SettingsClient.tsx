'use client';

import React, { useState } from 'react';
import { 
  Settings, ShieldCheck, Image as ImageIcon, 
  Smartphone, Save, CheckCircle2, UserCog, Camera,
  Users, Mail
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- TYPES ---
interface AppSettings {
  appName: string;
  supportEmail: string;
  allowStaffLogin: boolean;
  allowStaffEditAssets: boolean;
  requireAdminApproval: boolean;
  compressUploads: boolean;
  maxUploadSizeMB: string;
  enableWatermarks: boolean;
  watermarkFormat: string;
}

interface UserRecord {
  id: string | number;
  name: string;
  email: string;
  role: string;
}

interface SettingsClientProps {
  initialSettings: AppSettings;
  initialUsers: UserRecord[];
}

export default function SettingsClient({ initialSettings, initialUsers }: SettingsClientProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize State with Live Database Data
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);

  // Handlers for Global Settings
  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Handler for Individual User Role Changes
  const handleRoleChange = async (userId: string | number, newRole: string) => {
    // 1. Update UI instantly for a snappy feel
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));

    // 2. Send the update to your actual database API
    try {
      // ⚠️ YOU MUST CREATE THIS API ROUTE IN YOUR NEXT.JS APP
      /*
      const response = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      });

      if (!response.ok) throw new Error('Failed to update role in database');
      */
    } catch (error) {
      alert("Failed to update user access. Please try again.");
      // Optional: Revert the UI state if the API fails
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // PUSH UPDATED GLOBAL SETTINGS TO YOUR DATABASE
      /*
      await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      */

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      alert("Failed to save global settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
          onClick={handleSaveSettings} 
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
        {/* SECTION 1: GLOBAL ACCESS CONTROL           */}
        {/* ========================================== */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><UserCog size={20}/></div>
            <div>
              <h2 className="text-lg font-black text-gray-900">Global Permissions</h2>
              <p className="text-xs font-bold text-gray-500">Manage overarching portal rules.</p>
            </div>
          </div>

          <div className="space-y-4">
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
                <p className="font-bold text-sm text-gray-900 flex items-center gap-2">Auto-Compress Photos <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] uppercase rounded-md">Recommended</span></p>
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

      {/* ========================================== */}
      {/* SECTION 3: INDIVIDUAL USER ROLE MANAGEMENT */}
      {/* ========================================== */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><Users size={20}/></div>
            <div>
              <h2 className="text-lg font-black text-gray-900">User Access Management</h2>
              <p className="text-xs font-bold text-gray-500">Assign specific roles to registered accounts.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-bold pl-4">User Details</th>
                <th className="pb-3 font-bold">Current Role</th>
                <th className="pb-3 font-bold text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500 text-sm font-medium">
                    No users found. Please connect your database in page.tsx.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 pl-4">
                      <p className="font-bold text-sm text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail size={12} /> {user.email}
                      </p>
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'Staff' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="Admin">Set as Admin</option>
                        <option value="Staff">Set as Staff</option>
                        <option value="Revoked">Revoke Access</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}