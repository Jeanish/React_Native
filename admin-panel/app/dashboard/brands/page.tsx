'use client';
import { useEffect, useState } from 'react';
import { brandApi } from '@/lib/api';
import { Plus, Pencil, Trash2, Package, ChevronDown, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface BrandProduct {
  _id: string;
  name: string;
  description?: string;
  mrp: number;
  partnerPrice: number;
  customerDiscountPercent: number;
  isActive: boolean;
}

interface Brand {
  _id: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  commissionPercent: number;
  isActive: boolean;
  products: BrandProduct[];
}

interface BrandForm {
  name: string;
  logo: string;
  description: string;
  website: string;
  contactEmail: string;
  commissionPercent: string;
  isActive: boolean;
}

interface ProductForm {
  name: string;
  description: string;
  mrp: string;
  partnerPrice: string;
  customerDiscountPercent: string;
}

const DEFAULT_BRAND_FORM: BrandForm = {
  name: '', logo: '', description: '', website: '', contactEmail: '', commissionPercent: '10', isActive: true,
};
const DEFAULT_PRODUCT_FORM: ProductForm = {
  name: '', description: '', mrp: '', partnerPrice: '', customerDiscountPercent: '',
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState<BrandForm>(DEFAULT_BRAND_FORM);
  const [saving, setSaving] = useState(false);
  const [productModal, setProductModal] = useState<string | null>(null); // brandId
  const [productForm, setProductForm] = useState<ProductForm>(DEFAULT_PRODUCT_FORM);
  const [addingProduct, setAddingProduct] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await brandApi.getAll();
      setBrands(res.data.data ?? []);
    } catch { console.error('brands load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setBrandForm(DEFAULT_BRAND_FORM); setEditBrandId(null); setShowBrandForm(true); };
  const openEdit = (b: Brand) => {
    setBrandForm({
      name: b.name, logo: b.logo ?? '', description: b.description ?? '',
      website: b.website ?? '', contactEmail: b.contactEmail ?? '',
      commissionPercent: b.commissionPercent.toString(), isActive: b.isActive,
    });
    setEditBrandId(b._id);
    setShowBrandForm(true);
  };

  const saveBrand = async () => {
    if (!brandForm.name) { toast.error('Name required'); return; }
    setSaving(true);
    const payload = { ...brandForm, commissionPercent: Number(brandForm.commissionPercent) || 0 };
    try {
      if (editBrandId) { await brandApi.update(editBrandId, payload); toast.success('Updated'); }
      else { await brandApi.create(payload); toast.success('Brand created'); }
      setShowBrandForm(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand partner?')) return;
    try { await brandApi.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const addProduct = async () => {
    if (!productModal) return;
    if (!productForm.name || !productForm.mrp || !productForm.partnerPrice) {
      toast.error('Name, MRP, and partner price are required');
      return;
    }
    setAddingProduct(true);
    try {
      await brandApi.addProduct(productModal, {
        ...productForm,
        mrp: Number(productForm.mrp),
        partnerPrice: Number(productForm.partnerPrice),
        customerDiscountPercent: Number(productForm.customerDiscountPercent) || 0,
      });
      toast.success('Product added');
      setProductModal(null);
      setProductForm(DEFAULT_PRODUCT_FORM);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed');
    } finally { setAddingProduct(false); }
  };

  const removeProduct = async (brandId: string, productId: string) => {
    if (!confirm('Remove product?')) return;
    try { await brandApi.removeProduct(brandId, productId); toast.success('Removed'); load(); }
    catch { toast.error('Failed'); }
  };

  const bf = (key: keyof BrandForm, val: string | boolean) => setBrandForm(p => ({ ...p, [key]: val }));
  const pf = (key: keyof ProductForm, val: string) => setProductForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{brands.length} brand partners</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      {/* Brand form modal */}
      {showBrandForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editBrandId ? 'Edit Brand' : 'New Brand Partner'}</h3>
              <button onClick={() => setShowBrandForm(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Brand Name *</label>
                <input className="input" value={brandForm.name} onChange={e => bf('name', e.target.value)} placeholder="Tresemmé" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Logo URL</label>
                <input className="input" value={brandForm.logo} onChange={e => bf('logo', e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea className="input resize-none" rows={2} value={brandForm.description} onChange={e => bf('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
                  <input className="input" value={brandForm.website} onChange={e => bf('website', e.target.value)} placeholder="https://…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contact Email</label>
                  <input className="input" type="email" value={brandForm.contactEmail} onChange={e => bf('contactEmail', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Commission %</label>
                  <input className="input" type="number" min="0" max="100" value={brandForm.commissionPercent} onChange={e => bf('commissionPercent', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="brandActive" checked={brandForm.isActive} onChange={e => bf('isActive', e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="brandActive" className="text-sm text-slate-700">Active</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowBrandForm(false)} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={saveBrand} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Product form modal */}
      {productModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Add Product</h3>
              <button onClick={() => setProductModal(null)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Product Name *</label>
                <input className="input" value={productForm.name} onChange={e => pf('name', e.target.value)} placeholder="Shampoo Pro" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input className="input" value={productForm.description} onChange={e => pf('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">MRP (₹) *</label>
                  <input className="input" type="number" value={productForm.mrp} onChange={e => pf('mrp', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Partner Price *</label>
                  <input className="input" type="number" value={productForm.partnerPrice} onChange={e => pf('partnerPrice', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Customer Disc %</label>
                  <input className="input" type="number" min="0" max="100" value={productForm.customerDiscountPercent} onChange={e => pf('customerDiscountPercent', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setProductModal(null)} className="btn-secondary" disabled={addingProduct}>Cancel</button>
              <button onClick={addProduct} className="btn-primary" disabled={addingProduct}>{addingProduct ? 'Adding…' : 'Add Product'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Brands list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="card py-16 text-center">
          <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-slate-400">No brand partners yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map((brand) => (
            <div key={brand._id} className="card overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(expanded === brand._id ? null : brand._id)}
              >
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-lg object-contain border border-slate-100" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{brand.name}</p>
                  <p className="text-xs text-slate-400">{brand.products.length} products · {brand.commissionPercent}% commission</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${brand.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {brand.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={e => { e.stopPropagation(); openEdit(brand); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteBrand(brand._id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expanded === brand._id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {expanded === brand._id && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Products</p>
                    <button
                      onClick={() => { setProductModal(brand._id); setProductForm(DEFAULT_PRODUCT_FORM); }}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add product
                    </button>
                  </div>
                  {brand.products.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No products yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {brand.products.map(p => (
                        <div key={p._id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{p.name}</p>
                            <p className="text-xs text-slate-400">MRP ₹{p.mrp} · Partner ₹{p.partnerPrice} · {p.customerDiscountPercent}% cust. discount</p>
                          </div>
                          <button onClick={() => removeProduct(brand._id, p._id)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
