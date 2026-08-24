import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { KeyboardAwareView } from '../../components/KeyboardAwareView'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { isKeyboardOpen, useKeyboardInset } from '../../hooks/useKeyboardInset'
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
  const { pagePadding } = useResponsive()
  const keyboardInset = useKeyboardInset()
  const keyboardOpen = isKeyboardOpen(keyboardInset)
  const styles = useMemo(() => createStyles(colors, pagePadding), [colors, pagePadding])
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

  const header = (
    <>
      <AppNavBar />
      <PageHeader
        title={userName}
        subtitle="Direct message"
        subtitleIcon="chatbubble-outline"
        onBack={() => navigation.goBack()}
      />
    </>
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <LoadingState label="Loading conversation…" variant="chat" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const messages = data.messages

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {header}
      <KeyboardAwareView
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          inverted={messages.length > 0}
          keyExtractor={(m) => m._id}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }) => {
            const mine = String(item.from._id) === String(me?.id)
            const pending = String(item._id).startsWith('temp-')
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, pending && styles.bubblePending]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={<EmptyState title="Say hello" body={`Start the conversation with ${userName}.`} />}
        />
        <View
          style={[
            styles.composer,
            { paddingBottom: keyboardOpen ? spacing.md : TAB_BAR_CLEARANCE },
          ]}
        >
          <Input
            placeholder="Type a message…"
            value={body}
            onChangeText={setBody}
            containerStyle={{ flex: 1 }}
            multiline
            onSubmitEditing={() => {
              const text = body.trim()
              if (text && !sendMutation.isPending) sendMutation.mutate(text)
            }}
            blurOnSubmit={false}
          />
          <Button
            title="Send"
            size="sm"
            onPress={() => {
              const text = body.trim()
              if (text) sendMutation.mutate(text)
            }}
            loading={sendMutation.isPending}
            disabled={!body.trim()}
          />
        </View>
      </KeyboardAwareView>
    </Screen>
  )
}

function createStyles(c: AppColors, pagePadding: number) {
  return StyleSheet.create({
    flex: { flex: 1, minHeight: 0 },
    listContent: {
      paddingHorizontal: pagePadding,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    listEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    bubbleRow: { flexDirection: 'row' },
    bubbleRowMine: { justifyContent: 'flex-end' },
    bubble: {
      maxWidth: '80%',
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    bubbleTheirs: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderBottomLeftRadius: 4,
    },
    bubbleMine: { backgroundColor: c.accent, borderBottomRightRadius: 4 },
    bubblePending: { opacity: 0.72 },
    bubbleText: { ...typography.body, color: c.textPrimary },
    bubbleTextMine: { color: c.textOnAccent },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: pagePadding,
      paddingTop: spacing.md,
      paddingBottom: TAB_BAR_CLEARANCE,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.canvas,
    },
  })
}
