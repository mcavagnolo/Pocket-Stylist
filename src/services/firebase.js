import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Debug config presence
if (!firebaseConfig.storageBucket) {
  console.error("CRITICAL: VITE_FIREBASE_STORAGE_BUCKET is missing from environment variables!");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Firestore
// We are temporarily disabling persistent cache to clear out any old bloated data
// that might be slowing down the app load.
// Re-enabling Force Long Polling to fix write timeouts on restrictive networks.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  // localCache: persistentLocalCache({
  //   tabManager: persistentMultipleTabManager()
  // })
});

export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signup = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};

export const resetPassword = (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const updateUserProfile = (user, data) => {
  return updateProfile(user, data);
};
