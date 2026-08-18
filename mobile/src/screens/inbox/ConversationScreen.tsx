import { useLayoutEffect, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { InboxStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InboxStackParamList, 'Conversation'>

export function ConversationScreen({ route, navigation }: Props) {
  const { userId, userName } = route.params
  const me = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

  useLayoutEffect(() => {
    navigation.setOptions({ title: userName })
  }, [navigation, userName])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['mail-conversation', userId],
    queryFn: () => mailApi.conversation(userId),
  })

  const sendMutation = useMutation({
    mutationFn: (text: string) => mailApi.send({ to: userId, body: text }),
    onSuccess: () => {
      setBody('')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['mail-threads'] })
    },
  })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading conversation…" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false} keyboardAvoiding>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={data.messages}
          keyExtractor={(m) => m._id}
          inverted={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const mine = String(item.from._id) === String(me?.id)
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={<EmptyState title="Say hello" body={`Start the conversation with ${userName}.`} />}
        />
        <View style={styles.composer}>
          <Input placeholder="Type a message…" value={body} onChangeText={setBody} containerStyle={{ flex: 1 }} multiline />
          <Button
            title="Send"
            size="sm"
            onPress={() => body.trim() && sendMutation.mutate(body.trim())}
            loading={sendMutation.isPending}
            disabled={!body.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleTheirs: { backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleText: { ...typography.body, color: colors.textPrimary },
  bubbleTextMine: { color: '#fff' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
})
