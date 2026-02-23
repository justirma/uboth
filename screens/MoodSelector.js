import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

const MOODS = [
  { emoji: '🌊', label: 'Anxious', value: 'anxious', color: '#9FD4C1' },
  { emoji: '🍂', label: 'Stressed', value: 'stressed', color: '#C4B86A' },
  { emoji: '🌫️', label: 'Foggy', value: 'foggy', color: '#B5C4A8' },
  { emoji: '🌿', label: 'Calm', value: 'calm', color: '#A8C686' },
  { emoji: '☀️', label: 'Grateful', value: 'grateful', color: '#F4D58D' },
  { emoji: '🌾', label: 'Peaceful', value: 'peaceful', color: '#D4E5B8' },
];

export default function MoodSelector({ onSelectMood, isPost = false }) {
  const [selectedMood, setSelectedMood] = useState(null);

  // Per-bubble animated scale values
  const scaleAnims = useRef(MOODS.map(() => new Animated.Value(1))).current;

  // Per-bubble entrance opacity
  const fadeAnims = useRef(MOODS.map(() => new Animated.Value(0))).current;

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
      <Text style={styles.title}>
        {isPost ? 'How do you feel now?' : 'How are you feeling?'}
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
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {selectedMood && (
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      )}
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
    marginBottom: 48,
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
