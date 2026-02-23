import { Animated, Easing, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ref, set, onValue, get } from 'firebase/database';
import { LinearGradient } from 'expo-linear-gradient';
import { database, auth } from '../firebaseConfig';
import { colors, gradients, shadows, spacing, borderRadius } from '../theme';

export default function PairingScreen({ userId, userName, partnerName, onPaired }) {
  const [inviteCode, setInviteCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');

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

  useEffect(() => {
    const code = `UBOTH-${userId.slice(-4).toUpperCase()}`;
    setInviteCode(code);

    const userRef = ref(database, `users/${userId}`);
    set(userRef, {
      name: userName,
      partnerName: partnerName,
      inviteCode: code,
      createdAt: Date.now(),
    });

    const coupleRef = ref(database, `couples/${userId}`);
    const unsubscribe = onValue(coupleRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.partnerId) {
        onPaired(data.partnerId);
      }
    });

    return () => unsubscribe();
  }, [userId, userName, partnerName]);

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) return;

    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      let partnerId = null;
      snapshot.forEach((child) => {
        if (child.val().inviteCode === joinCode.trim().toUpperCase()) {
          partnerId = child.key;
        }
      });

      if (!partnerId) {
        Alert.alert('Invalid Code', 'No user found with that invite code');
        return;
      }

      await set(ref(database, `couples/${userId}`), {
        partnerId: partnerId,
        pairedAt: Date.now(),
      });

      await set(ref(database, `couples/${partnerId}`), {
        partnerId: userId,
        pairedAt: Date.now(),
      });

      Alert.alert('Success!', `You're now paired with your partner!`);
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

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.emoji}>☀️</Text>
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

          <TouchableOpacity onPress={() => setShowJoinInput(false)}>
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

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.emoji}>🌿</Text>
        <Text style={styles.title}>Share this code with {partnerName}</Text>

        <View style={styles.codeCard}>
          <Text style={styles.code}>{inviteCode}</Text>
        </View>

        <Text style={styles.waitingText}>Waiting for {partnerName} to join...</Text>
        <Text style={styles.subtext}>You'll see the home screen when they enter your code</Text>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowJoinInput(true)} activeOpacity={0.85}>
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
    backgroundColor: 'rgba(168, 198, 134, 0.15)',
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
    letterSpacing: 2,
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
