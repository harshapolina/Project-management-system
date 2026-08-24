import { useEffect, useMemo, useState } from 'react'
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { DrawerActions, useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows, useThemeMode } from '../theme/useColors'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser, ROLE_LABELS } from '../utils/roles'
import { projectsApi } from '../api/projects'
import { homeApi } from '../api/home'
import { adminApi } from '../api/admin'
import { leadsApi } from '../api/leads'
import { vendorsApi } from '../api/procurement'
import type { RootDrawerParamList } from '../navigation/types'
import type { Task } from '../types/models'
import { Avatar } from './Avatar'

/** Matches HomeScreen deep-green hero */
export const NAV_HERO_BG = '#004838'
const HERO_WELL = 'rgba(255,255,255,0.14)'
const HERO_PILL = 'rgba(255,255,255,0.16)'

type SearchKind = 'task' | 'project' | 'person' | 'lead' | 'vendor' | 'shortcut'

type SearchHit = {
  key: string
  kind: SearchKind
  title: string
  subtitle?: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}

type AppNavBarProps = {
  /** `hero` blends with home green; `default` follows light/dark canvas. */
  variant?: 'default' | 'hero'
  /** Home scroll — navbar background eases from hero → theme canvas. */
  scrollY?: Animated.Value
  /** Distance where navbar fully matches the page canvas. */
  coverRange?: number
}

/**
 * Soft top chrome: avatar · pill search · circular action buttons.
 * Background tracks the active theme (and Home hero while scrolling).
 */
export function AppNavBar({
  variant = 'default',
  scrollY,
  coverRange = 180,
}: AppNavBarProps = {}) {
  const colors = useColors()
  const shadows = useShadows()
  const mode = useThemeMode()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<NavigationProp<RootDrawerParamList>>()
  const [heroActive, setHeroActive] = useState(variant === 'hero')
  const onHero = variant === 'hero' && heroActive
  const styles = useMemo(() => createStyles(colors, shadows, onHero), [colors, shadows, onHero])
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (variant !== 'hero' || !scrollY) {
      setHeroActive(variant === 'hero')
      return
    }
    setHeroActive(true)
    const threshold = Math.max(coverRange * 0.35, 48)
    const id = scrollY.addListener(({ value }) => {
      setHeroActive(value < threshold)
    })
    return () => scrollY.removeListener(id)
  }, [variant, scrollY, coverRange])

  const shellBg =
    variant === 'hero' && scrollY
      ? scrollY.interpolate({
          inputRange: [0, Math.max(coverRange * 0.55, 80), Math.max(coverRange, 140)],
          outputRange: [NAV_HERO_BG, NAV_HERO_BG, colors.canvas],
          extrapolate: 'clamp',
        })
      : onHero
        ? NAV_HERO_BG
        : colors.canvas

  const home = useQuery({
    queryKey: ['home'],
    queryFn: () => homeApi.get(),
    enabled: searchOpen,
  })
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    enabled: searchOpen && caps.projects,
  })
  const people = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.users(),
    enabled: searchOpen && (caps.people || caps.managePeople || caps.inbox),
  })
  const leads = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.list(),
    enabled: searchOpen && caps.leads,
  })
  const vendors = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.list(),
    enabled: searchOpen && caps.procurement,
  })

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  const goMore = (screen: string, params?: object) => {
    navigation.navigate('MainTabs', {
      screen: 'More',
      params: params ? { screen, params } : { screen },
    } as never)
  }

  const goTab = (tab: string, screen?: string, params?: object) => {
    navigation.navigate('MainTabs', {
      screen: tab,
      params: screen ? (params ? { screen, params } : { screen }) : undefined,
    } as never)
  }

  const openProfile = () => goMore('ProfileHub')

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer())
  }

  const openReports = () => {
    if (caps.reports || caps.portfolio) {
      goMore('Reports')
      return
    }
    goMore('MoreMain')
  }

  const openBilling = () => {
    if (caps.finance) {
      goMore('Billing')
      return
    }
    goMore('Notifications')
  }

  const openTask = (task: Task) => {
    closeSearch()
    const projectId =
      typeof task.projectId === 'object' && task.projectId ? task.projectId._id : task.projectId
    if (projectId) {
      goTab('Projects', 'TaskDetail', { taskId: task._id })
      return
    }
    goTab('Home', 'TaskDetail', { taskId: task._id })
  }

  const openProject = (projectId: string, projectName?: string) => {
    closeSearch()
    goTab('Projects', 'ProjectOverview', { projectId, projectName })
  }

  const openPerson = (userId: string, userName: string) => {
    closeSearch()
    if (caps.people || caps.managePeople) {
      goMore('ProfileHub', { screen: 'PersonAccess', params: { userId } })
      return
    }
    goTab('Inbox', 'Conversation', { userId, userName })
  }

  const results = useMemo((): SearchHit[] => {
    const q = query.trim().toLowerCase()
    const hits: SearchHit[] = []

    // Empty query → quick navigation shortcuts
    if (!q) {
      const shortcuts: SearchHit[] = [
        {
          key: 'sc-home',
          kind: 'shortcut',
          title: 'Home',
          subtitle: 'Your work today',
          icon: 'home-outline',
          onPress: () => {
            closeSearch()
            goTab('Home')
          },
        },
        ...(caps.projects
          ? [
              {
                key: 'sc-projects',
                kind: 'shortcut' as const,
                title: 'Projects',
                subtitle: 'All workspaces',
                icon: 'folder-outline' as const,
                onPress: () => {
                  closeSearch()
                  goTab('Projects')
                },
              },
            ]
          : []),
        {
          key: 'sc-inbox',
          kind: 'shortcut',
          title: 'Messages',
          subtitle: 'Team inbox',
          icon: 'chatbubbles-outline',
          onPress: () => {
            closeSearch()
            goTab('Inbox')
          },
        },
        {
          key: 'sc-more',
          kind: 'shortcut',
          title: 'More',
          subtitle: 'Tools and company',
          icon: 'grid-outline',
          onPress: () => {
            closeSearch()
            goTab('More')
          },
        },
      ]
      return shortcuts
    }

    // Tasks from home buckets
    const taskMap = new Map<string, Task>()
    const buckets = home.data?.tasks
    if (buckets) {
      for (const list of Object.values(buckets)) {
        if (!Array.isArray(list)) continue
        for (const t of list) {
          if (t?.title?.toLowerCase().includes(q)) taskMap.set(t._id, t)
        }
      }
    }
    for (const t of [...taskMap.values()].slice(0, 8)) {
      const projectName =
        typeof t.projectId === 'object' && t.projectId ? t.projectId.name : t.isPersonal ? 'Personal' : 'Task'
      hits.push({
        key: `task-${t._id}`,
        kind: 'task',
        title: t.title,
        subtitle: projectName,
        icon: 'checkbox-outline',
        onPress: () => openTask(t),
      })
    }

    // Projects
    if (caps.projects) {
      for (const p of (projects.data || [])
        .filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            (p.clientName || '').toLowerCase().includes(q) ||
            (p.location || '').toLowerCase().includes(q),
        )
        .slice(0, 6)) {
        hits.push({
          key: `project-${p._id}`,
          kind: 'project',
          title: p.name,
          subtitle: p.clientName || p.location || 'Project',
          icon: 'business-outline',
          onPress: () => openProject(p._id, p.name),
        })
      }
    }

    // People
    for (const u of (people.data || [])
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          (u.title || '').toLowerCase().includes(q),
      )
      .slice(0, 6)) {
      hits.push({
        key: `person-${u._id}`,
        kind: 'person',
        title: u.name,
        subtitle: u.title || ROLE_LABELS[u.role] || u.email,
        icon: 'person-outline',
        onPress: () => openPerson(u._id, u.name),
      })
    }

    // Leads
    if (caps.leads) {
      for (const lead of (leads.data || [])
        .filter(
          (l) =>
            l.clientName?.toLowerCase().includes(q) ||
            (l.contactName || '').toLowerCase().includes(q) ||
            (l.email || '').toLowerCase().includes(q) ||
            (l.phone || '').toLowerCase().includes(q),
        )
        .slice(0, 5)) {
        hits.push({
          key: `lead-${lead._id}`,
          kind: 'lead',
          title: lead.clientName,
          subtitle: lead.contactName || lead.stage || 'Enquiry',
          icon: 'briefcase-outline',
          onPress: () => {
            closeSearch()
            goMore('Leads')
          },
        })
      }
    }

    // Vendors
    if (caps.procurement) {
      for (const v of (vendors.data || [])
        .filter(
          (v) =>
            v.name?.toLowerCase().includes(q) ||
            (v.contact || '').toLowerCase().includes(q) ||
            (v.email || '').toLowerCase().includes(q),
        )
        .slice(0, 5)) {
        hits.push({
          key: `vendor-${v._id}`,
          kind: 'vendor',
          title: v.name,
          subtitle: v.contact || v.email || 'Vendor',
          icon: 'storefront-outline',
          onPress: () => {
            closeSearch()
            goMore('Vendors')
          },
        })
      }
    }

    return hits
  }, [
    query,
    home.data,
    projects.data,
    people.data,
    leads.data,
    vendors.data,
    caps,
  ])

  const kindLabel = (kind: SearchKind) => {
    switch (kind) {
      case 'task':
        return 'Tasks'
      case 'project':
        return 'Projects'
      case 'person':
        return 'People'
      case 'lead':
        return 'Enquiries'
      case 'vendor':
        return 'Vendors'
      default:
        return 'Quick open'
    }
  }

  // Group for section headers in FlatList
  const listData = useMemo(() => {
    const rows: ({ type: 'header'; title: string; key: string } | ({ type: 'hit' } & SearchHit))[] = []
    let lastKind: SearchKind | null = null
    for (const hit of results) {
      if (hit.kind !== lastKind) {
        rows.push({ type: 'header', title: kindLabel(hit.kind), key: `h-${hit.kind}` })
        lastKind = hit.kind
      }
      rows.push({ type: 'hit', ...hit })
    }
    return rows
  }, [results])

  const iconColor = onHero ? '#ffffff' : colors.textPrimary
  const searchIconColor = onHero ? 'rgba(255,255,255,0.75)' : colors.textMuted
  const searchTextColor = onHero ? 'rgba(255,255,255,0.7)' : colors.textMuted
  const statusStyle = onHero ? 'light' : mode === 'dark' ? 'light' : 'dark'

  return (
    <>
      <StatusBar style={statusStyle} />
      <Animated.View
        style={[
          styles.shell,
          { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: shellBg },
        ]}
      >
        <View style={styles.bar}>
          <Pressable
            onPress={openProfile}
            onLongPress={openDrawer}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.85 }]}
          >
            <Avatar name={user?.name} uri={user?.avatar} size={40} />
          </Pressable>

          <Pressable
            onPress={() => setSearchOpen(true)}
            accessibilityRole="search"
            accessibilityLabel="Search"
            style={({ pressed }) => [styles.searchPill, pressed && styles.searchPillPressed]}
          >
            <Ionicons name="search-outline" size={18} color={searchIconColor} />
            <Text style={[styles.searchPlaceholder, { color: searchTextColor }]} numberOfLines={1}>
              Search tasks, projects, people…
            </Text>
          </Pressable>

          <View style={styles.actions}>
            {caps.reports || caps.portfolio ? (
              <CircleAction
                icon="stats-chart-outline"
                label="Reports"
                onPress={openReports}
                onHero={onHero}
                iconColor={iconColor}
                colors={colors}
                shadows={shadows}
              />
            ) : null}
            <CircleAction
              icon={caps.finance ? 'card-outline' : 'notifications-outline'}
              label={caps.finance ? 'Billing' : 'Notifications'}
              onPress={openBilling}
              onHero={onHero}
              iconColor={iconColor}
              colors={colors}
              shadows={shadows}
            />
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={searchOpen}
        animationType="fade"
        transparent
        onRequestClose={closeSearch}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.modalBar}>
            <View style={styles.searchField}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search tasks, projects, people…"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <Pressable onPress={closeSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close search">
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>

          <FlatList
            data={listData}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.results}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {query.trim() ? `No results for “${query.trim()}”.` : 'Search across tasks, projects, and people.'}
              </Text>
            }
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <Text style={styles.sectionLabel}>{item.title}</Text>
              }
              return (
                <Pressable
                  style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={styles.resultIcon}>
                    <Ionicons name={item.icon} size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.resultMeta} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>
    </>
  )
}

function CircleAction({
  icon,
  label,
  onPress,
  onHero,
  iconColor,
  colors,
  shadows,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  onHero: boolean
  iconColor: string
  colors: AppColors
  shadows: ReturnType<typeof useShadows>
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: onHero ? HERO_WELL : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          ...(onHero ? {} : shadows.card),
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
    </Pressable>
  )
}

function createStyles(c: AppColors, shadows: ReturnType<typeof useShadows>, onHero: boolean) {
  return StyleSheet.create({
    shell: {
      // backgroundColor set dynamically (theme canvas / hero blend)
      paddingBottom: spacing.sm,
      zIndex: 3,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      minHeight: 48,
    },
    avatarWrap: {
      borderRadius: 22,
      borderWidth: onHero ? 2 : 0,
      borderColor: onHero ? 'rgba(255,255,255,0.35)' : 'transparent',
      ...(!onHero ? shadows.card : {}),
    },
    searchPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.full,
      backgroundColor: onHero ? HERO_PILL : c.surface,
      ...(onHero ? {} : shadows.card),
    },
    searchPillPressed: {
      backgroundColor: onHero ? 'rgba(255,255,255,0.22)' : c.surfaceRaised,
    },
    searchPlaceholder: {
      ...typography.body,
      color: c.textMuted,
      flex: 1,
      minWidth: 0,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    modalRoot: {
      flex: 1,
      backgroundColor: c.canvas,
    },
    modalBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    searchField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      ...shadows.card,
    },
    searchInput: {
      ...typography.body,
      color: c.textPrimary,
      flex: 1,
      paddingVertical: spacing.sm,
      minWidth: 0,
    },
    cancel: {
      ...typography.bodyStrong,
      color: c.accentHover,
    },
    results: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: 2,
    },
    empty: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    sectionLabel: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      paddingHorizontal: 4,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      marginBottom: spacing.sm,
      ...shadows.card,
    },
    resultRowPressed: {
      backgroundColor: c.accentSoft,
    },
    resultIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceRaised,
    },
    resultText: { flex: 1, minWidth: 0, gap: 2 },
    resultTitle: { ...typography.bodyStrong, color: c.textPrimary },
    resultMeta: { ...typography.caption, color: c.textSecondary },
  })
}
