'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users, Search, Mail, Phone } from 'lucide-react'

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStaff() {
      const { data } = await supabase.from('staff').select('*').order('name', { ascending: true })
      if (data) setStaffList(data)
      setLoading(false)
    }
    fetchStaff()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Staff Directory</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading staff directory...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Department</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffList.map(staff => (
                <tr key={staff.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <p className="font-bold text-gray-900">{staff.name}</p>
                    <p className="text-xs text-gray-500">ID: {staff.emp_code}</p>
                  </td>
                  <td className="p-4 text-gray-600">{staff.department}</td>
                  <td className="p-4">
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Mail className="w-4 h-4 mr-2" /> {staff.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" /> {staff.contact_number || 'N/A'}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {staff.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
