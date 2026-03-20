/**
 * TransitionScreen.js
 *
 * A brief (3.5s) interstitial shown between the end of meditation
 * and the post-session mood selector. Gives couples a moment to
 * land before being asked anything.
 *
 * Auto-advances — no user action required.
 */

import { StyleSheet, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

export default function TransitionScreen({ onComplete }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      // Hold
      Animated.delay(2000),
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  return (
    <LinearGradient colors={gradients.meditation} style={styles.container}>
      <Animated.Text style={[styles.line1, { opacity }]}>
        Take a breath.
      </Animated.Text>
      <Animated.Text style={[styles.line2, { opacity }]}>
        You showed up today.
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  line1: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  line2: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});
