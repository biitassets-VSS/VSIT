'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, Mail, Lock, MonitorSmartphone, ArrowLeft, AlertCircle, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; 

export default function LoginPage() {
  const router = useRouter();
  
  // 🧭 UI & Auth State
  const [loginType, setLoginType] = useState<'admin' | 'staff' | 'guest'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 🚀 THE MASTER-KEY AUTHENTICATION ENGINE (Now with aggressive alert traps)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Stop the page from ghost-refreshing
    
    // 👉 THE FLUSH COMMAND: Clear out any corrupted cookies/tokens before we try to log in
    await supabase.auth.signOut().catch(() => {});
    
    setLoading(true);
    setErrorMsg('');

    try {
      console.log("1. Login button clicked. Type:", loginType);

      // 1. GUEST BYPASS
      if (loginType === 'guest') {
        localStorage.setItem('vsit_guest_session', JSON.stringify({ role: 'guest', accessedAt: new Date().toISOString() }));
        router.push('/guest'); 
        return;
      }

      // 2. ADMIN & STAFF AUTHENTICATION
      const cleanEmail = email.toLowerCase().trim();
      const cleanPass = password.trim();
      
      console.log("2. Reaching out to Supabase for:", cleanEmail);

      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password', cleanPass)
        .maybeSingle();

      console.log("3. Supabase response received. User:", user, "Error:", error);

      // TRAP 1: Supabase configuration or network error
      if (error) {
        alert("CRITICAL SUPABASE ERROR: " + error.message);
        throw error;
      }
      
      // TRAP 2: Wrong credentials or user doesn't exist
      if (!user) {
        alert("DATABASE REJECTION: No user found with this exact email and password in the 'profiles' table.");
        throw new Error("Invalid email or password. Please try again.");
      }
      
      // TRAP 3: Disabled account
      if (user.status === 'Disabled') {
        alert("ACCOUNT DISABLED: This profile is turned off.");
        throw new Error("Your network access has been disabled by an Administrator.");
      }

      // 3. UNIVERSAL COOKIE & SESSION INJECTION
      console.log("4. Valid user found! Setting cookies...");
      const webDossier = {
        id: user.id, 
        name: user.full_name || user.name || 'Staff Member', 
        email: user.email, 
        emp_code: user.emp_code, 
        department: user.department, 
        role: user.role
      };

      localStorage.setItem('vsit_staff_session', JSON.stringify(webDossier));
      localStorage.setItem('staff_session', JSON.stringify(webDossier));
      localStorage.setItem('user', JSON.stringify(webDossier));
      localStorage.setItem('profile', JSON.stringify(webDossier));

      document.cookie = `vsit_auth=true; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `vsit_role=${loginType}; path=/; max-age=86400; SameSite=Lax`;
      
      // 👉 THE FIX: Renamed cookie so Supabase stops crashing trying to parse a UUID as a JWT
      document.cookie = `vsit_user_id=${user.id}; path=/; max-age=86400; SameSite=Lax`;

      // 4. ROUTING EXECUTION
      console.log("5. Attempting to route user...");
      if (loginType === 'admin') {
        const isUpperManagement = user.role?.toLowerCase().includes('admin') || user.department?.toLowerCase().includes('admin') || user.role?.toLowerCase().includes('developer');
        if (!isUpperManagement) {
          alert("ACCESS DENIED: You are logging in as Admin, but your database role is not Admin.");
          throw new Error("This profile does not hold Administrator clearance.");
        }

        localStorage.setItem('vsit_admin_session', JSON.stringify(user));
        alert("ADMIN SUCCESS: Routing to /admin now...");
        router.push('/admin');
      } else if (loginType === 'staff') {
        alert("STAFF SUCCESS: Everything worked perfectly. Sending you to /staff now! If you get bounced back after this popup, the bug is inside the /staff page.");
        router.push('/staff'); 
      }

    } catch (err: any) {
      console.error("6. FATAL ERROR CAUGHT:", err);
      // TRAP 4: The catch-all net for weird crashes
      if (!err.message.includes("Invalid email")) {
        alert("SYSTEM CRASH: " + err.message);
      }
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4 font-sans overflow-hidden">
      
      <motion.div 
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.15 }}
        className="w-full max-w-[440px] relative"
      >
        {/* 🔥 ORANGE GLOWING BORDER EFFECT 🔥 */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 rounded-[2.2rem] blur-md opacity-75 animate-pulse"></div>

        {/* MAIN LOGIN CARD */}
        <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 sm:p-10">
          
          {/* HEADER SECTION */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
            <div className="w-full flex justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Virtual Staffing Solutions" 
                className="h-20 sm:h-24 w-auto object-contain drop-shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight text-center">
              Virtual Staffing Solutions
            </h1>
            
            <div className="flex items-center justify-center gap-2 mt-2 bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">
              <MonitorSmartphone size={16} className="text-orange-500" />
              <p className="text-orange-600 font-bold text-xs uppercase tracking-wider">
                IT Assets and Staff Management
              </p>
            </div>
          </motion.div>

          {/* 🚀 THE RESTORED 3-WAY TOGGLE SWITCH (Admin / Staff / Guest) */}
          <motion.div variants={itemVariants} className="flex bg-[#F4F5F7] p-1.5 rounded-xl mb-6 relative gap-1">
            {[
              { id: 'admin', label: 'Admin', icon: <ShieldAlert size={16} /> },
              { id: 'staff', label: 'Staff', icon: <Users size={16} /> },
              { id: 'guest', label: 'Guest', icon: <UserIcon size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id} type="button"
                onClick={() => { setLoginType(tab.id as any); setErrorMsg(''); }}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                  loginType === tab.id 
                    ? `bg-white shadow-md transform scale-100 ${tab.id === 'admin' ? 'text-orange-600' : tab.id === 'staff' ? 'text-blue-600' : 'text-emerald-600'}` 
                    : 'text-gray-500 hover:text-gray-700 transform scale-95 hover:bg-gray-200/50'
                }`}
              >
                <div className={loginType === tab.id ? '' : 'text-gray-400'}>{tab.icon}</div>
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* ERROR MESSAGE POPUP */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-700 leading-tight">{errorMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOGIN FORM */}
          <form className="space-y-5" onSubmit={handleLogin}>
            
            {/* HIDE INPUTS IF GUEST IS SELECTED */}
            {loginType !== 'guest' && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <div className="relative group">
                      <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${loginType === 'admin' ? 'group-focus-within:text-orange-500' : 'group-focus-within:text-blue-600'} text-gray-400`} size={18} />
                      <input 
                        required type="email" 
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder={loginType === 'admin' ? "admin@virtualstaffing.com" : "staff@virtualstaffing.com"}
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 transition-all text-gray-900 text-sm font-medium ${loginType === 'admin' ? 'focus:border-orange-400 focus:ring-orange-500/10' : 'focus:border-blue-400 focus:ring-blue-500/10'}`} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <div className="relative group">
                      <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${loginType === 'admin' ? 'group-focus-within:text-orange-500' : 'group-focus-within:text-blue-600'} text-gray-400`} size={18} />
                      <input 
                        required type="password" 
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className={`w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-4 transition-all text-gray-900 text-sm font-medium ${loginType === 'admin' ? 'focus:border-orange-400 focus:ring-orange-500/10' : 'focus:border-blue-400 focus:ring-blue-500/10'}`} 
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* SUBMIT BUTTON */}
            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <button 
                type="submit" disabled={loading}
                className={`w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white transition-all cursor-pointer ${
                  loginType === 'admin' 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/30 hover:from-orange-600 hover:to-amber-600' 
                    : loginType === 'staff'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700'
                }`}
              >
                {loading ? 'Authenticating...' : loginType === 'guest' ? 'Continue as Guest' : `Sign in as ${loginType === 'admin' ? 'Admin' : 'Staff'}`}
              </button>
            </motion.div>
          </form>

          {/* BACK TO HOME LINK */}
          <motion.div variants={itemVariants} className="mt-8 text-center">
            <button type="button" onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-gray-700 font-semibold flex items-center justify-center gap-2 mx-auto transition-colors cursor-pointer">
              <ArrowLeft size={16} /> Back to Home
            </button>
          </motion.div>

        </div>
      </motion.div>

      {/* FOOTER CREDIT */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="text-center mt-8 relative z-10"
      >
        <p className="text-sm font-medium text-gray-500">
          Design by <span className="text-orange-500 font-bold tracking-wide">Ainodeat</span>
        </p>
      </motion.div>

    </div>
  );
}