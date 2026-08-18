import { useLayoutEffect } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser, ROLE_LABELS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectOverview'>

function money(n?: number) {
  if (!n) return '₹0'
  return `₹${n.toLocaleString('en-IN')}`
}

export function ProjectOverviewScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  })

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName || data?.project.name || 'Project' })
  }, [navigation, projectName, data])

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading project…" />
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

  const { project, stats } = data
  type TabKey = 'ProjectTasks' | 'ProjectFiles' | 'ProjectNotes' | 'SiteFeed' | 'PurchaseOrders' | 'ProjectTeam'
  type TabIcon = 'checkbox-outline' | 'folder-outline' | 'chatbubble-ellipses-outline' | 'camera-outline' | 'cart-outline' | 'people-outline'
  const tabs: { key: TabKey; label: string; icon: TabIcon }[] = [
    { key: 'ProjectTasks', label: 'Tasks', icon: 'checkbox-outline' },
    { key: 'ProjectFiles', label: 'Files', icon: 'folder-outline' },
    { key: 'ProjectNotes', label: 'Notes', icon: 'chatbubble-ellipses-outline' },
    ...(caps.siteFeed ? [{ key: 'SiteFeed' as const, label: 'Site', icon: 'camera-outline' as const }] : []),
    ...(caps.procurement ? [{ key: 'PurchaseOrders' as const, label: 'Orders', icon: 'cart-outline' as const }] : []),
    ...(caps.manageProjects ? [{ key: 'ProjectTeam' as const, label: 'Team', icon: 'people-outline' as const }] : []),
  ]

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={2}>
              {project.name}
            </Text>
            <Pill label={project.currentStage || ''} bg={colors.accentSoft} color={colors.accent} />
          </View>
          <Text style={styles.client}>
            {project.clientName}
            {project.location ? ` · ${project.location}` : ''}
          </Text>
          {project.description ? <Text style={styles.description}>{project.description}</Text> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((t) => (
            <Pressable
              key={t.key}
              style={styles.tabButton}
              onPress={() => navigation.navigate(t.key, { projectId, projectName: project.name })}
              accessibilityRole="button"
            >
              <Ionicons name={t.icon} size={20} color={colors.accent} />
              <Text style={styles.tabLabel}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.openTasks}</Text>
            <Text style={styles.statLabel}>Open tasks</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingApprovals}</Text>
            <Text style={styles.statLabel}>Pending approvals</Text>
          </Card>
        </View>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.cardTitle}>Budget</Text>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetText}>{money(stats.budgetVsSpent.spent)} spent</Text>
            <Text style={styles.budgetTextMuted}>of {money(stats.budgetVsSpent.budget)}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, stats.budgetVsSpent.pct)}%` },
                stats.budgetVsSpent.pct > 90 && { backgroundColor: colors.danger },
              ]}
            />
          </View>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Text style={styles.cardTitle}>Stages</Text>
          {(project.stages || []).map((s) => (
            <View key={s.key} style={styles.stageRow}>
              <View
                style={[
                  styles.stageDot,
                  s.status === 'completed' && { backgroundColor: colors.success },
                  s.status === 'in_progress' && { backgroundColor: colors.accent },
                ]}
              />
              <Text style={styles.stageLabel} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={styles.stageProgress}>{s.progress}%</Text>
            </View>
          ))}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.cardTitle}>Team</Text>
          {(project.members || []).slice(0, 6).map((m) => (
            <View key={m.user._id} style={styles.memberRow}>
              <Avatar name={m.user.name} uri={m.user.avatar} size={30} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.user.name}
                </Text>
                <Text style={styles.memberRole} numberOfLines={1}>
                  {ROLE_LABELS[(m.role || m.user.role) as Role] || m.role || m.user.role}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  headerCard: { gap: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { ...typography.h2, color: colors.textPrimary, flex: 1 },
  client: { ...typography.body, color: colors.textSecondary },
  description: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  tabRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  tabButton: {
    width: 84,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  tabLabel: { ...typography.caption, color: colors.textPrimary },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...typography.h2, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  cardTitle: { ...typography.captionStrong, color: colors.textMuted, textTransform: 'uppercase' },
  budgetRow: { flexDirection: 'row', gap: 6, alignItems: 'baseline' },
  budgetText: { ...typography.bodyStrong, color: colors.textPrimary },
  budgetTextMuted: { ...typography.caption, color: colors.textSecondary },
  progressTrack: { height: 8, borderRadius: radius.full, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stageDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderLight },
  stageLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  stageProgress: { ...typography.caption, color: colors.textSecondary },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { ...typography.bodyStrong, color: colors.textPrimary },
  memberRole: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
})
