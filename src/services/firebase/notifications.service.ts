/**
 * Push notification service.
 *
 * Responsibilities:
 *  1. Ask the user for notification permission (Android 13+ / iOS).
 *  2. Fetch the FCM token and ship it to the backend so it can target this device.
 *  3. Display foreground notifications via Notifee (FCM only delivers to system
 *     tray when the app is in background/quit; foreground requires manual show).
 *  4. Subscribe to token refresh so a rotated token still reaches the backend.
 *
 * Initialise once after login by calling `initPushNotifications()`.
 * Tear down on logout by calling `teardownPushNotifications()`.
 */
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import apiClient from '../api/client';

const CHANNEL_ID = 'trimcity-default';
const CHANNEL_NAME = 'TrimCity bookings';

let _onMessageUnsub: (() => void) | null = null;
let _onTokenRefreshUnsub: (() => void) | null = null;
let _foregroundEventUnsub: (() => void) | null = null;
let _initialised = false;

/** Ask for notification permission. Returns true on grant. */
async function requestNotificationPermission(): Promise<boolean> {
  // Android 13+ needs runtime POST_NOTIFICATIONS prompt; below 13 is granted at install.
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  const settings = await messaging().requestPermission();
  return (
    settings === messaging.AuthorizationStatus.AUTHORIZED ||
    settings === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/** Create the Android notification channel (no-op on iOS, idempotent on Android). */
async function ensureChannel(): Promise<string> {
  return notifee.createChannel({
    id: CHANNEL_ID,
    name: CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

/** Display a foreground message using Notifee. */
async function displayForegroundNotification(message: FirebaseMessagingTypes.RemoteMessage) {
  const title = message.notification?.title ?? message.data?.title ?? 'TrimCity';
  const body = message.notification?.body ?? message.data?.body ?? '';
  if (!title && !body) return;
  await notifee.displayNotification({
    title: String(title),
    body: String(body),
    android: { channelId: CHANNEL_ID, smallIcon: 'ic_launcher', pressAction: { id: 'default' } },
    data: (message.data as Record<string, string>) ?? {},
  });
}

/** Send the device's FCM token to the backend so it can target this user. */
async function syncTokenToBackend(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await apiClient.patch('/auth/profile', { fcmToken: token });
  } catch (err: any) {
    // Non-fatal: backend rejection shouldn't crash the app. Just log it.
    console.warn('[Notifications] failed to sync FCM token:', err?.response?.data ?? err?.message);
  }
}

/**
 * Wire up push notifications. Safe to call repeatedly; only initialises once.
 * Call after the user is authenticated, since we POST the token to /auth/profile.
 */
export async function initPushNotifications(): Promise<void> {
  if (_initialised) return;

  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.log('[Notifications] permission denied — push notifications will not be delivered');
      return;
    }

    await ensureChannel();

    // Fetch current token and push to backend.
    const token = await messaging().getToken();
    if (token) await syncTokenToBackend(token);

    // Token can rotate — keep backend in sync.
    _onTokenRefreshUnsub = messaging().onTokenRefresh(syncTokenToBackend);

    // Foreground messages: FCM only shows tray notifications in background.
    _onMessageUnsub = messaging().onMessage(displayForegroundNotification);

    // Optional: react to user tapping a notification while app is foregrounded.
    _foregroundEventUnsub = notifee.onForegroundEvent(({ type }) => {
      if (type === EventType.PRESS) {
        // Hook for deep linking. Read `detail.notification.data` for routing.
      }
    });

    _initialised = true;
  } catch (err: any) {
    console.warn('[Notifications] init failed:', err?.message ?? err);
  }
}

/** Clean up listeners. Call on logout. */
export async function teardownPushNotifications(): Promise<void> {
  _onMessageUnsub?.();
  _onTokenRefreshUnsub?.();
  _foregroundEventUnsub?.();
  _onMessageUnsub = null;
  _onTokenRefreshUnsub = null;
  _foregroundEventUnsub = null;
  _initialised = false;
  // Best-effort: drop the token from backend so it stops receiving for this user.
  try {
    await apiClient.patch('/auth/profile', { fcmToken: null });
  } catch {
    // ignore
  }
  try {
    await messaging().deleteToken();
  } catch {
    // ignore
  }
}

/**
 * Register a background message handler. MUST be called from index.js
 * (top-level, before AppRegistry.registerComponent), per FCM requirements.
 */
export function registerBackgroundHandler(): void {
  messaging().setBackgroundMessageHandler(async () => {
    // FCM auto-shows tray notifications for `notification` payloads in background;
    // data-only payloads can be processed here (e.g. precaching).
  });
}
