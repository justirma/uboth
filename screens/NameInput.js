import { Animated, Easing, StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows, spacing, borderRadius } from '../theme';

export default function NameInput({ onComplete }) {
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');

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
    if (name.trim() && partnerName.trim()) {
      onComplete(name.trim(), partnerName.trim());
    }
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.title}>Welcome to uboth</Text>
        <Text style={styles.subtitle}>Let's get you set up</Text>

        <View style={styles.form}>
          <Text style={styles.label}>What's your first name?</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textLight}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Who's your meditation partner?</Text>
          <TextInput
            style={styles.input}
            placeholder="Partner's name"
            placeholderTextColor={colors.textLight}
            value={partnerName}
            onChangeText={setPartnerName}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.button, (!name || !partnerName) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!name || !partnerName}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
