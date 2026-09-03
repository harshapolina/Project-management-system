import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { spacing, typography } from '../constants/theme'

/** Brand splash — deep green canvas matching Home hero. */
export const SPLASH_BG = '#004838'
const SPLASH_BG_2 = '#0a5c48'
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

/** One small drifting spark — the "sparkle" accents around the mark. */
function Spark({ delay, size, color, x, y, drift }: { delay: number; size: number; color: string; x: number; y: number; drift: number }) {
  const p = useSharedValue(0)

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.sin) })), -1, false),
    )
  }, [delay, p])

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.5, 1], [0, 1, 0]),
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, -drift]) }, { scale: interpolate(p.value, [0, 0.5, 1], [0.6, 1, 0.6]) }],
  }))

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  )
}

/**
 * Animated Cubic splash: gradient canvas, drifting glow, cube mark reveal
 * with a shimmer sweep, wordmark + tagline. Used as the boot gate while
 * auth/UI hydrate.
 */
export function SplashScreen({ onFinished, minDurationMs = 2400, hold = false }: SplashScreenProps) {
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(), [])

  const markScale = useSharedValue(0.4)
  const markOpacity = useSharedValue(0)
  const markRotate = useSharedValue(-24)
  const shimmer = useSharedValue(-1)
  const wordOpacity = useSharedValue(0)
  const wordY = useSharedValue(16)
  const tagOpacity = useSharedValue(0)
  const glowA = useSharedValue(0.3)
  const glowB = useSharedValue(0.5)
  const drift = useSharedValue(0)
  const exit = useSharedValue(0)

  const finishedRef = useRef(false)
  const readyAt = useRef(Date.now() + minDurationMs)

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
    markScale.value = withSequence(
      withTiming(1.08, { duration: 560, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
    )
    markRotate.value = withTiming(0, { duration: 720, easing: Easing.out(Easing.cubic) })
    shimmer.value = withDelay(420, withTiming(1.4, { duration: 620, easing: Easing.out(Easing.cubic) }))

    wordOpacity.value = withDelay(460, withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }))
    wordY.value = withDelay(460, withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }))
    tagOpacity.value = withDelay(760, withTiming(1, { duration: 380 }))

    glowA.value = withRepeat(withSequence(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) })), -1, false)
    glowB.value = withRepeat(withSequence(withTiming(0.9, { duration: 1900, easing: Easing.inOut(Easing.sin) }), withTiming(0.4, { duration: 1900, easing: Easing.inOut(Easing.sin) })), -1, false)
    drift.value = withRepeat(withSequence(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.sin) })), -1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (hold) return
    if (finishedRef.current) return

    const remaining = Math.max(0, readyAt.current - Date.now())
    const timer = setTimeout(() => {
      finishedRef.current = true
      exit.value = withTiming(1, { duration: 340, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished && onFinished) runOnJS(onFinished)()
      })
    }, remaining)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold])

  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: interpolate(exit.value, [0, 1], [1, 0.97]) }],
  }))

  const glowStyleA = useAnimatedStyle(() => ({
    opacity: glowA.value,
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-18, 18]) },
      { translateY: interpolate(drift.value, [0, 1], [-10, 10]) },
      { scale: interpolate(glowA.value, [0.3, 1], [0.9, 1.12]) },
    ],
  }))

  const glowStyleB = useAnimatedStyle(() => ({
    opacity: glowB.value,
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [16, -16]) },
      { translateY: interpolate(drift.value, [0, 1], [12, -12]) },
      { scale: interpolate(glowB.value, [0.4, 0.9], [0.95, 1.1]) },
    ],
  }))

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }, { rotate: `${markRotate.value}deg` }],
  }))

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [-1, 1.4], [-90, 90]) }, { rotate: '20deg' }],
    opacity: interpolate(shimmer.value, [-1, 0, 1.4], [0, 0.9, 0]),
  }))

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }))

  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }))

  return (
    <Animated.View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }, rootStyle]} accessibilityLabel="Cubic" accessibilityRole="image">
      <StatusBar style="light" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BG }]} />
      <View style={styles.diagonalTint} />

      <Animated.View style={[styles.glow, styles.glowA, glowStyleA]} />
      <Animated.View style={[styles.glow, styles.glowB, glowStyleB]} />

      <View style={styles.center}>
        <View style={styles.sparkField}>
          <Spark delay={200} size={7} color={LIME} x={-58} y={-6} drift={26} />
          <Spark delay={700} size={5} color="rgba(255,255,255,0.85)" x={54} y={14} drift={20} />
          <Spark delay={1100} size={6} color={LIME} x={40} y={-46} drift={22} />
          <Spark delay={450} size={4} color="rgba(255,255,255,0.7)" x={-42} y={44} drift={18} />
        </View>

        <Animated.View style={[styles.markWrap, markStyle]}>
          <View style={styles.cubeOuter}>
            <View style={styles.cubeFace} />
            <View style={styles.cubeAccent} />
            <View style={styles.cubeDot} />
            <Animated.View pointerEvents="none" style={[styles.shimmer, shimmerStyle]} />
          </View>
        </Animated.View>

        <Animated.View style={wordStyle}>
          <Text style={styles.wordmark}>Cubic</Text>
        </Animated.View>

        <Animated.Text style={[styles.tagline, tagStyle]}>Project management for studios</Animated.Text>
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
      overflow: 'hidden',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    /** Fakes a soft diagonal gradient with a single rotated tinted panel —
     * avoids a native gradient dependency, which isn't guaranteed to be
     * compiled into every Expo Go build. */
    diagonalTint: {
      position: 'absolute',
      top: '-20%',
      left: '-30%',
      width: '160%',
      height: '90%',
      backgroundColor: SPLASH_BG_2,
      opacity: 0.55,
      transform: [{ rotate: '-8deg' }],
    },
    sparkField: {
      position: 'absolute',
      width: 1,
      height: 1,
      alignItems: 'center',
      justifyContent: 'center',
      top: '38%',
    },
    glow: {
      position: 'absolute',
      borderRadius: 999,
    },
    glowA: {
      width: 220,
      height: 220,
      backgroundColor: 'rgba(197, 233, 102, 0.16)',
    },
    glowB: {
      width: 160,
      height: 160,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    markWrap: {
      marginBottom: spacing.sm,
    },
    cubeOuter: {
      width: 76,
      height: 76,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.28)',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    cubeFace: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: WHITE,
      transform: [{ rotate: '12deg' }],
    },
    cubeAccent: {
      position: 'absolute',
      right: 15,
      bottom: 15,
      width: 19,
      height: 19,
      borderRadius: 5,
      backgroundColor: LIME,
    },
    cubeDot: {
      position: 'absolute',
      top: 15,
      left: 15,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: LIME,
    },
    shimmer: {
      position: 'absolute',
      top: -20,
      width: 26,
      height: 130,
      backgroundColor: 'rgba(255,255,255,0.55)',
    },
    wordmark: {
      ...typography.h1,
      fontSize: 44,
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
