'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Laptop, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function StaffDashboard() {
  const [staffData, setStaffData] = useState<any>(null)
  const [assignedAssets, setAssignedAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      // 1. Get Logged in user Profile -> Staff Record
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staff } = await supabase.from('staff').select('*').eq('profile_id', user.id).single()
      setStaffData(staff)

      // 2. Get assets currently held by this staff member
      if (staff) {
        const { data: assets } = await supabase
          .from('assets')
          .select('id, name, asset_tag, category, brand')
          .eq('current_holder', staff.id)
        
        setAssignedAssets(assets || [])
      }
      setLoading(false)
    }
    loadDashboard()
  }, [])

  if (loading) return <div className="p-8">Loading your workspace...</div>

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {staffData?.name}</h1>
          <p className="text-gray-500">{staffData?.department} Dept • ID: {staffData?.emp_code}</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">
          {assignedAssets.length} Active Asset(s)
        </div>
      </header>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Assigned Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedAssets.length === 0 ? (
            <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
              No assets currently assigned to you.
            </div>
          ) : (
            assignedAssets.map(asset => (
              <div key={asset.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {asset.asset_tag}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 mb-1">{asset.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{asset.brand} • {asset.category}</p>
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                  <Link href={`/staff/inspections/new/${asset.id}`} 
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition text-sm">
                    Submit Weekly Inspection
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
