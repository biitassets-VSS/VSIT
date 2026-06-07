'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Users, Laptop, Shield, Mail, Plus, X, UserX, UserCheck, AlertCircle, CheckCircle, Phone, Building, CalendarDays } from 'lucide-react'

export default function AdminStaff() {
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const emptyForm = { 
    full_name: '', 
    email: '', 
    password: '', 
    role: 'staff',
    department: '',
    phone: '',
    joining_date: ''
  }
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    fetchStaffDetails()
  }, [])

  const fetchStaffDetails = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email, role, status, department, phone, joining_date,
        assets ( id, asset_tag, category, status )
      `)
      .order('full_name', { ascending: true })

    if (data) setStaffList(data)
    setLoading(false)
  }

  // Toggle Active/Deactive Status
  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Deactivated' : 'Active'
    
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: `Failed to update status: ${error.message}` })
    } else {
      setMessage({ type: 'success', text: `User has been ${newStatus.toLowerCase()}!` })
      fetchStaffDetails() 
    }
  }

  // Add New Staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setMessage({ type: '', text: '' })

    // Create the user and pass ALL extra data into 'options.data'
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          role: formData.role,
          department: formData.department,
          phone: formData.phone,
          joining_date: formData.joining_date
        }
      }
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Staff member added successfully!' })
      setFormData(emptyForm)
      setShowForm(false)
      fetchStaffDetails()
    }
    setFormLoading(false)
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
            <p className="text-gray-500 mt-1">View, add, and manage users and their assigned assets.</p>
          </div>
          <button 
            onClick={() => { setShowForm(!showForm); setMessage({ type: '', text: '' }) }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {showForm ? <><X className="w-5 h-5"/> Cancel</> : <><Plus className="w-5 h-5" /> Add Staff</>}
          </button>
        </div>

        {/* Message Alert Box */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Add Staff Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-xl font-bold mb-4">Register New Staff Member</h2>
            <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div><label className="block text-sm font-medium mb-1">Full Name *</label>
              <input required type="text" className="w-full p-2 border rounded" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Email Address *</label>
              <input required type="email" className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Temporary Password *</label>
              <input required type="password" minLength={6} className="w-full p-2 border rounded" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Department</label>
              <input type="text" placeholder="e.g. IT, HR, Sales" className="w-full p-2 border rounded" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Phone No</label>
              <input type="tel" className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Joining Date</label>
              <input type="date" className="w-full p-2 border rounded text-gray-700" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Role *</label>
              <select className="w-full p-2 border rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select></div>

              <div className="md:col-span-3 mt-4">
                <button type="submit" disabled={formLoading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 w-full md:w-auto">
                  {formLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Staff List */}
        {loading ? (
          <div className="text-gray-500 flex items-center gap-2">Loading staff data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.map((staff) => (
              <div key={staff.id} className={`bg-white rounded-2xl p-6 shadow-sm border transition relative flex flex-col h-full ${staff.status === 'Deactivated' ? 'border-red-200 opacity-80 bg-gray-50' : 'border-gray-100 hover:shadow-md'}`}>
                
                {/* Active/Deactive Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${staff.status === 'Deactivated' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        <span className={`w-2 h-2 rounded-full ${staff.status === 'Deactivated' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        {staff.status || 'Active'}
                    </span>
                </div>

                {/* User Info */}
                <div className="mb-4 pr-20">
                  <h2 className="text-xl font-bold text-gray-900">
                    {staff.full_name || 'Unnamed User'}
                  </h2>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {staff.email}
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {staff.phone}
                      </div>
                    )}
                    {staff.department && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Building className="w-4 h-4 text-gray-400" />
                        {staff.department}
                      </div>
                    )}
                    {staff.joining_date && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        Joined {new Date(staff.joining_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 ${
                        staff.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                        {staff.role === 'admin' && <Shield className="w-3 h-3" />}
                        {staff.role?.toUpperCase() || 'STAFF'}
                    </span>
                  </div>
                </div>

                <hr className="my-4 border-gray-100" />

                {/* Assigned Assets Section */}
                <div className="flex-grow mb-4">
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

                {/* Action Buttons */}
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => toggleStatus(staff.id, staff.status || 'Active')}
                        className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded transition ${
                            staff.status === 'Deactivated' 
                            ? 'text-green-700 bg-green-50 hover:bg-green-100' 
                            : 'text-red-700 bg-red-50 hover:bg-red-100'
                        }`}
                    >
                        {staff.status === 'Deactivated' ? <><UserCheck className="w-4 h-4" /> Reactivate</> : <><UserX className="w-4 h-4" /> Deactivate</>}
                    </button>
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
