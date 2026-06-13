'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/salons': 'Salons',
  '/dashboard/banners': 'Banners & Promotions',
  '/dashboard/brands': 'Brand Partners',
  '/dashboard/categories': 'Categories',
  '/dashboard/cities': 'Cities',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = Cookies.get('admin_token');
    if (!token) router.replace('/login');
  }, [router]);

  const title = PAGE_TITLES[pathname] ?? (pathname.includes('/salons/') ? 'Salon Detail' : 'Admin');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
