import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { InboxContextBar } from '../../components/inbox/InboxContextBar'
import { InboxTabs } from '../../components/inbox/InboxTabs'
import { ThreadRow } from '../../components/inbox/ThreadRow'
import { SearchField } from '../../components/SearchField'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { pushConversation } from '../../navigation/openProject'

type Props = NativeStackScreenProps<InboxStackParamList, 'Threads'>

/** Legacy route — redirects styling to InboxHub mail tab. */
export function ThreadsScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent, pagePadding } = useResponsive()
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['mail-threads'],
    queryFn: mailApi.threads,
    refetchInterval: 20_000,
  })

  const threads = useMemo(() => {
    const list = data || []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (t) =>
        t.user.name.toLowerCase().includes(q) ||
        t.lastMessage.body.toLowerCase().includes(q),
    )
  }, [data, search])

  return (
    <NestedChrome
      title="Chat"
      subtitle="Team messages"
      subtitleIcon="chatbubbles-outline"
      showBack={false}
    >
      <InboxTabs value="mail" onChange={(tab) => tab !== 'mail' && navigation.navigate('InboxHub', { tab })} />
      <InboxContextBar tab="mail" onCompose={() => navigation.navigate('NewMessage')} />
      {isLoading ? (
        <LoadingState label="Loading messages…" variant="rows" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.user._id}
          contentContainerStyle={[listContent, { paddingHorizontal: 0, paddingTop: 0 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: pagePadding, paddingTop: 8, paddingBottom: 4 }}>
              <SearchField value={search} onChangeText={setSearch} placeholder="Search conversations…" />
            </View>
          }
          renderItem={({ item }) => (
            <ThreadRow
              name={item.user.name}
              avatar={item.user.avatar}
              preview={item.lastMessage.body}
              time={item.lastMessage.createdAt}
              unread={item.unread}
              onPress={() =>
                pushConversation(navigation, item.user._id, item.user.name)
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Start a conversation"
              body="Message anyone on your team."
              action="New message"
              onAction={() => navigation.navigate('NewMessage')}
            />
          }
        />
      )}
    </NestedChrome>
  )
}
