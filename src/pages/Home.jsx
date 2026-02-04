import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getFavoriteOutfits, deleteFavoriteOutfit } from '../services/db';
import { useCloset } from '../context/ClosetContext';
import { FaTrash, FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa';
import TooltipModal from '../components/TooltipModal';

export default function Home() {
  const { currentUser } = useAuth();
  const { items, addToSchedule, schedule } = useCloset();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem('hasSeenHomeTooltip');
    if (!hasSeenTooltip) {
      setShowTooltip(true);
      localStorage.setItem('hasSeenHomeTooltip', 'true');
    }
  }, []);

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

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this favorite?")) {
        try {
            await deleteFavoriteOutfit(currentUser.uid, id);
            setFavorites(prev => prev.filter(f => f.id !== id));
        } catch (error) {
            console.error("Error removing favorite:", error);
            alert("Failed to remove favorite.");
        }
    }
  };

  const handleSchedule = (outfit) => {
    setSelectedOutfit(outfit);
    setShowDateModal(true);
  };

  const confirmSchedule = (date) => {
    if (selectedOutfit && date) {
      // Check if date is already booked is handled in UI but we force it here too
      if (schedule && schedule[date]) {
         if (!window.confirm("This date already has an outfit. Overwrite?")) return;
      }
      addToSchedule(date, selectedOutfit.items);
      setShowDateModal(false);
      setSelectedOutfit(null);
      alert("Outfit scheduled!");
    }
  };

  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  return (
    <ScrollView style={{flex: 1}} contentContainerStyle={styles.container}>
      
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
         <Text style={styles.title}>Home</Text>
         <TouchableOpacity onPress={() => setShowTooltip(true)} style={{marginLeft: 8}}>
             <FaInfoCircle size={16} color="#FF4081" />
         </TouchableOpacity>
      </View>

      <TooltipModal 
        visible={showTooltip} 
        onClose={() => setShowTooltip(false)}
        title="Welcome Home!"
        content="Here are your saved favorite outfits. You can view details, schedule them for specific dates, or remove them."
      />

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
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.favName}>{fav.name || "Untitled Outfit"}</Text>
                  </View>
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

                <View style={styles.summaryContainer}>
                    <TouchableOpacity onPress={() => toggleExpand(fav.id)} style={styles.expandRow}>
                        <Text style={styles.expandText}>
                            {expandedItems[fav.id] ? "Hide Details" : "Show Details"}
                        </Text>
                        {expandedItems[fav.id] ? <FaChevronUp size={12} color="#666"/> : <FaChevronDown size={12} color="#666"/>}
                    </TouchableOpacity>
                    {expandedItems[fav.id] && (
                        <Text style={styles.cardSummary}>{fav.summary}</Text>
                    )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <View style={styles.dateList}>
                {getNext7Days().map(date => {
                    const isBooked = schedule && schedule[date];
                    const dateObj = new Date(date);
                    const label = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    
                    return (
                        <TouchableOpacity 
                            key={date} 
                            style={[styles.dateOption, isBooked && styles.bookedDate]} 
                            onPress={() => confirmSchedule(date)}
                        >
                            <Text style={[styles.dateOptionText, isBooked && styles.bookedDateText]}>{label}</Text>
                            {isBooked ? <Text style={styles.bookedTag}>Booked</Text> : <Text style={styles.availableTag}>Available</Text>}
                        </TouchableOpacity>
                    );
                })}
            </View>
            <TouchableOpacity style={[styles.button, styles.cancelButton, {marginTop: 10}]} onPress={() => setShowDateModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  dateList: {
    gap: 8,
    maxHeight: 300,
    overflow: 'auto',
  },
  dateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    cursor: 'pointer',
  },
  bookedDate: {
    backgroundColor: '#fff0f0',
    borderColor: '#ffcccb',
  },
  dateOptionText: {
    fontSize: 14,
    color: '#333',
  },
  bookedDateText: {
    color: '#d32f2f',
  },
  availableTag: {
    fontSize: 12,
    color: 'green',
    fontWeight: 'bold',
  },
  bookedTag: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#eee',
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
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 'bold',
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
    marginBottom: 5,
    alignItems: 'center',
  },
  favName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
  },
  expandText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  cardSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 5,
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
    width: 105,
    height: 105,
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
