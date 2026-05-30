/**
 * TrimCity — Authentication Service
 * Phone OTP via @react-native-firebase/auth (native module).
 *
 * Why native module instead of web SDK?
 *   The web Firebase SDK requires RecaptchaVerifier which needs a browser DOM.
 *   @react-native-firebase/auth handles app-attestation natively (no DOM needed).
 *   It is 100% FREE — Firebase Phone Auth has no charge up to 10,000 SMS/month.
 *
 * Setup (one-time):
 *   npm install @react-native-firebase/app @react-native-firebase/auth
 *   cd ios && pod install
 *   Place google-services.json  → android/app/google-services.json
 *   Place GoogleService-Info.plist → ios/<ProjectName>/GoogleService-Info.plist
 *   Firebase Console → Authentication → Sign-in method → Enable Phone
 */
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, Collections } from './config';
import type { AppUser, UserRole, ServiceResult } from '../../types';
import { sanitizePhoneNumber } from '../security/sanitizer';
import { validateIndianPhone } from '../security/validator';

// ─── Dev Bypass ───────────────────────────────────────────────────────────────
// In development, set DEV_BYPASS = true to skip real OTP entirely.
// Enter code "DEV999" in the OTP screen to proceed as a mock user.
const DEV_BYPASS = __DEV__ && false; // ← flip to true to skip real OTP in dev
const DEV_BYPASS_CODE = '999977';

// ─── Module-level confirmation store ─────────────────────────────────────────
// Firebase ConfirmationResult objects can't be serialised into nav params.
// Store it here between PhoneScreen → OTPScreen.
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

/**
 * Sends a 6-digit OTP to the given +91 number via Firebase Phone Auth.
 * Firebase handles the SMS — zero cost up to 10,000/month on Spark plan.
 */
export async function sendOTP(
  phoneNumber: string,
): Promise<ServiceResult<string>> {
  try {
    const cleaned = sanitizePhoneNumber(phoneNumber);
    if (!validateIndianPhone(cleaned)) {
      return { error: 'Invalid phone number. Must be a 10-digit Indian number.' };
    }

    const fullPhone = `+91${cleaned}`;

    // ── DEV BYPASS ────────────────────────────────────────────────────────────
    if (DEV_BYPASS) {
      _devBypassPhone = fullPhone;
      console.log('====================================');
      console.log('[DEV BYPASS] OTP skipped for:', fullPhone);
      console.log('[DEV BYPASS] Enter code →', DEV_BYPASS_CODE, '← in OTP screen');
      console.log('====================================');
      return { data: fullPhone };
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log('[AuthService] Sending OTP to:', fullPhone);
    const confirmation = await auth().signInWithPhoneNumber(fullPhone);
    console.log('[AuthService] OTP sent successfully to:', fullPhone);
    setPendingConfirmation(confirmation);

    return { data: fullPhone };
  } catch (err: any) {
    console.error('[AuthService] sendOTP error code:', (err as any).code);
    console.error('[AuthService] sendOTP error full:', JSON.stringify(err, null, 2));

    if (err.code === 'auth/too-many-requests') {
      return { error: 'Too many attempts. Please wait a few minutes and try again.' };
    }
    if (err.code === 'auth/invalid-phone-number') {
      return { error: 'Invalid phone number format.' };
    }
    if (err.code === 'auth/billing-not-enabled') {
      return { error: 'Billing not enabled. Use DEV_BYPASS mode or add a test number in Firebase Console.' };
    }
    return { error: `Failed to send OTP. Code: ${err.code ?? 'unknown'}` };
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

/**
 * Confirms the 6-digit OTP the user entered.
 * Uses the ConfirmationResult stored by sendOTP().
 */
export async function verifyOTP(
  _verificationId: string, // kept for API compatibility; native uses stored confirmation
  otp: string,
  role: UserRole,
): Promise<ServiceResult<AppUser>> {
  try {
    console.log('[AuthService] Verifying OTP:', otp, 'for id:', _verificationId);

    // ── DEV BYPASS ────────────────────────────────────────────────────────────
    if (DEV_BYPASS && otp === DEV_BYPASS_CODE) {
      console.log('[DEV BYPASS] Code accepted — signing in anonymously as dev user');
      const cred = await auth().signInAnonymously();
      const devUser: AppUser = {
        uid: cred.user.uid,
        phone: _devBypassPhone ?? '+910000000000',
        name: 'Dev User',
        role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      _devBypassPhone = null;
      console.log('[DEV BYPASS] Signed in as:', devUser.uid);
      return { data: devUser };
    }
    // ─────────────────────────────────────────────────────────────────────────

    const confirmation = getPendingConfirmation();
    if (!confirmation) {
      return { error: 'Session expired. Please request a new OTP.' };
    }

    const userCredential = await confirmation.confirm(otp);
    clearPendingConfirmation();

    if (!userCredential?.user) {
      return { error: 'Verification failed. Please try again.' };
    }

    const appUser = await upsertUserDocument(userCredential.user, role);
    return { data: appUser };
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

// ─── Upsert User Document ─────────────────────────────────────────────────────

async function upsertUserDocument(
  firebaseUser: FirebaseAuthTypes.User,
  role: UserRole,
): Promise<AppUser> {
  const userRef = doc(db, Collections.USERS, firebaseUser.uid);
  const existing = await getDoc(userRef);
  const now = Date.now();

  if (existing.exists()) {
    const data = existing.data() as AppUser;
    await updateDoc(userRef, { updatedAt: now });
    return { ...data, updatedAt: now };
  }

  const newUser: AppUser = {
    uid: firebaseUser.uid,
    phone: firebaseUser.phoneNumber ?? '',
    name: '',
    role,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(userRef, newUser);
  return newUser;
}

// ─── Get Current User from Firestore ─────────────────────────────────────────

export async function fetchUserProfile(uid: string): Promise<AppUser | null> {
  try {
    const snap = await getDoc(doc(db, Collections.USERS, uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  } catch (err) {
    console.error('[AuthService] fetchUserProfile error:', err);
    return null;
  }
}

// ─── Update User Profile ──────────────────────────────────────────────────────

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<AppUser, 'name' | 'photoURL' | 'fcmToken'>>,
): Promise<ServiceResult<void>> {
  try {
    await updateDoc(doc(db, Collections.USERS, uid), {
      ...updates,
      updatedAt: Date.now(),
    });
    return {};
  } catch (err) {
    console.error('[AuthService] updateUserProfile error:', err);
    return { error: 'Failed to update profile.' };
  }
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  clearPendingConfirmation();
  await auth().signOut();
}

// ─── Auth State Listener ──────────────────────────────────────────────────────

export function onAuthStateChange(
  callback: (user: FirebaseAuthTypes.User | null) => void,
) {
  return auth().onAuthStateChanged(callback);
}
