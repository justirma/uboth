import { StyleSheet, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing } from '../theme';

export default function WaitingScreen({ partnerName }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing plant emoji — scale 0.9 to 1.1 on a 3-second loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Fade in text
    Animated.timing(textFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => pulse.stop();
  }, []);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Animated.Text style={[styles.plant, { transform: [{ scale: pulseAnim }] }]}>
        🌿
      </Animated.Text>
      <Animated.Text style={[styles.waitingText, { opacity: textFade }]}>
        Waiting for {partnerName}...
      </Animated.Text>
      <Animated.Text style={[styles.subtext, { opacity: textFade }]}>
        {partnerName} was notified
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  plant: {
    fontSize: 80,
    marginBottom: spacing.xxl,
  },
  waitingText: {
    fontSize: 20,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  subtext: {
    fontSize: 14,
    color: colors.textLight,
    opacity: 0.7,
  },
});
