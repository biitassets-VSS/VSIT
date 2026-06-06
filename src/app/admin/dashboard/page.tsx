'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Laptop, CheckCircle, Wrench, Trash2, IndianRupee, Users } from 'lucide-react'
import { AssetCategoryPie } from '@/components/admin/Charts'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0, assigned: 0, repair: 0, disposed: 0, totalValue: 0, staff: 0
  })

  useEffect(() => {
    async function fetchStats() {
      // Fetch Assets
      const { data: assets } = await supabase.from('assets').select('status, purchase_price')
      // Fetch Staff
      const { count: staffCount } = await supabase.from('staff').select('*', { count: 'exact', head: true })

      if (assets) {
        const summary = assets.reduce((acc, asset) => {
          acc.total++
          if (asset.status === 'Assigned') acc.assigned++
          if (asset.status === 'Repair') acc.repair++
          if (asset.status === 'Disposed') acc.disposed++
          acc.totalValue += Number(asset.purchase_price || 0)
          return acc
        }, { total: 0, assigned: 0, repair: 0, disposed: 0, totalValue: 0 })

        setStats({ ...summary, staff: staffCount || 0 })
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      
      {/* Top Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Assets" value={stats.total} icon={Laptop} color="bg-blue-500" />
        <StatCard title="Assigned" value={stats.assigned} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="In Repair" value={stats.repair} icon={Wrench} color="bg-orange-500" />
        <StatCard title="Disposed" value={stats.disposed} icon={Trash2} color="bg-red-500" />
        <StatCard title="Total Value (INR)" value={`₹${stats.totalValue.toLocaleString()}`} icon={IndianRupee} color="bg-indigo-500" />
        <StatCard title="Staff Members" value={stats.staff} icon={Users} color="bg-purple-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Placeholder data for the Pie Chart component we created earlier */}
        <AssetCategoryPie data={[
          { name: 'Laptops', value: 45 },
          { name: 'Monitors', value: 30 },
          { name: 'Phones', value: 15 },
          { name: 'Accessories', value: 10 },
        ]} />
        
        {/* Add your other chart components here (Bar chart, Line chart) */}
        <div className="h-72 bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
           [ Monthly Assignments Bar Chart Component ]
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
      <div className={`${color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
    </div>
  )
}
