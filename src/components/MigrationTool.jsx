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
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const base64Items = items.filter(item => 
    item.imageUri && item.imageUri.startsWith('data:')
  );

  if (base64Items.length === 0) return null;

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
          ⚠️ {base64Items.length} items need optimization. Tap to fix.
        </Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Optimize Closet</Text>
            <Text style={styles.description}>
              We need to move your images to the new storage system to make the app faster. 
              This will fix the slow loading times.
            </Text>
            
            {migrating ? (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color="#ff8e52" />
                <Text style={styles.progressText}>
                  Optimizing {progress} / {total}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <View style={styles.buttons}>
                  <TouchableOpacity 
                    style={[styles.button, styles.primaryButton]} 
                    onPress={handleMigration}
                  >
                    <Text style={styles.buttonText}>Start Optimization</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, styles.secondaryButton]} 
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Later</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  onPress={handleTestConnection}
                  disabled={testing}
                  style={{ alignSelf: 'center', padding: 10 }}
                >
                  <Text style={{ color: '#666', textDecorationLine: 'underline' }}>
                    {testing ? "Testing..." : "Test Storage Connection"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
    width: '80%',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666'
  },
  progressContainer: {
    alignItems: 'center',
    padding: 20
  },
  progressText: {
    marginTop: 10,
    fontSize: 16
  },
  buttons: {
    flexDirection: 'row',
    gap: 10
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center'
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
    color: '#333'
  }
});
