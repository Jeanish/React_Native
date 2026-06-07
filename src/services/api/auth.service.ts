/**
 * TrimCity — Auth API Service
 * REST-based user profile operations (replaces Firestore fetchUserProfile).
 */
import apiClient from './client';
import type { AppUser, UserRole, ServiceResult } from '../../types';

/**
 * Fetch the current user's profile from the REST API (GET /auth/me).
 * The access token must already be set on the apiClient (via initAuthFromStorage
 * or after a successful login).
 */
export async function fetchCurrentUserProfile(): Promise<ServiceResult<AppUser>> {
  try {
    const res = await apiClient.get('/auth/me');
    const u = res.data.data.user;
    const appUser: AppUser = {
      uid: u.id,
      phone: u.phone ?? '',
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || '',
      photoURL: u.avatar,
      role: (u.role === 'salon_admin' ? 'owner' : u.role) as UserRole,
      createdAt: new Date(u.createdAt).getTime(),
      updatedAt: new Date(u.createdAt).getTime(),
    };
    return { data: appUser };
  } catch (err: any) {
    console.error('[AuthAPI] fetchCurrentUserProfile error:', err.message);
    return { error: err.response?.data?.message ?? 'Failed to fetch profile.' };
  }
}
