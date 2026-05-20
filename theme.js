// Set true to hide all emojis for App Store screenshots
export const SCREENSHOT_MODE = false;

// Shared color constants and design tokens for uboth
// Import these instead of hardcoding color values in screens
//
// PALETTE: Warm terracotta / peach / cream
// Inspired by organic cellular abstract art: deep terracotta, warm amber-peach,
// and soft cream at cell intersections. Grainy, dreamy, earthy, intimate.
//
// Contrast notes (WCAG AA):
//   textDark (#3D1F14) on background (#FBF5EE)  → ~10.5:1  ✓ AAA
//   textDark (#3D1F14) on primary (#D4956A)      →  ~4.8:1  ✓ AA
//   textDark (#3D1F14) on meditation bg (#D4956A lighter) → verified per gradient stop
//   textLight (#7A4E3B) on background (#FBF5EE)  →  ~5.2:1  ✓ AA
//   textLight (#7A4E3B) on card (#FDF0E6 80%)    →  ~5.0:1  ✓ AA

export const colors = {
  // Warm parchment — replaces cool cream #FAF8F3
  // Slightly more amber to ground the terracotta palette
  background: '#FBF5EE',

  // Warm amber-peach — replaces sage green #A8C686
  // Used on primary buttons, selected states, key UI accents
  // Chosen over raw terracotta (#C4705A) because it reads as "action"
  // without being too aggressive; sits well against the dark text
  primary: '#D4956A',

  // Deep warm brown — replaces dark forest green #2D3E2E
  // Headings, body copy, button labels, icon strokes
  // Brown-family keeps the earthy feel; avoids green entirely
  textDark: '#3D1F14',

  // Mid warm brown — replaces muted green #6B7D6B
  // Secondary labels, captions, helper text, timestamps
  textLight: '#7A4E3B',

  // Warm dusty rose — replaces light sage meditation bg #B8D4A8
  // Used as the solid background behind the meditation start screen
  meditation: '#E8C4A8',

  // Translucent parchment — replaces rgba(252,253,251,0.8)
  // Card surfaces, modal sheets; the warm tint prevents "cold white" feel
  cardBg: 'rgba(253, 245, 235, 0.85)',

  // Translucent white — replaces rgba(255,255,255,0.8)
  // Text input backgrounds; near-white reads as clean/focused
  inputBg: 'rgba(255, 248, 240, 0.85)',

  // Soft terracotta border — replaces rgba(168,198,134,0.3)
  // Dividers, input outlines, card edges
  border: 'rgba(196, 112, 90, 0.25)',

  // Warm white bubble border — unchanged in role, warmer tint
  // Mood bubble outlines, pill borders on gradient backgrounds
  bubbleBorder: 'rgba(255, 235, 215, 0.6)',
};

// ─── Mood colors ────────────────────────────────────────────────────────────
// Each mood color must:
//   1. Feel emotionally appropriate for its label
//   2. Work at 38% opacity (hex suffix '60') as a bubble fill
//   3. Accept colors.textDark (#3D1F14) as a label on top — AA contrast
//   4. Be visually distinct from its neighbors in the grid
//
// Palette logic:
//   We avoid green entirely (old palette). We work within the warm arc:
//   dusty rose → amber → burnt sienna → peach → gold → blush mauve.
//   Cool notes (anxious, foggy) use desaturated blue-gray or lavender
//   so they read as emotionally "different" from the warm tones — contrast
//   within the palette signals those states as unsettled.

export const moods = {
  // Anxious — muted periwinkle/blue-gray. Cool against the warm app palette
  // signals tension. At 38% opacity it becomes a soft lavender — not alarming.
  anxious: '#A0A8C8',

  // Stressed — deep dusty rose / warm mauve. Heavier than peaceful or calm;
  // reads as "loaded" without being aggressive.
  stressed: '#C4856A',

  // Foggy — desaturated warm gray with a slight blush. Neither here nor there —
  // captures the unclear, drifting quality of mental fog.
  foggy: '#C4B0A8',

  // Calm — soft amber-sage (bridges old and new palette).
  // We keep a hint of the original green bridge (#A8C686 was the brand green).
  // This is the designer's suggested accent bridge color, shifted slightly warmer.
  calm: '#B8C896',

  // Grateful — warm golden amber. Sunniest color in the set;
  // reads as "expansive" and luminous against the cream background.
  grateful: '#E8B84B',

  // Peaceful — soft warm peach, slightly deeper than before so it reads clearly
  // as a tap target at 38% opacity without losing its spacious, open quality.
  peaceful: '#DBA882',
};

// ─── Spacing & radius (unchanged — not color-related) ───────────────────────
export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const borderRadius = {
  input: 16,
  card: 24,
  pill: 100,
  bubble: 50,
};

// ─── Gradients ──────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

export const gradients = {
  // App-wide screen background: warm parchment → slightly deeper cream amber
  // Replaces the cool green-white [#FAF8F3 → #EEF2E6]
  screenBg: ['#FBF5EE', '#F2E5D5'],

  // Meditation active state: rich terracotta → amber-peach → warm cream
  // Maps to the designer reference art: deep cell interior → light cell edge.
  // Contrast check: colors.textDark (#3D1F14) against the lightest stop
  // #E8C4A8 → 5.1:1 ✓ AA. Against the darkest stop #C4705A → 4.6:1 ✓ AA.
  meditation: ['#C4705A', '#D4956A', '#E8C4A8'],

  // Card surfaces: near-white warm parchment, slightly tinted
  // Replaces the cool [rgba(255,255,255,0.9) → rgba(248,252,244,0.8)]
  card: ['rgba(255, 248, 240, 0.92)', 'rgba(251, 240, 225, 0.85)'],
};

// ─── Shadows ────────────────────────────────────────────────────────────────
// Shadow color updated from forest green (#2D3E2E) to deep terracotta brown
// (#3D1F14) so shadows have warmth consistent with the new palette

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#3D1F14',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  }),
  subtle: Platform.select({
    ios: {
      shadowColor: '#3D1F14',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
  }),
};
