import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { useCloset } from '../context/ClosetContext';
import { getWeatherForecast, getWeatherDescription, getLocationName } from '../services/weather';
import { generateOutfitSuggestions } from '../services/openai';
import { FaTrash } from 'react-icons/fa';
import { OCCASIONS, STYLES, TEMPS } from '../data/constants';

export default function Schedule() {
  const { schedule, items, addToSchedule, removeFromSchedule, favorites, addFavorite, isItemAvailable } = useCloset();
  const [weather, setWeather] = useState({});
  const [locationName, setLocationName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [criteria, setCriteria] = useState({ destination: '', style: '', temperature: '' });
  const [activeTab, setActiveTab] = useState('generate');

  useEffect(() => {
    const fetchWeather = async () => {
      let lat = 40.7128; // Default NY
      let lon = -74.0060;
      
      const fetchData = async (latitude, longitude) => {
          const forecast = await getWeatherForecast(latitude, longitude);
          if (forecast) setWeather(forecast);
          const name = await getLocationName(latitude, longitude);
          if (name) setLocationName(name);
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => fetchData(position.coords.latitude, position.coords.longitude),
            () => fetchData(lat, lon)
        );
      } else {
        fetchData(lat, lon);
      }
    };
    fetchWeather();
  }, []);

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        days.push(date.toISOString().split('T')[0]);
    }
    return days;
  }; 
  
  const getItemDetails = (id) => items.find(i => i.id === id);

  const openModal = (date) => {
    setSelectedDate(date);
    setSuggestions([]);
    setCriteria({ destination: '', style: '', temperature: '' });
    setActiveTab('generate');
    setModalVisible(true);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const dateWeather = weather[selectedDate];
      const tempStr = dateWeather ? `${dateWeather.max}°F / ${dateWeather.min}°F` : "Unknown";
      
      const availableItems = items.filter(isItemAvailable);
      
      const result = await generateOutfitSuggestions(availableItems, {
        destination: criteria.destination,
        temperature: criteria.temperature || tempStr,
        style: criteria.style
      });
      
      if (Array.isArray(result)) {
        setSuggestions(result);
      }
    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate outfits. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOutfit = (outfitItems) => {
    addToSchedule(selectedDate, outfitItems);
    setModalVisible(false);
  };

  const handleSaveFavorite = (outfit) => {
    // Save to favorites from the generated list
    addFavorite({
        items: outfit.items,
        name: outfit.name || "New Outfit",
        summary: outfit.summary,
        context: criteria
    });
    alert("Saved to favorites!");
  };

  const handleRemoveOutfit = (date) => {
    if (window.confirm("Remove this outfit from schedule?")) {
       removeFromSchedule(date);
    }
  };

  const days = getNext7Days();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
         <Text style={styles.title}>Outfit Schedule</Text>
         {locationName ? <Text style={styles.locationText}>📍 {locationName}</Text> : null}
      </View>
      
      {days.map(date => {
        const scheduleEntry = schedule[date];
        const outfitItemIds = scheduleEntry?.items || scheduleEntry?.itemIds;
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayWeather = weather[date];

        return (
          <View key={date} style={styles.dayCard}>
            <View style={styles.dateHeader}>
              <View>
                <Text style={styles.dayName}>{dayName}</Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
              {dayWeather && (
                <View style={styles.weatherContainer}>
                  <Text style={styles.weatherTemp}>{dayWeather.max}° / {dayWeather.min}°</Text>
                  <Text style={styles.weatherDesc}>{getWeatherDescription(dayWeather.code)}</Text>
                </View>
              )}
            </View>

            {outfitItemIds ? (
              <View style={styles.outfitContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                  {outfitItemIds.map((itemId, idx) => {
                    const item = getItemDetails(itemId);
                    if (!item) return null;
                    return (
                      <View key={`${itemId}-${idx}`} style={styles.itemPreview}>
                        <Image source={{ uri: item.imageUri || item.image }} style={styles.itemImage} />
                        <Text style={styles.itemType}>{item.type}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={styles.trashButton} onPress={() => handleRemoveOutfit(date)}>
                    <FaTrash size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ) : (
                <TouchableOpacity style={styles.addButton} onPress={() => openModal(date)}>
                  <Text style={styles.addButtonText}>Add Outfit</Text>
                </TouchableOpacity>
            )}
          </View>
        );
      })}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            Plan for {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
          </Text>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'generate' && styles.activeTab]} 
                onPress={() => setActiveTab('generate')}
            >
                <Text style={[styles.tabText, activeTab === 'generate' && styles.activeTabText]}>Generate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'favorites' && styles.activeTab]} 
                onPress={() => setActiveTab('favorites')}
            >
                <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>Favorites</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {activeTab === 'generate' ? (
                <>
                    <View style={{ marginBottom: 20 }}>
                        <Text style={styles.label}>Destination / Occasion</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {OCCASIONS.map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={[styles.chip, criteria.destination === opt && styles.activeChip]}
                                    onPress={() => setCriteria(prev => ({ ...prev, destination: opt }))}
                                >
                                    <Text style={[styles.chipText, criteria.destination === opt && styles.activeChipText]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        
                        <Text style={styles.label}>Temperature</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                             {TEMPS.map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={[styles.chip, criteria.temperature === opt && styles.activeChip]}
                                    onPress={() => setCriteria(prev => ({ ...prev, temperature: opt }))}
                                >
                                    <Text style={[styles.chipText, criteria.temperature === opt && styles.activeChipText]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Style Preference</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {STYLES.map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={[styles.chip, criteria.style === opt && styles.activeChip]}
                                    onPress={() => setCriteria(prev => ({ ...prev, style: opt }))}
                                >
                                    <Text style={[styles.chipText, criteria.style === opt && styles.activeChipText]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <TouchableOpacity 
                    style={[styles.genButton, loading && { opacity: 0.7 }]}
                    onPress={handleGenerate}
                    disabled={loading || !criteria.destination || !criteria.style}
                    >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.genButtonText}>Generate Suggestions</Text>
                    )}
                    </TouchableOpacity>

                    {suggestions.map((outfit, index) => (
                    <View key={index} style={styles.suggestionCard}>
                        <Text style={styles.suggestionName}>{outfit.name}</Text>
                        <Text style={styles.suggestionSummary}>{outfit.reason || outfit.summary}</Text>
                        <ScrollView horizontal>
                        {outfit.items && outfit.items.map(id => {
                            const item = getItemDetails(id);
                            if (!item) return null;
                            return (
                            <Image 
                                key={id} 
                                source={{ uri: item.imageUri || item.image }} 
                                style={styles.smallImage} 
                            />
                            );
                        })}
                        </ScrollView>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                            <TouchableOpacity 
                                style={[styles.selectButton, { flex: 1, marginRight: 5 }]}
                                onPress={() => handleSelectOutfit(outfit.items)}
                            >
                                <Text style={styles.selectButtonText}>Select</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.outlineButton, { flex: 1, marginLeft: 5 }]}
                                onPress={() => handleSaveFavorite(outfit)}
                            >
                                <Text style={styles.outlineButtonText}>Save Fav</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    ))}
                </>
            ) : (
                <View style={styles.favoritesGrid}>
                    {favorites.length === 0 ? (
                        <Text style={styles.emptyText}>No favorites saved yet.</Text>
                    ) : (
                        favorites.map((fav) => (
                            <TouchableOpacity key={fav.id} style={styles.favCard} onPress={() => handleSelectOutfit(fav.items)}>
                                <Text style={styles.favName}>{fav.name || "Untitled Outfit"}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {fav.items.map(id => {
                                        const item = getItemDetails(id);
                                        if (!item) return null;
                                        return <Image key={id} source={{ uri: item.imageUri || item.image }} style={styles.favImage} />;
                                    })}
                                </ScrollView>
                                <View style={styles.selectButton}>
                                    <Text style={styles.selectButtonText}>Select</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  locationText: {
    fontSize: 14, 
    color: '#666',
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#666',
  },
  weatherContainer: {
    alignItems: 'flex-end',
  },
  weatherTemp: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weatherDesc: {
    fontSize: 12,
    color: '#666',
  },
  outfitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsRow: {
    flex: 1,
    flexDirection: 'row',
    marginRight: 10,
  },
  itemPreview: {
    marginRight: 10,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 5,
  },
  itemType: {
    fontSize: 10,
  },
  trashButton: {
    padding: 10,
  },
  addButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  genButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  genButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  suggestionCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  suggestionSummary: {
    marginBottom: 10,
    fontStyle: 'italic',
  },
  smallImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 5,
  },
  selectButton: {
    backgroundColor: '#34C759',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 35,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  favoritesGrid: {
     paddingTop: 10,
  },
  favCard: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    color: '#333',
    fontSize: 14,
  },
  activeChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  suggestionName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  outlineButton: {
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically
    height: 35, // Fixed height to match Select button if it has one, or let both rely on padding
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  outlineButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  favName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  favImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  closeButton: {
    padding: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'red',
    fontSize: 16,
  },
});
