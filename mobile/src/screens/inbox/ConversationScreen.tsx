import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar } from '../../components/Avatar'
import { NestedChrome } from '../../components/NestedChrome'
import { ChatComposer } from '../../components/inbox/ChatComposer'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { radius, spacing, typography, type AppColors, type ChatColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useChatColors } from '../../theme/useChatColors'
import { useResponsive } from '../../theme/useResponsive'
import { formatDayLabel, formatMsgTime, isCurrentUser, mailUserId, sameMessageDay } from '../../utils/chatUtils'
import { getSocket } from '../../lib/socket'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { Message } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { InboxStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InboxStackParamList, 'Conversation'>
type ConversationData = Awaited<ReturnType<typeof mailApi.conversation>>

/** Within this many px of the newest message still counts as "following along". */
const AT_LATEST_THRESHOLD = 80

export function ConversationScreen({ route, navigation }: Props) {
  const colors = useColors()
  const chat = useChatColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, chat, pagePadding), [colors, chat, pagePadding])
  const listRef = useRef<FlatList<Message>>(null)
  /**
   * Whether the newest message is on screen. The list is inverted, so offset 0
   * *is* the bottom of the conversation. Tracked in a ref rather than state so
   * scrolling never re-renders the thread.
   */
  const atLatestRef = useRef(true)
  const scrollToLatest = (animated = true) =>
    listRef.current?.scrollToOffset({ offset: 0, animated })

  const { userId, userName: routeName } = route.params
  const me = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

  const queryKey = ['mail-conversation', userId] as const

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => mailApi.conversation(userId),
    staleTime: 15_000,
  })

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !me?.id) return undefined

    const onMail = (payload: { message?: Message }) => {
      const message = payload?.message
      if (!message) return
      const peer = isCurrentUser(message.from, me.id) ? mailUserId(message.to) : mailUserId(message.from)
      if (peer !== String(userId)) return

      queryClient.setQueryData<ConversationData>(queryKey, (old) => {
        if (!old) return old
        if (old.messages.some((m) => m._id === message._id)) return old
        return { ...old, messages: [...old.messages, message] }
      })
    }

    socket.on('mail:new', onMail)
    return () => {
      socket.off('mail:new', onMail)
    }
  }, [me?.id, queryClient, queryKey, userId])

  const sendMutation = useMutation({
    mutationFn: (text: string) => mailApi.send({ to: userId, body: text }),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ConversationData>(queryKey)
      if (!previous || !me) return { previous }

      const optimistic: Message = {
        _id: `temp-${Date.now()}`,
        from: {
          _id: me.id,
          id: me.id,
          name: me.name,
          email: me.email,
          avatar: me.avatar,
        } as Message['from'],
        to: previous.other,
        body: text,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<ConversationData>(queryKey, {
        ...previous,
        messages: [...previous.messages, optimistic],
      })
      setBody('')
      return { previous }
    },
    onError: (_err, _text, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ConversationData>(queryKey, (old) => {
        if (!old) return old
        const withoutTemp = old.messages.filter((m) => !String(m._id).startsWith('temp-'))
        if (withoutTemp.some((m) => m._id === message._id)) {
          return { ...old, messages: withoutTemp }
        }
        return { ...old, messages: [...withoutTemp, message] }
      })
      queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
    },
  })

  /** Sending is an explicit act — always show the result, wherever they were. */
  const sendAndScroll = (text: string) => {
    atLatestRef.current = true
    sendMutation.mutate(text)
    scrollToLatest()
  }

  const other = data?.other
  const displayName = other?.name || routeName || 'Chat'
  const firstName = displayName.trim().split(/\s+/)[0] || displayName
  const chromeProps = {
    title: displayName,
    subtitle: other?.email || (other ? 'Direct message' : undefined),
    right: other ? <Avatar name={other.name} uri={other.avatar} size={32} /> : undefined,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps} background={chat.listBg} compactHeader>
        <LoadingState label="Loading conversation…" variant="chat" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps} background={chat.listBg} compactHeader>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  /** Newest first for inverted list (newest at bottom). */
  const messages = [...data.messages].reverse()

  const send = () => {
    const text = body.trim()
    if (text && !sendMutation.isPending) sendAndScroll(text)
  }

  return (
    <NestedChrome {...chromeProps} background={chat.listBg} keyboardAvoiding compactHeader>
      <FlatList
          ref={listRef}
          data={messages}
          inverted={messages.length > 0}
          /**
           * No `automaticallyAdjustKeyboardInsets`: the chrome around this list
           * is already a KeyboardAwareView that shrinks the whole container by
           * the keyboard height. Letting the list add the same inset again
           * double-counted it, which is what pushed the composer into the
           * keyboard instead of resting on top of it.
           */
          keyExtractor={(m) => m._id}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={16}
          onScroll={(e) => {
            atLatestRef.current = e.nativeEvent.contentOffset.y <= AT_LATEST_THRESHOLD
          }}
          /**
           * Opening the keyboard changes the content size, so an unconditional
           * scroll-to-newest here yanked anyone reading history back to the
           * bottom. Follow the conversation only for people already at it.
           */
          onContentSizeChange={() => {
            if (messages.length > 0 && atLatestRef.current) scrollToLatest()
          }}
          renderItem={({ item, index }) => {
            const mine = isCurrentUser(item.from, me?.id)
            const pending = String(item._id).startsWith('temp-')
            const older = messages[index + 1]
            const showDate =
              index === messages.length - 1 ||
              (older && !sameMessageDay(item.createdAt, older.createdAt))
            const showAvatar = !mine && (!older || mailUserId(older.from) !== mailUserId(item.from))

            return (
              <View>
                {showDate ? (
                  <View style={styles.dateRow}>
                    <View style={[styles.datePill, { backgroundColor: colors.surfaceRaised }]}>
                      <Text style={[styles.dateText, { color: colors.textMuted }]}>
                        {formatDayLabel(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  {!mine && showAvatar ? (
                    <Avatar name={item.from.name} uri={item.from.avatar} size={28} />
                  ) : !mine ? (
                    <View style={styles.avatarSpacer} />
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                      pending && styles.bubblePending,
                    ]}
                  >
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                    <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                      {formatMsgTime(item.createdAt)}
                      {pending ? ' · Sending' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="Start the conversation"
              body={`Send the first message to ${firstName}.`}
            />
          }
        />
        <ChatComposer
          value={body}
          onChangeText={setBody}
          onSend={send}
          sending={sendMutation.isPending}
          placeholder={`Message ${firstName}…`}
        />
    </NestedChrome>
  )
}

function createStyles(c: AppColors, chat: ChatColors, pagePadding: number) {
  return StyleSheet.create({
    flex: { flex: 1, minHeight: 0, backgroundColor: chat.listBg },
    listContent: {
      paddingHorizontal: pagePadding,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    listEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    dateRow: { alignItems: 'center', marginVertical: spacing.sm },
    datePill: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    dateText: { ...typography.micro, fontWeight: '600', color: chat.rowPreview },
    bubbleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    bubbleRowMine: { justifyContent: 'flex-end' },
    bubbleRowTheirs: { justifyContent: 'flex-start' },
    avatarSpacer: { width: 28 },
    bubble: {
      maxWidth: '78%',
      borderRadius: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    bubbleTheirs: {
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderBottomLeftRadius: 6,
    },
    bubbleMine: {
      backgroundColor: c.accent,
      borderBottomRightRadius: 6,
    },
    bubblePending: { opacity: 0.7 },
    bubbleText: { ...typography.body, color: c.textPrimary, lineHeight: 22 },
    bubbleTextMine: { color: c.textOnAccent },
    bubbleTime: { ...typography.micro, color: chat.rowPreview, marginTop: 4 },
    bubbleTimeMine: { color: `${c.textOnAccent}99` },
  })
}
