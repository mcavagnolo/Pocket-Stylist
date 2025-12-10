import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';

// User Settings (API Key)
export const saveUserSettings = async (userId, settings) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, settings, { merge: true });
};

export const getUserSettings = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const docSnap = getDoc(userRef);
  if ((await docSnap).exists()) {
    return (await docSnap).data();
  }
  return null;
};

// Closet Items
export const addItemToDb = async (userId, item) => {
  const itemsRef = collection(db, 'users', userId, 'closet');
  const docRef = await addDoc(itemsRef, item);
  return { ...item, id: docRef.id };
};

export const getUserItems = async (userId) => {
  const itemsRef = collection(db, 'users', userId, 'closet');
  const q = query(itemsRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateItemInDb = async (userId, itemId, updates) => {
  const itemRef = doc(db, 'users', userId, 'closet', itemId);
  await updateDoc(itemRef, updates);
};

export const deleteItemFromDb = async (userId, itemId) => {
  const itemRef = doc(db, 'users', userId, 'closet', itemId);
  await deleteDoc(itemRef);
};

// Schedule
export const saveScheduleToDb = async (userId, date, outfitData) => {
  // Using date string YYYY-MM-DD as ID for simplicity, or auto-ID
  const scheduleRef = doc(db, 'users', userId, 'schedule', date);
  await setDoc(scheduleRef, { date, ...outfitData }, { merge: true });
};

export const getUserSchedule = async (userId) => {
  const scheduleRef = collection(db, 'users', userId, 'schedule');
  const q = query(scheduleRef);
  const querySnapshot = await getDocs(q);
  const schedule = {};
  querySnapshot.forEach(doc => {
    schedule[doc.id] = doc.data();
  });
  return schedule;
};
