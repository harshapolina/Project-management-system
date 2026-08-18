import { useLayoutEffect } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'PlatformAdmin'>

const STATUS_COLOR = { trial: colors.warning, active: colors.success, suspended: colors.danger }

export function PlatformAdminScreen({ navigation }: Props) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('CreateTenant')} hitSlop={10} accessibilityLabel="New workspace">
          <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
        </Pressable>
      ),
    })
  }, [navigation])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: platformApi.tenants,
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading workspaces…" />
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
        keyExtractor={(t) => t._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Pill label={item.status} color={STATUS_COLOR[item.status]} bg={`${STATUS_COLOR[item.status]}22`} />
            </View>
            <Text style={styles.meta}>
              {item.slug} · {item.seatsUsed}/{item.seatLimit} seats
            </Text>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No workspaces yet" body="Create the first tenant to onboard a company." />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textSecondary },
})
