'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([])

  useEffect(() => {
    async function fetchInspections() {
      const { data } = await supabase
        .from('inspections')
        .select('*, assets(name, asset_tag), staff(name)')
        .order('inspection_date', { ascending: false })
      
      if (data) setInspections(data)
    }
    fetchInspections()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inspection Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspections.map(insp => (
          <div key={insp.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-900">{insp.assets?.name}</h3>
                <p className="text-sm text-gray-500">{insp.assets?.asset_tag}</p>
              </div>
              {insp.working_status ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-500" />
              )}
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>Staff:</strong> {insp.staff?.name}</p>
              <p><strong>Date:</strong> {format(new Date(insp.inspection_date), 'PPP')}</p>
              <p><strong>Condition:</strong> {insp.condition}</p>
              <p><strong>Location:</strong> {insp.location}</p>
              <p><strong>Notes:</strong> {insp.notes || 'None'}</p>
            </div>

            {insp.photo_urls && insp.photo_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {insp.photo_urls.map((url: string, idx: number) => (
                  <img key={idx} src={url} alt="Asset" className="w-16 h-16 object-cover rounded-md border" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
