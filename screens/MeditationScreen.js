import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, AppState } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing, borderRadius } from '../theme';

let createAudioPlayer;
let setAudioModeAsync;
try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  createAudioPlayer = () => ({ play: () => {}, pause: () => {}, seekTo: () => {}, remove: () => {} });
}

const startBellSource = require('../assets/bell-start.mp3');
const endBellSource = require('../assets/bell-end.mp3');

const DURATION = 300;

export default function MeditationScreen({ prompt, onComplete, onExit, onPause, onResume, startedAt, partnerPaused }) {
  // Wall-clock refs — drive the timer from a shared start timestamp
  const startRef = useRef(startedAt ?? Date.now());
  const totalPausedMsRef = useRef(0);  // cumulative ms spent paused
  const pauseStartMsRef = useRef(null); // when current pause began

  const getTimeLeft = () =>
    Math.max(0, DURATION - Math.floor((Date.now() - startRef.current - totalPausedMsRef.current) / 1000));

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [userPaused, setUserPaused] = useState(false);

  // isActive is derived — timer runs only when neither partner has paused
  const isActive = !userPaused && !(partnerPaused ?? false);

  const startBellRef = useRef(null);
  const endBellRef = useRef(null);

  // Animation refs
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(0)).current;

  // Load bells, configure silent mode, then fire start bell
  useEffect(() => {
    const setup = async () => {
      if (typeof setAudioModeAsync === 'function') {
        await setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
      }
      try {
        startBellRef.current = createAudioPlayer(startBellSource);
        setTimeout(() => {
          try { startBellRef.current?.play(); } catch (e) {}
        }, 150);
      } catch (e) {
        console.warn('Failed to play start bell', e);
      }
      try {
        endBellRef.current = createAudioPlayer(endBellSource);
      } catch (e) {
        console.warn('Failed to load end bell', e);
      }
    };
    setup();

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

  // Track cumulative pause time so wall-clock timer stays accurate across pauses
  useEffect(() => {
    if (!isActive) {
      if (pauseStartMsRef.current === null) pauseStartMsRef.current = Date.now();
    } else {
      if (pauseStartMsRef.current !== null) {
        totalPausedMsRef.current += Date.now() - pauseStartMsRef.current;
        pauseStartMsRef.current = null;
      }
    }
  }, [isActive]);

  // When app returns to foreground, recompute from wall clock (handles screen lock)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') setTimeLeft(getTimeLeft());
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

  // Meditation timer — wall-clock based
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(getTimeLeft());
      }, 1000);
    }
    if (timeLeft === 1 && isActive) {
      try { endBellRef.current?.seekTo(0); } catch (e) {}
      try { endBellRef.current?.play(); } catch (e) {}
    }
    if (timeLeft === 0) {
      setUserPaused(true); // freeze timer at zero
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePausePress = () => {
    if (userPaused) {
      setUserPaused(false);
      onResume?.();
    } else {
      setUserPaused(true);
      onPause?.();
    }
  };

  const handleExit = () => {
    setUserPaused(true);
    try { startBellRef.current?.pause(); } catch (e) {}
    try { endBellRef.current?.pause(); } catch (e) {}
    onExit?.();
  };

  return (
    <LinearGradient colors={gradients.meditation} style={styles.meditatingContainer}>
      <Animated.View style={[styles.content, { opacity: screenFade }]}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
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
          <View style={styles.pauseArea}>
            {(partnerPaused ?? false) && !userPaused && (
              <Text style={styles.partnerPausedText}>Partner paused</Text>
            )}
            <TouchableOpacity style={styles.pauseButton} onPress={handlePausePress}>
              <Text style={styles.pauseText}>{isActive ? '| |' : '\u25B6'}</Text>
            </TouchableOpacity>
          </View>
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
  pauseArea: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  pauseButton: {
    padding: spacing.md,
  },
  pauseText: {
    fontSize: 24,
    color: colors.textDark,
    opacity: 0.4,
    fontWeight: '600',
  },
  partnerPausedText: {
    fontSize: 13,
    color: colors.textDark,
    opacity: 0.5,
    marginBottom: 4,
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
