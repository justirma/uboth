import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing, borderRadius } from '../theme';

// Runtime-detect expo-audio and provide a safe fallback/stub so the app
// doesn't crash if the package shape differs in the user's environment.
let createAudioPlayer;
let setAudioModeAsync;
try {
  const expoAudio = require('expo-audio');
  if (expoAudio && typeof expoAudio.createAudioPlayer === 'function') {
    createAudioPlayer = expoAudio.createAudioPlayer;
  } else if (expoAudio && typeof expoAudio.default === 'function') {
    createAudioPlayer = expoAudio.default;
  } else {
    console.warn('expo-audio player factory not found — using stubbed player.');
    createAudioPlayer = () => ({ play: async () => {}, pause: async () => {}, seekTo: () => {}, remove: async () => {} });
  }
  if (expoAudio && typeof expoAudio.setAudioModeAsync === 'function') {
    setAudioModeAsync = expoAudio.setAudioModeAsync;
  }
} catch (e) {
  console.warn('Failed to require expo-audio; using fallback stub.', e);
  createAudioPlayer = () => ({ play: async () => {}, pause: async () => {}, seekTo: () => {}, remove: async () => {} });
}

const startBellSource = require('../assets/bell-start.mp3');
const endBellSource = require('../assets/bell-end.mp3');

export default function MeditationScreen({ prompt, onComplete, onExit }) {
  const [timeLeft, setTimeLeft] = useState(300);
  const [isActive, setIsActive] = useState(true);


  const startBellRef = useRef(null);
  const endBellRef = useRef(null);
  // BUG-03: timestamp used to correct timer after phone lock/background
  const startTimestampRef = useRef(null);

  // Animation refs
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(0)).current;

  // Create audio players, configure silent mode, then fire start bell — all in sequence
  useEffect(() => {
    const setup = async () => {
      if (typeof setAudioModeAsync === 'function') {
        await setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
      }
      try {
        startBellRef.current = createAudioPlayer(startBellSource);
        endBellRef.current = createAudioPlayer(endBellSource);
        startBellRef.current.seekTo(0);
        startBellRef.current.play();
      } catch (e) {
        console.warn('Failed to load bell sounds', e);
      }
    };
    setup();
    startTimestampRef.current = Date.now();

    // Fade in content on mount
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();


    return () => {
      try { startBellRef.current?.remove(); } catch (e) {}
      try { endBellRef.current?.remove(); } catch (e) {}
      startBellRef.current = null;
      endBellRef.current = null;
    };
  }, []);

  // BUG-03: track when active period started so we can correct for phone lock
  useEffect(() => {
    if (isActive) {
      startTimestampRef.current = Date.now();
    } else {
      startTimestampRef.current = null;
    }
  }, [isActive]);

  // BUG-03: when app returns to foreground, catch up any missed seconds
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && startTimestampRef.current !== null) {
        const elapsed = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        setTimeLeft(prev => Math.max(0, prev - elapsed));
        startTimestampRef.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, []);

  // Breathing circle animation — loops during active meditation
  useEffect(() => {
    if (isActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.15,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1.0,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      breatheAnim.setValue(1);
    }
  }, [isActive]);


  // Meditation timer
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      try {
        if (endBellRef.current) {
          endBellRef.current.seekTo(0);
          endBellRef.current.play();
        }
      } catch (e) {}
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Meditation in progress
  return (
    <LinearGradient colors={gradients.meditation} style={styles.meditatingContainer}>
      <Animated.View style={[styles.content, { opacity: screenFade }]}>
      <TouchableOpacity
        style={styles.exitButton}
        onPress={() => {
          setIsActive(false);
          try { startBellRef.current?.pause(); startBellRef.current?.seekTo(0); } catch (e) {}
          try { endBellRef.current?.pause(); endBellRef.current?.seekTo(0); } catch (e) {}
          onExit ? onExit() : onComplete();
        }}
      >
        <Text style={styles.exitText}>&#x2715;</Text>
      </TouchableOpacity>


      {/* Breathing circle behind the timer */}
      <View style={styles.timerWrapper}>
        <Animated.View
          style={[
            styles.breatheCircle,
            { transform: [{ scale: breatheAnim }] },
          ]}
        />
        <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
      </View>

      {timeLeft === 0 && (
        <TouchableOpacity style={styles.doneButton} onPress={onComplete}>
          <Text style={styles.doneButtonText}>We're Done</Text>
        </TouchableOpacity>
      )}

      {timeLeft > 0 && (
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() => {
            if (isActive) {
              try { startBellRef.current?.pause(); } catch (e) {}
              setIsActive(false);
            } else {
              try { startBellRef.current?.play(); } catch (e) {}
              setIsActive(true);
            }
          }}
        >
          <Text style={styles.pauseText}>{isActive ? '| |' : '\u25B6'}</Text>
        </TouchableOpacity>
      )}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  meditatingContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  timerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  breatheCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  timer: {
    fontSize: 72,
    fontWeight: '300',
    color: colors.textDark,
  },
  doneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.pill,
    paddingVertical: 18,
    paddingHorizontal: 48,
  },
  doneButtonText: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: '600',
  },
  pauseButton: {
    position: 'absolute',
    bottom: 60,
    padding: spacing.md,
  },
  pauseText: {
    fontSize: 24,
    color: colors.textDark,
    opacity: 0.4,
    fontWeight: '600',
  },
  exitButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: spacing.sm,
  },
  exitText: {
    fontSize: 28,
    color: colors.textDark,
    opacity: 0.4,
    fontWeight: '300',
  },
});
