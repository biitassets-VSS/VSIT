// hooks/useAuth.ts
import { useEffect, useState } from 'react';

export function useAuth() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Check the browser's memory to see who logged in
    const savedRole = localStorage.getItem('userRole');
    setRole(savedRole);
  }, []);

  return {
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
    isGuest: role === 'guest',
    role: role
  };
}