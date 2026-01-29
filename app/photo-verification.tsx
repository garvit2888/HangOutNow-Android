import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';

export default function PhotoVerificationScreen() {
  const router = useRouter();
  const { updatePhotoVerification } = useUserStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTakeSelfie = () => {
    setIsProcessing(true);
    
    // Simulate camera and verification process
    setTimeout(() => {
      setIsProcessing(false);
      updatePhotoVerification(true);
      Alert.alert(
        'Verification Complete!',
        'Your photo has been successfully verified.',
        [
          {
            text: 'Continue',
            onPress: () => router.push('/instagram-connect'),
          },
        ]
      );
    }, 3000);
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Photo Verification</Text>
          <Text style={styles.subtitle}>
            Take a selfie to verify your identity
          </Text>
        </View>

        <View style={styles.verificationContainer}>
          <View style={styles.cameraPlaceholder}>
            <View style={styles.cameraCircle}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </View>

          <Text style={styles.instruction}>
            Position your face in the circle above and take a selfie
          </Text>

          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Requirements:</Text>
            <Text style={styles.requirement}>• Good lighting</Text>
            <Text style={styles.requirement}>• Face clearly visible</Text>
            <Text style={styles.requirement}>• No sunglasses or masks</Text>
          </View>

          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            onPress={handleTakeSelfie}
            disabled={isProcessing}
          >
            <Text style={styles.captureButtonText}>
              {isProcessing ? 'Processing...' : 'Take Selfie'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  verificationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cameraCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 3,
    borderColor: Colors.secondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cameraIcon: {
    fontSize: 48,
  },
  instruction: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  requirements: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    width: '100%',
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  requirement: {
    fontSize: 14,
    color: Colors.white,
    marginBottom: 4,
  },
  captureButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  captureButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  captureButtonText: {
    color: Colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
