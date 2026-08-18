import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { impactApi } from '../../api/impact'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'

export function ImpactScreen() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['impact-me'],
    queryFn: impactApi.me,
    enabled: caps.impact,
  })

  if (!caps.impact) {
    return (
      <Screen>
        <EmptyState title="Impact Points" body="This isn’t enabled for your role yet." />
      </Screen>
    )
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your score…" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <PageHeader title="Impact" subtitle="Points earned for finishing work well." />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreEyebrow}>Your score</Text>
          <Text style={styles.scoreValue}>{data.score?.totalPoints ?? 0}</Text>
          <Text style={styles.scoreLabel}>total points</Text>
        </Card>

        <View>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgeGrid}>
            {data.badges.map((b) => (
              <View key={b.key} style={[styles.badge, !b.earned && styles.badgeLocked]}>
                <Text style={[styles.badgeLabel, !b.earned && styles.badgeLabelLocked]} numberOfLines={2}>
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>By category</Text>
          {data.breakdown.length === 0 ? (
            <Text style={styles.muted}>No points scored yet.</Text>
          ) : (
            data.breakdown.map((row) => (
              <View key={row.category} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel} numberOfLines={1}>
                  {row.category}
                </Text>
                <Text style={styles.breakdownValue}>{row.points} pts</Text>
              </View>
            ))
          )}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Recent</Text>
          {data.timeline.length === 0 ? (
            <Text style={styles.muted}>Nothing scored recently.</Text>
          ) : (
            data.timeline.slice(0, 15).map((t) => (
              <View key={t._id} style={styles.timelineRow}>
                <Text style={styles.timelineReason} numberOfLines={2}>
                  {t.reason}
                </Text>
                <Text style={styles.timelinePoints}>+{t.points}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },
  scoreCard: { alignItems: 'center', gap: 4, paddingVertical: 28, backgroundColor: colors.accentSoft, borderColor: '#DBEAFE' },
  scoreEyebrow: { ...typography.micro, color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.8 },
  scoreValue: { ...typography.h1, fontSize: 48, color: colors.textPrimary },
  scoreLabel: { ...typography.caption, color: colors.textSecondary },
  sectionTitle: { ...typography.captionStrong, color: colors.textMuted, marginBottom: spacing.sm },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '48%',
  },
  badgeLocked: { opacity: 0.45 },
  badgeLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  badgeLabelLocked: { color: colors.textMuted },
  muted: { ...typography.caption, color: colors.textMuted },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  breakdownLabel: { ...typography.body, color: colors.textPrimary, textTransform: 'capitalize', flex: 1 },
  breakdownValue: { ...typography.bodyStrong, color: colors.accent },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timelineReason: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  timelinePoints: { ...typography.captionStrong, color: colors.success },
})
