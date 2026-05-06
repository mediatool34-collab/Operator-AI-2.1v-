import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, setLogLevel, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence gRPC idle stream warnings
setLogLevel('error');

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable long polling to prevent gRPC timeout errors
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
}, (firebaseConfig as any).firestoreDatabaseId);

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message || 'Permission denied',
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        providerInfo: auth.currentUser?.providerData || [],
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
}

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};

export async function testConnection() {
  try {
    // Attempt to fetch a dummy doc to verify connection
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firebase connection verified");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    } else {
      // Missing permissions is expected for this dummy doc but confirms the rules/project are reachable
      console.log("Firebase reachable (permissions checked)");
    }
  }
}
