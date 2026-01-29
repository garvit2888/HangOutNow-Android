import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  AuthError
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../types';

export class AuthService {
  /**
   * Sign up a new user with email and password
   */
  static async signUp(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getAuthErrorMessage(authError.code));
    }
  }

  /**
   * Sign in an existing user
   */
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getAuthErrorMessage(authError.code));
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getAuthErrorMessage(authError.code));
    }
  }

  /**
   * Create or update user profile in Firestore
   */
  static async createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...profileData,
        createdAt: new Date().toISOString(),
        hasCompletedOnboarding: false,
      }, { merge: true });
    } catch (error) {
      throw new Error('Failed to create user profile');
    }
  }

  /**
   * Get user profile from Firestore
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updates);
    } catch (error) {
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Mark onboarding as completed
   */
  static async completeOnboarding(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        hasCompletedOnboarding: true,
      });
    } catch (error) {
      throw new Error('Failed to complete onboarding');
    }
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Convert Firebase auth error codes to user-friendly messages
   */
  private static getAuthErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email. Please sign up first.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid login credentials. Please check your email and password.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.',
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }
}

