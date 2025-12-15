import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';
import { addItemToDb, getUserItems } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { enableNetwork, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getDb, clearCache } from '../services/firebase';

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

  // Cleanup function to delete items from Server
  const cleanupTestItems = async () => {
    if (!currentUser) return;
    
    try {
      const db = getDb();
      const closetRef = collection(db, 'users', currentUser.uid, 'closet');
      // Query specifically for test items
      const q = query(closetRef, where('type', '==', 'test_connection'));
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert("No 'test_connection' items found on the server. Clearing local cache to remove any ghosts...");
        await clearCache();
        return;
      }

      if (confirm(`Found ${snapshot.size} test items on the SERVER. Delete them permanently?`)) {
        const deletePromises = snapshot.docs.map(docSnap => 
          deleteDoc(doc(db, 'users', currentUser.uid, 'closet', docSnap.id))
        );
        
        await Promise.all(deletePromises);
        alert("Server delete complete. App will reload to clear cache.");
        await clearCache();
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
      alert(`Cleanup failed: ${error.message}`);
    }
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
        <Text style={styles.title}>Virtual Closet</Text>
        <TouchableOpacity onPress={cleanupTestItems} style={{ marginRight: 10 }}>
          <Text style={{ color: 'red', fontSize: 12 }}>Delete Test Items</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={async () => {
          if (confirm("Clear local cache to stop old test items from syncing? App will reload.")) {
            await clearCache();
          }
        }} style={{ marginRight: 10 }}>
          <Text style={{ color: 'orange', fontSize: 12 }}>Reset Cache</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
        
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
                {selectedItem.refreshCycle && (
                  <Text style={styles.detailText}>Refresh Cycle: {selectedItem.refreshCycle} days</Text>
                )}

                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    <Text style={styles.sectionTitle}>Tags</Text>
                    <View style={styles.tagsList}>
                      {selectedItem.tags.map((tag, index) => (
                        <View key={index} style={styles.tagChip}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
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
  tagsContainer: {
    marginTop: 10,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
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
