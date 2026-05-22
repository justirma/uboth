import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, database } from './firebaseConfig';
import { ref, set, get, onValue, update, onDisconnect, runTransaction } from 'firebase/database';
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { colors } from './theme';
import { initAnalytics, identify, track, Events } from './analytics';

const localDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
});

initAnalytics();

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
import EmailCaptureScreen from './screens/EmailCaptureScreen';
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
  const [devScreen, setDevScreen] = useState(null);
  const [devPickerOpen, setDevPickerOpen] = useState(false);

  // Derived once — used in session logic, subscription check, and stats
  const coupleId = user && userProfile?.partnerId
    ? [user.uid, userProfile.partnerId].sort().join('_')
    : null;

  const { isPremium } = useSubscription(coupleId);
  
  const notificationResponseListener = useRef();
  const loadingTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const pauseDisconnectRef = useRef(null);

  // ── Onboarding gate ──
  // Read persisted flag on first mount. This runs once and resolves
  // hasSeenOnboarding from null to true/false so the correct screen renders.
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)
      .then((value) => setHasSeenOnboarding(value === 'true'))
      .catch(() => setHasSeenOnboarding(false)); // fail-open: show onboarding
  }, []);

  const handleOnboardingComplete = async () => {
    track(Events.ONBOARDING_COMPLETE);
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (e) {
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

  // Identify user in analytics on sign-in
  useEffect(() => {
    if (user) {
      identify(user.uid);
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
    // Session keys can be "YYYY-MM-DD" or "YYYY-MM-DD_2" for multiple sessions per day.
    // Strip the suffix and deduplicate so each date counts once.
    const completedDates = [...new Set(
      Object.keys(allSessions)
        .filter(key => allSessions[key]?.bothCompleted)
        .map(key => key.split('_')[0])
    )].sort().reverse(); // descending: most recent first

    setTotalPractices(completedDates.length);
    setLastPractice(completedDates[0] || null);

    // Streak: count consecutive days ending today or yesterday.
    // Premium grace: streak stays alive if last session was up to 2 days ago.
    let currentStreak = 0;
    if (completedDates.length > 0) {
      const today = localDateStr();
      const yesterday = localDateStr(new Date(Date.now() - 86400000));
      const twoDaysAgo = localDateStr(new Date(Date.now() - 2 * 86400000));
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
      // Shared pause — either partner pausing stops the session for both
      setSessionPaused(data.paused === true);
      if (data.exitedBy && data.exitedBy !== user.uid && !data.meditationEnded) {
        setCurrentScreen('home');
      }
    });

    return () => unsubscribe();
  }, [currentScreen, sessionId, user?.uid]);

  // If this device loses connection mid-meditation, clear the shared pause so
  // the partner's timer doesn't stay frozen forever.
  useEffect(() => {
    if (currentScreen !== 'meditating' || !sessionId) return;

    const handler = onDisconnect(ref(database, `sessions/${sessionId}/paused`));
    handler.set(false).catch(() => {});
    pauseDisconnectRef.current = handler;

    return () => {
      handler.cancel().catch(() => {});
      pauseDisconnectRef.current = null;
    };
  }, [currentScreen, sessionId]);

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
    track(Events.NAME_SUBMITTED);
    setUserProfile(prev => ({ ...profile, partnerId: prev?.partnerId }));
  };

  const handleEmailCapture = async (email) => {
    if (!user) return;
    const updates = { emailCaptured: true };
    if (email) updates.email = email;
    try {
      await update(ref(database, `users/${user.uid}`), updates);
    } catch (e) {
      console.warn('Failed to save email:', e);
    }
    track(email ? Events.EMAIL_CAPTURED : Events.EMAIL_SKIPPED);
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  const handlePaired = async (partnerId) => {
    track(Events.PAIRED);
    setUserProfile(prev => ({ ...prev, partnerId }));
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
    const todayDate = localDateStr();
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
    track(Events.SESSION_STARTED, { mood: mood.value });
    setCurrentScreen('waiting');
  };

  const DEV_MOCK = {
    userName: 'Lloyd',
    partnerName: 'Carlos',
    preMood: { emoji: '🌊', label: 'Anxious', value: 'anxious' },
    postMood: { emoji: '🌿', label: 'Calm', value: 'calm' },
    partnerPreMood: { emoji: '🍂', label: 'Stressed', value: 'stressed' },
    partnerPostMood: { emoji: '✨', label: 'Grateful', value: 'grateful' },
    totalPractices: 12,
    streak: 5,
    lastPractice: '2026-05-17',
  };

  const DEV_SCREENS = [
    'onboarding', 'auth', 'nameInput', 'emailCapture', 'pairing', 'home',
    'moodSelector', 'waiting', 'bothReady', 'meditating',
    'transition', 'postMood', 'moodReveal', 'appreciation',
    'history', 'paywall',
  ];

  const renderDevScreen = (screen) => {
    const noop = () => {};
    switch (screen) {
      case 'onboarding':   return <OnboardingScreen onComplete={noop} />;
      case 'auth':         return <AuthScreen />;
      case 'nameInput':    return <NameInput onComplete={noop} />;
      case 'emailCapture': return <EmailCaptureScreen onComplete={noop} />;
      case 'pairing':      return <PairingScreen userId="dev" userName={DEV_MOCK.userName} partnerName={DEV_MOCK.partnerName} onPaired={noop} />;
      case 'home':         return <HomeScreen userName={DEV_MOCK.userName} partnerName={DEV_MOCK.partnerName} totalPractices={DEV_MOCK.totalPractices} lastPractice={DEV_MOCK.lastPractice} streak={DEV_MOCK.streak} onSignOut={noop} onStartPractice={noop} onViewHistory={noop} />;
      case 'moodSelector': return <MoodSelector onSelectMood={noop} partnerName={DEV_MOCK.partnerName} onBack={noop} />;
      case 'waiting':      return <WaitingScreen partnerName={DEV_MOCK.partnerName} onCancel={noop} />;
      case 'bothReady':    return <BothReadyScreen partnerName={DEV_MOCK.partnerName} onStartMeditation={noop} onCancel={noop} />;
      case 'meditating':   return <MeditationScreen prompt={todayPrompt} startedAt={Date.now()} partnerPaused={false} onComplete={noop} onExit={noop} onPause={noop} onResume={noop} onTimerEnd={noop} />;
      case 'transition':   return <TransitionScreen onComplete={noop} />;
      case 'postMood':     return <MoodSelector isPost={true} onSelectMood={noop} />;
      case 'moodReveal':   return <MoodRevealScreen userName={DEV_MOCK.userName} partnerName={DEV_MOCK.partnerName} userPreMood={DEV_MOCK.preMood} userPostMood={DEV_MOCK.postMood} partnerPreMood={DEV_MOCK.partnerPreMood} partnerPostMood={DEV_MOCK.partnerPostMood} partnerPending={false} onContinue={noop} />;
      case 'appreciation': return <AppreciationScreen userName={DEV_MOCK.userName} partnerName={DEV_MOCK.partnerName} userPreMood={DEV_MOCK.preMood} userPostMood={DEV_MOCK.postMood} partnerPreMood={DEV_MOCK.partnerPreMood} partnerPostMood={DEV_MOCK.partnerPostMood} onComplete={noop} />;
      case 'history':      return <SessionHistoryScreen userId="dev" partnerId="dev-partner" userName={DEV_MOCK.userName} isPremium={false} onBack={noop} onUpgrade={noop} />;
      case 'paywall':      return <PaywallScreen onBack={noop} />;
      default:             return null;
    }
  };

  const renderScreen = () => {
    if (__DEV__ && devScreen) return renderDevScreen(devScreen);

    // ── Gate 1: waiting for AsyncStorage to resolve ──
    if (hasSeenOnboarding === null || loading) {
      return <View style={styles.container}><Text style={styles.title}>uboth</Text></View>;
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
    if (!hasSeenOnboarding && !(DEV_CONFIG.bypassAuth && user?.isAnonymous)) {
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    // ── Gate 4: not authenticated → sign in ──
    if (!user) return <AuthScreen />;

    // No profile
    if ((!userProfile || !userProfile.name) && !(DEV_CONFIG.bypassAuth && user?.isAnonymous)) {
      return <NameInput onComplete={handleNameSubmit} />;
    }

    // Email capture — shown once during new-user onboarding, before pairing
    if (!userProfile?.emailCaptured && !userProfile?.partnerId && !(DEV_CONFIG.bypassAuth && user?.isAnonymous)) {
      return <EmailCaptureScreen onComplete={handleEmailCapture} />;
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
              if (sessionId && user) {
                const sessionRef = ref(database, `sessions/${sessionId}`);
                const snapshot = await get(sessionRef);
                const sessionData = snapshot.val();
                if (sessionData) {
                  const partnerKey = sessionData.partner1?.userId === user.uid ? 'partner1' : 'partner2';
                  if (appreciationText && appreciationText.trim()) {
                    await set(ref(database, `sessions/${sessionId}/${partnerKey}/appreciation`), appreciationText);
                  }
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
              track(Events.APPRECIATION_SENT, { hasText: !!(appreciationText?.trim()) });
              setCurrentScreen('home');
            }
          }}
        />
      );
    }

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
              setPartnerPreMood(partnerObj?.preMood || null);
              setPartnerPostMood(partnerObj?.postMood || null);
            }
            track(Events.MOOD_SELECTED, { mood: mood.value, type: 'post' });
            setCurrentScreen('moodReveal');
          }}
        />
      );
    }

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

    if (currentScreen === 'meditating') {
      return (
        <MeditationScreen
          prompt={todayPrompt}
          startedAt={meditationStartedAt}
          partnerPaused={sessionPaused}
          onComplete={() => {
            track(Events.SESSION_COMPLETED);
            setCurrentScreen('transition');
          }}
          onExit={async () => {
            track(Events.SESSION_ABANDONED);
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
          onTimerEnd={async () => {
            if (sessionId) {
              try { await set(ref(database, `sessions/${sessionId}/meditationEnded`), true); } catch (e) {}
            }
          }}
        />
      );
    }

    if (currentScreen === 'transition') {
      return <TransitionScreen onComplete={() => setCurrentScreen('postMood')} />;
    }

    if (currentScreen === 'bothReady') {
      return (
        <BothReadyScreen
          partnerName={userProfile.partnerName}
          onStartMeditation={async () => {
            let startedAt = Date.now();
            if (sessionId) {
              try {
                const startedAtRef = ref(database, `sessions/${sessionId}/meditationStartedAt`);
                const result = await runTransaction(startedAtRef, (current) => {
                  if (current === null || current === undefined) return startedAt;
                  return current;
                });
                if (result.committed && result.snapshot.exists()) {
                  startedAt = result.snapshot.val();
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

    if (currentScreen === 'waiting') {
      return <WaitingScreen partnerName={userProfile.partnerName} onCancel={() => setCurrentScreen('home')} />;
    }

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

    if (currentScreen === 'paywall') {
      track(Events.PAYWALL_VIEWED);
      return <PaywallScreen onBack={() => setCurrentScreen('history')} />;
    }

    if (currentScreen === 'moodSelector') {
      return (
        <MoodSelector
          onSelectMood={startMeditationSession}
          partnerName={userProfile.partnerName}
          onBack={() => setCurrentScreen('home')}
        />
      );
    }

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
  };

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      {__DEV__ && (
        <>
          <TouchableOpacity style={devStyles.fab} onPress={() => setDevPickerOpen(true)}>
            <Text style={devStyles.fabText}>DEV</Text>
          </TouchableOpacity>
          <Modal visible={devPickerOpen} transparent animationType="slide">
            <View style={devStyles.overlay}>
              <View style={devStyles.sheet}>
                <Text style={devStyles.sheetTitle}>Jump to screen</Text>
                <ScrollView>
                  {DEV_SCREENS.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[devStyles.item, devScreen === s && devStyles.itemActive]}
                      onPress={() => { setDevScreen(s); setDevPickerOpen(false); }}
                    >
                      <Text style={[devStyles.itemText, devScreen === s && devStyles.itemTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                  {devScreen && (
                    <TouchableOpacity
                      style={devStyles.backItem}
                      onPress={() => { setDevScreen(null); setDevPickerOpen(false); }}
                    >
                      <Text style={devStyles.backText}>← Back to app</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
                <TouchableOpacity style={devStyles.closeBtn} onPress={() => setDevPickerOpen(false)}>
                  <Text style={devStyles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
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

const devStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 52,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 9999,
  },
  fabText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '75%',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111' },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemActive: { backgroundColor: '#D4956A20' },
  itemText: { fontSize: 15, color: '#333' },
  itemTextActive: { color: '#D4956A', fontWeight: '600' },
  backItem: { paddingVertical: 12, paddingHorizontal: 14, marginTop: 8 },
  backText: { fontSize: 15, color: '#888' },
  closeBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeBtnText: { fontSize: 15, color: '#555' },
});