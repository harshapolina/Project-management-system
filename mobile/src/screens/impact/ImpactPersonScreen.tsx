import { useMemo } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Sparkline } from '../../components/Sparkline'
import { Avatar } from '../../components/Avatar'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { impactApi } from '../../api/impact'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { timeAgo } from '../../utils/time'
import { CATEGORY_LABELS, roleLabel, signedPoints } from './impactMeta'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'ImpactPerson'>

export function ImpactPersonScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { userId, userName } = route.params

  const me = useAuthStore((s) => s.user)
  const canManage = ['admin', 'owner'].includes(me?.role || '')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['impact-user', userId],
    queryFn: () => impactApi.user(userId),
  })

  const chromeProps = {
    title: data?.user?.name || userName || 'Impact',
    subtitle: data?.user ? roleLabel(data.user.role) : 'Impact profile',
    subtitleIcon: 'trophy-outline' as const,
    right: canManage ? (
      <IconButton
        icon="add-circle-outline"
        label="Adjust points"
        tone="ghost"
        onPress={() => navigation.navigate('ImpactAdjust', { userId })}
      />
    ) : undefined,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading profile…" variant="detail" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const total = Number(data.score?.totalPoints) || 0

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        <SurfaceCard style={styles.hero}>
          <Avatar name={data.user.name} uri={data.user.avatar} size={54} />
          <Text style={styles.heroValue}>{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.meta}>total points</Text>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>
                {(Number(data.score?.weeklyPoints) || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.heroMetricLabel}>This week</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>
                {(Number(data.score?.monthlyPoints) || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.heroMetricLabel}>This month</Text>
            </View>
          </View>
        </SurfaceCard>

        <SectionLabel count={data.badges.filter((b) => b.earned).length}>Badges</SectionLabel>
        <SurfaceCard>
          {data.badges.map((b, idx) => (
            <View key={b.key} style={[styles.badgeRow, idx > 0 && styles.rowBorder]}>
              <Ionicons
                name={b.earned ? 'ribbon' : 'ribbon-outline'}
                size={18}
                color={b.earned ? colors.accentHover : colors.textMuted}
              />
              <Text style={[styles.rowLabel, !b.earned && { color: colors.textMuted }]}>{b.label}</Text>
            </View>
          ))}
        </SurfaceCard>

        <SectionLabel>30-day trend</SectionLabel>
        <SurfaceCard>
          <Sparkline data={data.trend} />
        </SurfaceCard>

        <SectionLabel count={data.breakdown.length}>By category</SectionLabel>
        <SurfaceCard>
          {data.breakdown.length ? (
            data.breakdown.map((row, idx) => (
              <View key={row.category} style={[styles.splitRow, idx > 0 && styles.rowBorder]}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {CATEGORY_LABELS[row.category] || row.category}
                </Text>
                <Text style={[styles.rowValue, row.points < 0 && { color: colors.danger }]}>
                  {signedPoints(row.points)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>No points scored yet.</Text>
          )}
        </SurfaceCard>

        <SectionLabel count={data.timeline.length}>Ledger</SectionLabel>
        <SurfaceCard>
          {data.timeline.length ? (
            data.timeline.slice(0, 40).map((t, idx) => (
              <View key={t._id} style={[styles.splitRow, idx > 0 && styles.rowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel} numberOfLines={2}>
                    {t.reason}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[t.awardedBy?.name, t.projectId?.name, timeAgo(t.createdAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Text style={[styles.rowValue, t.points < 0 && { color: colors.danger }]}>
                  {signedPoints(t.points)}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState title="Nothing scored yet" body="Awards will appear here as work is finished." />
          )}
        </SurfaceCard>
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    hero: { alignItems: 'center', gap: 4, paddingVertical: 22, backgroundColor: c.accentSoft },
    heroValue: { ...typography.h1, fontSize: 40, color: c.textPrimary, marginTop: spacing.sm },
    heroMetrics: {
      flexDirection: 'row',
      gap: spacing.xl,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    heroMetric: { alignItems: 'center', minWidth: 72 },
    heroMetricValue: { ...typography.h3, color: c.textPrimary },
    heroMetricLabel: { ...typography.micro, color: c.textSecondary },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11 },
    splitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 11,
    },
    rowLabel: { ...typography.body, color: c.textPrimary, flexShrink: 1 },
    rowValue: { ...typography.bodyStrong, color: c.accentHover },
    meta: { ...typography.caption, color: c.textSecondary },
  })
}
