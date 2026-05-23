import { StyleSheet, Text, View, TouchableOpacity, Animated, SafeAreaView, Easing, Alert } from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows, borderRadius, spacing } from '../theme';
import { getTodayPrompt } from '../prompts';

export default function HomeScreen({ userName, partnerName, totalPractices, lastPractice, streak, onSignOut, onDeleteAccount, onStartPractice, onViewHistory }) {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const todayPrompt = getTodayPrompt();

  // Entrance animation — fades and rises up from 20px below
  const entranceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  const translateY = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  const getLastPracticeText = () => {
    if (!lastPractice) return null;
    const localDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const todayStr = localDateStr(new Date());
    const yesterday = localDateStr(new Date(Date.now() - 86400000));
    const dateOnly = lastPractice.split('_')[0];
    if (dateOnly === todayStr) return 'Today';
    if (dateOnly === yesterday) return 'Yesterday';
    const parsed = new Date(dateOnly + 'T00:00:00');
    if (isNaN(parsed)) return null;
    const diffDays = Math.floor((new Date() - parsed) / 86400000);
    return `${diffDays} days ago`;
  };

  const practicesLabel = totalPractices === 1
    ? '1 practice together'
    : `${totalPractices} practices together`;

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.inner, { opacity: entranceAnim, transform: [{ translateY }] }]}>

          {/* ── Center group: header + card ── */}
          <View style={styles.centerGroup}>
            <View style={styles.header}>
              <Text style={styles.date}>{dayName.toLowerCase()}, {monthDay.toLowerCase()}</Text>
              <Text style={styles.names}>you & {partnerName.toLowerCase()}</Text>
              <Text style={styles.mornings}>
                🌱 {practicesLabel}
                {lastPractice && ` · ${getLastPracticeText()}`}
              </Text>
              {streak >= 2 && (
                <Text style={styles.streakBadge}>🔥 {streak} day streak</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>today's practice</Text>
              <Text style={styles.prompt}>{todayPrompt.toLowerCase()}</Text>
              <Text style={styles.duration}>5 min</Text>

              <TouchableOpacity style={styles.button} onPress={onStartPractice} activeOpacity={0.85}>
                <Text style={styles.buttonText}>begin together</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onViewHistory} activeOpacity={0.6}>
              <Text style={styles.journalLink}>view journal →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSignOut} activeOpacity={0.6}>
              <Text style={styles.signOutText}>sign out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'This will permanently delete your account and all your data. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete Account',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert(
                          'Are you sure?',
                          'Your practice history and partner connection will be permanently removed.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Yes, Delete', style: 'destructive', onPress: onDeleteAccount },
                          ]
                        );
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.deleteAccountText}>delete account</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  centerGroup: {
    flex: 1,
    justifyContent: 'center',
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  date: {
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  names: {
    fontSize: 30,
    fontWeight: '600',
    color: colors.textDark,
    letterSpacing: -0.5,
  },
  mornings: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
  },
  streakBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
  },

  // ── Card ──
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    marginTop: spacing.xl,
  },
  cardEyebrow: {
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'none',
    letterSpacing: 0.3,
    marginBottom: spacing.md,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textDark,
    lineHeight: 30,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  duration: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: 18,
    alignItems: 'center',
    ...shadows.subtle,
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  journalLink: {
    fontSize: 14,
    color: colors.textLight,
    textDecorationLine: 'underline',
  },
  signOutText: {
    fontSize: 12,
    color: colors.textLight,
    opacity: 0.4,
  },
  deleteAccountText: {
    fontSize: 11,
    color: colors.textLight,
    opacity: 0.3,
  },
});
