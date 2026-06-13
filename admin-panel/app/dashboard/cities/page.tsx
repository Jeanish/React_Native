'use client';
import { useEffect, useState } from 'react';
import { cityApi } from '@/lib/api';
import { Plus, Pencil, Trash2, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface City {
  _id: string;
  name: string;
  state?: string;
  isActive: boolean;
}

interface FormData {
  name: string;
  state: string;
  isActive: boolean;
}

const DEFAULT: FormData = { name: '', state: '', isActive: true };

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await cityApi.getAll();
      setCities(res.data.data ?? []);
    } catch { console.error('cities load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(DEFAULT); setEditId(null); setShowForm(true); };
  const openEdit = (c: City) => {
    setForm({ name: c.name, state: c.state ?? '', isActive: c.isActive });
    setEditId(c._id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('City name required'); return; }
    setSaving(true);
    try {
      if (editId) { await cityApi.update(editId, form); toast.success('Updated'); }
      else { await cityApi.create(form); toast.success('City added'); }
      setShowForm(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed');
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this city?')) return;
    try { await cityApi.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const f = (k: keyof FormData, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  // Group by state
  const grouped = cities.reduce<Record<string, City[]>>((acc, c) => {
    const key = c.state || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{cities.length} cities</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add City
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editId ? 'Edit City' : 'Add City'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City Name *</label>
                <input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Pune" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                <input className="input" value={form.state} onChange={e => f('state', e.target.value)} placeholder="Maharashtra" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="cityActive" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="cityActive" className="text-sm text-slate-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cities list grouped by state */}
      {loading ? (
        <div className="card divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
              <div className="flex-1 h-4 bg-slate-100 rounded animate-pulse w-24" />
            </div>
          ))}
        </div>
      ) : cities.length === 0 ? (
        <div className="card py-16 text-center">
          <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-slate-400">No cities yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort().map(([state, stateCities]) => (
            <div key={state} className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{state} · {stateCities.length}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {stateCities.map((city) => (
                  <div key={city._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="flex-1 font-medium text-slate-700 text-sm">{city.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${city.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {city.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEdit(city)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(city._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
