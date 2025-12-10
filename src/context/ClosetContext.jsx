import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  getUserItems, 
  addItemToDb, 
  updateItemInDb, 
  deleteItemFromDb,
  getUserSchedule, 
  saveScheduleToDb 
} from '../services/db';

const ClosetContext = createContext();

export function useCloset() {
  return useContext(ClosetContext);
}

export function ClosetProvider({ children }) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const fetchData = async () => {
        try {
          const userItems = await getUserItems(currentUser.uid);
          setItems(userItems);
          const userSchedule = await getUserSchedule(currentUser.uid);
          setSchedule(userSchedule);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setItems([]);
      setSchedule({});
      setLoading(false);
    }
  }, [currentUser]);

  // Function to add a new item
  const addItem = async (item) => {
    if (!currentUser) return;
    try {
      const newItem = await addItemToDb(currentUser.uid, {
        ...item,
        rating: 3, // Default rating
        wearCount: 0,
        createdAt: new Date().toISOString()
      });
      setItems((prevItems) => [...prevItems, newItem]);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  // Function to update an item
  const updateItem = async (id, updates) => {
    if (!currentUser) return;
    try {
      await updateItemInDb(currentUser.uid, id, updates);
      setItems((prevItems) =>
        prevItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // Function to delete an item
  const deleteItem = async (id) => {
    if (!currentUser) return;
    try {
      await deleteItemFromDb(currentUser.uid, id);
      setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Function to add an outfit to the schedule
  const addToSchedule = async (date, outfitData) => {
    if (!currentUser) return;
    try {
      await saveScheduleToDb(currentUser.uid, date, outfitData);
      setSchedule(prev => ({
        ...prev,
        [date]: outfitData
      }));
    } catch (error) {
      console.error("Error saving schedule:", error);
    }
  };

  // Function to mark an outfit as worn (triggers refresh cycle)
  const markAsWorn = async (itemIds, date = new Date()) => {
    if (!currentUser) return;
    const wornDate = new Date(date).toISOString();
    
    // Update local state first for responsiveness
    setItems(prevItems => 
      prevItems.map(item => {
        if (itemIds.includes(item.id)) {
          return { 
            ...item, 
            lastWorn: wornDate,
            wearCount: (item.wearCount || 0) + 1
          };
        }
        return item;
      })
    );

    // Update DB
    for (const id of itemIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        await updateItemInDb(currentUser.uid, id, {
          lastWorn: wornDate,
          wearCount: (item.wearCount || 0) + 1
        });
      }
    }
  };

  // Function to check availability based on refresh cycle
  const isItemAvailable = (item) => {
    if (!item.lastWorn) return true;
    const lastWornDate = new Date(item.lastWorn);
    const availableDate = new Date(lastWornDate);
    availableDate.setDate(lastWornDate.getDate() + (item.refreshCycle || 1)); // Default 1 day if missing
    return new Date() >= availableDate;
  };

  const value = {
    items,
    schedule,
    loading,
    addItem,
    updateItem,
    deleteItem,
    addToSchedule,
    markAsWorn,
    isItemAvailable,
  };

  return (
    <ClosetContext.Provider value={value}>
      {children}
    </ClosetContext.Provider>
  );
}
