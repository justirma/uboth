import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, database } from './firebaseConfig';
import { ref, set, get, onValue, update } from 'firebase/database';
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { colors } from './theme';

// Key used to persist "user has seen onboarding" across app restarts.
// Once written, onboarding is never shown again on this device.
const ONBOARDING_COMPLETE_KEY = 'ONBOARDING_COMPLETE';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications(uid) {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: '62cc65c3-7d6d-48fd-90fb-d2c7e2128f85',
  });

  // Save token to private path — not readable by other users
  await set(ref(database, `pushTokens/${uid}`), token);
  return token;
}

async function sendPushNotification(expoPushToken, title, body) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title,
      body,
    }),
  });
}

let DEV_CONFIG = { bypassAuth: false };
try { DEV_CONFIG = require('./devConfig').DEV_CONFIG; } catch {}
import { getTodayPrompt } from './prompts';
import { useSubscription } from './subscription';
import NameInput from './screens/NameInput';
import PairingScreen from './screens/PairingScreen';
import HomeScreen from './screens/HomeScreen';
import MoodSelector from './screens/MoodSelector';
import WaitingScreen from './screens/WaitingScreen';
import BothReadyScreen from './screens/BothReadyScreen';
import MeditationScreen from './screens/MeditationScreen';
import TransitionScreen from './screens/TransitionScreen';
import AppreciationScreen from './screens/AppreciationScreen';
import MoodRevealScreen from './screens/MoodRevealScreen';
import AuthScreen from './screens/AuthScreen';
import SessionHistoryScreen from './screens/SessionHistoryScreen';
import PaywallScreen from './screens/PaywallScreen';
import OnboardingScreen from './screens/OnboardingScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(30);
  const [currentScreen, setCurrentScreen] = useState('home');

  // null = still checking AsyncStorage; true/false = known state.
  // Keeping it as null prevents a flash of the onboarding screen
  // on returning users while AsyncStorage loads.
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  // const [currentScreen, setCurrentScreen] = useState('meditating');
  const [preMood, setPreMood] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const todayPrompt = getTodayPrompt();
  const [postMood, setPostMood] = useState(null);
  const [partnerPreMood, setPartnerPreMood] = useState(null);
  const [partnerPostMood, setPartnerPostMood] = useState(null);
  const [totalPractices, setTotalPractices] = useState(0);
  const [lastPractice, setLastPractice] = useState(null);
  const [streak, setStreak] = useState(0);
  const [meditationStartedAt, setMeditationStartedAt] = useState(null);
  const [sessionPaused, setSessionPaused] = useState(false);

  // Derived once — used in session logic, subscription check, and stats
  const coupleId = user && userProfile?.partnerId
    ? [user.uid, userProfile.partnerId].sort().join('_')
    : null;

  const { isPremium } = useSubscription(coupleId);
  
  const notificationResponseListener = useRef();
  const loadingTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // ── Onboarding gate ──
  // Read persisted flag on first mount. This runs once and resolves
  // hasSeenOnboarding from null to true/false so the correct screen renders.
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)
      .then((value) => setHasSeenOnboarding(value === 'true'))
      .catch(() => setHasSeenOnboarding(false)); // fail-open: show onboarding
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (e) {
      // Non-fatal — worst case the user sees onboarding again next launch
      console.warn('Failed to persist onboarding state', e);
    }
    setHasSeenOnboarding(true);
  };

  // DEV: anonymous sign-in → skip profile/pairing and jump to mood selector
  useEffect(() => {
    if (DEV_CONFIG.bypassAuth && user?.isAnonymous && !loading) {
      setUserProfile({ name: 'Dev', partnerName: 'Partner', partnerId: 'dev-partner' });
      setCurrentScreen('moodSelector');
    }
  }, [user, loading]);

  // Register push token when user is logged in
  useEffect(() => {
    if (user) {
      registerForPushNotifications(user.uid).catch(console.warn);
    }
  }, [user]);

  // Handle notification tap — navigate to mood selector
  useEffect(() => {
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      if (user && userProfile && userProfile.partnerId && currentScreen === 'home') {
        setCurrentScreen('moodSelector');
      }
    });

    return () => {
      notificationResponseListener.current?.remove();
    };
  }, [user, userProfile, currentScreen]);

  const retryConnection = async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const firebaseUser = auth.currentUser;
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        setUserProfile(snapshot.exists() ? snapshot.val() : null);
      } else {
        setUserProfile(null);
      }
    } catch {
      setConnectionError(true);
      setRetryCountdown(30);
    } finally {
      setLoading(false);
    }
  };

  // Auto-retry every 30 seconds when Firebase is unreachable
  useEffect(() => {
    if (!connectionError) return;

    countdownIntervalRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          retryConnection();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownIntervalRef.current);
  }, [connectionError]);

  useEffect(() => {
    // If loading hangs for 12s, Firebase is likely unreachable
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      setConnectionError(true);
      setRetryCountdown(30);
    }, 12000);

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      clearTimeout(loadingTimeoutRef.current);
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userRef = ref(database, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          setUserProfile(snapshot.exists() ? snapshot.val() : null);
        } else {
          setUserProfile(null);
        }
        setConnectionError(false);
      } catch {
        // Auth resolved but RTDB is unreachable
        setConnectionError(true);
        setRetryCountdown(30);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeoutRef.current);
      unsubscribe();
    };
  }, []);

  const getPracticeStats = async () => {
    if (!user || !userProfile || !userProfile.partnerId) return;

    const coupleId = [user.uid, userProfile.partnerId].sort().join('_');
    const snapshot = await get(ref(database, `sessions/${coupleId}`));

    if (!snapshot.exists()) {
      setTotalPractices(0);
      setLastPractice(null);
      setStreak(0);
      return;
    }

    const allSessions = snapshot.val();
    const completedDates = Object.keys(allSessions)
      .filter(date => allSessions[date]?.bothCompleted)
      .sort()
      .reverse(); // descending: most recent first

    setTotalPractices(completedDates.length);
    setLastPractice(completedDates[0] || null);

    // Streak: count consecutive days ending today or yesterday.
    // Premium grace: streak stays alive if last session was up to 2 days ago.
    let currentStreak = 0;
    if (completedDates.length > 0) {
      const today = new Date().toLocaleDateString('en-CA');
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-CA');
      const isActive = completedDates[0] === today || completedDates[0] === yesterday
        || (isPremium && completedDates[0] === twoDaysAgo);
      if (isActive) {
        currentStreak = 1;
        for (let i = 1; i < completedDates.length; i++) {
          const prev = new Date(completedDates[i - 1] + 'T00:00:00');
          const curr = new Date(completedDates[i] + 'T00:00:00');
          if (Math.round((prev - curr) / 86400000) === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    setStreak(currentStreak);
  };

  useEffect(() => {
    if (userProfile && userProfile.partnerId) {
      getPracticeStats();
    }
  }, [userProfile]);

  useEffect(() => {
    if (currentScreen === 'home' && userProfile?.partnerId) {
      getPracticeStats();
    }
  }, [currentScreen]);

  // Listen for partner joining (moves from waiting -> bothReady)
  useEffect(() => {
    if (!user || !userProfile || !userProfile.partnerId) return;
    if (currentScreen !== 'waiting') return;
    if (!sessionId) return;

    const bothReadyRef = ref(database, `sessions/${sessionId}/bothReady`);

    const unsubscribe = onValue(bothReadyRef, (snapshot) => {
      if (snapshot.val() === true) {
        setCurrentScreen('bothReady');
      }
    });

    return () => unsubscribe();
  }, [user, userProfile, currentScreen, sessionId]);

  // Listen for partner's post mood when we arrive at moodReveal before them
  useEffect(() => {
    if (currentScreen !== 'moodReveal' || !sessionId || !user || partnerPostMood) return;

    const unsubscribe = onValue(ref(database, `sessions/${sessionId}`), (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const partnerObj = data.partner1?.userId === user.uid ? data.partner2 : data.partner1;
      if (partnerObj?.postMood) setPartnerPostMood(partnerObj.postMood);
      if (partnerObj?.preMood && !partnerPreMood) setPartnerPreMood(partnerObj.preMood);
    });

    return () => unsubscribe();
  }, [currentScreen, sessionId, user?.uid, partnerPostMood]);

  // Listen for partner pause/exit during meditation
  useEffect(() => {
    if (currentScreen !== 'meditating' || !sessionId || !user) return;

    const unsubscribe = onValue(ref(database, `sessions/${sessionId}`), (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      setSessionPaused(data.paused === true);
      if (data.exitedBy && data.exitedBy !== user.uid) {
        setCurrentScreen('home');
      }
    });

    return () => unsubscribe();
  }, [currentScreen, sessionId, user?.uid]);

  const handleNameSubmit = async (userName, partnerName) => {
    const profile = {
      name: userName,
      partnerName: partnerName,
      createdAt: Date.now(),
    };
    if (user) {
      try {
        const userRef = ref(database, `users/${user.uid}`);
        await set(userRef, profile);
      } catch (error) {
        console.error('Error saving profile:', error);
      }
    }
    setUserProfile(prev => ({ ...profile, partnerId: prev?.partnerId }));
  };

  const handlePaired = async (partnerId) => {
    setUserProfile(prev => ({ ...prev, partnerId }));
    // Persist so partnerId survives app restart
    if (user) {
      await update(ref(database, `users/${user.uid}`), { partnerId });
    }
  };

  const handleSignOut = () => {
    setUserProfile(null);
    auth.signOut();
  };

  const startMeditationSession = async (mood) => {
    if (!userProfile || !userProfile.partnerId) return;
    const todayDate = new Date().toLocaleDateString('en-CA');
    const coupleId = [user.uid, userProfile.partnerId].sort().join('_');

    let sessionKey = todayDate;
    try {
      // Find the right session key for today — skip already-completed sessions
      let suffix = 2;
      while (suffix <= 11) {
        const snap = await get(ref(database, `sessions/${coupleId}/${sessionKey}`));
        const existing = snap.val();
        if (!existing || !existing.bothCompleted) break;
        sessionKey = `${todayDate}_${suffix}`;
        suffix++;
      }

      const sessionRef = ref(database, `sessions/${coupleId}/${sessionKey}`);
      const sessionSnapshot = await get(sessionRef);
      const existingSession = sessionSnapshot.val();

      // Check if partner already started a session we can join
      const canJoin = existingSession
        && existingSession.partner1
        && existingSession.partner1.userId !== user.uid
        && !existingSession.bothReady;

      if (canJoin) {
        // Partner is waiting, we're joining as partner2
        await set(ref(database, `sessions/${coupleId}/${sessionKey}/partner2`), {
          userId: user.uid,
          name: userProfile.name,
          preMood: mood.value,
          ready: true,
          timestamp: Date.now(),
        });
        await set(ref(database, `sessions/${coupleId}/${sessionKey}/bothReady`), true);
      } else {
        // We're first (or restarting) — create fresh session
        await set(sessionRef, {
          partner1: {
            userId: user.uid,
            name: userProfile.name,
            preMood: mood.value,
            ready: true,
            timestamp: Date.now(),
          },
          partner2: {
            ready: false,
          },
          bothReady: false,
          meditationStarted: false,
          completed: false,
        });

        // Notify partner
        try {
          const partnerSnapshot = await get(ref(database, `pushTokens/${userProfile.partnerId}`));
          const partnerToken = partnerSnapshot.val();
          if (partnerToken) {
            await sendPushNotification(
              partnerToken,
              'uboth',
              `${userProfile.name} is ready to meditate — join them!`
            );
          }
        } catch (e) {
          console.warn('Failed to send push notification', e);
        }
      }
    } catch (e) {
      console.warn('Failed to write session to Firebase:', e);
    }

    setSessionId(`${coupleId}/${sessionKey}`);
    setPreMood(mood);
    setCurrentScreen('waiting');
  };

  // ── Gate 1: waiting for AsyncStorage to resolve ──
  // hasSeenOnboarding === null means we haven't checked yet.
  // Show a minimal splash rather than a flash of the wrong screen.
  if (hasSeenOnboarding === null || loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>uboth</Text>
      </View>
    );
  }

  // ── Gate 2: Firebase unreachable ──
  if (connectionError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>uboth</Text>
        <Text style={styles.outageHeading}>Having trouble connecting</Text>
        <Text style={styles.outageBody}>
          Your data is safe. We'll keep trying to reconnect.
        </Text>
        <Text style={styles.outageCountdown}>Retrying in {retryCountdown}s</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
          <Text style={styles.retryButtonText}>Retry now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // DEV bypass: wait for mock profile to be set before rendering screens
  if (DEV_CONFIG.bypassAuth && user?.isAnonymous && !userProfile) {
    return <View style={styles.container}><Text style={styles.title}>uboth</Text></View>;
  }

  // ── Gate 3: first-time user → show onboarding ──
  // Onboarding always appears before sign-in so there's no auth dependency.
  if (!hasSeenOnboarding && !(DEV_CONFIG.bypassAuth && user?.isAnonymous)) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // ── Gate 4: not authenticated → sign in ──
  if (!user) {
    return <AuthScreen />;
  }

  // No profile
  if ((!userProfile || !userProfile.name) && !(DEV_CONFIG.bypassAuth && user?.isAnonymous)) {
    return <NameInput onComplete={handleNameSubmit} />;
  }

  // Not paired
  if (!userProfile?.partnerId && !(DEV_CONFIG.bypassAuth && user?.isAnonymous)) {
    return (
      <PairingScreen
        userId={user?.uid ?? 'dev-user'}
        userName={userProfile.name}
        partnerName={userProfile.partnerName}
        onPaired={handlePaired}
      />
    );
  }

  // Screen routing for paired users
  // Show appreciation screen
  if (currentScreen === 'appreciation') {
  return (
    <AppreciationScreen
      userName={userProfile.name}
      partnerName={userProfile.partnerName}
      userPreMood={preMood}
      userPostMood={postMood}
      partnerPreMood={partnerPreMood}
      partnerPostMood={partnerPostMood}
      onComplete={async (appreciationText) => {
        try {
          // Save appreciation to Firebase
          if (sessionId && user) {
            const sessionRef = ref(database, `sessions/${sessionId}`);
            const snapshot = await get(sessionRef);
            const sessionData = snapshot.val();

            if (sessionData) {
              const partnerKey = sessionData.partner1?.userId === user.uid ? 'partner1' : 'partner2';

              if (appreciationText && appreciationText.trim()) {
                await set(ref(database, `sessions/${sessionId}/${partnerKey}/appreciation`), appreciationText);
              }

              // Re-fetch to get the freshest completed flags from both partners
              // (partner may have finished postMood while we were on AppreciationScreen)
              const freshSnapshot = await get(sessionRef);
              const freshData = freshSnapshot.val();
              if (freshData?.partner1?.completed && freshData?.partner2?.completed) {
                await set(ref(database, `sessions/${sessionId}/bothCompleted`), true);
                await set(ref(database, `sessions/${sessionId}/completedAt`), Date.now());
                await getPracticeStats();
              }
            }
          }
        } catch (e) {
          console.warn('Failed to save appreciation:', e);
        } finally {
          setCurrentScreen('home');
        }
      }}
    />
  );
}

// Show post-mood selector
if (currentScreen === 'postMood') {
  return (
    <MoodSelector
      isPost={true}
      onSelectMood={async (mood) => {
        setPostMood(mood);

        if (sessionId && user) {
          const sessionRef = ref(database, `sessions/${sessionId}`);
          const snapshot = await get(sessionRef);
          const sessionData = snapshot.val();

          const partnerKey = sessionData.partner1.userId === user.uid ? 'partner1' : 'partner2';
          const partnerObj = partnerKey === 'partner1' ? sessionData.partner2 : sessionData.partner1;

          await set(ref(database, `sessions/${sessionId}/${partnerKey}/postMood`), mood.value);
          await set(ref(database, `sessions/${sessionId}/${partnerKey}/completed`), true);
          await set(ref(database, `sessions/${sessionId}/${partnerKey}/completedAt`), Date.now());

          // Capture partner's moods for the reveal screen (may be null if they haven't finished yet)
          setPartnerPreMood(partnerObj?.preMood || null);
          setPartnerPostMood(partnerObj?.postMood || null);
        }

        setCurrentScreen('moodReveal');
      }}
    />
  );
}
// Mood reveal screen
if (currentScreen === 'moodReveal') {
  return (
    <MoodRevealScreen
      userName={userProfile.name}
      partnerName={userProfile.partnerName}
      userPreMood={preMood}
      userPostMood={postMood}
      partnerPreMood={partnerPreMood}
      partnerPostMood={partnerPostMood}
      partnerPending={!partnerPostMood}
      onContinue={() => setCurrentScreen('appreciation')}
    />
  );
}

// Meditation screen
if (currentScreen === 'meditating') {
  return (
    <MeditationScreen
      prompt={todayPrompt}
      startedAt={meditationStartedAt}
      partnerPaused={sessionPaused}
      onComplete={() => setCurrentScreen('transition')}
      onExit={async () => {
        if (sessionId) {
          try { await set(ref(database, `sessions/${sessionId}/exitedBy`), user.uid); } catch (e) {}
        }
        setCurrentScreen('home');
      }}
      onPause={async () => {
        if (sessionId) {
          try { await set(ref(database, `sessions/${sessionId}/paused`), true); } catch (e) {}
        }
      }}
      onResume={async () => {
        if (sessionId) {
          try { await set(ref(database, `sessions/${sessionId}/paused`), false); } catch (e) {}
        }
      }}
    />
  );
}

// Post-meditation landing moment
if (currentScreen === 'transition') {
  return <TransitionScreen onComplete={() => setCurrentScreen('postMood')} />;
}

  // Both ready screen
  if (currentScreen === 'bothReady') {
    return (
      <BothReadyScreen
        partnerName={userProfile.partnerName}
        onStartMeditation={async () => {
          // Use existing timestamp if partner already started, otherwise create one
          let startedAt = Date.now();
          if (sessionId) {
            try {
              const snap = await get(ref(database, `sessions/${sessionId}/meditationStartedAt`));
              if (snap.val()) {
                startedAt = snap.val();
              } else {
                await set(ref(database, `sessions/${sessionId}/meditationStartedAt`), startedAt);
              }
            } catch (e) {}
          }
          setMeditationStartedAt(startedAt);
          setSessionPaused(false);
          setCurrentScreen('meditating');
        }}
        onCancel={() => setCurrentScreen('home')}
      />
    );
  }
  
  // Waiting screen
  if (currentScreen === 'waiting') {
    return (
      <WaitingScreen
        partnerName={userProfile.partnerName}
        onCancel={() => setCurrentScreen('home')}
      />
    );
  }

  // Session history
  if (currentScreen === 'history') {
    return (
      <SessionHistoryScreen
        userId={user?.uid ?? 'dev-user'}
        partnerId={userProfile.partnerId}
        userName={userProfile.name}
        isPremium={isPremium}
        onBack={() => setCurrentScreen('home')}
        onUpgrade={() => setCurrentScreen('paywall')}
      />
    );
  }

  // Paywall
  if (currentScreen === 'paywall') {
    return <PaywallScreen onBack={() => setCurrentScreen('history')} />;
  }

  // Mood selector
  if (currentScreen === 'moodSelector') {
    return (
      <MoodSelector
        onSelectMood={startMeditationSession}
        partnerName={userProfile.partnerName}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  // Home screen
  return (
    <HomeScreen
      userName={userProfile.name}
      partnerName={userProfile.partnerName}
      totalPractices={totalPractices}
      lastPractice={lastPractice}
      streak={streak}
      onSignOut={handleSignOut}
      onStartPractice={() => setCurrentScreen('moodSelector')}
      onViewHistory={() => setCurrentScreen('history')}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 12,
  },
  outageHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  outageBody: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  outageCountdown: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 16,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  retryButtonText: {
    fontSize: 15,
    color: colors.textDark,
  },
});