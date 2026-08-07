'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

const ROLES_LIST = ["Super Admin", "Staff Admin"];
const DEPARTMENTS_LIST = [
  "Adelaide (Student Visa)", "Adelaide (Visitor Visa)", "Adelaide (PR Visa)", "Adelaide (Skill Assessment)",
  "Adelaide (Calling)", "Melbourne (Student Visa)", "Melbourne (Visitor Visa)", "Melbourne (Skill Assessment)",
  "Melbourne (Migration Admin)", "Migration (Accounts)", "Migration (Calling)", "Education (Accounts)",
  "Educations", "Admin Works", "Social Media", "Manager"
];

export default function AddNewStaffPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '', empCode: '', dob: '', joiningDate: '', phone: '',
    role: ROLES_LIST[1], department: DEPARTMENTS_LIST[0], email: '', password: '',
  });

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('vsit_theme') === 'dark';
      setIsDarkMode(isDark);
    };
    syncTheme();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Staff Data Submitted:', formData);
    alert('Staff added successfully!');
  };

  const theme = {
    bg: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#FFF9F2]',
    textMain: isDarkMode ? 'text-zinc-100' : 'text-slate-900',
    textSub: isDarkMode ? 'text-zinc-400' : 'text-slate-500',
    glassCard: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.1)]',
    glassInner: isDarkMode 
      ? 'bg-black/30 backdrop-blur-xl border border-white/10 shadow-inner' 
      : 'bg-white/50 backdrop-blur-xl border border-white/80 shadow-sm',
    inputBg: isDarkMode 
      ? 'bg-black/40 border border-white/10 text-white focus:border-orange-500/50' 
      : 'bg-white/50 border border-white/60 text-slate-900 focus:bg-white/70 focus:ring-4 focus:ring-orange-500/10',
  };

  return (
    <div className={`min-h-screen ${theme.bg} relative overflow-hidden font-sans antialiased pb-12 transition-colors duration-1000`}>
      <div className="fixed top-[-5%] left-[-5%] w-[45vw] h-[45vh] bg-orange-500/20 dark:bg-orange-600/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />
      <div className="fixed bottom-[-5%] right-[-5%] w-[45vw] h-[45vh] bg-purple-500/20 dark:bg-purple-700/10 blur-[120px] rounded-full pointer-events-none -z-10 transition-all duration-1000" />

      <div className="w-full max-w-5xl mx-auto space-y-6 pt-6 px-4 relative z-10 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${theme.glassCard} rounded-4xl p-6`}>
          <div>
            <h1 className={`text-2xl font-black ${theme.textMain}`}>Add New Staff</h1>
            <p className={`text-xs font-semibold mt-1 ${theme.textSub}`}>Create a new employee profile and generate login credentials.</p>
          </div>
          <Link href="/admin/staff" className={`px-5 py-3 ${theme.glassInner} ${theme.textMain} hover:scale-105 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm`}>
            <ArrowLeft size={16} /> Back to List
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* PERSONAL INFO */}
          <div className={`${theme.glassCard} p-6 sm:p-8 rounded-4xl space-y-6`}>
            <h2 className={`text-sm font-black uppercase tracking-widest ${theme.textMain} border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'} pb-3`}>1. Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Staff Name *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. John Doe" className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all ${theme.inputBg}`} />
              </div>
            </div>
          </div>

          {/* WORK DETAILS */}
          <div className={`${theme.glassCard} p-6 sm:p-8 rounded-4xl space-y-6`}>
            <h2 className={`text-sm font-black uppercase tracking-widest ${theme.textMain} border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'} pb-3`}>2. Work Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Employee Code *</label>
                <input type="text" name="empCode" required value={formData.empCode} onChange={handleChange} placeholder="e.g. EMP-1042" className={`w-full p-3.5 rounded-2xl outline-none font-mono uppercase font-semibold transition-all ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Joining Date *</label>
                <input type="date" name="joiningDate" required value={formData.joiningDate} onChange={handleChange} className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Role *</label>
                <select name="role" value={formData.role} onChange={handleChange} className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all cursor-pointer ${theme.inputBg}`}>
                  {ROLES_LIST.map(r => <option key={r} value={r} className="dark:bg-zinc-900">{r}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Department *</label>
                <select name="department" value={formData.department} onChange={handleChange} className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all cursor-pointer ${theme.inputBg}`}>
                  {DEPARTMENTS_LIST.map(d => <option key={d} value={d} className="dark:bg-zinc-900">{d}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* CREDENTIALS */}
          <div className={`${theme.glassInner} p-6 sm:p-8 rounded-4xl space-y-6 border-orange-500/30`}>
            <div className={`mb-4 pb-3 border-b ${isDarkMode ? 'border-orange-500/20' : 'border-orange-200'}`}>
              <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">3. Login Credentials</h2>
              <p className={`text-[10px] font-bold uppercase mt-1 ${theme.textSub}`}>These credentials grant access to the staff portal.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Email Address *</label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="staff@company.com" className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all ${theme.inputBg}`} />
              </div>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest ${theme.textSub} mb-1.5`}>Account Password *</label>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className={`w-full p-3.5 rounded-2xl outline-none font-semibold transition-all ${theme.inputBg}`} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <button type="submit" className="bg-linear-to-r from-orange-500 to-orange-600 hover:opacity-90 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/25 transition-all active:scale-95 border border-orange-400/50 flex items-center gap-2 cursor-pointer">
              <Save size={18} /> Save Staff Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}