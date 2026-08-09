import { useLayoutEffect } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser, ROLE_LABELS } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'People'>

export function PeopleScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

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

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.users,
  })

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
      <FlatList
        data={data}
        keyExtractor={(u) => u._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar name={item.name} uri={item.avatar} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            <Pill label={ROLE_LABELS[item.role] || item.role} />
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No teammates yet" />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.sm },
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
})
