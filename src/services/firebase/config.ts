/**
 * TrimCity — Firebase Initialization
 *
 * IMPORTANT: Replace placeholder values below with your real Firebase project
 * config from the Firebase Console (Project Settings → Your apps → Config).
 * Never commit real API keys to a public repository.
 * Use environment variables or a secrets manager in production.
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// ─── Firebase Config ──────────────────────────────────────────────────────────
// Replace these with values from your Firebase Console.
const firebaseConfig = {
  apiKey: 'AIzaSyDuCaZFwfQOMcPG9mr_ksGFQd86BHGIw5c',
  authDomain: 'trimcity-d5937.firebaseapp.com',
  projectId: 'trimcity-d5937',
  storageBucket: 'trimcity-d5937.firebasestorage.app',
  messagingSenderId: '19430608767',
  appId: '1:19430608767:android:10f618ad7a5f4eeb0f544a',
};

// ─── Singleton Initialization ────────────────────────────────────────────────
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

function initFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    // initializeFirestore must only be called once — use getFirestore on subsequent renders
    db = initializeFirestore(app, { localCache: persistentLocalCache() });
  } else {
    app = getApp();
    db = getFirestore(app);
  }
  storage = getStorage(app);
}

initFirebase();

export { app, db, storage };

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
