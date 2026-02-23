/**
 * OnboardingScreen.js
 *
 * A 4-slide pre-auth onboarding flow for uboth.
 * Runs once on first install, gated by AsyncStorage key 'ONBOARDING_COMPLETE'.
 *
 * Design intent: warm, slow, emotionally resonant — like a gentle invitation
 * rather than a feature tour. Each slide has a single emotional idea.
 *
 * Animation stack: React Native Animated (built-in, no extra deps).
 * Transitions: fade + gentle upward slide per screen (not a swipe carousel —
 * the slowness is intentional; it mirrors the meditative quality of the app).
 */

import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { colors, borderRadius, spacing } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Slide content
// Each slide: { id, emoji, headline, subtext, ctaLabel }
//
// Emotional arc:
//   0 — Wonder         (what is this?)
//   1 — Understanding  (ohh, how it works)
//   2 — Belonging      (this is for us)
//   3 — Invitation     (ready to begin)
// ─────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    // Two leaves growing toward each other — simple, organic, no library needed.
    // Rendered as large emoji for v1; replace with SVG illustration later.
    emoji: '🌿',
    secondaryEmoji: '🌿',
    mirrorSecondary: true, // flip horizontally in style
    headline: 'Some things are\nbetter together.',
    subtext:
      'uboth is a meditation space\nbuilt for two — a quiet ritual\nyou share with the person you love.',
    ctaLabel: 'Show me how',
  },
  {
    id: 1,
    emoji: '🔔',
    secondaryEmoji: null,
    mirrorSecondary: false,
    headline: 'Show up\nat the same time.',
    subtext:
      'One of you starts a session.\nYour partner gets a gentle nudge.\nWhen you\'re both ready — you begin.',
    ctaLabel: 'Got it',
  },
  {
    id: 2,
    emoji: '🫧',
    secondaryEmoji: '🫧',
    mirrorSecondary: false,
    headline: 'Five minutes.\nJust breathe.',
    subtext:
      'No guided voice. No instructions.\nJust a bell to start, a timer,\nand the presence of each other.',
    ctaLabel: 'I\'m in',
  },
  {
    id: 3,
    emoji: '✨',
    secondaryEmoji: null,
    mirrorSecondary: false,
    headline: 'Ready\nwhen you are.',
    subtext:
      'A few minutes, just the two of you.\nThat\'s enough.',
    ctaLabel: 'Let\'s go',
    isFinal: true,
  },
];

// ─────────────────────────────────────────────
// Animated illustration component
// The emoji(s) breathe — scale pulses slowly on a loop.
// On entrance, they fade up from slightly below.
// ─────────────────────────────────────────────
function SlideIllustration({ slide, entranceAnim }) {
  const breatheAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle breathing loop — 4-second inhale/exhale cycle
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.08,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // entranceAnim drives both opacity and translateY (arrives from below)
  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  if (slide.secondaryEmoji) {
    // Two-emoji layout: leaves facing each other, bubbles side by side
    return (
      <Animated.View
        style={[
          styles.illustrationRow,
          { opacity: entranceAnim, transform: [{ translateY }] },
        ]}
      >
        <Animated.Text
          style={[
            styles.emoji,
            { transform: [{ scale: breatheAnim }] },
          ]}
        >
          {slide.emoji}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.emoji,
            styles.emojiGap,
            // Mirror the second leaf so they face each other
            slide.mirrorSecondary && { transform: [{ scaleX: -1 }, { scale: breatheAnim }] },
            !slide.mirrorSecondary && { transform: [{ scale: breatheAnim }] },
          ]}
        >
          {slide.secondaryEmoji}
        </Animated.Text>
      </Animated.View>
    );
  }

  return (
    <Animated.Text
      style={[
        styles.emoji,
        {
          opacity: entranceAnim,
          transform: [{ scale: breatheAnim }, { translateY }],
        },
      ]}
    >
      {slide.emoji}
    </Animated.Text>
  );
}

// ─────────────────────────────────────────────
// Progress dots — one dot per slide
// Active dot expands to a pill shape.
// Tappable: tap any dot to jump to that slide.
// ─────────────────────────────────────────────
function ProgressDots({ total, current, onDotPress }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onDotPress(i)}
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
        >
          <Animated.View
            style={[
              styles.dot,
              i === current && styles.dotActive,
            ]}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────
// Main OnboardingScreen
// ─────────────────────────────────────────────
export default function OnboardingScreen({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Ref keeps PanResponder's closure in sync with live index
  const currentIndexRef = useRef(0);
  const slide = SLIDES[currentIndex];

  // Per-slide entrance animation value (reset on each slide change)
  const entranceAnim = useRef(new Animated.Value(0)).current;

  // CTA button subtle pulse — draws attention without being jarring
  const ctaAnim = useRef(new Animated.Value(1)).current;

  // Single source of truth for index changes — keeps ref + state in sync
  const goToSlide = (index) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
  };

  // Swipe left → next, swipe right → previous.
  // Uses onMoveShouldSetPanResponder (not onStartShould…) so taps on
  // TouchableOpacity children still fire normally.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderRelease: (_, { dx }) => {
        const idx = currentIndexRef.current;
        if (dx < -50 && idx < SLIDES.length - 1) {
          goToSlide(idx + 1);
        } else if (dx > 50 && idx > 0) {
          goToSlide(idx - 1);
        }
      },
    })
  ).current;

  useEffect(() => {
    // Reset and play entrance animation on each slide
    entranceAnim.setValue(0);
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  useEffect(() => {
    // CTA button breathes gently to invite a tap (starts after entrance settles)
    const delay = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ctaAnim, {
            toValue: 1.03,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ctaAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 800);
    return () => clearTimeout(delay);
  }, [currentIndex]);

  const handleNext = () => {
    if (slide.isFinal) {
      onComplete();
      return;
    }
    goToSlide(currentIndex + 1);
  };

  // "Skip" is shown only on non-final slides — respects the user's time
  const handleSkip = () => onComplete();

  // Text entrance: slightly staggered from illustration
  const textTranslateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* ── Background decorative rings (pure View, no images) ── */}
      <View style={styles.ringOuter} />
      <View style={styles.ringInner} />

      {/* ── Skip link (top right, ghost) ── */}
      {!slide.isFinal && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* ── Main content ── */}
      <View style={styles.content}>
        {/* Illustration */}
        <SlideIllustration slide={slide} entranceAnim={entranceAnim} />

        {/* Text block */}
        <Animated.View
          style={{
            opacity: entranceAnim,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Text style={styles.headline}>{slide.headline}</Text>
          <Text style={styles.subtext}>{slide.subtext}</Text>
        </Animated.View>
      </View>

      {/* ── Bottom chrome: dots + CTA ── */}
      <View style={styles.bottom}>
        <ProgressDots total={SLIDES.length} current={currentIndex} onDotPress={goToSlide} />

        {/* The CTA changes label per slide but is always the same shape */}
        <Animated.View style={{ transform: [{ scale: ctaAnim }] }}>
          <TouchableOpacity
            style={[styles.cta, slide.isFinal && styles.ctaFinal]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, slide.isFinal && styles.ctaTextFinal]}>
              {slide.ctaLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Final slide: tiny reassurance text below button */}
        {slide.isFinal && (
          <Animated.View style={{ opacity: entranceAnim }}>
            <Text style={styles.finePrint}>
              No account required to explore — sign in anytime.
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const RING_SIZE = SCREEN_WIDTH * 1.1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    // Safe padding — keeps content away from notch and home indicator
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: spacing.xl,
  },

  // ── Background decoration ──
  // Two concentric circles positioned at the top, off-screen center.
  // They're barely visible (low opacity green) — just enough to give
  // the screen a sense of gentle depth without competing with content.
  ringOuter: {
    position: 'absolute',
    top: -RING_SIZE * 0.35,
    left: (SCREEN_WIDTH - RING_SIZE) / 2,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(168, 198, 134, 0.15)',
  },
  ringInner: {
    position: 'absolute',
    top: -RING_SIZE * 0.2,
    left: (SCREEN_WIDTH - RING_SIZE * 0.65) / 2,
    width: RING_SIZE * 0.65,
    height: RING_SIZE * 0.65,
    borderRadius: (RING_SIZE * 0.65) / 2,
    borderWidth: 1,
    borderColor: 'rgba(168, 198, 134, 0.12)',
  },

  // ── Skip ──
  skipButton: {
    alignSelf: 'flex-end',
  },
  skipText: {
    fontSize: 15,
    color: colors.textLight,
    // Slightly muted — present but not pulling focus from the content
    opacity: 0.7,
  },

  // ── Content area ──
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl, // 40px between illustration and text
  },

  // ── Illustration ──
  illustrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
    // Emoji render at native size — no explicit width needed
  },
  emojiGap: {
    marginLeft: spacing.lg, // 24px gap between paired emojis
  },

  // ── Text ──
  headline: {
    fontSize: 34,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
    lineHeight: 42,
    // Slightly tighter tracking gives the large text a calmer feel
    letterSpacing: -0.5,
    marginBottom: spacing.lg, // 24px
  },
  subtext: {
    fontSize: 17,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 26,
    // Max width keeps line length comfortable (under 60 chars)
    // which reduces reading fatigue on narrow phones
    maxWidth: 300,
    alignSelf: 'center',
  },

  // ── Bottom chrome ──
  bottom: {
    alignItems: 'center',
    gap: spacing.lg, // 24px between dots and button
  },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.xs, // 8px between dots
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.25,
  },
  dotActive: {
    // Pill expansion — active dot is wider to signal position clearly
    // (follows common iOS/Android pagination convention — Jakob's Law)
    width: 20,
    borderRadius: 3,
    opacity: 1,
  },

  // CTA button — pill shape, primary green
  cta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: 18,
    paddingHorizontal: 48,
    // Minimum width ensures the button doesn't feel too narrow
    // for short labels like "I'm in"
    minWidth: 200,
    alignItems: 'center',
    // Subtle shadow gives it lift — feels tappable (Fitts's Law: affordance)
    shadowColor: colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  // Final slide CTA is slightly more prominent — this is the moment of commitment
  ctaFinal: {
    backgroundColor: colors.textDark,
    paddingVertical: 20,
    paddingHorizontal: 56,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textDark,
  },
  ctaTextFinal: {
    color: colors.background,
    fontSize: 18,
  },

  // Fine print below final CTA — reduces friction by reassuring the user
  finePrint: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    opacity: 0.6,
    maxWidth: 260,
  },
});
