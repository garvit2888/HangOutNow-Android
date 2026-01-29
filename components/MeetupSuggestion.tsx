import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Place } from '@/types';
import Colors from '@/constants/colors';
import { MapPin } from 'lucide-react-native';

type MeetupSuggestionProps = {
  place: Place;
  onSend: (text: string) => void;
};

export default function MeetupSuggestion({ place, onSend }: MeetupSuggestionProps) {
  const handleSend = () => {
    onSend(`Let's meet at ${place.name}? It's only ${place.distance} miles away.`);
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handleSend}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MapPin size={20} color={Colors.white} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Meet at {place.name}?</Text>
          <Text style={styles.subtitle}>{place.address} • {place.distance} mi away</Text>
        </View>
      </View>
      
      <Text style={styles.tapText}>Tap to suggest</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightPurple,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
  },
  tapText: {
    fontSize: 10,
    color: Colors.white,
    opacity: 0.6,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});