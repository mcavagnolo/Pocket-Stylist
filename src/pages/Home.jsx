import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getFavoriteOutfits, deleteFavoriteOutfit } from '../services/db';
import { useCloset } from '../context/ClosetContext';

export default function Home() {
  const { currentUser } = useAuth();
  const { items } = useCloset();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFavorites() {
      if (currentUser) {
        setLoading(true);
        try {
          const favs = await getFavoriteOutfits(currentUser.uid);
          setFavorites(favs);
        } catch (error) {
          console.error("Failed to load favorites", error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadFavorites();
  }, [currentUser]);

  const getItemDetails = (id) => items.find(i => i.id === id);

  const handleDelete = async (id) => {
    if (confirm("Remove this outfit from favorites?")) {
      try {
        await deleteFavoriteOutfit(currentUser.uid, id);
        setFavorites(prev => prev.filter(f => f.id !== id));
      } catch (e) {
        console.error("Error deleting favorite", e);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pocket Stylist</Text>
      
      {!currentUser && (
        <Text style={styles.welcomeText}>Welcome! Log in to see your favorite styles.</Text>
      )}

      {currentUser && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Styles</Text>
          {loading ? (
            <ActivityIndicator />
          ) : favorites.length === 0 ? (
            <Text style={styles.emptyText}>No favorite outfits yet. Go to Style page to generate some!</Text>
          ) : (
            favorites.map((fav) => (
              <View key={fav.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardSummary}>{fav.summary}</Text>
                  <TouchableOpacity onPress={() => handleDelete(fav.id)}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {fav.context && (
                    <Text style={styles.contextText}>
                        {fav.context.destination} • {fav.context.style}
                    </Text>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                  {fav.items && fav.items.map(itemId => {
                    const item = getItemDetails(itemId);
                    if (!item) return null;
                    return (
                      <View key={itemId} style={styles.itemPreview}>
                        <Image source={{ uri: item.imageUri || item.image }} style={styles.itemImage} />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  welcomeText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#444',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: 5,
  },
  cardSummary: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  deleteText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
    padding: 5,
  },
  contextText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  itemsRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  itemPreview: {
    marginRight: 10,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    marginTop: 20,
  },
});
