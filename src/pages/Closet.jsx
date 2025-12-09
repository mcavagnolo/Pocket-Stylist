import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useCloset } from '../context/ClosetContext';

const numColumns = 2;
const screenWidth = Dimensions.get('window').width;
const itemWidth = (screenWidth - 40) / numColumns; // 40 is padding

export default function Closet() {
  const { items, isItemAvailable } = useCloset();
  const navigate = useNavigate();

  const renderItem = ({ item }) => {
    const available = isItemAvailable(item);
    return (
      <View style={[styles.itemContainer, !available && styles.unavailableItem]}>
        <Image source={{ uri: item.imageUri }} style={styles.image} resizeMode="cover" />
        <View style={styles.infoContainer}>
          <Text style={styles.itemType}>{item.type}</Text>
          {!available && <Text style={styles.unavailableText}>In Wash</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Virtual Closet</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigate('/camera')}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
      />
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
});
