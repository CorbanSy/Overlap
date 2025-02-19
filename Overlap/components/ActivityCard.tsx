import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ActivityCard = ({ item }) => (
  <View style={styles.card}>
    {/* Show image if available */}
    {item.photoReference && (
      <Image
        source={{
          uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${item.photoReference}&key=AIzaSyDcTuitQdQGXwuLp90NqQ_ZwhnMSGrr8mY`
        }}
        style={styles.cardImage}
      />
    )}

    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardSubtitle}>
        {item.rating} ⭐ ({item.userRatingsTotal}+ ratings)
      </Text>

      <TouchableOpacity onPress={() => console.log('Remove', item)}>
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#1B1F24', padding: 12, borderRadius: 8, marginBottom: 12 },
  cardImage: { width: '100%', height: 120, borderRadius: 6 },
  cardContent: { padding: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  cardSubtitle: { fontSize: 14, color: '#AAAAAA', marginTop: 4 },
});

export default ActivityCard;
