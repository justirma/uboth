import { Animated, Easing, StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows, spacing, borderRadius, SCREENSHOT_MODE } from '../theme';

export default function AppreciationScreen({ userName, partnerName, onComplete }) {
  const [appreciation, setAppreciation] = useState('');

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {!SCREENSHOT_MODE && <Text style={styles.emoji}>💛</Text>}
          <Text style={styles.title}>One thing I appreciate about you today:</Text>

          <TextInput
            style={styles.input}
            placeholder="You being here right now..."
            placeholderTextColor={colors.textLight}
            value={appreciation}
            onChangeText={setAppreciation}
            maxLength={100}
            multiline
            autoFocus
          />

          <Text style={styles.hint}>Optional · {100 - appreciation.length} characters left</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => onComplete(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareButton, !appreciation.trim() && styles.disabled]}
              onPress={() => onComplete(appreciation.trim())}
              disabled={!appreciation.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.input,
    padding: 20,
    fontSize: 17,
    color: colors.textDark,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 120,
    textAlignVertical: 'top',
    ...shadows.subtle,
  },
  hint: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  skipButton: {
    flex: 1,
    padding: 18,
    borderRadius: borderRadius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  skipText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },
  shareButton: {
    flex: 2,
    padding: 18,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadows.card,
  },
  shareText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
