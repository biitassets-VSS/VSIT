'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// 🚀 EASY TO UPDATE LISTS 🚀
// If you ever need to add a new department or role in the future, just add it right here!
const ROLES_LIST = [
  "Super Admin",
  "Staff Admin"
];

const DEPARTMENTS_LIST = [
  "Adelaide (Student Visa)",
  "Adelaide (Visitor Visa)",
  "Adelaide (PR Visa)",
  "Adelaide (Skill Assessment)",
  "Adelaide (Calling)",
  "Melbourne (Student Visa)",
  "Melbourne (Visitor Visa)",
  "Melbourne (Skill Assessment)",
  "Melbourne (Migration Admin)",
  "Migration (Accounts)",
  "Migration (Calling)",
  "Education (Accounts)",
  "Educations",
  "Admin Works",
  "Social Media",
  "Manager"
];

export default function AddNewStaffPage() {
  // State to hold form data
  const [formData, setFormData] = useState({
    name: '',
    empCode: '',
    dob: '',
    joiningDate: '',
    phone: '',
    role: ROLES_LIST[1], // Defaults to Staff Admin
    department: DEPARTMENTS_LIST[0], // Defaults to first item
    email: '',
    password: '',
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Staff Data Submitted:', formData);
    alert('Staff added successfully!');
  };

  // Reusable input classes for perfect visibility
  const inputClassName = "w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-purple-500 text-gray-900 bg-white outline-none transition-all shadow-sm font-medium";
  const labelClassName = "block text-sm font-bold text-gray-700 mb-1.5";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out] pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Staff</h1>
          <p className="text-sm text-gray-500">Create a new employee profile and generate login credentials.</p>
        </div>
        
        <Link 
          href="/admin/staff" 
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to List
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">1. Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClassName}>Staff Member Name *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. John Doe" className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Date of Birth (DOB)</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={inputClassName} />
            </div>
          </div>
        </div>

        {/* SECTION 2: WORK DETAILS */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">2. Work Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClassName}>Employee Code *</label>
              <input type="text" name="empCode" required value={formData.empCode} onChange={handleChange} placeholder="e.g. EMP-1042" className={inputClassName} />
            </div>
            <div>
              <label className={labelClassName}>Joining Date *</label>
              <input type="date" name="joiningDate" required value={formData.joiningDate} onChange={handleChange} className={inputClassName} />
            </div>

            {/* ROLE / DESIGNATION COMBO */}
            <div>
              <label className={labelClassName}>Role / Designation *</label>
              <select name="role" value={formData.role} onChange={handleChange} className={inputClassName}>
                {ROLES_LIST.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* DEPARTMENT COMBO */}
            <div>
              <label className={labelClassName}>Department *</label>
              <select name="department" value={formData.department} onChange={handleChange} className={inputClassName}>
                {DEPARTMENTS_LIST.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: LOGIN CREDENTIALS */}
        <div className="bg-purple-50/50 p-6 sm:p-8 rounded-2xl shadow-sm border border-purple-100">
          <div className="mb-6 pb-2 border-b border-purple-200">
            <h2 className="text-lg font-bold text-purple-900">3. Login Credentials</h2>
            <p className="text-sm text-purple-700">These credentials will be used by the staff member to log in to the portal.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-purple-900 mb-1.5">Email Address (Login ID) *</label>
              <input 
                type="email" 
                name="email" 
                required 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="staff@company.com" 
                className={inputClassName} 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-purple-900 mb-1.5">Account Password *</label>
              <input 
                type="password" 
                name="password" 
                required 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="••••••••" 
                className={inputClassName} 
              />
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link 
            href="/admin/staff"
            className="px-6 py-3 rounded-xl font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
          >
            Cancel
          </Link>
          <button 
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            Save Staff Member
          </button>
        </div>

      </form>

    </div>
  );
}
