import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  clearIndexedDbPersistence
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

let dbInstance = null;

export const getDb = () => {
  if (!dbInstance) {
    console.log("Initializing Firestore (Lazy)...");
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true,
    });
  }
  return dbInstance;
};

// Deprecated: For backward compatibility, but we should move away from this.
// We'll make it a getter that calls getDb() to avoid breaking imports immediately if we miss one,
// but ideally we replace all usages.
export const db = new Proxy({}, {
  get: function(target, prop) {
    return getDb()[prop];
  }
});

export const hardReconnect = async () => {
  console.log("Hard Reconnect: Terminating existing instance...");
  if (dbInstance) {
    try {
      await terminate(dbInstance);
    } catch (e) {
      console.warn("Termination warning:", e);
    }
    dbInstance = null;
  }
  console.log("Hard Reconnect: Re-initializing...");
  return getDb();
};

export const clearCache = async () => {
  try {
    console.log('Terminating Firestore...');
    const d = getDb();
    await terminate(d);
    console.log('Clearing persistence...');
    await clearIndexedDbPersistence(d);
    console.log('Persistence cleared. Reloading...');
    window.location.reload();
  } catch (error) {
    console.error('Failed to clear cache:', error);
    // Fallback: Try to nuke IndexedDB directly
    try {
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => window.indexedDB.deleteDatabase(db.name));
      window.location.reload();
    } catch (e) {
      alert('Manual Reset Required: Please clear your browser site data.');
    }
  }
};

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
