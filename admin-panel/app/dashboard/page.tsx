'use client';
import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api';
import { Store, Clock, CheckCircle, XCircle, Tag, MapPin, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  salons: { total: number; pending: number; approved: number; rejected: number };
  categories: number;
  cities: number;
}

interface PendingSalon {
  _id: string;
  name: string;
  phone: string;
  address: { street: string; city: string; state: string };
  ownerId: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingSalon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getPendingSalons(),
        ]);
        setStats(sRes.data.data);
        setPending(pRes.data.data);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
    // Auto-refresh every 30s
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 h-24 animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Salons"    value={stats?.salons.total    ?? 0} icon={Store}       color="bg-slate-700" />
        <StatCard label="Pending Approval" value={stats?.salons.pending  ?? 0} icon={Clock}       color="bg-yellow-500" sub="Needs your review" />
        <StatCard label="Approved Salons"  value={stats?.salons.approved ?? 0} icon={CheckCircle} color="bg-green-500" />
        <StatCard label="Rejected"         value={stats?.salons.rejected ?? 0} icon={XCircle}     color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Categories"  value={stats?.categories ?? 0} icon={Tag}       color="bg-purple-500" />
        <StatCard label="Cities"      value={stats?.cities     ?? 0} icon={MapPin}    color="bg-blue-500" />
        <StatCard label="Approval Rate"
          value={stats ? Math.round((stats.salons.approved / Math.max(stats.salons.total, 1)) * 100) : 0}
          icon={TrendingUp}
          color="bg-primary"
          sub="% of all submissions"
        />
      </div>

      {/* Pending Salons — action required */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800">Pending Approvals</h2>
            <p className="text-xs text-slate-500 mt-0.5">Salons waiting for your review</p>
          </div>
          <Link href="/dashboard/salons?filter=pending" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {pending.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-slate-500 font-medium">All caught up!</p>
            <p className="text-slate-400 text-sm">No salons pending approval.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.slice(0, 5).map((salon) => (
              <Link
                key={salon._id}
                href={`/dashboard/salons/${salon._id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 group-hover:text-primary transition-colors">{salon.name}</p>
                  <p className="text-sm text-slate-500 truncate">{salon.address?.city}, {salon.address?.state}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="badge-pending">Pending</span>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(salon.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
