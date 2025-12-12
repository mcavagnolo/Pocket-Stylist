import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeToUserItems,
  addItemToDb, 
  updateItemInDb, 
  deleteItemFromDb,
  getUserSchedule, 
  saveScheduleToDb 
} from '../services/db';
import { uploadImageToStorage } from '../services/storage';

const ClosetContext = createContext();

export function useCloset() {
  return useContext(ClosetContext);
}

export function ClosetProvider({ children }) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

  // Real-time subscription to Firestore
  useEffect(() => {
    if (currentUser) {
      const unsubscribe = subscribeToUserItems(currentUser.uid, (newItems) => {
        setItems(newItems);
        setLoading(false);
      });

      // Fetch schedule separately (can be made real-time later if needed)
      getUserSchedule(currentUser.uid).then(setSchedule);

      return () => unsubscribe();
    } else {
      setItems([]);
      setSchedule({});
      setLoading(false);
    }
  }, [currentUser]);

  // Function to add a new item
  const addItem = async (item) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    // Optimistic update
    const tempId = Date.now().toString();
    const tempItem = {
      ...item,
      id: tempId,
      rating: 3,
      wearCount: 0,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };
    
    setItems((prevItems) => [tempItem, ...prevItems]);

    try {
      let imageUrl = item.imageUri;
      
      // Upload to storage
      if (item.imageUri && item.imageUri.startsWith('data:')) {
        imageUrl = await uploadImageToStorage(currentUser.uid, item.imageUri);
      }

      const newItemData = {
        ...item,
        imageUri: imageUrl,
        rating: 3,
        wearCount: 0,
        createdAt: new Date().toISOString()
      };

      console.log("Saving item to DB. Size approx:", JSON.stringify(newItemData).length, "bytes");
      await addItemToDb(currentUser.uid, newItemData);
      
      // Remove temp item (real item comes via subscription)
      setItems(prev => prev.filter(i => i.id !== tempId));
      
    } catch (error) {
      console.error("Error adding item:", error);
      alert(`Failed to save item: ${error.message}. \nCheck console for details.`);
      setItems(prev => prev.filter(i => i.id !== tempId)); // Rollback
      throw error;
    }
  };

  // Function to update an item
  const updateItem = async (id, updates) => {
    if (!currentUser) return;
    // Optimistic update
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    try {
      await updateItemInDb(currentUser.uid, id, updates);
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // Function to delete an item
  const deleteItem = async (id) => {
    if (!currentUser) return;
    // Optimistic update
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    try {
      console.log("Deleting item from DB:", id);
      await deleteItemFromDb(currentUser.uid, id);
      console.log("Item deleted successfully:", id);
    } catch (error) {
      console.error("Error deleting item:", error);
      // Rollback if needed, but for deletion we usually just let it fail silently or show error
    }
  };

  // Schedule functions
  const addToSchedule = async (date, outfitData) => {
    if (!currentUser) return;
    setSchedule(prev => ({
      ...prev,
      [date]: { date, ...outfitData }
    }));
    try {
      await saveScheduleToDb(currentUser.uid, date, outfitData);
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  const isItemAvailable = (item) => {
    if (!item.lastWorn) return true;
    const lastWornDate = new Date(item.lastWorn);
    const today = new Date();
    const diffTime = Math.abs(today - lastWornDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 7;
  };

  const value = {
    items,
    schedule,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addToSchedule,
    isItemAvailable
  };

  return (
    <ClosetContext.Provider value={value}>
      {children}
    </ClosetContext.Provider>
  );
}
