'use client';
import { useEffect, useState } from 'react';
import { bannerApi, brandApi, categoryApi, cityApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Image, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetType: 'all' | 'category' | 'city' | 'salon';
  targetId?: string;
  discountPercent?: number;
  discountCode?: string;
  priority: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  brandId?: { _id: string; name: string };
}

interface FormData {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  targetType: 'all' | 'category' | 'city' | 'salon';
  targetId: string;
  discountPercent: string;
  discountCode: string;
  brandId: string;
  priority: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const DEFAULT_FORM: FormData = {
  title: '', subtitle: '', imageUrl: '', ctaText: '', ctaLink: '',
  targetType: 'all', targetId: '', discountPercent: '', discountCode: '',
  brandId: '', priority: '0', startDate: '', endDate: '', isActive: true,
};

interface Opt { _id: string; name: string }

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [cities, setCities] = useState<Opt[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, brRes, catRes, cityRes] = await Promise.all([
        bannerApi.getAll(),
        brandApi.getAll(),
        categoryApi.getAll(),
        cityApi.getAll(),
      ]);
      setBanners(bRes.data.data ?? []);
      setBrands(brRes.data.data ?? []);
      setCategories(catRes.data.data ?? []);
      setCities(cityRes.data.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(DEFAULT_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (b: Banner) => {
    setForm({
      title: b.title, subtitle: b.subtitle ?? '', imageUrl: b.imageUrl,
      ctaText: '', ctaLink: '',
      targetType: b.targetType, targetId: b.targetId ?? '',
      discountPercent: b.discountPercent?.toString() ?? '',
      discountCode: b.discountCode ?? '',
      brandId: b.brandId?._id ?? '',
      priority: b.priority.toString(),
      startDate: b.startDate.slice(0, 10),
      endDate: b.endDate.slice(0, 10),
      isActive: b.isActive,
    });
    setEditId(b._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.imageUrl || !form.startDate || !form.endDate) {
      toast.error('Title, image URL, and dates are required');
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...form,
      priority: Number(form.priority) || 0,
      discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
      targetId: form.targetType !== 'all' ? form.targetId : undefined,
      brandId: form.brandId || undefined,
    };
    try {
      if (editId) { await bannerApi.update(editId, payload); toast.success('Banner updated'); }
      else { await bannerApi.create(payload); toast.success('Banner created'); }
      setShowForm(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save banner');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await bannerApi.delete(id);
      toast.success('Deleted');
      setBanners(prev => prev.filter(b => b._id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const f = (key: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{banners.length} banners</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Banner
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editId ? 'Edit Banner' : 'New Banner'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                  <input className="input" value={form.title} onChange={e => f('title', e.target.value)} placeholder="Summer Special" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subtitle</label>
                  <input className="input" value={form.subtitle} onChange={e => f('subtitle', e.target.value)} placeholder="Up to 30% off" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Image URL *</label>
                  <input className="input" value={form.imageUrl} onChange={e => f('imageUrl', e.target.value)} placeholder="https://…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CTA Text</label>
                  <input className="input" value={form.ctaText} onChange={e => f('ctaText', e.target.value)} placeholder="Book Now" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CTA Link</label>
                  <input className="input" value={form.ctaLink} onChange={e => f('ctaLink', e.target.value)} placeholder="/salons" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Target</label>
                  <select className="input" value={form.targetType} onChange={e => f('targetType', e.target.value)}>
                    <option value="all">All Users</option>
                    <option value="category">By Category</option>
                    <option value="city">By City</option>
                    <option value="salon">Specific Salon</option>
                  </select>
                </div>
                {form.targetType === 'category' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <select className="input" value={form.targetId} onChange={e => f('targetId', e.target.value)}>
                      <option value="">Select…</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {form.targetType === 'city' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                    <select className="input" value={form.targetId} onChange={e => f('targetId', e.target.value)}>
                      <option value="">Select…</option>
                      {cities.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {form.targetType === 'salon' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Salon ID</label>
                    <input className="input" value={form.targetId} onChange={e => f('targetId', e.target.value)} placeholder="Salon _id" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Discount %</label>
                  <input className="input" type="number" min="0" max="100" value={form.discountPercent} onChange={e => f('discountPercent', e.target.value)} placeholder="20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Discount Code</label>
                  <input className="input" value={form.discountCode} onChange={e => f('discountCode', e.target.value)} placeholder="TRIM20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Brand Partner</label>
                  <select className="input" value={form.brandId} onChange={e => f('brandId', e.target.value)}>
                    <option value="">None</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <input className="input" type="number" value={form.priority} onChange={e => f('priority', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date *</label>
                  <input className="input" type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Date *</label>
                  <input className="input" type="date" value={form.endDate} onChange={e => f('endDate', e.target.value)} />
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} className="w-4 h-4 accent-primary" />
                  <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banners grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-48 animate-pulse bg-slate-100" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="card py-16 text-center">
          <Image className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-slate-400">No banners yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b._id} className="card overflow-hidden">
              <div className="relative h-36 bg-slate-100">
                {b.imageUrl && (
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{b.title}</p>
                    {b.subtitle && <p className="text-white/80 text-xs">{b.subtitle}</p>}
                  </div>
                </div>
                <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${b.isActive ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'}`}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize">Target: {b.targetType}</span>
                  <span>{b.impressions} impressions · {b.clicks} clicks</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{format(new Date(b.startDate), 'MMM d')} → {format(new Date(b.endDate), 'MMM d, yyyy')}</span>
                  {b.discountCode && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-mono">{b.discountCode}</span>}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => openEdit(b)} className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(b._id)} className="btn-danger flex items-center gap-1 text-xs py-1.5 px-3">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
