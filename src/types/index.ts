export type Role = 'admin' | 'staff';
export type AssetStatus = 'In Stock' | 'Assigned' | 'Repair' | 'Disposed';
export type NotificationType = 'Critical' | 'Warning' | 'Information' | 'Success';

export interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  category: string;
  status: AssetStatus;
  purchase_price: number;
  qr_code_url: string;
}

export interface UserProfile {
  id: string;
  role: Role;
  name: string;
  email: string;
}
