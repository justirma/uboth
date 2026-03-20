/**
 * MoodRevealScreen.js
 *
 * Shown after both partners complete their post-meditation mood check.
 * Displays each partner's mood shift (before → after) side by side,
 * creating a moment of shared reflection before the appreciation note.
 */

import { Animated, Easing, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, moods, shadows, spacing, borderRadius } from '../theme';

const MOOD_MAP = {
  anxious:  { emoji: '🌊', label: 'Anxious',  color: moods.anxious  },
  stressed: { emoji: '🍂', label: 'Stressed', color: moods.stressed },
  foggy:    { emoji: '🌫️', label: 'Foggy',    color: moods.foggy    },
  calm:     { emoji: '🌿', label: 'Calm',     color: moods.calm     },
  grateful: { emoji: '✨', label: 'Grateful', color: moods.grateful },
  peaceful: { emoji: '🌸', label: 'Peaceful', color: moods.peaceful },
};

function getMood(value) {
  if (!value) return null;
  // Accept both a mood object (from local state) and a plain string (from Firebase)
  const key = typeof value === 'object' ? value.value : value;
  return MOOD_MAP[key] || null;
}

function MoodBadge({ moodValue }) {
  const mood = getMood(moodValue);
  if (!mood) return <Text style={styles.moodMissing}>—</Text>;
  return (
    <View style={[styles.moodBadge, { backgroundColor: mood.color + '50' }]}>
      <Text style={styles.moodEmoji}>{mood.emoji}</Text>
      <Text style={styles.moodLabel}>{mood.label}</Text>
    </View>
  );
}

function PartnerColumn({ name, preMood, postMood, entranceAnim }) {
  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View style={[styles.column, { opacity: entranceAnim, transform: [{ translateY }] }]}>
      <Text style={styles.columnName}>{name}</Text>
      <MoodBadge moodValue={preMood} />
      <Text style={styles.arrow}>↓</Text>
      <MoodBadge moodValue={postMood} />
    </Animated.View>
  );
}

export default function MoodRevealScreen({
  userName,
  partnerName,
  userPreMood,
  userPostMood,
  partnerPreMood,
  partnerPostMood,
  onContinue,
}) {
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(leftAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rightAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ctaAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.title}>how you both shifted</Text>
      <Text style={styles.subtitle}>before and after your practice</Text>

      <View style={styles.columns}>
        <PartnerColumn
          name={userName}
          preMood={userPreMood}
          postMood={userPostMood}
          entranceAnim={leftAnim}
        />

        <View style={styles.divider} />

        <PartnerColumn
          name={partnerName}
          preMood={partnerPreMood}
          postMood={partnerPostMood}
          entranceAnim={rightAnim}
        />
      </View>

      <Animated.View style={{ opacity: ctaAnim }}>
        <TouchableOpacity style={styles.button} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
    width: '100%',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  columnName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'none',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  moodBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDark,
  },
  moodMissing: {
    width: 88,
    height: 88,
    lineHeight: 88,
    textAlign: 'center',
    fontSize: 20,
    color: colors.textLight,
    opacity: 0.4,
  },
  arrow: {
    fontSize: 18,
    color: colors.textLight,
    opacity: 0.5,
  },
  divider: {
    width: 1,
    height: 200,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: 18,
    paddingHorizontal: 56,
    ...shadows.card,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textDark,
  },
});
