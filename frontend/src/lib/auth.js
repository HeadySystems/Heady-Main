// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: frontend/src/lib/auth.js
// LAYER: frontend/lib
// Firebase Auth Integration
// HEADY_BRAND:END

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged as firebaseOnAuth,
} from 'firebase/auth';
import { api } from './heady-api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBLTu0h9Q09Cr05_3_Zj_3yent5cO3iaHE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'heady-ai.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'heady-ai',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google OAuth
 * Sets JWT on the API client automatically
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  api.setToken(idToken);
  return {
    uid: result.user.uid,
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
    token: idToken,
  };
}

/**
 * Sign out
 */
export async function signOut() {
  await firebaseSignOut(auth);
  api.setToken(null);
}

/**
 * Auth state observer
 * Automatically syncs JWT with the API client
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuth(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken();
      api.setToken(token);
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        authenticated: true,
      });
    } else {
      api.setToken(null);
      callback({ authenticated: false });
    }
  });
}

/**
 * Get current user (sync)
 */
export function getCurrentUser() {
  return auth.currentUser;
}

export { auth };
