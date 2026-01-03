import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

// Initialize Firebase Admin SDK (singleton pattern)
if (!getApps().length) {
  console.log('[FIREBASE-ADMIN] Initializing Firebase Admin SDK');
  console.log('[FIREBASE-ADMIN] Project ID:', process.env.FIREBASE_ADMIN_PROJECT_ID);
  console.log('[FIREBASE-ADMIN] Client Email:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  console.log('[FIREBASE-ADMIN] Private Key present:', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);
  console.log('[FIREBASE-ADMIN] Private Key length:', process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length);
  console.log('[FIREBASE-ADMIN] Private Key starts with:', process.env.FIREBASE_ADMIN_PRIVATE_KEY?.substring(0, 30));

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  console.log('[FIREBASE-ADMIN] Private Key after replace, length:', privateKey?.length);
  console.log('[FIREBASE-ADMIN] Private Key after replace, starts with:', privateKey?.substring(0, 30));

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.log('[FIREBASE-ADMIN] Firebase Admin initialized successfully');
  } catch (error) {
    console.error('[FIREBASE-ADMIN] Error initializing Firebase Admin:', error);
    throw error;
  }
} else {
  adminApp = getApps()[0];
  console.log('[FIREBASE-ADMIN] Using existing Firebase Admin app');
}

// Export admin services
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export { adminApp };
