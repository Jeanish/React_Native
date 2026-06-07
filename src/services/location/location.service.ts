/**
 * Device-location helper.
 *
 * Why this lives here: location access touches platform permissions, async APIs,
 * and the user's privacy. Centralising it means callers (Home screen, Salon Setup,
 * etc.) all go through the same permission UX and the same failure handling.
 *
 * Cost / security:
 *  - Uses @react-native-community/geolocation (free, no API keys, OS-provided GPS).
 *  - We NEVER ship coordinates to a third-party — only to our own backend.
 *  - We never log full coordinates (PII / location of residence).
 */
import Geolocation from '@react-native-community/geolocation';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const GEO_OPTIONS = {
  timeout: 15000,
  maximumAge: 60_000, // accept a 1-min-old fix to avoid a cold GPS lock
  enableHighAccuracy: false, // network/wi-fi is enough for "nearby" — saves battery
} as const;

/**
 * Ask for location permission. Returns true if granted.
 * On Android we go through PermissionsAndroid for the OS prompt.
 * iOS uses Geolocation.requestAuthorization (configured in Info.plist).
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Allow TrimCity to access location?',
          message: 'We use your location to show salons near you and to set your salon\'s address.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    // iOS
    return await new Promise<boolean>(resolve => {
      Geolocation.requestAuthorization(
        () => resolve(true),
        () => resolve(false),
      );
    });
  } catch {
    return false;
  }
}

/**
 * Get the current device coordinates. Returns null on denial or failure.
 * Caller decides what to do (e.g., show toast, fall back to default city).
 */
export function getCurrentCoords(): Promise<Coords | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      err => {
        // Don't log coords; just log the failure reason.
        console.warn('[Location] getCurrentPosition failed:', err.code, err.message);
        resolve(null);
      },
      GEO_OPTIONS,
    );
  });
}

/**
 * One-shot helper for screens: requests permission if not granted, then fetches.
 * If user denied earlier, offers to open Settings.
 */
export async function ensureCoords(opts?: { offerOpenSettings?: boolean }): Promise<Coords | null> {
  const granted = await requestLocationPermission();
  if (granted) return getCurrentCoords();
  if (opts?.offerOpenSettings) {
    Alert.alert(
      'Location needed',
      'Please enable location access in Settings to use this feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  }
  return null;
}
