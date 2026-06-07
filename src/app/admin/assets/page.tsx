'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, CheckCircle, AlertCircle, Edit2, UserMinus, X } from 'lucide-react'

const CATEGORIES = [
  "Laptop", "Headphone", "Laptop Stand", "Keyboards", 
  "Wireless Keyboard with Mouse Kit", "USB Mouse", "USB Keyboard", 
  "USB Keyboard with Mouse Kit", "Mobile", "Cleaning Kits", 
  "Usb Ext. Hub", "Type C Port Ext Hub", "Other"
]

export default function AdminAssets() {
  const [assets, setAssets] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [editingId, setEditingId] = useState<string | null>(null)

  const emptyForm = {
    asset_tag: '', description: '', category: 'Laptop', serial_number: '',
    condition: 'New', status: 'Available', assigned_to: '', warranty_details: '', 
    last_inspection_date: '', next_inspection_date: '', notes: ''
  }
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    fetchAssets()
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'staff')
    if (data) setStaffList(data)
  }

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from('assets')
      .select(`*, profiles(full_name)`)
      .order('created_at', { ascending: false })
    
    if (error) {
      setMessage({ type: 'error', text: `Failed to load assets: ${error.message}` })
    } else if (data) {
      setAssets(data)
    }
  }

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    
    const payload = {
      ...formData,
      last_inspection_date: formData.last_inspection_date || null,
      next_inspection_date: formData.next_inspection_date || null,
      assigned_to: formData.assigned_to || null,
      status: formData.assigned_to ? 'Assigned' : formData.status
    }

    let error;

    if (editingId) {
      const { error: updateError } = await supabase.from('assets').update(payload).eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('assets').insert([payload])
      error = insertError
    }

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: editingId ? 'Asset updated!' : 'Asset added successfully!' })
      setShowForm(false)
      setEditingId(null)
      setFormData(emptyForm)
      fetchAssets()
    }
    setLoading(false)
  }

  const openEditForm = (asset: any) => {
    setEditingId(asset.id)
    setFormData({
      asset_tag: asset.asset_tag || '',
      description: asset.description || '',
      category: asset.category || 'Laptop',
      serial_number: asset.serial_number || '',
      condition: asset.condition || 'New',
      status: asset.status || 'Available',
      assigned_to: asset.assigned_to || '',
      warranty_details: asset.warranty_details || '',
      last_inspection_date: asset.last_inspection_date || '',
      next_inspection_date: asset.next_inspection_date || '',
      notes: asset.notes || ''
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUnassign = async (id: string) => {
    const { error } = await supabase.from('assets').update({ assigned_to: null, status: 'Available' }).eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Asset un-assigned successfully.' })
      fetchAssets()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IT Assets Inventory</h1>
            <p className="text-gray-500">Manage, track, edit, and assign assets.</p>
          </div>
          <button 
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setFormData(emptyForm)
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? <><X className="w-5 h-5"/> Cancel</> : <><Plus className="w-5 h-5" /> Add Asset</>}
          </button>
        </div>

        {/* Message Alert Box */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Dynamic Add / Edit Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Asset Details' : 'Add Tracking Detail'}</h2>
            <form onSubmit={handleSaveAsset} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div><label className="block text-sm font-medium mb-1">Asset Tag *</label>
              <input required type="text" className="w-full p-2 border rounded bg-gray-50" value={formData.asset_tag} onChange={e => setFormData({...formData, asset_tag: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Category *</label>
              <select className="w-full p-2 border rounded" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>

              <div><label className="block text-sm font-medium mb-1">Serial Number</label>
              <input type="text" className="w-full p-2 border rounded" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} /></div>

              {/* NEW: Description field separated */}
              <div className="lg:col-span-3"><label className="block text-sm font-medium mb-1">Asset Description</label>
              <input type="text" placeholder="E.g., Dell XPS 15 9510 Core i7..." className="w-full p-2 border rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Condition</label>
              <select className="w-full p-2 border rounded" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}>
                <option>New</option><option>Refurbished</option><option>Damaged</option>
              </select></div>

              <div><label className="block text-sm font-medium mb-1">Asset Status</label>
              <select className="w-full p-2 border rounded" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option>Available</option><option>Assigned</option><option>Maintenance</option><option>Retired</option>
              </select></div>

              <div><label className="block text-sm font-medium mb-1">Assign to Staff (Optional)</label>
              <select className="w-full p-2 border rounded" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                <option value="">-- Unassigned --</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.full_name || staff.email}</option>
                ))}
              </select></div>

              <div><label className="block text-sm font-medium mb-1">Warranty Details</label>
              <input type="text" className="w-full p-2 border rounded" value={formData.warranty_details} onChange={e => setFormData({...formData, warranty_details: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Last Inspection Date</label>
              <input type="date" className="w-full p-2 border rounded" value={formData.last_inspection_date} onChange={e => setFormData({...formData, last_inspection_date: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Next Inspection Due</label>
              <input type="date" className="w-full p-2 border rounded" value={formData.next_inspection_date} onChange={e => setFormData({...formData, next_inspection_date: e.target.value})} /></div>

              {/* NEW: Notes field separated */}
              <div className="lg:col-span-2"><label className="block text-sm font-medium mb-1">Internal Notes</label>
              <textarea rows={2} className="w-full p-2 border rounded" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Upload Photo</label>
              <input type="file" accept="image/*" className="w-full p-2 border rounded text-sm text-gray-500 bg-white" /></div>

              <div className="lg:col-span-3 mt-4">
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                  {loading ? 'Saving...' : editingId ? 'Update Asset' : 'Save New Asset'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assets List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                  <th className="p-4">Asset Tag</th>
                  <th className="p-4">Details & Description</th>
                  <th className="p-4">Status & Condition</th>
                  <th className="p-4">Assigned To</th>
                  <th className="p-4">Next Inspection</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{asset.asset_tag}</td>
                    <td className="p-4">
                      <div className="text-gray-900 font-medium">{asset.category}</div>
                      {asset.description && <div className="text-gray-600 text-xs mt-0.5 truncate max-w-xs">{asset.description}</div>}
                      <div className="text-gray-400 text-xs mt-0.5">SN: {asset.serial_number || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${asset.status === 'Available' ? 'bg-blue-100 text-blue-700' : asset.status === 'Assigned' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                          {asset.status}
                        </span>
                        <span className="text-xs text-gray-500">{asset.condition}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700 font-medium">
                      {asset.profiles?.full_name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="p-4">
                      {asset.next_inspection_date && new Date(asset.next_inspection_date) < new Date() ? (
                        <span className="text-red-600 flex items-center gap-1 text-sm font-bold"><AlertCircle className="w-4 h-4"/> Overdue</span>
                      ) : (
                        <span className="text-gray-600 text-sm">{asset.next_inspection_date || 'Not set'}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEditForm(asset)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        {asset.assigned_to && (
                          <button onClick={() => handleUnassign(asset.id)} className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-sm font-medium">
                            <UserMinus className="w-4 h-4" /> Unassign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No assets found. Click "Add Asset" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
