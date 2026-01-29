import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import AvailabilityButton from '@/components/AvailabilityButton';
import SuggestedPlaceCard from '@/components/SuggestedPlaceCard';
import { mockPlaces } from '@/constants/mockData';
import { Place } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  
  const handlePlacePress = (place: Place) => {
    // In a real app, this would show more details or suggest this place to friends
    console.log('Selected place:', place);
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[Colors.primary, Colors.darkPurple]}
        style={styles.container}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeText}>Ready to</Text>
          <Text style={styles.highlightText}>hang out?</Text>
        </View>
        
        <AvailabilityButton />
        
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Suggested Places Nearby</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.placesContainer}
          >
            {mockPlaces.map((place) => (
              <SuggestedPlaceCard
                key={place.id}
                place={place}
                onPress={handlePlacePress}
              />
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoStep}>1. Tap "I'm Free Now" to show you're available</Text>
            <Text style={styles.infoStep}>2. Browse who else is free nearby</Text>
            <Text style={styles.infoStep}>3. Chat and meet up spontaneously</Text>
            <Text style={styles.infoNote}>
              Your availability automatically turns off after 2 hours
            </Text>
          </View>
        </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.white,
  },
  highlightText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginTop: -5,
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
  },
  placesContainer: {
    paddingVertical: 10,
  },
  infoContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  infoStep: {
    color: Colors.white,
    fontSize: 16,
    marginBottom: 10,
  },
  infoNote: {
    color: Colors.secondary,
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
});