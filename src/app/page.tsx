import { redirect } from 'next/navigation';

export default function RootPage() {
  // Automatically redirect the root URL to the new Admin login page
  redirect('/login/admin');
}