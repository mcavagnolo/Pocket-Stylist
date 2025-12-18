import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { useCloset } from '../context/ClosetContext';
import { addItemToDb, getUserItems } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { resizeImage } from '../utils/image';

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
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    type: [],
    tags: []
  });
  
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  const uniqueTypes = useMemo(() => {
    const types = new Set(items.map(item => item.type).filter(Boolean));
    return Array.from(types).sort();
  }, [items]);

  const uniqueTags = useMemo(() => {
    const tags = new Set(items.flatMap(item => item.tags || []));
    return Array.from(tags).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const typeMatch = activeFilters.type.length === 0 || activeFilters.type.includes(item.type);
      const tagMatch = activeFilters.tags.length === 0 || (item.tags && item.tags.some(tag => activeFilters.tags.includes(tag)));
      return typeMatch && tagMatch;
    });
  }, [items, activeFilters]);

  const toggleFilter = (category, value) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setActiveFilters({ type: [], tags: [] });
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAddModalVisible(false);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const resizedImage = await resizeImage(reader.result);
          navigate('/camera', { state: { image: resizedImage } });
        } catch (error) {
          console.error("Error resizing image:", error);
          alert("Failed to process image. Please try again.");
        }
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
        <Text style={styles.title}>Virtual Closet</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity 
            style={styles.filterButton} 
            onPress={() => setFilterModalVisible(true)}
          >
            <FaFilter size={18} color="#333" />
            {(activeFilters.type.length > 0 || activeFilters.tags.length > 0) && (
              <View style={styles.filterBadge} />
            )}
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
      
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {items.length === 0 ? "No items in closet. Add some!" : "No items match your filters."}
          </Text>
        }
      />

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setFilterModalVisible(false)} />
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Closet</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <FaTimes size={20} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ width: '100%' }}>
              <Text style={styles.filterSectionTitle}>Types</Text>
              <View style={styles.filterOptions}>
                {uniqueTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      activeFilters.type.includes(type) && styles.activeFilterChip
                    ]}
                    onPress={() => toggleFilter('type', type)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      activeFilters.type.includes(type) && styles.activeFilterChipText
                    ]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionTitle}>Tags</Text>
              <View style={styles.filterOptions}>
                {uniqueTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.filterChip,
                      activeFilters.tags.includes(tag) && styles.activeFilterChip
                    ]}
                    onPress={() => toggleFilter('tags', tag)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      activeFilters.tags.includes(tag) && styles.activeFilterChipText
                    ]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>Show {filteredItems.length} Items</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  filterButton: {
    padding: 10,
    marginRight: 5,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    width: '100%',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  activeFilterChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clearButton: {
    padding: 10,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
