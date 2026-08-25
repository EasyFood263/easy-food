import type { Metadata } from 'next';
import './globals.css';
import AdminSecurity from '../components/admin-security';

export const metadata: Metadata = { title: 'Easy Food', description: 'Pakistan-wide food ordering and delivery marketplace' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<AdminSecurity /></body></html>;
}
