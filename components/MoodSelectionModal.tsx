import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { PartyPopper, Coffee, Utensils, Wind, Film, Footprints } from 'lucide-react-native';

interface MoodSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onMoodSelect: (mood: string) => void;
}

const moodOptions = [
  { id: 'party', label: 'Party', icon: PartyPopper, color: '#FF6B6B' },
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#8B4513' },
  { id: 'food', label: 'Food', icon: Utensils, color: '#FF8C00' },
  { id: 'chill', label: 'Chill', icon: Wind, color: '#4ECDC4' },
  { id: 'movie', label: 'Movie', icon: Film, color: '#9B59B6' },
  { id: 'walk', label: 'Walk', icon: Footprints, color: '#2ECC71' },
];

export default function MoodSelectionModal({ visible, onClose, onMoodSelect }: MoodSelectionModalProps) {
  const handleMoodSelect = (mood: string) => {
    onMoodSelect(mood);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.darkPurple]}
            style={styles.modalContent}
          >
            <View style={styles.header}>
              <Text style={styles.title}>What are you in the mood for?</Text>
              <Text style={styles.subtitle}>Select your current vibe</Text>
            </View>

            <View style={styles.moodGrid}>
              {moodOptions.map((mood) => {
                const IconComponent = mood.icon;
                return (
                  <TouchableOpacity
                    key={mood.id}
                    style={styles.moodOption}
                    onPress={() => handleMoodSelect(mood.id)}
                  >
                    <View style={[styles.moodIconContainer, { backgroundColor: mood.color }]}>
                      <IconComponent size={24} color={Colors.white} />
                    </View>
                    <Text style={styles.moodLabel}>{mood.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.secondary,
    textAlign: 'center',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  moodOption: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
  },
  moodIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

