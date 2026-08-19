'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Package, User, Hash, Briefcase, Calendar, Loader2, CheckCircle2 } from 'lucide-react';

function PublicAssetContent() {
  const searchParams = useSearchParams();

  // Read data securely from the QR code URL parameters
  const tagId = searchParams.get('id') || 'Unknown Asset';
  const status = searchParams.get('status') || 'In Stock';
  const staffName = searchParams.get('staff') || 'Unassigned';
  const empCode = searchParams.get('emp') || 'N/A';
  const department = searchParams.get('dept') || 'N/A';
  const assignDate = searchParams.get('date') || 'N/A';

  const isAssigned = staffName.toLowerCase() !== 'unassigned' && !staffName.includes('Unknown');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans text-slate-800 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-3xl overflow-hidden relative z-10">
        
        {/* Header Header */}
        <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 -z-10" />
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
            <ShieldCheck size={32} className="text-orange-500" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">Asset Verification</h1>
          <p className="text-slate-400 text-xs font-semibold mt-1 tracking-widest uppercase">VSS IT Department</p>
        </div>

        {/* Info Content */}
        <div className="p-6 space-y-5">
          
          {/* Asset ID & Status */}
          <div className="bg-white/80 rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                <Package size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Asset Tag ID</p>
                <p className="text-sm font-black font-mono text-slate-900 mt-0.5">{tagId}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
             <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Current Status</p>
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                  status.toLowerCase().includes('assigned') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                  status.toLowerCase().includes('pending') ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                  'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  <CheckCircle2 size={14} /> {status}
                </span>
             </div>
          </div>

          {/* Assigned Staff Details */}
          <div className="border border-slate-200/60 rounded-2xl overflow-hidden bg-slate-50/50">
            <div className="px-4 py-3 border-b border-slate-200/60 bg-slate-100/50 flex items-center gap-2">
              <User size={14} className="text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700">Holder Information</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Hash size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Staff Member</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{staffName}</p>
                </div>
              </div>

              {isAssigned && (
                <>
                  <div className="flex items-start gap-3">
                    <Briefcase size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">EMP Code / Dept</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{empCode} <span className="text-slate-400 font-medium ml-1">| {department}</span></p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Last Verified Date</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">{assignDate}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100/80 px-6 py-4 text-center border-t border-slate-200/60">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Secure Digital Record • Virtual Staffing
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PublicAssetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>}>
      <PublicAssetContent />
    </Suspense>
  );
}