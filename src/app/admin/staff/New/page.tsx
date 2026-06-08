'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AddStaffPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Later, you will save this data to your database here
    alert('Staff Member successfully added! They can now log in.');
    router.push('/admin/staff'); // Redirects back to the staff list
  };

  // Shared classes for all inputs to ensure perfect readability (Same as Assets form!)
  const inputClasses = "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all";
  const labelClasses = "text-sm font-bold text-gray-700";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/staff" 
          className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Staff Member</h1>
          <p className="text-sm text-gray-500">Register a new employee and create their portal login credentials.</p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-8">
        
        {/* SECTION 1: Employee Information */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-5 border-b border-gray-100 pb-2">Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2 md:col-span-2">
              <label className={labelClasses}>Staff Member Full Name *</label>
              <input type="text" required placeholder="e.g. John Doe" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Employee Code *</label>
              <input type="text" required placeholder="e.g. EMP-1042" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Phone Number</label>
              <input type="tel" placeholder="e.g. +1 234 567 8900" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Department</label>
              <select required className={`${inputClasses} cursor-pointer`}>
                <option value="">Select Department...</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Joining Date</label>
              <input type="date" className={inputClasses} />
            </div>

          </div>
        </div>

        {/* SECTION 2: Portal Login Credentials */}
        <div>
          <div className="mb-5 border-b border-gray-100 pb-2 flex justify-between items-end">
            <h2 className="text-lg font-bold text-gray-900">Portal Login Credentials</h2>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Used for Staff Login</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className={labelClasses}>Email ID (Username) *</label>
              <input type="email" required placeholder="e.g. john@company.com" className={inputClasses} />
            </div>

            <div className="space-y-2">
              <label className={labelClasses}>Password *</label>
              <input type="password" required placeholder="Create a secure password" className={inputClasses} />
            </div>

            <div className="md:col-span-2 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600 flex items-start gap-2">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                The Email ID and Password entered above will be used by this staff member to log into their dedicated Staff Portal to view their assigned assets and sign inspection documents.
              </p>
            </div>

          </div>
        </div>

        {/* BUTTONS */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-end gap-4">
          <Link 
            href="/admin/staff"
            className="px-6 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </Link>
          <button 
            type="submit"
            className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
          >
            Save & Create Account
          </button>
        </div>

      </form>
    </div>
  );
}
