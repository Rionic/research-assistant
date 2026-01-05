import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;

// Lazy initialization function - only initializes when first called
function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  console.log('[FIREBASE-ADMIN] Initializing Firebase Admin SDK');

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.log('[FIREBASE-ADMIN] Firebase Admin initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('[FIREBASE-ADMIN] Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Export admin services with lazy initialization
export const adminDb = new Proxy({} as Firestore, {
  get(target, prop) {
    const db = getFirestore(getAdminApp());
    const value = (db as any)[prop];
    return typeof value === 'function' ? value.bind(db) : value;
  }
});

export const adminAuth = new Proxy({} as Auth, {
  get(target, prop) {
    const auth = getAuth(getAdminApp());
    const value = (auth as any)[prop];
    return typeof value === 'function' ? value.bind(auth) : value;
  }
});

export { getAdminApp as adminApp };
