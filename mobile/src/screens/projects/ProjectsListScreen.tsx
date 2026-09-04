import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { ProjectCard } from '../../components/ProjectCard'
import { SearchField } from '../../components/SearchField'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, TAB_BAR_CLEARANCE, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { Project } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectsList'>

export function ProjectsListScreen({ navigation }: Props) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding), [colors, pagePadding])

  const [search, setSearch] = useState('')
  const [titleH, setTitleH] = useState(0)
  const scrollY = useRef(new Animated.Value(0)).current
  const scrollOffset = useRef(0)

  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  })

  const filtered = useMemo(() => {
    const list = data || []
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q),
    )
  }, [data, search])

  const headerHeight = useMemo(
    () =>
      titleH > 0
        ? scrollY.interpolate({
            inputRange: [0, titleH],
            outputRange: [titleH, 0],
            extrapolate: 'clamp',
          })
        : undefined,
    [scrollY, titleH],
  )

  const headerShift = useMemo(
    () =>
      titleH > 0
        ? scrollY.interpolate({
            inputRange: [0, titleH],
            outputRange: [0, -titleH],
            extrapolate: 'clamp',
          })
        : new Animated.Value(0),
    [scrollY, titleH],
  )

  const ruleOpacity = useMemo(
    () =>
      titleH > 0
        ? scrollY.interpolate({
            inputRange: [titleH * 0.75, titleH],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          })
        : new Animated.Value(0),
    [scrollY, titleH],
  )

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = Math.max(0, e.nativeEvent.contentOffset.y)
      scrollOffset.current = y
      scrollY.setValue(y)
    },
    [scrollY],
  )

  const onTitleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const next = Math.round(e.nativeEvent.layout.height)
      if (next <= 0) return
      // While collapsing, web reports the clipped box — ignore those or the
      // search bar reflows every frame and flickers.
      if (scrollOffset.current > 2) return
      if (next === titleH) return
      setTitleH(next)
    },
    [titleH],
  )

  const createBtn = caps.createProject ? (
    <IconButton
      icon="add-outline"
      label="Create project"
      tone="ghost"
      onPress={() => navigation.navigate('CreateProject')}
    />
  ) : undefined

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <Animated.View style={[styles.titleClip, headerHeight != null ? { height: headerHeight } : null]}>
        <Animated.View onLayout={onTitleLayout} style={{ transform: [{ translateY: headerShift }] }}>
          <PageHeader
            title="Projects"
            subtitle={data ? `${data.length} live spaces` : 'Your active workspaces'}
            subtitleIcon="folder-outline"
            right={createBtn}
          />
        </Animated.View>
      </Animated.View>

      <View style={styles.searchWrap}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects or clients"
        />
        <Animated.View style={[styles.rule, { opacity: ruleOpacity, backgroundColor: colors.border }]} />
      </View>

      <FlatList
        style={styles.list}
        data={filtered}
        keyExtractor={(item: Project) => item._id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() =>
              navigation.navigate('ProjectOverview', {
                projectId: item._id,
                projectName: item.name,
              })
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <LoadingState label="Loading projects…" variant="cards" />
          ) : isError ? (
            <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
          ) : (
            <EmptyState
              icon="folder-open-outline"
              title={search ? 'No matching projects' : 'No projects yet'}
              body={search ? 'Try a different name or client.' : 'New projects will appear here.'}
            />
          )
        }
      />
    </Screen>
  )
}

function createStyles(c: AppColors, pagePadding: number) {
  return StyleSheet.create({
    titleClip: {
      overflow: 'hidden',
    },
    searchWrap: {
      backgroundColor: c.canvas,
      paddingTop: spacing.xs,
      zIndex: 4,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
    },
    list: {
      flex: 1,
      minHeight: 0,
    },
    listContent: {
      paddingHorizontal: pagePadding,
      gap: spacing.md,
      paddingBottom: TAB_BAR_CLEARANCE + spacing.xl,
      flexGrow: 1,
    },
  })
}
