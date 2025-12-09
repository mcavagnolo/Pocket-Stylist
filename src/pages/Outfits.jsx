import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';
import { generateOutfitSuggestions } from '../services/openai';

export default function Outfits() {
  const { items, isItemAvailable, addToSchedule } = useCloset();
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [temperature, setTemperature] = useState('');
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleGenerate = async () => {
    if (!destination || !temperature || !style) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
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
        <Text style={styles.label}>Destination / Occasion</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Work, Date Night, Gym"
          value={destination}
          onChangeText={setDestination}
        />

        <Text style={styles.label}>Temperature</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 75°F, Cold, Rainy"
          value={temperature}
          onChangeText={setTemperature}
        />

        <Text style={styles.label}>Style Preference</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Casual, Chic, Edgy"
          value={style}
          onChangeText={setStyle}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handleGenerate}
          disabled={loading}
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
              <Text style={styles.outfitSummary}>{outfit.summary}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                {outfit.items.map(itemId => {
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
              <TouchableOpacity style={styles.scheduleButton} onPress={() => handleSchedule(outfit)}>
                <Text style={styles.scheduleButtonText}>Schedule This Outfit</Text>
              </TouchableOpacity>
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
  scheduleButton: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
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
