import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Avatar } from '../../components/Avatar'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, spacing, typography } from '../../constants/theme'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import { ROLE_LABELS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { InboxStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InboxStackParamList, 'NewMessage'>

export function NewMessageScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['mail-directory'],
    queryFn: mailApi.directory,
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
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.replace('Conversation', { userId: item._id, userName: item.name })}
            accessibilityRole="button"
          >
            <Avatar name={item.name} uri={item.avatar} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.role} numberOfLines={1}>
                {item.title || (item.role ? ROLE_LABELS[item.role as Role] || item.role : '')}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title="No teammates found" />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  role: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
})
