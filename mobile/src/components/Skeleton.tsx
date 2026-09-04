import { useEffect, useMemo, useRef } from 'react'
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { radius, spacing, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'
import { TAB_BAR_CLEARANCE } from './GlassyTabBar'

export type SkeletonVariant =
  | 'boot'
  | 'home'
  | 'list'
  | 'cards'
  | 'rows'
  | 'detail'
  | 'dashboard'
  | 'chat'
  | 'form'

type BoneProps = {
  width?: number | `${number}%`
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

/** Single pulsing bone — matches web `animate-pulse` surface-raised blocks. */
export function Bone({ width = '100%', height = 14, radius: r = radius.md, style }: BoneProps) {
  const colors = useColors()
  const opacity = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: r,
          backgroundColor: colors.active,
          opacity,
        },
        style,
      ]}
    />
  )
}

function CardShell({ children, colors }: { children: React.ReactNode; colors: AppColors }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      {children}
    </View>
  )
}

function SkeletonHome() {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, paddingBottom: TAB_BAR_CLEARANCE, gap: 14 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone width={28} height={22} />
        <Bone width={72} height={20} />
        <Bone width={28} height={22} />
      </View>
      <Bone width="78%" height={30} radius={radius.sm} />
      <Bone width={160} height={34} radius={999} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Bone width={110} height={10} />
        <Bone width={80} height={10} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 10,
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Bone width={28} height={28} radius={radius.md} />
            <Bone width="70%" height={9} />
            <Bone width="80%" height={11} />
          </View>
        ))}
      </View>
      <Bone width={100} height={10} style={{ marginTop: 6 }} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Bone width={96} height={22} radius={radius.full} />
          <Bone width={52} height={52} radius={radius.lg} />
        </View>
        <Bone width="85%" height={18} />
        <Bone width="55%" height={12} />
        <Bone width="100%" height={8} radius={radius.full} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Bone width={120} height={12} />
          <Bone width={36} height={36} radius={radius.md} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Bone width={160} height={10} />
        <Bone width={56} height={10} />
      </View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          gap: 12,
        }}
      >
        <Bone width="100%" height={48} />
        <Bone width="100%" height={48} />
        <Bone width="100%" height={48} />
      </View>
      <Bone width={110} height={10} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 12,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Bone width={36} height={36} radius={radius.md} />
            <Bone width="90%" height={10} />
          </View>
        ))}
      </View>
    </View>
  )
}

function SkeletonCards({ count = 4 }: { count?: number }) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, gap: spacing.md, paddingBottom: TAB_BAR_CLEARANCE }]}>
      {Array.from({ length: count }).map((_, i) => (
        <CardShell key={i} colors={colors}>
          <Bone width="100%" height={72} radius={radius.md} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Bone width="60%" height={16} />
            <Bone width={56} height={20} radius={radius.full} />
          </View>
          <Bone width="45%" height={12} />
          <Bone width="100%" height={6} radius={radius.full} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Bone width={22} height={22} radius={999} />
            <Bone width={22} height={22} radius={999} />
            <Bone width={22} height={22} radius={999} />
          </View>
        </CardShell>
      ))}
    </View>
  )
}

function SkeletonList({ count = 7 }: { count?: number }) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, gap: spacing.sm, paddingBottom: TAB_BAR_CLEARANCE }]}>
      {Array.from({ length: count }).map((_, i) => (
        <CardShell key={i} colors={colors}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Bone width={i % 3 === 0 ? '70%' : '55%'} height={15} />
            <Bone width={64} height={20} radius={radius.full} />
          </View>
          <Bone width="85%" height={12} />
          <Bone width="40%" height={11} />
        </CardShell>
      ))}
    </View>
  )
}

function SkeletonRows({ count = 8 }: { count?: number }) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, paddingBottom: TAB_BAR_CLEARANCE }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          }}
        >
          <Bone width={40} height={40} radius={999} />
          <View style={{ flex: 1, gap: 6 }}>
            <Bone width={i % 2 ? '65%' : '80%'} height={14} />
            <Bone width="45%" height={11} />
          </View>
          <Bone width={16} height={16} radius={4} />
        </View>
      ))}
    </View>
  )
}

function SkeletonDetail() {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, gap: spacing.md }]}>
      <CardShell colors={colors}>
        <Bone width="80%" height={22} />
        <Bone width="50%" height={12} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Bone width={72} height={22} radius={radius.full} />
          <Bone width={64} height={22} radius={radius.full} />
        </View>
      </CardShell>
      <CardShell colors={colors}>
        <Bone width={100} height={10} />
        <Bone width="100%" height={12} />
        <Bone width="92%" height={12} />
        <Bone width="70%" height={12} />
      </CardShell>
      <CardShell colors={colors}>
        <Bone width={120} height={10} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} width={88} height={32} radius={radius.full} />
          ))}
        </View>
      </CardShell>
      <CardShell colors={colors}>
        <Bone width={90} height={10} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <Bone width={32} height={32} radius={999} />
            <View style={{ flex: 1, gap: 6 }}>
              <Bone width="50%" height={12} />
              <Bone width="90%" height={11} />
            </View>
          </View>
        ))}
      </CardShell>
    </View>
  )
}

function SkeletonDashboard() {
  const colors = useColors()
  const { pagePadding, statsColumns } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, gap: spacing.md, paddingBottom: TAB_BAR_CLEARANCE }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={{
              flexGrow: 1,
              flexBasis: statsColumns === 1 ? '100%' : '46%',
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              gap: 8,
            }}
          >
            <Bone width={48} height={22} />
            <Bone width="70%" height={11} />
          </View>
        ))}
      </View>
      <CardShell colors={colors}>
        <Bone width={110} height={10} />
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Bone width="45%" height={12} />
            <Bone width={56} height={12} />
          </View>
        ))}
      </CardShell>
      <CardShell colors={colors}>
        <Bone width={130} height={10} />
        <Bone width="100%" height={120} radius={radius.md} />
      </CardShell>
    </View>
  )
}

function SkeletonChat() {
  const { pagePadding } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, flex: 1, justifyContent: 'flex-end', gap: spacing.sm }]}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const mine = i % 2 === 1
        return (
          <View key={i} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
            <Bone width={mine ? '68%' : '74%'} height={44} radius={radius.lg} />
          </View>
        )
      })}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
        <Bone width="100%" height={48} radius={radius.md} style={{ flex: 1 }} />
        <Bone width={48} height={48} radius={radius.md} />
      </View>
    </View>
  )
}

function SkeletonForm() {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  return (
    <View style={[styles.pad, { paddingHorizontal: pagePadding, gap: spacing.lg }]}>
      <CardShell colors={colors}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ gap: 6, marginBottom: spacing.sm }}>
            <Bone width={90} height={11} />
            <Bone width="100%" height={48} radius={radius.md} />
          </View>
        ))}
        <Bone width="100%" height={50} radius={radius.md} />
      </CardShell>
    </View>
  )
}

function SkeletonBoot() {
  const colors = useColors()
  return (
    <View style={[styles.boot, { backgroundColor: colors.canvas }]}>
      <Bone width={64} height={64} radius={20} />
      <Bone width={120} height={18} style={{ marginTop: spacing.lg }} />
      <Bone width={160} height={12} style={{ marginTop: spacing.sm }} />
    </View>
  )
}

/** Full-screen / content-area skeleton matching common Cubic layouts. */
export function SkeletonScreen({ variant = 'list' }: { variant?: SkeletonVariant }) {
  const body = useMemo(() => {
    switch (variant) {
      case 'boot':
        return <SkeletonBoot />
      case 'home':
        return <SkeletonHome />
      case 'cards':
        return <SkeletonCards />
      case 'rows':
        return <SkeletonRows />
      case 'detail':
        return <SkeletonDetail />
      case 'dashboard':
        return <SkeletonDashboard />
      case 'chat':
        return <SkeletonChat />
      case 'form':
        return <SkeletonForm />
      case 'list':
      default:
        return <SkeletonList />
    }
  }, [variant])

  return <View style={styles.fill}>{body}</View>
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { flex: 1, paddingTop: spacing.sm },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
})
