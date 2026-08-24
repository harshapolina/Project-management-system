import { useMemo, useRef, useState } from 'react'
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { AppNavBar, NAV_HERO_BG } from '../../components/AppNavBar'
import { SectionLabel } from '../../components/SectionLabel'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { Avatar } from '../../components/Avatar'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { STATUS_LABELS, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors, useShadows } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { assetUrl } from '../../constants/env'
import { homeApi } from '../../api/home'
import { notificationsApi } from '../../api/notifications'
import { siteFeedApi } from '../../api/siteFeed'
import { projectsApi } from '../../api/projects'
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import { capabilitiesForUser } from '../../utils/roles'
import type { HomeStackParamList, RootTabParamList } from '../../navigation/types'
import { openProjectScreen, openMoreScreen } from '../../navigation/openProject'
import type { HomeData, Task } from '../../types/models'
import type { SiteUpdate, Snag } from '../../types/ops'

/** Deep green hero + lime accents (home mock). */
const HERO = {
  bg: NAV_HERO_BG,
  panel: '#0a5c48',
  lime: '#C5E966',
  limeText: '#0a2e24',
  white: '#ffffff',
  mute: 'rgba(255,255,255,0.72)',
  faint: 'rgba(255,255,255,0.14)',
} as const

type Props = {
  navigation: CompositeNavigationProp<
    NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
    BottomTabNavigationProp<RootTabParamList>
  >
}

function firstName(name?: string) {
  if (!name) return 'there'
  return name.trim().split(/\s+/)[0] || 'there'
}

function timeGreeting(now = new Date()) {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(date?: string) {
  if (!date) return ''
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function taskProgress(task: Task) {
  if (typeof task.progress === 'number' && task.progress > 0) {
    return Math.min(100, Math.round(task.progress))
  }
  const list = task.checklist || []
  if (list.length) {
    const done = list.filter((c) => c.done).length
    return Math.round((done / list.length) * 100)
  }
  if (task.status === 'done') return 100
  if (task.status === 'review') return 80
  if (task.status === 'in_progress') return 40
  return 10
}

function projectNameOf(task?: Task | null) {
  if (!task?.projectId) return null
  if (typeof task.projectId === 'object') return task.projectId.name
  return null
}

function pickFocusTask(data: HomeData | undefined, projectId?: string | null) {
  if (!data) return null
  const inProject = (t: Task) => {
    if (!projectId) return true
    const pid = typeof t.projectId === 'object' ? t.projectId?._id : t.projectId
    return pid === projectId
  }
  const todayOpen = data.tasks.today.find((t) => t.status !== 'done' && inProject(t))
  if (todayOpen) return todayOpen
  const inProgress = data.tasks.assigned.find((t) => t.status === 'in_progress' && inProject(t))
  if (inProgress) return inProgress
  const assignedOpen = data.tasks.assigned.find((t) => t.status !== 'done' && inProject(t))
  if (assignedOpen) return assignedOpen
  return data.agenda?.find((t) => t.status !== 'done' && inProject(t)) || null
}

type AttentionItem = {
  key: string
  tone: 'danger' | 'warning' | 'accent'
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
  meta: string
  thumb?: string | null
  onPress: () => void
}

export function HomeScreen({ navigation }: Props) {
  const colors = useColors()
  const shadows = useShadows()
  const { height: windowHeight } = useWindowDimensions()
  const { pagePadding, isCompact } = useResponsive()
  const styles = useMemo(
    () => createStyles(colors, shadows, pagePadding, isCompact, windowHeight),
    [colors, shadows, pagePadding, isCompact, windowHeight],
  )
  const scrollY = useRef(new Animated.Value(0)).current
  const [heroHeight, setHeroHeight] = useState(0)

  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['home'],
    queryFn: homeApi.get,
  })
  const alerts = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 20_000,
  })
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    enabled: caps.projects,
  })
  const siteUpdates = useQuery({
    queryKey: ['site-updates-home'],
    queryFn: () => siteFeedApi.updates(),
    enabled: caps.siteFeed,
  })
  const snags = useQuery({
    queryKey: ['snags-home', selectedProjectId],
    queryFn: () => siteFeedApi.snags(selectedProjectId ? { projectId: selectedProjectId } : undefined),
    enabled: caps.siteFeed,
  })

  const projectList = projects.data || []
  const activeProject =
    (selectedProjectId
      ? projectList.find((p) => p._id === selectedProjectId)
      : projectList[0]) || null
  const activeProjectId = activeProject?._id || null

  const focus = pickFocusTask(data, activeProjectId)
  const progress = focus ? taskProgress(focus) : 0
  const openSnags = (snags.data || []).filter((s: Snag) => s.status === 'open')
  const overdueCount = (data?.tasks.overdue || []).length
  const remainingToday = (data?.tasks.today || []).filter((t) => t.status !== 'done').length
  const assignedOpen = (data?.tasks.assigned || []).filter((t) => t.status !== 'done').length
  const checklistLeft = focus?.checklist?.filter((c) => !c.done).length
  const tasksRemaining = checklistLeft ?? remainingToday
  const heroStat = remainingToday || assignedOpen

  const scheduleLabel = overdueCount > 0 ? 'At Risk' : 'On Track'
  const scheduleTone = overdueCount > 0 ? colors.danger : colors.success
  const crewCount = activeProject?.members?.length || 0
  const materialsPending = (data?.approvals || []).length
  const issuesOpen = openSnags.length

  const goMore = (screen: string, params?: object, fromHome = false) => {
    if (fromHome) {
      openMoreScreen(navigation, screen as never, params, { fromHome: true })
      return
    }
    navigation.navigate('More', { screen, params } as never)
  }

  const myTasks = useMemo(() => {
    const seen = new Set<string>()
    const out: Task[] = []
    for (const t of [...(data?.tasks.today || []), ...(data?.tasks.assigned || []), ...(data?.tasks.overdue || [])]) {
      if (t.status === 'done' || seen.has(t._id)) continue
      seen.add(t._id)
      out.push(t)
    }
    return out
  }, [data])

  const openMyTasks = () => setTasksOpen(true)

  const goProject = (screen: string, params?: object) => {
    if (!activeProjectId) {
      navigation.navigate('Projects' as never)
      return
    }
    openProjectScreen(
      navigation,
      screen as never,
      {
        projectId: activeProjectId,
        projectName: activeProject?.name,
        ...params,
      },
      { fromHome: true },
    )
  }

  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = []
    for (const s of openSnags.slice(0, 2)) {
      const proj =
        typeof s.projectId === 'string'
          ? projectList.find((p) => p._id === s.projectId)?.name
          : null
      items.push({
        key: `snag-${s._id}`,
        tone: 'danger',
        icon: 'alert-circle',
        title: s.title || 'Open snag',
        body: s.assignee?.name ? `Assigned to ${s.assignee.name}` : 'Needs attention on site',
        meta: `${proj || activeProject?.name || 'Site'} · ${timeAgo(s.createdAt)}`,
        thumb: s.photo ? assetUrl(s.photo) : null,
        onPress: () => goMore('Snags', activeProjectId ? { projectId: activeProjectId } : undefined),
      })
    }
    for (const a of (data?.approvals || []).slice(0, 2)) {
      if (items.length >= 3) break
      items.push({
        key: `appr-${a._id}`,
        tone: 'warning',
        icon: 'time',
        title: a.title || 'Awaiting approval',
        body: 'Submitted for review',
        meta: `${projectNameOf(a) || activeProject?.name || 'Project'} · ${timeAgo(a.updatedAt || a.createdAt)}`,
        onPress: () => navigation.navigate('TaskDetail', { taskId: a._id }),
      })
    }
    for (const n of (alerts.data || []).filter((x) => !x.read).slice(0, 3)) {
      if (items.length >= 3) break
      items.push({
        key: `n-${n._id}`,
        tone: 'warning',
        icon: 'cube',
        title: n.title,
        body: n.body || 'Needs a response',
        meta: timeAgo(n.createdAt),
        onPress: () => goMore('Notifications'),
      })
    }
    return items.slice(0, 3)
  }, [openSnags, data?.approvals, alerts.data, activeProject, activeProjectId, projectList])

  const recentUpdate = ((siteUpdates.data || []) as SiteUpdate[]).find((u) => {
    if (!activeProjectId) return true
    const pid = typeof u.projectId === 'object' ? u.projectId?._id : u.projectId
    return !pid || pid === activeProjectId
  }) || (siteUpdates.data || [])[0]

  const quickActions = (
    [
      {
        key: 'update',
        label: 'Post Update',
        icon: 'document-text' as const,
        color: colors.accentHover,
        bg: colors.accentSoft,
        visible: caps.siteFeed,
        onPress: () => goMore('PostSiteUpdate', activeProjectId ? { projectId: activeProjectId } : undefined),
      },
      {
        key: 'issue',
        label: 'Log Issue',
        icon: 'warning' as const,
        color: colors.danger,
        bg: colors.dangerSoft,
        visible: caps.siteFeed,
        onPress: () => goMore('CreateSnag', activeProjectId ? { projectId: activeProjectId } : undefined),
      },
      {
        key: 'material',
        label: 'Request Material',
        icon: 'cube' as const,
        color: colors.warning,
        bg: colors.warningSoft,
        visible: caps.procurement,
        onPress: () =>
          goMore('CreatePurchaseOrder', activeProjectId ? { projectId: activeProjectId } : undefined),
      },
      {
        key: 'photos',
        label: 'Site Photos',
        icon: 'camera' as const,
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.12)',
        visible: caps.siteFeed,
        onPress: () => goMore('SiteFeed', activeProjectId ? { projectId: activeProjectId } : undefined),
      },
    ] as const
  ).filter((a) => a.visible)

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']} background={colors.canvas}>
        <AppNavBar variant="hero" />
        <LoadingState label="Loading your work…" variant="home" />
      </Screen>
    )
  }

  if (isError) {
    return (
      <Screen padded={false} edges={['left', 'right']} background={colors.canvas}>
        <AppNavBar variant="hero" />
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const focusStatusColor = focus ? colors.status[focus.status] || colors.accent : colors.accent
  const updateProject =
    recentUpdate?.projectId && typeof recentUpdate.projectId === 'object'
      ? recentUpdate.projectId.name
      : activeProject?.name
  const updatePhotos = recentUpdate?.photos || []
  const updateThumb = updatePhotos[0]?.url ? assetUrl(updatePhotos[0].url) : null

  const coverRange = Math.max(heroHeight * 0.75, 160)
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, coverRange * 0.55, coverRange],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  })
  const heroScale = scrollY.interpolate({
    inputRange: [0, coverRange],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  })
  const sheetRadius = scrollY.interpolate({
    inputRange: [0, coverRange * 0.85],
    outputRange: [36, 12],
    extrapolate: 'clamp',
  })
  /** How far the white curve overlaps onto empty green padding (not content) */
  const SHEET_OVERLAP = 14
  const sheetLift = scrollY.interpolate({
    inputRange: [0, coverRange],
    outputRange: [0, -12],
    extrapolate: 'clamp',
  })

  return (
    <Screen padded={false} edges={['left', 'right']} background={colors.canvas}>
      <AppNavBar variant="hero" scrollY={scrollY} coverRange={coverRange} />
      <View style={styles.root}>
        {/* Green only under the hero + curve — bottom stays locked white above tabs */}
        <View
          pointerEvents="none"
          style={[
            styles.heroBleed,
            { height: Math.max((heroHeight || 320) + 48, 360) },
          ]}
        />
        {/* Fixed green hero below soft navbar */}
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.heroFixed,
            {
              opacity: heroOpacity,
              transform: [{ scale: heroScale }],
            },
          ]}
          onLayout={(e) => {
            const next = Math.ceil(e.nativeEvent.layout.height)
            if (next > 0 && Math.abs(next - heroHeight) > 2) setHeroHeight(next)
          }}
        >
          <View style={styles.heroInner}>
            <Text style={styles.heroHelloLine}>
              Hello, <Text style={styles.heroHelloName}>{firstName(user?.name)}</Text>
            </Text>

            <View style={styles.heroStatBlock}>
              <Text style={styles.heroStatLabel}>Your work today</Text>
              <Text style={styles.heroStatValue}>
                {heroStat}
                <Text style={styles.heroStatUnit}> open</Text>
              </Text>
              <Text style={styles.heroStatHint}>
                {timeGreeting()}
                {overdueCount > 0 ? ` · ${overdueCount} overdue` : ' · looking good'}
              </Text>
            </View>

            <View style={styles.heroCtas}>
              <Pressable
                style={({ pressed }) => [styles.heroCta, pressed && styles.heroCtaPressed]}
                onPress={openMyTasks}
                accessibilityRole="button"
                accessibilityLabel="My tasks"
              >
                <Ionicons name="checkmark-done-outline" size={18} color={HERO.limeText} />
                <Text style={styles.heroCtaText}>My tasks</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.heroCta, pressed && styles.heroCtaPressed]}
                onPress={() =>
                  caps.siteFeed
                    ? goMore(
                        'PostSiteUpdate',
                        activeProjectId ? { projectId: activeProjectId } : undefined,
                      )
                    : navigation.navigate('Projects' as never)
                }
                accessibilityRole="button"
                accessibilityLabel={caps.siteFeed ? 'Post update' : 'Projects'}
              >
                <Ionicons
                  name={caps.siteFeed ? 'camera-outline' : 'folder-outline'}
                  size={18}
                  color={HERO.limeText}
                />
                <Text style={styles.heroCtaText}>{caps.siteFeed ? 'Post update' : 'Projects'}</Text>
              </Pressable>
            </View>

            {caps.projects ? (
              <View style={styles.heroPanel}>
                <Text style={styles.heroPanelLabel}>Active project</Text>
                <Pressable
                  style={({ pressed }) => [styles.heroProjectRow, pressed && styles.heroCtaPressed]}
                  onPress={() => setPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Select project"
                >
                  <Ionicons name="business-outline" size={16} color={HERO.lime} />
                  <Text style={styles.heroProjectName} numberOfLines={1}>
                    {activeProject?.name || 'All projects'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={HERO.mute} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <Animated.ScrollView
          style={styles.scrollView}
          pointerEvents="box-none"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch()
                alerts.refetch()
                siteUpdates.refetch()
                snags.refetch()
                projects.refetch()
              }}
              tintColor={HERO.lime}
            />
          }
        >
          {/* Spacer ends early so the white curve rests on the green */}
          <View
            pointerEvents="none"
            style={{ height: Math.max((heroHeight || 320) - SHEET_OVERLAP, 200) }}
          />

          {/* White sheet with curved top overlapping green */}
          <Animated.View
            style={[
              styles.sheet,
              {
                borderTopLeftRadius: sheetRadius,
                borderTopRightRadius: sheetRadius,
                transform: [{ translateY: sheetLift }],
              },
            ]}
          >
          {/* Project health */}
          <SectionLabel
            action="View Details ›"
            onAction={() =>
              activeProjectId
                ? openProjectScreen(
                    navigation,
                    'ProjectOverview',
                    {
                      projectId: activeProjectId,
                      projectName: activeProject?.name,
                    },
                    { fromHome: true },
                  )
                : navigation.navigate('Projects' as never)
            }
          >
            Project health
          </SectionLabel>
          <View style={styles.healthRow}>
            <HealthTile
              styles={styles}
              icon="calendar-outline"
              iconColor={scheduleTone}
              iconBg={`${scheduleTone}18`}
              label="Schedule"
              value={scheduleLabel}
              valueColor={scheduleTone}
              onPress={() => (overdueCount > 0 ? openMyTasks() : goProject('ProjectTasks'))}
            />
            <HealthTile
              styles={styles}
              icon="people-outline"
              iconColor="#0d9488"
              iconBg="rgba(13,148,136,0.12)"
              label="Crews"
              value={crewCount ? `${crewCount} Active` : '—'}
              valueColor="#0d9488"
              onPress={() => goProject('ProjectTeam')}
            />
            <HealthTile
              styles={styles}
              icon="cube-outline"
              iconColor={colors.warning}
              iconBg={colors.warningSoft}
              label="Materials"
              value={materialsPending ? 'Pending' : 'Clear'}
              valueColor={materialsPending ? colors.warning : colors.success}
              onPress={() =>
                caps.procurement
                  ? goMore('PurchaseOrders', activeProjectId ? { projectId: activeProjectId } : undefined, true)
                  : goProject('ProjectOverview')
              }
            />
            <HealthTile
              styles={styles}
              icon="alert-circle-outline"
              iconColor={colors.danger}
              iconBg={colors.dangerSoft}
              label="Issues"
              value={`${issuesOpen} Open`}
              valueColor={colors.danger}
              onPress={() =>
                caps.siteFeed
                  ? goMore('Snags', activeProjectId ? { projectId: activeProjectId } : undefined, true)
                  : goProject('ProjectOverview')
              }
            />
          </View>

          {/* Today's focus */}
          <SectionLabel>Today&apos;s focus</SectionLabel>
          {focus ? (
            <Pressable
              style={styles.focusCard}
              onPress={() => navigation.navigate('TaskDetail', { taskId: focus._id })}
              accessibilityRole="button"
            >
              <View style={styles.focusTop}>
                <View style={[styles.statusPill, { backgroundColor: `${focusStatusColor}22` }]}>
                  <View style={[styles.statusDot, { backgroundColor: focusStatusColor }]} />
                  <Text style={[styles.statusPillText, { color: focusStatusColor }]}>
                    {STATUS_LABELS[focus.status] || focus.status}
                  </Text>
                </View>
                <View style={styles.focusHeroIcon}>
                  <Ionicons name="construct-outline" size={28} color={colors.accentHover} />
                </View>
              </View>
              <Text style={styles.focusTitle} numberOfLines={2}>
                {focus.title}
              </Text>
              <Text style={styles.focusMeta}>
                {focus.dueDate ? 'Due today' : 'No due date'} · {progress}% complete
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.focusFooter}>
                <Text style={styles.focusRemaining}>
                  {tasksRemaining} task{tasksRemaining === 1 ? '' : 's'} remaining
                </Text>
                <Pressable
                  style={styles.focusArrow}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: focus._id })}
                  accessibilityLabel="Open task"
                >
                  <Ionicons name="arrow-forward" size={18} color={colors.textOnAccent} />
                </Pressable>
              </View>
            </Pressable>
          ) : (
            <View style={styles.focusEmpty}>
              <EmptyState
                icon="checkmark-done-outline"
                title="Nothing in focus"
                body="You’re clear for now — pick up a task when you’re ready."
              />
            </View>
          )}

          {/* Needs your attention */}
          <SectionLabel
            count={attentionItems.length > 0 ? attentionItems.length : undefined}
            action="View All"
            onAction={() => goMore('Notifications')}
          >
            Needs your attention
          </SectionLabel>
          <View style={styles.attentionCard}>
            {attentionItems.length === 0 ? (
              <Text style={styles.attentionEmpty}>You’re all caught up.</Text>
            ) : (
              attentionItems.map((item, idx) => (
                <Pressable
                  key={item.key}
                  style={[styles.attentionRow, idx > 0 && styles.attentionRowBorder]}
                  onPress={item.onPress}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.attentionIcon,
                      {
                        backgroundColor:
                          item.tone === 'danger'
                            ? colors.dangerSoft
                            : item.tone === 'warning'
                              ? colors.warningSoft
                              : colors.accentSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={
                        item.tone === 'danger'
                          ? colors.danger
                          : item.tone === 'warning'
                            ? colors.warning
                            : colors.accentHover
                      }
                    />
                  </View>
                  <View style={styles.attentionCopy}>
                    <Text style={styles.attentionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.attentionBody} numberOfLines={1}>
                      {item.body}
                    </Text>
                    <Text style={styles.attentionMeta} numberOfLines={1}>
                      {item.meta}
                    </Text>
                  </View>
                  {item.thumb ? (
                    <Image source={{ uri: item.thumb }} style={styles.attentionThumb} />
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))
            )}
          </View>

          {/* Quick actions */}
          <SectionLabel>Quick actions</SectionLabel>
          <View style={styles.actionsRow}>
            {quickActions.map((action) => (
              <Pressable
                key={action.key}
                style={styles.actionCard}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <View style={[styles.actionIconWell, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={20} color={action.color} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={2}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Recent activity */}
          {caps.siteFeed ? (
            <>
              <SectionLabel
                action="View All"
                onAction={() =>
                  goMore('SiteFeed', activeProjectId ? { projectId: activeProjectId } : undefined)
                }
              >
                Recent activity
              </SectionLabel>
              {recentUpdate ? (
                <Pressable
                  style={styles.activityCard}
                  onPress={() =>
                    goMore('SiteFeed', activeProjectId ? { projectId: activeProjectId } : undefined)
                  }
                  accessibilityRole="button"
                >
                  <Avatar name={recentUpdate.author?.name} uri={recentUpdate.author?.avatar} size={40} />
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityProject} numberOfLines={1}>
                      {updateProject || 'Site update'}
                    </Text>
                    <Text style={styles.activityNote} numberOfLines={2}>
                      {recentUpdate.note}
                    </Text>
                    <Text style={styles.activityMeta} numberOfLines={1}>
                      {recentUpdate.author?.name || 'Teammate'} · {timeAgo(recentUpdate.createdAt)}
                    </Text>
                  </View>
                  {updateThumb ? (
                    <View style={styles.activityThumbWrap}>
                      <Image source={{ uri: updateThumb }} style={styles.activityThumb} />
                      {updatePhotos.length > 1 ? (
                        <View style={styles.photoBadge}>
                          <Ionicons name="camera" size={10} color="#fff" />
                          <Text style={styles.photoBadgeText}>+{updatePhotos.length - 1}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={[styles.activityThumb, styles.activityThumbFallback]}>
                      <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                    </View>
                  )}
                </Pressable>
              ) : (
                <View style={styles.activityEmpty}>
                  <Text style={styles.attentionEmpty}>No site updates yet.</Text>
                  <Pressable style={styles.postBtn} onPress={() => goMore('PostSiteUpdate')}>
                    <Text style={styles.postBtnText}>Post update</Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : null}
          </Animated.View>
        </Animated.ScrollView>

        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Projects</Text>
            {projectList.map((p) => (
              <Pressable
                key={p._id}
                style={styles.modalRow}
                onPress={() => {
                  setSelectedProjectId(p._id)
                  setPickerOpen(false)
                }}
              >
                <Text style={styles.modalRowText} numberOfLines={1}>
                  {p.name}
                </Text>
                {activeProjectId === p._id ? (
                  <Ionicons name="checkmark" size={18} color={colors.accentHover} />
                ) : null}
              </Pressable>
            ))}
            {!projectList.length ? (
              <Text style={styles.attentionEmpty}>No projects yet.</Text>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={tasksOpen} transparent animationType="fade" onRequestClose={() => setTasksOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTasksOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>My tasks</Text>
            {myTasks.map((t) => (
              <Pressable
                key={t._id}
                style={styles.modalRow}
                onPress={() => {
                  setTasksOpen(false)
                  navigation.navigate('TaskDetail', { taskId: t._id })
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.modalRowText} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={styles.attentionEmpty} numberOfLines={1}>
                    {STATUS_LABELS[t.status] || t.status}
                    {projectNameOf(t) ? ` · ${projectNameOf(t)}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
            {!myTasks.length ? (
              <View style={styles.activityEmpty}>
                <Text style={styles.attentionEmpty}>No open tasks right now.</Text>
                <Pressable
                  style={styles.postBtn}
                  onPress={() => {
                    setTasksOpen(false)
                    navigation.navigate('CreateTask', { isPersonal: true })
                  }}
                >
                  <Text style={styles.postBtnText}>New task</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
      </View>
    </Screen>
  )
}

function HealthTile({
  styles,
  icon,
  iconColor,
  iconBg,
  label,
  value,
  valueColor,
  onPress,
}: {
  styles: ReturnType<typeof createStyles>
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  iconBg: string
  label: string
  value: string
  valueColor: string
  onPress?: () => void
}) {
  return (
    <Pressable
      style={styles.healthTile}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <View style={[styles.healthIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.healthLabel}>{label}</Text>
      <Text style={[styles.healthValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  )
}

function createStyles(
  c: AppColors,
  sh: ReturnType<typeof useShadows>,
  pagePadding: number,
  isCompact: boolean,
  windowHeight: number,
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      // Locked white under the sheet / above the tab bar
      backgroundColor: c.canvas,
      position: 'relative',
    },
    heroBleed: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
      elevation: 0,
      backgroundColor: HERO.bg,
    },
    scrollView: {
      flex: 1,
      backgroundColor: 'transparent',
      // Above the fixed green hero so the white sheet covers it while scrolling
      zIndex: 5,
      elevation: 5,
      ...(Platform.OS === 'web' ? { position: 'relative' as const } : null),
    },
    scroll: {
      flexGrow: 1,
      // Clearance lives inside the white sheet so green never peeks above tabs
      paddingBottom: 0,
      backgroundColor: 'transparent',
    },
    heroFixed: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      // Sit under the white sheet — sheet scrolls over green, not under it
      zIndex: 1,
      elevation: 1,
      backgroundColor: HERO.bg,
      // Tall empty green band so the white curve never clips the project card
      paddingBottom: spacing.xxl + 40,
      marginTop: -2,
    },
    heroInner: {
      paddingHorizontal: pagePadding,
      paddingTop: spacing.md,
      gap: spacing.lg + 4,
    },
    heroHelloLine: {
      ...typography.h3,
      fontSize: 18,
      color: HERO.mute,
    },
    heroHelloName: {
      color: HERO.white,
      fontWeight: '700',
    },
    heroStatBlock: {
      gap: 4,
    },
    heroStatLabel: {
      ...typography.captionStrong,
      color: HERO.lime,
    },
    heroStatValue: {
      fontSize: isCompact ? 40 : 48,
      fontWeight: '700',
      color: HERO.white,
      letterSpacing: -1.2,
      lineHeight: isCompact ? 46 : 54,
    },
    heroStatUnit: {
      fontSize: 22,
      fontWeight: '600',
      color: HERO.mute,
    },
    heroStatHint: {
      ...typography.caption,
      color: HERO.mute,
      marginTop: 2,
    },
    heroCtas: {
      flexDirection: 'row',
      gap: 16,
      marginTop: spacing.sm,
    },
    heroCta: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 50,
      borderRadius: radius.full,
      backgroundColor: HERO.lime,
      paddingHorizontal: spacing.md,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
    },
    heroCtaPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    heroCtaText: {
      ...typography.bodyStrong,
      color: HERO.limeText,
    },
    heroPanel: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      backgroundColor: HERO.panel,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.12)',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      gap: 8,
    },
    heroPanelLabel: {
      ...typography.micro,
      color: HERO.mute,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    heroProjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 28,
    },
    heroProjectName: {
      ...typography.bodyStrong,
      color: HERO.white,
      flex: 1,
      minWidth: 0,
    },
    sheet: {
      backgroundColor: c.canvas,
      paddingHorizontal: pagePadding,
      paddingTop: spacing.xl + 4,
      // Extend white sheet through tab-bar clearance (locks bottom white)
      paddingBottom: TAB_BAR_CLEARANCE + spacing.xl,
      gap: spacing.md,
      minHeight: Math.max(windowHeight - 80, 520),
      zIndex: 6,
      elevation: 6,
      overflow: 'hidden',
      borderCurve: 'continuous',
      ...(Platform.OS === 'web' ? { position: 'relative' as const } : null),
    },
    healthRow: { flexDirection: 'row', gap: 8 },
    healthTile: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 4,
      ...sh.card,
    },
    healthIcon: {
      width: 28,
      height: 28,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    healthLabel: { ...typography.micro, color: c.textMuted },
    healthValue: { ...typography.captionStrong, fontSize: 11, textAlign: 'center' },
    focusCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      gap: 8,
      ...sh.card,
    },
    focusEmpty: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      minHeight: 140,
      ...sh.card,
    },
    focusTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.full,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusPillText: { ...typography.micro },
    focusHeroIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    focusTitle: { ...typography.h3, fontSize: 18, color: c.textPrimary },
    focusMeta: { ...typography.caption, color: c.textSecondary },
    progressTrack: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: { height: '100%', backgroundColor: c.accent, borderRadius: radius.full },
    focusFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    focusRemaining: { ...typography.caption, color: c.textSecondary },
    focusArrow: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attentionCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      ...sh.card,
    },
    attentionEmpty: {
      ...typography.caption,
      color: c.textSecondary,
      padding: spacing.lg,
    },
    attentionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    attentionRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    attentionIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attentionCopy: { flex: 1, minWidth: 0, gap: 2 },
    attentionTitle: { ...typography.bodyStrong, color: c.textPrimary },
    attentionBody: { ...typography.caption, color: c.textSecondary },
    attentionMeta: { ...typography.micro, color: c.textMuted },
    attentionThumb: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: c.surfaceRaised,
    },
    actionsRow: { flexDirection: 'row', gap: 8 },
    actionCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 12,
      paddingHorizontal: 6,
      alignItems: 'center',
      gap: 8,
      ...sh.card,
    },
    actionIconWell: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      ...typography.micro,
      color: c.textPrimary,
      textAlign: 'center',
      fontWeight: '600',
    },
    activityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      ...sh.card,
    },
    activityCopy: { flex: 1, minWidth: 0, gap: 2 },
    activityProject: { ...typography.captionStrong, color: c.textPrimary },
    activityNote: { ...typography.caption, color: c.textSecondary },
    activityMeta: { ...typography.micro, color: c.textMuted },
    activityThumbWrap: { position: 'relative' },
    activityThumb: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: c.surfaceRaised,
    },
    activityThumbFallback: { alignItems: 'center', justifyContent: 'center' },
    photoBadge: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: radius.full,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    photoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    activityEmpty: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      gap: spacing.sm,
      ...sh.card,
    },
    postBtn: {
      alignSelf: 'flex-start',
      backgroundColor: c.accentSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    postBtnText: { ...typography.captionStrong, color: c.accentHover },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: 4,
      maxHeight: '70%',
    },
    modalTitle: { ...typography.h3, color: c.textPrimary, marginBottom: spacing.sm },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    modalRowText: { ...typography.body, color: c.textPrimary, flex: 1, paddingRight: 12 },
  })
}
