'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, FileCheck, Keyboard, MonitorPlay, CheckCircle2, XCircle, 
  LayoutDashboard, UserPlus, CalendarDays, UserCheck, UserX, BarChart3,
  Search, Eye, Check, X, FileText, Star, Clock, GraduationCap, Briefcase, Loader2
} from 'lucide-react';

export default function HRAnalyticsPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [reviewModal, setReviewModal] = useState<any>(null);
  
  // 🌟 REAL DATABASE STATE
  const [applicants, setApplicants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // 🌟 THEME SYNC
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  // 🌟 REAL-TIME DATA FETCHING
  useEffect(() => {
    fetchApplicants();

    // Listen for live database changes (New Applicants, Status Updates)
    const channel = supabase.channel('realtime_hr_portal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        fetchApplicants(); // Instantly refresh data on any change
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_tests' }, (payload) => {
        fetchApplicants(); // Refresh if someone finishes a typing test
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApplicants = async () => {
    try {
      // 1. Fetch profiles (excluding active staff)
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .neq('status', 'Active')
        .order('created_at', { ascending: false });

      if (profileErr) throw profileErr;

      // 2. Fetch typing test results to merge
      const { data: typingData } = await supabase.from('typing_tests').select('*');

      // 3. Merge data
      const mergedData = (profileData || []).map(app => {
        const test = typingData?.find(t => t.profile_id === app.id);
        return {
          ...app,
          wpm: test?.wpm || 0,
          acc: test?.accuracy || 0,
        };
      });

      setApplicants(mergedData);
    } catch (error) {
      console.error("Error fetching applicants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 SUPABASE STATUS UPDATE ENGINE
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state instantly for snappy UI
      setApplicants(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      setReviewModal(null);
    } catch (error: any) {
      alert("Error updating status: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const theme = {
    glassCard: isDarkMode ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)]' : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_8px_30px_rgba(31,38,135,0.07)]',
    glassItem: isDarkMode ? 'bg-white/5 backdrop-blur-2xl border border-white/10' : 'bg-white/50 backdrop-blur-2xl border border-white/80',
    glassInner: isDarkMode ? 'bg-black/40 backdrop-blur-xl border border-white/5' : 'bg-white/80 backdrop-blur-xl border border-white/80',
    inputBg: isDarkMode ? 'bg-black/50 border border-white/20 text-white focus:border-blue-500 outline-none' : 'bg-white border border-slate-200 text-slate-900 focus:border-blue-500 outline-none shadow-sm',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  const sidebarLinks = [
    { name: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { name: 'New Activations', icon: <UserPlus size={16} /> },
    { name: 'Applicants', icon: <Users size={16} /> },
    { name: 'Demo Assignments', icon: <MonitorPlay size={16} /> },
    { name: 'Scheduled Interviews', icon: <CalendarDays size={16} /> },
    { name: 'Selected Candidates', icon: <UserCheck size={16} /> },
    { name: 'Rejected Candidates', icon: <UserX size={16} /> },
    { name: 'Reports', icon: <BarChart3 size={16} /> },
  ];

  // 🌟 DYNAMIC PIPELINE FILTERS
  const pendingApplicants = applicants.filter(a => a.status === 'Pending Review' || a.status === 'Profile Incomplete' || !a.status);
  const approvedApplicants = applicants.filter(a => a.status === 'Approved');
  const demoApplicants = applicants.filter(a => a.status === 'Demo Assigned' || a.status === 'Demo Submitted');
  const selectedApplicants = applicants.filter(a => a.status === 'Selected');
  const rejectedApplicants = applicants.filter(a => a.status === 'Rejected');

  // Dashboard Stats Calculations
  const avgWpm = applicants.length > 0 ? Math.round(applicants.reduce((acc, curr) => acc + curr.wpm, 0) / applicants.length) : 0;
  const verifiedCount = applicants.filter(a => a.contact_no || a.whatsapp_number).length;
  const testDoneCount = applicants.filter(a => a.wpm > 0).length;

  // Active Tab Data Router
  const getActiveTabList = () => {
    switch(activeTab) {
      case 'New Activations': return pendingApplicants;
      case 'Applicants': return approvedApplicants;
      case 'Demo Assignments': return demoApplicants;
      case 'Selected Candidates': return selectedApplicants;
      case 'Rejected Candidates': return rejectedApplicants;
      default: return [];
    }
  };

  return (
    // 🌟 FIX: `items-start` ensures the sidebar and main content align perfectly at the top
    <div className="min-h-[85vh] relative z-10 w-full flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
      
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* 🌟 COMPACT HR SIDEBAR */}
      <aside className={`w-full md:w-56 shrink-0 flex md:flex-col gap-1.5 ${theme.glassCard} rounded-3xl p-3 md:p-4 md:sticky md:top-20 overflow-x-auto custom-scrollbar`}>
        <div className="hidden md:block p-2 mb-2 border-b border-white/10">
          <h2 className={`text-[10px] font-black uppercase tracking-widest text-blue-500`}>HR Management</h2>
        </div>
        {sidebarLinks.map((link) => (
          <button
            key={link.name}
            onClick={() => setActiveTab(link.name)}
            className={`flex items-center gap-2.5 whitespace-nowrap md:whitespace-normal px-4 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === link.name 
                ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                : `${theme.textSub} hover:${theme.textMain} ${theme.glassItem} hover:border-blue-400`
            }`}
          >
            {link.icon} {link.name}
          </button>
        ))}
      </aside>

      {/* 🌟 MAIN CONTENT AREA */}
      <main className={`flex-1 w-full ${theme.glassCard} rounded-3xl p-5 md:p-8 flex flex-col min-w-0`}>
        
        {/* ====================================================
            TAB: DASHBOARD ANALYTICS (Compact Grid)
        ==================================================== */}
        {activeTab === 'Dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-white/20 pb-4">
              <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${theme.textMain}`}>Recruitment Analytics</h1>
              <p className={`text-[11px] md:text-xs font-semibold mt-1 ${theme.textSub}`}>Live overview of the applicant conversion funnel.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Total Applicants', count: applicants.length, icon: <Users size={20}/>, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { title: 'Verified Profiles', count: verifiedCount, icon: <CheckCircle2 size={20}/>, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { title: 'Typing Tests Done', count: testDoneCount, icon: <Keyboard size={20}/>, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { title: 'Demos Assigned', count: demoApplicants.length, icon: <MonitorPlay size={20}/>, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { title: 'Selected (Hired)', count: selectedApplicants.length, icon: <UserCheck size={20}/>, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { title: 'Rejected', count: rejectedApplicants.length, icon: <XCircle size={20}/>, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              ].map((m, idx) => (
                <div key={idx} className={`p-4 rounded-3xl ${theme.glassItem} flex flex-col justify-center items-start relative overflow-hidden group`}>
                  <div className={`absolute -right-4 -bottom-4 opacity-10 group-hover:scale-150 transition-transform duration-500 ${m.color}`}>{m.icon}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>{m.icon}</div>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>{m.title}</p>
                  </div>
                  <p className={`text-2xl font-black ${theme.textMain}`}>{m.count}</p>
                </div>
              ))}
              
              <div className={`col-span-1 sm:col-span-2 p-5 rounded-3xl ${theme.glassInner} flex flex-col justify-center`}>
                <h3 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1 flex items-center gap-1.5`}><Keyboard size={14} className="text-blue-500"/> Average Typing Speed</h3>
                <div className="flex items-baseline gap-1"><span className={`text-4xl font-black ${theme.textMain}`}>{avgWpm}</span><span className={`text-[10px] font-bold ${theme.textSub} mb-1`}>WPM</span></div>
              </div>
              <div className={`col-span-1 sm:col-span-2 p-5 rounded-3xl ${theme.glassInner} flex flex-col justify-center`}>
                <h3 className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1 flex items-center gap-1.5`}><Clock size={14} className="text-orange-500"/> Avg. Completion Time</h3>
                <div className="flex items-baseline gap-1"><span className={`text-4xl font-black ${theme.textMain}`}>14</span><span className={`text-[10px] font-bold ${theme.textSub} mb-1`}>Mins</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            REUSABLE TABLE COMPONENT FOR PIPELINE TABS
        ==================================================== */}
        {['New Activations', 'Applicants', 'Demo Assignments', 'Selected Candidates', 'Rejected Candidates'].includes(activeTab) && (
          <div className="space-y-4 animate-in fade-in flex-1 flex flex-col">
            <div className="border-b border-white/20 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${theme.textMain}`}>{activeTab}</h1>
                <p className={`text-[11px] md:text-xs font-semibold mt-1 ${theme.textSub}`}>Manage applicants in this pipeline stage.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSub}`} />
                <input type="text" placeholder="Search by name or number..." className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs ${theme.inputBg}`} />
              </div>
            </div>

            <div className={`flex-1 rounded-3xl border ${isDarkMode ? 'border-white/10' : 'border-white/40'} overflow-hidden shadow-sm flex flex-col ${theme.glassInner}`}>
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center p-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className={`text-[9px] font-bold uppercase tracking-widest border-b ${isDarkMode ? 'bg-black/40 border-white/10 text-zinc-400' : 'bg-white/80 border-white/40 text-slate-500'}`}>
                      <tr>
                        <th className="p-4">Applicant Detail</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {getActiveTabList().map((app) => (
                        <tr key={app.id} className={`transition-colors ${theme.glassItem} hover:bg-white/10`}>
                          <td className="p-4">
                            <p className={`text-sm font-bold ${theme.textMain}`}>{app.name || app.full_name || 'Unnamed'}</p>
                            <p className={`text-[10px] font-semibold mt-0.5 ${theme.textSub}`}>Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className={`p-4 font-mono text-xs ${theme.textSub}`}>{app.whatsapp_number || app.contact_no || 'N/A'}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                              app.status === 'Selected' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              app.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              app.status === 'Approved' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                              app.status === 'Demo Assigned' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                              'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                            }`}>
                              {app.status || 'Pending'}
                            </span>
                          </td>
                          <td className="p-4 flex justify-end">
                            <button onClick={() => setReviewModal(app)} disabled={app.status === 'Profile Incomplete'} className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest border border-blue-500/20 transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1.5">
                              <Eye size={14} /> Review
                            </button>
                          </td>
                        </tr>
                      ))}
                      {getActiveTabList().length === 0 && (
                        <tr><td colSpan={4} className={`p-8 text-center text-xs font-semibold ${theme.textSub}`}>No applicants found in this stage.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ====================================================
          PROFILE REVIEW SCREEN MODAL (Full details & Dynamic Actions)
      ==================================================== */}
      {reviewModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 sm:p-4 pt-16 sm:pt-20 pb-10 bg-black/40 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className={`relative w-full max-w-4xl flex flex-col rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.3)] border overflow-hidden my-auto ${theme.glassCard}`}>
            
            {/* Header Sticky */}
            <div className={`px-6 py-5 border-b shrink-0 flex justify-between items-center sticky top-0 z-20 ${isDarkMode ? 'border-white/10 bg-zinc-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-xl`}>
               <div>
                  <h3 className={`text-xl md:text-2xl font-bold tracking-tight ${theme.textMain}`}>Profile Review</h3>
                  <p className={`text-[11px] md:text-xs font-bold mt-1 text-blue-500`}>{reviewModal.name || reviewModal.full_name} <span className="opacity-50 mx-1">|</span> {reviewModal.whatsapp_number || reviewModal.contact_no || reviewModal.personal_email}</p>
               </div>
               <button onClick={() => setReviewModal(null)} className={`p-2.5 rounded-full cursor-pointer transition-colors border hover:bg-rose-500 hover:text-white ${theme.glassItem} ${theme.textMain}`}><X size={16}/></button>
            </div>

            {/* Scrollable Body */}
            <div className="px-6 py-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 bg-white/30 dark:bg-black/20">
              
              {/* 🌟 1. APPLICANT FILLED DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-5 rounded-3xl ${theme.glassItem}`}>
                  <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${theme.textSub}`}><GraduationCap size={14}/> Education</h4>
                  <p className={`text-sm font-bold ${theme.textMain}`}>{reviewModal.academic_qualifications || 'No academic info provided.'}</p>
                  <p className={`text-[10px] font-semibold mt-1 ${theme.textSub}`}>{reviewModal.professional_qualifications}</p>
                </div>
                <div className={`p-5 rounded-3xl ${theme.glassItem}`}>
                  <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 ${theme.textSub}`}><Briefcase size={14}/> Work Experience</h4>
                  <p className={`text-sm font-bold ${theme.textMain}`}>{reviewModal.experience || 'Fresher / Not specified'}</p>
                  <p className={`text-xs font-medium mt-0.5 ${theme.textSub}`}>{reviewModal.last_job_detail}</p>
                  <p className={`text-[10px] font-bold text-emerald-500 mt-2`}>Expected: {reviewModal.salary_expectation}</p>
                </div>
              </div>

              {/* 🌟 2. PERFORMANCE & RESUME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border-l-4 border-l-blue-500 shadow-sm border border-white/20`}>
                  <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${theme.textSub}`}>Typing Test Result</h4>
                  <div className="flex gap-8">
                    <div>
                      <p className={`text-[10px] font-semibold ${theme.textSub} mb-0.5`}>Speed</p>
                      <p className="text-3xl font-black text-blue-500">{reviewModal.wpm || 0} <span className="text-xs">WPM</span></p>
                    </div>
                    <div>
                      <p className={`text-[10px] font-semibold ${theme.textSub} mb-0.5`}>Accuracy</p>
                      <p className="text-3xl font-black text-emerald-500">{reviewModal.acc || 0}%</p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-3xl bg-white/80 dark:bg-zinc-900/80 border border-white/20 shadow-sm flex flex-col justify-center`}>
                  <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${theme.textSub}`}>Resume Document</h4>
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-sm font-bold truncate pr-4 ${theme.textMain}`}>{reviewModal.resume_url ? 'Applicant_Resume.pdf' : 'No Resume Uploaded'}</p>
                    {reviewModal.resume_url && (
                      <button onClick={() => window.open(reviewModal.resume_url, '_blank')} className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer shrink-0">
                        View PDF
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 🌟 3. HR INTERNAL NOTES */}
              <div className={`p-6 rounded-3xl border border-orange-500/30 bg-orange-500/5`}>
                <h3 className={`text-[11px] font-bold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-1.5`}><FileText size={16} /> HR Internal Review Notes</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Candidate Rating</label>
                      <select className={`w-full p-3 rounded-2xl text-xs font-bold appearance-none border border-orange-500/20 bg-white/50 dark:bg-black/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30`}>
                        <option value="Strong" className="bg-slate-800 text-white">⭐⭐⭐ Strong Candidate</option>
                        <option value="Average" className="bg-slate-800 text-white">⭐⭐ Average Candidate</option>
                        <option value="Weak" className="bg-slate-800 text-white">⭐ Needs Improvement</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Key Observation</label>
                      <input type="text" placeholder="e.g. Good Communication" className={`w-full p-3 rounded-2xl text-xs border border-orange-500/20 bg-white/50 dark:bg-black/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30`} />
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain}`}>Detailed Notes</label>
                    <textarea placeholder="Write internal HR assessment here. This is hidden from the applicant..." className={`w-full p-4 rounded-2xl text-xs resize-none h-20 border border-orange-500/20 bg-white/50 dark:bg-black/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/30`} />
                  </div>
                </div>
              </div>
            </div>

            {/* 🌟 4. DYNAMIC FOOTER ACTIONS (Changes based on status) */}
            <div className={`px-6 py-4 border-t shrink-0 flex flex-wrap sm:flex-nowrap gap-3 sticky bottom-0 z-20 ${isDarkMode ? 'border-white/10 bg-zinc-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-xl`}>
              
              {/* Everyone can be rejected unless already rejected */}
              {reviewModal.status !== 'Rejected' && (
                <button onClick={() => handleStatusUpdate(reviewModal.id, 'Rejected')} disabled={isUpdating} className="flex-1 min-w-[120px] py-3.5 text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all border border-rose-500/20 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50">
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Reject
                </button>
              )}

              {/* If New / Pending -> Allow Approve */}
              {(reviewModal.status === 'Pending Review' || !reviewModal.status) && (
                <button onClick={() => handleStatusUpdate(reviewModal.id, 'Approved')} disabled={isUpdating} className="flex-1 min-w-[120px] py-3.5 text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all border border-blue-500/20 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50">
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve Profile
                </button>
              )}

              {/* If Approved -> Allow Assign Demo */}
              {reviewModal.status === 'Approved' && (
                <button onClick={() => handleStatusUpdate(reviewModal.id, 'Demo Assigned')} disabled={isUpdating} className="flex-1 min-w-[120px] py-3.5 text-purple-500 bg-purple-500/10 hover:bg-purple-500 hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all border border-purple-500/20 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50">
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />} Assign Demo
                </button>
              )}

              {/* If Demo Assigned/Submitted -> Allow Select */}
              {(reviewModal.status === 'Demo Assigned' || reviewModal.status === 'Demo Submitted' || reviewModal.status === 'Approved') && (
                <button onClick={() => handleStatusUpdate(reviewModal.id, 'Selected')} disabled={isUpdating} className="flex-1 min-w-[120px] py-3.5 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all border border-emerald-500/20 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50">
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Mark as Selected
                </button>
              )}
              
            </div>

          </div>
        </div>
      )}
    </div>
  );
}