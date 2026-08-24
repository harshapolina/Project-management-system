import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { SearchField } from '../../components/SearchField'
import { SurfaceCard } from '../../components/SurfaceCard'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { adminApi, type TeamMember } from '../../api/admin'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser, ROLE_LABELS } from '../../utils/roles'
import { formatTrackedSeconds } from '../../utils/time'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'People'>

export function PeopleScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const [search, setSearch] = useState('')

  const summary = useQuery({
    queryKey: ['admin-team-summary'],
    queryFn: adminApi.teamSummary,
    enabled: caps.people,
  })
  const directory = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.users,
    enabled: !caps.people,
  })

  const members: TeamMember[] = caps.people
    ? summary.data?.members || []
    : (directory.data || []).map((u) => ({
        user: u,
        open: 0,
        overdue: 0,
        done: 0,
        timeSpent: 0,
      }))

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [m.user.name, m.user.email, m.user.role, m.user.title]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const isLoading = caps.people ? summary.isLoading : directory.isLoading
  const isError = caps.people ? summary.isError : directory.isError
  const error = caps.people ? summary.error : directory.error
  const refetch = caps.people ? summary.refetch : directory.refetch
  const isRefetching = caps.people ? summary.isRefetching : directory.isRefetching

  const pageHeader = (
    <>
      <AppNavBar />
      <PageHeader
        title="People"
        subtitle="Teammates in this company"
        subtitleIcon="people-outline"
        onBack={() => navigation.goBack()}
        right={
          caps.managePeople ? (
            <IconButton
              icon="person-add-outline"
              label="Invite person"
              tone="ghost"
              onPress={() => navigation.navigate('InvitePerson')}
            />
          ) : null
        }
      />
    </>
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading directory…" variant="rows" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {pageHeader}
      <SearchField value={search} onChangeText={setSearch} placeholder="Search people or roles" />
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.user._id}
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />}
        renderItem={({ item }) => {
          const person = item.user
          return (
            <SurfaceCard
              onPress={caps.people ? () => navigation.navigate('PersonAccess', { userId: person._id }) : undefined}
            >
              <View style={styles.row}>
                <Avatar name={person.name} uri={person.avatar} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {person.name}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {person.title || person.email}
                  </Text>
                  {caps.people ? (
                    <Text style={styles.stats}>
                      {item.open} open · {item.overdue} overdue · {formatTrackedSeconds(item.timeSpent)}
                    </Text>
                  ) : null}
                </View>
                <Pill label={ROLE_LABELS[person.role] || person.role} />
                {caps.people ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
              </View>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            title="No teammates yet"
            body={caps.managePeople ? 'Invite someone to join this company.' : undefined}
            action={caps.managePeople ? 'Invite person' : undefined}
            onAction={caps.managePeople ? () => navigation.navigate('InvitePerson') : undefined}
          />
        }
      />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    email: { ...typography.caption, color: c.textSecondary },
    stats: { ...typography.micro, color: c.textMuted, marginTop: 2 },
  })
}
