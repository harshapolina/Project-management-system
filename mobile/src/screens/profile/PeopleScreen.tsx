import { useLayoutEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { SearchField } from '../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { adminApi, type TeamMember } from '../../api/admin'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser, ROLE_LABELS } from '../../utils/roles'
import { formatTrackedSeconds } from '../../utils/time'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'People'>

export function PeopleScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const [search, setSearch] = useState('')

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: caps.managePeople
        ? () => (
            <Pressable onPress={() => navigation.navigate('InvitePerson')} hitSlop={10} accessibilityLabel="Invite person">
              <Ionicons name="person-add-outline" size={22} color={colors.accent} />
            </Pressable>
          )
        : undefined,
    })
  }, [navigation, caps.managePeople])

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

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading directory…" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search people or roles" />
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.user._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.accent} />}
        renderItem={({ item }) => {
          const person = item.user
          return (
            <Pressable
              style={styles.row}
              onPress={() => (caps.people ? navigation.navigate('PersonAccess', { userId: person._id }) : undefined)}
              disabled={!caps.people}
            >
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
            </Pressable>
          )
        }}
        ListEmptyComponent={<EmptyState title="No teammates yet" />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  email: { ...typography.caption, color: colors.textSecondary },
  stats: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
})
