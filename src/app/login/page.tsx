'use client';

import React from 'react';
import RootPage from '../page';

/**
 * Clean pass-through wrapper for the secondary route.
 * This ensures both localhost:3000 and localhost:3000/login share 
 * the exact same premium layout, logo, and auth fixes without duplicate code.
 */
export default function LoginPage() {
  return <RootPage />;
}