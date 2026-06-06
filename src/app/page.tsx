'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MonitorCheck, ShieldCheck, QrCode, Clock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center space-x-2">
          <MonitorCheck className="w-8 h-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Virtual Staffing Solution</h1>
        </div>
        <div className="space-x-4">
          <Link href="/login?role=staff" className="text-gray-600 hover:text-blue-600 font-medium">Staff Login</Link>
          <Link href="/login?role=admin" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition">Admin Login</Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="relative bg-gradient-to-br from-blue-900 via-indigo-800 to-purple-900 text-white py-32 overflow-hidden">
          <div className="container mx-auto px-8 relative z-10 text-center">
            <motion.h2 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-extrabold mb-6"
            >
              IT Assets Management System
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto"
            >
              Professional Asset Tracking Platform. Secure, real-time tracking for all your corporate hardware, assignments, and inspections.
            </motion.p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 container mx-auto px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <FeatureCard icon={<QrCode />} title="QR Management" desc="Instantly generate and scan asset tags." />
            <FeatureCard icon={<ShieldCheck />} title="Audit Trail" desc="Permanent historical records for compliance." />
            <FeatureCard icon={<Clock />} title="Inspections" desc="Automated alerts for weekly condition checks." />
            <FeatureCard icon={<MonitorCheck />} title="Assignments" desc="Track exactly who holds what device." />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center">
        <p>© AinodeArt 2026. All Rights Reserved.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500">{desc}</p>
    </div>
  )
}
