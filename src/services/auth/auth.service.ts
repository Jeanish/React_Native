// src/services/auth/auth.service.ts

import apiClient from '../api/client';
import { setAuthTokens } from '../api/client'; // assuming this exists to store tokens
import { GOOGLE_WEB_CLIENT_ID } from '@env';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { UserRole } from '../../types';

/**
 * Generic API result wrapper for service functions.
 */
export type APIResult<T> = { data?: T; error?: string };

/**
 * Request an OTP to be sent to the given email.
 * Returns an empty success result or an error message.
 */
export const requestOTP = async (email: string): Promise<APIResult<void>> => {
  try {
    await apiClient.post('/auth/send-otp', { email });
    return {};
  } catch (err: any) {
    return { error: err.response?.data?.message ?? err.message ?? 'Failed to send OTP' };
  }
};

/**
 * Verify the OTP for the provided email and role.
 * On success returns the authenticated user object.
 */
export const verifyOTP = async (
  email: string,
  otp: string,
  role: UserRole,
  fcmToken?: string,
): Promise<APIResult<any>> => {
  try {
    const res = await apiClient.post('/auth/verify-otp', { email, otp, role, fcmToken });
    const { accessToken, refreshToken, user } = res.data;
    await setAuthTokens(accessToken, refreshToken);
    return { data: user };
  } catch (err: any) {
    return { error: err.response?.data?.message ?? err.message ?? 'Failed to verify OTP' };
  }
};

/**
 * Perform Google Sign‑In and exchange the Firebase ID token for app tokens.
 * Returns the authenticated user object on success.
 */
export const googleSignIn = async (role: UserRole, fcmToken?: string): Promise<APIResult<any>> => {
  try {
    await GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.idToken;
    if (!idToken) {
      throw new Error('Google Sign-In failed to return an ID token.');
    }
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    const userCredential = await auth().signInWithCredential(googleCredential);
    const firebaseIdToken = await userCredential.user.getIdToken();
    const res = await apiClient.post('/auth/verify-firebase', { idToken: firebaseIdToken, role, fcmToken });
    const { accessToken, refreshToken, user } = res.data;
    await setAuthTokens(accessToken, refreshToken);
    return { data: user };
  } catch (err: any) {
    return { error: err.response?.data?.message ?? err.message ?? 'Google Sign‑In failed' };
  }
};
