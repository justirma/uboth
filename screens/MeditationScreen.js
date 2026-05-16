import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, AppState, SafeAreaView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { colors, gradients, spacing, borderRadius } from '../theme';

const DURATION = 300;

export default function MeditationScreen({ prompt, onComplete, onExit, onPause, onResume, onTimerEnd, startedAt, partnerPaused }) {
  const startRef = useRef(startedAt ?? Date.now());
  const totalPausedMsRef = useRef(0);
  const pauseStartMsRef = useRef(null);
  const timerEndedRef = useRef(false);
  const endBellPlayedRef = useRef(false);

  const getTimeLeft = () =>
    Math.max(0, DURATION - Math.floor((Date.now() - startRef.current - totalPausedMsRef.current) / 1000));

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [timerEnded, setTimerEnded] = useState(false);

  // Shared session pause — either partner can pause/resume for both
  const sessionPaused = partnerPaused ?? false;
  const isActive = !sessionPaused && !timerEnded;

  const startBellRef = useRef(null);
  const endBellRef = useRef(null);

  const breatheAnim = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => deactivateKeepAwake();
  }, []);

  useEffect(() => {
    const setup = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch (e) {}
      try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/bell-start.mp3'));
        startBellRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.warn('Failed to play start bell', e);
      }
      try {
        const { sound } = await Audio.Sound.createAsync(require('../assets/bell-end.mp3'));
        endBellRef.current = sound;
      } catch (e) {
        console.warn('Failed to load end bell', e);
      }
    };
    setup();

    Animated.timing(screenFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    return () => {
      startBellRef.current?.unloadAsync().catch(() => {});
      endBellRef.current?.unloadAsync().catch(() => {});
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

  // Breathing circle — runs only while meditation is active
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
    if (timeLeft <= 1 && !endBellPlayedRef.current) {
      endBellPlayedRef.current = true;
      endBellRef.current?.setPositionAsync(0).then(() => endBellRef.current?.playAsync()).catch(() => {});
    }
    if (timeLeft === 0 && !timerEndedRef.current) {
      timerEndedRef.current = true;
      setTimerEnded(true);
      onTimerEnd?.();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Either partner can pause or resume the shared session
  const handlePausePress = () => {
    if (isActive) {
      onPause?.();
    } else {
      onResume?.();
    }
  };

  const handleExit = () => {
    startBellRef.current?.pauseAsync().catch(() => {});
    endBellRef.current?.pauseAsync().catch(() => {});
    onExit?.();
  };

  return (
    <LinearGradient colors={gradients.meditation} style={styles.meditatingContainer}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: screenFade }]}>
          {timeLeft > 0 && (
            <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
              <Text style={styles.exitText}>&#x2715;</Text>
            </TouchableOpacity>
          )}

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
              {sessionPaused && (
                <Text style={styles.pausedLabel}>Paused</Text>
              )}
              <TouchableOpacity style={styles.pauseButton} onPress={handlePausePress}>
                <Text style={styles.pauseText}>{isActive ? '| |' : '▶'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  meditatingContainer: {
    flex: 1,
  },
  safeArea: {
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
    bottom: 24,
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
  pausedLabel: {
    fontSize: 13,
    color: colors.textDark,
    opacity: 0.5,
    marginBottom: 4,
  },
  exitButton: {
    position: 'absolute',
    top: 16,
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
