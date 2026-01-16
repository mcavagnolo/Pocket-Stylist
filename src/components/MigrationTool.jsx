import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useCloset } from '../context/ClosetContext';
import { storage } from '../services/firebase';
import { uploadImageToStorage, testStorageConnection } from '../services/storage';
import { updateItemInDb } from '../services/db';
import { useAuth } from '../context/AuthContext';

export default function MigrationTool() {
  const { items } = useCloset();
  const { currentUser } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [layerMigrating, setLayerMigrating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Filter items needing update
  const base64Items = items.filter(item => item.imageUri && item.imageUri.startsWith('data:'));
  const missingLayerItems = items.filter(item => !item.layer);

  // Only show if there is work to do
  if (base64Items.length === 0 && missingLayerItems.length === 0) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await testStorageConnection(currentUser.uid);
      alert(`Connection Successful!\nBucket: ${result.bucket}\n\nStorage is configured correctly.`);
    } catch (error) {
      const bucket = storage.app.options.storageBucket;
      const isCors = error.message.includes("timed out") || error.message.includes("Network Error");
      
      if (isCors) {
        alert(
          `CORS CONFIGURATION REQUIRED\n\n` +
          `The upload timed out, which means Google Cloud is blocking the browser.\n\n` +
          `You must run this command in the Google Cloud Console:\n\n` +
          `gsutil cors set cors.json gs://${bucket}\n\n` +
          `(I have created the cors.json file in your project root)`
        );
      } else {
        alert(`Connection Failed:\n${error.message}\n\nCheck your Storage Rules.`);
      }
    } finally {
      setTesting(false);
    }
  };

  const inferLayer = (type, tags) => {
    const t = (type || '').toLowerCase();
    const tagStr = (tags || []).join(' ').toLowerCase();
    
    if (['jacket', 'coat', 'blazer', 'parka', 'raincoat', 'outerwear'].some(k => t.includes(k) || tagStr.includes(k))) return 'outer';
    // Refine middle
    if (['cardigan', 'hoodie', 'sweatshirt', 'flannel', 'jumper', 'sweater', 'vest'].some(k => t.includes(k) || tagStr.includes(k))) return 'middle';
    
    if (['pants', 'jeans', 'skirt', 'shorts', 'leggings', 'trousers', 'joggers'].some(k => t.includes(k) || tagStr.includes(k))) return 'bottom';
    if (['shoe', 'boot', 'sneaker', 'sandal', 'heel', 'flat', 'loafer'].some(k => t.includes(k) || tagStr.includes(k))) return 'shoes';
    if (['dress', 'jumpsuit', 'romper', 'gown'].some(k => t.includes(k) || tagStr.includes(k))) return 'one_piece';
    if (['hat', 'scarf', 'bag', 'purse', 'belt', 'jewelry', 'sunglasses'].some(k => t.includes(k) || tagStr.includes(k))) return 'accessory';
    return 'base'; // Default to base (top)
  };

  const handleLayerMigration = async () => {
      setLayerMigrating(true);
      setTotal(missingLayerItems.length);
      let completed = 0;
      
      try {
          for (const item of missingLayerItems) {
              const newLayer = inferLayer(item.type, item.tags);
              await updateItemInDb(currentUser.uid, item.id, { layer: newLayer });
              completed++;
              setProgress(completed);
          }
          alert(`Layer Analysis Complete! Updated ${completed} items.`);
      } catch (error) {
          console.error("Layer migration failed:", error);
          alert("Failed to update items.");
      } finally {
          setLayerMigrating(false);
      }
  };

  const inferLayer = (type, tags) => {
    const t = (type || '').toLowerCase();
    const tagStr = (tags || []).join(' ').toLowerCase();
    
    if (['jacket', 'coat', 'blazer', 'parka', 'raincoat', 'outerwear'].some(k => t.includes(k) || tagStr.includes(k))) return 'outer';
    // Refine middle
    if (['cardigan', 'hoodie', 'sweatshirt', 'flannel', 'jumper', 'sweater', 'vest'].some(k => t.includes(k) || tagStr.includes(k))) return 'middle';
    
    if (['pants', 'jeans', 'skirt', 'shorts', 'leggings', 'trousers', 'joggers'].some(k => t.includes(k) || tagStr.includes(k))) return 'bottom';
    if (['shoe', 'boot', 'sneaker', 'sandal', 'heel', 'flat', 'loafer'].some(k => t.includes(k) || tagStr.includes(k))) return 'shoes';
    if (['dress', 'jumpsuit', 'romper', 'gown'].some(k => t.includes(k) || tagStr.includes(k))) return 'one_piece';
    if (['hat', 'scarf', 'bag', 'purse', 'belt', 'jewelry', 'sunglasses'].some(k => t.includes(k) || tagStr.includes(k))) return 'accessory';
    return 'base'; // Default to base (top)
  };

  const handleLayerMigration = async () => {
      setMigrating(true); // Reuse state or add new one
      setTotal(missingLayerItems.length);
      let completed = 0;
      
      try {
          for (const item of missingLayerItems) {
              const newLayer = inferLayer(item.type, item.tags);
              await updateItemInDb(currentUser.uid, item.id, { layer: newLayer });
              completed++;
              setProgress(completed);
          }
          alert(`Layer Analysis Complete! Updated ${completed} items.`);
          // Trigger modal close or refresh
          setShowModal(false);
      } catch (error) {
          console.error("Layer migration failed:", error);
          alert("Failed to update items.");
      } finally {
          setMigrating(false);
      }
  };

  const handleMigration = async () => {
    setMigrating(true);
    setTotal(base64Items.length);
    let completed = 0;

    try {
      for (const item of base64Items) {
        try {
          console.log(`Migrating item ${item.id}...`);
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timed out')), 60000) // 60s timeout
          );

          // Upload to Storage with timeout
          const imageUrl = await Promise.race([
            uploadImageToStorage(currentUser.uid, item.imageUri),
            timeoutPromise
          ]);
          
          // Update Firestore
          await updateItemInDb(currentUser.uid, item.id, {
            imageUri: imageUrl
          });

          completed++;
          setProgress(completed);
        } catch (err) {
          console.error(`Failed to migrate item ${item.id}:`, err);
          alert(`Failed to migrate item. Error: ${err.message}`);
        }
      }
      if (completed > 0) {
        alert(`Migration complete! ${completed} items optimized.`);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Migration failed:", error);
      alert("Migration failed. Please try again.");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.banner} 
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.bannerText}>
          ⚠️ System Maintenance Required. Tap to fix.
        </Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>System Maintenance</Text>
            <ScrollView style={{ width: '100%', maxHeight: 400 }}>
                {missingLayerItems.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Missing Layer Tags ({missingLayerItems.length})</Text>
                        <Text style={styles.description}>
                            New feature: Auto-detect base/middle/outer layers for better outfits.
                        </Text>
                        <TouchableOpacity 
                            style={[styles.button, styles.primaryButton, layerMigrating && styles.disabled]} 
                            onPress={handleLayerMigration}
                            disabled={layerMigrating}
                        >
                            {layerMigrating ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>Auto-Tag Layers</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {base64Items.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Image Optimization ({base64Items.length})</Text>
                        <Text style={styles.description}>
                        Move images to cloud storage for speed.
                        </Text>
                        
                        {migrating ? (
                        <View style={styles.progressContainer}>
                            <ActivityIndicator size="small" color="#ff8e52" />
                            <Text style={styles.progressText}>
                            Optimizing {progress} / {total}
                            </Text>
                        </View>
                        ) : (
                        <View style={{ gap: 10 }}>
                            <TouchableOpacity 
                                style={[styles.button, styles.primaryButton]} 
                                onPress={handleMigration}
                            >
                                <Text style={styles.buttonText}>Migrate Images</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handleTestConnection}
                                disabled={testing}
                                style={{ alignSelf: 'center', padding: 5 }}
                            >
                                <Text style={{ color: '#666', textDecorationLine: 'underline', fontSize: 12 }}>
                                    {testing ? "Testing..." : "Test Connection"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity 
                style={[styles.button, styles.secondaryButton, { marginTop: 15, width: '100%' }]} 
                onPress={() => setShowModal(false)}
            >
                <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeeba',
    alignItems: 'center'
  },
  bannerText: {
    color: '#856404',
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: '90%',
    alignItems: 'center',
    maxHeight: '80%'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    width: '100%'
  },
  sectionTitle: {
      fontWeight: 'bold', 
      marginBottom: 5
  },
  description: {
    marginBottom: 15,
    color: '#666',
    fontSize: 14
  },
  progressContainer: {
    alignItems: 'center',
    padding: 10
  },
  progressText: {
    marginTop: 5,
    fontSize: 14
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButton: {
    backgroundColor: '#ff8e52'
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: 'bold'
  },
  disabled: {
      opacity: 0.7
  }
});
