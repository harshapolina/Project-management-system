import type { ReactNode } from 'react'
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { heroFor, typography, type ThemeMode } from '../../../constants/theme'

type HeroSectionProps = {
  mode?: ThemeMode
  userName?: string
  heroStat: number
  overdueCount: number
  greeting: string
  onMyTasks: () => void
  onPostUpdate: () => void
  postUpdateLabel: string
  postUpdateIcon: keyof typeof Ionicons.glyphMap
  style?: StyleProp<ViewStyle>
  onLayout?: (height: number) => void
  opacity?: Animated.AnimatedInterpolation<number>
  scale?: Animated.AnimatedInterpolation<number>
  children?: ReactNode
}

export function HeroSection({
  mode = 'light',
  userName,
  heroStat,
  overdueCount,
  greeting,
  onMyTasks,
  onPostUpdate,
  postUpdateLabel,
  postUpdateIcon,
  style,
  onLayout,
  opacity,
  scale,
  children,
}: HeroSectionProps) {
  const HERO = heroFor(mode)
  const styles = createStyles(HERO)

  const content = (
    <>
      <Text style={styles.heroHelloLine}>
        Hello, <Text style={styles.heroHelloName}>{userName || 'there'}</Text>
      </Text>
      <View style={styles.heroStatBlock}>
        <Text style={styles.heroStatLabel}>Your work today</Text>
        <Text style={styles.heroStatValue}>
          {heroStat}
          <Text style={styles.heroStatUnit}> open</Text>
        </Text>
        <Text style={styles.heroStatHint}>
          {greeting}
          {overdueCount > 0 ? ` · ${overdueCount} overdue` : ' · looking good'}
        </Text>
      </View>
      <View style={styles.heroCtas}>
        <Pressable
          style={({ pressed }) => [styles.heroCta, pressed && styles.heroCtaPressed]}
          onPress={onMyTasks}
          accessibilityRole="button"
          accessibilityLabel="My tasks"
        >
          <Ionicons name="checkmark-done-outline" size={18} color={HERO.limeText} />
          <Text style={styles.heroCtaText}>My tasks</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.heroCta, pressed && styles.heroCtaPressed]}
          onPress={onPostUpdate}
          accessibilityRole="button"
          accessibilityLabel={postUpdateLabel}
        >
          <Ionicons name={postUpdateIcon} size={18} color={HERO.limeText} />
          <Text style={styles.heroCtaText}>{postUpdateLabel}</Text>
        </Pressable>
      </View>
      {children}
    </>
  )

  if (opacity != null || scale != null) {
    return (
      <Animated.View
        style={[styles.heroInner, style, opacity != null && { opacity }, scale != null && { transform: [{ scale }] }]}
        onLayout={(e) => onLayout?.(Math.ceil(e.nativeEvent.layout.height))}
      >
        {content}
      </Animated.View>
    )
  }

  return (
    <View style={[styles.heroInner, style]} onLayout={(e) => onLayout?.(Math.ceil(e.nativeEvent.layout.height))}>
      {content}
    </View>
  )
}

function createStyles(HERO: ReturnType<typeof heroFor>) {
  return StyleSheet.create({
    heroInner: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
    heroHelloLine: { ...typography.h1, color: HERO.text, fontSize: 28 },
    heroHelloName: { color: HERO.lime },
    heroStatBlock: { marginTop: 20 },
    heroStatLabel: { ...typography.caption, color: HERO.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    heroStatValue: { ...typography.h1, color: HERO.text, marginTop: 4 },
    heroStatUnit: { ...typography.body, color: HERO.textMuted },
    heroStatHint: { ...typography.caption, color: HERO.textMuted, marginTop: 6 },
    heroCtas: { flexDirection: 'row', gap: 10, marginTop: 20 },
    heroCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: HERO.lime,
    },
    heroCtaPressed: { opacity: 0.88 },
    heroCtaText: { ...typography.captionStrong, color: HERO.limeText },
  })
}
