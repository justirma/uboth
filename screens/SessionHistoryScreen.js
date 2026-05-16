import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { database } from '../firebaseConfig';
import { ref, get } from 'firebase/database';
import { colors, gradients, shadows, spacing, borderRadius } from '../theme';

const MOOD_LABELS = {
  anxious: { emoji: '\u{1F30A}', label: 'Anxious' },
  stressed: { emoji: '\u{1F342}', label: 'Stressed' },
  foggy: { emoji: '\u{1F32B}\uFE0F', label: 'Foggy' },
  calm: { emoji: '\u{1F33F}', label: 'Calm' },
  grateful: { emoji: '\u2728', label: 'Grateful' },
  peaceful: { emoji: '\u{1F33E}', label: 'Peaceful' },
};

function formatMood(moodValue) {
  const mood = MOOD_LABELS[moodValue];
  if (!mood) return moodValue || '—';
  return `${mood.emoji} ${mood.label}`;
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const FREE_SESSION_LIMIT = 7;

export default function SessionHistoryScreen({ userId, partnerId, userName, isPremium, onBack, onUpgrade }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const coupleId = [userId, partnerId].sort().join('_');
      const sessionsRef = ref(database, `sessions/${coupleId}`);
      const snapshot = await get(sessionsRef);

      if (!snapshot.exists()) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const allSessions = snapshot.val();
      const coupleSessionList = [];

      Object.keys(allSessions).forEach((key) => {
        const daySession = allSessions[key];
        if (daySession && daySession.bothCompleted) {
          // Extract base date — keys are "2026-04-15" or "2026-04-15_2"
          const dateMatch = key.match(/^(\d{4}-\d{2}-\d{2})/);
          const date = dateMatch ? dateMatch[1] : key;
          coupleSessionList.push({
            date,
            sessionKey: key,
            ...daySession,
          });
        }
      });

      coupleSessionList.sort((a, b) => b.date.localeCompare(a.date));

      setSessions(coupleSessionList);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSession = (session) => {
    const { partner1, partner2, date } = session;
    const p1 = partner1 || {};
    const p2 = partner2 || {};

    // Determine which partner is the current user
    const myPartner = p1.userId === userId ? p2 : p1;
    const me = p1.userId === userId ? p1 : p2;

    const hasAppreciations = me.appreciation || myPartner.appreciation;

    return (
      <View key={session.sessionKey || date} style={styles.sessionCard}>
        <Text style={styles.sessionDate}>{formatDate(date)}</Text>

        <View style={styles.moodSection}>
          <Text style={styles.sectionLabel}>Moods</Text>
          <View style={styles.moodRow}>
            <View style={styles.moodColumn}>
              <Text style={styles.partnerName}>{p1.name || 'Partner 1'}</Text>
              <Text style={styles.moodText}>{formatMood(p1.preMood)} → {formatMood(p1.postMood)}</Text>
            </View>
            <View style={styles.moodColumn}>
              <Text style={styles.partnerName}>{p2.name || 'Partner 2'}</Text>
              <Text style={styles.moodText}>{formatMood(p2.preMood)} → {formatMood(p2.postMood)}</Text>
            </View>
          </View>
        </View>

        {hasAppreciations && (
          <View style={styles.appreciationSection}>
            <Text style={styles.sectionLabel}>Appreciations</Text>

            {/* Your appreciation — always visible */}
            {me.appreciation ? (
              <View style={styles.appreciationBubble}>
                <Text style={styles.appreciationAuthor}>You</Text>
                <Text style={styles.appreciationText}>"{me.appreciation}"</Text>
              </View>
            ) : null}

            {/* Partner's appreciation — locked for free users */}
            {myPartner.appreciation ? (
              isPremium ? (
                <View style={styles.appreciationBubble}>
                  <Text style={styles.appreciationAuthor}>{myPartner.name || 'Partner'}</Text>
                  <Text style={styles.appreciationText}>"{myPartner.appreciation}"</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.lockedBubble} onPress={onUpgrade} activeOpacity={0.8}>
                  <Text style={styles.lockedEmoji}>💌</Text>
                  <View style={styles.lockedTextGroup}>
                    <Text style={styles.lockedTitle}>{myPartner.name || 'Partner'} left you a note</Text>
                    <Text style={styles.lockedSub}>uboth+ · Tap to unlock</Text>
                  </View>
                </TouchableOpacity>
              )
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Our Journal</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\u{1F331}'}</Text>
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Text style={styles.emptySubtext}>Complete your first practice together to see it here.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countText}>
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} together
          </Text>
          {(isPremium ? sessions : sessions.slice(0, FREE_SESSION_LIMIT)).map((session) => renderSession(session))}

          {!isPremium && sessions.length > FREE_SESSION_LIMIT && (
            <TouchableOpacity style={styles.upgradeCard} onPress={onUpgrade} activeOpacity={0.85}>
              <Text style={styles.upgradeEmoji}>📖</Text>
              <Text style={styles.upgradeTitle}>
                {sessions.length - FREE_SESSION_LIMIT} more {sessions.length - FREE_SESSION_LIMIT === 1 ? 'session' : 'sessions'} in your history
              </Text>
              <Text style={styles.upgradeSub}>Unlock full journal with uboth+</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: colors.textLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xs,
  },
  countText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'none',
    letterSpacing: 1,
  },
  sessionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  moodSection: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textLight,
    textTransform: 'none',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodColumn: {
    flex: 1,
  },
  partnerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  moodText: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  appreciationSection: {
    marginTop: 4,
  },
  appreciationBubble: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: spacing.xs,
  },
  appreciationAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 4,
  },
  appreciationText: {
    fontSize: 15,
    color: colors.textDark,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  lockedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  lockedEmoji: {
    fontSize: 22,
  },
  lockedTextGroup: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 2,
  },
  lockedSub: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  upgradeCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.subtle,
  },
  upgradeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
  },
  upgradeSub: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
