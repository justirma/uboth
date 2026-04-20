import { StyleSheet, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing } from '../theme';

export default function WaitingScreen({ partnerName, onCancel }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const hintFade = useRef(new Animated.Value(0)).current;
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Gentle breathing pulse — 1.0 to 1.1, no shrink below resting
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Fade in main text
    Animated.timing(textFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // After 30s, swap subtext to a helpful hint
    const hintTimer = setTimeout(() => {
      setShowHint(true);
      Animated.timing(hintFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 30000);

    return () => {
      pulse.stop();
      clearTimeout(hintTimer);
    };
  }, []);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Text style={styles.plant}>🌿</Text>
      </Animated.View>

      <Animated.Text style={[styles.waitingText, { opacity: textFade }]}>
        Your nudge is on the way
      </Animated.Text>

      {showHint ? (
        <Animated.Text style={[styles.subtext, { opacity: hintFade }]}>
          Still waiting? You can go back and try again.
        </Animated.Text>
      ) : (
        <Animated.Text style={[styles.subtext, { opacity: textFade }]}>
          {partnerName} will join when they're ready
        </Animated.Text>
      )}

      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Go back</Text>
        </TouchableOpacity>
      )}
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
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 60,
  },
  cancelText: {
    fontSize: 15,
    color: colors.textLight,
    opacity: 0.4,
  },
});
