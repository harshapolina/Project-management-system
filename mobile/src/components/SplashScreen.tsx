import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { spacing, typography } from '../constants/theme'

/** Brand splash — deep green canvas matching Home hero. */
export const SPLASH_BG = '#004838'
const LIME = '#C5E966'
const WHITE = '#ffffff'

type SplashScreenProps = {
  /** Called once the intro animation has finished (after min duration). */
  onFinished?: () => void
  /** Minimum time on screen before dismissing (ms). */
  minDurationMs?: number
  /** When true, keep showing until parent flips this to false (then finish animation). */
  hold?: boolean
}

/**
 * Animated Cubic splash: cube mark + wordmark + soft pulse.
 * Used as the boot gate while auth/UI hydrate.
 */
export function SplashScreen({
  onFinished,
  minDurationMs = 2200,
  hold = false,
}: SplashScreenProps) {
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(), [])

  const markScale = useRef(new Animated.Value(0.55)).current
  const markOpacity = useRef(new Animated.Value(0)).current
  const markRotate = useRef(new Animated.Value(0)).current
  const wordOpacity = useRef(new Animated.Value(0)).current
  const wordY = useRef(new Animated.Value(14)).current
  const tagOpacity = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(0.35)).current
  const exitOpacity = useRef(new Animated.Value(1)).current

  const finishedRef = useRef(false)
  const readyAt = useRef(Date.now() + minDurationMs)

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(markScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(markRotate, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(wordOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wordY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
    ])

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )

    intro.start()
    pulseLoop.start()

    return () => {
      intro.stop()
      pulseLoop.stop()
    }
  }, [markOpacity, markRotate, markScale, pulse, tagOpacity, wordOpacity, wordY])

  useEffect(() => {
    if (hold) return
    if (finishedRef.current) return

    const remaining = Math.max(0, readyAt.current - Date.now())
    const timer = setTimeout(() => {
      finishedRef.current = true
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinished?.()
      })
    }, remaining)

    return () => clearTimeout(timer)
  }, [exitOpacity, hold, onFinished])

  const rotate = markRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '0deg'],
  })

  return (
    <Animated.View
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, opacity: exitOpacity }]}
      accessibilityLabel="Cubic"
      accessibilityRole="image"
    >
      <StatusBar style="light" />
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: pulse,
              transform: [{ scale: pulse.interpolate({ inputRange: [0.35, 1], outputRange: [0.92, 1.08] }) }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.markWrap,
            {
              opacity: markOpacity,
              transform: [{ scale: markScale }, { rotate }],
            },
          ]}
        >
          <View style={styles.cubeOuter}>
            <View style={styles.cubeFace} />
            <View style={styles.cubeAccent} />
            <View style={styles.cubeDot} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: wordOpacity, transform: [{ translateY: wordY }] }}>
          <Text style={styles.wordmark}>Cubic</Text>
        </Animated.View>

        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Project management for studios
        </Animated.Text>
      </View>
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
      justifyContent: 'center',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    glow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(197, 233, 102, 0.18)',
    },
    markWrap: {
      marginBottom: spacing.sm,
    },
    cubeOuter: {
      width: 72,
      height: 72,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    cubeFace: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: WHITE,
      transform: [{ rotate: '12deg' }],
    },
    cubeAccent: {
      position: 'absolute',
      right: 14,
      bottom: 14,
      width: 18,
      height: 18,
      borderRadius: 5,
      backgroundColor: LIME,
    },
    cubeDot: {
      position: 'absolute',
      top: 14,
      left: 14,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: LIME,
    },
    wordmark: {
      ...typography.h1,
      fontSize: 42,
      letterSpacing: -1.2,
      color: WHITE,
      fontWeight: '700',
      textAlign: 'center',
    },
    tagline: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.72)',
      textAlign: 'center',
      marginTop: 2,
    },
  })
}
