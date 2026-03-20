import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, moods } from '../theme';

// Colors now sourced from theme.js moods token — never hardcoded here.
// Emojis updated to match the warm terracotta palette's emotional register.
const MOODS = [
  { emoji: '🌊', label: 'Anxious',  value: 'anxious',  color: moods.anxious  },
  { emoji: '🍂', label: 'Stressed', value: 'stressed', color: moods.stressed },
  { emoji: '🌫️', label: 'Foggy',    value: 'foggy',    color: moods.foggy    },
  { emoji: '🌿', label: 'Calm',     value: 'calm',     color: moods.calm     },
  { emoji: '✨', label: 'Grateful', value: 'grateful', color: moods.grateful },
  { emoji: '🌸', label: 'Peaceful', value: 'peaceful', color: moods.peaceful },
];

export default function MoodSelector({ onSelectMood, isPost = false, partnerName, onBack }) {
  const [selectedMood, setSelectedMood] = useState(null);

  // Per-bubble animated scale values
  const scaleAnims = useRef(MOODS.map(() => new Animated.Value(1))).current;

  // Per-bubble entrance opacity
  const fadeAnims = useRef(MOODS.map(() => new Animated.Value(0))).current;

  // Continue button fade-in
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Staggered entrance animation
  useEffect(() => {
    const animations = fadeAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      })
    );
    Animated.stagger(50, animations).start();
  }, []);

  const handleSelect = (mood) => {
    setSelectedMood(mood);
    Animated.timing(buttonAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animate scales: spring selected to 1.1, reset others to 1
    MOODS.forEach((m, index) => {
      Animated.spring(scaleAnims[index], {
        toValue: m.value === mood.value ? 1.1 : 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleContinue = () => {
    if (selectedMood) {
      onSelectMood(selectedMood);
    }
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>
        {isPost ? 'how do you feel now?' : 'how are you feeling?'}
      </Text>
      <Text style={styles.subtitle}>
        {!isPost && (partnerName
          ? `we'll share this with ${partnerName.toLowerCase()} after you both finish.`
          : `we'll share your mood after you both finish.`)}
      </Text>

      <View style={styles.moodGrid}>
        {MOODS.map((mood, index) => (
          <Animated.View
            key={mood.value}
            style={{
              opacity: fadeAnims[index],
              transform: [{ scale: scaleAnims[index] }],
            }}
          >
            <TouchableOpacity
              style={[
                styles.moodBubble,
                { backgroundColor: mood.color + '60' },
                selectedMood?.value === mood.value && styles.selectedBubble,
              ]}
              onPress={() => handleSelect(mood)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodLabel}>{mood.label.toLowerCase()}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <Text style={styles.breathingCue}>during your session, try: breathe in 4 · hold 5 · out 8</Text>

      <Animated.View style={{ opacity: buttonAnim }}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.8,
    minHeight: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
  backText: {
    fontSize: 18,
    color: colors.textLight,
    opacity: 0.4,
  },
  breathingCue: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  moodBubble: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bubbleBorder,
  },
  selectedBubble: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDark,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },
});
