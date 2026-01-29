import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useUserStore } from '@/store/userStore';

/**
 * Custom hook to listen for Firebase authentication state changes
 * Automatically loads user profile from Firestore when user signs in
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { loadUserFromFirestore, setHasRequestedLocationPermission } = useUserStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 AUTH STATE CHANGED:', firebaseUser ? firebaseUser.email : 'No user');
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // User is signed in, load their profile from Firestore
        await loadUserFromFirestore(firebaseUser.uid);
        // Reset per-login location prompt flag so we ask once per login
        setHasRequestedLocationPermission(false);
      }
      // NOTE: We don't clear data on logout anymore
      // Data persists in AsyncStorage so user sees their data when they log back in
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [loadUserFromFirestore, setHasRequestedLocationPermission]);

  return { user, loading };
}

