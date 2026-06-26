'use client';

import { useEffect } from 'react';
import CobrowseIO from 'cobrowse-sdk-js';

interface CobrowseProps {
  user: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

export default function CobrowseProvider({ user }: CobrowseProps) {
  useEffect(() => {
    // 1. Put your license key here
    CobrowseIO.license = "YOUR_COBROWSE_LICENSE_KEY";

    // 2. THIS IS THE MAGIC: Tag the browser session with your Portal's User Data
    CobrowseIO.customData = {
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      department: user.department || 'Staff'
    };

    // 3. Start the daemon silently in the background
    CobrowseIO.start();

  }, [user]);

  return null; // This component renders nothing to the screen
}