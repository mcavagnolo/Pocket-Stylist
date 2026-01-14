import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getFavoriteOutfits, deleteFavoriteOutfit } from '../services/db';
import { useCloset } from '../context/ClosetContext';
import { FaTrash } from 'react-icons/fa';

export default function Home() {
  const { currentUser } = useAuth();
  const { items, addToSchedule } = useCloset();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function loadFavorites() {
      if (currentUser) {
        setLoading(true);
        try {
          const favs = await getFavoriteOutfits(currentUser.uid);
          setFavorites(favs);
        } catch (error) {
          console.error("Failed to load favorites", error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadFavorites();
  }, [currentUser]);

  const getItemDetails = (id) => items.find(i => i.id === id);

  const handleSchedule = (outfit) => {
    setSelectedOutfit(outfit);
    setShowDateModal(true);
  };

  const confirmSchedule = () => {
    if (selectedOutfit && selectedDate) {
      addToSchedule(selectedDate, selectedOutfit.items);
      setShowDateModal(false);
      setSelectedOutfit(null);
      alert("Outfit scheduled!");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pocket Stylist</Text>
      
      {!currentUser && (
        <Text style={styles.welcomeText}>Welcome! Log in to see your favorite styles.</Text>
      )}

      {currentUser && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Outfits</Text>
          {loading ? (
            <ActivityIndicator />
          ) : favorites.length === 0 ? (
            <Text style={styles.emptyText}>No favorite outfits yet. Go to Style page to generate some!</Text>
          ) : (
            favorites.map((fav) => (
              <View key={fav.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardSummary}>{fav.summary}</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity onPress={() => handleSchedule(fav)} style={styles.scheduleBtn}>
                        <Text style={styles.scheduleBtnText}>Schedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(fav.id)} style={styles.deleteBtn}>
                        <FaTrash size={16} color="#999" />
                    </TouchableOpacity>
                  </View>
                </View>
                {fav.context && (
                    <Text style={styles.contextText}>
                        {fav.context.destination} • {fav.context.style}
                    </Text>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                  {fav.items && fav.items.map(itemId => {
                    const item = getItemDetails(itemId);
                    if (!item) return null;
                    return (
                      <View key={itemId} style={styles.itemPreview}>
                        <Image source={{ uri: item.imageUri || item.image }} style={styles.itemImage} />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ))
          )}
        </View>
      )}

      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={styles.dateInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setShowDateModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={confirmSchedule}>
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100, // Extra padding for navbar
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  dateInput: {
    width: '100%',
    padding: 10,
    marginBottom: 20,
    border: '1px solid #ddd',
    borderRadius: 5,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  scheduleBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 10,
  },
  scheduleBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  welcomeText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#444',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: 5,
  },
  cardSummary: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  deleteText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
    padding: 5,
  },
  contextText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  itemsRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  itemPreview: {
    marginRight: 10,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    marginTop: 20,
  },
});
