'use client';

import React, { useState } from 'react';
import { 
  PieChart, BarChart3, Download, Printer, 
  Laptop, Tags, UserCheck, ShieldCheck, 
  PackageSearch, X, FileText 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data for the 5 requested reports
const reportData = {
  categories: {
    title: 'Total Stocks (Category Wise)',
    icon: <Laptop size={24} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    headers: ['Category', 'Total Items', 'In Stock', 'Assigned'],
    rows: [
      ['Laptops', '150', '45', '105'],
      ['Monitors', '80', '20', '60'],
      ['Keyboards', '200', '150', '50'],
      ['Mice', '250', '180', '70'],
    ],
    total: 680
  },
  staff: {
    title: 'Assigned to Staff',
    icon: <UserCheck size={24} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    headers: ['Staff Department', 'Total Employees', 'Assets Assigned'],
    rows: [
      ['Engineering', '45', '90'],
      ['Marketing', '20', '25'],
      ['Sales', '35', '40'],
      ['HR & Admin', '10', '12'],
    ],
    total: 167
  },
  brands: {
    title: 'Stock (Brand Wise)',
    icon: <Tags size={24} />,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    headers: ['Brand', 'Category', 'Total Count'],
    rows: [
      ['Apple', 'Laptops / Tablets', '85'],
      ['Dell', 'Laptops / Monitors', '120'],
      ['Lenovo', 'Laptops', '60'],
      ['Logitech', 'Accessories', '200'],
    ],
    total: 465
  },
  condition: {
    title: 'Condition (New vs Refurbished)',
    icon: <PackageSearch size={24} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    headers: ['Condition Status', 'Quantity', 'Percentage'],
    rows: [
      ['Brand New', '450', '66%'],
      ['Refurbished (Good)', '150', '22%'],
      ['Needs Repair', '50', '7%'],
      ['End of Life (Scrap)', '30', '5%'],
    ],
    total: 680
  },
  inspection: {
    title: 'Inspection Status Wise',
    icon: <ShieldCheck size={24} />,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    headers: ['Inspection Result', 'Asset Count', 'Action Required'],
    rows: [
      ['Passed', '520', 'None'],
      ['Pending Review', '45', 'Admin Approval Needed'],
      ['Needs Re-inspection', '12', 'Staff Action Needed'],
      ['Rejected / Repair', '23', 'Send to IT Support'],
    ],
    total: 600
  }
};

type ReportKey = keyof typeof reportData;

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportKey | null>(null);

  // Trigger browser's native print/save as PDF dialog
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 print:space-y-0">
      
      {/* HEADER - Hidden during print */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
        <h1 className="text-2xl font-black text-gray-900">System Reports & Analytics</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Generate insights on your inventory, staff assignments, and hardware health.</p>
      </div>

      {/* REPORT CARDS GRID - Hidden during print */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {(Object.keys(reportData) as ReportKey[]).map((key) => {
          const report = reportData[key];
          return (
            <div 
              key={key} 
              onClick={() => setSelectedReport(key)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-orange-500 hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between h-48"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.bg} ${report.color} group-hover:scale-110 transition-transform`}>
                  {report.icon}
                </div>
                <button className="text-gray-400 group-hover:text-orange-500 transition-colors">
                  <BarChart3 size={20} />
                </button>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{report.title}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">
                  Click to generate report <FileText size={14} />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* REPORT PREVIEW & PDF VIEW */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:static print:p-0 print:block">
            
            {/* Dark overlay - hidden in print */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedReport(null)} 
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm print:hidden" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:w-full"
            >
              
              {/* Modal Header - Action buttons hidden in print */}
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 print:bg-white print:border-b-2 print:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${reportData[selectedReport].bg} ${reportData[selectedReport].color} print:bg-transparent print:p-0`}>
                    {reportData[selectedReport].icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{reportData[selectedReport].title}</h2>
                    <p className="text-xs font-bold text-gray-500 print:text-gray-800">Generated on: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Print / Close Buttons */}
                <div className="flex items-center gap-3 print:hidden">
                  <button 
                    onClick={handleDownloadPDF} 
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-bold text-sm rounded-xl hover:bg-orange-700 shadow-sm transition-all"
                  >
                    <Printer size={16} /> Save as PDF
                  </button>
                  <button 
                    onClick={() => setSelectedReport(null)} 
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X size={20}/>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="p-6 overflow-y-auto print:overflow-visible print:p-2">
                
                <div className="border border-gray-200 rounded-2xl overflow-hidden print:border-gray-400">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                        {reportData[selectedReport].headers.map((header, index) => (
                          <th key={index} className="px-6 py-4 text-sm font-black text-gray-700 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                      {reportData[selectedReport].rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-6 py-4 text-sm font-medium text-gray-800">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Section */}
                <div className="mt-6 flex justify-end">
                  <div className="bg-gray-50 px-6 py-4 rounded-xl border border-gray-200 print:border-0 print:bg-transparent">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Monitored Count</p>
                    <p className="text-3xl font-black text-gray-900">{reportData[selectedReport].total}</p>
                  </div>
                </div>

              </div>
              
              {/* Print Footer Watermark (Only shows on PDF) */}
              <div className="hidden print:block text-center pt-8 text-xs font-bold text-gray-400">
                End of Report • Generated by Asset Management System
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
