import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFriendsStore } from '@/store/friendsStore';
import Colors from '@/constants/colors';
import { moodOptions } from '@/constants/mockData';
import { Coffee, Users, Utensils, Sofa, MapPin } from 'lucide-react-native';

export default function MoodFilter() {
  const { selectedMood, filterByMood } = useFriendsStore();
  
  const getIcon = (iconName: string, isSelected: boolean) => {
    const color = isSelected ? Colors.white : Colors.darkPurple;
    const size = 20;
    
    switch (iconName) {
      case 'users':
        return <Users size={size} color={color} />;
      case 'coffee':
        return <Coffee size={size} color={color} />;
      case 'utensils':
        return <Utensils size={size} color={color} />;
      case 'couch':
        return <Sofa size={size} color={color} />;
      case 'walking':
        return <MapPin size={size} color={color} />; // Using MapPin instead of Walking
      default:
        return <Users size={size} color={color} />;
    }
  };
  
  return (
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {moodOptions.map((option) => {
        const isSelected = selectedMood === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.moodButton,
              isSelected && styles.selectedMoodButton
            ]}
            onPress={() => filterByMood(option.id)}
          >
            {getIcon(option.icon, isSelected)}
            <Text style={[
              styles.moodText,
              isSelected && styles.selectedMoodText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  selectedMoodButton: {
    backgroundColor: Colors.secondary,
  },
  moodText: {
    color: Colors.darkPurple,
    fontWeight: '500',
  },
  selectedMoodText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});