"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Lock, Mail, User, ShieldCheck, MonitorSmartphone, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  
  const [loginType, setLoginType] = useState<"admin" | "staff">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("No user ID found");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      if (profileData.role === "admin") {
        router.push("/admin/dashboard");
      } else if (profileData.role === "staff") {
        router.push("/staff/dashboard");
      } else {
        setErrorMsg("Role not recognized. Please contact an administrator.");
      }
    } catch (error: any) {
      console.error("Login error:", error.message);
      setErrorMsg("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* --- CSS Custom Animations --- */}
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.7s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-300 { animation-delay: 0.3s; }
      `}</style>

      {/* --- Background Floating Animations --- */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-pulse" style={{ animationDelay: '2s' }} />

      {/* --- Main Login Card --- */}
      <div className="animate-fade-in-up bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white max-w-md w-full relative z-10">
        
        {/* Company Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform transition-transform hover:scale-110 duration-300">
            <MonitorSmartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Virtual Staffing Solutions
          </h1>
          <p className="text-blue-600 font-medium text-sm mt-1 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4" />
            IT Assets & Staff Management
          </p>
        </div>

        {/* Admin / Staff Toggle */}
        <div className="flex bg-gray-100/80 p-1.5 rounded-xl mb-8">
          <button
            onClick={() => setLoginType("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
              loginType === "admin" 
                ? "bg-white text-blue-600 shadow-md transform scale-[1.02]" 
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Admin
          </button>
          <button
            onClick={() => setLoginType("staff")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
              loginType === "staff" 
                ? "bg-white text-blue-600 shadow-md transform scale-[1.02]" 
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            <User className="w-4 h-4" />
            Staff
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center mb-6 border border-red-100 animate-pulse">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 transition-colors group-focus-within:text-blue-600">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-300"
                placeholder={loginType === "admin" ? "admin@virtualstaffing.com" : "staff@virtualstaffing.com"}
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 transition-colors group-focus-within:text-blue-600">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              `Sign in as ${loginType === "admin" ? "Admin" : "Staff"}`
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>

      {/* --- Footer / Credits --- */}
      <div className="animate-fade-in-up delay-300 mt-8 text-center relative z-10 opacity-0" style={{ animationFillMode: 'forwards' }}>
        <p className="text-sm text-gray-500 font-medium tracking-wide">
          Design by <span className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors cursor-pointer">Ainodeat</span>
        </p>
      </div>

    </div>
  );
}
