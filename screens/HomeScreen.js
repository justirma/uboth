import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme';

export default function HomeScreen({ userName, partnerName, totalPractices, lastPractice, onSignOut, onStartPractice, onViewHistory }) {  // Get today's date
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const getLastPracticeText = () => {
  if (!lastPractice) return null;

  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

  if (lastPractice === today) return 'Today';
  if (lastPractice === yesterday) return 'Yesterday';

  // Calculate days ago
  const lastDate = new Date(lastPractice);
  const now = new Date();
  const diffDays = Math.floor((now - lastDate) / 86400000);

  return `${diffDays} days ago`;
};

  // Daily prompts (one per day of week)
    const prompts = {
      'Sunday': "Root down together. Feel the ground beneath you both.",
      'Monday': "Presence is a choice. Choose it now.",
      'Tuesday': "Let go of what you're holding. Breathe it out.",
      'Wednesday': "Notice where you touch. Stay here.",
      'Thursday': "Gratitude lives in the small things. Find one.",
      'Friday': "Open to each other. Soften what's hard.",
      'Saturday': "Breathe in sync. Let your rhythms meet.",
    };

  const todayPrompt = prompts[dayName];

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.date}>{dayName}, {monthDay}</Text>
      <TouchableOpacity onPress={onViewHistory} activeOpacity={0.7}>
        <Text style={styles.streak}>
          🌱 {totalPractices} {totalPractices === 1 ? 'practice' : 'practices'} together
          {lastPractice && ` · Last: ${getLastPracticeText()}`}
        </Text>
        <Text style={styles.journalLink}>View Journal →</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Practice</Text>
        <Text style={styles.prompt}>{todayPrompt}</Text>
        <Text style={styles.duration}>5 minutes</Text>

        <TouchableOpacity style={styles.button} onPress={onStartPractice}>
          <Text style={styles.buttonText}>Ready to Practice</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.partnerText}>Practicing with {partnerName}</Text>

      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  date: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streak: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
  },
  journalLink: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 16,
    lineHeight: 28,
  },
  duration: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },
  partnerText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: 24,
    fontSize: 14,
  },
  signOutButton: {
    marginTop: 40,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.textLight,
    fontSize: 16,
  },
});
