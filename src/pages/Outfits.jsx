import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';
import { useAuth } from '../context/AuthContext';
import { generateOutfitSuggestions } from '../services/openai';
import { saveOutfitPreference, saveFavoriteOutfit } from '../services/db';
import { OCCASIONS, STYLES, TEMPS } from '../data/constants';

export default function Outfits() {
  const { items, isItemAvailable, addToSchedule } = useCloset();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [temperature, setTemperature] = useState('');
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [preferences, setPreferences] = useState({});

  const handleGenerate = async () => {
    if (!destination || !temperature || !style) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    setPreferences({}); // Reset preferences for new batch
    // Filter only available items
    const availableItems = items.filter(isItemAvailable);
    
    try {
      const results = await generateOutfitSuggestions(availableItems, {
        destination,
        temperature,
        style
      });
      setSuggestions(results);
    } catch (error) {
      console.error("Failed to generate outfits", error);
      alert("Failed to generate suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreference = async (outfit, index, type) => {
    if (!currentUser) return;
    
    // Prevent multiple votes
    if (preferences[index]) return;

    // Gather tags
    const outfitTags = new Set();
    outfit.items.forEach(itemId => {
      const item = items.find(i => i.id === itemId);
      if (item && item.tags) {
        item.tags.forEach(tag => outfitTags.add(tag));
      }
    });

    const preferenceData = {
      items: outfit.items,
      tags: Array.from(outfitTags),
      preference: type,
      context: { destination, temperature, style }
    };

    try {
      await saveOutfitPreference(currentUser.uid, preferenceData);
      setPreferences(prev => ({ ...prev, [index]: type }));
    } catch (error) {
      console.error("Error saving preference:", error);
      alert("Failed to save preference");
    }
  };

  const handleSave = async (outfit) => {
    if (!currentUser) {
      alert("Please log in to save outfits.");
      return;
    }
    
    try {
      await saveFavoriteOutfit(currentUser.uid, {
        items: outfit.items,
        name: outfit.name, // Save the new generated title
        summary: outfit.summary,
        context: { destination, temperature, style }
      });
      alert("Outfit saved to favorites!");
    } catch (error) {
      console.error("Error saving favorite:", error);
      alert("Failed to save outfit.");
    }
  };

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
      navigate('/schedule');
    }
  };

  const getItemDetails = (id) => items.find(i => i.id === id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Virtual Dressing Room</Text>

      <View style={styles.form}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {OCCASIONS.map(opt => (
                <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, destination === opt && styles.activeChip]}
                    onPress={() => setDestination(opt)}
                >
                    <Text style={[styles.chipText, destination === opt && styles.activeChipText]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        <Text style={styles.label}>Temperature</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {TEMPS.map(opt => (
                <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, temperature === opt && styles.activeChip]}
                    onPress={() => setTemperature(opt)}
                >
                    <Text style={[styles.chipText, temperature === opt && styles.activeChipText]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        <Text style={styles.label}>Style Preference</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {STYLES.map(opt => (
                <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, style === opt && styles.activeChip]}
                    onPress={() => setStyle(opt)}
                >
                    <Text style={[styles.chipText, style === opt && styles.activeChipText]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handleGenerate}
          disabled={loading || !destination || !style}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate Outfits</Text>
          )}
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.subtitle}>Suggestions</Text>
          {suggestions.map((outfit, index) => (
            <View key={index} style={styles.outfitCard}>
              <Text style={styles.outfitName}>{outfit.name}</Text>
              <Text style={styles.outfitSummary}>{outfit.summary}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                {outfit.items.map(itemId => {
                  const item = getItemDetails(itemId);
                  if (!item) return null;
                  return (
                    <View key={itemId} style={styles.itemPreview}>
                      <Image source={{ uri: item.imageUri || item.image }} style={styles.itemImage} />
                    </View>
                  );
                })}
              </ScrollView>
              
              <View style={styles.actionsRow}>
                <View style={styles.voteButtons}>
                  <TouchableOpacity 
                    style={[styles.voteButton, preferences[index] === 'like' && styles.likedButton]} 
                    onPress={() => handlePreference(outfit, index, 'like')}
                    disabled={!!preferences[index]}
                  >
                    <Text style={styles.voteEmoji}>👍</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.voteButton, preferences[index] === 'dislike' && styles.dislikedButton]} 
                    onPress={() => handlePreference(outfit, index, 'dislike')}
                    disabled={!!preferences[index]}
                  >
                    <Text style={styles.voteEmoji}>👎</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity style={styles.outlineButton} onPress={() => handleSave(outfit)}>
                    <Text style={styles.outlineButtonText}>Save Fav</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.scheduleButton} onPress={() => handleSchedule(outfit)}>
                    <Text style={styles.scheduleButtonText}>Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
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
  },
  title: {
    fontSize: 24,
    marginTop: 10,
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
  outfitName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  outlineButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#99c9ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  results: {
    marginTop: 10,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  outfitCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  outfitSummary: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  itemsRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 15,
  },
  itemPreview: {
    marginRight: 15,
    alignItems: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 5,
    marginBottom: 5,
  },
  itemType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  voteButtons: {
    flexDirection: 'row',
  },
  voteButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    marginRight: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedButton: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#28a745',
  },
  dislikedButton: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  voteEmoji: {
    fontSize: 18,
  },
  scheduleButton: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dateInput: {
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
    width: '100%',
    border: '1px solid #ddd',
    borderRadius: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#333',
  },
});
