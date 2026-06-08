'use client';

import React from 'react';
import Link from 'next/link';

export default function AddNewStaffPage() {
  return (
    <div className="w-full space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Staff</h1>
          <p className="text-sm text-gray-500">Create a new employee profile.</p>
        </div>
        
        <Link 
          href="/admin/staff" 
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Staff List
        </Link>
      </div>

      {/* FORM PLACEHOLDER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <p className="text-gray-500">Your Add Staff Form will go here...</p>
      </div>

    </div>
  );
}
