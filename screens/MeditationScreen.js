import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, spacing, borderRadius } from '../theme';

// Runtime-detect expo-audio and provide a safe fallback/stub so the app
// doesn't crash if the package shape differs in the user's environment.
let createAudioPlayer;
try {
  const expoAudio = require('expo-audio');
  if (expoAudio && typeof expoAudio.createAudioPlayer === 'function') {
    createAudioPlayer = expoAudio.createAudioPlayer;
  } else if (expoAudio && typeof expoAudio.default === 'function') {
    createAudioPlayer = expoAudio.default;
  } else {
    console.warn('expo-audio player factory not found — using stubbed player.');
    createAudioPlayer = (src) => ({
      play: async () => {},
      pause: async () => {},
      seekTo: (ms) => {},
      remove: async () => {},
    });
  }
} catch (e) {
  console.warn('Failed to require expo-audio; using fallback stub.', e);
  createAudioPlayer = (src) => ({
    play: async () => {},
    pause: async () => {},
    seekTo: (ms) => {},
    remove: async () => {},
  });
}

const startBellSource = require('../assets/bell-start.mp3');
const endBellSource = require('../assets/bell-end.mp3');

export default function MeditationScreen({ prompt, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(300);
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(null); // null, 5, 4, 3, 2, 1

  const startBellRef = useRef(null);
  const endBellRef = useRef(null);

  // Animation refs
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const countdownFade = useRef(new Animated.Value(0)).current;

  // Create audio players on mount
  useEffect(() => {
    try {
      startBellRef.current = createAudioPlayer(startBellSource);
      endBellRef.current = createAudioPlayer(endBellSource);
    } catch (e) {
      console.warn('Failed to load bell sounds', e);
    }

    return () => {
      try { startBellRef.current?.remove(); } catch (e) {}
      try { endBellRef.current?.remove(); } catch (e) {}
      startBellRef.current = null;
      endBellRef.current = null;
    };
  }, []);

  // Breathing circle animation — loops during active meditation
  useEffect(() => {
    if (isActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 0.8,
            duration: 2000,
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

  // Countdown fade-in animation — triggers each time the countdown number changes
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownFade.setValue(0);
      Animated.timing(countdownFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [countdown]);

  // Countdown before meditation starts
  useEffect(() => {
    if (countdown === null || countdown === 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        // Countdown finished - play bell and start meditation
        try {
          if (startBellRef.current) {
            startBellRef.current.seekTo(0);
            startBellRef.current.play();
          }
        } catch (e) {}
        setCountdown(null);
        setIsActive(true);
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

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

  const handleStart = () => {
    try {
      startBellRef.current?.seekTo(0);
      endBellRef.current?.seekTo(0);
    } catch (e) {}
    setCountdown(5); // Start 5 second countdown
  };

  const handleComplete = () => {
    onComplete();
  };

  // Start screen
  if (countdown === null && !isActive && timeLeft === 300) {
    return (
      <View style={styles.container}>
        <Text style={styles.prompt}>{prompt}</Text>
        <Text style={styles.duration}>5 minutes</Text>

        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Countdown screen
  if (countdown !== null && countdown > 0) {
    return (
      <LinearGradient colors={gradients.meditation} style={styles.meditatingContainer}>
        <Text style={styles.countdownText}>Starting in</Text>
        <Animated.Text style={[styles.countdown, { opacity: countdownFade }]}>
          {countdown}
        </Animated.Text>
      </LinearGradient>
    );
  }

  // Meditation in progress
  return (
    <LinearGradient colors={gradients.meditation} style={styles.meditatingContainer}>
      <TouchableOpacity
        style={styles.exitButton}
        onPress={() => {
          setIsActive(false);
          setTimeLeft(300);
          setCountdown(null);
          try { startBellRef.current?.pause(); startBellRef.current?.seekTo(0); } catch (e) {}
          try { endBellRef.current?.pause(); endBellRef.current?.seekTo(0); } catch (e) {}
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
        <TouchableOpacity style={styles.doneButton} onPress={handleComplete}>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  meditatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  prompt: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 32,
  },
  duration: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: 48,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: 18,
    paddingHorizontal: 64,
  },
  startButtonText: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 20,
    color: colors.textDark,
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  countdown: {
    fontSize: 96,
    fontWeight: '700',
    color: colors.textDark,
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
