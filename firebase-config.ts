import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import admin from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Silence gRPC idle stream warnings
setLogLevel('error');

// Read config safely and synchronously
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.warn('[Firebase] ⚠️ firebase-applet-config.json not found. Falling back to environment variables.');
  }
} catch (err: any) {
  console.error('[Firebase] ❌ Failed to read firebase-applet-config.json:', err.message);
}

const configProjectId = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;
const configDatabaseId = firebaseConfig.firestoreDatabaseId;

// Client SDK Initialization
const app = initializeApp(firebaseConfig);

// Use firestoreDatabaseId from config and enable long polling
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
}, configDatabaseId);

export const auth = getAuth(app);

// Admin SDK Initialization
const adminApp = admin.apps.length === 0 
  ? admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: configProjectId,
    })
  : admin.apps[0]!;

// Get Firestore instance using the standard getAdminFirestore utility
const effectiveDatabaseId = (configDatabaseId && configDatabaseId !== '(default)') ? configDatabaseId : undefined;

export const adminDb = effectiveDatabaseId 
  ? getAdminFirestore(adminApp, effectiveDatabaseId)
  : getAdminFirestore(adminApp);

console.log(`[Firebase] ✅ Admin SDK authorized for project: ${configProjectId} (Database: ${effectiveDatabaseId || 'default'})`);
