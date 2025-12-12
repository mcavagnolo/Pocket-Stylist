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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

let dbInstance = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
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

export const clearCache = async () => {
  try {
    const d = getDb();
    await terminate(d);
    await clearIndexedDbPersistence(d);
    window.location.reload();
  } catch (error) {
    console.error('Error clearing cache:', error);
    window.location.reload();
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
