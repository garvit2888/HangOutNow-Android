import React from 'react';
import { useRouter } from 'expo-router';
import SplashScreenComponent from '@/components/SplashScreen';

export default function SplashScreen() {
  const router = useRouter();

  const handleAnimationComplete = () => {
    router.replace('/login');
  };

  return <SplashScreenComponent onAnimationComplete={handleAnimationComplete} />;
}
