import admin from 'firebase-admin';
import { env } from './environment';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebase = (): admin.app.App => {
  try {
    if (firebaseApp) {
      return firebaseApp;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Firebase Admin SDK initialization failed:', error);
    throw error;
  }
};

/**
 * Get Firebase Admin instance
 */
export const getFirebaseAdmin = (): admin.app.App => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

/**
 * Get Firebase Messaging instance
 */
export const getFirebaseMessaging = (): admin.messaging.Messaging => {
  const app = getFirebaseAdmin();
  return admin.messaging(app);
};

/**
 * Verify Firebase ID token
 */
export const verifyFirebaseToken = async (
  idToken: string
): Promise<admin.auth.DecodedIdToken> => {
  try {
    const app = getFirebaseAdmin();
    return await admin.auth(app).verifyIdToken(idToken);
  } catch (error) {
    logger.error('Firebase token verification failed:', error);
    throw new Error('Invalid Firebase token');
  }
};

export default {
  initializeFirebase,
  getFirebaseAdmin,
  getFirebaseMessaging,
  verifyFirebaseToken,
};
