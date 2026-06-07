"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient"; // Update path if needed

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. Log the user in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Fetch the user's role and status from the 'profiles' table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      // 3. Check if the account is deactivated
      if (profileData.status === "deactivated") {
        alert("Your account has been deactivated. Please contact an Admin.");
        await supabase.auth.signOut();
        return;
      }

      // 4. Redirect based on role
      if (profileData.role === "admin") {
        router.push("/admin"); // Sends to Admin Dashboard
      } else if (profileData.role === "staff") {
        router.push("/staff"); // Sends to Staff Dashboard
      } else {
        alert("Role not recognized.");
      }

    } catch (error: any) {
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "100px auto", padding: "20px" }}>
      <h2>Sign In</h2>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
        />
        <button type="submit" style={{ width: "100%", padding: "10px", background: "blue", color: "white" }}>
          Login
        </button>
      </form>
    </div>
  );
}
