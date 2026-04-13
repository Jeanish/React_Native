/**
 * TrimCity — Firebase Initialization
 *
 * IMPORTANT: Replace placeholder values below with your real Firebase project
 * config from the Firebase Console (Project Settings → Your apps → Config).
 * Never commit real API keys to a public repository.
 * Use environment variables or a secrets manager in production.
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  Firestore,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Firebase Config ──────────────────────────────────────────────────────────
// Replace these with values from your Firebase Console.
const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID',
};

// ─── Singleton Initialization ────────────────────────────────────────────────
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);

    // Auth with AsyncStorage persistence (survives app restarts)
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

    db = getFirestore(app);
    storage = getStorage(app);

    // Offline persistence (so cached data shows without internet)
    enableIndexedDbPersistence(db).catch(err => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open; persistence only works in one tab at a time.
        console.warn('[Firebase] Offline persistence: failed-precondition');
      } else if (err.code === 'unimplemented') {
        // Browser does not support IndexedDB
        console.warn('[Firebase] Offline persistence: unimplemented');
      }
    });
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
}

initFirebase();

export { app, auth, db, storage };

// ─── Firestore Collection Names ───────────────────────────────────────────────
export const Collections = {
  USERS: 'users',
  SALONS: 'salons',
  APPOINTMENTS: 'appointments',
  CITY_STATS: 'city_stats',
  NOTIFICATIONS: 'notifications',
} as const;

// ─── Firestore Document IDs ───────────────────────────────────────────────────
export const DocIds = {
  CITY_STATS: 'global',
} as const;
