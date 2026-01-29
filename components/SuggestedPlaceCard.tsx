import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Place } from '@/types';
import Colors from '@/constants/colors';
import { MapPin } from 'lucide-react-native';

type SuggestedPlaceCardProps = {
  place: Place;
  onPress: (place: Place) => void;
};

export default function SuggestedPlaceCard({ place, onPress }: SuggestedPlaceCardProps) {
  // Helper function to get type style
  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'coffee':
        return styles.typecoffee;
      case 'food':
        return styles.typefood;
      case 'chill':
        return styles.typechill;
      case 'walk':
        return styles.typewalk;
      default:
        return {};
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress(place)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: place.image }} style={styles.image} />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        <Text style={styles.name}>{place.name}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detail}>
            <MapPin size={12} color={Colors.white} />
            <Text style={styles.detailText}>
              {place.distance} mi
            </Text>
          </View>
          
          <View style={[styles.typeTag, getTypeStyle(place.type)]}>
            <Text style={styles.typeText}>
              {place.type.charAt(0).toUpperCase() + place.type.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 180,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  name: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.white,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  typecoffee: {
    backgroundColor: '#8B4513',
  },
  typefood: {
    backgroundColor: '#FF6347',
  },
  typechill: {
    backgroundColor: '#4682B4',
  },
  typewalk: {
    backgroundColor: '#228B22',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.white,
  },
});