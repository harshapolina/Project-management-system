import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AuthHero } from './AuthHero'
import { heroLight, spacing, typography } from '../constants/theme'

/** Soft light canvas — Momento-style welcome, Cubic emerald accents. */
export const SPLASH_BG = '#f7fbf9'
const INK = heroLight.bg
const MUTED = '#5c6b66'
const nativeDriver = Platform.OS !== 'web'
const appleOut = Easing.bezier(0.22, 1, 0.36, 1)

type SplashScreenProps = {
  onFinished?: () => void
  /** Minimum time on screen before dismissing (ms). */
  minDurationMs?: number
  /** When true, keep showing until parent flips this to false (then finish animation). */
  hold?: boolean
}

/**
 * Animated Cubic splash: welcome type, then the flying project beam.
 * Uses RN Animated (not Reanimated) so the motion actually runs on Expo web.
 */
export function SplashScreen({ onFinished, minDurationMs = 4200, hold = false }: SplashScreenProps) {
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(), [])

  const headerOpacity = useRef(new Animated.Value(0)).current
  const headerY = useRef(new Animated.Value(18)).current
  const heroOpacity = useRef(new Animated.Value(0)).current
  const heroScale = useRef(new Animated.Value(0.94)).current
  const exit = useRef(new Animated.Value(0)).current

  const finishedRef = useRef(false)
  const readyAt = useRef(Date.now() + minDurationMs)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 520,
        easing: appleOut,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(headerY, {
        toValue: 0,
        duration: 520,
        easing: appleOut,
        useNativeDriver: nativeDriver,
      }),
    ]).start()

    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 640,
        delay: 180,
        easing: appleOut,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(heroScale, {
        toValue: 1,
        duration: 720,
        delay: 180,
        easing: appleOut,
        useNativeDriver: nativeDriver,
      }),
    ]).start()
  }, [headerOpacity, headerY, heroOpacity, heroScale])

  useEffect(() => {
    if (hold) return
    if (finishedRef.current) return

    const remaining = Math.max(0, readyAt.current - Date.now())
    const timer = setTimeout(() => {
      finishedRef.current = true
      Animated.timing(exit, {
        toValue: 1,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: nativeDriver,
      }).start(({ finished }) => {
        if (finished) onFinished?.()
      })
    }, remaining)

    return () => clearTimeout(timer)
  }, [hold, exit, onFinished])

  return (
    <Animated.View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom },
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }],
        },
      ]}
      accessibilityLabel="Cubic"
      accessibilityRole="image"
    >
      <StatusBar style="dark" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BG }]} />
      <View style={styles.ambient} />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerY }],
          },
        ]}
      >
        <Text style={styles.welcome}>Welcome to</Text>
        <Text style={styles.wordmark}>Cubic</Text>
        <Text style={styles.tagline}>
          All your projects, people,{'\n'}and progress — in one place.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.hero,
          {
            opacity: heroOpacity,
            transform: [{ scale: heroScale }],
          },
        ]}
      >
        <AuthHero size="lg" animated />
      </Animated.View>
    </Animated.View>
  )
}

function createStyles() {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFill,
      backgroundColor: SPLASH_BG,
      zIndex: 100,
      alignItems: 'center',
      overflow: 'hidden',
    },
    ambient: {
      position: 'absolute',
      top: '22%',
      alignSelf: 'center',
      width: 340,
      height: 340,
      borderRadius: 999,
      backgroundColor: 'rgba(62, 207, 142, 0.1)',
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      width: '100%',
      marginTop: spacing.lg,
    },
    welcome: {
      ...typography.body,
      color: MUTED,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
    },
    wordmark: {
      ...typography.h1,
      fontSize: 42,
      lineHeight: 48,
      letterSpacing: -1,
      color: INK,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 4,
    },
    tagline: {
      ...typography.body,
      color: MUTED,
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 22,
      marginTop: 10,
    },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
}
