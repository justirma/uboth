import { Animated, Easing, StyleSheet, Text, View, Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { colors, gradients, shadows, spacing, borderRadius } from '../theme';

export default function AuthScreen() {
  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAppleSignIn = async () => {
    try {
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = appleCredential;
      if (!identityToken) {
        throw new Error('No identity token received from Apple.');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({ idToken: identityToken });
      await signInWithCredential(auth, credential);
    } catch (error) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      console.error('Apple Sign-In error:', error.message);
      alert(error.message);
    }
  };

  const isAppleAvailable = Platform.OS === 'ios';

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.title}>uboth</Text>
        <Text style={styles.tagline}>Breathe together. Grow together.</Text>

        <View style={styles.form}>
          {isAppleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={50}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          ) : (
            <Text style={styles.unavailableText}>
              Apple Sign-In is only available on iOS devices.
            </Text>
          )}
        </View>
      </Animated.View>

      <StatusBar style="auto" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  inner: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 48,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 18,
    color: colors.textLight,
    marginBottom: spacing.xxl,
  },
  form: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  unavailableText: {
    color: colors.textLight,
    fontSize: 15,
    textAlign: 'center',
  },
});
