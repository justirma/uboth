import { Animated, Easing, StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows, spacing, borderRadius } from '../theme';

export default function NameInput({ onComplete, initialName }) {
  const [name, setName] = useState(initialName || '');
  const [partnerName, setPartnerName] = useState('');
  const partnerInputRef = useRef(null);

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

  const handleContinue = () => {
    const finalName = name.trim();
    if (finalName && partnerName.trim()) {
      onComplete(finalName, partnerName.trim());
    }
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.emoji}>🌱</Text>
          <Text style={styles.title}>Before we begin</Text>
          <Text style={styles.subtitle}>We'll connect you two on the next screen.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>What's your first name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => partnerInputRef.current?.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>Who are you doing this with?</Text>
            <TextInput
              ref={partnerInputRef}
              style={styles.input}
              placeholder="Partner's name"
              placeholderTextColor={colors.textLight}
              value={partnerName}
              onChangeText={setPartnerName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />

            <TouchableOpacity
              style={[styles.button, (!name.trim() || !partnerName) && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={!name.trim() || !partnerName}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Continue</Text>
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
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
  },
  inner: {
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: spacing.xxl,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    color: colors.textDark,
    marginBottom: spacing.xs,
    fontWeight: '500',
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
    marginTop: spacing.md,
    ...shadows.card,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },
});
