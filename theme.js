// Shared color constants and design tokens for uboth
// Import these instead of hardcoding color values in screens

export const colors = {
  background: '#FAF8F3',
  primary: '#A8C686',
  textDark: '#2D3E2E',
  textLight: '#6B7D6B',
  meditation: '#B8D4A8',
  cardBg: 'rgba(252, 253, 251, 0.8)',
  inputBg: 'rgba(255, 255, 255, 0.8)',
  border: 'rgba(168, 198, 134, 0.3)',
  bubbleBorder: 'rgba(255, 255, 255, 0.5)',
};

export const moods = {
  anxious: '#9FD4C1',
  stressed: '#C4B86A',
  foggy: '#B5C4A8',
  calm: '#A8C686',
  grateful: '#F4D58D',
  peaceful: '#D4E5B8',
};

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

import { Platform } from 'react-native';

export const gradients = {
  screenBg: ['#FAF8F3', '#EEF2E6'],
  meditation: ['#C8E6B0', '#B8D4A8', '#A8C686'],
  card: ['rgba(255,255,255,0.9)', 'rgba(248,252,244,0.8)'],
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#2D3E2E',
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
      shadowColor: '#2D3E2E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
  }),
};
