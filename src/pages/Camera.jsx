import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';
import { analyzeClothingItem } from '../services/openai';

export default function CameraPage() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const fileInputRef = useRef(null);
  const { addItem } = useCloset();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.image) {
      setImage(location.state.image);
      analyzeImage(location.state.image);
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        analyzeImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Image) => {
    setLoading(true);
    try {
      const result = await analyzeClothingItem(base64Image);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (image && analysis) {
      addItem({
        imageUri: image,
        ...analysis,
        lastWorn: null
      });
      navigate('/closet');
    }
  };

  const handleRetake = () => {
    setImage(null);
    setAnalysis(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add New Item</Text>

      {!image ? (
        <View style={styles.uploadContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => fileInputRef.current.click()}
          >
            <Text style={styles.buttonText}>Take Photo / Upload</Text>
          </TouchableOpacity>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.previewImage} />
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Analyzing your item...</Text>
            </View>
          ) : analysis ? (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Type:</Text>
              <TextInput 
                style={styles.input} 
                value={analysis.type} 
                onChangeText={(text) => setAnalysis({...analysis, type: text})}
              />
              
              <Text style={styles.label}>Color:</Text>
              <TextInput 
                style={styles.input} 
                value={analysis.color} 
                onChangeText={(text) => setAnalysis({...analysis, color: text})}
              />

              <Text style={styles.label}>Style:</Text>
              <TextInput 
                style={styles.input} 
                value={analysis.style} 
                onChangeText={(text) => setAnalysis({...analysis, style: text})}
              />

              <Text style={styles.label}>Tags:</Text>
              <Text style={styles.tags}>{analysis.tags.join(', ')}</Text>

              <View style={styles.buttonGroup}>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleRetake}>
                  <Text style={styles.secondaryButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleSave}>
                  <Text style={styles.buttonText}>Save to Closet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  formContainer: {
    width: '100%',
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
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  tags: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
