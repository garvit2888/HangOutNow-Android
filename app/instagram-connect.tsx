import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export default function InstagramConnectScreen() {
  const router = useRouter();
  const { updateInstagramConnection, setOnboardingCompleted } = useUserStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectInstagram = async () => {
    setIsConnecting(true);
    
    try {
      // Simulate Instagram OAuth flow
      // TODO: Implement actual Instagram OAuth later
      const instagramUsername = 'user_instagram_username';
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Update Firestore with Instagram connection
      await updateDoc(doc(db, 'users', currentUser.uid), {
        instagramUsername,
        hasCompletedOnboarding: true,
        updatedAt: new Date().toISOString(),
      });

      // Update local store
      updateInstagramConnection(instagramUsername);
      setOnboardingCompleted(true);
      
      console.log('✅ INSTAGRAM: Marked onboarding as completed in Firestore');
      
      Alert.alert(
        'Instagram Connected!',
        'Your Instagram account has been successfully linked.',
        [
          {
            text: 'Continue to App',
            onPress: () => {
              router.replace('/(tabs)/map');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Instagram connection error:', error);
      Alert.alert('Error', 'Failed to connect Instagram. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip Instagram Connection?',
      'You can connect Instagram later in settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: async () => {
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) {
                throw new Error('No authenticated user found');
              }

              // Mark onboarding as completed in Firestore
              await updateDoc(doc(db, 'users', currentUser.uid), {
                hasCompletedOnboarding: true,
                updatedAt: new Date().toISOString(),
              });

              // Update local store
              setOnboardingCompleted(true);
              console.log('✅ INSTAGRAM: Marked onboarding as completed (skipped) in Firestore');
              
              router.replace('/(tabs)/map');
            } catch (error) {
              console.error('Skip Instagram error:', error);
              Alert.alert('Error', 'Failed to complete setup. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect Instagram</Text>
          <Text style={styles.subtitle}>
            Link your Instagram for social verification
          </Text>
        </View>

        <View style={styles.verificationContainer}>
          <View style={styles.instagramLogo}>
            <Text style={styles.instagramIcon}>📷</Text>
          </View>

          <Text style={styles.instruction}>
            Connect your Instagram account to build trust and verify your identity
          </Text>

          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Benefits:</Text>
            <Text style={styles.benefit}>✓ Social verification</Text>
            <Text style={styles.benefit}>✓ Profile authenticity</Text>
            <Text style={styles.benefit}>✓ Community trust</Text>
            <Text style={styles.benefit}>✓ Enhanced matching</Text>
          </View>

          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
            onPress={handleConnectInstagram}
            disabled={isConnecting}
          >
            <Text style={styles.connectButtonText}>
              {isConnecting ? 'Connecting...' : 'Connect Instagram'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isConnecting}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
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
  instagramLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  instagramIcon: {
    fontSize: 48,
  },
  instruction: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  benefits: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    width: '100%',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  benefit: {
    fontSize: 14,
    color: Colors.white,
    marginBottom: 4,
  },
  connectButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  connectButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  connectButtonText: {
    color: Colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
