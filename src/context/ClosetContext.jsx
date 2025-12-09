import React, { createContext, useState, useContext, useEffect } from 'react';
import { initialItems } from '../data/mockData';

const ClosetContext = createContext();

export function useCloset() {
  return useContext(ClosetContext);
}

export function ClosetProvider({ children }) {
  const [items, setItems] = useState(initialItems);
  const [schedule, setSchedule] = useState({});

  // Function to add a new item
  const addItem = (item) => {
    setItems((prevItems) => [...prevItems, { ...item, id: Date.now().toString() }]);
  };

  // Function to update an item
  const updateItem = (id, updates) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Function to add an outfit to the schedule
  const addToSchedule = (date, itemIds) => {
    setSchedule(prev => ({
      ...prev,
      [date]: itemIds
    }));
  };

  // Function to mark an outfit as worn (triggers refresh cycle)
  const markAsWorn = (itemIds, date = new Date()) => {
    const wornDate = new Date(date).toISOString();
    setItems(prevItems => 
      prevItems.map(item => {
        if (itemIds.includes(item.id)) {
          return { ...item, lastWorn: wornDate };
        }
        return item;
      })
    );
  };

  // Function to check availability based on refresh cycle
  const isItemAvailable = (item) => {
    if (!item.lastWorn) return true;
    const lastWornDate = new Date(item.lastWorn);
    const availableDate = new Date(lastWornDate);
    availableDate.setDate(lastWornDate.getDate() + item.refreshCycle);
    return new Date() >= availableDate;
  };

  const value = {
    items,
    schedule,
    addItem,
    updateItem,
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
