import { useRef, useState } from 'react'
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { radius, spacing, typography } from '../constants/theme'
import { useIntroStore } from '../store/introStore'

const BG = '#004838'
const BG_2 = '#0a5c48'
const LIME = '#C5E966'
const { width: SCREEN_W } = Dimensions.get('window')

type Slide = {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    icon: 'checkmark-done-circle',
    title: 'Plan every project',
    body: 'Tasks, boards, and priorities that stay in sync across every space in your studio.',
  },
  {
    icon: 'calculator',
    title: 'Quote with confidence',
    body: 'Turn measurements into a BOQ and a client-ready quotation in a few taps.',
  },
  {
    icon: 'camera',
    title: 'Track site progress',
    body: 'Photos, snags, and daily updates straight from the field — no back-and-forth.',
  },
  {
    icon: 'chatbubbles',
    title: 'Stay in sync',
    body: 'Comments, @mentions, and notifications that reach the right person instantly.',
  },
]

export function IntroTourScreen({ onDone }: { onDone?: () => void }) {
  const insets = useSafeAreaInsets()
  const setHasSeenIntro = useIntroStore((s) => s.setHasSeenIntro)
  const [index, setIndex] = useState(0)
  const scrollX = useSharedValue(0)
  const scrollRef = useRef<Animated.ScrollView>(null)

  const finish = () => {
    setHasSeenIntro(true)
    onDone?.()
  }

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x
  })

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true })
    setIndex(i)
  }

  const isLast = index === SLIDES.length - 1

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.diagonalTint} />

      {!isLast && (
        <Pressable
          onPress={finish}
          hitSlop={12}
          style={[styles.skip, { top: insets.top + spacing.md }]}
          accessibilityRole="button"
          accessibilityLabel="Skip tour"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <SlidePane key={slide.title} slide={slide} index={i} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        <Pressable
          onPress={() => (isLast ? finish() : goTo(index + 1))}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get started' : 'Next'}
        >
          <Text style={styles.ctaText}>{isLast ? 'Get started' : 'Next'}</Text>
          <Ionicons name={isLast ? 'arrow-forward' : 'chevron-forward'} size={18} color={BG} />
        </Pressable>
      </View>
    </View>
  )
}

function SlidePane({ slide, index, scrollX }: { slide: Slide; index: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W]
    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], 'clamp'),
      transform: [
        { scale: interpolate(scrollX.value, input, [0.88, 1, 0.88], 'clamp') },
        { translateY: interpolate(scrollX.value, input, [18, 0, 18], 'clamp') },
      ],
    }
  })

  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      <Animated.View style={[styles.iconRing, style]}>
        <View style={styles.iconRingInner}>
          <Ionicons name={slide.icon} size={44} color={LIME} />
        </View>
      </Animated.View>
      <Animated.View style={style}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  )
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W]
    return {
      width: interpolate(scrollX.value, input, [7, 22, 7], 'clamp'),
      opacity: interpolate(scrollX.value, input, [0.35, 1, 0.35], 'clamp'),
    }
  })
  return <Animated.View style={[styles.dot, style]} />
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  diagonalTint: {
    position: 'absolute',
    top: '-15%',
    left: '-30%',
    width: '160%',
    height: '70%',
    backgroundColor: BG_2,
    opacity: 0.5,
    transform: [{ rotate: '-6deg' }],
  },
  skip: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.bodyStrong,
    color: 'rgba(255,255,255,0.78)',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  iconRingInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(197, 233, 102, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 26,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    fontSize: 15.5,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    height: 7,
    borderRadius: 4,
    backgroundColor: LIME,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: '#ffffff',
  },
  ctaText: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: BG,
  },
})
