/**
 * TrimCity — Authentication Service
 * Phone OTP via @react-native-firebase/auth (native module).
 * After OTP verification, calls the MongoDB backend to issue JWT tokens.
 * Firestore is NOT used for user data — MongoDB is the source of truth.
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import apiClient, { setAccessToken } from '../api/client';
import type { AppUser, UserRole, ServiceResult } from '../../types';
import { sanitizePhoneNumber } from '../security/sanitizer';
import { validateIndianPhone } from '../security/validator';

// ─── Dev Bypass ───────────────────────────────────────────────────────────────
const DEV_BYPASS = __DEV__ && true;
const DEV_BYPASS_CODE = '999977';

let _pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
let _devBypassPhone: string | null = null;

export function setPendingConfirmation(c: FirebaseAuthTypes.ConfirmationResult) {
  _pendingConfirmation = c;
}
export function getPendingConfirmation() {
  return _pendingConfirmation;
}
export function clearPendingConfirmation() {
  _pendingConfirmation = null;
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────

export async function sendOTP(phoneNumber: string): Promise<ServiceResult<string>> {
  try {
    const cleaned = sanitizePhoneNumber(phoneNumber);
    if (!validateIndianPhone(cleaned)) {
      return { error: 'Invalid phone number. Must be a 10-digit Indian number.' };
    }

    const fullPhone = `+91${cleaned}`;

    if (DEV_BYPASS) {
      _devBypassPhone = fullPhone;
      console.log('[DEV BYPASS] OTP skipped for:', fullPhone);
      console.log('[DEV BYPASS] Enter code →', DEV_BYPASS_CODE, '← in OTP screen');
      return { data: fullPhone };
    }

    const confirmation = await auth().signInWithPhoneNumber(fullPhone);
    setPendingConfirmation(confirmation);
    return { data: fullPhone };
  } catch (err: any) {
    console.error('[AuthService] sendOTP error:', err.code);
    if (err.code === 'auth/too-many-requests') {
      return { error: 'Too many attempts. Please wait a few minutes and try again.' };
    }
    if (err.code === 'auth/invalid-phone-number') {
      return { error: 'Invalid phone number format.' };
    }
    return { error: `Failed to send OTP. Code: ${err.code ?? 'unknown'}` };
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export async function verifyOTP(
  _verificationId: string,
  otp: string,
  role: UserRole,
): Promise<ServiceResult<AppUser>> {
  try {
    // Dev bypass — skip real Firebase, call backend with a mock token
    if (DEV_BYPASS && otp === DEV_BYPASS_CODE) {
      if (!_devBypassPhone) {
        return { error: 'Please request OTP first.' };
      }
      console.log('[DEV BYPASS] Calling backend with dev phone');
      const phone = _devBypassPhone.replace('+91', '');
      const result = await callBackendWithPhone(phone, role);
      if (result.data) _devBypassPhone = null; // only clear on success
      return result;
    }

    const confirmation = getPendingConfirmation();
    if (!confirmation) {
      return { error: 'Session expired. Please request a new OTP.' };
    }

    const userCredential = await confirmation.confirm(otp);
    clearPendingConfirmation();

    if (!userCredential?.user) {
      return { error: 'Verification failed. Please try again.' };
    }

    // Get Firebase ID token and send it to the backend
    const idToken = await userCredential.user.getIdToken();
    return callBackendWithToken(idToken, role);
  } catch (err: any) {
    console.error('[AuthService] verifyOTP error:', err);
    if (err.code === 'auth/invalid-verification-code') {
      return { error: 'Invalid OTP. Please check and try again.' };
    }
    if (err.code === 'auth/code-expired') {
      return { error: 'OTP has expired. Please request a new one.' };
    }
    return { error: 'Verification failed. Please try again.' };
  }
}

// ─── Backend integration ──────────────────────────────────────────────────────

async function callBackendWithToken(
  firebaseIdToken: string,
  role: UserRole,
): Promise<ServiceResult<AppUser>> {
  try {
    const roleMap: Record<string, string> = {
      owner: 'salon_admin',
      admin: 'super_admin',
      customer: 'customer',
    };
    const res = await apiClient.post('/auth/verify-firebase', {
      firebaseToken: firebaseIdToken,
      role: roleMap[role] ?? role,
    });
    const { user, tokens } = res.data.data;
    setAccessToken(tokens.accessToken);
    const appUser: AppUser = {
      uid: user._id,
      phone: user.phone,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      role,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      mongoId: user._id,
      createdAt: new Date(user.createdAt).getTime(),
      updatedAt: new Date(user.updatedAt).getTime(),
    };
    return { data: appUser };
  } catch (err: any) {
    console.error('[AuthService] backend callBackendWithToken error:', err.response?.data ?? err.message);
    return { error: err.response?.data?.message ?? 'Backend authentication failed.' };
  }
}

// Dev bypass — call backend directly with phone number (no Firebase token)
async function callBackendWithPhone(
  phone: string,
  role: UserRole,
): Promise<ServiceResult<AppUser>> {
  try {
    // Super admin must log in via dedicated email/password screen, not phone+OTP.
    const res = await apiClient.post('/auth/dev-phone', { phone, role });
    const { user, tokens } = res.data.data;
    setAccessToken(tokens.accessToken);
    const appUser: AppUser = {
      uid: user._id,
      phone: user.phone ?? phone,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      role,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      mongoId: user._id,
      createdAt: new Date(user.createdAt).getTime(),
      updatedAt: new Date(user.updatedAt).getTime(),
    };
    return { data: appUser };
  } catch (err: any) {
    console.error('[AuthService] callBackendWithPhone error:', err.response?.data ?? err.message);
    return { error: err.response?.data?.message ?? 'Dev login failed.' };
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function fetchUserProfile(): Promise<ServiceResult<AppUser>> {
  try {
    const res = await apiClient.get('/auth/me');
    const user = res.data.data;
    const appUser: AppUser = {
      uid: user._id,
      phone: user.phone,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      role: user.role === 'salon_admin' ? 'owner' : user.role === 'super_admin' ? 'admin' : 'customer',
      mongoId: user._id,
      createdAt: new Date(user.createdAt).getTime(),
      updatedAt: new Date(user.updatedAt).getTime(),
    };
    return { data: appUser };
  } catch (err: any) {
    return { error: err.response?.data?.message ?? 'Failed to fetch profile.' };
  }
}

export async function updateUserProfile(
  updates: { name?: string; fcmToken?: string },
): Promise<ServiceResult<void>> {
  try {
    const payload: Record<string, string> = {};
    if (updates.name) {
      const parts = updates.name.trim().split(' ');
      payload.firstName = parts[0];
      payload.lastName = parts.slice(1).join(' ') || parts[0];
    }
    if (updates.fcmToken) payload.fcmToken = updates.fcmToken;
    await apiClient.patch('/auth/profile', payload);
    return {};
  } catch (err: any) {
    return { error: err.response?.data?.message ?? 'Failed to update profile.' };
  }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  clearPendingConfirmation();
  setAccessToken(null);
  try {
    await auth().signOut();
  } catch {
    // Firebase signout can fail if not signed in — ignore
  }
}

// ─── Auth State Listener (Firebase phone auth state only) ────────────────────

export function onAuthStateChange(
  callback: (user: FirebaseAuthTypes.User | null) => void,
) {
  return auth().onAuthStateChanged(callback);
}
