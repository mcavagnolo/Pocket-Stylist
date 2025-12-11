import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';
import { analyzeClothingItem } from '../services/openai';
import { resizeImage } from '../utils/image';

export default function CameraPage() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const fileInputRef = useRef(null);
  const { addItem } = useCloset();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.image) {
      const processImage = async () => {
        const resized = await resizeImage(location.state.image);
        setImage(resized);
        analyzeImage(resized);
      };
      processImage();
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resized = await resizeImage(reader.result);
        setImage(resized);
        analyzeImage(resized);
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

  const handleSave = async () => {
    if (image && analysis && !saving) {
      setSaving(true);
      
      // Check image size
      const sizeInBytes = (image.length * 3) / 4;
      const sizeInKB = sizeInBytes / 1024;
      console.log(`Attempting to save image. Size: ${sizeInKB.toFixed(2)} KB`);

      try {
        // Fire and forget - don't await the upload
        // The context handles the optimistic update immediately
        addItem({
          imageUri: image,
          ...analysis,
          lastWorn: null
        }).catch(err => {
          console.error("Background save failed:", err);
          // Ideally we would show a toast here, but we've already navigated
        });

        // Navigate immediately
        navigate('/closet');
        
        // Show a quick feedback toast/alert if needed, or just let the UI speak for itself
        // alert("Saving in background..."); 
      } catch (error) {
        console.error("Failed to save item:", error);
        alert(`Failed to save item: ${error.message}.`);
        setSaving(false);
      }
    }
  };

  const handleRetake = () => {
    setImage(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      
      <Text style={styles.title}>Add New Item</Text>

      {!image ? (
        <View style={styles.uploadContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => fileInputRef.current.click()}
          >
            <Text style={styles.buttonText}>Take Photo / Upload</Text>
          </TouchableOpacity>
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
              <View style={styles.rowContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Type</Text>
                  <TextInput 
                    style={styles.compactInput} 
                    value={analysis.type} 
                    onChangeText={(text) => setAnalysis({...analysis, type: text})}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Color</Text>
                  <TextInput 
                    style={styles.compactInput} 
                    value={analysis.color} 
                    onChangeText={(text) => setAnalysis({...analysis, color: text})}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Style</Text>
                  <TextInput 
                    style={styles.compactInput} 
                    value={analysis.style} 
                    onChangeText={(text) => setAnalysis({...analysis, style: text})}
                  />
                </View>
              </View>

              <Text style={styles.label}>Tags</Text>
              <View style={styles.tagsContainer}>
                {analysis.tags.map((tag, index) => (
                  <View key={index} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleRetake}>
                  <Text style={styles.secondaryButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
                  <Text style={styles.buttonText}>{saving ? "Saving..." : "Save to Closet"}</Text>
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
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputGroup: {
    width: '30%',
  },
  label: {
    fontWeight: '600',
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  compactInput: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    marginTop: 5,
  },
  tagBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
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
