import { Animated, Easing, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Share } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ref, set, update, onValue, get } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import { database, auth } from '../firebaseConfig';
import { colors, gradients, shadows, spacing, borderRadius, SCREENSHOT_MODE } from '../theme';

const INVITE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous O/0/I/1
  return 'UBOTH-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function PairingScreen({ userId, userName, partnerName, onPaired }) {
  const [inviteCode, setInviteCode] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState(null);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // View-switch fade
  const switchAnim = useRef(new Animated.Value(1)).current;

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

  const switchView = (toJoin) => {
    Animated.sequence([
      Animated.timing(switchAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(switchAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    // Toggle mid-fade so the new content fades in
    setTimeout(() => setShowJoinInput(toJoin), 150);
  };

  useEffect(() => {
    async function writeCode(code) {
      const expiresAt = Date.now() + INVITE_EXPIRY_MS;
      if (userId && userId !== 'dev-user') {
        await set(ref(database, `inviteCodes/${code}`), { uid: userId, expiresAt });
        await update(ref(database, `users/${userId}`), { name: userName, partnerName, inviteCode: code });
      }
      setInviteCode(code);
      setCodeExpiresAt(expiresAt);
    }

    writeCode(generateCode());

    const coupleRef = ref(database, `couples/${userId}`);
    const unsubscribe = onValue(coupleRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.partnerId) {
        onPaired(data.partnerId);
      }
    });

    return () => unsubscribe();
  }, [userId, userName, partnerName]);

  // Auto-refresh code 1 minute before it expires
  useEffect(() => {
    if (!codeExpiresAt) return;
    const refreshIn = codeExpiresAt - Date.now() - 60000;
    const timer = setTimeout(async () => {
      const newCode = generateCode();
      const expiresAt = Date.now() + INVITE_EXPIRY_MS;
      await set(ref(database, `inviteCodes/${newCode}`), { uid: userId, expiresAt });
      await update(ref(database, `users/${userId}`), { inviteCode: newCode });
      setInviteCode(newCode);
      setCodeExpiresAt(expiresAt);
    }, refreshIn > 0 ? refreshIn : 0);
    return () => clearTimeout(timer);
  }, [codeExpiresAt]);

  const handleJoinWithCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    try {
      // Look up partnerId directly from the inviteCodes index
      const codeSnapshot = await get(ref(database, `inviteCodes/${code}`));
      const codeData = codeSnapshot.val();
      const partnerId = codeData?.uid;

      if (!partnerId) {
        Alert.alert('Invalid Code', 'No user found with that invite code.');
        return;
      }

      if (codeData.expiresAt && codeData.expiresAt < Date.now()) {
        Alert.alert('Code Expired', 'That code has expired — ask your partner to share a fresh one.');
        return;
      }

      if (partnerId === userId) {
        Alert.alert('Invalid Code', "That's your own code — ask your partner to share theirs.");
        return;
      }

      const pairedAt = Date.now();

      // Record pairing in both directions
      await set(ref(database, `couples/${userId}`), { partnerId, pairedAt });
      await set(ref(database, `couples/${partnerId}`), { partnerId: userId, pairedAt });

      // Persist partnerId on own record so it survives app restart.
      // The partner's record is updated by their own onPaired callback.
      await update(ref(database, `users/${userId}`), { partnerId });

      onPaired(partnerId);
    } catch (error) {
      console.error('Error joining:', error);
      Alert.alert('Error', 'Failed to join. Please try again.');
    }
  };

  if (showJoinInput) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.container}>
        <TouchableOpacity style={styles.signOutButton} onPress={() => auth.signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.content, { opacity: Animated.multiply(fadeAnim, switchAnim), transform: [{ translateY: slideAnim }] }]}>
          {!SCREENSHOT_MODE && <Text style={styles.emoji}>☀️</Text>}
          <Text style={styles.title}>Enter {partnerName}'s code</Text>

          <TextInput
            style={styles.input}
            placeholder="UBOTH-XXXX"
            placeholderTextColor={colors.textLight}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
          />

          <TouchableOpacity style={styles.button} onPress={handleJoinWithCode} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Join</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => switchView(false)}>
            <Text style={styles.switchText}>Back to my code</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <TouchableOpacity style={styles.signOutButton} onPress={() => auth.signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.content, { opacity: Animated.multiply(fadeAnim, switchAnim), transform: [{ translateY: slideAnim }] }]}>
        {!SCREENSHOT_MODE && <Text style={styles.emoji}>🌿</Text>}
        <Text style={styles.title}>Share this code with {partnerName}</Text>

        <View style={styles.codeCard}>
          <Text style={styles.code}>{inviteCode}</Text>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => Share.share({ message: `Join me on uboth — a meditation app just for us.\n\nEnter my code: ${inviteCode}\n\nDownload: https://apps.apple.com/app/uboth/id6759533464` })}
          activeOpacity={0.85}
        >
          <Text style={styles.shareButtonText}>Share code with {partnerName}</Text>
        </TouchableOpacity>

        <Text style={styles.waitingText}>Waiting for {partnerName} to join...</Text>
        <Text style={styles.subtext}>You'll see the home screen when they enter your code</Text>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => switchView(true)} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>I have {partnerName}'s code</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  codeCard: {
    backgroundColor: colors.cardBg,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  code: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textDark,
    letterSpacing: 0.3,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  shareButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  waitingText: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    color: colors.textLight,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.xl,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    marginHorizontal: spacing.md,
    color: colors.textLight,
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    fontSize: 20,
    color: colors.textDark,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    width: '100%',
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: 48,
    marginBottom: 20,
    ...shadows.card,
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: colors.textLight,
    fontSize: 14,
    marginTop: spacing.md,
  },
  signOutButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: spacing.xs,
  },
  signOutText: {
    color: colors.textLight,
    fontSize: 14,
  },
});
