import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';
import { useAuth } from '../context/AuthContext';
import { generateOutfitSuggestions } from '../services/openai';
import { getWeatherForecast, getLocationName, getWeatherDescription } from '../services/weather';
import { saveOutfitPreference, saveFavoriteOutfit } from '../services/db';
import { OCCASIONS, STYLES, TEMPS } from '../data/constants';
import TooltipModal from '../components/TooltipModal';
import PageHeader from '../components/PageHeader';

export default function Outfits() {
  const { items, isItemAvailable, addToSchedule, schedule } = useCloset();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [temperature, setTemperature] = useState('');
  const [locationName, setLocationName] = useState('');
  const [currentWeatherDesc, setCurrentWeatherDesc] = useState('');
  const [currentTempRange, setCurrentTempRange] = useState('');
  const [style, setStyle] = useState('');
  const [includeOuterwear, setIncludeOuterwear] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [voicePrompt, setVoicePrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem('hasSeenOutfitsTooltip');
    if (!hasSeenTooltip) {
      setShowTooltip(true);
      localStorage.setItem('hasSeenOutfitsTooltip', 'true');
    }
  }, []);

  const playSound = (type) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'start') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'end') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setVoicePrompt(transcript);
        };

        recognitionRef.current.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
             setIsListening(false);
             playSound('end');
             // Auto-submit after voice
             // We need to trigger the generation, but handleGenerate uses state that might not be updated yet
             // Using a small timeout or useEffect dependency could work, but let's just trigger it manually 
             // in a useEffect that watches voicePrompt changes if we were continuous, but here we just want it once.
             // Best to just submit in the next tick.
        };
    }
  }, []);

  useEffect(() => {
     if (!isListening && voicePrompt) {
         handleGenerate(true);
     }
  }, [voicePrompt, isListening]);


  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Voice recognition not supported in this browser. Please use Chrome or Safari.");
        return;
    }
    if (isListening) {
        recognitionRef.current.stop();
        // Sound played in onend
        // Generation triggered in useEffect
    } else {
        try {
            playSound('start');
            setVoicePrompt(''); // Clear previous
            recognitionRef.current.start();
            setIsListening(true);
        } catch (e) {
            console.error(e);
            setIsListening(false);
        }
    }
  };

  useEffect(() => {
    const initWeather = async () => {
      // Default to NY if no location
      let lat = 40.7128;
      let lon = -74.0060;

      const setTempFromForecast = async (forecast, lat, lon) => {
        if (!forecast) return;
        
        // Fix: Use local date instead of UTC to match Open-Meteo days and user's reality
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${dayNum}`;

        const day = forecast[today];
        if (day) {
           const avg = (day.max + day.min) / 2;
           let tempStr = '';

           if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(day.code)) {
              tempStr = 'Rainy';
           } else if (avg >= 80) tempStr = 'Hot';
           else if (avg >= 70) tempStr = 'Warm';
           else if (avg >= 60) tempStr = 'Mild';
           else if (avg >= 50) tempStr = 'Cool';
           else tempStr = 'Cold';
           
           setTemperature(tempStr);
           setCurrentTempRange(`${day.max}° / ${day.min}°`);
           setCurrentWeatherDesc(getWeatherDescription(day.code));
           
           if (['Cool', 'Cold', 'Rainy'].includes(tempStr)) {
             setIncludeOuterwear(true);
           }
        }
        
        const locName = await getLocationName(lat, lon);
        if (locName) setLocationName(locName);
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const forecast = await getWeatherForecast(position.coords.latitude, position.coords.longitude);
                await setTempFromForecast(forecast, position.coords.latitude, position.coords.longitude);
            },
            async () => {
                const forecast = await getWeatherForecast(lat, lon);
                await setTempFromForecast(forecast, lat, lon);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
         const forecast = await getWeatherForecast(lat, lon);
         await setTempFromForecast(forecast, lat, lon);
      }
    };
    initWeather();
  }, []);

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

  const handleGenerate = async (isVoice = false) => {
    if (!isVoice && (!destination || !temperature || !style)) {
      alert("⚠️ Needs more info!\n\nPlease select a destination, temperature, and style to generate outfits.");
      return;
    }

    setLoading(true);
    setPreferences({}); // Reset preferences for new batch
    // Filter only available items
    const availableItems = items.filter(isItemAvailable);
    
    try {
      // If voice command exists, it can override standard validaton or be additive
      // But standard call requires fields. Let's provide defaults if voice is used but fields empty?
      // Or just pass current state.
      
      const results = await generateOutfitSuggestions(availableItems, {
        destination: destination || 'Any',
        temperature: temperature || 'Any',
        style: style || 'Any',
        includeOuterwear
      }, voicePrompt);
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
        outfitId: outfit.id || crypto.randomUUID(),
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

  const confirmSchedule = (date) => {
    if (selectedOutfit && date) {
      if (schedule && schedule[date]) {
         if (!window.confirm("This date already has an outfit. Overwrite?")) return;
      }
      addToSchedule(date, selectedOutfit.items, selectedOutfit.name, selectedOutfit.id);
      setShowDateModal(false);
      setSelectedOutfit(null);
      alert("Outfit scheduled!");
      navigate('/schedule');
    }
  };

  const getItemDetails = (id) => items.find(i => i.id === id);

  return (
    <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
    >
      <PageHeader 
        title="Dressing Room" 
        onInfoPress={() => setShowTooltip(true)} 
        rightContent={
             locationName ? (
                 <View style={{alignItems: 'flex-end'}}>
                     <Text style={{fontSize: 14, fontWeight: 'bold', color: '#555'}}>📍 {locationName}</Text>
                     {currentTempRange && (
                         <Text style={{fontSize: 12, color: '#777'}}>{currentTempRange} • {currentWeatherDesc}</Text>
                     )}
                 </View>
             ) : null
        }
      />
      
      <TooltipModal 
        visible={showTooltip} 
        onClose={() => setShowTooltip(false)}
        title="Style Yourself!"
        content="Select your destination, temp, and style OR just tell the AI what you want! Tap the mic to start."
      />

       {/* Location Header - Removed as it is now in PageHeader */}

      <View style={styles.form}>
        
        {/* Voice Assistant Moved Up */}
        <View style={styles.voiceSection}>
            <Text style={styles.voiceLabel}>✨ Tell me what you want to wear:</Text>
            <TouchableOpacity 
                style={[styles.micButton, isListening && styles.micButtonActive]} 
                onPress={toggleListening}
            >
                <Text style={{fontSize: 32}}>{isListening ? '🛑' : '🎙️'}</Text>
                <Text style={{fontSize: 12, marginTop: 5, color: isListening ? 'red' : '#333'}}>
                    {isListening ? 'Tap to Stop & Generate' : 'Tap to Speak'}
                </Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.label}>Destination / Occasion</Text>
        <View style={styles.chipContainer}>
            {OCCASIONS.map(opt => (
                <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, destination === opt && styles.activeChip]}
                    onPress={() => setDestination(opt)}
                >
                    <Text style={[styles.chipText, destination === opt && styles.activeChipText]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>

        <Text style={styles.label}>Temperature</Text>
        <View style={styles.chipContainer}>
            {TEMPS.map(opt => (
                <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, temperature === opt && styles.activeChip]}
                    onPress={() => setTemperature(opt)}
                >
                    <Text style={[styles.chipText, temperature === opt && styles.activeChipText]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>

        <Text style={styles.label}>Style Preference</Text>
        <View style={styles.chipContainer}>
            {STYLES.map(opt => (
                <TouchableOpacity 
                    key={opt} 
                    style={[styles.chip, style === opt && styles.activeChip]}
                    onPress={() => setStyle(opt)}
                >
                    <Text style={[styles.chipText, style === opt && styles.activeChipText]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
          <TouchableOpacity 
            style={[styles.chip, includeOuterwear && styles.activeChip]}
            onPress={() => setIncludeOuterwear(!includeOuterwear)}
          >
            <Text style={[styles.chipText, includeOuterwear && styles.activeChipText]}>
              {includeOuterwear ? 'Include Outerwear ✓' : 'Add Outerwear Layer'}
            </Text>
          </TouchableOpacity>
        </View>


        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={() => handleGenerate(false)}
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
    flexGrow: 1,
    padding: 20,
  },

  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
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
    marginTop: 10,
    width: '100%',
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
    width: '100%', 
    textAlign: 'center',
  },
  dateList: {
    gap: 8,
    maxHeight: 300,
    width: '100%',
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
  cancelButton: {
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: '#333', 
    fontWeight: 'bold',
  },
  voiceSection: {
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#F8E1F4', // Light Purple background
    padding: 15,
    borderRadius: 12,
  },
  voiceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  micButton: {
    padding: 15,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    // Removed borderWidth/borderColor to remove circle
    elevation: 3,
  },
  micButtonActive: {
    backgroundColor: '#F3E5F5',
    borderColor: '#FF4081',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: 5,
    marginBottom: 5,
  },
});
