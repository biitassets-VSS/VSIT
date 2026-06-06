'use client'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AssetCategoryPie({ data }: { data: any[] }) {
  return (
    <div className="h-72 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-700 mb-4">Assets by Category</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Add similar exports for BarChart (Monthly Assignments), AreaChart (Asset Value Summary), etc.
