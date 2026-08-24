import { useMemo, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { TAB_BAR_CLEARANCE } from '../../components/GlassyTabBar'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { mailApi } from '../../api/mail'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { InboxStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<InboxStackParamList, 'Conversation'>

export function ConversationScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding), [colors, pagePadding])

  const { userId, userName } = route.params
  const me = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')

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

  return (
    <Screen padded={false} edges={['left', 'right']} keyboardAvoiding>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={data.messages}
          keyExtractor={(m) => m._id}
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

function createStyles(c: AppColors, pagePadding: number) {
  return StyleSheet.create({
    listContent: {
      paddingHorizontal: pagePadding,
      paddingVertical: spacing.md,
      gap: spacing.md,
      flexGrow: 1,
      justifyContent: 'flex-end',
      paddingBottom: spacing.md,
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
