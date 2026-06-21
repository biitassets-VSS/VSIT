'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, ClipboardList, AlertCircle, Clock } from 'lucide-react';

export default function MyInspectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inspectionLogs, setInspectionLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const userEmail = user.email || 'students_app05@outlook.com';

        const [assetsRes, inspectionsRes] = await Promise.all([
          supabase.from('assets').select('*'),
          supabase.from('inspections').select('*')
        ]);

        if (assetsRes.data) {
          const userAssets = assetsRes.data.filter((a: any) => 
            JSON.stringify(a).toLowerCase().includes(userEmail.toLowerCase())
          );

          const compiledLogs = userAssets.map(asset => {
            const assetInsps = inspectionsRes.data 
              ? inspectionsRes.data.filter((i: any) => String(i.asset_id) === String(asset.id))
              : [];
            
            const latestInsp = assetInsps[0];

            const lastInspDate = asset.last_inspection_date || latestInsp?.created_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const upcomingInspDate = asset.upcoming_inspection_date || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

            const isOverdue = new Date(upcomingInspDate).getTime() < Date.now();
            let finalStatus = asset.inspection_status || latestInsp?.status || 'Pending';

            if (asset.status?.toUpperCase() === 'WAITING') {
              finalStatus = 'Sent for Approval';
            } else if (isOverdue && finalStatus !== 'Sent for Approval' && finalStatus !== 'Passed') {
              finalStatus = 'Overdue';
            }

            return {
              ...asset,
              finalStatus,
              lastInspDate,
              upcomingInspDate,
              isOverdue
            };
          });

          setInspectionLogs(compiledLogs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('approve') || s.includes('sent')) {
      return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">Sent for Approval</span>;
    }
    if (s.includes('pass') || s.includes('approved')) {
      return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">Passed</span>;
    }
    if (s.includes('fail') || s.includes('re-request')) {
      return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 font-extrabold">Failed (Re-Request)</span>;
    }
    return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white border border-rose-700 animate-pulse">Overdue</span>;
  };

  if (loading) return <div className="w-full h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 font-sans">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        <button onClick={() => router.push('/staff')} className="p-2.5 hover:bg-gray-50 rounded-xl border border-gray-100 text-gray-600">
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-base font-black text-[#002B49] uppercase tracking-wide">MY INSPECTION RECORDS</h1>
          <p className="text-[11px] text-gray-400 font-bold mt-0.5">Historical verification logs and upcoming mandatory compliance tracks</p>
        </div>
      </div>

      {/* LOG RECORDS MATRIX */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/40 flex items-center gap-2">
          <ClipboardList size={16} className="text-orange-500" />
          <h3 className="text-xs font-black uppercase text-gray-900 tracking-wider">Device Compliance Inventory Logs</h3>
        </div>
        <div className="p-6 space-y-4">
          {inspectionLogs.length === 0 ? (
            <p className="text-xs font-bold text-gray-400 text-center py-8">No assigned hardware inspection tracks found.</p>
          ) : (
            inspectionLogs.map((log) => (
              <div key={log.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">{log.asset_name || log.name}</h4>
                    <p className="text-[10px] font-mono font-bold text-gray-400 mt-0.5">S/N: {log.serial_number || log.serial || 'N/A'}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={12}/> Last Check: {new Date(log.logInspDate || log.lastInspDate).toLocaleDateString()}</span>
                    <span className={log.finalStatus === 'Overdue' ? 'text-red-600 flex items-center gap-1' : 'flex items-center gap-1'}>
                      <AlertCircle size={12}/> Next Due: {new Date(log.upcomingInspDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start md:self-center">
                  {getStatusBadge(log.finalStatus)}
                  {(log.finalStatus === 'Overdue' || log.finalStatus.includes('fail')) && (
                    <button 
                      onClick={() => router.push('/staff?open_inspection=true')}
                      className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all"
                    >
                      Inspect Now
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}