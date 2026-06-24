/**
 * TrimCity — Authentication Service
 *
 * OTP is generated and verified by the backend (POST /auth/send-otp, /auth/verify-otp).
 * SMS delivery is handled by the backend SMS service (console in dev, Fast2SMS in prod).
 * No Firebase Phone Auth needed — fully free when SMS_API_KEY is not configured
 * (OTP is logged to server console in development).
 */
import auth from '@react-native-firebase/auth';
import apiClient, { clearAuthTokens, setAuthTokens } from '../api/client';
import type { AppUser, UserRole, ServiceResult } from '../../types';
import { sanitizePhoneNumber } from '../security/sanitizer';
import { validateIndianPhone } from '../security/validator';

// ─── Dev Bypass ───────────────────────────────────────────────────────────────
const DEV_BYPASS_ENABLED = false;
const DEV_BYPASS = __DEV__ && DEV_BYPASS_ENABLED;
export const DEV_BYPASS_CODE = '999977';

let _devBypassPhone: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapBackendRole(role: string): UserRole {
  if (role === 'salon_admin') return 'owner';
  if (role === 'super_admin') return 'admin';
  return 'customer';
}

function mapAppUserFromBackend(u: any): AppUser {
  return {
    uid: u.id,
    phone: u.phone ?? '',
    email: u.email ?? '',
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || '',
    photoURL: u.avatar,
    role: mapBackendRole(u.role),
    createdAt: new Date(u.createdAt).getTime(),
    updatedAt: new Date(u.createdAt).getTime(),
  };
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────

/**
 * Requests a 6-digit OTP from the backend.
 * The backend generates the OTP, stores it in MongoDB, and sends email.
 */
export async function sendOTP(
  email: string,
): Promise<ServiceResult<string>> {
  try {
    const cleaned = email.trim().toLowerCase();
    
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleaned)) {
      return { error: 'Please enter a valid email address.' };
    }

    // ── DEV BYPASS ────────────────────────────────────────────────────────────
    if (DEV_BYPASS) {
      _devBypassPhone = cleaned; // store email in dev bypass phone ref
      console.log('====================================');
      console.log('[DEV BYPASS] OTP skipped for:', cleaned);
      console.log('[DEV BYPASS] Enter code →', DEV_BYPASS_CODE, '← in OTP screen');
      console.log('====================================');
      return { data: cleaned };
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log('[AuthService] Sending OTP to:', cleaned);
    await apiClient.post('/auth/send-otp', { email: cleaned });
    console.log('[AuthService] OTP sent successfully to:', cleaned);

    return { data: cleaned };
  } catch (err: any) {
    console.error('[AuthService] sendOTP error:', err.response?.data ?? err.message);
    return { error: err.response?.data?.message ?? 'Failed to send OTP. Please try again.' };
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

/**
 * Verifies the 6-digit OTP with the backend.
 * Backend validates OTP, registers/logs in user in MongoDB, returns JWT tokens.
 */
export async function verifyOTP(
  email: string,
  otp: string,
  role: UserRole,
): Promise<ServiceResult<AppUser>> {
  try {
    console.log('[AuthService] Verifying OTP for:', email, 'role:', role);

    // ── DEV BYPASS ────────────────────────────────────────────────────────────
    if (DEV_BYPASS && otp === DEV_BYPASS_CODE) {
      console.log('[DEV BYPASS] Code accepted — calling backend dev-phone endpoint');
      const emailVal = _devBypassPhone ?? 'dev-user@trimcity.local';
      _devBypassPhone = null;

      const res = await apiClient.post('/auth/dev-phone', { email: emailVal, role });
      const { user: u, tokens } = res.data.data;

      await setAuthTokens(tokens.accessToken, tokens.refreshToken);

      const appUser = mapAppUserFromBackend(u);
      console.log('[DEV BYPASS] Logged in as:', appUser.uid);
      return { data: appUser };
    }
    // ─────────────────────────────────────────────────────────────────────────

    const res = await apiClient.post('/auth/verify-otp', {
      email,
      otp,
      role,
    });

    const { user: u, tokens } = res.data.data;

    await setAuthTokens(tokens.accessToken, tokens.refreshToken);

    const appUser = mapAppUserFromBackend(u);
    return { data: appUser };
  } catch (err: any) {
    console.error('[AuthService] verifyOTP error:', err.response?.data ?? err.message);
    return { error: err.response?.data?.message ?? 'Verification failed. Please try again.' };
  }
}

// ─── Update User Profile ──────────────────────────────────────────────────────

export async function updateUserProfile(
  uidOrUpdates: string | Partial<Pick<AppUser, 'name' | 'photoURL' | 'fcmToken'>>,
  maybeUpdates?: Partial<Pick<AppUser, 'name' | 'photoURL' | 'fcmToken'>>,
): Promise<ServiceResult<void>> {
  try {
    const updates = typeof uidOrUpdates === 'string' ? (maybeUpdates ?? {}) : uidOrUpdates;
    const body: Record<string, unknown> = {};
    if (updates.name) {
      const parts = updates.name.split(' ');
      body.firstName = parts[0] ?? '';
      body.lastName = parts.slice(1).join(' ') || '';
    }
    if (updates.fcmToken !== undefined) body.fcmToken = updates.fcmToken;
    await apiClient.patch('/auth/profile', body);
    return {};
  } catch (err: any) {
    console.error('[AuthService] updateUserProfile error:', err.response?.data ?? err.message);
    return { error: 'Failed to update profile.' };
  }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    const { teardownPushNotifications } = await import('./notifications.service');
    await teardownPushNotifications();
  } catch {
    // ignore
  }
  await clearAuthTokens();
  try {
    await auth().signOut();
  } catch {
    // Firebase signout can fail if not signed in — ignore
  }
}
