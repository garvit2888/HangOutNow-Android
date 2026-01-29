import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Colors from '@/constants/colors';
import { Eye, EyeOff } from 'lucide-react-native';
import { useUserStore } from '@/store/userStore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithCredential, OAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGroupStore } from '@/store/groupStore';
import { useChatStore } from '@/store/chatStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { setLoginEmail, profile, loadUserFromFirestore, clearUser } = useUserStore();
  const { clearAllGroups, clearUserSpecificData, clearActiveGroups } = useGroupStore();
  const { clearAllChats, loadUserChatsFromFirestore } = useChatStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Google Sign-In Configuration
  // Detect if running in Expo Go (development) or standalone build (production)
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || 
                   Constants.appOwnership === 'expo';
  
  // Google Sign-In Configuration
  // For Expo Go: use Web Client ID + HTTPS proxy (automatic)
  // For Production (TestFlight/App Store): use Web Client ID + iOS Client ID
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: '730853963213-dr2qcknf94toot1scvhn5v92jnqs7mul.apps.googleusercontent.com',
      // iOS Client ID for production builds (TestFlight/App Store)
      // Bundle ID: app.hangoutnow
      iosClientId: '33856711945-th62d2auasg4j4a3faacvqm2631u7n1p.apps.googleusercontent.com',
    },
    {
      // In Expo Go, the proxy is used automatically
      // In production, use custom scheme
      scheme: isExpoGo ? undefined : 'myapp',
    }
  );

  // Debug: Log the redirect URI being used (simplified for production)
  useEffect(() => {
    if (request && __DEV__) {
      // Only show debug info in development
      console.log('🔍 Google OAuth Redirect URI:', request.redirectUri);
    }
  }, [request]);

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    } else if (response?.type === 'error') {
      console.error('❌ Google Sign-In Error:', response.error);
      Alert.alert(
        'Sign-In Error',
        `Google sign-in failed: ${response.error?.message || 'Unknown error'}. Please check that redirect URIs are configured in Google Cloud Console.`
      );
    }
  }, [response]);

  // Wait for store to load persisted data
  useEffect(() => {
    if (!isStoreLoaded) {
      setTimeout(() => {
        console.log('📱 Store loaded, checking chat persistence...');
        // Check if chats are properly loaded
        const chatState = useChatStore.getState();
        console.log('📱 Current chat state:', {
          chatCount: chatState.chats.length,
          hasMessages: Object.keys(chatState.messages).length > 0
        });
        setIsStoreLoaded(true);
      }, 1000);
    }
  }, [isStoreLoaded]);

  const clearAllUserData = async (newUserEmail: string) => {
    console.log('🧹 Checking if previous user data needs clearing...');
    
    try {
      // Check if there's a previous user stored
      const storedUserData = await AsyncStorage.getItem('user-storage');
      const storedChatData = await AsyncStorage.getItem('chat-storage');
      
      console.log('📦 Stored user data exists:', !!storedUserData);
      console.log('📦 Stored chat data exists:', !!storedChatData);
      
      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        const previousEmail = parsed?.state?.loginEmail;
        
        console.log('📧 Previous user email:', previousEmail);
        console.log('📧 New user email:', newUserEmail);
        
        if (previousEmail && previousEmail !== newUserEmail) {
          // Different user - clear only USER-SPECIFIC data, keep shared activities
          console.log('⚠️ Different user detected - clearing user-specific data only');
          
          // Clear only user and chat storage (personal data)
          await AsyncStorage.removeItem('user-storage');
          await AsyncStorage.removeItem('chat-storage');
          
          // Clear in-memory state for user and chats
          clearUser();
          clearAllChats();
          
          // Clear user-specific group data (myGroups, messages) but keep activities
          clearUserSpecificData(previousEmail);
          
          // Clear activeGroups to force fresh load from Firestore
          clearActiveGroups();
          
          console.log('✅ User-specific data cleared, activities will reload from Firestore');
        } else {
          // Same user - keep all data
          console.log('✅ Same user - keeping all data');
          console.log('📱 Chats should be preserved for same user');
        }
      } else {
        // No previous user - only clear user storage, keep chats
        console.log('⚠️ No previous user data found - clearing user data only, keeping chats');
        console.log('📱 Chat data should be preserved:', !!storedChatData);
        await AsyncStorage.removeItem('user-storage');
        clearUser();
        // Don't clear chats - they should persist
      }
      
    } catch (error) {
      console.error('❌ Error checking/clearing user data:', error);
      // On error, clear only user-specific data for safety
      await AsyncStorage.removeItem('user-storage');
      clearUser();
      // Don't clear chats on error - they should persist
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const isStrongPassword = (password: string) => {
    if (!password) return false;
    if (password.length < 7) return false; // More than 6 characters
    if (/\s/.test(password)) return false; // No whitespace allowed
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-]/.test(password);
    return hasLetter && hasNumber && hasSpecial;
  };

  const validateForm = () => {
    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return false;
    }
    if (!isLogin && password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return false;
    }
    if (!isLogin) {
      if (!isStrongPassword(password)) {
        Alert.alert(
          'Weak Password',
          'Password must be at least 7 characters long, include a letter, a number, a special character, and cannot contain spaces.'
        );
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      // Check and clear previous user data if it's a different user
      await clearAllUserData(formData.email);
      
      if (isLogin) {
        // Sign in existing user
        console.log('🔐 Attempting to sign in with email:', formData.email);
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        console.log('✅ Sign in successful, user ID:', userCredential.user.uid);
        
        // Check if user has completed onboarding
        console.log('📖 Fetching user document from Firestore...');
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('✅ User document found:', userData.email, 'Onboarding complete:', userData.hasCompletedOnboarding);
          setLoginEmail(formData.email);
          
          if (userData.hasCompletedOnboarding) {
            // Load user's chats from Firestore
            console.log('📱 Loading user chats from Firestore...');
            await loadUserChatsFromFirestore(userCredential.user.uid);
            console.log('✅ Navigation to map...');
            router.push('/(tabs)/map');
          } else {
            console.log('✅ Navigation to onboarding...');
            router.push('/onboarding');
          }
        } else {
          // User exists in Auth but not in Firestore (edge case)
          console.log('⚠️ User exists in Auth but not in Firestore - sending to onboarding');
          setLoginEmail(formData.email);
          router.push('/onboarding');
        }
      } else {
        // Create new user account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        
        // Create initial user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: formData.email,
          uid: userCredential.user.uid,
          hasCompletedOnboarding: false,
          createdAt: new Date().toISOString(),
        });
        
        setLoginEmail(formData.email);
        router.push('/onboarding');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      console.error('Error code:', error.code);
      console.error('Is login mode:', isLogin);
      
      // Handle specific Firebase errors
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/user-not-found') {
        // For login, this might also mean wrong password (Firebase doesn't reveal if email exists)
        if (isLogin) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else {
          errorMessage = 'No account found with this email. Please sign up.';
        }
      } else if (error.code === 'auth/wrong-password') {
        if (isLogin) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else {
          errorMessage = 'Incorrect password. Please try again.';
        }
      } else if (error.code === 'auth/invalid-credential') {
        // This error can mean wrong password or wrong email
        // On simulator, sometimes this is a network/caching issue, so provide more context
        console.error('❌ Invalid credential error - Platform:', Platform.OS);
        console.error('❌ Is simulator:', Platform.OS === 'ios' && __DEV__);
        
        if (isLogin) {
          // For iOS simulator, this might be a known Firebase bug - provide helpful message
          const isSimulator = Platform.OS === 'ios' && (Constants.isDevice === false || __DEV__);
          if (isSimulator) {
            errorMessage = 'Login issue detected on simulator. If credentials are correct, please try:\n1. Restart the simulator\n2. Clear app data and try again\n3. Test on a physical device';
          } else {
            errorMessage = 'Invalid username or password. Please try again.';
          }
        } else {
          errorMessage = 'Invalid credentials. Please check your information.';
        }
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-login-credentials') {
        // New Firebase error code for invalid credentials
        if (isLogin) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else {
          errorMessage = 'Invalid credentials. Please check your information.';
        }
      }
      
      // Only show alert for actual errors (not if login succeeded despite the error)
      if (error.code) {
        // Customize alert title based on error type for better UX
        let alertTitle = 'Error';
        if (isLogin && (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-login-credentials')) {
          alertTitle = 'Login Failed';
        }
        Alert.alert(alertTitle, errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      Alert.alert('Error', 'Please enter your email address first.');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, formData.email);
      Alert.alert(
        'Password Reset',
        `A password reset link has been sent to ${formData.email}. Please check your email.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send password reset email.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setIsLoading(true);
      
      // Create a Google credential with the token
      const credential = GoogleAuthProvider.credential(idToken);
      
      // Sign in with the credential
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      console.log('✅ Google Sign-In successful:', user.email);
      
      // Now check and clear previous user data if it's a different user
      await clearAllUserData(user.email || '');
      
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Existing user - load their profile
        const userData = userDoc.data();
        await loadUserFromFirestore(user.uid);
        
        if (userData.hasCompletedOnboarding) {
          // Load user's chats from Firestore
          await loadUserChatsFromFirestore(user.uid);
          router.push('/(tabs)/map');
        } else {
          setLoginEmail(user.email || '');
          router.push('/onboarding');
        }
      } else {
        // New user - create their document and send to onboarding
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || '',
          avatar: user.photoURL || '',
          hasCompletedOnboarding: false,
          isEmailVerified: user.emailVerified,
          isPhotoVerified: false,
          createdAt: new Date().toISOString(),
        });
        
        setLoginEmail(user.email || '');
        router.push('/onboarding');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      
      let errorMessage = 'Google Sign-In failed. Please try again.';
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to continue' : 'Join HangOutNow today'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor={Colors.lightGray}
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(text) => handleInputChange('email', text)}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={Colors.lightGray}
            secureTextEntry={!showPassword}
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.lightGray} />
            ) : (
              <Eye size={20} color={Colors.lightGray} />
            )}
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              placeholderTextColor={Colors.lightGray}
              secureTextEntry={!showConfirmPassword}
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={Colors.lightGray} />
              ) : (
                <Eye size={20} color={Colors.lightGray} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {isLogin && (
          <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading || (isLogin && !isStoreLoaded)}
        >
          <Text style={styles.submitButtonText}>
            {isLoading 
              ? (isLogin ? 'Signing In...' : 'Creating Account...') 
              : (isLogin && !isStoreLoaded)
              ? 'Loading...'
              : (isLogin ? 'Sign In' : 'Create Account')
            }
          </Text>
        </TouchableOpacity>


        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchLink}>
              {isLogin ? 'Sign Up' : 'Sign In'}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.8,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: Colors.white,
    fontSize: 16,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    marginBottom: 15,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    color: Colors.white,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 15,
    paddingLeft: 0,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: Colors.white,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  googleButton: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    color: Colors.white,
    fontSize: 14,
  },
  switchLink: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
