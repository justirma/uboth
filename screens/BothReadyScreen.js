import { StyleSheet, Text, View, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

export default function BothReadyScreen({ partnerName, onStartMeditation }) {
  const [countdown, setCountdown] = useState(3);

  // Countdown spring scale
  const countdownScale = useRef(new Animated.Value(0)).current;

  // Heart pulse
  const heartScale = useRef(new Animated.Value(1)).current;

  // Floating icons
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onStartMeditation();
    }
  }, [countdown]);

  // Spring in countdown number each time it changes
  useEffect(() => {
    if (countdown > 0) {
      countdownScale.setValue(0);
      Animated.spring(countdownScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [countdown]);

  // Heart pulse loop
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Floating icons
  useEffect(() => {
    const float1 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: -8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 8,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    const float2 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 6,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: -6,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    float1.start();
    float2.start();
    return () => { float1.stop(); float2.stop(); };
  }, []);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <View style={styles.iconRow}>
        <Animated.Text style={[styles.icon, { transform: [{ translateY: floatAnim1 }] }]}>
          🌿
        </Animated.Text>
        <Animated.Text style={[styles.icon, { transform: [{ translateY: floatAnim2 }] }]}>
          ☀️
        </Animated.Text>
      </View>

      <Animated.Text style={[styles.heart, { transform: [{ scale: heartScale }] }]}>
        💚
      </Animated.Text>

      <Text style={styles.title}>You're both here</Text>
      <Text style={styles.subtitle}>Let's breathe together</Text>

      {countdown > 0 && (
        <Animated.Text style={[styles.countdown, { transform: [{ scale: countdownScale }] }]}>
          {countdown}
        </Animated.Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  heart: {
    fontSize: 72,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: 40,
  },
  countdown: {
    fontSize: 96,
    fontWeight: '700',
    color: colors.primary,
  },
});
