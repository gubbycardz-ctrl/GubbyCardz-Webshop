import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserPopupRedirectResolver,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  initializeAuth,
  signInWithPopup,
  signOut,
} from "firebase/auth";

/**
 * Signs in with a Google popup and returns a fresh ID token for the server.
 * The browser keeps no login state: the server's session cookie is the only source of truth.
 */
export async function signInWithGoogle(): Promise<string> {
  const auth = clientAuth();
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
  const idToken = await user.getIdToken();
  await signOut(auth);
  return idToken;
}

function clientAuth() {
  if (getApps().length > 0) return getAuth(getApp());

  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  const auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost) connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
  return auth;
}
