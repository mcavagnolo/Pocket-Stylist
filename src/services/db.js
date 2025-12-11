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
  getDocs,
  limit,
  orderBy,
  startAfter,
  onSnapshot
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

// Real-time subscription
export const subscribeToUserItems = (userId, callback) => {
  const itemsRef = collection(db, 'users', userId, 'closet');
  const q = query(itemsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(items);
  });
};

// Closet Items
export const addItemToDb = async (userId, item) => {
  console.log('addItemToDb called for user:', userId);
  try {
    // Use setDoc with a generated ID instead of addDoc for better reliability
    const itemsRef = collection(db, 'users', userId, 'closet');
    const newDocRef = doc(itemsRef); // Generate ID client-side
    console.log('Generated ID:', newDocRef.id);
    
    console.log('Writing document to Firestore (setDoc)...');
    await setDoc(newDocRef, item);
    console.log('Document written successfully');
    
    return { ...item, id: newDocRef.id };
  } catch (error) {
    console.error('Error in addItemToDb:', error);
    throw error;
  }
};

export const getUserItems = async (userId) => {
  const itemsRef = collection(db, 'users', userId, 'closet');
  const q = query(itemsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPagedUserItems = async (userId, lastDoc = null, pageSize = 12) => {
  const itemsRef = collection(db, 'users', userId, 'closet');
  let q;
  
  if (lastDoc) {
    q = query(itemsRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
  } else {
    q = query(itemsRef, orderBy('createdAt', 'desc'), limit(pageSize));
  }
  
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  
  return { items, lastVisible };
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
