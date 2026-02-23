import { StyleSheet, Text, View } from 'react-native';
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

  // Save token to Firebase
  await update(ref(database, `users/${uid}`), { pushToken: token });
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

import NameInput from './screens/NameInput';
import PairingScreen from './screens/PairingScreen';
import HomeScreen from './screens/HomeScreen';
import MoodSelector from './screens/MoodSelector';
import WaitingScreen from './screens/WaitingScreen';
import BothReadyScreen from './screens/BothReadyScreen';
import MeditationScreen from './screens/MeditationScreen';
import AppreciationScreen from './screens/AppreciationScreen';
import AuthScreen from './screens/AuthScreen';
import SessionHistoryScreen from './screens/SessionHistoryScreen';
import OnboardingScreen from './screens/OnboardingScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');

  // null = still checking AsyncStorage; true/false = known state.
  // Keeping it as null prevents a flash of the onboarding screen
  // on returning users while AsyncStorage loads.
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  // const [currentScreen, setCurrentScreen] = useState('meditating');
  const [preMood, setPreMood] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [todayPrompt, setTodayPrompt] = useState('Breathe together. Stay present.');
  // const [todayPrompt, setTodayPrompt] = useState('');
  const [postMood, setPostMood] = useState(null);
  const [partnerPreMood, setPartnerPreMood] = useState(null);
  const [partnerPostMood, setPartnerPostMood] = useState(null);
  const [totalPractices, setTotalPractices] = useState(0);
  const [lastPractice, setLastPractice] = useState(null);
  
  const notificationResponseListener = useRef();

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      
      if (user) {

        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          setUserProfile(snapshot.val());
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const getTotalPractices = async () => {
    if (!user || !userProfile || !userProfile.partnerId) return 0;

    const coupleId = [user.uid, userProfile.partnerId].sort().join('_');
    const sessionsRef = ref(database, 'sessions');
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) return 0;

    const allSessions = snapshot.val();
    let count = 0;

    Object.keys(allSessions).forEach(date => {
      const daySession = allSessions[date][coupleId];
      if (daySession?.bothCompleted) {
        count++;
      }
    });

    return count;
  };

  const getLastPracticeDate = async () => {
    if (!user || !userProfile || !userProfile.partnerId) return null;

    const coupleId = [user.uid, userProfile.partnerId].sort().join('_');
    const sessionsRef = ref(database, 'sessions');
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) return null;

    const allSessions = snapshot.val();
    const completedDates = Object.keys(allSessions)
      .filter(date => allSessions[date][coupleId]?.bothCompleted)
      .sort()
      .reverse();

    return completedDates[0] || null;
  };

  useEffect(() => {
    // Load practice stats when user profile loads
    if (userProfile && userProfile.partnerId) {
      getTotalPractices().then(count => setTotalPractices(count));
      getLastPracticeDate().then(date => setLastPractice(date));
    }
  }, [userProfile]);

  // Listen for partner joining (moves from waiting -> bothReady)
  useEffect(() => {
    if (!user || !userProfile || !userProfile.partnerId) return;
    if (currentScreen !== 'waiting') return;

    const todayDate = new Date().toLocaleDateString('en-CA');
    const coupleId = [user.uid, userProfile.partnerId].sort().join('_');
    const bothReadyRef = ref(database, `sessions/${todayDate}/${coupleId}/bothReady`);

    const unsubscribe = onValue(bothReadyRef, (snapshot) => {
      if (snapshot.val() === true) {
        setCurrentScreen('bothReady');
      }
    });

    return () => unsubscribe();
  }, [user, userProfile, currentScreen]);

  const handleNameSubmit = async (userName, partnerName) => {
    if (user) {
      try {
        const profile = {
          name: userName,
          partnerName: partnerName,
          createdAt: Date.now(),
        };
        
        const userRef = ref(database, `users/${user.uid}`);
        await set(userRef, profile);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error saving profile:', error);
      }
    }
  };

  const handlePaired = (partnerId) => {
    setUserProfile(prev => ({ ...prev, partnerId }));
  };

  const handleSignOut = () => {
    setUserProfile(null);
    auth.signOut();
  };

  const startMeditationSession = async (mood) => {
    if (!user || !userProfile || !userProfile.partnerId) return;
    
    const todayDate = new Date().toLocaleDateString('en-CA');
    const coupleId = [user.uid, userProfile.partnerId].sort().join('_');
    
    const sessionRef = ref(database, `sessions/${todayDate}/${coupleId}`);
    const sessionSnapshot = await get(sessionRef);
    const existingSession = sessionSnapshot.val();
    
    // Check if partner already started a session we can join
    const canJoin = existingSession
      && existingSession.partner1
      && existingSession.partner1.userId !== user.uid
      && !existingSession.bothReady;

    if (canJoin) {
      // Partner is waiting, we're joining as partner2
      await set(ref(database, `sessions/${todayDate}/${coupleId}/partner2`), {
        userId: user.uid,
        name: userProfile.name,
        preMood: mood.value,
        ready: true,
        timestamp: Date.now(),
      });
      await set(ref(database, `sessions/${todayDate}/${coupleId}/bothReady`), true);
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
        const partnerSnapshot = await get(ref(database, `users/${userProfile.partnerId}/pushToken`));
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
    
    setSessionId(`${todayDate}/${coupleId}`);
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

  // ── Gate 2: first-time user → show onboarding ──
  // Onboarding always appears before sign-in so there's no auth dependency.
  if (!hasSeenOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // ── Gate 3: not authenticated → sign in ──
  if (!user) {
    return <AuthScreen />;
  }

  // No profile
  if (!userProfile || !userProfile.name) {
    return <NameInput onComplete={handleNameSubmit} />;
  }

  // Not paired
  if (!userProfile.partnerId) {
    return (
      <PairingScreen
        userId={user.uid}
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
        // Save appreciation to Firebase
        if (sessionId && user) {
          // Check which partner this user is
          const sessionRef = ref(database, `sessions/${sessionId}`);
          const snapshot = await get(sessionRef);
          const sessionData = snapshot.val();
          
          const partnerKey = sessionData.partner1.userId === user.uid ? 'partner1' : 'partner2';
          
          if (appreciationText && appreciationText.trim()) {
            await set(ref(database, `sessions/${sessionId}/${partnerKey}/appreciation`), appreciationText);
          }
          
          // Check if both completed
          if (sessionData.partner1.completed && sessionData.partner2.completed) {
            // Both completed! Mark session as fully complete
            await set(ref(database, `sessions/${sessionId}/bothCompleted`), true);
            await set(ref(database, `sessions/${sessionId}/completedAt`), Date.now());

            // Recalculate stats
            const newTotal = await getTotalPractices();
            const newLast = await getLastPracticeDate();
            setTotalPractices(newTotal);
            setLastPractice(newLast);
          }
        }
        
        setCurrentScreen('home');
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
        
        // Save post-mood to Firebase
        if (sessionId && user) {
          // Check which partner this user is
          const sessionRef = ref(database, `sessions/${sessionId}`);
          const snapshot = await get(sessionRef);
          const sessionData = snapshot.val();
          
          const partnerKey = sessionData.partner1.userId === user.uid ? 'partner1' : 'partner2';
          
          await set(ref(database, `sessions/${sessionId}/${partnerKey}/postMood`), mood.value);
          await set(ref(database, `sessions/${sessionId}/${partnerKey}/completed`), true);
          await set(ref(database, `sessions/${sessionId}/${partnerKey}/completedAt`), Date.now());
        }
        
        setCurrentScreen('appreciation');
      }}
    />
  );
}
// Meditation screen
if (currentScreen === 'meditating') {
  return (
    <MeditationScreen
      prompt={todayPrompt}
      onComplete={() => setCurrentScreen('postMood')}
    />
  );
}

  // Both ready screen
  if (currentScreen === 'bothReady') {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const prompts = {
      'Sunday': 'Root down together. Feel the ground beneath you both.',
      'Monday': 'Presence is a choice. Choose it now.',
      'Tuesday': 'Let go of what you\'re holding. Breathe it out.',
      'Wednesday': 'Notice where you touch. Stay here.',
      'Thursday': 'Gratitude lives in the small things. Find one.',
      'Friday': 'Open to each other. Soften what\'s hard.',
      'Saturday': 'Breathe in sync. Let your rhythms meet.',
    };
    
    return (
      <BothReadyScreen
        partnerName={userProfile.partnerName}
        onStartMeditation={() => {
          setTodayPrompt(prompts[dayName]);
          setCurrentScreen('meditating');
        }}
      />
    );
  }
  
  // Waiting screen
  if (currentScreen === 'waiting') {
    return (
      <WaitingScreen partnerName={userProfile.partnerName} />
    );
  }

  // Session history
  if (currentScreen === 'history') {
    return (
      <SessionHistoryScreen
        userId={user.uid}
        partnerId={userProfile.partnerId}
        userName={userProfile.name}
        onBack={() => setCurrentScreen('home')}
      />
    );
  }

  // Mood selector
  if (currentScreen === 'moodSelector') {
    return (
      <MoodSelector
        onSelectMood={startMeditationSession}
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
});