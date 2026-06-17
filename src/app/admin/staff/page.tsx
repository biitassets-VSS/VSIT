'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Search, Package, UserCheck, Edit, Trash2, Power, X, 
  Plus, UploadCloud, Download, Mail, Phone, CalendarDays, Lock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Updated Staff Interface with Login Credentials & Details
interface Staff { 
  empId: string; 
  name: string; 
  department: string; 
  isActive: boolean; 
  email: string;
  password?: string;
  phone: string;
  dob: string;
  joiningDate: string;
}

interface Asset { id: string; name: string; tagId: string; assignedToEmpId?: string; }

// Initial Mock Data
const initialStaff: Staff[] = [
  { empId: 'EMP-001', name: 'Lakhwinder Singh', department: 'IT Department', isActive: true, email: 'lakhwinder@vsit.com', password: 'password123', phone: '+91 9876543210', dob: '1990-05-14', joiningDate: '2020-01-15' },
  { empId: 'EMP-002', name: 'Sarah Connor', department: 'Migrations', isActive: true, email: 'sarah@vsit.com', password: 'password123', phone: '+1 555-0198', dob: '1985-08-22', joiningDate: '2021-03-10' },
  { empId: 'EMP-003', name: 'John Doe', department: 'Accounts', isActive: false, email: 'john@vsit.com', password: 'password123', phone: '+1 555-0100', dob: '1992-11-05', joiningDate: '2022-06-01' },
];

export default function StaffPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for Staff Management
  const [staffList, setStaffList] = useState<Staff[]>([]);
  
  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Staff>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Load Data & Sync Login Credentials
  useEffect(() => {
    // 1. Load Assets
    const savedAssets = localStorage.getItem('vsit_assets_inventory');
    if (savedAssets) setAssets(JSON.parse(savedAssets));

    // 2. Load Staff/Users (This is what the Login Page will check!)
    const savedStaff = localStorage.getItem('vsit_staff_users');
    if (savedStaff) {
      setStaffList(JSON.parse(savedStaff));
    } else {
      setStaffList(initialStaff);
      localStorage.setItem('vsit_staff_users', JSON.stringify(initialStaff));
    }
  }, []);

  // Save to Local Storage whenever staff list updates (Ensures Login page stays updated)
  useEffect(() => {
    if (staffList.length > 0) {
      localStorage.setItem('vsit_staff_users', JSON.stringify(staffList));
    }
  }, [staffList]);

  // --- ACTIONS ---

  const handleToggleStatus = (empId: string) => {
    setStaffList(staffList.map(staff => staff.empId === empId ? { ...staff, isActive: !staff.isActive } : staff));
  };

  const handleDeleteStaff = (empId: string) => {
    if (window.confirm("Are you sure you want to delete this user? They will no longer be able to log in.")) {
      setStaffList(staffList.filter(staff => staff.empId !== empId));
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({ isActive: true, department: 'IT Department' }); // defaults
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: Staff) => {
    setFormData(staff);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && formData.empId) {
      setStaffList(staffList.map(s => s.empId === formData.empId ? formData as Staff : s));
    } else {
      // Generate new EMP ID
      const newId = `EMP-${Math.floor(Math.random() * 900) + 100}`;
      const newStaff = { ...formData, empId: newId } as Staff;
      setStaffList([newStaff, ...staffList]);
    }
    setIsModalOpen(false);
  };

  // Download Mock CSV
  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Email,Password,Phone,Department,DateOfBirth,JoiningDate\nJane Smith,jane@vsit.com,pass123,1234567890,Accounts,1995-01-01,2023-01-01";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Staff_Bulk_Upload_Sample.csv");
    document.body.appendChild(link);
    link.click();
  };

  // Filter Search
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" /> Staff & Users
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage employees, credentials, statuses, and assigned assets.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all">
            <UploadCloud size={18}/> Bulk Upload
          </button>
          <button onClick={handleOpenAdd} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm rounded-xl transition-all">
            <Plus size={18}/> Add Staff
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search Name, ID, or Email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-black">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Department & Dates</th>
                <th className="p-4">Assigned Assets</th>
                <th className="p-4 text-center">Login Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staff) => {
                const assignedAssets = assets.filter(a => a.assignedToEmpId === staff.empId);
                return (
                  <tr key={staff.empId} className={`transition-colors ${staff.isActive ? 'hover:bg-gray-50/50' : 'bg-gray-50/50 opacity-75'}`}>
                    
                    {/* Name & ID */}
                    <td className="p-4 pl-6">
                      <Link href={`/admin/staff/${staff.empId}`} className={`font-bold hover:underline inline-flex items-center gap-2 ${staff.isActive ? 'text-blue-600 hover:text-blue-800' : 'text-gray-500'}`}>
                        <UserCheck size={16} className={staff.isActive ? "text-blue-400" : "text-gray-400"} /> {staff.name}
                      </Link>
                      <br/>
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1 inline-block">{staff.empId}</span>
                    </td>

                    {/* Contact Info */}
                    <td className="p-4">
                      <div className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-1"><Mail size={12} className="text-gray-400"/> {staff.email}</div>
                      <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Phone size={12} className="text-gray-400"/> {staff.phone}</div>
                    </td>

                    {/* Dept & Dates */}
                    <td className="p-4">
                      <div className="text-sm font-black text-gray-700">{staff.department}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Joined: {staff.joiningDate}</div>
                    </td>

                    {/* Assigned Assets */}
                    <td className="p-4">
                      {assignedAssets.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {assignedAssets.map(asset => (
                            <Link key={asset.id} href={`/admin/assets/${asset.id}`} className="text-xs font-bold text-gray-700 hover:text-blue-600 hover:underline inline-flex items-center gap-1 w-fit"><Package size={12} className="text-gray-400"/> {asset.name} ({asset.tagId})</Link>
                          ))}
                        </div>
                      ) : <span className="text-xs text-gray-400 font-medium">No assets assigned</span>}
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleStatus(staff.empId)} title={staff.isActive ? "Disable Login" : "Enable Login"} className={`px-3 py-1 text-[11px] font-black rounded-lg uppercase tracking-wide inline-flex items-center gap-1 transition-all ${staff.isActive ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}>
                        <Power size={12} /> {staff.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(staff)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteStaff(staff.empId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* ADD / EDIT STAFF MODAL                    */}
      {/* ========================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  {isEditing ? <Edit size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>} 
                  {isEditing ? 'Edit Staff Details' : 'Create Staff Profile'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <form onSubmit={handleSaveStaff} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                
                {/* Profile Details */}
                <h3 className="text-sm font-black text-gray-800 border-b pb-2">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                    <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
                    <input type="tel" required value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date of Birth</label>
                    <input type="date" required value={formData.dob || ''} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Joining Date</label>
                    <input type="date" required value={formData.joiningDate || ''} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                </div>

                {/* Account & Login */}
                <h3 className="text-sm font-black text-gray-800 border-b pb-2 pt-2">Account & Login</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Department</label>
                    <select required value={formData.department || ''} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium">
                      <option value="">Select Department...</option>
                      <option value="IT Department">IT Department</option>
                      <option value="Migrations">Migrations</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Edu Calling">Edu Calling</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-8">
                    <input type="checkbox" id="statusToggle" checked={formData.isActive || false} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"/>
                    <label htmlFor="statusToggle" className="ml-2 text-sm font-bold text-gray-700 cursor-pointer">Account is Active (Can Login)</label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Mail size={14}/> Login Email</label>
                    <input type="email" required placeholder="name@vsit.com" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Lock size={14}/> Login Password</label>
                    <input type="text" required placeholder="Assign a secure password" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"/>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl transition-all">
                    {isEditing ? 'Save Changes' : 'Create Staff Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* BULK UPLOAD STAFF MODAL                   */}
      {/* ========================================= */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2"><UploadCloud size={20} className="text-blue-600"/> Bulk Upload Staff</h2>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Download Format Section */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <h3 className="text-sm font-black text-blue-900 mb-1">Need the correct format?</h3>
                  <p className="text-xs text-blue-700 font-medium mb-3">Download the template, fill in your staff details, and upload it below.</p>
                  <button onClick={handleDownloadSample} className="px-4 py-2 bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded-xl shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center gap-2">
                    <Download size={14}/> Download Sample CSV
                  </button>
                </div>

                {/* Upload Section */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload CSV File</label>
                  <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-2xl p-8 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
                    <UploadCloud size={32} className="text-gray-400 mb-2"/>
                    <span className="text-sm font-bold text-gray-600">Click or drag file to upload</span>
                    <span className="text-xs text-gray-400 font-medium mt-1">.CSV files only</span>
                    <input type="file" accept=".csv" className="hidden" />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl">Cancel</button>
                  <button onClick={() => { alert("Bulk Upload Successful!"); setIsBulkModalOpen(false); }} className="flex-1 px-4 py-3 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl">Process Upload</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
