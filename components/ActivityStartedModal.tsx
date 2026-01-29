import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { X } from 'lucide-react-native';
import { submitSOSReport } from '@/services/sosService';
import * as Location from 'expo-location';

interface ActivityStartedModalProps {
  visible: boolean;
  activityName: string;
  activityId: string;
  userId: string;
  userName?: string;
  userEmail?: string; // User email address
  activityEmoji?: string; // Emoji of the activity
  onActivityEnded: () => void;
  onClose: () => void;
}

export default function ActivityStartedModal({
  visible,
  activityName,
  activityId,
  userId,
  userName,
  userEmail,
  activityEmoji,
  onActivityEnded,
  onClose,
}: ActivityStartedModalProps) {
  
  const handleSOS = async () => {
    try {
      // Get user's current location if possible
      let location: { latitude: number; longitude: number } | undefined;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({});
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      } catch (locationError) {
        console.warn('⚠️ Could not get location for SOS:', locationError);
        // Continue without location
      }

      // Submit SOS report to Firestore
      await submitSOSReport({
        userId,
        userName: userName || 'Unknown User',
        userEmail: userEmail,
        activityId,
        activityName,
        location,
      });

      console.log('🚨 SOS report submitted successfully');

      // Open phone app with 112 dialed (emergency number)
      const phoneNumber = '112';
      const phoneUrl = Platform.select({
        ios: `telprompt:${phoneNumber}`, // telprompt shows confirmation dialog
        android: `tel:${phoneNumber}`, // tel directly dials
      });

      if (phoneUrl) {
        const canOpen = await Linking.canOpenURL(phoneUrl);
        if (canOpen) {
          await Linking.openURL(phoneUrl);
        } else {
          Alert.alert(
            'Error',
            'Unable to open phone app. Please dial 112 manually.',
            [{ text: 'OK' }]
          );
        }
      }

      // Close modal after SOS is triggered
      onClose();
    } catch (error) {
      console.error('❌ Error handling SOS:', error);
      Alert.alert(
        'Error',
        'Failed to submit SOS report. Please dial 112 manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleActivityEnded = () => {
    onActivityEnded();
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
        <LinearGradient
          colors={[Colors.primary, Colors.darkPurple]}
          style={styles.modalContainer}
        >
          <View style={styles.content}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.white} />
            </TouchableOpacity>

            {/* Activity Emoji */}
            {activityEmoji && (
              <View style={styles.iconContainer}>
                <Text style={styles.emoji}>{activityEmoji}</Text>
              </View>
            )}

            {/* Title */}
            <Text style={styles.title}>
              {activityName} activity started
            </Text>

            {/* Safety message */}
            <Text style={styles.message}>
              Remember to stay safe and alert all the times and dont forget to enjoy
            </Text>

            {/* SOS Button */}
            <TouchableOpacity
              style={styles.sosButton}
              onPress={handleSOS}
            >
              <LinearGradient
                colors={['#FF3B30', '#FF1744']}
                style={styles.sosButtonGradient}
              >
                <Text style={styles.sosButtonText}>SOS</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Activity Ended Button */}
            <TouchableOpacity
              style={styles.activityEndedButton}
              onPress={handleActivityEnded}
            >
              <Text style={styles.activityEndedText}>Activity Ended</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  content: {
    padding: 32,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 20,
  },
  emoji: { fontSize: 56, textAlign: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.9,
  },
  sosButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 4,
  },
  activityEndedButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activityEndedText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});

