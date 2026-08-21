'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useApplicantStore } from '@/store/useApplicantStore';
import { 
  User, Briefcase, GraduationCap, FileText, ChevronRight, ChevronLeft, 
  Save, Upload, Loader2, Moon, Sun, CheckCircle2
} from 'lucide-react';

function generateSafeUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function NewJoinerProfileClient() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get active session phone number
  const { whatsappNumber, updateProgress } = useApplicantStore();
  const activePhone = whatsappNumber || (typeof window !== 'undefined' ? localStorage.getItem('vsit_applicant_token') : '') || '+91 9876543210';
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    marital_status: 'Single',
    personal_email: '',
    academic_degree: '',
    academic_institute: '',
    academic_year: '',
    prof_cert: '',
    prof_org: '',
    overall_exp: '',
    last_company: '',
    last_designation: '',
    last_salary: '',
    expected_salary: '',
    employment_period: ''
  });

  // 🌟 THEME SYNC
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vsit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vsit_theme', 'light');
    }
  };

  const theme = {
    bg: 'bg-transparent',
    glassCard: isDarkMode 
      ? 'bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6)]' 
      : 'bg-white/70 backdrop-blur-3xl border border-white/50 shadow-[0_16px_40px_rgba(31,38,135,0.07)]',
    glassItem: isDarkMode
      ? 'bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-300'
      : 'bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-300',
    inputBg: isDarkMode 
      ? 'bg-black/50 border border-white/20 text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all' 
      : 'bg-white/60 border border-slate-300 text-slate-900 placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-sm',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // 🌟 REAL SUPABASE DATABASE SUBMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Check if profile already exists for this phone number
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('whatsapp_number', activePhone)
        .single();

      // 2. Format the data to match your database columns
      const payload = {
        id: existingUser?.id || generateSafeUuid(), // Update if exists, otherwise create new
        full_name: formData.full_name,
        name: formData.full_name, // fallback for older columns
        whatsapp_number: activePhone,
        contact_no: activePhone,
        
        // 🌟 FIX: Save email to BOTH columns to satisfy the database constraint
        personal_email: formData.personal_email,
        email: formData.personal_email, 
        
        academic_qualifications: formData.academic_degree ? `${formData.academic_degree} from ${formData.academic_institute}` : null,
        professional_qualifications: formData.prof_cert ? `${formData.prof_cert} via ${formData.prof_org}` : null,
        experience: formData.overall_exp,
        salary_expectation: formData.expected_salary,
        last_job_detail: formData.last_company ? `${formData.last_designation} at ${formData.last_company}` : null,
        status: 'Pending Review',
        role: 'applicant', // Ensure they don't get staff privileges yet
        profile_completed_at: new Date().toISOString(),
        profile_completion_pct: 100
      };

      // 3. Upsert into database
      const { error } = await supabase.from('profiles').upsert([payload]);

      if (error) throw error;

      // 4. Update local state and show completion screen
      updateProgress(100);
      setCurrentStep(5);

    } catch (err: any) {
      alert("Failed to submit profile. Please try again. Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPct = ((currentStep - 1) / 4) * 100;

  if (currentStep === 5) {
    return (
      <div className="min-h-screen flex items-center justify-center relative p-4 pb-20 overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-500/20 blur-[100px] rounded-full pointer-events-none -z-10" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        <div className={`w-full max-w-md p-8 text-center rounded-4xl flex flex-col items-center gap-4 ${theme.glassCard} animate-in zoom-in-95`}>
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className={`text-2xl font-bold tracking-tight mt-2 ${theme.textMain}`}>Profile Under Review</h2>
          <p className={`text-sm font-medium ${theme.textSub}`}>Your application has been successfully submitted to HR. We will notify you once your Demo Task or Typing Test is unlocked.</p>
          
          <button onClick={() => window.location.href = '/dashboard'} className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white transition-colors cursor-pointer">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-500/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* 🌟 PREMIUM TOP NAVIGATION BAR */}
      <div className="w-full max-w-5xl mx-auto shrink-0 space-y-4 pt-6">
        <div className={`${theme.glassCard} rounded-4xl p-4 sm:p-5 flex items-center justify-between`}>
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textMain}`}>Applicant Onboarding</h1>
            <p className={`text-xs font-semibold mt-0.5 ${theme.textSub}`}>Complete your profile to proceed</p>
          </div>
          <button onClick={toggleTheme} className={`p-3 rounded-2xl ${theme.glassItem} ${theme.textSub} cursor-pointer hover:border-orange-400 transition-all active:scale-95`}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* PROGRESS BAR */}
        <div className={`${theme.glassCard} rounded-3xl p-5`}>
          <div className="flex justify-between items-end mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMain}`}>Completion Status</span>
            <span className="text-xs font-black text-orange-500">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-linear-to-r from-orange-500 to-purple-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* 🌟 MAIN FORM AREA */}
      <div className={`w-full max-w-5xl mx-auto ${theme.glassCard} rounded-4xl p-6 md:p-10 mt-6 flex-1 flex flex-col relative`}>
        
        {/* STEP 1: PERSONAL INFO */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in flex-1">
            <div className="border-b border-white/20 pb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><User className="text-orange-500" /> Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Full Name *</label>
                <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="As per official documents" />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textSub} drop-shadow-sm`}>WhatsApp Number (Verified)</label>
                <input type="text" readOnly value={activePhone} className={`w-full p-4 rounded-2xl text-sm font-mono outline-none opacity-70 cursor-not-allowed ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Date of Birth</label>
                <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Personal Email *</label>
                <input required type="email" value={formData.personal_email} onChange={e => setFormData({...formData, personal_email: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="applicant@gmail.com" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: QUALIFICATIONS */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 flex-1">
            <div className="border-b border-white/20 pb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><GraduationCap className="text-purple-500" /> Academic & Professional</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Highest Degree / Qualification</label>
                <input type="text" value={formData.academic_degree} onChange={e => setFormData({...formData, academic_degree: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="e.g. B.Tech Computer Science" />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Institute / University</label>
                <input type="text" value={formData.academic_institute} onChange={e => setFormData({...formData, academic_institute: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="University Name" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-white/10">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Professional Certification</label>
                <input type="text" value={formData.prof_cert} onChange={e => setFormData({...formData, prof_cert: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="e.g. AWS Solutions Architect" />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Certifying Organization</label>
                <input type="text" value={formData.prof_org} onChange={e => setFormData({...formData, prof_org: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="e.g. Amazon" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: WORK HISTORY */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 flex-1">
            <div className="border-b border-white/20 pb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><Briefcase className="text-orange-500" /> Work History</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Overall Experience</label>
                <input type="text" value={formData.overall_exp} onChange={e => setFormData({...formData, overall_exp: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="e.g. 3.5 Years" />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Expected Salary</label>
                <input type="text" value={formData.expected_salary} onChange={e => setFormData({...formData, expected_salary: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="₹ / Month or LPA" />
              </div>
              <div className="md:col-span-2">
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Last Company Name</label>
                <input type="text" value={formData.last_company} onChange={e => setFormData({...formData, last_company: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="e.g. Tech Solutions Ltd." />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Last Designation</label>
                <input type="text" value={formData.last_designation} onChange={e => setFormData({...formData, last_designation: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="e.g. Software Engineer" />
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${theme.textMain} drop-shadow-sm`}>Employment Period</label>
                <input type="text" value={formData.employment_period} onChange={e => setFormData({...formData, employment_period: e.target.value})} className={`w-full p-4 rounded-2xl text-sm outline-none ${theme.inputBg}`} placeholder="e.g. Jan 2021 - Present" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RESUME UPLOAD */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 flex-1">
            <div className="border-b border-white/20 pb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><FileText className="text-purple-500" /> Resume / CV</h3>
            </div>
            <div className={`p-10 border-2 border-dashed ${isDarkMode ? 'border-white/20 bg-white/5' : 'border-slate-300 bg-white/40'} rounded-3xl transition-colors flex flex-col items-center justify-center gap-4 hover:border-orange-500/50`}>
              <Upload size={48} className="text-orange-500 animate-pulse" />
              <div className="text-center">
                <p className={`text-sm font-bold ${theme.textMain}`}>Upload your latest Resume</p>
                <p className={`text-[10px] font-semibold mt-1 ${theme.textSub}`}>PDF format only. Maximum 10 MB.</p>
              </div>
              <input type="file" accept=".pdf" className={`mt-4 text-xs font-bold cursor-pointer transition-all file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-bold file:cursor-pointer ${theme.textMain} file:bg-orange-500 file:text-white hover:file:opacity-90 shadow-sm`} />
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION ACTIONS */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/20">
          <button 
            type="button" 
            onClick={handlePrev} 
            disabled={currentStep === 1}
            className={`px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-all flex items-center gap-2 disabled:opacity-30 ${theme.glassItem} ${theme.textMain}`}
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          {currentStep < 4 ? (
            <button 
              type="button" 
              onClick={handleNext} 
              className="px-6 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-[0_4px_20px_rgba(249,115,22,0.4)] active:scale-95 transition-all flex items-center gap-2 border border-orange-400"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.full_name}
              className="px-8 py-3.5 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer shadow-[0_4px_20px_rgba(147,51,234,0.4)] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 border border-purple-400"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Complete Profile
            </button>
          )}
        </div>

      </div>
    </div>
  );
}