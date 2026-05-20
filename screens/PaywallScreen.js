/**
 * PaywallScreen.js
 *
 * uboth+ upsell screen.
 * Shown when a free user taps a locked feature (full journal, partner appreciations).
 *
 * The "Unlock" button is wired to a coming-soon alert until RevenueCat is integrated.
 * To activate purchases: replace the Alert in handleUnlock with RevenueCat's
 * Purchases.purchasePackage() call. On success, write `couples/{coupleId}/premium: true`
 * to Firebase — subscription.js handles the rest for both partners automatically.
 */

import { Alert, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, colors, gradients, shadows, spacing, SCREENSHOT_MODE } from '../theme';

const FEATURES = [
  { emoji: '💌', text: 'Read your partner\'s appreciation after every session' },
  { emoji: '📖', text: 'Full session history — every practice, forever' },
  { emoji: '🔥', text: 'Streak grace day — one miss per week, streak intact' },
];

export default function PaywallScreen({ onBack }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleUnlock = () => {
    // TODO: replace with RevenueCat purchase when ready
    // Purchases.purchasePackage(annualPackage)
    //   .then(() => set(ref(database, `couples/${coupleId}/premium`), true))
    Alert.alert(
      'Coming soon',
      'uboth+ is almost ready. We\'ll let you know when it\'s available.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.eyebrow}>uboth+</Text>
        <Text style={styles.headline}>One price.{'\n'}For both of you.</Text>
        <Text style={styles.subheadline}>
          $49.99 / year for your couple — less than one dinner together.
        </Text>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              {!SCREENSHOT_MODE && <Text style={styles.featureEmoji}>{f.emoji}</Text>}
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock} activeOpacity={0.85}>
          <Text style={styles.unlockText}>Unlock uboth+</Text>
        </TouchableOpacity>

        <Text style={styles.finePrint}>
          One subscription covers both partners · Cancel anytime
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    paddingTop: 64,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  backText: {
    fontSize: 16,
    color: colors.textLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'none',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textDark,
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  subheadline: {
    fontSize: 16,
    color: colors.textLight,
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  featureList: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureEmoji: {
    fontSize: 22,
    width: 28,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
    lineHeight: 24,
  },
  unlockButton: {
    backgroundColor: colors.textDark,
    borderRadius: borderRadius.pill,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  unlockText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  finePrint: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    opacity: 0.7,
  },
});
