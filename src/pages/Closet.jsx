import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';
import { addItemToDb, getUserItems } from '../services/db';
import { useAuth } from '../context/AuthContext';

const numColumns = 2;
const screenWidth = Dimensions.get('window').width;
const itemWidth = (screenWidth - 40) / numColumns; // 40 is padding

// Cross-platform image component
const SmartImage = ({ uri, style, alt }) => {
  // Web: Use HTML img for best performance/caching
  if (Platform.OS === 'web') {
    return (
      <div style={{ ...StyleSheet.flatten(style), overflow: 'hidden' }}>
        <img 
          src={uri} 
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null; 
            console.warn('Image failed to load:', uri);
          }}
        />
      </div>
    );
  }

  // Native: Use standard React Native Image
  return (
    <Image 
      source={{ uri }} 
      style={style} 
      resizeMode="cover" 
    />
  );
};

const ClosetItem = React.memo(({ item, onPress, isAvailable }) => (
  <TouchableOpacity onPress={() => onPress(item)}>
    <View style={[styles.itemContainer, !isAvailable && styles.unavailableItem]}>
      <SmartImage 
        uri={item.imageUri || item.image} 
        style={styles.image} 
        alt={item.type} 
      />
      <View style={styles.infoContainer}>
        <Text style={styles.itemType}>{item.type}</Text>
        {!isAvailable && <Text style={styles.unavailableText}>In Wash</Text>}
      </View>
    </View>
  </TouchableOpacity>
));

export default function Closet() {
  const { items, isItemAvailable, deleteItem, updateItem } = useCloset();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [testStatus, setTestStatus] = useState("");
  const [testLogs, setTestLogs] = useState([]);
  const APP_VERSION = "v1.2"; // Increment this to verify update

  const addLog = (msg) => setTestLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const runConnectionTest = async () => {
    if (!currentUser) return alert("Not logged in");
    const testId = "test_" + Date.now();
    setTestStatus("Running...");
    setTestLogs([]);
    
    try {
      addLog(`App Version: ${APP_VERSION}`);
      addLog(`Online Status: ${navigator.onLine}`);
      
      // Test 0: General Internet Connectivity
      addLog("Test 0: Pinging GitHub API...");
      try {
        const res = await fetch('https://api.github.com/zen');
        addLog(`Ping success! Status: ${res.status}`);
      } catch (netErr) {
        addLog(`Ping FAILED: ${netErr.message}`);
        addLog("WARNING: You might be offline or blocked.");
      }

      addLog("Test 1: Reading Firestore...");
      try {
        const items = await getUserItems(currentUser.uid);
        addLog(`Read success! Found ${items.length} items.`);
      } catch (readErr) {
        addLog(`Read FAILED: ${readErr.message}`);
        throw readErr; // Stop if read fails
      }

      addLog("Test 2: Writing Firestore...");
      await addItemToDb(currentUser.uid, {
        id: testId,
        type: "test_connection",
        createdAt: new Date().toISOString()
      });
      
      addLog("Write successful!");
      setTestStatus("PASSED");
      
      // Cleanup
      addLog("Cleaning up...");
      deleteItem(testId);
      addLog("Done.");
    } catch (e) {
      console.error(e);
      addLog(`ERROR: ${e.message}`);
      setTestStatus("FAILED");
    }
  };
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAddModalVisible(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        navigate('/camera', { state: { image: reader.result } });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemPress = (item) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItem(selectedItem.id);
      setDetailModalVisible(false);
    }
  };

  const handleRating = (rating) => {
    setSelectedItem(prev => ({ ...prev, rating }));
    updateItem(selectedItem.id, { rating });
  };

  const renderItem = ({ item }) => (
    <ClosetItem 
      item={item} 
      onPress={handleItemPress} 
      isAvailable={isItemAvailable(item)} 
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Virtual Closet</Text>
          <Text style={{fontSize: 10, color: '#999'}}>{APP_VERSION}</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 10}}>
          <TouchableOpacity style={[styles.addButton, {backgroundColor: '#666'}]} onPress={runConnectionTest}>
            <Text style={styles.addButtonText}>Test DB</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <input
          type="file"
          accept="image/*"
          ref={libraryInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </View>

      {testLogs.length > 0 && (
        <View style={{padding: 10, backgroundColor: '#eee', marginBottom: 10, maxHeight: 150, overflow: 'scroll'}}>
          <Text style={{fontWeight: 'bold', marginBottom: 5}}>Debug Logs ({testStatus}):</Text>
          {testLogs.map((log, i) => (
            <Text key={i} style={{fontSize: 12, fontFamily: 'monospace'}}>{log}</Text>
          ))}
        </View>
      )}
      
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No items in closet. Add some!</Text>}
      />

      {/* Add Item Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setAddModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setAddModalVisible(false);
                cameraInputRef.current.click();
              }}
            >
              <Text style={styles.modalButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setAddModalVisible(false);
                libraryInputRef.current.click();
              }}
            >
              <Text style={styles.modalButtonText}>Choose from Library</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setAddModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <Modal
        animationType="slide"
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.detailContainer}>
          {selectedItem && (
            <ScrollView>
              <Image source={{ uri: selectedItem.imageUri }} style={styles.detailImage} resizeMode="contain" />
              
              <View style={styles.detailInfo}>
                <Text style={styles.detailTitle}>{selectedItem.type}</Text>
                <Text style={styles.detailText}>Color: {selectedItem.color}</Text>
                <Text style={styles.detailText}>Style: {selectedItem.style}</Text>
                <Text style={styles.detailText}>Worn: {selectedItem.wearCount || 0} times</Text>
                
                <Text style={styles.sectionTitle}>Rating</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                      <Text style={[styles.star, (selectedItem.rating || 0) >= star ? styles.starFilled : styles.starEmpty]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>Delete Item</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeDetailButton} onPress={() => setDetailModalVisible(false)}>
                  <Text style={styles.closeDetailButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    width: itemWidth,
    margin: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  unavailableItem: {
    opacity: 0.5,
    backgroundColor: '#eee',
  },
  image: {
    width: '100%',
    height: 150,
  },
  infoContainer: {
    padding: 10,
  },
  itemType: {
    textTransform: 'capitalize',
    fontWeight: 'bold',
  },
  unavailableText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    marginTop: 5,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f0f0f0',
  },
  detailInfo: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  detailText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  star: {
    fontSize: 30,
    marginRight: 5,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#ddd',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeDetailButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  closeDetailButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#999',
  },
});
