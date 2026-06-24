import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = Cookies.get('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('admin_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Typed helpers ────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/salon/login', { email, password }),
};

export const dashboardApi = {
  getStats: () => api.get('/admin/dashboard'),
  getPendingSalons: (page = 1) => api.get(`/admin/salons/pending?page=${page}&limit=10`),
  getAllSalons: (params?: Record<string, string>) => api.get('/salons', { params }),
  getSalonById: (id: string) => api.get(`/salons/${id}`),
  approveSalon: (id: string) => api.patch(`/admin/salons/${id}/approve`),
  rejectSalon: (id: string, reason: string) => api.patch(`/admin/salons/${id}/reject`, { reason }),
  suspendSalon: (id: string, reason: string) => api.patch(`/admin/salons/${id}/suspend`, { reason }),
  markSalonReviewed: (id: string) => api.patch(`/admin/salons/${id}/reviewed`),
};

export const bannerApi = {
  getAll: (params?: Record<string, string>) => api.get('/admin/banners', { params }),
  create: (data: object) => api.post('/admin/banners', data),
  update: (id: string, data: object) => api.put(`/admin/banners/${id}`, data),
  delete: (id: string) => api.delete(`/admin/banners/${id}`),
};

export const brandApi = {
  getAll: () => api.get('/admin/brands'),
  getById: (id: string) => api.get(`/admin/brands/${id}`),
  create: (data: object) => api.post('/admin/brands', data),
  update: (id: string, data: object) => api.put(`/admin/brands/${id}`, data),
  delete: (id: string) => api.delete(`/admin/brands/${id}`),
  addProduct: (brandId: string, data: object) => api.post(`/admin/brands/${brandId}/products`, data),
  removeProduct: (brandId: string, productId: string) => api.delete(`/admin/brands/${brandId}/products/${productId}`),
};

export const categoryApi = {
  getAll: () => api.get('/admin/categories'),
  create: (data: object) => api.post('/admin/categories', data),
  update: (id: string, data: object) => api.put(`/admin/categories/${id}`, data),
  delete: (id: string) => api.delete(`/admin/categories/${id}`),
};

export const cityApi = {
  getAll: () => api.get('/admin/cities'),
  create: (data: object) => api.post('/admin/cities', data),
  update: (id: string, data: object) => api.put(`/admin/cities/${id}`, data),
  delete: (id: string) => api.delete(`/admin/cities/${id}`),
};
