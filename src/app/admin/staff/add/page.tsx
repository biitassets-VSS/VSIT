'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AddNewStaffPage() {
  // State to hold form data
  const [formData, setFormData] = useState({
    name: '',
    empCode: '',
    dob: '',
    joiningDate: '',
    email: '',
    password: '',
    phone: '',
    role: 'Teacher',
    department: 'Academic'
  });

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Staff Data Submitted:', formData);
    alert('Staff added successfully! (Check console for data)');
    // Later, you will add your API call here to save to your database
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Staff</h1>
          <p className="text-sm text-gray-500">Fill in the details to create a new employee profile.</p>
        </div>
        
        <Link 
          href="/admin/staff" 
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to List
        </Link>
      </div>

      {/* MAIN FORM */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Staff Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member Name *</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Emp Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code *</label>
              <input 
                type="text" 
                name="empCode"
                required
                value={formData.empCode}
                onChange={handleChange}
                placeholder="e.g. EMP-1042"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Email ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email ID *</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (DOB)</label>
              <input 
                type="date" 
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
              <input 
                type="date" 
                name="joiningDate"
                required
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* Role / Designation (Extra field) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role / Designation</label>
              <select 
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Teacher">Teacher</option>
                <option value="Support Staff">Support Staff</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Password *</label>
              <input 
                type="password" 
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
            <Link 
              href="/admin/staff"
              className="px-6 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-all"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              Save Staff Member
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
