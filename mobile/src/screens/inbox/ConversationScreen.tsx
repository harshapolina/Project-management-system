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
import { formatDayLabel, formatMsgTime, sameMessageDay } from '../../utils/chatUtils'
import { getSocket } from '../../lib/socket'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { Message } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { InboxStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InboxStackParamList, 'Conversation'>
type ConversationData = Awaited<ReturnType<typeof mailApi.conversation>>

export function ConversationScreen({ route, navigation }: Props) {
  const colors = useColors()
  const chat = useChatColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, chat, pagePadding), [colors, chat, pagePadding])
  const listRef = useRef<FlatList<Message>>(null)

  const { userId, userName } = route.params
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
      const peer =
        String(message.from._id) === String(me.id) ? message.to._id : message.from._id
      if (String(peer) !== String(userId)) return

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
          name: me.name,
          email: me.email,
          avatar: me.avatar,
        },
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

  const other = data?.other
  const chromeProps = {
    title: userName,
    subtitle: other?.email || 'Direct message',
    subtitleIcon: 'chatbubble-ellipses-outline' as const,
    right: other ? <Avatar name={other.name} uri={other.avatar} size={36} /> : undefined,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps} background={chat.listBg}>
        <LoadingState label="Loading conversation…" variant="chat" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps} background={chat.listBg}>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  /** Newest first for inverted list (newest at bottom). */
  const messages = [...data.messages].reverse()

  const send = () => {
    const text = body.trim()
    if (text && !sendMutation.isPending) sendMutation.mutate(text)
  }

  return (
    <NestedChrome {...chromeProps} background={chat.listBg} keyboardAvoiding>
      <FlatList
          ref={listRef}
          data={messages}
          inverted={messages.length > 0}
          automaticallyAdjustKeyboardInsets
          keyExtractor={(m) => m._id}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => {
            if (messages.length > 0) listRef.current?.scrollToOffset({ offset: 0, animated: true })
          }}
          renderItem={({ item, index }) => {
            const mine = String(item.from._id) === String(me?.id)
            const pending = String(item._id).startsWith('temp-')
            const older = messages[index + 1]
            const showDate =
              index === messages.length - 1 ||
              (older && !sameMessageDay(item.createdAt, older.createdAt))
            const showAvatar = !mine && (!older || String(older.from._id) !== String(item.from._id))

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
              body={`Send the first message to ${userName.split(' ')[0]}.`}
            />
          }
        />
        <ChatComposer
          value={body}
          onChangeText={setBody}
          onSend={send}
          sending={sendMutation.isPending}
          placeholder={`Message ${userName.split(' ')[0]}…`}
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
