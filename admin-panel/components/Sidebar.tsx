'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Store, Tag, MapPin, Image, Handshake, LogOut, Scissors,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',             icon: LayoutDashboard },
  { label: 'Salons',       href: '/dashboard/salons',      icon: Store },
  { label: 'Banners',      href: '/dashboard/banners',     icon: Image },
  { label: 'Brand Partners', href: '/dashboard/brands',    icon: Handshake },
  { label: 'Categories',   href: '/dashboard/categories',  icon: Tag },
  { label: 'Cities',       href: '/dashboard/cities',      icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove('admin_token');
    Cookies.remove('admin_user');
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Scissors className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-none">TrimCity</p>
          <p className="text-slate-400 text-xs mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:text-white hover:bg-sidebar-hover'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-sidebar-hover transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
