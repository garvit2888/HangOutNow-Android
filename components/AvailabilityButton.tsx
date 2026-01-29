import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import ShuffleModal from './ShuffleModal';
import MoodSelectionModal from './MoodSelectionModal';

export default function AvailabilityButton() {
  const { isAvailable, availableUntil, selectedMood, setAvailable, setSelectedMood } = useUserStore();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showShuffleModal, setShowShuffleModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  
  useEffect(() => {
    if (isAvailable && availableUntil) {
      const interval = setInterval(() => {
        const now = new Date();
        const expiry = new Date(availableUntil);
        const diff = expiry.getTime() - now.getTime();
        
        if (diff <= 0) {
          clearInterval(interval);
          setAvailable(false);
          return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft(`${hours}h ${minutes}m`);
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [isAvailable, availableUntil]);
  
  const toggleAvailability = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!isAvailable) {
      // When becoming available, show the mood selection modal first
      setShowMoodModal(true);
    } else {
      // When turning off availability, clear mood and set unavailable
      setSelectedMood(null);
      setAvailable(false);
    }
  };

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setAvailable(true);
    setShowMoodModal(false);
    // Small delay to ensure state is updated before showing shuffle modal
    setTimeout(() => {
      setShowShuffleModal(true);
    }, 100);
  };

  const handleMoodModalClose = () => {
    setShowMoodModal(false);
    // If user cancels mood selection, don't set as available
    // Keep the button in "I'm Free Now" state
  };
  
  const handleCloseModal = () => {
    setShowShuffleModal(false);
  };
  
  return (
    <>
      <TouchableOpacity 
        onPress={toggleAvailability}
        style={styles.container}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isAvailable ? 
            [Colors.success, '#2E8B57'] : 
            [Colors.secondary, '#FFC125']}
          style={styles.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.buttonText}>
            {isAvailable ? "I'm Available" : "I'm Free Now"}
          </Text>
          {isAvailable && selectedMood && (
            <Text style={styles.moodText}>
              In the mood for {selectedMood}
            </Text>
          )}
          {isAvailable && timeLeft && (
            <Text style={styles.timeText}>
              {timeLeft} left
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      <MoodSelectionModal 
        visible={showMoodModal} 
        onClose={handleMoodModalClose}
        onMoodSelect={handleMoodSelect}
      />
      
      <ShuffleModal 
        visible={showShuffleModal} 
        onClose={handleCloseModal} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  button: {
    width: 280,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  moodText: {
    color: Colors.white,
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
    fontStyle: 'italic',
  },
  timeText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: 4,
  },
});