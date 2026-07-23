'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

export function AssignAssetModal({ assetId, onClose, onSuccess }: { assetId: string, onClose: () => void, onSuccess: () => void }) {
  const [staff, setStaff] = useState<any[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load active staff members
    const fetchStaff = async () => {
      const { data } = await supabase.from('staff').select('id, name, emp_code').eq('status', 'Active')
      if (data) setStaff(data)
    }
    fetchStaff()
  }, [])

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 1. Update Asset Status and Current Holder
      await supabase.from('assets')
        .update({ status: 'Assigned', current_holder: selectedStaff })
        .eq('id', assetId)

      // 2. Create Assignment Record
      await supabase.from('asset_assignments').insert([{
        asset_id: assetId,
        staff_id: selectedStaff,
        assigned_date: new Date().toISOString(),
        expected_return_date: expectedReturn || null,
        condition: 'Good'
      }])

      // 3. Write Permanent Audit History
      await supabase.from('asset_history').insert([{
        asset_id: assetId,
        staff_id: selectedStaff,
        action_type: 'ASSET_ASSIGNED',
        notes: `Asset assigned to staff ID: ${selectedStaff}`
      }])

      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      alert("Failed to assign asset.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold mb-4">Assign Asset</h3>
        
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff Member</label>
            <select required value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>Select Staff...</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.emp_code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date (Optional)</label>
            <input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500" />
          </div>
          
          <div className="pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {loading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
