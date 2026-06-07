'use client' // Required if you are using Next.js App Router to allow React hooks

import { ShieldCheck, Trash2, User } from 'lucide-react'
import { useState, useEffect } from 'react'
// ⚠️ IMPORTANT: Update this path to wherever your supabase client is configured!
// Example: import { supabase } from '@/lib/supabase' OR import { supabase } from '../../utils/supabase'
import { supabase } from "@/lib/supabaseClient";


export default function AdminDashboard() {
  const [staffList, setStaffList] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch staff when the page loads
  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      // Fetch users from your profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('joining_date', { ascending: false })

      if (error) throw error
      if (data) setStaffList(data)
    } catch (error) {
      console.error('Error fetching staff:', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // The Delete Function
  const handleDeleteStaff = async (staffId) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this staff member? This cannot be undone.")
    if (!isConfirmed) return

    try {
      const { error } = await supabase.rpc('delete_user', { user_id: staffId })
      if (error) throw error

      alert("Staff member deleted successfully!")
      
      // Remove the deleted staff member from the screen instantly
      setStaffList(staffList.filter(staff => staff.id !== staffId))

    } catch (error) {
      console.error("Error deleting staff:", error.message)
      alert("Failed to delete staff member.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, Administrator.</p>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900">Total Assets</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900">Active Staff</h3>
            {/* Dynamic Staff Count! */}
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {isLoading ? "..." : staffList.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900">Pending Requests</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
          </div>
        </div>

        {/* Staff List Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Staff Directory</h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <p className="text-gray-500 text-center py-4">Loading staff...</p>
            ) : staffList.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No staff members found.</p>
            ) : (
              <div className="space-y-4">
                {staffList.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    
                    {/* Staff Info */}
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{staff.full_name || staff.name || 'Unknown User'}</h4>
                        <p className="text-sm text-gray-500">{staff.email} • {staff.department || 'No Dept'}</p>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
