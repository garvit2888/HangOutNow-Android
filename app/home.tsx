import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to map tab after onboarding
    router.replace('/(tabs)/map');
  }, []);

  return null;
}
