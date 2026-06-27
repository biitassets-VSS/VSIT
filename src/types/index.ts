export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  emp_code?: string;
  role?: string;
  status?: string;
}

export interface Asset {
  id: string;
  name: string;
  asset_tag: string;
  serial_number: string;
  category: string;
  assigned_to: string;
  status: string;
  inspection_status: string;
  last_inspection_date?: string;
}

export interface Inspection {
  id: string;
  asset_id: string;
  inspected_by: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Re-Inspection';
  condition: string;
  notes: string;
  admin_remarks?: string;
  photos?: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  created_by: string;
  created_at: string;
}