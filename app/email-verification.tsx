import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useUserStore } from '@/store/userStore';
import { sendEmailVerification, reload } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { updateEmailVerification, setOnboardingCompleted } = useUserStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);

  // Send verification email on mount
  useEffect(() => {
    sendVerificationEmail();
  }, []);

  useEffect(() => {
    // Start cooldown timer for resend button
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationEmail = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'No user is currently signed in.');
        return;
      }

      if (currentUser.emailVerified) {
        // Already verified, skip
        handleVerificationComplete();
        return;
      }

      await sendEmailVerification(currentUser);
      setEmailSent(true);
      setResendCooldown(60);
      console.log('✅ Verification email sent to:', currentUser.email);
    } catch (error: any) {
      console.error('Send verification email error:', error);
      
      let errorMessage = 'Failed to send verification email.';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsVerifying(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'No user is currently signed in.');
        return;
      }

      // Reload user to get updated emailVerified status
      await reload(currentUser);

      if (currentUser.emailVerified) {
        // Email is verified!
        await handleVerificationComplete();
      } else {
        Alert.alert(
          'Not Verified Yet',
          'Please check your email and click the verification link. It may take a few minutes to arrive.',
          [
            { text: 'OK' },
            { text: 'Resend Email', onPress: () => sendVerificationEmail() }
          ]
        );
      }
    } catch (error) {
      console.error('Check verification error:', error);
      Alert.alert('Error', 'Failed to check verification status. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerificationComplete = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Update Firestore - mark email verified (don't mark onboarding complete yet - profile picture is next step)
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isEmailVerified: true,
        updatedAt: new Date().toISOString(),
      });

      // Update local store
      updateEmailVerification(true);

      console.log('✅ Email verification complete - proceeding to profile picture upload');

      // Redirect to profile picture upload (mandatory step)
      router.push('/upload-profile-picture');
    } catch (error) {
      console.error('Verification complete error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const handleResendCode = () => {
    if (resendCooldown > 0) return;
    sendVerificationEmail();
  };

  // Skip flow removed

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            {emailSent 
              ? `We've sent a verification link to your email address. Please check your inbox and click the link.`
              : 'Sending verification email...'}
          </Text>
        </View>

        <View style={styles.verificationContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.emailIcon}>📧</Text>
          </View>

          <Text style={styles.instruction}>
            1. Check your email inbox{'\n'}
            2. Click the verification link{'\n'}
            3. Come back and tap "I've Verified"
          </Text>

          <TouchableOpacity
            style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
            onPress={handleCheckVerification}
            disabled={isVerifying}
          >
            <Text style={styles.verifyButtonText}>
              {isVerifying ? 'Checking...' : "I've Verified My Email"}
            </Text>
          </TouchableOpacity>

          {/* Skip button removed as per requirements */}
        </View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the email?</Text>
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={resendCooldown > 0}
          >
            <Text style={[styles.resendButtonText, resendCooldown > 0 && styles.resendButtonDisabled]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
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
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  emailIcon: {
    fontSize: 48,
  },
  instruction: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  verifyButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '80%',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  verifyButtonText: {
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
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: Colors.white,
    marginBottom: 8,
  },
  resendButton: {
    padding: 8,
  },
  resendButtonText: {
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: Colors.gray,
  },
});
