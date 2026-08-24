import { useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors, useShadows } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser, ROLE_LABELS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList, RootTabParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectOverview'>
type Nav = CompositeNavigationProp<Props['navigation'], BottomTabNavigationProp<RootTabParamList>>

function money(n?: number) {
  if (!n) return '₹0'
  return `₹${n.toLocaleString('en-IN')}`
}

export function ProjectOverviewScreen({ route, navigation }: Props) {
  const colors = useColors()
  const shadows = useShadows()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])
  const tabNav = navigation as unknown as Nav

  const { projectId, projectName } = route.params
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  })

  const title = projectName || data?.project.name || 'Project'
  const subtitle = data?.project
    ? `${data.project.clientName}${data.project.location ? ` · ${data.project.location}` : ''}`
    : 'Project workspace'
  const nameForNav = projectName || data?.project.name

  const pageHeader = (
    <PageHeader
      title={title}
      subtitle={subtitle}
      subtitleIcon="folder-outline"
      onBack={() => navigation.goBack()}
    />
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading project…" variant="detail" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const { project, stats } = data
  type TabKey = 'ProjectTasks' | 'ProjectFiles' | 'ProjectNotes' | 'SiteFeed' | 'PurchaseOrders' | 'ProjectTeam'
  type TabIcon = keyof typeof Ionicons.glyphMap
  const tabs: { key: TabKey; label: string; icon: TabIcon }[] = [
    { key: 'ProjectTasks', label: 'Tasks', icon: 'checkbox-outline' },
    { key: 'ProjectFiles', label: 'Files', icon: 'folder-outline' },
    { key: 'ProjectNotes', label: 'Notes', icon: 'chatbubble-ellipses-outline' },
    ...(caps.siteFeed ? [{ key: 'SiteFeed' as const, label: 'Site', icon: 'camera-outline' as const }] : []),
    ...(caps.procurement ? [{ key: 'PurchaseOrders' as const, label: 'Orders', icon: 'cart-outline' as const }] : []),
    ...(caps.manageProjects ? [{ key: 'ProjectTeam' as const, label: 'Team', icon: 'people-outline' as const }] : []),
  ]
  const members = project.members || []
  const stages = project.stages || []

  const goTasks = () => navigation.navigate('ProjectTasks', { projectId, projectName: nameForNav })
  const openMember = (memberId: string, memberName: string) => {
    tabNav.navigate('Inbox', {
      screen: 'Conversation',
      params: { userId: memberId, userName: memberName },
    })
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      {pageHeader}
      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        {(project.description || project.currentStage) ? (
          <SurfaceCard padded={false}>
            <View style={styles.focusAccent} />
            <View style={styles.focusBody}>
              {project.currentStage ? (
                <Pill label={project.currentStage} bg={colors.accentSoft} color={colors.accent} />
              ) : null}
              {project.description ? <Text style={styles.description}>{project.description}</Text> : null}
            </View>
          </SurfaceCard>
        ) : null}

        <SectionLabel>Shortcuts</SectionLabel>
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

        <SectionLabel>At a glance</SectionLabel>
        <View style={styles.statsGrid}>
          <SurfaceCard style={styles.statCard} onPress={goTasks}>
            <Text style={styles.statValue}>{stats.openTasks}</Text>
            <Text style={styles.statLabel}>Open tasks</Text>
          </SurfaceCard>
          <SurfaceCard style={styles.statCard} onPress={goTasks}>
            <Text style={styles.statValue}>{stats.pendingApprovals}</Text>
            <Text style={styles.statLabel}>Pending approvals</Text>
          </SurfaceCard>
        </View>

        <SectionLabel>Budget</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
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
        </SurfaceCard>

        <SectionLabel count={stages.length}>Stages</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {stages.map((s) => (
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
        </SurfaceCard>

        <SectionLabel count={members.length}>Team</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {members.slice(0, 6).map((m) => (
            <Pressable
              key={m.user._id}
              style={styles.memberRow}
              onPress={() => openMember(m.user._id, m.user.name)}
              accessibilityRole="button"
            >
              <Avatar name={m.user.name} uri={m.user.avatar} size={30} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.user.name}
                </Text>
                <Text style={styles.memberRole} numberOfLines={1}>
                  {ROLE_LABELS[(m.role || m.user.role) as Role] || m.role || m.user.role}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </SurfaceCard>
      </ScrollView>
    </Screen>
  )
}

function createStyles(c: AppColors, sh: ReturnType<typeof useShadows>) {
  return StyleSheet.create({
    focusAccent: { height: 3, backgroundColor: c.accent },
    focusBody: { padding: spacing.md, gap: spacing.sm },
    description: { ...typography.body, color: c.textSecondary },
    tabRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.md },
    tabButton: {
      minWidth: 72,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      ...sh.card,
    },
    tabLabel: { ...typography.caption, color: c.textPrimary, textAlign: 'center' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    statCard: { flexGrow: 1, flexBasis: '30%', minWidth: 96, alignItems: 'center', gap: 2 },
    statValue: { ...typography.h2, color: c.textPrimary },
    statLabel: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },
    blockGap: { gap: spacing.sm },
    budgetRow: { flexDirection: 'row', gap: 6, alignItems: 'baseline' },
    budgetText: { ...typography.bodyStrong, color: c.textPrimary },
    budgetTextMuted: { ...typography.caption, color: c.textSecondary },
    progressTrack: { height: 8, borderRadius: radius.full, backgroundColor: c.surfaceRaised, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: c.accent },
    stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    stageDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.borderLight },
    stageLabel: { ...typography.body, color: c.textPrimary, flex: 1 },
    stageProgress: { ...typography.caption, color: c.textSecondary },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    memberName: { ...typography.bodyStrong, color: c.textPrimary },
    memberRole: { ...typography.caption, color: c.textSecondary, textTransform: 'capitalize' },
  })
}
