'use client';
import { useEffect, useState } from 'react';
import { categoryApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
}

interface CategoryForm {
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
}

const DEFAULT: CategoryForm = { name: '', description: '', icon: '', isActive: true };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.getAll();
      setCategories(res.data.data ?? []);
    } catch { console.error('categories load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(DEFAULT); setEditId(null); setShowForm(true); };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, description: c.description ?? '', icon: c.icon ?? '', isActive: c.isActive });
    setEditId(c._id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editId) { await categoryApi.update(editId, form); toast.success('Updated'); }
      else { await categoryApi.create(form); toast.success('Category created'); }
      setShowForm(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed');
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try { await categoryApi.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const f = (k: keyof CategoryForm, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} categories</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editId ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Men's Salon" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Short description…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Icon (emoji or URL)</label>
                <input className="input" value={form.icon} onChange={e => f('icon', e.target.value)} placeholder="✂️" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="catActive" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="catActive" className="text-sm text-slate-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-32" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-slate-400">No categories yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <div key={cat._id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl shrink-0">
                  {cat.icon || <Tag className="w-4 h-4 text-purple-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{cat.name}</p>
                  {cat.description && <p className="text-xs text-slate-400 truncate">{cat.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {cat.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del(cat._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
