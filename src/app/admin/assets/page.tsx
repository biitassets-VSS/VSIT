'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Server, CheckCircle, AlertCircle } from 'lucide-react'

const CATEGORIES = [
  "Laptop", "Headphone", "Laptop Stand", "Keyboards", 
  "Wireless Keyboard with Mouse Kit", "USB Mouse", "USB Keyboard", 
  "USB Keyboard with Mouse Kit", "Mobile", "Cleaning Kits", 
  "Usb Ext. Hub", "Type C Port Ext Hub", "Other"
]

export default function AdminAssets() {
  const [assets, setAssets] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    asset_tag: '', description: '', category: 'Laptop', serial_number: '',
    condition: 'New', warranty_details: '', last_inspection_date: '',
    next_inspection_date: '', notes: ''
  })

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select(`*, profiles(full_name)`).order('created_at', { ascending: false })
    if (data) setAssets(data)
  }

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // In Step 3 we will add the Image Upload to Supabase Storage, for now we save the text data
    const { error } = await supabase.from('assets').insert([formData])

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Asset added successfully!')
      setShowForm(false)
      fetchAssets() // Refresh list
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">IT Assets Inventory</h1>
            <p className="text-gray-500">Manage, track, and inspect all company assets.</p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'Add New Asset'}
          </button>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> {message}
          </div>
        )}

        {/* Add Asset Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-xl font-bold mb-4">Add Tracking Detail</h2>
            <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div><label className="block text-sm font-medium mb-1">Asset Tag *</label>
              <input required type="text" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, asset_tag: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Category *</label>
              <select className="w-full p-2 border rounded" onChange={e => setFormData({...formData, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>

              <div><label className="block text-sm font-medium mb-1">Serial Number</label>
              <input type="text" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, serial_number: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Condition</label>
              <select className="w-full p-2 border rounded" onChange={e => setFormData({...formData, condition: e.target.value})}>
                <option>New</option><option>Refurbished</option><option>Damaged</option>
              </select></div>

              <div><label className="block text-sm font-medium mb-1">Warranty Details</label>
              <input type="text" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, warranty_details: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Last Inspection Date</label>
              <input type="date" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, last_inspection_date: e.target.value})} /></div>

              <div><label className="block text-sm font-medium mb-1">Next Inspection Due</label>
              <input type="date" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, next_inspection_date: e.target.value})} /></div>

              <div className="lg:col-span-2"><label className="block text-sm font-medium mb-1">Description / Notes</label>
              <input type="text" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, description: e.target.value})} /></div>

              {/* Photo Upload Placeholder (We will connect this to Supabase Storage in Step 3) */}
              <div><label className="block text-sm font-medium mb-1">Upload Photo</label>
              <input type="file" accept="image/*" className="w-full p-2 border rounded" /></div>

              <div className="lg:col-span-3 mt-4">
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">
                  {loading ? 'Saving...' : 'Save Asset Details'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Assets List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                <th className="p-4">Asset Tag</th>
                <th className="p-4">Category</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Next Inspection</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{asset.asset_tag}</td>
                  <td className="p-4 text-gray-600">{asset.category}</td>
                  <td className="p-4 text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs ${asset.condition === 'New' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {asset.condition}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{asset.profiles?.full_name || 'Unassigned'}</td>
                  <td className="p-4">
                    {asset.next_inspection_date && new Date(asset.next_inspection_date) < new Date() ? (
                       <span className="text-red-600 flex items-center gap-1 text-sm font-medium"><AlertCircle className="w-4 h-4"/> Overdue</span>
                    ) : (
                       <span className="text-gray-600 text-sm">{asset.next_inspection_date || 'Not set'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No assets found. Click "Add New Asset" to begin.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
