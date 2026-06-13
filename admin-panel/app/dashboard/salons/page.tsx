'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { dashboardApi } from '@/lib/api';
import { Store, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Salon {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address: { street: string; city: string; state: string };
  ownerId: { firstName: string; lastName: string; email: string };
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  createdAt: string;
  category?: string;
  hasPendingChanges?: boolean;
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    suspended: 'badge-suspended',
  };
  return <span className={map[status] ?? 'badge-pending'}>{status}</span>;
}

export default function SalonsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SalonsPageInner />
    </Suspense>
  );
}

function SalonsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterParam = searchParams.get('filter') ?? '';

  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(filterParam);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (activeFilter) params.status = activeFilter;
      if (search) params.search = search;

      // Use pending-specific endpoint for pending filter, general endpoint otherwise
      let res;
      if (activeFilter === 'pending') {
        res = await dashboardApi.getPendingSalons(page);
      } else {
        res = await dashboardApi.getAllSalons(params);
      }
      const data = res.data.data;
      // Both endpoints may return array or paginated object
      if (Array.isArray(data)) {
        setSalons(data);
        setTotalPages(1);
      } else {
        setSalons(data.salons ?? data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, search]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setPage(1);
    router.replace(`/dashboard/salons${key ? `?filter=${key}` : ''}`);
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs + Search */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
          {/* Status tabs */}
          <div className="flex gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-primary text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search salons…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Salon</th>
                <th className="px-5 py-3 text-left font-medium">Owner</th>
                <th className="px-5 py-3 text-left font-medium">Location</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Registered</th>
                <th className="px-5 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : salons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-400">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No salons found
                  </td>
                </tr>
              ) : (
                salons.map((salon) => (
                  <tr key={salon._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{salon.name}</p>
                          <p className="text-xs text-slate-400">{salon.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{salon.ownerId?.firstName} {salon.ownerId?.lastName}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">{salon.ownerId?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {salon.address?.city}, {salon.address?.state}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={salon.status} />
                        {salon.hasPendingChanges && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            ● Updated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {formatDistanceToNow(new Date(salon.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/salons/${salon._id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
