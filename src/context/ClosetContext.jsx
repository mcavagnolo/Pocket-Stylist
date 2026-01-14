import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeToUserItems,
  addItemToDb, 
  updateItemInDb, 
  deleteItemFromDb,
  getUserSchedule, 
  saveScheduleToDb,
  deleteScheduleFromDb,
  getFavoriteOutfits,
  saveFavoriteOutfit,
  deleteFavoriteOutfit
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
  const [favorites, setFavorites] = useState([]);
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
      getFavoriteOutfits(currentUser.uid).then(setFavorites);

      return () => unsubscribe();
    } else {
      setItems([]);
      setSchedule({});
      setFavorites([]);
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
      await deleteItemFromDb(currentUser.uid, id);
    } catch (error) {
      console.error("Error deleting item:", error);
      // Rollback if needed, but for deletion we usually just let it fail silently or show error
    }
  };

  // Schedule functions
  const addToSchedule = async (date, items) => {
    if (!currentUser) return;
    
    // Structure: { date: "2024-01-01", items: ["id1", "id2"] }
    const scheduleEntry = { date, items };
    
    setSchedule(prev => ({
      ...prev,
      [date]: scheduleEntry
    }));

    try {
      // Pass { items } as outfitData so db saves { date, items: [...] }
      await saveScheduleToDb(currentUser.uid, date, { items });
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  const removeFromSchedule = async (date) => {
    if (!currentUser) return;
    const newSchedule = { ...schedule };
    delete newSchedule[date];
    setSchedule(newSchedule);
    try {
      await deleteScheduleFromDb(currentUser.uid, date);
    } catch (error) {
      console.error("Error removing from schedule:", error);
    }
  };

  const addFavorite = async (outfit) => {
    if (!currentUser) return;
    try {
      await saveFavoriteOutfit(currentUser.uid, outfit);
      const updated = await getFavoriteOutfits(currentUser.uid);
      setFavorites(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const removeFavorite = async (id) => {
      if (!currentUser) return;
      try {
          await deleteFavoriteOutfit(currentUser.uid, id);
          setFavorites(prev => prev.filter(f => f.id !== id));
      } catch (error) {
          console.error(error);
      }
  };

  const markAsWorn = async (itemIds, date) => {
    if (!currentUser || !itemIds) return;
    try {
        const promises = itemIds.map(id => updateItemInDb(currentUser.uid, id, { lastWorn: date }));
        await Promise.all(promises);
    } catch (error) {
        console.error("Error marking worn:", error);
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
    favorites,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addToSchedule,
    removeFromSchedule,
    addFavorite,
    removeFavorite,
    markAsWorn,
    isItemAvailable
  };

  return (
    <ClosetContext.Provider value={value}>
      {children}
    </ClosetContext.Provider>
  );
}
