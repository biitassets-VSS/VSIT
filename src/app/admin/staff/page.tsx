'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users, Laptop, Shield, Mail } from 'lucide-react'

export default function AdminStaff() {
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStaffDetails()
  }, [])

  const fetchStaffDetails = async () => {
    setLoading(true)
    
    // We fetch all profiles and pull in any assets assigned to them!
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, 
        full_name, 
        email, 
        role,
        assets ( id, asset_tag, category, status )
      `)
      .order('full_name', { ascending: true })

    if (error) {
      setError(error.message)
    } else if (data) {
      setStaffList(data)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              Staff Directory
            </h1>
            <p className="text-gray-500 mt-1">View all users and their assigned IT assets.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        {/* Staff List */}
        {loading ? (
          <div className="text-gray-500 flex items-center gap-2">Loading staff data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.map((staff) => (
              <div key={staff.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition">
                
                {/* User Info */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {staff.full_name || 'Unnamed User'}
                    </h2>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                      <Mail className="w-4 h-4" />
                      {staff.email}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    staff.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {staff.role === 'admin' && <Shield className="w-3 h-3" />}
                    {staff.role?.toUpperCase() || 'STAFF'}
                  </span>
                </div>

                <hr className="my-4 border-gray-100" />

                {/* Assigned Assets Section */}
                <div className="flex-grow">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-gray-500" />
                    Assigned Assets ({staff.assets?.length || 0})
                  </h3>
                  
                  {staff.assets && staff.assets.length > 0 ? (
                    <ul className="space-y-2">
                      {staff.assets.map((asset: any) => (
                        <li key={asset.id} className="bg-gray-50 p-2 rounded border border-gray-100 text-sm flex justify-between items-center">
                          <span className="font-medium text-gray-700">{asset.category}</span>
                          <span className="text-gray-500 text-xs">{asset.asset_tag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded text-center">
                      No assets currently assigned.
                    </p>
                  )}
                </div>

              </div>
            ))}

            {staffList.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
                No users found in the system.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
