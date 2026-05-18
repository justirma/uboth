import { Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows, spacing, borderRadius } from '../theme';

export default function EmailCaptureScreen({ onComplete }) {
  const [email, setEmail] = useState('');

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

  const isValid = email.trim().includes('@');

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>stay in the loop</Text>
          <Text style={styles.subtitle}>
            we'll let you know when new features arrive. that's it.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => isValid && onComplete(email.trim())}
          />

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={() => onComplete(email.trim())}
            disabled={!isValid}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>sure</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skip} onPress={() => onComplete(null)} activeOpacity={0.6}>
            <Text style={styles.skipText}>skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  inner: {
    padding: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 17,
    color: colors.textLight,
    marginBottom: spacing.xxl,
    lineHeight: 26,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    fontSize: 17,
    color: colors.textDark,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    padding: 18,
    alignItems: 'center',
    marginTop: spacing.xs,
    ...shadows.card,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },
  skip: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  skipText: {
    fontSize: 15,
    color: colors.textLight,
  },
});
