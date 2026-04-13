/**
 * TrimCity — Authentication Service
 * Phone OTP login via Firebase Auth (supports +91 Indian numbers).
 * Security: rate limiting awareness, input validation before API call.
 */
import {
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, Collections } from './config';
import type { AppUser, UserRole, ServiceResult } from '../../types';
import { sanitizePhoneNumber } from '../security/sanitizer';
import { validateIndianPhone } from '../security/validator';

// ─── Send OTP ─────────────────────────────────────────────────────────────────

/**
 * Sends OTP to a +91 Indian phone number.
 * Returns verificationId used to confirm OTP.
 */
export async function sendOTP(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<ServiceResult<string>> {
  try {
    const cleaned = sanitizePhoneNumber(phoneNumber);
    if (!validateIndianPhone(cleaned)) {
      return { error: 'Invalid phone number. Must be a 10-digit Indian number.' };
    }

    const fullPhone = `+91${cleaned}`;
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      fullPhone,
      recaptchaVerifier,
    );
    return { data: confirmationResult.verificationId };
  } catch (err: any) {
    console.error('[AuthService] sendOTP error:', err);
    if (err.code === 'auth/too-many-requests') {
      return { error: 'Too many attempts. Please try again later.' };
    }
    return { error: 'Failed to send OTP. Please check your number and try again.' };
  }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export async function verifyOTP(
  verificationId: string,
  otp: string,
  role: UserRole,
): Promise<ServiceResult<AppUser>> {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, otp);
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;

    // Upsert user document in Firestore
    const appUser = await upsertUserDocument(firebaseUser, role);
    return { data: appUser };
  } catch (err: any) {
    console.error('[AuthService] verifyOTP error:', err);
    if (err.code === 'auth/invalid-verification-code') {
      return { error: 'Invalid OTP. Please check and try again.' };
    }
    if (err.code === 'auth/code-expired') {
      return { error: 'OTP expired. Please request a new one.' };
    }
    return { error: 'Verification failed. Please try again.' };
  }
}

// ─── Upsert User Document ─────────────────────────────────────────────────────

async function upsertUserDocument(
  firebaseUser: User,
  role: UserRole,
): Promise<AppUser> {
  const userRef = doc(db, Collections.USERS, firebaseUser.uid);
  const existing = await getDoc(userRef);

  const now = Date.now();

  if (existing.exists()) {
    // Update FCM token and last seen
    const data = existing.data() as AppUser;
    await updateDoc(userRef, { updatedAt: now });
    return { ...data, updatedAt: now };
  }

  // Create new user
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
  await firebaseSignOut(auth);
}

// ─── Auth State Listener ──────────────────────────────────────────────────────

export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
