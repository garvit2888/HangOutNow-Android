import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import SplashScreenComponent from '@/components/SplashScreen';
import { useAuth } from '@/hooks/useAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (!loading) {
      // Navigate based on auth state
      if (user) {
        console.log('✅ User authenticated, navigating to map');
        router.replace('/(tabs)/map');
      } else {
        console.log('🔐 No user, navigating to login');
        router.replace('/login');
      }
    }
  }, [loading, user]);

  return <SplashScreenComponent onAnimationComplete={() => { }} />;
}
