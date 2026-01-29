import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the animation sequence
    const animationSequence = Animated.sequence([
      // Logo entrance animation
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Text fade in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Loading indicator
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start();

    // Complete splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.darkPurple]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/App Name */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.logoText}>HangOutNow</Text>
        </Animated.View>

        {/* Subtitle removed as requested */}

        {/* Loading Indicator */}
        <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 60,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});

