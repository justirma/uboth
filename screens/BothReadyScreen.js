import { StyleSheet, Text, View, Animated, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

export default function BothReadyScreen({ partnerName, prompt, onStartMeditation, onCancel }) {
  const [pausing, setPausing] = useState(true);
  const [countdown, setCountdown] = useState(3);

  // Countdown fade (replaces spring — quieter, more meditative)
  const countdownFade = useRef(new Animated.Value(0)).current;

  // Heart pulse
  const heartScale = useRef(new Animated.Value(1)).current;

  // 3s pause before countdown begins
  useEffect(() => {
    const t = setTimeout(() => setPausing(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Countdown only runs after pause
  useEffect(() => {
    if (pausing) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      onStartMeditation();
    }
  }, [pausing, countdown]);

  // Fade in each countdown number — only after pause ends
  useEffect(() => {
    if (!pausing && countdown > 0) {
      countdownFade.setValue(0);
      Animated.timing(countdownFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [pausing, countdown]);

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

  return (
    <LinearGradient colors={gradients.meditation} style={styles.container}>
      <Animated.Text style={[styles.heart, { transform: [{ scale: heartScale }] }]}>
        🧡
      </Animated.Text>

      <Text style={styles.title}>you're both here</Text>

      <View style={styles.countdownContainer}>
        {!pausing && countdown > 0 && (
          <Animated.Text style={[styles.countdown, { opacity: countdownFade }]}>
            {countdown}
          </Animated.Text>
        )}
      </View>

      {pausing && onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Not now</Text>
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
    padding: 32,
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
    marginBottom: 24,
  },
  breathingCue: {
    fontSize: 14,
    color: colors.textDark,
    opacity: 0.5,
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  countdownContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdown: {
    fontSize: 96,
    fontWeight: '300',
    color: colors.textDark,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 60,
  },
  cancelText: {
    fontSize: 15,
    color: colors.textDark,
    opacity: 0.4,
  },
});
