import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getUserStorageKey, setCurrentUserId } from '@/utils/userStorage';

// Note: We'll import these stores dynamically to avoid circular dependencies

export interface UserProfile {
  uid?: string; // Firebase user ID
  fullName: string;
  email: string;
  gender: string;
  dateOfBirth?: string; // Date of birth for user profile
  isEmailVerified: boolean;
  isPhotoVerified: boolean;
  instagramUsername?: string;
  avatar?: string; // NEW: profile avatar uri
  pushToken?: string; // Expo push token for notifications
  hasCompletedOnboarding?: boolean; // NEW: track if user completed onboarding
}

interface UserState {
  profile: UserProfile | null;
  loginEmail: string | null;
  isAvailable: boolean;
  availableUntil: string | null;
  currentMood: string;
  selectedMood: string | null;
  visibleTo: 'friends' | 'everyone';
  location: { latitude: number; longitude: number } | null;
  instagramConnected: boolean;
  maxAgeDifference: number; // NEW
  hasRequestedLocationPermission?: boolean;
  setProfile: (profile: UserProfile) => void;
  setLoginEmail: (email: string) => void;
  setProfileAvatar: (avatar: string) => void; // NEW
  updateEmailVerification: (verified: boolean) => void;
  updatePhotoVerification: (verified: boolean) => void;
  updateInstagramConnection: (username: string) => void;
  setAvailable: (status: boolean) => void;
  setMood: (mood: string) => void;
  setSelectedMood: (mood: string | null) => void;
  setVisibleTo: (visibility: 'friends' | 'everyone') => void;
  setLocation: (location: { latitude: number; longitude: number } | null) => void;
  setInstagramConnected: (connected: boolean) => void;
  setMaxAgeDifference: (diff: number) => void; // NEW
  setOnboardingCompleted: (completed: boolean) => void; // NEW
  loadUserFromFirestore: (uid: string) => Promise<void>; // NEW: Load user data from Firestore
  clearUser: () => void; // NEW: Clear user data on logout
  setHasRequestedLocationPermission: (requested: boolean) => void;
  // Floating SOS state
  sos: {
    active: boolean;
    activityId?: string;
    activityName?: string;
    requestModal?: boolean; // map requests to reopen modal
  };
  setSOSActive: (active: boolean, activity?: { id: string; name: string }) => void;
  requestSOSModal: () => void;
  clearSOSRequest: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      loginEmail: null,
      isAvailable: false,
      availableUntil: null,
      currentMood: 'all',
      selectedMood: null,
      visibleTo: 'friends',
      location: null,
      instagramConnected: false,
      maxAgeDifference: 5, // NEW
      hasRequestedLocationPermission: false,
      sos: { active: false },
      setProfile: (profile) => set({ profile }),
      setLoginEmail: (email) => set({ loginEmail: email }),
      setProfileAvatar: (avatar) => set((state) => ({
        profile: state.profile ? { ...state.profile, avatar } : { fullName: 'User', email: state.loginEmail || 'user@example.com', gender: '', isEmailVerified: false, isPhotoVerified: false, avatar }
      })),
      updateEmailVerification: (verified) => set((state) => ({
        profile: state.profile ? { ...state.profile, isEmailVerified: verified } : null
      })),
      updatePhotoVerification: (verified) => set((state) => ({
        profile: state.profile ? { ...state.profile, isPhotoVerified: verified } : null
      })),
      updateInstagramConnection: (username) => set((state) => ({
        profile: state.profile ? { ...state.profile, instagramUsername: username } : null,
        instagramConnected: true
      })),
      setAvailable: (status) => set((state) => {
        if (status) {
          const expiryTime = new Date();
          expiryTime.setHours(expiryTime.getHours() + 2);
          return { isAvailable: true, availableUntil: expiryTime.toISOString() };
        } else {
          return { isAvailable: false, availableUntil: null };
        }
      }),
      setMood: (mood) => set({ currentMood: mood }),
      setSelectedMood: (mood) => set({ selectedMood: mood }),
      setVisibleTo: (visibility) => set({ visibleTo: visibility }),
      setLocation: (location) => set({ location }),
      setInstagramConnected: (connected) => set({ instagramConnected: connected }),
      setMaxAgeDifference: (diff) => set({ maxAgeDifference: diff }),
      setHasRequestedLocationPermission: (requested) => set({ hasRequestedLocationPermission: requested }),
      setSOSActive: (active, activity) => set((state) => ({
        sos: {
          active,
          activityId: activity?.id ?? state.sos.activityId,
          activityName: activity?.name ?? state.sos.activityName,
          requestModal: false,
        },
      })),
      requestSOSModal: () => set((state) => ({ sos: { ...state.sos, requestModal: true } })),
      clearSOSRequest: () => set((state) => ({ sos: { ...state.sos, requestModal: false } })),
      setOnboardingCompleted: (completed) => set((state) => ({
        profile: state.profile ? { ...state.profile, hasCompletedOnboarding: completed } : null
      })),
      loadUserFromFirestore: async (uid: string) => {
        try {
          // Set current user ID for storage isolation
          setCurrentUserId(uid);

          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            set({
              profile: {
                uid,
                fullName: userData.fullName || '',
                email: userData.email || '',
                gender: userData.gender || '',
                dateOfBirth: userData.dateOfBirth,
                isEmailVerified: userData.isEmailVerified || false,
                isPhotoVerified: userData.isPhotoVerified || false,
                instagramUsername: userData.instagramUsername,
                avatar: userData.avatar,
                pushToken: userData.pushToken,
                hasCompletedOnboarding: userData.hasCompletedOnboarding || false,
              },
              loginEmail: userData.email,
            });
            console.log('✅ USER STORE: Loaded user from Firestore:', userData.email);
          } else {
            console.log('⚠️ USER STORE: No user document found for uid:', uid);
          }
        } catch (error) {
          console.error('❌ USER STORE: Error loading user from Firestore:', error);
        }
      },
      clearUser: () => {
        // Clear user ID when logging out
        setCurrentUserId(null);
        set({
          profile: null,
          loginEmail: null,
          isAvailable: false,
          availableUntil: null,
          currentMood: 'all',
          selectedMood: null,
          instagramConnected: false,
        });
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Dynamically generate storage key based on current user
      partialize: (state) => ({
        profile: state.profile,
        loginEmail: state.loginEmail,
        instagramConnected: state.instagramConnected,
        isAvailable: state.isAvailable,
        availableUntil: state.availableUntil,
        hasRequestedLocationPermission: state.hasRequestedLocationPermission,
        sos: state.sos,
      }),
    }
  )
);