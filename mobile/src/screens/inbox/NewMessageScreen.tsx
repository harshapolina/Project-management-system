import { useMemo } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Avatar } from '../../components/Avatar'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import { ROLE_LABELS } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { InboxStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InboxStackParamList, 'NewMessage'>

export function NewMessageScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['mail-directory'],
    queryFn: mailApi.directory,
  })

  if (isLoading) {
    return (
      <FormLayout
        title="New message"
        subtitle="Pick a teammate to chat with"
        subtitleIcon="create-outline"

        card={false}
      >
        <LoadingState label="Loading directory…" variant="rows" />
      </FormLayout>
    )
  }
  if (isError) {
    return (
      <FormLayout
        title="New message"
        subtitle="Pick a teammate to chat with"
        subtitleIcon="create-outline"

        card={false}
      >
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title="New message"
      subtitle="Pick a teammate to chat with"
      subtitleIcon="create-outline"

      card={false}
    >
      <FlatList
        data={data}
        keyExtractor={(u) => u._id}
        contentContainerStyle={[listContent, { paddingHorizontal: 0 }]}
        renderItem={({ item }) => (
          <SurfaceCard
            onPress={() => navigation.replace('Conversation', { userId: item._id, userName: item.name })}
          >
            <View style={styles.row}>
              <Avatar name={item.name} uri={item.avatar} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {ROLE_LABELS[item.role as Role] || item.role}
                  {item.email ? ` · ${item.email}` : ''}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        )}
        ListEmptyComponent={<EmptyState title="No teammates" body="Invite people to start messaging." />}
      />
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textMuted },
  })
}
