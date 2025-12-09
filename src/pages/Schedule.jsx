import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useCloset } from '../context/ClosetContext';

export default function Schedule() {
  const { schedule, items, markAsWorn } = useCloset();

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const getItemDetails = (id) => items.find(i => i.id === id);

  const handleWear = (date, itemIds) => {
    if (confirm("Mark this outfit as worn? Items will be unavailable for their refresh cycle.")) {
      markAsWorn(itemIds, date);
      // Ideally we should also update the schedule to show it as "Completed"
      // For now, the items will just disappear from the closet view
    }
  };

  const days = getNext7Days();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Outfit Schedule</Text>
      
      {days.map(date => {
        const outfitItemIds = schedule[date];
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return (
          <View key={date} style={styles.dayCard}>
            <View style={styles.dateHeader}>
              <Text style={styles.dayName}>{dayName}</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>

            {outfitItemIds ? (
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                  {outfitItemIds.map(itemId => {
                    const item = getItemDetails(itemId);
                    if (!item) return null;
                    return (
                      <View key={itemId} style={styles.itemPreview}>
                        <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
                        <Text style={styles.itemType}>{item.type}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.wearButton}
                  onPress={() => handleWear(date, outfitItemIds)}
                >
                  <Text style={styles.wearButtonText}>Wear This Outfit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.emptyText}>No outfit scheduled</Text>
            )}
          </View>
        );
      })}
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#666',
  },
  itemsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemPreview: {
    marginRight: 10,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginBottom: 5,
  },
  itemType: {
    fontSize: 10,
    color: '#666',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    padding: 10,
  },
  wearButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  wearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
