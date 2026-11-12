import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const OAUTH_CLIENT_ID = '983493583550-1fmoqti8e578136hfvkv9a1nak06rduu.apps.googleusercontent.com';

// Suppress noisy internal @firebase/firestore WebChannel 10s transport timeout logs in preview iframes
try {
  setLogLevel('silent');
} catch {
  // Ignore if unsupported in test environment
}

// Ensure configuration strictly incorporates the designated OAuth Client ID
export const effectiveFirebaseConfig = {
  ...firebaseConfig,
  oAuthClientId: OAUTH_CLIENT_ID,
};

// Initialize the Firebase App instance using credentials from firebase-applet-config.json
export const app = initializeApp(effectiveFirebaseConfig);

// CRITICAL: Dedicated firestoreDatabaseId must be passed to initializeFirestore/getFirestore as specified in SKILL.md
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      effectiveFirebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, effectiveFirebaseConfig.firestoreDatabaseId);
  }
})();

// Firebase Authentication instance
export const auth = getAuth(app);

// Pre-configured Google Auth Provider for popup sign-in without redirection issues
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');
googleAuthProvider.addScope('openid');
googleAuthProvider.setCustomParameters({
  client_id: OAUTH_CLIENT_ID,
  prompt: 'select_account',
});

// Aliases and resolver for seamless auth workflows
export const googleProvider = googleAuthProvider;
export const popupResolver = browserPopupRedirectResolver;

export async function hasWorkingAuthToken(): Promise<boolean> {
  try {
    if (!auth.currentUser) return false;
    const token = await auth.currentUser.getIdToken(false);
    return Boolean(token);
  } catch {
    return false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore when authenticated without stalling offline/iframe preview boot
export async function testConnection(): Promise<void> {
  try {
    if (!auth.currentUser) return;
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Gracefully operate in offline/cached mode if backend is unreachable
  }
}

