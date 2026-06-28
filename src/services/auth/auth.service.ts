// src/services/auth/auth.service.ts
//
// Unified auth service for customer OTP + salon owner register/login.
// All functions parse the backend response correctly: res.data.data.{user, tokens}.

import apiClient from '../api/client';
import { setAuthTokens } from '../api/client';
import type { AppUser, UserRole } from '../../types';

/**
 * Generic API result wrapper for service functions.
 */
export type APIResult<T> = { data?: T; error?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapBackendRole(role: string): UserRole {
  if (role === 'salon_admin') return 'owner';
  if (role === 'super_admin') return 'admin';
  return 'customer';
}

function mapAppUserFromBackend(u: any): AppUser {
  return {
    uid: u.id ?? u._id,
    phone: u.phone ?? '',
    email: u.email ?? '',
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || '',
    photoURL: u.avatar,
    role: mapBackendRole(u.role),
    createdAt: u.createdAt ? new Date(u.createdAt).getTime() : Date.now(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt).getTime() : Date.now(),
  };
}

// ─── Customer: Send OTP ───────────────────────────────────────────────────────

/**
 * Request an OTP to be sent to the given email address or phone number.
 * Returns an empty success result or an error message.
 */
export const requestOTP = async (target: string): Promise<APIResult<void>> => {
  try {
    const cleaned = target.trim();
    const body = cleaned.includes('@')
      ? { email: cleaned.toLowerCase() }
      : { phone: cleaned };
    await apiClient.post('/auth/send-otp', body);
    return {};
  } catch (err: any) {
    return { error: err.response?.data?.message ?? err.message ?? 'Failed to send OTP' };
  }
};

// ─── Customer: Verify OTP ─────────────────────────────────────────────────────

/**
 * Verify the OTP for the provided email address or phone number.
 * Backend returns: { success, data: { user, tokens: { accessToken, refreshToken } } }
 */
export const verifyOTP = async (
  target: string,
  otp: string,
  role?: UserRole,
): Promise<APIResult<AppUser>> => {
  try {
    const cleaned = target.trim();
    const body = cleaned.includes('@')
      ? { email: cleaned.toLowerCase(), otp, role }
      : { phone: cleaned, otp, role };
    const res = await apiClient.post('/auth/verify-otp', body);
    const { user: u, tokens } = res.data.data;
    await setAuthTokens(tokens.accessToken, tokens.refreshToken);
    const appUser = mapAppUserFromBackend(u);
    return { data: appUser };
  } catch (err: any) {
    return { error: err.response?.data?.message ?? err.message ?? 'Failed to verify OTP' };
  }
};

// ─── Salon Owner: Register ────────────────────────────────────────────────────

/**
 * Register a new salon owner account.
 * POST /auth/salon/register
 * Backend creates a salon_admin user and returns JWT tokens.
 */
export const registerSalonOwner = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  salonName: string;
}): Promise<APIResult<AppUser>> => {
  try {
    const res = await apiClient.post('/auth/salon/register', data);
    const { user: u, tokens } = res.data.data;
    await setAuthTokens(tokens.accessToken, tokens.refreshToken);
    const appUser = mapAppUserFromBackend(u);
    return { data: appUser };
  } catch (err: any) {
    return { error: err.response?.data?.message ?? err.message ?? 'Registration failed' };
  }
};

// ─── Salon Owner: Login ───────────────────────────────────────────────────────

/**
 * Login an existing salon owner.
 * POST /auth/salon/login
 */
export const loginSalonOwner = async (
  email: string,
  password: string,
): Promise<APIResult<AppUser>> => {
  try {
    const res = await apiClient.post('/auth/salon/login', { email, password });
    const { user: u, tokens } = res.data.data;
    await setAuthTokens(tokens.accessToken, tokens.refreshToken);
    const appUser = mapAppUserFromBackend(u);
    return { data: appUser };
  } catch (err: any) {
    return { error: err.response?.data?.message ?? err.message ?? 'Login failed' };
  }
};
