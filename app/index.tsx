import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import SplashScreenComponent from '@/components/SplashScreen';
import { useAuth } from '@/hooks/useAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Only navigate after BOTH auth is loaded AND animation is complete
    if (!loading && animationComplete) {
      // Navigate based on auth state
      if (user) {
        console.log('✅ User authenticated, navigating to map');
        router.replace('/(tabs)/map');
      } else {
        console.log('🔐 No user, navigating to login');
        router.replace('/login');
      }
    }
  }, [loading, user, animationComplete]);

  return (
    <SplashScreenComponent
      onAnimationComplete={() => {
        console.log('🎬 Splash animation complete');
        setAnimationComplete(true);
      }}
    />
  );
}
