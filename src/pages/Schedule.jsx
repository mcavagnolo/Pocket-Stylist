import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useCloset } from '../context/ClosetContext';
import { getWeatherForecast, getWeatherDescription } from '../services/weather';
import { generateOutfitSuggestions } from '../services/openai';

export default function Schedule() {
  const { schedule, items, markAsWorn, addToSchedule, isItemAvailable } = useCloset();
  const [weather, setWeather] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [criteria, setCriteria] = useState({ destination: 'Casual', style: 'Casual' });

  useEffect(() => {
    const fetchWeather = async () => {
      const lat = 40.7128;
      const lon = -74.0060;
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const forecast = await getWeatherForecast(position.coords.latitude, position.coords.longitude);
          if (forecast) setWeather(forecast);
        }, async () => {
          const forecast = await getWeatherForecast(lat, lon);
          if (forecast) setWeather(forecast);
        });
      } else {
        const forecast = await getWeatherForecast(lat, lon);
        if (forecast) setWeather(forecast);
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

  const handleWear = (date, itemIds) => {
    if (confirm("Mark this outfit as worn? Items will be unavailable for their refresh cycle.")) {
      markAsWorn(itemIds, date);
    }
  };

  const openGenerator = (date) => {
    setSelectedDate(date);
    setSuggestions([]);
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
        temperature: tempStr,
        style: criteria.style
      });
      
      if (result && result.outfits) {
        setSuggestions(result.outfits);
      }
    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate outfits. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOutfit = (outfit) => {
    addToSchedule(selectedDate, outfit.itemIds);
    setModalVisible(false);
  };

  const days = getNext7Days();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Outfit Schedule</Text>
      
      {days.map(date => {
        const outfitItemIds = schedule[date];
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
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                  {outfitItemIds.map(itemId => {
                    const item = getItemDetails(itemId);
                    if (!item) return null;
                    return (
                      <View key={itemId} style={styles.itemPreview}>
                        <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
                        <Text style={styles.itemType}>{item.type}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.wearButton}
                  onPress={() => handleWear(date, outfitItemIds)}
                >
                  <Text style={styles.wearButtonText}>Wear This Outfit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.generateButton} onPress={() => openGenerator(date)}>
                <Text style={styles.generateButtonText}>+ Generate Outfit</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Generate for {selectedDate}</Text>
          
          {weather[selectedDate] && (
            <Text style={styles.modalWeather}>
              Forecast: {weather[selectedDate].max}° / {weather[selectedDate].min}° - {getWeatherDescription(weather[selectedDate].code)}
            </Text>
          )}

          {suggestions.length === 0 ? (
            <View style={styles.criteriaForm}>
              <TouchableOpacity style={styles.genButton} onPress={handleGenerate} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.genButtonText}>Generate 3 Outfits</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.suggestionsList}>
              {suggestions.map((outfit, index) => (
                <View key={index} style={styles.suggestionCard}>
                  <Text style={styles.suggestionSummary}>{outfit.summary}</Text>
                  <ScrollView horizontal>
                    {outfit.itemIds.map(id => {
                      const item = getItemDetails(id);
                      if (!item) return null;
                      return (
                        <Image key={id} source={{ uri: item.imageUri }} style={styles.smallImage} />
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectOutfit(outfit)}>
                    <Text style={styles.selectButtonText}>Select This Outfit</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  generateButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  generateButtonText: {
    color: '#007AFF',
    fontSize: 16,
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
  modalWeather: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  genButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
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
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 5,
  },
  selectButton: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'red',
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#666',
  },
  itemsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemPreview: {
    marginRight: 10,
    alignItems: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 5,
  },
  itemType: {
    fontSize: 12,
  },
  wearButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  wearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 10,
  },
});    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#666',
  },
  itemsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemPreview: {
    marginRight: 10,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginBottom: 5,
  },
  itemType: {
    fontSize: 10,
    color: '#666',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    padding: 10,
  },
  wearButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  wearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
